# Calidad y operación

## Entornos y configuración

Cada aplicación tiene su archivo `.env.example`. Los secretos reales nunca se
versionan.

La API valida al arrancar:

- `DATABASE_URL`: URL PostgreSQL con credenciales no placeholder.
- `JWT_SECRET`: mínimo 32 caracteres.
- `PORT`: entero válido entre 1 y 65535.
- `CORS_ORIGIN`: uno o varios orígenes web separados por coma.
- `HTTP_BODY_LIMIT`: tamaño máximo de JSON/formulario; por defecto `1mb`.

Las apps nativas no siempre mandan cabecera `Origin`; los orígenes de navegador
sí son validados contra `CORS_ORIGIN`.

## Endpoints operativos

- `GET /health`: liveness; el proceso HTTP está respondiendo.
- `GET /health/ready`: readiness; comprueba una consulta a PostgreSQL y retorna
  `503` si la base no está disponible.

Los logs HTTP son JSON e incluyen `requestId`, método, path, estado y duración.
La respuesta devuelve el mismo valor en `X-Request-Id` para correlacionar un
reporte de cliente con los logs de servidor.

## Verificación local

```powershell
# API: limpia el build, compila y ejecuta tests nativos de Node
Set-Location api
npm test

# Mobile: lint y typecheck
Set-Location ../frontmobile
npm run lint
npx tsc --noEmit

# Web: build de producción
Set-Location ../frontweb
npm ci
npm run build
```

## Integración continua

`.github/workflows/quality.yml` ejecuta en cada pull request y push a `main`:

1. `npm ci` y pruebas de API.
2. `npm ci`, lint y typecheck de mobile.
3. `npm ci` y build de producción web.

Un cambio no se considera listo si estos controles fallan.

## Controles vigentes

- La API deshabilita `X-Powered-By`.
- Limita payloads y agrega headers contra MIME sniffing, framing y referrer
  leakage.
- Los endpoints de autenticación y mapas tienen rate limit.
- Los errores de dominio devuelven mensajes controlados; los inesperados no
  exponen stack traces.

## Próximas mejoras operativas

- Reemplazar el rate limit en memoria por Redis antes de ejecutar varias
  instancias.
- Reemplazar timers en memoria por una cola durable para matching y expiración.
- Incorporar métricas, trazas, alertas, backups comprobados y gestión de
  secretos del proveedor de despliegue.
