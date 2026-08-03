# Pagos de viajes

Estado: implementado
Última revisión: 2026-08-02

## Qué puede explicarse al cliente

- Una reserva de viaje se puede pagar cuando el conductor la aprobó y tiene un precio por asiento.
- El importe del pago corresponde al precio por asiento multiplicado por la cantidad de asientos reservados.
- El pago se inicia en un checkout de Mercado Pago.
- La reserva se marca como pagada solamente después de que el proveedor confirma el pago al sistema.
- Si el proveedor informa un pago rechazado o cancelado, el cobro queda fallido; no se marca la reserva como pagada.

## Alcance

- Aplica a reservas de pasajeros en rutas publicadas por conductores.
- No describe cotizaciones ni pagos de envíos, que son un flujo distinto.
- La disponibilidad y la aprobación de la reserva ocurren antes de iniciar el pago.

## No confirmado o no implementado

- No se encontró pago en efectivo para viajes.
- No se encontró tarifa dinámica para viajes.
- No se encontró comisión de plataforma aplicada a viajes; el registro actual usa comisión cero para ese flujo.
- No se encontraron liquidaciones periódicas a conductores, propinas, cupones, impuestos desglosados, reembolsos ni cargos de cancelación para viajes.
- No puede afirmarse qué medios de pago tiene habilitados Mercado Pago en producción.

## Preguntas abiertas

- Política comercial de reembolsos y cancelaciones posteriores al pago.
- Cómo y cuándo se liquida a conductores el dinero de viajes.
