import Expo, { ExpoPushMessage } from 'expo-server-sdk'

const expo = new Expo()

type PushPayload = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  if (!Expo.isExpoPushToken(payload.to)) return

  const message: ExpoPushMessage = {
    to: payload.to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }

  try {
    await expo.sendPushNotificationsAsync([message])
  } catch (err) {
    console.error('[push] Error enviando notificacion:', err)
  }
}
