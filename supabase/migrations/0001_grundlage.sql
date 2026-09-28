-- ============================================================
-- Lincom – Grundlage: Konten, Firmen, Rollen, Beitritt,
-- Mitarbeiter und Schichten mit Row Level Security
-- ============================================================
-- Prinzip: Jede Tabelle hat RLS aktiv. Lesen regeln Policies,
-- heikle Schreibvorgänge (Firma anlegen, Anfragen annehmen,
-- Rollen ändern) laufen nur über geprüfte Funktionen.


-- ---------- Rollen ----------
create type public.member_role as enum ('owner', 'admin', 'planner', 'hr', 'accounting', 'employee');
comment on type public.member_role is
  'owner = Inhaber/GF, admin = Verwaltung, planner = Dienstplaner, hr = Personal, accounting = Buchhaltung, employee = Mitarbeiter';

-- ---------- Profile (1:1 zu auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  created_at timestamptz not null default now()
);

-- ---------- Firmen ----------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  industry text check (char_length(industry) <= 80),
  searchable boolean not null default true,
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  plan text not null default 'trial' check (plan in ('trial', 'active', 'past_due', 'cancelled')),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
comment on column public.companies.searchable is 'Firma taucht in der Firmensuche auf (Beitritt per Anfrage). Beitritt per Code geht immer.';

-- ---------- Mitarbeiter (Personalstamm) ----------
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  job_title text check (char_length(job_title) <= 80),
  department text check (char_length(department) <= 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, user_id)
);

-- Vertragsdaten getrennt, weil nur Personal/Leitung und die Person selbst sie sehen dürfen
create table public.employee_contracts (
  employee_id uuid primary key,
  company_id uuid not null,
  contract_type text check (contract_type in ('Vollzeit', 'Teilzeit', 'Minijob', 'Werkstudent', 'Aushilfe')),
  hours_per_week numeric(4, 1) check (hours_per_week between 0 and 60),
  hourly_wage numeric(7, 2) check (hourly_wage >= 0),
  vacation_days smallint check (vacation_days between 0 and 60),
  start_date date,
  end_date date,
  foreign key (company_id, employee_id) references public.employees (company_id, id) on delete cascade
);

-- ---------- Mitgliedschaften ----------
create table public.memberships (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'employee',
  employee_id uuid,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id),
  foreign key (company_id, employee_id) references public.employees (company_id, id) on delete set null (employee_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- ---------- Beitrittsanfragen ----------
create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  message text check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  decided_by uuid references auth.users (id),
  decided_at timestamptz
);
create unique index join_requests_one_pending on public.join_requests (company_id, user_id) where status = 'pending';

-- ---------- Schichten ----------
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  area text check (char_length(area) <= 60),
  note text check (char_length(note) <= 500),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '16 hours'),
  foreign key (company_id, employee_id) references public.employees (company_id, id) on delete set null (employee_id)
);
create index shifts_company_time_idx on public.shifts (company_id, starts_at);
create index shifts_employee_idx on public.shifts (employee_id);

-- ============================================================
-- Hilfsfunktionen (security definer, damit Policies nicht rekursiv werden)
-- ============================================================
create function public.my_role(cid uuid) returns public.member_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m where m.company_id = cid and m.user_id = auth.uid();
$$;

create function public.has_role(cid uuid, roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select m.role = any (roles) from public.memberships m where m.company_id = cid and m.user_id = auth.uid()), false);
$$;

create function public.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.company_id = cid and m.user_id = auth.uid());
$$;

-- Personalstamm-Einträge, die zum eingeloggten Nutzer gehören (nur in Firmen, in denen er Mitglied ist)
create function public.my_employee_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select e.id from public.employees e
  join public.memberships m on m.company_id = e.company_id and m.user_id = auth.uid()
  where e.user_id = auth.uid();
$$;

-- Wer darf welche Rolle vergeben?
create function public.can_grant(cid uuid, target public.member_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.my_role(cid)
    when 'owner' then true
    when 'admin' then target <> 'owner'
    when 'hr' then target = 'employee'
    else false end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.employees enable row level security;
alter table public.employee_contracts enable row level security;
alter table public.memberships enable row level security;
alter table public.join_requests enable row level security;
alter table public.shifts enable row level security;

-- Profile: eigenes Profil; Profile von Kollegen (gleiche Firma); Anfragende für Personalverantwortliche
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or exists (select 1 from public.memberships a join public.memberships b on a.company_id = b.company_id
             where a.user_id = auth.uid() and b.user_id = profiles.id)
  or exists (select 1 from public.join_requests r where r.user_id = profiles.id and r.status = 'pending'
             and public.has_role(r.company_id, array['owner', 'admin', 'hr']::public.member_role[]))
);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Firmen: nur Mitglieder sehen die Firma; Inhaber/Admin dürfen Stammdaten ändern
create policy companies_select on public.companies for select to authenticated using (public.is_member(id));
create policy companies_update on public.companies for update to authenticated
  using (public.has_role(id, array['owner', 'admin']::public.member_role[]))
  with check (public.has_role(id, array['owner', 'admin']::public.member_role[]));

-- Mitgliedschaften: Mitglieder sehen, wer in ihrer Firma ist. Ändern nur über Funktionen.
create policy memberships_select on public.memberships for select to authenticated using (public.is_member(company_id));

-- Beitrittsanfragen: eigene Anfragen; Personalverantwortliche sehen die Anfragen ihrer Firma
create policy join_requests_select on public.join_requests for select to authenticated using (
  user_id = auth.uid() or public.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[])
);

-- Mitarbeiter: Leitung/Planung/Personal/Buchhaltung sehen alle; einfache Mitarbeiter nur sich selbst
create policy employees_select on public.employees for select to authenticated using (
  public.has_role(company_id, array['owner', 'admin', 'planner', 'hr', 'accounting']::public.member_role[])
  or id in (select public.my_employee_ids())
);
create policy employees_write on public.employees for all to authenticated
  using (public.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]))
  with check (public.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]));

-- Verträge: Inhaber/Admin/Personal und die Person selbst (nur lesen)
create policy contracts_select on public.employee_contracts for select to authenticated using (
  public.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[])
  or employee_id in (select public.my_employee_ids())
);
create policy contracts_write on public.employee_contracts for all to authenticated
  using (public.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]))
  with check (public.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]));

-- Schichten: Planung/Leitung/Personal sehen alle; Mitarbeiter eigene + offene Schichten ihrer Firma
create policy shifts_select on public.shifts for select to authenticated using (
  public.has_role(company_id, array['owner', 'admin', 'planner', 'hr']::public.member_role[])
  or employee_id in (select public.my_employee_ids())
  or (employee_id is null and public.is_member(company_id))
);
create policy shifts_write on public.shifts for all to authenticated
  using (public.has_role(company_id, array['owner', 'admin', 'planner']::public.member_role[]))
  with check (public.has_role(company_id, array['owner', 'admin', 'planner']::public.member_role[]));

-- ============================================================
-- Trigger
-- ============================================================
-- Profil automatisch anlegen, sobald sich jemand registriert
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'full_name', 120), ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger shifts_touch before update on public.shifts
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Funktionen (RPC) für Firma, Suche und Beitritt
-- ============================================================

-- Firma anlegen: Ersteller wird Inhaber
create function public.create_company(p_name text, p_industry text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if (select count(*) from public.companies where created_by = auth.uid()) >= 5 then
    raise exception 'Maximal 5 Firmen pro Konto';
  end if;
  insert into public.companies (name, industry, created_by) values (btrim(p_name), nullif(btrim(p_industry), ''), auth.uid())
    returning id into cid;
  insert into public.memberships (company_id, user_id, role) values (cid, auth.uid(), 'owner');
  return cid;
end $$;

-- Firmensuche: nur Name und Branche, nur durchsuchbare Firmen, mind. 3 Zeichen
create function public.search_companies(q text)
returns table (id uuid, name text, industry text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.industry from public.companies c
  where auth.uid() is not null and c.searchable and char_length(btrim(q)) >= 3
    and c.name ilike '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    and not public.is_member(c.id)
  order by c.name limit 10;
$$;

create function public._request_join(cid uuid, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if public.is_member(cid) then raise exception 'Du bist bereits Mitglied dieser Firma'; end if;
  select id into rid from public.join_requests where company_id = cid and user_id = auth.uid() and status = 'pending';
  if rid is not null then return rid; end if;
  insert into public.join_requests (company_id, user_id, message) values (cid, auth.uid(), nullif(btrim(p_message), ''))
    returning id into rid;
  return rid;
end $$;

-- Anfrage an eine gefundene Firma
create function public.request_join(p_company uuid, p_message text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.companies where id = p_company and searchable) then
    raise exception 'Firma nicht gefunden';
  end if;
  return public._request_join(p_company, p_message);
end $$;

-- Anfrage per Firmencode (funktioniert auch bei nicht durchsuchbaren Firmen)
create function public.request_join_by_code(p_code text, p_message text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  select id into cid from public.companies where join_code = upper(btrim(p_code));
  if cid is null then raise exception 'Firmencode ungültig'; end if;
  return public._request_join(cid, p_message);
end $$;

create function public.cancel_join_request(p_request uuid) returns void
language sql security definer set search_path = '' as $$
  update public.join_requests set status = 'cancelled', decided_at = now()
  where id = p_request and user_id = auth.uid() and status = 'pending';
$$;

-- Anfrage annehmen (mit Rolle) oder ablehnen.
-- p_employee: vorhandenen Personalstamm-Eintrag verknüpfen; sonst wird einer angelegt.
create function public.decide_join_request(p_request uuid, p_approve boolean,
  p_role public.member_role default 'employee', p_employee uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.join_requests; eid uuid; pname text;
begin
  select * into r from public.join_requests where id = p_request for update;
  if r.id is null or r.status <> 'pending' then raise exception 'Anfrage nicht gefunden oder bereits entschieden'; end if;
  if not public.has_role(r.company_id, array['owner', 'admin', 'hr']::public.member_role[]) then
    raise exception 'Keine Berechtigung';
  end if;

  if not p_approve then
    update public.join_requests set status = 'rejected', decided_by = auth.uid(), decided_at = now() where id = r.id;
    return;
  end if;

  if not public.can_grant(r.company_id, p_role) then raise exception 'Diese Rolle darfst du nicht vergeben'; end if;

  if p_employee is not null then
    update public.employees set user_id = r.user_id
      where id = p_employee and company_id = r.company_id and user_id is null
      returning id into eid;
    if eid is null then raise exception 'Mitarbeiter-Eintrag nicht gefunden oder bereits verknüpft'; end if;
  else
    select coalesce(nullif(btrim(full_name), ''), 'Neues Mitglied') into pname from public.profiles where id = r.user_id;
    insert into public.employees (company_id, user_id, first_name, last_name)
      values (r.company_id, r.user_id, split_part(pname, ' ', 1), btrim(substr(pname, char_length(split_part(pname, ' ', 1)) + 1)))
      returning id into eid;
  end if;

  insert into public.memberships (company_id, user_id, role, employee_id) values (r.company_id, r.user_id, p_role, eid);
  update public.join_requests set status = 'approved', decided_by = auth.uid(), decided_at = now() where id = r.id;
end $$;

-- Rolle eines Mitglieds ändern
create function public.set_member_role(p_company uuid, p_user uuid, p_role public.member_role) returns void
language plpgsql security definer set search_path = '' as $$
declare cur public.member_role;
begin
  select role into cur from public.memberships where company_id = p_company and user_id = p_user for update;
  if cur is null then raise exception 'Mitglied nicht gefunden'; end if;
  if not public.can_grant(p_company, p_role) or not public.can_grant(p_company, cur) then
    raise exception 'Keine Berechtigung';
  end if;
  if cur = 'owner' and p_role <> 'owner'
     and (select count(*) from public.memberships where company_id = p_company and role = 'owner') = 1 then
    raise exception 'Die Firma braucht mindestens einen Inhaber';
  end if;
  update public.memberships set role = p_role where company_id = p_company and user_id = p_user;
end $$;

-- Mitglied entfernen (oder selbst austreten)
create function public.remove_member(p_company uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare cur public.member_role;
begin
  select role into cur from public.memberships where company_id = p_company and user_id = p_user for update;
  if cur is null then raise exception 'Mitglied nicht gefunden'; end if;
  if p_user <> auth.uid() and not public.can_grant(p_company, cur) then raise exception 'Keine Berechtigung'; end if;
  if cur = 'owner' and (select count(*) from public.memberships where company_id = p_company and role = 'owner') = 1 then
    raise exception 'Die Firma braucht mindestens einen Inhaber';
  end if;
  delete from public.memberships where company_id = p_company and user_id = p_user;
  update public.employees set user_id = null where company_id = p_company and user_id = p_user;
end $$;

-- ---------- Rechte auf Funktionen ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.create_company(text, text),
  public.search_companies(text),
  public.request_join(uuid, text),
  public.request_join_by_code(text, text),
  public.cancel_join_request(uuid),
  public.decide_join_request(uuid, boolean, public.member_role, uuid),
  public.set_member_role(uuid, uuid, public.member_role),
  public.remove_member(uuid, uuid),
  public.my_role(uuid), public.has_role(uuid, public.member_role[]), public.is_member(uuid),
  public.my_employee_ids(), public.can_grant(uuid, public.member_role)
to authenticated;
revoke execute on function public._request_join(uuid, text) from authenticated;
