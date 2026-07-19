import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Theme } from '../../constants/theme'
import { themedStyles } from '../../lib/theme'
import { useAuth } from '../../lib/auth'
import {
  createVehicle, deleteVehicle, fetchVehicles, updateVehicle,
  VEHICLE_TYPE_LABELS, type Vehicle, type VehicleType,
} from '../../lib/vehicles'

const TYPE_OPTIONS: VehicleType[] = ['AUTO', 'CAMIONETA', 'CAMION', 'MOTO']

type FormState = {
  type: VehicleType
  licensePlate: string
  model: string
  color: string
  seats: number
}

const EMPTY_FORM: FormState = { type: 'AUTO', licensePlate: '', model: '', color: '', seats: 4 }

export default function DriverVehiclesScreen() {
  const { token } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      setVehicles(await fetchVehicles(token))
    } catch {} finally {
      setLoading(false)
    }
  }, [token])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(v: Vehicle) {
    setEditing(v)
    setForm({
      type: v.type,
      licensePlate: v.licensePlate ?? '',
      model: v.model ?? '',
      color: v.color ?? '',
      seats: v.seats,
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!token) return
    if (form.seats < 1) { setError('Los asientos deben ser al menos 1.'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        type: form.type,
        licensePlate: form.licensePlate.trim() || undefined,
        model: form.model.trim() || undefined,
        color: form.color.trim() || undefined,
        seats: form.seats,
      }
      if (editing) await updateVehicle(token, editing.id, payload)
      else await createVehicle(token, payload)
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el vehículo.')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(v: Vehicle) {
    Alert.alert('Eliminar vehículo', `¿Eliminar ${VEHICLE_TYPE_LABELS[v.type]}${v.licensePlate ? ` ${v.licensePlate}` : ''}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void handleDelete(v.id) },
    ])
  }

  async function handleDelete(id: string) {
    if (!token) return
    setDeletingId(id)
    try {
      await deleteVehicle(token, id)
      setVehicles(prev => prev.filter(v => v.id !== id))
    } catch (err) {
      Alert.alert('No se pudo eliminar', err instanceof Error ? err.message : 'Intentá de nuevo.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <ScreenSafeArea style={s.container}>
      <View style={s.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <View style={s.headerCopy}>
          <Text style={s.headerLabel}>Modo conductor</Text>
          <Text style={s.headerTitle}>Mis vehículos</Text>
        </View>
      </View>

      {loading && vehicles.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={Theme.colors.lime} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {vehicles.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Ionicons name="car-sport" size={26} color={Theme.colors.lime} /></View>
              <Text style={s.emptyTitle}>Todavía no cargaste vehículos</Text>
              <Text style={s.emptyText}>Agregá un vehículo con sus asientos para poder llevar pasajeros en tus rutas.</Text>
            </View>
          ) : (
            vehicles.map(v => (
              <View key={v.id} style={s.card}>
                <View style={s.cardIcon}>
                  <Ionicons name={v.type === 'MOTO' ? 'bicycle' : 'car-sport'} size={20} color={Theme.colors.lime} />
                </View>
                <View style={s.cardCopy}>
                  <Text style={s.cardTitle}>{VEHICLE_TYPE_LABELS[v.type]}{v.model ? ` · ${v.model}` : ''}</Text>
                  <Text style={s.cardSub}>
                    {[v.licensePlate, v.color].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                  </Text>
                  <View style={s.seatsChip}>
                    <Ionicons name="people" size={12} color={Theme.colors.lime} />
                    <Text style={s.seatsChipText}>{v.seats} asientos</Text>
                  </View>
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(v)} style={s.iconBtn} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={18} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(v)} style={s.iconBtn} activeOpacity={0.7} disabled={deletingId === v.id}>
                    {deletingId === v.id
                      ? <ActivityIndicator size="small" color={Theme.colors.danger} />
                      : <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={openCreate}>
            <Ionicons name="add" size={20} color={Theme.colors.black} />
            <Text style={s.addBtnText}>Agregar vehículo</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? 'Editar vehículo' : 'Nuevo vehículo'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>Tipo de vehículo</Text>
              <View style={s.typeGrid}>
                {TYPE_OPTIONS.map(t => {
                  const active = form.type === t
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[s.typeChip, active && s.typeChipActive]}
                      activeOpacity={0.8}
                      onPress={() => setForm(f => ({ ...f, type: t }))}
                    >
                      <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{VEHICLE_TYPE_LABELS[t]}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Input label="Patente (opcional)" value={form.licensePlate} onChangeText={t => setForm(f => ({ ...f, licensePlate: t }))} placeholder="ABC 123" autoCapitalize="characters" />
              <Input label="Modelo (opcional)" value={form.model} onChangeText={t => setForm(f => ({ ...f, model: t }))} placeholder="Renault Logan" autoCapitalize="words" />
              <Input label="Color (opcional)" value={form.color} onChangeText={t => setForm(f => ({ ...f, color: t }))} placeholder="Blanco" autoCapitalize="words" />

              <Text style={s.fieldLabel}>Asientos para pasajeros</Text>
              <View style={s.stepper}>
                <TouchableOpacity style={s.stepBtn} activeOpacity={0.8} onPress={() => setForm(f => ({ ...f, seats: Math.max(1, f.seats - 1) }))}>
                  <Ionicons name="remove" size={20} color={Theme.colors.text} />
                </TouchableOpacity>
                <Text style={s.stepValue}>{form.seats}</Text>
                <TouchableOpacity style={s.stepBtn} activeOpacity={0.8} onPress={() => setForm(f => ({ ...f, seats: Math.min(20, f.seats + 1) }))}>
                  <Ionicons name="add" size={20} color={Theme.colors.text} />
                </TouchableOpacity>
                <Text style={s.stepHint}>sin contar al conductor</Text>
              </View>

              {error ? (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={Theme.colors.danger} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}
            </ScrollView>

            <Button label={editing ? 'Guardar cambios' : 'Agregar vehículo'} onPress={() => void handleSave()} loading={saving} style={s.saveBtn} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenSafeArea>
  )
}

const s = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  headerCopy: { flex: 1 },
  headerLabel: { color: Theme.colors.lime, fontFamily: Theme.fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  headerTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 16, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 12 },

  empty: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 20, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.backgroundDeep },
  emptyTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 15 },
  emptyText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, lineHeight: 20, textAlign: 'center' },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.backgroundDeep },
  cardCopy: { flex: 1, gap: 3 },
  cardTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 15 },
  cardSub: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12 },
  seatsChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 2, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, backgroundColor: Theme.colors.backgroundDeep },
  seatsChipText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.semiBold, fontSize: 11 },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.backgroundDeep },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, backgroundColor: Theme.colors.lime, marginTop: 4 },
  addBtnText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 15 },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: Theme.colors.scrim },
  modalCard: { maxHeight: '88%', backgroundColor: Theme.colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, borderTopWidth: 1, borderColor: Theme.colors.border },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Theme.colors.border, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 18 },

  fieldLabel: { color: Theme.colors.textSubtle, fontFamily: Theme.fonts.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginTop: 6 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border },
  typeChipActive: { backgroundColor: Theme.colors.lime, borderColor: Theme.colors.lime },
  typeChipText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.semiBold, fontSize: 13 },
  typeChipTextActive: { color: Theme.colors.black },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  stepBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border },
  stepValue: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 20, minWidth: 28, textAlign: 'center' },
  stepHint: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: Theme.colors.dangerSurface, marginTop: 10 },
  errorText: { flex: 1, color: Theme.colors.text, fontFamily: Theme.fonts.medium, fontSize: 12 },
  saveBtn: { marginTop: 14 },
}))