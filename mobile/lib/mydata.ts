import { supabase } from './supabase';

export type Shift = {
  id: string;
  starts_at: string;
  ends_at: string;
  area: string | null;
  note: string | null;
  employee_id: string | null;
};

export type Absence = {
  id: string;
  employee_id: string;
  data: { type: string; from: string; to: string; status: string; note?: string };
};

export type Contract = {
  employee_id: string;
  contract_type: string | null;
  hours_per_week: number | null;
  vacation_days: number | null;
};

// Eigene und offene Schichten der Firma ab heute (RLS erlaubt genau das,
// was ein einfacher Mitarbeiter sehen darf).
export async function fetchUpcomingShifts(companyId: string, limit = 8) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('shifts')
    .select('id, starts_at, ends_at, area, note, employee_id')
    .eq('company_id', companyId)
    .gte('starts_at', startOfToday.toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Shift[];
}

export async function fetchMyContract(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_contracts')
    .select('employee_id, contract_type, hours_per_week, vacation_days')
    .eq('employee_id', employeeId)
    .maybeSingle();
  if (error) throw error;
  return data as Contract | null;
}

// "absences" ist eine generische Modul-Tabelle (id, company_id, employee_id, data jsonb)
export async function fetchMyAbsences(companyId: string, employeeId: string) {
  const { data, error } = await supabase
    .from('absences')
    .select('id, employee_id, data')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .order('id', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []) as Absence[];
}

export async function requestAbsence(
  companyId: string,
  employeeId: string,
  payload: { type: string; from: string; to: string; note?: string }
) {
  const { error } = await supabase.from('absences').insert({
    company_id: companyId,
    employee_id: employeeId,
    data: { ...payload, status: 'beantragt' },
  });
  if (error) throw error;
}

export function vacationTaken(absences: Absence[]) {
  let days = 0;
  for (const a of absences) {
    if (a.data.type !== 'Urlaub' || a.data.status === 'abgelehnt') continue;
    const from = new Date(a.data.from + 'T00:00:00');
    const to = new Date(a.data.to + 'T00:00:00');
    days += Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  }
  return days;
}
