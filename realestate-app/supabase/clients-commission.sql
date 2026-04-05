alter table if exists public.clients
  add column if not exists commission_type text not null default 'percent',
  add column if not exists commission_value numeric not null default 0;

update public.clients
set
  commission_type = coalesce(nullif(commission_type, ''), 'percent'),
  commission_value = coalesce(commission_value, 0);
