import prisma from '../lib/prisma'
import { normalize } from '../lib/matching'
import { emitToUser } from '../lib/socket'
import { sendPushNotification } from './notifications'

function weekdayForArgentina(date: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(`${date}T12:00:00-03:00`)).toUpperCase()
}

export async function notifyRouteAlertsForNewRoute(route: { originCity: string; destinationCity: string; waypointCities: string[]; daysOfWeek: string[]; carriesPassengers: boolean }) {
  if (!route.carriesPassengers) return
  const alerts = await prisma.routeAlert.findMany({ where: { cancelledAt: null, notifiedAt: null }, include: { user: { select: { pushToken: true } } } })
  const cities = [route.originCity, ...route.waypointCities, route.destinationCity].map(normalize)
  for (const alert of alerts) {
    const originIndex = cities.indexOf(normalize(alert.originCity))
    const destinationIndex = cities.indexOf(normalize(alert.destinationCity))
    if (originIndex < 0 || destinationIndex <= originIndex || !route.daysOfWeek.includes(weekdayForArgentina(alert.date))) continue
    await prisma.routeAlert.update({ where: { id: alert.id }, data: { notifiedAt: new Date() } })
    emitToUser(alert.userId, 'route-alert:available', { alertId: alert.id, originCity: alert.originCity, destinationCity: alert.destinationCity, date: alert.date })
    if (alert.user.pushToken) await sendPushNotification({
      to: alert.user.pushToken,
      title: 'Hay un viaje para tu ruta',
      body: `${alert.originCity} a ${alert.destinationCity} ya tiene una ruta disponible.`,
      data: { type: 'route_alert', alertId: alert.id },
    })
  }
}
