import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, Text, Share, Switch, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { IconButton } from '../../components/ui/IconButton'
import { Button } from '../../components/ui/Button'
import { useTheme } from '../../lib/theme'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'

type BotPreferences = {
  available: boolean
  rideEnabled: boolean
  shipmentEnabled: boolean
}

export default function SupportScreen() {
  const { palette } = useTheme()
  const { user, token } = useAuth()
  const [bots, setBots] = useState<BotPreferences | null>(null)
  const [botError, setBotError] = useState('')
  const [savingBots, setSavingBots] = useState(false)
  const color = palette.colors.text

  useEffect(() => {
    if (!token) return
    api.get<BotPreferences>('/auth/internal-bots', token)
      .then(setBots)
      .catch(() => setBotError('No pudimos cargar la configuración de bots.'))
  }, [token])

  async function saveBots(next: BotPreferences) {
    if (!token || savingBots) return
    setSavingBots(true)
    setBotError('')
    try {
      const saved = await api.put<BotPreferences>('/auth/internal-bots', {
        rideEnabled: next.rideEnabled,
        shipmentEnabled: next.shipmentEnabled,
      }, token)
      setBots(saved)
    } catch {
      setBotError('No pudimos guardar el cambio. Reintentá.')
    } finally {
      setSavingBots(false)
    }
  }

  return <ScreenSafeArea style={{ flex: 1, backgroundColor: palette.colors.background }}>
    <IconButton name="chevron-back" onPress={() => router.back()} />
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <Text style={{ color, fontSize: 26 }}>Guía de pruebas internas</Text>
      <Text style={{ color, lineHeight: 23 }}>Esta versión sirve para probar viajes y envíos entre testers. Los pagos son simulados: no se cobra ni se transfiere dinero. Usá datos de prueba y coordiná el recorrido con el responsable de la prueba.</Text>
      <Text style={{ color, lineHeight: 23 }}>Viajes: el conductor registra su vehículo y ruta. El pasajero busca la misma ruta y fecha, solicita un asiento y espera la aprobación. Después confirma el pago de prueba desde Mis viajes.</Text>
      <Text style={{ color, lineHeight: 23 }}>Envíos: creá un pedido con una ruta cubierta. El conductor acepta; el remitente confirma el pago de prueba desde el detalle. El conductor marca retiro y entrega. Si cancela antes del retiro, se anula la prueba y el remitente puede crear otro pedido.</Text>
      <Text style={{ color, lineHeight: 23 }}>Los importes y ganancias no representan saldo retirable. La verificación puede estar habilitada en modo QA; no implica que se haya validado una identidad real. No hay seguimiento GPS compartido, chat ni atención de emergencias.</Text>
      <View style={{ backgroundColor: palette.colors.surface, borderColor: palette.colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 }}>
        <Text style={{ color, fontSize: 18, fontWeight: '800' }}>Bots para mi cuenta</Text>
        <Text style={{ color: palette.colors.textMuted, lineHeight: 20 }}>
          Solo afectan solicitudes nuevas creadas por vos. Un recorrido con bot que ya empezó continuará hasta completarse. Los pagos siguen siendo simulados.
        </Text>
        {bots ? <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}><Text style={{ color, fontWeight: '700' }}>Bot de viajes</Text><Text style={{ color: palette.colors.textMuted }}>Agrega un conductor de prueba a tus búsquedas.</Text></View>
            <Switch disabled={!bots.available || savingBots} value={bots.rideEnabled} onValueChange={value => void saveBots({ ...bots, rideEnabled: value })} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}><Text style={{ color, fontWeight: '700' }}>Bot de envíos</Text><Text style={{ color: palette.colors.textMuted }}>Reserva tus nuevos pedidos para el conductor simulado.</Text></View>
            <Switch disabled={!bots.available || savingBots} value={bots.shipmentEnabled} onValueChange={value => void saveBots({ ...bots, shipmentEnabled: value })} />
          </View>
          {!bots.available && <Text style={{ color: palette.colors.warning }}>El interruptor maestro del servidor está apagado.</Text>}
        </> : <Text style={{ color: palette.colors.textMuted }}>Cargando configuración…</Text>}
        {!!botError && <Text style={{ color: palette.colors.danger }}>{botError}</Text>}
      </View>
      <Text style={{ color, lineHeight: 23 }}>Para reportar un problema, compartí con el coordinador los pasos, resultado esperado, resultado observado, hora, captura e ID del pedido. No incluyas contraseñas ni códigos de acceso. Compartir abre el selector del teléfono; no envía un ticket automáticamente.</Text>
      <Button label="Preparar reporte" onPress={() => void Share.share({ message: 'Reporte LLEVO — pruebas internas\nCuenta: ' + (user?.id ?? 'sin sesión') + '\nFecha: ' + new Date().toISOString() + '\nID del pedido:\nPasos:\nEsperado:\nObservado:' })} />
      <Button label="Mis viajes" onPress={() => router.push('/(app)/my-trips')} />
      <Button label="Mis envíos" onPress={() => router.push('/(app)/history')} />
    </ScrollView>
  </ScreenSafeArea>
}
