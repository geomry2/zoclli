create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null default 'inbox' check (status in ('inbox', 'todo', 'in_progress', 'waiting', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_at timestamptz,
  assignee text not null default '',
  created_by text not null default '',
  related_entity_type text check (related_entity_type in ('lead', 'client', 'property', 'deal')),
  related_entity_id text not null default '',
  source text not null default 'manual' check (source in ('manual', 'voice', 'ai', 'automation')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_due_at_idx on public.tasks (due_at);
create index if not exists tasks_related_entity_idx on public.tasks (related_entity_type, related_entity_id);

create or replace function public.set_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_tasks_updated_at();
