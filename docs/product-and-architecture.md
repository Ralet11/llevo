# LLEVO: producto y arquitectura

## 1. Propósito

LLEVO conecta necesidades de movilidad y logística con conductores verificados. Tiene dos mercados relacionados:

1. **Pasajeros** que necesitan viajar entre ciudades en una fecha determinada.
2. **Envíos** de paquetes que necesitan un conductor que cubra el recorrido.

La propuesta no depende solamente de que exista una oferta publicada. También captura demanda y la presenta a conductores compatibles para que puedan armar o adaptar su agenda.

## 2. Actores

### Pasajero

- Busca rutas ya publicadas.
- Crea una solicitud de viaje cuando necesita ir de un origen a un destino.
- Sigue el estado, cancela si corresponde y recibe notificaciones.
- Cuando existe una propuesta aceptada, confirma el viaje y realiza el pago.

### Conductor

- Completa verificación de identidad y administra vehículos.
- Configura rutas recurrentes, días, paradas, capacidad y precio.
- Recibe oportunidades que coinciden con sus rutas.
- Acepta o rechaza solicitudes; también puede aceptar demandas publicadas.
- Gestiona agenda, pasajeros y envíos.

### Operaciones

- Revisa usuarios, verificaciones, solicitudes, reservas, pagos y reportes.
- Interviene ante cancelaciones, conflictos, fraude o incidencias.
- Este rol requerirá un panel web operativo; no está implementado aún.

## 3. Flujos de negocio

### 3.1 Solicitud de viaje de pasajero (objetivo)

1. El pasajero indica origen, destino, fecha y cantidad de asientos.
2. El sistema crea una `TravelRequest` en estado `SEARCHING`.
3. Se calculan las rutas activas de conductores que cubren el corredor y la fecha.
4. Cada candidato recibe una notificación push y una oportunidad en su panel.
5. El pasajero ve inmediatamente “Estamos buscando un viaje para vos” y una tarjeta persistente en el home.
6. Si un conductor acepta, la solicitud pasa a `MATCHED`; se asocia una ruta y se crea la reserva correspondiente de forma atómica.
7. Si a los 15 minutos no hay aceptación, la solicitud pasa a `PUBLISHED`.
8. Una solicitud publicada queda visible para conductores compatibles hasta que se acepte, el pasajero la cancele, expire o se complete.
9. El home conserva la tarjeta como recordatorio durante todo el ciclo de vida.

Una aceptación nunca debe sobrescribir otra: la operación debe reclamar la solicitud con una transacción y devolver un conflicto al segundo conductor.

La bandeja de conductor reúne solicitudes directas de asiento y oportunidades de
demanda. Al aceptar una oportunidad, el backend reclama la solicitud, revalida
capacidad, crea una `RideBooking` aprobada y vence las demás oportunidades en
una sola transacción.

### 3.2 Reserva sobre una ruta existente

El pasajero puede elegir una ruta que ya tiene disponibilidad. La reserva se crea como `PENDING` para la ruta y fecha concretas; el conductor acepta o rechaza. La capacidad se verifica nuevamente de forma atómica al aceptar.

Este flujo ya existe de manera parcial mediante `RideBooking`. En la versión objetivo también podrá originarse a partir de una `TravelRequest` aceptada.

### 3.3 Envíos

Un usuario crea un `Shipment` con origen, destino, peso y datos de retiro y entrega. El backend encuentra conductores y ofrece el envío secuencialmente. El conductor puede aceptarlo, retirarlo y marcarlo entregado. El flujo existe de forma parcial y será migrado a la misma infraestructura durable de trabajos diferidos que usen las solicitudes de viaje.

## 4. Estados del dominio

### TravelRequest (planificado)

| Estado | Significado | Transiciones permitidas |
| --- | --- | --- |
| `SEARCHING` | Se notifican candidatos compatibles. | `MATCHED`, `PUBLISHED`, `CANCELLED`, `EXPIRED` |
| `PUBLISHED` | Demanda visible para conductores compatibles. | `MATCHED`, `CANCELLED`, `EXPIRED` |
| `MATCHED` | Un conductor reclamó la solicitud; se crea/vincula la reserva. | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | Pasajero, conductor y pago cumplen las reglas definidas. | `COMPLETED`, `CANCELLED` |
| `COMPLETED` | Viaje finalizado. | ninguna |
| `CANCELLED` | Cancelado por pasajero, conductor u operaciones. | ninguna |
| `EXPIRED` | Venció sin acuerdo. | ninguna |

### RideBooking (implementado parcialmente)

`PENDING`, `APPROVED`, `REJECTED`, `PAID`, `CANCELLED`.

Representa un asiento en una ruta específica y no reemplaza a una solicitud de viaje. Debe incorporar un vínculo opcional a `TravelRequest`.

### Shipment (implementado parcialmente)

`SEARCHING`, `ASSIGNED`, `PICKED_UP`, `DELIVERED`, `CANCELLED`, `NO_COVERAGE`.

## 5. Modelo de datos objetivo

### Entidades principales

- `User`: identidad, perfil, reputación y estado de verificación.
- `DevicePushToken`: tokens por dispositivo, plataforma, vigencia y última vez visto.
- `Vehicle`: vehículo y capacidad del conductor.
- `DriverRoute`: corredor, paradas, días, horarios, capacidad, precio y activación.
- `DriverDayOff`: indisponibilidad excepcional para una fecha.
- `TravelRequest`: demanda de viaje del pasajero.
- `TravelRequestCandidate`: oferta enviada a una ruta/conductor y su respuesta.
- `RideBooking`: reserva de asiento asociada a ruta, fecha y opcionalmente a una solicitud.
- `Shipment` y `ShipmentJob`: demanda de envío y trabajo aceptado por un conductor.
- `Payment`: intención, estado externo, importe, comisión e historial de webhooks.
- `Notification`: bandeja persistente y deep-link de eventos relevantes.
- `DomainEvent` u `OutboxEvent`: eventos transaccionales que disparan push, sockets y jobs.

### Ubicación

Las ciudades sirven para mostrar texto, pero el matching debe basarse en IDs de lugares y coordenadas. A escala de operación se recomienda PostgreSQL con PostGIS para cobertura, proximidad y desvíos. La normalización de strings actual es una compatibilidad temporal, no una fuente de verdad geográfica.

### Tiempo y dinero

- Fechas y horarios deben manejarse con zona `America/Argentina/Buenos_Aires`.
- La base almacena instantes en UTC y la fecha local de servicio cuando aplique.
- El dinero se persiste en enteros de moneda menor (`amountCents`), nunca `Float`.
- Los precios, ruta y datos relevantes se guardan como snapshot al confirmar.

## 6. Arquitectura objetivo

Se adopta un **monolito modular**: es más simple de operar y permite evolucionar los límites de negocio sin el costo prematuro de microservicios.

```text
Expo mobile ─┐
Web operaciones ─┼─ API TypeScript modular ─ PostgreSQL + PostGIS
                 │          │
                 │          ├─ Redis + cola durable
                 │          ├─ Push / email / SMS
                 │          ├─ proveedor de pagos
                 │          └─ almacenamiento de archivos
                 └─ OpenAPI y cliente tipado compartido
```

Módulos de API: identidad y confianza, supply de conductores, viajes, matching, envíos, reservas, pagos, notificaciones y operaciones.

## 7. Implementación actual

### Backend

- Express + TypeScript + Prisma + PostgreSQL.
- Autenticación por email/contraseña, teléfono, Google y Apple.
- Verificación de conductor mediante Didit.
- Socket.IO y Expo Push para eventos puntuales.
- Rutas recurrentes, vehículos, reservas y envíos ya tienen modelos Prisma.
- `TravelRequest` y `TravelRequestCandidate` ya están persistidos. La API del
  pasajero expone:
  - `POST /api/v1/trips/travel-requests`
  - `GET /api/v1/trips/travel-requests/mine`
  - `GET /api/v1/trips/travel-requests/:id`
  - `POST /api/v1/trips/travel-requests/:id/cancel`
- El matching, las notificaciones y la publicación automática de solicitudes se
  ejecutan al crear la solicitud. Un reconciliador cada minuto recupera las
  búsquedas que superaron su deadline y las pasa a `PUBLISHED`; esa transición
  persiste en PostgreSQL y emite socket/push al pasajero.

### Mobile

- Expo Router, mapa real, ubicación, tema oscuro y shell autenticado nuevo.
- Pantallas de viaje, mis viajes, conductor, rutas, vehículos y envíos.
- Conviven rutas nuevas `(app)` y rutas legacy `(tabs)`; estas últimas contienen mocks y no son la experiencia canónica.

### Pagos

- El pasajero abre Checkout Pro desde una reserva `APPROVED`; el mobile solo
  recibe una URL de checkout, nunca credenciales de Mercado Pago.
- La API crea una preferencia con una referencia interna de pago y una URL de
  webhook HTTPS. El pago se confirma exclusivamente al recibir y validar el
  webhook firmado, consultando luego el pago al proveedor.
- Cuando Mercado Pago informa `approved`, la reserva pasa a `PAID` y se avisa
  al pasajero por socket. Un rechazo o cancelacion deja el pago en `FAILED`.
- Variables exclusivas del backend: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`,
  `MP_WEBHOOK_URL` y `MP_WEBHOOK_SECRET`.

### Demo controlada de envios

- Para pruebas internas existe un bot de envios apagado por defecto.
- Requiere `DEMO_SHIPMENT_BOT_ENABLED=true` y `DEMO_SHIPMENT_BOT_ALLOWED_EMAILS` o `DEMO_SHIPMENT_BOT_ALLOWED_USER_IDS` con los testers autorizados.
- Solo acepta pedidos sin conductor real compatible y espera la confirmacion del pago antes de simular retiro y entrega.
- Las demoras se ajustan con `DEMO_SHIPMENT_BOT_ACCEPT_DELAY_MS`, `DEMO_SHIPMENT_BOT_PICKUP_DELAY_MS` y `DEMO_SHIPMENT_BOT_DELIVERY_DELAY_MS`.

### Web

Existe una landing mínima. No hay todavía panel de operaciones ni experiencia web funcional de conductor/pasajero.

## 8. Requisitos no funcionales

- Todas las mutaciones críticas son idempotentes y auditables.
- Las transiciones de estado se validan en backend, nunca solo en UI.
- Las tareas a 15 minutos se ejecutan en cola durable, con reintentos y locks.
- Push y socket aceleran la UX; la API siempre permite recuperar el estado.
- Los endpoints críticos tienen rate limiting distribuido, autorización y logs estructurados sin datos sensibles.
- Cada flujo crítico cuenta con tests de dominio, integración y end-to-end.
- Producción tiene migraciones automáticas controladas, backups, healthchecks, métricas, alertas y seguimiento de errores.

## 9. Estado de preparación

La app está en etapa de construcción de MVP. No debe manejar dinero real ni operación masiva hasta cerrar pagos, jobs durables, pruebas, seguridad, observabilidad y panel de soporte.
