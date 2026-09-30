import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

export type Membership = {
  company_id: string;
  role: 'owner' | 'admin' | 'planner' | 'hr' | 'accounting' | 'employee';
  employee_id: string | null;
  company: { id: string; name: string } | null;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  memberships: Membership[];
  currentCompanyId: string | null;
  currentMembership: Membership | null;
  setCurrentCompanyId: (id: string) => void;
  refreshMemberships: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  const refreshMemberships = useCallback(async () => {
    const { data, error } = await supabase
      .from('memberships')
      .select('company_id, role, employee_id, company:companies(id, name)');
    if (!error && data) {
      const rows = data as unknown as Membership[];
      setMemberships(rows);
      setCurrentCompanyId((cur) => {
        if (cur && rows.some((m) => m.company_id === cur)) return cur;
        return rows[0]?.company_id ?? null;
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setMemberships([]);
        setCurrentCompanyId(null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) refreshMemberships();
  }, [session, refreshMemberships]);

  const currentMembership = useMemo(
    () => memberships.find((m) => m.company_id === currentCompanyId) ?? null,
    [memberships, currentCompanyId]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthState = {
    loading,
    session,
    memberships,
    currentCompanyId,
    currentMembership,
    setCurrentCompanyId,
    refreshMemberships,
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden');
  return v;
}
