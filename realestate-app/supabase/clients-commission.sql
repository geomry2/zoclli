-- Migration: add commission_type and commission_value columns to clients table.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- Run this against an existing Supabase project that was created before these
-- columns were added. New projects should use clients.sql which already
-- includes these columns.

alter table public.clients
  add column if not exists commission_type text not null default 'percent',
  add column if not exists commission_value numeric not null default 0;

update public.clients
set
  commission_type = coalesce(nullif(commission_type, ''), 'percent'),
  commission_value = coalesce(commission_value, 0);

-- Reload the PostgREST schema cache so the new columns are immediately visible.
notify pgrst, 'reload schema';
