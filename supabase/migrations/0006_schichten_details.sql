-- Zusatzangaben zu Schichten (z. B. Markierung „Beispieldaten“)
alter table public.shifts add column if not exists data jsonb not null default '{}'::jsonb;
