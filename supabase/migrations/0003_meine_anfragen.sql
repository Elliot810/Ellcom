-- Eigene Beitrittsanfragen mit Firmennamen (vor dem Beitritt darf man die Firma sonst nicht lesen)
create or replace function public.my_join_requests()
returns table (id uuid, company_id uuid, company_name text, status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.company_id, c.name, r.status, r.created_at
  from public.join_requests r join public.companies c on c.id = r.company_id
  where r.user_id = auth.uid() and r.status in ('pending', 'rejected')
    and r.created_at > now() - interval '60 days'
  order by r.created_at desc limit 20;
$$;
revoke execute on function public.my_join_requests() from public, anon;
grant execute on function public.my_join_requests() to authenticated;
