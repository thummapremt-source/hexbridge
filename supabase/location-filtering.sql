alter table public.projects
  add column if not exists state text,
  add column if not exists mandal text;

alter table public.profiles
  add column if not exists state text,
  add column if not exists city text;
