-- =============================================================================
-- ASCENDA V9
-- Bienvenida diaria, planificación del día, revisión semanal y métricas ampliadas.
-- Ejecutar completo desde Supabase > SQL Editor > New query > Run.
-- =============================================================================

create extension if not exists pgcrypto;

alter table public.user_settings
  add column if not exists daily_welcome_enabled boolean not null default true;

alter table public.user_settings
  add column if not exists weekly_review_enabled boolean not null default true;

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null default current_date,
  main_focus text,
  morning_items jsonb not null default '[]'::jsonb,
  afternoon_items jsonb not null default '[]'::jsonb,
  evening_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  rating integer not null default 7 check (rating between 1 and 10),
  wins text,
  blockers text,
  next_focus text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists daily_plans_user_date_idx on public.daily_plans(user_id, plan_date desc);
create index if not exists weekly_reviews_user_week_idx on public.weekly_reviews(user_id, week_start desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['daily_plans', 'weekly_reviews'] loop
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
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

notify pgrst, 'reload schema';

select 'ASCENDA V9: bienvenida diaria, planificación y revisión semanal disponibles.' as status;
