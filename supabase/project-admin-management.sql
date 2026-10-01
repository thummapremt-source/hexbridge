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

grant select, insert, update, delete on public.projects to authenticated;

drop policy if exists "Designers can view open projects" on public.projects;
create policy "Designers can view open projects"
  on public.projects for select
  to authenticated
  using (
    status = 'open'
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'designer'
    )
  );

drop policy if exists "Homeowners can view their projects" on public.projects;
create policy "Homeowners can view their projects"
  on public.projects for select
  to authenticated
  using (homeowner_id = (select auth.uid()));

drop policy if exists "Admins can view all projects" on public.projects;
create policy "Admins can view all projects"
  on public.projects for select
  to authenticated
  using (public.is_hexbridge_admin());

drop policy if exists "Homeowners can create projects" on public.projects;
create policy "Homeowners can create projects"
  on public.projects for insert
  to authenticated
  with check (
    homeowner_id = (select auth.uid())
    and status = 'open'
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'homeowner'
    )
  );

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
