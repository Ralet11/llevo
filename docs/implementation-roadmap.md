# Roadmap de implementación

## Método de trabajo

Cada bloque termina con código, migraciones, pruebas, documentación actualizada y una verificación explícita. No se inicia el siguiente bloque si el anterior no cumple su definición de terminado. Las decisiones que alteren reglas de negocio se documentan antes de codificar.

## Bloque 0 — Documentación y diseño de dominio

**Objetivo:** fijar producto, arquitectura, estados, términos y alcance.

- Crear documentación canónica.
- Separar demanda de viaje (`TravelRequest`) de reserva (`RideBooking`).
- Definir reglas de aceptación, cancelación, expiración y capacidad.
- Inventariar flujos legacy, mocks y placeholders.

**Terminado cuando:** los documentos reflejan la realidad actual y el diseño objetivo; las siguientes migraciones no dependen de decisiones ambiguas.

## Bloque 1 — Fundaciones de calidad y operación

**Objetivo:** establecer una plataforma segura y verificable antes de ampliar el dominio.

- Corregir lint existente y eliminar mojibake visible.
- Agregar tests de API y de dominio con base aislada.
- Validar configuración mediante esquema tipado al iniciar.
- Endurecer HTTP: payload limit, cabeceras, CORS por ambiente y rate limit distribuible.
- Definir health/readiness, logs estructurados y manejo de errores.
- Preparar CI: typecheck, lint, test, build y migraciones.

**Terminado cuando:** API y mobile pasan checks; hay tests de humo, pipeline y configuración reproducible por ambiente.

**Avance 2026-08-01:** configuración de API validada, límites HTTP y readiness
implementados; tests nativos de Node y workflow de GitHub Actions agregados.
La sustitución de rate limit/timers en memoria por infraestructura distribuida
queda programada para el Bloque 3, donde se incorpora la cola durable.

## Bloque 2 — Demanda de viajes y persistencia

**Objetivo:** introducir el modelo de solicitud de viaje sin romper reservas.

- Migración Prisma para `TravelRequest`, `TravelRequestCandidate`, tokens por dispositivo y los índices necesarios.
- Estados y máquina de transiciones en un módulo de dominio.
- API para crear, listar, obtener y cancelar solicitudes propias.
- Enlace opcional entre una reserva y su solicitud origen.
- Migración segura, backfill si corresponde y rollback documentado.

**Terminado cuando:** una solicitud se persiste, no duplica activas equivalentes y sus transiciones son atómicas y testeadas.

**Avance 2026-08-01:** modelo Prisma, migración SQL, endpoints autenticados y
pruebas de máquina de estados implementados. La migración agrega además un índice
parcial único que protege contra duplicados concurrentes de solicitudes activas.

## Bloque 3 — Matching, notificaciones y publicación

**Objetivo:** avisar a conductores compatibles y publicar demanda sin depender de un servidor vivo.

- Reutilizar y extraer matching de corredores para pasajeros y envíos.
- Crear candidatos de forma auditable y deduplicada.
- Implementar outbox y cola durable para push, socket y vencimiento de 15 min.
- Publicar automáticamente solicitudes sin aceptación.
- Panel/API de oportunidades compatibles para conductores.

**Terminado cuando:** el ciclo `SEARCHING → PUBLISHED` funciona tras reinicios, reintentos y duplicados, con pruebas de concurrencia.

**Avance 2026-08-01:** al crear una solicitud se encuentran rutas que llevan
pasajeros, se persisten candidatos deduplicados y se envía push/socket a cada
conductor. El reconciliador de base de datos publica solicitudes vencidas cada
minuto y al arrancar el servidor. La aceptación atómica se completa en el
Bloque 5 junto con la experiencia de conductor.

## Bloque 4 — Experiencia de pasajero

**Objetivo:** que el usuario comprenda y controle su solicitud en todo momento.

- Adaptar “Quiero viajar” para crear solicitud y mostrar búsqueda activa.
- Card persistente de estado en home.
- Pantalla “Mis viajes” unificada con solicitud, reserva y recordatorio.
- Tiempo restante, notificaciones, cancelación y estados vacíos/errores.
- Eliminar datos mock del flujo canónico.

**Terminado cuando:** el usuario puede crear, abandonar/reabrir la app, ver el estado real y cancelar una solicitud sin inconsistencias.

## Bloque 5 — Experiencia de conductor

**Objetivo:** convertir demanda en oferta confirmada de manera clara y segura.

- Bandeja de oportunidades notificadas y publicadas.
- Detalle de solicitud, compatibilidad de ruta y acciones aceptar/rechazar.
- Reclamo atómico: un único conductor puede aceptar.
- Integración con agenda, disponibilidad, capacidad y recordatorio del viaje.

**Terminado cuando:** un conductor elegible acepta desde notificación o panel y ambas partes ven el mismo resultado en tiempo real y al recargar.

**Avance 2026-08-01:** bandeja de oportunidades integrada al panel existente
del conductor. La aceptación y el rechazo están expuestos por API; aceptar hace
el claim, control de capacidad, reserva aprobada, vencimiento de alternativas y
notificación al pasajero atómicamente.

## Bloque 6 — Reserva, pagos e historial

**Objetivo:** cerrar el acuerdo comercial y el ciclo posterior.

- Unificar reglas de reserva, capacidad y cancelación.
- Integrar proveedor de pagos con webhooks firmados e idempotentes.
- Persistir notificaciones e historial de eventos.
- Definir reembolsos, disputas, comisiones y soporte operativo.

**Terminado cuando:** los cobros se reconcilian desde webhook y ningún estado de pago depende del cliente móvil.

## Bloque 7 — Unificación de experiencias y operaciones

**Objetivo:** eliminar duplicación y habilitar soporte real.

- Retirar `(tabs)` y mocks después de migrar cada flujo.
- Completar rutas del drawer y el centro de notificaciones.
- Construir panel web de operaciones: usuarios, solicitudes, reservas, verificación, pagos y soporte.
- Publicar contrato OpenAPI y cliente compartido.

**Terminado cuando:** existe una experiencia canónica por rol y operaciones puede resolver incidencias sin acceder directamente a la base de datos.

## Bloque 8 — Salida controlada

**Objetivo:** preparar operación real y escalable.

- Pruebas E2E de registro, solicitud, matching, aceptación, pago y cancelación.
- Observabilidad: métricas, errores, trazas, dashboards y alertas.
- Backups, restauración probada, secretos, despliegues y rollback.
- Piloto limitado por ciudad/corredor con métricas de oferta, aceptación y cancelación.

**Terminado cuando:** se supera una lista de salida, se ensaya recuperación y las métricas del piloto cumplen el umbral acordado.

## Decisiones que requieren validación de negocio antes del Bloque 6

1. ¿Una aceptación del conductor confirma el viaje o requiere confirmación/pago del pasajero?
2. ¿Cuál es la política de cancelación y de no presentación de cada parte?
3. ¿Cuánto tiempo vive una solicitud publicada y cuántas solicitudes activas puede tener un pasajero?
4. ¿La tarifa la propone el conductor, el pasajero, la plataforma o una regla?
5. ¿Qué requisitos regulatorios y de seguro aplican en cada zona de operación?
