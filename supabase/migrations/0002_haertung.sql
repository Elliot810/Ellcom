-- ============================================================
-- Lincom – Härtung nach Supabase-Advisor
-- 1) Hilfsfunktionen in ein nicht öffentliches Schema (nicht per API aufrufbar)
-- 2) auth.uid() in Policies nur einmal pro Abfrage auswerten
-- 3) Schreib-Policies pro Aktion statt "for all" (keine doppelte SELECT-Prüfung)
-- 4) Indizes für Fremdschlüssel
-- ============================================================

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------- 1) Hilfsfunktionen verschieben ----------
-- Policies referenzieren Funktionen intern per ID und bleiben gültig.
alter function public.my_role(uuid) set schema private;
alter function public.has_role(uuid, public.member_role[]) set schema private;
alter function public.is_member(uuid) set schema private;
alter function public.my_employee_ids() set schema private;
alter function public.can_grant(uuid, public.member_role) set schema private;
alter function public._request_join(uuid, text) set schema private;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.my_role(uuid), private.has_role(uuid, public.member_role[]),
  private.is_member(uuid), private.my_employee_ids(), private.can_grant(uuid, public.member_role)
  to authenticated;
revoke execute on function private._request_join(uuid, text) from authenticated;

-- Trigger-Funktionen braucht niemand direkt
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Funktionsrümpfe, die Hilfsfunktionen per Namen aufrufen, neu anlegen
create or replace function private.can_grant(cid uuid, target public.member_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select case private.my_role(cid)
    when 'owner' then true
    when 'admin' then target <> 'owner'
    when 'hr' then target = 'employee'
    else false end;
$$;

create or replace function private._request_join(cid uuid, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if private.is_member(cid) then raise exception 'Du bist bereits Mitglied dieser Firma'; end if;
  select id into rid from public.join_requests where company_id = cid and user_id = auth.uid() and status = 'pending';
  if rid is not null then return rid; end if;
  insert into public.join_requests (company_id, user_id, message) values (cid, auth.uid(), nullif(btrim(p_message), ''))
    returning id into rid;
  return rid;
end $$;

create or replace function public.search_companies(q text)
returns table (id uuid, name text, industry text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.industry from public.companies c
  where auth.uid() is not null and c.searchable and char_length(btrim(q)) >= 3
    and c.name ilike '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    and not private.is_member(c.id)
  order by c.name limit 10;
$$;

create or replace function public.request_join(p_company uuid, p_message text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.companies where id = p_company and searchable) then
    raise exception 'Firma nicht gefunden';
  end if;
  return private._request_join(p_company, p_message);
end $$;

create or replace function public.request_join_by_code(p_code text, p_message text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  select id into cid from public.companies where join_code = upper(btrim(p_code));
  if cid is null then raise exception 'Firmencode ungültig'; end if;
  return private._request_join(cid, p_message);
end $$;

create or replace function public.decide_join_request(p_request uuid, p_approve boolean,
  p_role public.member_role default 'employee', p_employee uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.join_requests; eid uuid; pname text;
begin
  select * into r from public.join_requests where id = p_request for update;
  if r.id is null or r.status <> 'pending' then raise exception 'Anfrage nicht gefunden oder bereits entschieden'; end if;
  if not private.has_role(r.company_id, array['owner', 'admin', 'hr']::public.member_role[]) then
    raise exception 'Keine Berechtigung';
  end if;

  if not p_approve then
    update public.join_requests set status = 'rejected', decided_by = auth.uid(), decided_at = now() where id = r.id;
    return;
  end if;

  if not private.can_grant(r.company_id, p_role) then raise exception 'Diese Rolle darfst du nicht vergeben'; end if;

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

create or replace function public.set_member_role(p_company uuid, p_user uuid, p_role public.member_role) returns void
language plpgsql security definer set search_path = '' as $$
declare cur public.member_role;
begin
  select role into cur from public.memberships where company_id = p_company and user_id = p_user for update;
  if cur is null then raise exception 'Mitglied nicht gefunden'; end if;
  if not private.can_grant(p_company, p_role) or not private.can_grant(p_company, cur) then
    raise exception 'Keine Berechtigung';
  end if;
  if cur = 'owner' and p_role <> 'owner'
     and (select count(*) from public.memberships where company_id = p_company and role = 'owner') = 1 then
    raise exception 'Die Firma braucht mindestens einen Inhaber';
  end if;
  update public.memberships set role = p_role where company_id = p_company and user_id = p_user;
end $$;

create or replace function public.remove_member(p_company uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare cur public.member_role;
begin
  select role into cur from public.memberships where company_id = p_company and user_id = p_user for update;
  if cur is null then raise exception 'Mitglied nicht gefunden'; end if;
  if p_user <> auth.uid() and not private.can_grant(p_company, cur) then raise exception 'Keine Berechtigung'; end if;
  if cur = 'owner' and (select count(*) from public.memberships where company_id = p_company and role = 'owner') = 1 then
    raise exception 'Die Firma braucht mindestens einen Inhaber';
  end if;
  delete from public.memberships where company_id = p_company and user_id = p_user;
  update public.employees set user_id = null where company_id = p_company and user_id = p_user;
end $$;

-- ---------- 2) + 3) Policies neu ----------
drop policy profiles_select on public.profiles;
drop policy profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or exists (select 1 from public.memberships a join public.memberships b on a.company_id = b.company_id
             where a.user_id = (select auth.uid()) and b.user_id = profiles.id)
  or exists (select 1 from public.join_requests r where r.user_id = profiles.id and r.status = 'pending'
             and private.has_role(r.company_id, array['owner', 'admin', 'hr']::public.member_role[]))
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy join_requests_select on public.join_requests;
create policy join_requests_select on public.join_requests for select to authenticated using (
  user_id = (select auth.uid()) or private.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[])
);

drop policy employees_write on public.employees;
create policy employees_insert on public.employees for insert to authenticated
  with check (private.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]));
create policy employees_update on public.employees for update to authenticated
  using (private.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]))
  with check (private.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]));
create policy employees_delete on public.employees for delete to authenticated
  using (private.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]));

drop policy contracts_write on public.employee_contracts;
create policy contracts_insert on public.employee_contracts for insert to authenticated
  with check (private.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]));
create policy contracts_update on public.employee_contracts for update to authenticated
  using (private.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]))
  with check (private.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]));
create policy contracts_delete on public.employee_contracts for delete to authenticated
  using (private.has_role(company_id, array['owner', 'admin', 'hr']::public.member_role[]));

drop policy shifts_write on public.shifts;
create policy shifts_insert on public.shifts for insert to authenticated
  with check (private.has_role(company_id, array['owner', 'admin', 'planner']::public.member_role[]));
create policy shifts_update on public.shifts for update to authenticated
  using (private.has_role(company_id, array['owner', 'admin', 'planner']::public.member_role[]))
  with check (private.has_role(company_id, array['owner', 'admin', 'planner']::public.member_role[]));
create policy shifts_delete on public.shifts for delete to authenticated
  using (private.has_role(company_id, array['owner', 'admin', 'planner']::public.member_role[]));

-- ---------- 4) Indizes ----------
create index if not exists companies_created_by_idx on public.companies (created_by);
create index if not exists employee_contracts_company_emp_idx on public.employee_contracts (company_id, employee_id);
create index if not exists employees_user_idx on public.employees (user_id);
create index if not exists join_requests_user_idx on public.join_requests (user_id);
create index if not exists join_requests_decided_by_idx on public.join_requests (decided_by);
create index if not exists memberships_company_emp_idx on public.memberships (company_id, employee_id);
create index if not exists shifts_company_emp_idx on public.shifts (company_id, employee_id);
create index if not exists shifts_created_by_idx on public.shifts (created_by);
