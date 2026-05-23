import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'

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
  const nameParts = splitName(user?.name)
  const [firstName, setFirstName] = useState(nameParts.firstName)
  const [lastName, setLastName] = useState(nameParts.lastName)
  const [email, setEmail] = useState(user?.email ?? '')
  const [city, setCity] = useState(user?.city ?? 'Buenos Aires')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await updateUser({
      name: [firstName, lastName].filter(Boolean).join(' ').trim(),
      email,
      city,
      phone,
    })
    setSaving(false)
    Alert.alert('Perfil guardado', 'Tus datos se actualizaron en esta sesion.')
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
            <Ionicons name="camera" size={18} color={Theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.warning}>
          <Ionicons name="warning" size={20} color={Theme.colors.text} />
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

          <TouchableOpacity activeOpacity={0.86} style={styles.selectRow}>
            <View style={styles.selectCopy}>
              <Text style={styles.selectLabel}>Ciudad</Text>
              <Text style={styles.selectValue}>{city}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.86} style={styles.selectRow}>
            <View style={styles.selectCopy}>
              <Text style={styles.selectLabel}>Telefono</Text>
              <Text style={styles.selectValue}>{phone || 'Agregar telefono'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.inlineEdit}>
            <Input label="Editar ciudad" value={city} onChangeText={setCity} placeholder="Buenos Aires" />
            <Input label="Editar telefono" value={phone} onChangeText={setPhone} placeholder="11-1234-5678" />
          </View>
        </View>

        <Button label="Guardar" onPress={handleSave} loading={saving} style={styles.saveButton} />
      </ScrollView>
    </ScreenSafeArea>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surface,
  },
  headerTitle: {
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.surfaceMuted,
    borderWidth: 2,
    borderColor: Theme.colors.background,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Theme.colors.dangerSurface,
    marginBottom: 14,
  },
  warningText: {
    flex: 1,
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  selectCopy: {
    flex: 1,
  },
  selectLabel: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 10,
    marginBottom: 3,
  },
  selectValue: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 14,
  },
  inlineEdit: {
    marginTop: 2,
  },
  saveButton: {
    marginTop: 8,
  },
})
