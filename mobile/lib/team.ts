import { supabase } from './supabase';

export type CompanyInfo = { id: string; name: string; industry: string | null; join_code: string };
export type MemberRow = { user_id: string; role: string; employee_id: string | null; full_name: string };
export type JoinRequestRow = { id: string; user_id: string; message: string | null; created_at: string; full_name: string };

export async function fetchCompany(companyId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, industry, join_code')
    .eq('id', companyId)
    .single();
  if (error) throw error;
  return data as CompanyInfo;
}

async function namesFor(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
  const m = new Map<string, string>();
  (data || []).forEach((p: any) => m.set(p.id, p.full_name || 'Ohne Namen'));
  return m;
}

export async function fetchMembers(companyId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('user_id, role, employee_id')
    .eq('company_id', companyId);
  if (error) throw error;
  const names = await namesFor((data || []).map((m: any) => m.user_id));
  return (data || []).map((m: any) => ({ ...m, full_name: names.get(m.user_id) || 'Ohne Namen' }));
}

export async function fetchJoinRequests(companyId: string): Promise<JoinRequestRow[]> {
  const { data, error } = await supabase
    .from('join_requests')
    .select('id, user_id, message, created_at')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const names = await namesFor((data || []).map((r: any) => r.user_id));
  return (data || []).map((r: any) => ({ ...r, full_name: names.get(r.user_id) || 'Ohne Namen' }));
}

export async function decideJoinRequest(requestId: string, approve: boolean, role: string = 'employee') {
  const { error } = await supabase.rpc('decide_join_request', {
    p_request: requestId,
    p_approve: approve,
    p_role: role,
  });
  if (error) throw error;
}

export async function setMemberRole(companyId: string, userId: string, role: string) {
  const { error } = await supabase.rpc('set_member_role', { p_company: companyId, p_user: userId, p_role: role });
  if (error) throw error;
}

export async function leaveCompany(companyId: string, userId: string) {
  const { error } = await supabase.rpc('remove_member', { p_company: companyId, p_user: userId });
  if (error) throw error;
}
