const { networkInterfaces } = require('node:os')
const { spawn } = require('node:child_process')

function scoreInterface(name, address) {
  const lower = name.toLowerCase()
  let score = 0

  if (lower.includes('wi-fi') || lower.includes('wifi') || lower.includes('wireless')) score += 40
  if (lower.includes('ethernet')) score += 30
  if (address.startsWith('192.168.')) score += 25
  if (address.startsWith('10.')) score += 20
  if (address.startsWith('172.')) score += 15
  if (lower.includes('virtual') || lower.includes('vmware') || lower.includes('virtualbox')) score -= 50
  if (lower.includes('bluetooth') || lower.includes('loopback')) score -= 50

  return score
}

function getLanAddress() {
  const candidates = []
  const interfaces = networkInterfaces()

  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue
      candidates.push({
        name,
        address: entry.address,
        score: scoreInterface(name, entry.address),
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]
}

const lan = getLanAddress()

if (lan) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = lan.address
  console.log(`Forzando Expo LAN en ${lan.address} (${lan.name})`)
} else {
  console.warn('No pude detectar una IPv4 LAN. Expo podria caer en localhost.')
}

const args = ['expo', 'start', '--host', 'lan', ...process.argv.slice(2)]
const child = spawn('npx', args, {
  env: process.env,
  stdio: 'inherit',
  shell: true,
})

child.on('exit', code => {
  process.exit(code ?? 0)
})
