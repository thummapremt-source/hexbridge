alter table public.projects
add column if not exists floor_plan_url text;

alter table public.projects
add column if not exists timeline_days integer;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'package_type'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'project_tier'
  ) then
    alter table public.projects rename column package_type to project_tier;
  end if;
end $$;

alter table public.projects
add column if not exists project_tier text;

alter table public.admin_settings
add column if not exists commercial_project_fee integer default 600;

alter table public.admin_settings
add column if not exists others_project_fee integer default 250;

alter table public.admin_settings
add column if not exists starter_package_price integer default 250;

alter table public.admin_settings
add column if not exists silver_package_price integer default 675;

alter table public.admin_settings
add column if not exists gold_package_price integer default 1000;

alter table public.admin_settings
add column if not exists platinum_package_price integer default 1800;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view all projects" on public.projects;
create policy "Admins can view all projects"
on public.projects
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view all bids" on public.bids;
create policy "Admins can view all bids"
on public.bids
for select
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('floor-plans', 'floor-plans', true)
on conflict (id) do update set public = true;

create policy "Authenticated users can upload floor plans"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'floor-plans'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);