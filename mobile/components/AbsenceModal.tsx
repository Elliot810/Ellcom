import { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, Platform, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius } from '../lib/theme';
import { requestAbsence } from '../lib/mydata';
import { lincomError } from '../lib/supabase';
import { todayIso } from '../lib/format';

const TYPES = ['Urlaub', 'Krank', 'Sonderurlaub', 'Weiterbildung'];

export default function AbsenceModal({
  visible,
  onClose,
  onSaved,
  companyId,
  employeeId,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  employeeId: string;
}) {
  const [type, setType] = useState('Urlaub');
  const [from, setFrom] = useState(new Date());
  const [to, setTo] = useState(new Date());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState<'from' | 'to' | null>(null);

  async function submit() {
    setError('');
    if (to < from) {
      setError('Das Enddatum darf nicht vor dem Startdatum liegen.');
      return;
    }
    setBusy(true);
    try {
      await requestAbsence(companyId, employeeId, {
        type,
        from: iso(from),
        to: iso(to),
        note: note.trim() || undefined,
      });
      setNote('');
      onSaved();
    } catch (e) {
      setError(lincomError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Urlaub beantragen / Abwesenheit melden</Text>

          <View style={styles.seg}>
            {TYPES.map((t) => (
              <Pressable key={t} onPress={() => setType(t)} style={[styles.segBtn, type === t && styles.segBtnActive]}>
                <Text style={[styles.segText, type === t && styles.segTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.dateRow}>
            <Pressable style={styles.dateBtn} onPress={() => setPickerOpen('from')}>
              <Text style={styles.dateLabel}>Von</Text>
              <Text style={styles.dateValue}>{iso(from)}</Text>
            </Pressable>
            <Pressable style={styles.dateBtn} onPress={() => setPickerOpen('to')}>
              <Text style={styles.dateLabel}>Bis</Text>
              <Text style={styles.dateValue}>{iso(to)}</Text>
            </Pressable>
          </View>

          {pickerOpen && (
            <DateTimePicker
              value={pickerOpen === 'from' ? from : to}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS === 'android') setPickerOpen(null);
                if (!date) return;
                if (pickerOpen === 'from') setFrom(date);
                else setTo(date);
              }}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Notiz (optional)"
            placeholderTextColor={colors.ink3}
            value={note}
            onChangeText={setNote}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Abbrechen</Text>
            </Pressable>
            <Pressable style={styles.submitBtn} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Absenden</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 34 },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 14 },
  seg: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  segBtn: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.hover },
  segBtnActive: { backgroundColor: colors.active },
  segText: { fontSize: 13, color: colors.ink2, fontWeight: '600' },
  segTextActive: { color: colors.accent },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dateBtn: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12 },
  dateLabel: { fontSize: 11, color: colors.ink3, marginBottom: 2 },
  dateValue: { fontSize: 14, fontWeight: '700', color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    marginTop: 4,
    marginBottom: 8,
  },
  error: { color: colors.danger, fontSize: 12.5, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.hover },
  cancelText: { color: colors.ink2, fontWeight: '700', fontSize: 14 },
  submitBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.accent },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
