-- =============================================================================
-- ASCENDA V10
-- Modo Simple real, Modo Asistido, Focus profundo, revisión nocturna y centro interno.
-- Ejecutar completo desde Supabase > SQL Editor > New query > Run.
-- =============================================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.user_settings add column if not exists assisted_mode_enabled boolean not null default false;
alter table public.user_settings add column if not exists updates_modal_enabled boolean not null default true;
alter table public.user_settings add column if not exists night_review_enabled boolean not null default true;
alter table public.user_settings add column if not exists priority_assist_enabled boolean not null default true;
alter table public.user_settings add column if not exists app_version_seen text;

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Bloque Focus',
  source_type text not null default 'manual' check (source_type in ('manual','task','habit','routine','goal','finance')),
  source_id uuid,
  duration_minutes integer not null default 25 check (duration_minutes >= 1 and duration_minutes <= 1440),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null default current_date,
  rating integer not null default 7 check (rating between 1 and 10),
  completed text,
  pending text,
  tomorrow_focus text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_date)
);

create table if not exists public.non_negotiables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null default 'manual' check (source_type in ('manual','task','habit','routine','goal')),
  source_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text,
  tone text not null default 'info' check (tone in ('info','focus','warning','danger','success')),
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_transactions add column if not exists is_fixed boolean not null default false;
alter table public.finance_transactions add column if not exists due_day integer check (due_day between 1 and 31);
alter table public.finance_transactions add column if not exists expected boolean not null default false;

create index if not exists focus_sessions_user_started_idx on public.focus_sessions(user_id, started_at desc);
create index if not exists daily_reflections_user_date_idx on public.daily_reflections(user_id, review_date desc);
create index if not exists non_negotiables_user_active_idx on public.non_negotiables(user_id, active);
create index if not exists internal_notifications_user_created_idx on public.internal_notifications(user_id, created_at desc);
create index if not exists internal_notifications_user_unread_idx on public.internal_notifications(user_id, read_at) where read_at is null;

-- Sembrar un aviso interno de V10 por usuario existente, sin duplicar.
insert into public.internal_notifications (user_id, type, title, body, tone, metadata)
select
  id,
  'update',
  'Ascenda V10 disponible',
  'Modo Simple real, Modo Asistido, Focus profundo, finanzas mejoradas y centro de avisos interno.',
  'success',
  '{"version":"10.0.0","section":"avisos"}'::jsonb
from auth.users
where not exists (
  select 1 from public.internal_notifications n
  where n.user_id = auth.users.id
    and n.type = 'update'
    and n.metadata->>'version' = '10.0.0'
);

do $$
declare
  target_table text;
begin
  foreach target_table in array array['focus_sessions', 'daily_reflections', 'non_negotiables', 'internal_notifications'] loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all on public.%I from anon', target_table);
    execute format('grant select, insert, update, delete on public.%I to authenticated', target_table);

    execute format('drop policy if exists %I_select_own on public.%I', target_table, target_table);
    execute format('drop policy if exists %I_insert_own on public.%I', target_table, target_table);
    execute format('drop policy if exists %I_update_own on public.%I', target_table, target_table);
    execute format('drop policy if exists %I_delete_own on public.%I', target_table, target_table);

    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', target_table, target_table);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', target_table, target_table);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', target_table, target_table);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', target_table, target_table);

    execute format('drop trigger if exists %I_set_updated_at on public.%I', target_table, target_table);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', target_table, target_table);
  end loop;
end;
$$;

notify pgrst, 'reload schema';

select 'ASCENDA V10: modo simple, modo asistido, focus profundo y centro interno disponibles.' as status;
