create table if not exists public.buildings (
  name text primary key,
  created_at timestamptz not null default now()
);

alter table public.buildings enable row level security;

drop policy if exists "Allow anon read buildings" on public.buildings;
create policy "Allow anon read buildings"
on public.buildings for select
to anon
using (true);

drop policy if exists "Allow anon insert buildings" on public.buildings;
create policy "Allow anon insert buildings"
on public.buildings for insert
to anon
with check (true);

drop policy if exists "Allow anon update buildings" on public.buildings;
create policy "Allow anon update buildings"
on public.buildings for update
to anon
using (true)
with check (true);

drop policy if exists "Allow anon delete buildings" on public.buildings;
create policy "Allow anon delete buildings"
on public.buildings for delete
to anon
using (true);
