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
  add column if not exists project_tier text,
  add column if not exists timeline_days integer,
  add column if not exists floor_plan_url text;

notify pgrst, 'reload schema';
