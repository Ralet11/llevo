# MVP de pruebas internas — 8 de septiembre de 2026

Esta entrega habilita recorridos entre cuentas humanas y recorridos opcionales con bots por tester: reserva sobre ruta existente y envío. Los pagos se confirman localmente como simulados; no se llama a Mercado Pago ni se mueve dinero. El estado IN_ESCROW es solo compatibilidad del modelo, no custodia de fondos. No publicar en tiendas ni utilizar paquetes/personas ajenas al equipo de pruebas.

## Preparar el entorno

1. Crear una base PostgreSQL exclusiva de pruebas. Usar `api/.env.internal.example` como referencia, completar secretos y los emails reales de los testers en `INTERNAL_TESTER_EMAILS`. No copiar la configuración de una base con pagos reales. Mantener una sola instancia de API en este MVP.
   Para sumar testers después, agregar sus emails separados por comas en esa variable del entorno desplegado y reiniciar la instancia del API. No hace falta modificar el código ni generar otra APK. Al quitar un email y reiniciar, esa cuenta pierde acceso en su siguiente petición aunque conserve un token local.
2. Configurar Resend y Google Maps. El alta interna se realiza desde **Ingresar → email → código → contraseña**, o Google/Apple configurados. El registro legacy y el registro telefónico están deshabilitados en modo interno para evitar reclamar emails sin verificarlos. Usar emails autorizados. No se necesita configurar Didit para QA con bypass.
3. En `api`: `npm ci`, `npm test`, `npm run db:migrate:prod`, `npm start`. Las migraciones agregan COMPLETED y las preferencias individuales de bots. No ejecutar reset. Los tokens de sesiones anteriores se rechazan: volver a ingresar.
4. Verificar `https://HOST/health` (`release=internal-mvp`, `internalTesting=true`) y `https://HOST/health/ready` (200). Estas rutas están en la raíz del host, no bajo `/api/v1`. El servidor se niega a iniciar en NODE_ENV=production sin modo interno/lista de testers. `INTERNAL_BOTS_AVAILABLE` es el corte maestro; no activa bots para ninguna cuenta por sí solo.
5. En `frontmobile`: `npm ci`, `npm run lint`, `npx tsc --noEmit`. Configurar `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` en el entorno EAS preview. El perfil preview apunta a `https://llevo.duckdns.org/api/v1`: desplegar allí esta API de pruebas o cambiar explícitamente esa URL antes de generar la APK. No alcanza con modificar el .env local, porque el perfil la sobrescribe.
6. Generar Android con `npx eas-cli build --platform android --profile preview`. Esto usa la cuenta EAS y puede consumir cuota. El perfil production está bloqueado para esta entrega. Instalar la APK en al menos dos dispositivos. iOS requiere aprovisionamiento/dispositivos registrados y validación aparte.

## Recorridos de aceptación manual

| Caso | Acción | Resultado esperado |
| --- | --- | --- |
| Acceso | Ingresar con dos emails autorizados y uno externo | Solo las cuentas autorizadas acceden a operaciones |
| Aislamiento de bots | Activar un bot en una cuenta y dejarlo apagado en la otra | Solo las solicitudes nuevas de la primera usan conductor simulado |
| Corte maestro | Apagar `INTERNAL_BOTS_AVAILABLE` y reiniciar | Ninguna cuenta puede activar ni avanzar bots |
| Bot de viaje | Activarlo, buscar, reservar y confirmar pago | Aparece opción demo; APPROVED automático y luego COMPLETED/RELEASED |
| Bot de envío | Activarlo, crear pedido y confirmar pago | ASSIGNED automático; luego PICKED_UP, DELIVERED y RELEASED |
| Sesiones antiguas | Abrir una sesión previa a esta entrega | Volver a iniciar sesión; no aparecer datos de otra cuenta |
| Conductor | Activar modo conductor, vehículo y ruta con precio positivo y asientos | Ruta disponible en búsqueda para el mismo corredor/fecha |
| Reserva | Pasajero solicita, conductor aprueba | Ambas cuentas recuperan el estado al volver a abrir la pantalla |
| Cupo | Dos pasajeros compiten por el último asiento | Solo una aprobación puede ocuparlo; la otra recibe conflicto |
| Pago | Confirmar pago simulado y repetir la petición | Un solo Payment por reserva/trabajo, ninguna llamada al proveedor |
| Cancelación | Cancelar una reserva antes/después del pago simulado | Reserva cancelada, pago simulado anulado, cupo liberado |
| Finalización | Conductor finaliza reserva pagada | Reserva COMPLETED, pago simulado RELEASED; visible al pasajero |
| Envío | Crear pedido en ciudad/corredor cubierto | Oferta llega al conductor; distancia/tiempo persistidos recalculados por servidor |
| Retiro sin pago | Intentar retiro antes de confirmación del remitente | Conflicto; no cambia el estado |
| Entrega | Confirmar pago, retirar y entregar | ASSIGNED → PICKED_UP → DELIVERED; pago simulado RELEASED |
| Cancelar envío | Conductor cancela antes del retiro | Pedido y trabajo CANCELLED, pago simulado REFUNDED; crear un nuevo pedido si se desea reintentar |
| ID incorrecto | Operar un trabajo de otro conductor | 404; no se modifica ningún registro |
| Fallo de red | Desconectar/reconectar y reabrir pantallas | Error visible o recuperación desde servidor, sin confirmación falsa |
| Reinicio API | Reiniciar durante una oferta | La reconciliación retoma ofertas pendientes; verificar en dos dispositivos |
| Push | Probar permisos aceptados/denegados y app cerrada | API permite recuperar estado aunque el push no llegue |
| Soporte | Guía de pruebas → preparar reporte | Selector de compartir con plantilla; no se envía un ticket automáticamente |

## Límites de esta entrega

- Sin cobros reales, liquidaciones, chat, ubicación continua compartida ni soporte 24/7.
- Didit en modo QA no acredita identidad real. No usar perfiles de pruebas como reputación pública.
- Fuera de alcance: demanda TravelRequest, Trip legacy, fletes y ciudad como servicios independientes. Las rutas legacy se bloquean y las pantallas secundarias orientan a la guía.
- Cotización preliminar visual estimativa: el backend recalcula distancia/duración al crear el envío; confirmar el importe simulado final luego de la aceptación del conductor.
- Una instancia API; no se certifica concurrencia de infraestructura distribuida ni entrega garantizada de push. Las pruebas automatizadas usan dobles de base para validar guardas; el caso de cupo concurrente debe probarse sobre PostgreSQL aislado.
- Las fechas sin hora no representan una promesa de recogida precisa. Los testers coordinan con el responsable de la prueba.
- Los interruptores se encuentran en **Guía de pruebas internas → Bots para mi cuenta**, comienzan apagados y afectan solicitudes nuevas. Apagarlos no cancela un recorrido demo ya iniciado.
- No se han verificado por el agente credenciales EAS/Resend/Maps, migración sobre servidor desplegado, APK instalada ni recorrido en dispositivos.

## Antes de distribuir

El responsable del piloto debe completar cuentas autorizadas, desplegar API+migración en la base aislada, generar/instalar la APK preview y registrar el resultado de los casos anteriores. Guardar versión del commit, build EAS, dispositivos y fecha de cada prueba. No distribuir si falla acceso, pago simulado, cupos o recuperación de estado.
