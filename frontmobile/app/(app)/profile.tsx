import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { PaletteName, palettes, Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../lib/theme'

function initials(name?: string) { return (name ?? 'U').split(' ').map(part => part[0]).join('').slice(0, 2) }
function splitName(name?: string) { const [firstName = '', ...last] = (name ?? '').trim().split(/\s+/); return { firstName, lastName: last.join(' ') } }

export default function ProfileScreen() {
  const { user, updateUser } = useAuth()
  const { palette, paletteName, setPalette } = useTheme()
  const colors = palette.colors
  const s = createStyles(colors)
  const initial = splitName(user?.name)
  const [firstName, setFirstName] = useState(initial.firstName)
  const [lastName, setLastName] = useState(initial.lastName)
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)
  const rating = user && user.ratingCount ? user.rating.toFixed(1) : 'Nuevo'
  const verified = Boolean(user?.driverVerifiedAt) || user?.driverVerificationStatus === 'APPROVED'

  async function save() {
    setSaving(true)
    try {
      await updateUser({ name: [firstName, lastName].filter(Boolean).join(' '), email })
      Alert.alert('Perfil actualizado', 'Tus datos se guardaron correctamente.')
    } catch (err) { Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Intentá nuevamente.') } finally { setSaving(false) }
  }

  return <ScreenSafeArea style={s.container}>
    <View style={s.header}><IconButton name="chevron-back" onPress={() => router.back()} /><Text style={s.headerTitle}>Mi perfil</Text><View style={s.spacer} /></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <Avatar initials={initials(user?.name)} imageUrl={user?.avatarUrl} size={86} />
        <Text style={s.name}>{user?.name ?? 'Usuario LLEVO'}</Text>
        <View style={s.rating}><Ionicons name="star" size={16} color={colors.lime} /><Text style={s.ratingText}>{rating}</Text><Text style={s.ratingCount}>· {user?.ratingCount ?? 0} reseñas</Text></View>
        <View style={s.badges}>
          {verified ? <Badge icon="shield-checkmark" text="Identidad verificada" /> : null}
          {user?.phoneVerifiedAt ? <Badge icon="call" text="Teléfono verificado" /> : null}
          {!verified && !user?.phoneVerifiedAt ? <Text style={s.newUser}>Completá tus verificaciones para generar confianza.</Text> : null}
        </View>
        <TouchableOpacity style={s.publicLink} onPress={() => user && router.push({ pathname: '/user/[id]', params: { id: user.id } })}><Ionicons name="eye-outline" size={17} color={colors.lime} /><Text style={s.publicLinkText}>Ver mi perfil público</Text></TouchableOpacity>
      </View>
      <View style={s.section}><Text style={s.sectionTitle}>Datos personales</Text><Text style={s.sectionHint}>Esta información no se muestra completa a otros usuarios.</Text>
        <Input label="Nombre" value={firstName} onChangeText={setFirstName} placeholder="Nombre" />
        <Input label="Apellido" value={lastName} onChangeText={setLastName} placeholder="Apellido" />
        <Input label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="tu@email.com" keyboardType="email-address" autoCapitalize="none" />
        <TouchableOpacity style={s.phoneRow} onPress={() => router.push('/verify-phone')}><View><Text style={s.phoneLabel}>TELÉFONO</Text><Text style={s.phoneValue}>{user?.phone ?? 'Agregar y verificar teléfono'}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></TouchableOpacity>
      </View>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Apariencia</Text>
        <Text style={s.sectionHint}>Probá el estilo visual que prefieras. Se guarda en este dispositivo.</Text>
        <View style={s.paletteGrid}>
          {(Object.keys(palettes) as PaletteName[]).map(name => {
            const option = palettes[name]
            const selected = name === paletteName
            return <TouchableOpacity key={name} activeOpacity={0.84} onPress={() => void setPalette(name)} style={[s.paletteOption, selected && { borderColor: colors.lime }]}>
              <View style={s.swatches}><View style={[s.swatch, { backgroundColor: option.colors.background }]} /><View style={[s.swatch, { backgroundColor: option.colors.surface }]} /><View style={[s.swatch, { backgroundColor: option.colors.lime }]} /></View>
              <Text style={s.paletteName} numberOfLines={1}>{option.name}</Text>
              {selected ? <Ionicons name="checkmark-circle" size={17} color={colors.lime} /> : null}
            </TouchableOpacity>
          })}
        </View>
      </View>
      <Button label="Guardar cambios" onPress={save} loading={saving} style={s.save} />
    </ScrollView>
  </ScreenSafeArea>
}

function Badge({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) { const { palette } = useTheme(); return <View style={[sShared.badge, { borderColor: palette.colors.lime, backgroundColor: `${palette.colors.lime}18` }]}><Ionicons name={icon} size={13} color={palette.colors.lime} /><Text style={[sShared.badgeText, { color: palette.colors.lime }]}>{text}</Text></View> }
const sShared = StyleSheet.create({ badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5 }, badgeText: { fontFamily: Theme.fonts.semiBold, fontSize: 11 } })
const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, header: { height: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerTitle: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 20 }, spacer: { width: 46 }, content: { padding: 20, paddingTop: 6, paddingBottom: 34, gap: 18 },
  hero: { alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 24 }, name: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 24, marginTop: 12 }, rating: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 }, ratingText: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 16 }, ratingCount: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13 }, badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginTop: 14 }, newUser: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, textAlign: 'center' }, publicLink: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 19, padding: 8 }, publicLinkText: { color: colors.lime, fontFamily: Theme.fonts.semiBold, fontSize: 14 },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16 }, sectionTitle: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 16 }, sectionHint: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 14 }, phoneRow: { minHeight: 62, borderTopWidth: 1, borderTopColor: colors.borderSoft, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 13 }, phoneLabel: { color: colors.textSubtle, fontFamily: Theme.fonts.semiBold, fontSize: 10, letterSpacing: .5 }, phoneValue: { color: colors.text, fontFamily: Theme.fonts.medium, fontSize: 14, marginTop: 4 }, save: { marginTop: 2 },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, paletteOption: { width: '48%', minHeight: 74, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, padding: 10, justifyContent: 'space-between' }, swatches: { flexDirection: 'row' }, swatch: { width: 20, height: 15, borderRadius: 4, marginRight: -3, borderWidth: 1, borderColor: colors.border }, paletteName: { color: colors.text, fontFamily: Theme.fonts.medium, fontSize: 11, paddingRight: 18 },
})
