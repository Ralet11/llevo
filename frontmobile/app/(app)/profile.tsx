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

function splitName(fullName?: string) {
  const parts = (fullName ?? '').trim().split(' ').filter(Boolean)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

function initials(name?: string) {
  if (!name) return 'U'
  return name.split(' ').map(part => part[0]).join('').slice(0, 2)
}

export default function ProfileScreen() {
  const { user, updateUser } = useAuth()
  const { palette, paletteName, setPalette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)
  const nameParts = splitName(user?.name)
  const [firstName, setFirstName] = useState(nameParts.firstName)
  const [lastName, setLastName] = useState(nameParts.lastName)
  const [email, setEmail] = useState(user?.email ?? '')
  const [city, setCity] = useState(user?.city ?? 'Buenos Aires')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateUser({
        name: [firstName, lastName].filter(Boolean).join(' ').trim(),
        email,
      })
      Alert.alert('Perfil guardado', 'Tus datos se actualizaron correctamente.')
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Intenta de nuevo en unos segundos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Configuracion del perfil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarWrap}>
          <Avatar initials={initials(`${firstName} ${lastName}`)} size={94} />
          <TouchableOpacity activeOpacity={0.86} style={styles.cameraButton}>
            <Ionicons name="camera" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.warning}>
          <Ionicons name="warning" size={20} color={colors.text} />
          <Text style={styles.warningText}>
            Tu foto de perfil aun no fue cargada. Subir una foto clara ayuda a generar confianza.
          </Text>
        </View>

        <View style={styles.form}>
          <Input label="Nombre" value={firstName} onChangeText={setFirstName} placeholder="Nombre" />
          <Input label="Apellido" value={lastName} onChangeText={setLastName} placeholder="Apellido" />
          <Input
            label="Correo electronico"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input label="Ciudad" value={city} onChangeText={setCity} placeholder="Buenos Aires" />

          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.selectRow}
            onPress={() => router.push('/verify-phone')}
          >
            <View style={styles.selectCopy}>
              <Text style={styles.selectLabel}>Telefono</Text>
              <Text style={styles.selectValue}>
                {user?.phone ? user.phone : 'Agregar telefono'}
              </Text>
              {user?.phone && !user.phoneVerifiedAt ? (
                <Text style={styles.selectHint}>Pendiente de verificar</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.paletteSection}>
            <Text style={styles.paletteTitle}>Paleta de prueba</Text>
            <Text style={styles.paletteHint}>El cambio se guarda en este dispositivo.</Text>
            <View style={styles.paletteList}>
              {(Object.keys(palettes) as PaletteName[]).map((name) => {
                const option = palettes[name]
                const selected = name === paletteName
                return (
                  <TouchableOpacity
                    key={name}
                    activeOpacity={0.84}
                    onPress={() => setPalette(name)}
                    style={[styles.paletteOption, selected && styles.paletteOptionSelected]}
                  >
                    <View style={styles.paletteSwatches}>
                      <View style={[styles.swatch, { backgroundColor: option.colors.background }]} />
                      <View style={[styles.swatch, { backgroundColor: option.colors.surface }]} />
                      <View style={[styles.swatch, { backgroundColor: option.colors.lime }]} />
                    </View>
                    <View style={styles.paletteCopy}>
                      <Text style={styles.paletteName}>{option.name}</Text>
                      <Text style={styles.paletteDescription}>{option.description}</Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.lime} /> : null}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>

        <Button label="Guardar" onPress={handleSave} loading={saving} style={styles.saveButton} />
      </ScrollView>
    </ScreenSafeArea>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  headerTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  headerSpacer: {
    width: 46,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
  },
  cameraButton: {
    position: 'absolute',
    right: '35%',
    bottom: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.background,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.dangerSurface,
    marginBottom: 14,
  },
  warningText: {
    flex: 1,
    color: colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  form: {
    gap: 0,
  },
  selectRow: {
    minHeight: 58,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectCopy: {
    flex: 1,
  },
  selectLabel: {
    color: colors.textSubtle,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 10,
    marginBottom: 3,
  },
  selectValue: {
    color: colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 14,
  },
  selectHint: {
    color: colors.warning,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 11,
    marginTop: 3,
  },
  saveButton: {
    marginTop: 8,
  },
  paletteSection: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paletteTitle: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 14 },
  paletteHint: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 11, marginTop: 4, marginBottom: 10 },
  paletteList: { gap: 8 },
  paletteOption: {
    minHeight: 62, borderRadius: Theme.radius.md, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  paletteOptionSelected: { borderColor: colors.lime },
  paletteSwatches: { flexDirection: 'row', marginRight: 10 },
  swatch: { width: 17, height: 30, borderRadius: 5, marginRight: -4, borderWidth: 1, borderColor: colors.border },
  paletteCopy: { flex: 1, marginLeft: 4 },
  paletteName: { color: colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 13 },
  paletteDescription: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 10, marginTop: 2 },
})
