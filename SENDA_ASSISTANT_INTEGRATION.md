# Integración de Llevo con Senda AI

## Objetivo

Preparar este repositorio para que Senda AI pueda explicar el funcionamiento de Llevo a clientes en lenguaje funcional, sin revelar código, secretos ni detalles de infraestructura y sin inventar comportamientos.

Senda debe tratar el código y la documentación aprobada como fuentes de evidencia. Estos archivos ayudan a ubicar, delimitar y comunicar esa evidencia; no sustituyen la implementación.

## Alcance de esta tarea

Crear dentro del repositorio la siguiente estructura:

```text
.senda/
  project.yml
  glossary.yml
  domains/
    ride-payments.md
    trips.md
    shipments.md
    driver-earnings.md
    cancellations.md
    coverage.md
  decisions/
  evaluations.yml
```

No incorporar secretos, variables de entorno, tokens, URLs privadas, comandos operativos, credenciales, dumps de base de datos ni contenido de archivos `.env`.

## Principios obligatorios

1. Documentar solamente hechos confirmados por código, tests o una decisión explícita del proyecto.
2. Diferenciar claramente entre `implementado`, `parcial`, `planificado`, `pendiente` y `no confirmado`.
3. Indicar el alcance de cada afirmación. No mezclar viajes, envíos, conductores y administración.
4. Si no hay evidencia de una función, escribir que no se encontró o que está pendiente. Nunca completar con prácticas habituales de otras aplicaciones.
5. Redactar para clientes: explicar comportamiento y conceptos, nunca archivos, rutas, clases, variables ni código.
6. Cuando código y documentación contradigan, no ocultar el conflicto: registrar una decisión pendiente en `.senda/decisions/`.

## 1. Crear `.senda/project.yml`

Este archivo es el mapa de investigación de Senda. Debe listar los dominios, sus sinónimos para clientes y las zonas de código/tests/documentación que el assistant debe investigar.

Usar este punto de partida y reemplazar/agregar únicamente rutas que existan:

```yml
version: 1
project: Llevo
language: es-AR

code:
  roots:
    - api/src
    - frontmobile
    - frontweb
  documentation:
    - docs

domains:
  ride_payments:
    labels:
      - pagos de viajes
      - cobro de viajes
      - checkout
      - pagar una reserva
    code_areas:
      - api/src/controllers/payments.controller.ts
      - api/src/controllers/rideBookings.controller.ts
      - api/src/controllers/driverRoutes.controller.ts
    documentation: []
    tests: []

  trips:
    labels:
      - viajes
      - reservas
      - solicitar un viaje
      - conductor
    code_areas: []
    documentation: []
    tests: []

  shipments:
    labels:
      - envios
      - cotizacion de envio
      - paqueteria
    code_areas:
      - api/src/controllers/shipments.controller.ts
      - api/src/services/shipmentPricing.ts
    documentation: []
    tests: []
```

## 2. Crear documentos por dominio

Cada archivo de `.senda/domains/` debe respetar este formato:

```md
# Nombre del dominio

Estado: implementado | parcial | planificado | pendiente
Última revisión: YYYY-MM-DD

## Qué puede explicarse al cliente

- Hecho funcional confirmado, en lenguaje claro.

## Alcance

- A qué flujo, actor o producto aplica.
- Qué no cubre este documento.

## No confirmado o no implementado

- Funcionalidades buscadas que no existen en la implementación actual.

## Preguntas abiertas

- Decisiones de negocio pendientes o comportamientos que requieren definición.
```

### Prioridad: `.senda/domains/ride-payments.md`

Investigar el flujo real de cobro de reservas de viajes y documentar sólo lo comprobado. Como guía de investigación, revisar la creación de reservas, el precio por asiento, el checkout, el webhook y los cambios de estado del pago.

Prestar atención a esta separación:

- Los cálculos de cotización de envíos no prueban cómo se cobra un viaje.
- La disponibilidad de un proveedor de pagos no prueba qué medios de pago están activos en producción.
- Una entidad de comisión no prueba que haya liquidaciones periódicas para viajes.

Registrar explícitamente si existen o no existen, para viajes: efectivo, tarifa dinámica, comisiones, liquidaciones a conductores, cargos de cancelación, reembolsos, propinas, cupones e impuestos.

## 3. Crear `.senda/glossary.yml`

Definir traducciones de términos internos a lenguaje de cliente. Ejemplo:

```yml
terms:
  ride_booking:
    client_term: reserva de viaje
    description: Lugar reservado por un pasajero en una ruta.
  price_per_seat:
    client_term: precio por asiento
    description: Importe definido para cada asiento de una ruta.
  payment:
    client_term: pago de la reserva
    description: Registro del cobro asociado a una reserva.
```

No usar identificadores internos, nombres de tablas o clases como texto dirigido al cliente.

## 4. Registrar decisiones

Crear un archivo por decisión relevante en `.senda/decisions/`, con este formato:

```md
# ADR-XXX — Título

Estado: propuesto | aceptado | reemplazado | pendiente
Fecha: YYYY-MM-DD

## Decisión

Descripción funcional, sin implementación ni secretos.

## Motivo

Por qué se tomó o por qué sigue pendiente.

## Impacto para clientes

Cómo debe explicarlo Senda.
```

Las decisiones pendientes son especialmente importantes: evitan que Senda las presente como funcionalidades existentes.

## 5. Crear `.senda/evaluations.yml`

Definir preguntas reales que Senda debe responder correctamente. Incluir siempre lo que debe afirmar y lo que no puede afirmar.

```yml
version: 1
cases:
  - question: "¿Cómo se cobran los viajes?"
    domain: ride_payments
    must_include: []
    must_not_claim:
      - pago en efectivo
      - tarifa dinámica
      - liquidación semanal
      - fee de cancelación

  - question: "¿Cómo se calcula la ganancia de un conductor?"
    domain: driver_earnings
    must_include: []
    must_not_claim: []
```

Completar `must_include` sólo después de comprobar el comportamiento real en la implementación. No convertir ejemplos de este documento en hechos del producto.

## 6. Criterio de aceptación

La tarea está terminada cuando:

- La estructura `.senda/` existe y no contiene información sensible.
- Cada dominio prioritario tiene estado, alcance, hechos confirmados y vacíos explícitos.
- `ride-payments.md` no mezcla viajes con envíos.
- `project.yml` no referencia rutas inexistentes.
- `evaluations.yml` contiene casos positivos y negativos para pagos de viajes.
- Un revisor del proyecto confirma que los documentos reflejan la implementación actual.

## Mantenimiento

Cuando cambie un flujo funcional, actualizar el documento de dominio, la decisión correspondiente si aplica y las evaluaciones antes o junto con el cambio de código. Indicar la fecha de última revisión.
