create or replace function public.is_hexbridge_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_hexbridge_admin() from public;
grant execute on function public.is_hexbridge_admin() to authenticated;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requester_name text,
  requester_email text,
  requester_role text,
  subject text not null check (char_length(trim(subject)) between 3 and 120),
  message text not null check (char_length(trim(message)) between 10 and 5000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  admin_reply text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_created_at_idx
  on public.support_tickets(user_id, created_at desc);

create index if not exists support_tickets_status_created_at_idx
  on public.support_tickets(status, created_at desc);

alter table public.support_tickets enable row level security;

grant select, insert, update on public.support_tickets to authenticated;

drop policy if exists "Users can view their own support tickets" on public.support_tickets;
create policy "Users can view their own support tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id or public.is_hexbridge_admin());

drop policy if exists "Authenticated users can create support tickets" on public.support_tickets;
create policy "Authenticated users can create support tickets"
  on public.support_tickets for insert
  with check (
    auth.uid() = user_id
    and status = 'open'
    and admin_reply is null
    and responded_at is null
  );

drop policy if exists "Admins can update support tickets" on public.support_tickets;
create policy "Admins can update support tickets"
  on public.support_tickets for update
  using (public.is_hexbridge_admin())
  with check (public.is_hexbridge_admin());
