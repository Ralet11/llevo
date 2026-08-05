# Envíos y cotizaciones

Estado: implementado
Última revisión: 2026-08-02

## Qué puede explicarse al cliente

- Una persona puede pedir una cotización antes de crear un envío.
- La cotización considera distancia, tiempo estimado, peso, tamaño del paquete y una tarifa de plataforma.
- Tras crear un envío, el sistema busca conductores compatibles y les ofrece el trabajo de forma secuencial.
- Un conductor puede aceptar una entrega, marcar el retiro y luego marcarla como entregada.
- Un envío asignado puede pagarse mediante checkout de Mercado Pago cuando está listo para pagar.

## Alcance

- Aplica a paquetes y entregas, no a reservas de pasajeros.
- El precio cotizado corresponde al envío; no prueba el precio de un viaje.

## Entorno de demostracion para testers

- El bot de envios esta apagado por defecto.
- Solo puede activarse con `DEMO_SHIPMENT_BOT_ENABLED=true` y una lista explicita de emails o IDs de usuario autorizados.
- `DEMO_SHIPMENT_BOT_ALLOW_ALL_USERS=true` extiende el demo a todos los usuarios y debe usarse solo durante pruebas controladas.
- Solo interviene si no existe ningun conductor real compatible; nunca reemplaza ni contacta a conductores reales.
- El conductor se identifica como `Conductor de prueba`, espera un pago aprobado y luego simula retiro y entrega con demoras configurables.
- Es una herramienta de prueba controlada, no una promesa de servicio ni un mecanismo de produccion general.

## No confirmado o no implementado

- No se encontró una promesa de cobertura nacional ni una lista pública de zonas cubiertas.
- No se encontró efectivo, propinas, cupones, seguro del paquete, reembolso automático ni una política de compensación documentada.
- La cotización es una estimación del sistema; no se debe prometer que representa una tarifa regulada.

## Preguntas abiertas

- Límites comerciales por tipo de paquete y mercadería no permitida.
- Reglas de reclamos, daños, demora y compensaciones.
