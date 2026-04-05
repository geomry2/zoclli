create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  building_name text not null,
  apartment_number text not null,
  property_type text not null,
  status text not null,
  purchase_date date,
  deal_value numeric default 0,
  realtor_name text default '',
  realtor_agency text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  unique (building_name, apartment_number)
);

alter table public.units enable row level security;

drop policy if exists "Allow anon read units" on public.units;
create policy "Allow anon read units"
on public.units for select
to anon
using (true);

drop policy if exists "Allow anon insert units" on public.units;
create policy "Allow anon insert units"
on public.units for insert
to anon
with check (true);

drop policy if exists "Allow anon update units" on public.units;
create policy "Allow anon update units"
on public.units for update
to anon
using (true)
with check (true);

drop policy if exists "Allow anon delete units" on public.units;
create policy "Allow anon delete units"
on public.units for delete
to anon
using (true);
