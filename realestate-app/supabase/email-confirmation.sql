alter table if exists public.clients
  add column if not exists email_confirmed boolean not null default false,
  add column if not exists email_confirmation_status text not null default 'not_sent';

alter table if exists public.leads
  add column if not exists email_confirmed boolean not null default false,
  add column if not exists email_confirmation_status text not null default 'not_sent';

update public.clients
set
  email_confirmed = coalesce(email_confirmed, false),
  email_confirmation_status = case
    when coalesce(email_confirmed, false) then 'resolved'
    else coalesce(nullif(email_confirmation_status, ''), 'not_sent')
  end;

update public.leads
set
  email_confirmed = coalesce(email_confirmed, false),
  email_confirmation_status = case
    when coalesce(email_confirmed, false) then 'resolved'
    else coalesce(nullif(email_confirmation_status, ''), 'not_sent')
  end;
