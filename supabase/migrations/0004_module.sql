-- ============================================================
-- Lincom – alle Module auf die echte Datenbank
-- Jede Modul-Tabelle: id, company_id, employee_id (für „eigene“ Datensätze),
-- data (jsonb mit den Details), updated_at. Rechte je Rolle per Policy.
-- ============================================================

-- ---------- Ergänzungen bestehender Tabellen ----------
alter table public.employees add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.companies add column if not exists modules jsonb not null
  default '{"finanzen":true,"kunden":true,"personal":true,"schichten":true,"organisation":true,"verwaltung":true}'::jsonb;

-- Spaltenrechte: Inhaber/Admin dürfen nur Stammdaten der Firma ändern (nicht Abo-Status, Code, Ersteller)
revoke update on public.companies from authenticated, anon;
grant update (name, industry, searchable, modules) on public.companies to authenticated;
-- Profil: nur der Name ist änderbar
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;
-- Personalstamm: Verknüpfung zum Konto nur über Funktionen (Annehmen einer Anfrage)
revoke update on public.employees from authenticated, anon;
grant update (first_name, last_name, job_title, department, active, data) on public.employees to authenticated;

-- ---------- Modul-Tabellen ----------
-- Rollenkürzel:  M = Leitung (owner, admin, planner, hr, accounting)
--                F = Finanzen (owner, admin, accounting)
--                H = Personal (owner, admin, hr)
--                V = Verwaltung (owner, admin, hr, accounting)
do $$
declare
  t record;
  mgr  text := 'array[''owner'',''admin'',''planner'',''hr'',''accounting'']::public.member_role[]';
  fin  text := 'array[''owner'',''admin'',''accounting'']::public.member_role[]';
  hrr  text := 'array[''owner'',''admin'',''hr'']::public.member_role[]';
  adm  text := 'array[''owner'',''admin'',''hr'',''accounting'']::public.member_role[]';
  plan text := 'array[''owner'',''admin'',''planner'']::public.member_role[]';
  own  text := 'employee_id in (select private.my_employee_ids())';
  rd text; wr text;
begin
  for t in select * from (values
    -- name,            lesen,            schreiben,         alle Mitglieder lesen, alle schreiben, eigene lesen, eigene schreiben, Zusatzbedingung für eigene
    ('customers',       mgr,  mgr,  false, false, false, false, null),
    ('tickets',         mgr,  mgr,  false, false, false, false, null),
    ('projects',        mgr,  mgr,  true,  false, false, false, null),
    ('tasks',           mgr,  mgr,  true,  true,  false, false, null),
    ('time_entries',    mgr,  mgr,  false, false, true,  true,  null),
    ('clocks',          mgr,  mgr,  false, false, true,  true,  null),
    ('invoices',        fin,  fin,  false, false, false, false, null),
    ('expenses',        fin,  fin,  false, false, false, false, null),
    ('deadlines',       adm,  adm,  false, false, false, false, null),
    ('documents',       adm,  adm,  false, false, false, false, null),
    ('compliance_items',adm,  adm,  false, false, false, false, null),
    ('onboarding',      hrr,  hrr,  false, false, false, false, null),
    ('candidates',      hrr,  hrr,  false, false, false, false, null),
    ('personnel_docs',  hrr,  hrr,  false, false, true,  false, null),
    ('absences',        'array[''owner'',''admin'',''hr'',''planner'']::public.member_role[]', hrr, false, false, true, true, 'data->>''status'' = ''beantragt'''),
    ('swaps',           mgr,  plan, true,  false, true,  true,  'data->>''status'' = ''offen'''),
    ('web_requests',    'array[''owner'',''admin'']::public.member_role[]', 'array[''owner'',''admin'']::public.member_role[]', false, false, false, false, null)
  ) as v(name, r_roles, w_roles, r_all, w_all, o_read, o_write, o_check)
  loop
    execute format($f$
      create table public.%1$I (
        id uuid primary key default gen_random_uuid(),
        company_id uuid not null references public.companies (id) on delete cascade,
        employee_id uuid,
        data jsonb not null default '{}'::jsonb,
        updated_at timestamptz not null default now(),
        foreign key (company_id, employee_id) references public.employees (company_id, id) on delete set null (employee_id)
      );
      create index %1$s_company_idx on public.%1$I (company_id);
      create index %1$s_company_emp_idx on public.%1$I (company_id, employee_id);
      alter table public.%1$I enable row level security;
      create trigger %1$s_touch before update on public.%1$I for each row execute function public.touch_updated_at();
    $f$, t.name);

    rd := format('private.has_role(company_id, %s)', t.r_roles);
    if t.r_all then rd := rd || ' or private.is_member(company_id)'; end if;
    if t.o_read then rd := rd || ' or ' || own; end if;
    execute format('create policy %1$s_select on public.%1$I for select to authenticated using (%2$s)', t.name, rd);

    wr := format('private.has_role(company_id, %s)', t.w_roles);
    if t.w_all then wr := wr || ' or private.is_member(company_id)'; end if;
    if t.o_write then
      wr := wr || ' or (' || own || coalesce(' and ' || t.o_check, '') || ')';
    end if;
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (%2$s)', t.name, wr);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (%2$s) with check (%2$s)', t.name, wr);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated using (%2$s)', t.name, wr);
  end loop;
end $$;

-- Rechnungsnummern pro Firma eindeutig
create unique index invoices_no_unique on public.invoices (company_id, (data->>'no')) where data ? 'no';

-- ---------- Finanz-Einstellungen (Prognose-Annahmen, Kontoverlauf) ----------
create table public.finance_state (
  company_id uuid primary key references public.companies (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.finance_state enable row level security;
create trigger finance_state_touch before update on public.finance_state for each row execute function public.touch_updated_at();
create policy finance_state_select on public.finance_state for select to authenticated
  using (private.has_role(company_id, array['owner', 'admin', 'accounting']::public.member_role[]));
create policy finance_state_insert on public.finance_state for insert to authenticated
  with check (private.has_role(company_id, array['owner', 'admin', 'accounting']::public.member_role[]));
create policy finance_state_update on public.finance_state for update to authenticated
  using (private.has_role(company_id, array['owner', 'admin', 'accounting']::public.member_role[]))
  with check (private.has_role(company_id, array['owner', 'admin', 'accounting']::public.member_role[]));
