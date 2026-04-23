create table if not exists public.clients (
  id uuid not null default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  building_name text,
  apartment_number text,
  street text,
  property_type text,
  status text,
  purchase_date date,
  deal_value numeric,
  realtor_name text,
  realtor_agency text,
  commission_type text not null default 'percent',
  commission_value numeric not null default 0,
  notes text,
  constraint clients_pkey primary key (id)
);

alter table public.clients enable row level security;

drop policy if exists "Allow anon read clients" on public.clients;
create policy "Allow anon read clients"
on public.clients for select
to anon
using (true);

drop policy if exists "Allow anon insert clients" on public.clients;
create policy "Allow anon insert clients"
on public.clients for insert
to anon
with check (true);

drop policy if exists "Allow anon update clients" on public.clients;
create policy "Allow anon update clients"
on public.clients for update
to anon
using (true)
with check (true);

drop policy if exists "Allow anon delete clients" on public.clients;
create policy "Allow anon delete clients"
on public.clients for delete
to anon
using (true);
