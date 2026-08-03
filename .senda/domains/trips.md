# Viajes y reservas

Estado: implementado
Última revisión: 2026-08-02

## Qué puede explicarse al cliente

- Una persona puede buscar viajes por ciudad de origen, ciudad de destino y fecha.
- La búsqueda considera rutas que cubren el trayecto solicitado, incluso cuando la ruta tiene paradas intermedias.
- Al encontrar una opción, el pasajero puede pedir un asiento. El conductor puede aprobarla o rechazarla.
- La cantidad de asientos se vuelve a validar al aprobar una reserva.
- Si no hay viajes disponibles, la persona puede activar un seguimiento de ruta y recibir un aviso cuando se publique una ruta compatible para esa fecha.
- Una persona puede tener varios seguimientos de ruta y dejar de seguir cada uno desde su detalle.
- Conductores pueden publicar rutas recurrentes, configurar días, paradas, capacidad y si llevan pasajeros.

## Alcance

- Aplica a viajes de pasajeros y a rutas de conductores que habilitan pasajeros.
- Un seguimiento de ruta es un aviso; no reserva un asiento ni obliga a un conductor.
- Los perfiles públicos muestran datos de confianza y actividad, pero no datos privados de contacto.

## No confirmado o no implementado

- No se encontró un cierre operativo del viaje que cambie una reserva pagada a “viaje completado”.
- Existe infraestructura para solicitudes de intención de viaje y oportunidades para conductores, pero no es el flujo canónico expuesto por la experiencia móvil actual. Senda no debe prometer que el usuario puede publicar una intención de viaje.
- No se encontró garantía de que un seguimiento de ruta envíe una notificación para todas las variaciones geográficas posibles; el matching actual usa ciudades y recorridos configurados.

## Preguntas abiertas

- Reglas de no presentación, cambios de fecha y finalización de un viaje.
- Política de comunicación entre pasajero y conductor antes de la salida.
