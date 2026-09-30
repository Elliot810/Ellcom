import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { colors, radius } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { fmtTime, hoursBetween, addDays } from '../../lib/format';

type Row = {
  id: string;
  starts_at: string;
  ends_at: string;
  area: string | null;
  employee_id: string | null;
  employees: { first_name: string; last_name: string } | null;
};

function startOfWeek(offset: number) {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Montag = 0
  d.setDate(d.getDate() - day + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Plan() {
  const { currentCompanyId, currentMembership } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canSeeAll = currentMembership && ['owner', 'admin', 'planner', 'hr'].includes(currentMembership.role);
  const from = useMemo(() => startOfWeek(weekOffset), [weekOffset]);
  const to = useMemo(() => new Date(from.getTime() + 7 * 86_400_000), [from]);

  const load = useCallback(async () => {
    if (!currentCompanyId) return;
    const { data, error } = await supabase
      .from('shifts')
      .select('id, starts_at, ends_at, area, employee_id, employees(first_name, last_name)')
      .eq('company_id', currentCompanyId)
      .gte('starts_at', from.toISOString())
      .lt('starts_at', to.toISOString())
      .order('starts_at', { ascending: true });
    if (!error) setRows((data as any) || []);
  }, [currentCompanyId, from, to]);

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

  const days = Array.from({ length: 7 }, (_, i) => addDays(from.toISOString().slice(0, 10), i));
  const byDay: Record<string, Row[]> = {};
  for (const d of days) byDay[d] = [];
  for (const r of rows) {
    const key = r.starts_at.slice(0, 10);
    if (byDay[key]) byDay[key].push(r);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.weekNav}>
        <Pressable style={styles.navBtn} onPress={() => setWeekOffset((w) => w - 1)}>
          <Feather name="chevron-left" size={18} color={colors.ink} />
        </Pressable>
        <Text style={styles.weekLabel}>
          {from.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} –{' '}
          {new Date(to.getTime() - 86_400_000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
        </Text>
        <Pressable style={styles.navBtn} onPress={() => setWeekOffset((w) => w + 1)}>
          <Feather name="chevron-right" size={18} color={colors.ink} />
        </Pressable>
      </View>

      {!canSeeAll && (
        <Text style={styles.hint}>Du siehst deine eigenen sowie offene, noch nicht zugewiesene Schichten.</Text>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={colors.accent} />
      ) : (
        <FlatList
          data={days}
          keyExtractor={(d) => d}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item: day }) => {
            const list = byDay[day];
            const hours = list.reduce((s, r) => s + hoursBetween(r.starts_at, r.ends_at), 0);
            return (
              <View style={styles.dayBlock}>
                <View style={styles.dayHead}>
                  <Text style={styles.dayTitle}>
                    {new Date(day + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                  </Text>
                  {list.length > 0 && <Text style={styles.dayHours}>{hours.toFixed(1)} h</Text>}
                </View>
                {list.length === 0 ? (
                  <Text style={styles.empty}>Keine Schichten</Text>
                ) : (
                  list.map((r) => (
                    <View key={r.id} style={styles.shiftRow}>
                      <View style={styles.timeCol}>
                        <Text style={styles.time}>{fmtTime(r.starts_at)}</Text>
                        <Text style={styles.time}>{fmtTime(r.ends_at)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.person}>
                          {r.employees ? `${r.employees.first_name} ${r.employees.last_name}`.trim() : 'Offene Schicht'}
                        </Text>
                        {!!r.area && <Text style={styles.area}>{r.area}</Text>}
                      </View>
                    </View>
                  ))
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  navBtn: { padding: 8, borderRadius: radius.sm },
  weekLabel: { fontSize: 14, fontWeight: '700', color: colors.ink, minWidth: 110, textAlign: 'center' },
  hint: { fontSize: 12, color: colors.ink3, textAlign: 'center', paddingTop: 8 },
  dayBlock: { marginBottom: 16 },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dayTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink, textTransform: 'capitalize' },
  dayHours: { fontSize: 12, color: colors.ink3, fontWeight: '600' },
  empty: { fontSize: 12.5, color: colors.ink3, fontStyle: 'italic', paddingLeft: 4 },
  shiftRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.sidebar,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 6,
  },
  timeCol: { width: 52 },
  time: { fontSize: 12, color: colors.ink2, fontWeight: '600' },
  person: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  area: { fontSize: 12, color: colors.ink3 },
});
