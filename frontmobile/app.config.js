const fs = require('node:fs')
const path = require('node:path')
const app = require('./app.json').expo

if (process.env.EAS_BUILD_PROFILE === 'production') {
  throw new Error('Esta entrega es un MVP interno. Usá el perfil preview; la publicación en tiendas todavía no está habilitada.')
}

function loadLocalEnvValue(name) {
  if (process.env[name]) return process.env[name]

  const envPath = path.join(__dirname, '.env')
  if (!fs.existsSync(envPath)) return undefined

  const line = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find(entry => entry.trim().startsWith(`${name}=`))
  if (!line) return undefined

  const value = line.slice(line.indexOf('=') + 1).trim()
  return value.replace(/^(["'])(.*)\1$/, '$2') || undefined
}

const googleMapsApiKey = loadLocalEnvValue('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY')

if (!googleMapsApiKey) {
  throw new Error(
    'Falta EXPO_PUBLIC_GOOGLE_MAPS_API_KEY. Configurala en el entorno de EAS antes de generar una APK.'
  )
}

module.exports = {
  ...app,
  android: {
    ...app.android,
    config: {
      ...app.android.config,
      googleMaps: {
        ...app.android.config?.googleMaps,
        apiKey: googleMapsApiKey,
      },
    },
  },
}
