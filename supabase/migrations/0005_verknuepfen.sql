-- Konto eines Mitglieds mit einem Personalstamm-Eintrag verknüpfen (z. B. Inhaber trägt sich selbst ein)
create or replace function public.link_employee(p_company uuid, p_user uuid, p_employee uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(p_company, array['owner', 'admin', 'hr']::public.member_role[]) then
    raise exception 'Keine Berechtigung';
  end if;
  if not exists (select 1 from public.memberships where company_id = p_company and user_id = p_user) then
    raise exception 'Diese Person ist kein Mitglied der Firma';
  end if;
  if exists (select 1 from public.employees where company_id = p_company and user_id = p_user and id <> p_employee) then
    raise exception 'Dieses Konto ist bereits mit einem anderen Eintrag verknüpft';
  end if;
  update public.employees set user_id = p_user
    where id = p_employee and company_id = p_company and (user_id is null or user_id = p_user);
  if not found then raise exception 'Mitarbeiter-Eintrag nicht gefunden oder bereits verknüpft'; end if;
  update public.memberships set employee_id = p_employee where company_id = p_company and user_id = p_user;
end $$;
revoke execute on function public.link_employee(uuid, uuid, uuid) from public, anon;
grant execute on function public.link_employee(uuid, uuid, uuid) to authenticated;
