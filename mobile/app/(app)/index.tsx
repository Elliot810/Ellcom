import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { colors, radius } from '../../lib/theme';
import { fmtDate, fmtTime, hoursBetween } from '../../lib/format';
import {
  fetchUpcomingShifts,
  fetchMyContract,
  fetchMyAbsences,
  vacationTaken,
  Shift,
  Absence,
  Contract,
} from '../../lib/mydata';
import AbsenceModal from '../../components/AbsenceModal';

export default function MeinBereich() {
  const { currentMembership, currentCompanyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const empId = currentMembership?.employee_id ?? null;

  const load = useCallback(async () => {
    if (!currentCompanyId) return;
    const [s, c, a] = await Promise.all([
      fetchUpcomingShifts(currentCompanyId),
      empId ? fetchMyContract(empId) : Promise.resolve(null),
      empId ? fetchMyAbsences(currentCompanyId, empId) : Promise.resolve([]),
    ]);
    setShifts(s);
    setContract(c);
    setAbsences(a);
  }, [currentCompanyId, empId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const mine = shifts.filter((s) => s.employee_id === empId);
  const weekHours = mine.reduce((sum, s) => sum + hoursBetween(s.starts_at, s.ends_at), 0);
  const taken = vacationTaken(absences);
  const remaining = contract?.vacation_days != null ? contract.vacation_days - taken : null;
  const openRequests = absences.filter((a) => a.data.status === 'beantragt');

  if (!empId) {
    return (
      <ScrollView
        contentContainerStyle={styles.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Konto noch nicht verknüpft</Text>
          <Text style={styles.cardText}>
            Dein Konto ist noch mit keinem Personalstamm-Eintrag verknüpft. Bitte wende dich an deine Personalabteilung
            – sie kann dich unter „Team" verknüpfen. Danach siehst du hier deine Schichten und kannst Urlaub
            beantragen.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{mine.length}</Text>
          <Text style={styles.statLabel}>Anstehende Schichten</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{weekHours.toFixed(1)} h</Text>
          <Text style={styles.statLabel}>Geplante Stunden</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{remaining != null ? remaining : '–'}</Text>
          <Text style={styles.statLabel}>Resturlaub (Tage)</Text>
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Nächste Schichten</Text>
      </View>
      {mine.length === 0 && <Text style={styles.empty}>Keine anstehenden Schichten eingetragen.</Text>}
      {mine.slice(0, 5).map((s) => (
        <View key={s.id} style={styles.row}>
          <View style={styles.rowIcon}>
            <Feather name="clock" size={16} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {fmtDate(s.starts_at)} · {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}
            </Text>
            {!!s.area && <Text style={styles.rowSub}>{s.area}</Text>}
          </View>
        </View>
      ))}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Abwesenheiten</Text>
        <Pressable style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Feather name="plus" size={14} color={colors.accent} />
          <Text style={styles.addBtnText}>Beantragen</Text>
        </Pressable>
      </View>
      {absences.length === 0 && <Text style={styles.empty}>Noch keine Abwesenheiten gemeldet.</Text>}
      {absences.slice(0, 6).map((a) => (
        <View key={a.id} style={styles.row}>
          <View style={[styles.rowIcon, statusStyle(a.data.status)]}>
            <Feather name={a.data.type === 'Krank' ? 'thermometer' : 'sun'} size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {a.data.type} · {a.data.from} – {a.data.to}
            </Text>
            <Text style={styles.rowSub}>{statusLabel(a.data.status)}</Text>
          </View>
        </View>
      ))}

      {contract && (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Mein Vertrag</Text>
          </View>
          <View style={styles.card}>
            {!!contract.contract_type && <Text style={styles.cardText}>Vertragsart: {contract.contract_type}</Text>}
            {contract.hours_per_week != null && (
              <Text style={styles.cardText}>Wochenstunden: {contract.hours_per_week} h</Text>
            )}
            {contract.vacation_days != null && (
              <Text style={styles.cardText}>Urlaubsanspruch: {contract.vacation_days} Tage/Jahr</Text>
            )}
          </View>
        </>
      )}

      <AbsenceModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
        companyId={currentCompanyId!}
        employeeId={empId}
      />
    </ScrollView>
  );
}

function statusLabel(s: string) {
  return s === 'genehmigt' ? 'Genehmigt' : s === 'abgelehnt' ? 'Abgelehnt' : 'Wird geprüft';
}
function statusStyle(s: string) {
  return { backgroundColor: s === 'genehmigt' ? colors.good : s === 'abgelehnt' ? colors.danger : colors.warn };
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  wrap: { padding: 16, paddingBottom: 40, backgroundColor: colors.bg },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  stat: {
    flex: 1,
    backgroundColor: colors.sidebar,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  statNum: { fontSize: 20, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 11, color: colors.ink2, marginTop: 2, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.active, borderRadius: radius.sm, paddingVertical: 5, paddingHorizontal: 10 },
  addBtnText: { color: colors.accent, fontWeight: '700', fontSize: 12 },
  empty: { color: colors.ink3, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  rowSub: { fontSize: 12, color: colors.ink3 },
  card: { backgroundColor: colors.sidebar, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  cardText: { fontSize: 13, color: colors.ink2, lineHeight: 19 },
});
