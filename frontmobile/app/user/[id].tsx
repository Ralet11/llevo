import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Avatar } from '../../components/ui/Avatar'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'

type Review = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  from: { id: string; name: string; avatarUrl: string | null }
}

type PublicProfile = {
  id: string
  name: string
  avatarUrl: string | null
  rating: number
  ratingCount: number
  createdAt: string
  isIdentityVerified: boolean
  isPhoneVerified: boolean
  stats: { deliveries: number; shipments: number; ridesAsPassenger: number; ridesAsDriver: number }
  reviews: Review[]
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('')
}

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

function reviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <View style={s.stars}>
      {[1, 2, 3, 4, 5].map(i => {
        const name = rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline'
        return <Ionicons key={i} name={name} size={size} color={Theme.colors.lime} />
      })}
    </View>
  )
}

export default function UserProfileScreen() {
  const { token } = useAuth()
  const params = useLocalSearchParams<{ id: string }>()

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!token || !params.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<{ user: PublicProfile }>(`/users/${params.id}`, token)
      setProfile(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil')
    } finally {
      setLoading(false)
    }
  }, [token, params.id])

  useFocusEffect(useCallback(() => { void fetchProfile() }, [fetchProfile]))

  const ratingLabel = profile && profile.ratingCount > 0 ? profile.rating.toFixed(1) : 'Nuevo'

  return (
    <ScreenSafeArea style={s.container}>
      <View style={s.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <Text style={s.headerTitle}>Perfil</Text>
        <View style={s.headerSpacer} />
      </View>

      {loading && !profile ? (
        <View style={s.center}>
          <ActivityIndicator color={Theme.colors.lime} />
        </View>
      ) : error && !profile ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color={Theme.colors.textMuted} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : profile ? (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* ── Identidad ── */}
          <View style={s.identityCard}>
            <Avatar initials={initialsOf(profile.name)} imageUrl={profile.avatarUrl} size={76} />
            <Text style={s.name}>{profile.name}</Text>

            {(profile.isIdentityVerified || profile.isPhoneVerified) ? (
              <View style={s.badgeRow}>
                {profile.isIdentityVerified ? (
                  <View style={s.verifyBadge}>
                    <Ionicons name="shield-checkmark" size={13} color={Theme.colors.lime} />
                    <Text style={s.verifyBadgeText}>Identidad verificada</Text>
                  </View>
                ) : null}
                {profile.isPhoneVerified ? (
                  <View style={s.verifyBadge}>
                    <Ionicons name="call" size={12} color={Theme.colors.lime} />
                    <Text style={s.verifyBadgeText}>Teléfono verificado</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={s.ratingRow}>
              <Text style={s.ratingValue}>{ratingLabel}</Text>
              <Stars rating={profile.rating} size={16} />
              <Text style={s.ratingCount}>
                {profile.ratingCount > 0 ? `${profile.ratingCount} reseñas` : 'Sin reseñas aún'}
              </Text>
            </View>
          </View>

          {/* ── Stats ── */}
          <View style={s.statsRow}>
            <Text style={s.sectionTitle}>Actividad en LLEVO</Text>
            <Stat icon="car-sport-outline" value={String(profile.stats.ridesAsDriver)} label="Viajes llevando" />
            <View style={s.statDivider} />
            <Stat icon="navigate-outline" value={String(profile.stats.ridesAsPassenger)} label="Viajes realizados" />
            <View style={s.statDivider} />
            <Stat icon="cube" value={String(profile.stats.deliveries)} label="Entregas" />
            <View style={s.statDivider} />
            <Stat icon="send" value={String(profile.stats.shipments)} label="Envíos" />
            <View style={s.statDivider} />
            <Stat icon="calendar" value={memberSince(profile.createdAt)} label="Miembro desde" small />
          </View>

          {/* ── Reseñas ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Reseñas</Text>
            {profile.reviews.length === 0 ? (
              <View style={s.emptyReviews}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={Theme.colors.textMuted} />
                <Text style={s.emptyReviewsText}>Todavía no tiene reseñas.</Text>
              </View>
            ) : (
              profile.reviews.map(review => (
                <View key={review.id} style={s.reviewCard}>
                  <View style={s.reviewTop}>
                    <Avatar initials={initialsOf(review.from.name)} size={34} />
                    <View style={s.reviewWho}>
                      <Text style={s.reviewName}>{review.from.name}</Text>
                      <Text style={s.reviewDate}>{reviewDate(review.createdAt)}</Text>
                    </View>
                    <Stars rating={review.rating} size={13} />
                  </View>
                  {review.comment ? <Text style={s.reviewComment}>{review.comment}</Text> : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : null}
    </ScreenSafeArea>
  )
}

function Stat({ icon, value, label, small }: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  value: string
  label: string
  small?: boolean
}) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={15} color={Theme.colors.lime} />
      <Text style={[s.statValue, small && s.statValueSmall]} numberOfLines={1}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    height: 58, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 15 },
  headerSpacer: { width: 46 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 14, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 20 },

  // Identidad
  identityCard: {
    alignItems: 'center', gap: 10, padding: 22, borderRadius: 22,
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  name: { color: Theme.colors.text, fontFamily: Theme.fonts.display, fontSize: 22, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  verifyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(184,255,0,0.10)', borderWidth: 1, borderColor: Theme.colors.lime,
  },
  verifyBadgeText: { color: Theme.colors.lime, fontFamily: Theme.fonts.semiBold, fontSize: 11 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  ratingValue: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 18 },
  stars: { flexDirection: 'row', gap: 1 },
  ratingCount: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12 },

  // Stats
  statsRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 18,
    paddingVertical: 16, paddingHorizontal: 12, borderRadius: 18,
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  stat: { width: '33.333%', alignItems: 'center', gap: 4 },
  statValue: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 17 },
  statValueSmall: { fontSize: 12, textTransform: 'capitalize', marginTop: 2 },
  statLabel: {
    color: Theme.colors.textSubtle, fontFamily: Theme.fonts.medium,
    fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  statDivider: { display: 'none' },

  // Reseñas
  section: { gap: 12 },
  sectionTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 16 },
  emptyReviews: {
    alignItems: 'center', gap: 8, padding: 22, borderRadius: 16,
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  emptyReviewsText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13 },
  reviewCard: {
    gap: 10, padding: 16, borderRadius: 16,
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewWho: { flex: 1 },
  reviewName: { color: Theme.colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 14 },
  reviewDate: { color: Theme.colors.textSubtle, fontFamily: Theme.fonts.medium, fontSize: 11, marginTop: 1 },
  reviewComment: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, lineHeight: 19 },
})
