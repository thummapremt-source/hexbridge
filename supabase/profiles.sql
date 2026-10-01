create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  bid_credits integer not null default 0,
  role text not null default 'homeowner' check (role in ('homeowner', 'designer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

alter table public.profiles
add column if not exists bid_credits integer not null default 0;

create or replace function public.add_bid_credits(credits_to_add integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_credits integer;
begin
  if credits_to_add is null or credits_to_add <= 0 then
    raise exception 'Credits to add must be greater than zero';
  end if;

  update public.profiles
  set bid_credits = coalesce(bid_credits, 0) + credits_to_add,
      updated_at = now()
  where id = auth.uid()
    and role = 'designer'
  returning bid_credits into updated_credits;

  if updated_credits is null then
    raise exception 'Only designers can add bid credits';
  end if;

  return updated_credits;
end;
$$;

grant execute on function public.add_bid_credits(integer) to authenticated;

create or replace function public.consume_bid_credit()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_credits integer;
begin
  update public.profiles
  set bid_credits = bid_credits - 1,
      updated_at = now()
  where id = auth.uid()
    and role = 'designer'
    and bid_credits > 0
  returning bid_credits into remaining_credits;

  if remaining_credits is null then
    raise exception 'No bid credits available';
  end if;

  return remaining_credits;
end;
$$;

create or replace function public.refund_bid_credit()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_credits integer;
begin
  update public.profiles
  set bid_credits = coalesce(bid_credits, 0) + 1,
      updated_at = now()
  where id = auth.uid()
    and role = 'designer'
  returning bid_credits into updated_credits;

  if updated_credits is null then
    raise exception 'Only designers can refund bid credits';
  end if;

  return updated_credits;
end;
$$;

grant execute on function public.consume_bid_credit() to authenticated;
grant execute on function public.refund_bid_credit() to authenticated;

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
        role = coalesce(excluded.role, public.profiles.role),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create policy "Users can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can delete their own profile"
on public.profiles
for delete
using (auth.uid() = id);
