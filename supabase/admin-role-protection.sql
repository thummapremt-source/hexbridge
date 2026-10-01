-- Admin authorization comes from trusted app_metadata, which users cannot update.
-- Set app_metadata.role = 'admin' only for approved users using Supabase's
-- privileged Auth Admin API or SQL editor, then refresh their session.
-- Example for a reviewed user UUID:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where id = '<approved-user-uuid>';

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

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    (tg_op = 'INSERT' and new.role = 'admin')
    or (tg_op = 'UPDATE' and new.role is distinct from old.role)
  )
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin'
  and coalesce(auth.role(), '') <> 'service_role'
  and current_user not in ('postgres', 'supabase_admin')
  then
    raise exception 'Profile roles can only be assigned by an administrator'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before insert on public.profiles
for each row execute function public.protect_profile_role();

drop trigger if exists protect_profile_role_update on public.profiles;
create trigger protect_profile_role_update
before update of role on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.phone,
    case
      when new.raw_user_meta_data->>'role' in ('homeowner', 'designer')
        then new.raw_user_meta_data->>'role'
      else 'homeowner'
    end
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone,
        updated_at = now();

  return new;
end;
$$;
