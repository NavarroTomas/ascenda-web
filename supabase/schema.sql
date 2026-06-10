-- =============================================================================
-- ASCENDA WEB V5
-- Migración incremental acumulativa: conserva datos existentes y agrega rutinas,
-- objetivos, categorías, XP, temporadas, rangos, títulos y preferencias visuales.
-- Ejecutar completo desde Supabase > SQL Editor > New query > Run.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- PERFIL BASE
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Usuario',
  avatar_url text,
  level integer not null default 1,
  xp integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text not null default 'Usuario';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists level integer not null default 1;
alter table public.profiles add column if not exists xp integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- -----------------------------------------------------------------------------
-- CONFIGURACIÓN PERSONAL
-- -----------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  experience_mode text not null default 'standard' check (experience_mode in ('simple', 'standard', 'rpg')),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  reduce_motion boolean not null default false,
  high_contrast boolean not null default false,
  color_vision_mode text not null default 'default' check (color_vision_mode in ('default', 'tritanopia', 'protanopia', 'deuteranopia')),
  penalties_enabled boolean not null default true,
  custom_quote text,
  sidebar_collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings add column if not exists experience_mode text not null default 'standard';
alter table public.user_settings add column if not exists theme text not null default 'dark';
alter table public.user_settings add column if not exists reduce_motion boolean not null default false;
alter table public.user_settings add column if not exists high_contrast boolean not null default false;
alter table public.user_settings add column if not exists color_vision_mode text not null default 'default';
alter table public.user_settings add column if not exists penalties_enabled boolean not null default true;
alter table public.user_settings add column if not exists custom_quote text;
alter table public.user_settings add column if not exists sidebar_collapsed boolean not null default false;
alter table public.user_settings add column if not exists created_at timestamptz not null default now();
alter table public.user_settings add column if not exists updated_at timestamptz not null default now();

-- -----------------------------------------------------------------------------
-- CATEGORÍAS PERSONALIZADAS
-- -----------------------------------------------------------------------------
create table if not exists public.custom_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#38d9c6',
  icon text not null default '◇',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists custom_categories_user_name_uidx
  on public.custom_categories (user_id, lower(name));

-- -----------------------------------------------------------------------------
-- TAREAS EXISTENTES + MEJORAS V4
-- -----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Personal',
  category_id uuid references public.custom_categories(id) on delete set null,
  due_date date,
  due_time time,
  priority text not null default 'media',
  status text not null default 'pendiente',
  completed boolean not null default false,
  completed_at timestamptz,
  xp_reward integer not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.tasks add column if not exists title text;
alter table public.tasks add column if not exists description text;
alter table public.tasks add column if not exists category text not null default 'Personal';
alter table public.tasks add column if not exists category_id uuid references public.custom_categories(id) on delete set null;
alter table public.tasks add column if not exists due_date date;
alter table public.tasks add column if not exists due_time time;
alter table public.tasks add column if not exists priority text not null default 'media';
alter table public.tasks add column if not exists status text not null default 'pendiente';
alter table public.tasks add column if not exists completed boolean not null default false;
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists xp_reward integer not null default 15;
alter table public.tasks add column if not exists created_at timestamptz not null default now();
alter table public.tasks add column if not exists updated_at timestamptz not null default now();

update public.tasks set status = 'completada' where completed = true and status <> 'completada';

-- -----------------------------------------------------------------------------
-- HÁBITOS EXISTENTES + MEJORAS V4
-- -----------------------------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Personal',
  category_id uuid references public.custom_categories(id) on delete set null,
  target integer not null default 1 check (target >= 1),
  unit text not null default 'veces',
  habit_type text not null default 'binary',
  active_days integer[] not null default array[0,1,2,3,4,5,6],
  xp_reward integer not null default 8,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.habits add column if not exists description text;
alter table public.habits add column if not exists category_id uuid references public.custom_categories(id) on delete set null;
alter table public.habits add column if not exists habit_type text not null default 'binary';
alter table public.habits add column if not exists active_days integer[] not null default array[0,1,2,3,4,5,6];
alter table public.habits add column if not exists xp_reward integer not null default 8;

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null default current_date,
  value integer not null default 1 check (value >= 0),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, log_date)
);

alter table public.habit_logs add column if not exists note text;

-- -----------------------------------------------------------------------------
-- RUTINAS
-- -----------------------------------------------------------------------------
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Personal',
  category_id uuid references public.custom_categories(id) on delete set null,
  routine_type text not null default 'structured' check (routine_type in ('simple', 'structured')),
  scheduled_days integer[] not null default array[]::integer[],
  scheduled_time time,
  duration_minutes integer,
  xp_bonus integer not null default 15,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  title text not null,
  duration_minutes integer,
  xp_reward integer not null default 5,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  log_date date not null default current_date,
  completed boolean not null default false,
  time_spent_minutes integer,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, routine_id, log_date)
);

create table if not exists public.routine_step_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  step_id uuid not null references public.routine_steps(id) on delete cascade,
  log_date date not null default current_date,
  completed boolean not null default true,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, step_id, log_date)
);

-- -----------------------------------------------------------------------------
-- OBJETIVOS E HITOS OPCIONALES
-- -----------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Personal',
  category_id uuid references public.custom_categories(id) on delete set null,
  goal_type text not null default 'manual' check (goal_type in ('manual', 'quantitative')),
  target_value numeric,
  current_value numeric not null default 0,
  unit text,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  due_date date,
  visibility text not null default 'private' check (visibility in ('private', 'shared', 'public')),
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  xp_reward integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  xp_reward integer not null default 20,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_task_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goal_id, task_id)
);

-- -----------------------------------------------------------------------------
-- REGISTRO DE XP
-- Permite aplicar bonus por racha sin duplicar recompensas.
-- -----------------------------------------------------------------------------
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_key text not null,
  reason text not null,
  base_amount integer not null default 0,
  multiplier numeric(5,2) not null default 1,
  amount integer not null default 0,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_key)
);

-- -----------------------------------------------------------------------------
-- ÍNDICES
-- -----------------------------------------------------------------------------
create index if not exists tasks_user_due_idx on public.tasks(user_id, due_date);
create index if not exists habits_user_idx on public.habits(user_id, active);
create index if not exists habit_logs_user_date_idx on public.habit_logs(user_id, log_date desc);
create index if not exists routines_user_idx on public.routines(user_id, active);
create index if not exists routine_steps_routine_idx on public.routine_steps(routine_id, position);
create index if not exists routine_logs_user_date_idx on public.routine_logs(user_id, log_date desc);
create index if not exists goals_user_idx on public.goals(user_id, status);
create index if not exists goal_milestones_goal_idx on public.goal_milestones(goal_id, position);
create index if not exists xp_events_user_date_idx on public.xp_events(user_id, occurred_on desc);

-- -----------------------------------------------------------------------------
-- UPDATED_AT AUTOMÁTICO
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_settings', 'custom_categories', 'tasks', 'habits',
    'routines', 'routine_steps', 'routine_logs', 'goals', 'goal_milestones'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS Y POLÍTICAS
-- -----------------------------------------------------------------------------
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_settings', 'custom_categories', 'tasks', 'habits', 'habit_logs',
    'routines', 'routine_steps', 'routine_logs', 'routine_step_logs', 'goals',
    'goal_milestones', 'goal_task_links', 'xp_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end;
$$;

-- Profiles: la clave es id en lugar de user_id.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Policies homogéneas para tablas que usan user_id.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_settings', 'custom_categories', 'tasks', 'habits', 'habit_logs',
    'routines', 'routine_steps', 'routine_logs', 'routine_step_logs', 'goals',
    'goal_milestones', 'goal_task_links', 'xp_events'
  ] loop
    execute format('drop policy if exists %I_select_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete_own on public.%I', table_name, table_name);
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- PERFIL Y CONFIGURACIÓN AUTOMÁTICOS PARA NUEVAS CUENTAS
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  preferred_mode text;
begin
  preferred_mode := coalesce(new.raw_user_meta_data ->> 'experience_mode', 'standard');
  if preferred_mode not in ('simple', 'standard', 'rpg') then
    preferred_mode := 'standard';
  end if;

  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Usuario')
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id, experience_mode)
  values (new.id, preferred_mode)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Inicializa perfiles/configuración para cuentas previas.
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1), 'Usuario')
from auth.users
on conflict (id) do nothing;

insert into public.user_settings (user_id, experience_mode)
select id, 'standard'
from auth.users
on conflict (user_id) do nothing;

-- Migra XP básico de registros existentes sin duplicar eventos.
insert into public.xp_events (user_id, source_type, source_key, reason, base_amount, multiplier, amount, occurred_on)
select user_id, 'task', id::text, 'Tarea completada', xp_reward, 1, xp_reward, coalesce(completed_at::date, current_date)
from public.tasks
where completed = true
on conflict (user_id, source_type, source_key) do nothing;

insert into public.xp_events (user_id, source_type, source_key, reason, base_amount, multiplier, amount, occurred_on)
select hl.user_id, 'habit', hl.habit_id::text || ':' || hl.log_date::text, 'Hábito completado', coalesce(h.xp_reward, 8), 1, coalesce(h.xp_reward, 8), hl.log_date
from public.habit_logs hl
join public.habits h on h.id = hl.habit_id
on conflict (user_id, source_type, source_key) do nothing;

notify pgrst, 'reload schema';

select 'ASCENDA V4 base: estructura previa verificada. Continuando con migración V5.' as resultado;

-- =============================================================================
-- ASCENDA WEB V5
-- Progresión permanente, temporadas de 12 semanas, 24 divisiones,
-- estilos visuales y configuración de efectos.
-- =============================================================================

-- Preferencias visuales V5.
alter table public.user_settings add column if not exists visual_theme text not null default 'standard';
alter table public.user_settings add column if not exists sounds_enabled boolean not null default true;
alter table public.user_settings add column if not exists intense_effects_enabled boolean not null default true;

-- Temporadas globales.
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  duration_weeks integer not null default 12 check (duration_weeks = 12),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create unique index if not exists seasons_single_active_uidx
  on public.seasons ((active)) where active = true;

-- Escalera de ocho rangos y tres subdivisiones por rango.
create table if not exists public.season_ranks (
  rank_key text not null,
  division integer not null check (division between 1 and 3),
  display_name text not null,
  astral_name text not null,
  min_points integer not null check (min_points >= 0),
  sort_order integer not null,
  color text not null,
  primary key (rank_key, division),
  unique (sort_order),
  unique (min_points)
);

insert into public.season_ranks (rank_key, division, display_name, astral_name, min_points, sort_order, color) values
  ('bronze', 3, 'Bronce III', 'Habitante terrano III', 0, 0, '#b77a4b'),
  ('bronze', 2, 'Bronce II', 'Habitante terrano II', 100, 1, '#b77a4b'),
  ('bronze', 1, 'Bronce I', 'Habitante terrano I', 200, 2, '#b77a4b'),
  ('silver', 3, 'Plata III', 'Guerrero del aura III', 300, 3, '#aeb9ca'),
  ('silver', 2, 'Plata II', 'Guerrero del aura II', 450, 4, '#aeb9ca'),
  ('silver', 1, 'Plata I', 'Guerrero del aura I', 600, 5, '#aeb9ca'),
  ('gold', 3, 'Oro III', 'Impulso carmesí III', 750, 6, '#e7ba4b'),
  ('gold', 2, 'Oro II', 'Impulso carmesí II', 950, 7, '#e7ba4b'),
  ('gold', 1, 'Oro I', 'Impulso carmesí I', 1150, 8, '#e7ba4b'),
  ('platinum', 3, 'Platino III', 'Ascendido solar III', 1350, 9, '#55c6cf'),
  ('platinum', 2, 'Platino II', 'Ascendido solar II', 1600, 10, '#55c6cf'),
  ('platinum', 1, 'Platino I', 'Ascendido solar I', 1850, 11, '#55c6cf'),
  ('emerald', 3, 'Esmeralda III', 'Guardián del relámpago III', 2100, 12, '#4dc38d'),
  ('emerald', 2, 'Esmeralda II', 'Guardián del relámpago II', 2400, 13, '#4dc38d'),
  ('emerald', 1, 'Esmeralda I', 'Guardián del relámpago I', 2700, 14, '#4dc38d'),
  ('diamond', 3, 'Diamante III', 'Heraldo celeste III', 3000, 15, '#6b9cff'),
  ('diamond', 2, 'Diamante II', 'Heraldo celeste II', 3367, 16, '#6b9cff'),
  ('diamond', 1, 'Diamante I', 'Heraldo celeste I', 3734, 17, '#6b9cff'),
  ('master', 3, 'Maestro III', 'Campeón divino III', 4100, 18, '#9b73e8'),
  ('master', 2, 'Maestro II', 'Campeón divino II', 4534, 19, '#9b73e8'),
  ('master', 1, 'Maestro I', 'Campeón divino I', 4968, 20, '#9b73e8'),
  ('ascendant', 3, 'Ascendente III', 'Trascendencia serena III', 5400, 21, '#e3edf7'),
  ('ascendant', 2, 'Ascendente II', 'Trascendencia serena II', 6150, 22, '#e3edf7'),
  ('ascendant', 1, 'Ascendente I', 'Trascendencia serena I', 6900, 23, '#e3edf7')
on conflict (rank_key, division) do update set
  display_name = excluded.display_name,
  astral_name = excluded.astral_name,
  min_points = excluded.min_points,
  sort_order = excluded.sort_order,
  color = excluded.color;

-- Puntos actuales: se reinician en cada temporada. La XP permanente no se toca.
create table if not exists public.user_season_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  rank_key text not null default 'bronze',
  division integer not null default 3 check (division between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season_id)
);

create table if not exists public.season_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  source_type text not null,
  source_key text not null,
  reason text not null,
  amount integer not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, season_id, source_type, source_key)
);

create table if not exists public.user_season_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  season_name text not null,
  starts_on date not null,
  ends_on date not null,
  final_points integer not null default 0,
  final_rank_key text not null,
  final_division integer not null,
  final_rank_label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, season_id)
);

create index if not exists user_season_progress_user_idx on public.user_season_progress(user_id, season_id);
create index if not exists season_point_events_user_idx on public.season_point_events(user_id, season_id);
create index if not exists user_season_history_user_idx on public.user_season_history(user_id, created_at desc);

-- Temporada inicial. El cierre se produce automáticamente al abrir la aplicación
-- una vez superada la fecha límite.
insert into public.seasons (name, starts_on, ends_on, duration_weeks, active)
select 'Temporada 1', current_date, current_date + 83, 12, true
where not exists (select 1 from public.seasons where active = true);

-- Sincroniza puntos actuales a partir de eventos individuales. Esto evita sumar
-- dos veces una recompensa si el usuario hace doble clic o reabre una tarea.
create or replace function public.sync_active_season_progress()
returns setof public.user_season_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_season_id uuid;
  total_points integer;
  selected_rank public.season_ranks%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select id into current_season_id
  from public.seasons
  where active = true
  order by starts_on desc
  limit 1;

  if current_season_id is null then
    return;
  end if;

  select coalesce(sum(amount), 0)::integer into total_points
  from public.season_point_events
  where user_id = current_user_id and season_id = current_season_id;

  select * into selected_rank
  from public.season_ranks
  where min_points <= total_points
  order by min_points desc
  limit 1;

  return query
  insert into public.user_season_progress (user_id, season_id, points, rank_key, division)
  values (current_user_id, current_season_id, total_points, coalesce(selected_rank.rank_key, 'bronze'), coalesce(selected_rank.division, 3))
  on conflict (user_id, season_id) do update set
    points = excluded.points,
    rank_key = excluded.rank_key,
    division = excluded.division,
    updated_at = now()
  returning *;
end;
$$;

-- Archiva la temporada vencida e inicia otra con puntos en cero. El nivel
-- permanente continúa calculándose desde xp_events y no se reinicia.
create or replace function public.rotate_expired_season()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_season public.seasons%rowtype;
  next_number integer;
begin
  perform pg_advisory_xact_lock(5062026);

  select * into expired_season
  from public.seasons
  where active = true and ends_on < current_date
  order by starts_on desc
  limit 1
  for update;

  if not found then
    return 'No rotation required';
  end if;

  insert into public.user_season_history (
    user_id, season_id, season_name, starts_on, ends_on,
    final_points, final_rank_key, final_division, final_rank_label
  )
  select
    progress.user_id,
    expired_season.id,
    expired_season.name,
    expired_season.starts_on,
    expired_season.ends_on,
    progress.points,
    progress.rank_key,
    progress.division,
    coalesce(ranks.display_name, 'Bronce III')
  from public.user_season_progress progress
  left join public.season_ranks ranks
    on ranks.rank_key = progress.rank_key and ranks.division = progress.division
  where progress.season_id = expired_season.id
  on conflict (user_id, season_id) do nothing;

  update public.seasons set active = false, updated_at = now() where id = expired_season.id;

  select count(*) + 1 into next_number from public.seasons;
  insert into public.seasons (name, starts_on, ends_on, duration_weeks, active)
  values ('Temporada ' || next_number, current_date, current_date + 83, 12, true);

  return 'Season rotated';
end;
$$;

-- updated_at para tablas V5.
drop trigger if exists seasons_set_updated_at on public.seasons;
create trigger seasons_set_updated_at before update on public.seasons for each row execute procedure public.set_updated_at();
drop trigger if exists user_season_progress_set_updated_at on public.user_season_progress;
create trigger user_season_progress_set_updated_at before update on public.user_season_progress for each row execute procedure public.set_updated_at();

-- Seguridad de tablas de referencia globales.
alter table public.seasons enable row level security;
alter table public.season_ranks enable row level security;
revoke all on public.seasons from anon;
revoke all on public.season_ranks from anon;
grant select on public.seasons to authenticated;
grant select on public.season_ranks to authenticated;
drop policy if exists seasons_select_authenticated on public.seasons;
create policy seasons_select_authenticated on public.seasons for select to authenticated using (true);
drop policy if exists season_ranks_select_authenticated on public.season_ranks;
create policy season_ranks_select_authenticated on public.season_ranks for select to authenticated using (true);

-- Seguridad de tablas privadas V5.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_season_progress', 'season_point_events', 'user_season_history'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists %I_select_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete_own on public.%I', table_name, table_name);
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
  end loop;
end;
$$;

revoke all on function public.sync_active_season_progress() from public;
revoke all on function public.rotate_expired_season() from public;
grant execute on function public.sync_active_season_progress() to authenticated;
grant execute on function public.rotate_expired_season() to authenticated;

notify pgrst, 'reload schema';
select 'ASCENDA V5: migración aplicada. Temporadas, rangos y Guerrero Astral disponibles.' as resultado;

-- =============================================================================
-- ASCENDA WEB V6 · AGENDA AVANZADA, NOTAS, EVENTOS Y RECORDATORIOS
-- Migración incremental. Conserva todos los datos de V5.
-- =============================================================================

-- Subtareas: aportan complejidad a la XP final de la tarea, no XP individual.
create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#38d9c6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists tags_user_lower_name_uidx on public.tags(user_id, lower(name));

create table if not exists public.task_tag_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, tag_id)
);

-- Varias entradas libres por día.
create table if not exists public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_date date not null default current_date,
  title text not null default 'Nueva entrada',
  content_html text not null default '',
  category_id uuid references public.custom_categories(id) on delete set null,
  color text not null default '#38d9c6',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists daily_notes_user_date_idx on public.daily_notes(user_id, note_date desc);

-- Notas permanentes. Las notas bloqueadas almacenan únicamente contenido cifrado.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nueva nota',
  content_html text,
  encrypted_content text,
  encryption_iv text,
  encryption_salt text,
  is_locked boolean not null default false,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  category_id uuid references public.custom_categories(id) on delete set null,
  color text not null default '#38d9c6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_locked = false) or (encrypted_content is not null and encryption_iv is not null and encryption_salt is not null))
);
create index if not exists notes_user_updated_idx on public.notes(user_id, updated_at desc);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  event_date date not null,
  start_time time,
  end_time time,
  all_day boolean not null default false,
  category_id uuid references public.custom_categories(id) on delete set null,
  color text not null default '#38d9c6',
  location text,
  link_url text,
  guests_text text,
  notes text,
  status text not null default 'confirmed' check (status in ('confirmed','tentative','cancelled')),
  recurrence_type text not null default 'none' check (recurrence_type in ('none','daily','weekly','monthly')),
  recurrence_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_user_date_idx on public.events(user_id, event_date);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  source_type text not null default 'standalone' check (source_type in ('standalone','task','event','routine')),
  source_id uuid,
  next_trigger_at timestamptz not null,
  recurrence_type text not null default 'none' check (recurrence_type in ('none','daily','weekly','monthly')),
  recurrence_interval integer not null default 1 check (recurrence_interval >= 1),
  priority text not null default 'normal' check (priority in ('normal','important','alarm')),
  sound_enabled boolean not null default true,
  status text not null default 'active' check (status in ('active','dismissed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reminders_user_trigger_idx on public.reminders(user_id, next_trigger_at) where status = 'active';

create table if not exists public.notification_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete set null,
  title text not null,
  fired_at timestamptz not null default now(),
  action text not null default 'shown',
  created_at timestamptz not null default now()
);

-- Campos V6 para tareas.
alter table public.tasks add column if not exists last_postponed_at timestamptz;
alter table public.tasks add column if not exists original_due_date date;

-- updated_at V6.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['task_subtasks','tags','daily_notes','notes','events','reminders'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

-- RLS V6.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'task_subtasks','tags','task_tag_links','daily_notes','notes','events','reminders','notification_history'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists %I_select_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete_own on public.%I', table_name, table_name);
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
select 'ASCENDA V6: agenda escrita, notas, eventos, recordatorios, subtareas y etiquetas disponibles.' as resultado;
