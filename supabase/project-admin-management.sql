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

alter table public.projects enable row level security;

grant update, delete on public.projects to authenticated;

drop policy if exists "Admins can update projects" on public.projects;
create policy "Admins can update projects"
  on public.projects for update
  to authenticated
  using (public.is_hexbridge_admin())
  with check (public.is_hexbridge_admin());

drop policy if exists "Admins can delete projects" on public.projects;
create policy "Admins can delete projects"
  on public.projects for delete
  to authenticated
  using (public.is_hexbridge_admin());
