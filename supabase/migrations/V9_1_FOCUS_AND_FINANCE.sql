-- =============================================================================
-- ASCENDA V9.1
-- MODO FOCUS + Gestión financiera personal.
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

alter table public.user_settings
  add column if not exists visual_theme text not null default 'standard';

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'expense' check (type in ('income', 'expense', 'both')),
  icon text not null default '•',
  color text not null default '#42dac8',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null check (amount >= 0),
  category_id uuid references public.finance_categories(id) on delete set null,
  category_name text not null default 'Otro',
  description text,
  transaction_date date not null default current_date,
  payment_method text,
  recurrence_type text not null default 'none' check (recurrence_type in ('none', 'daily', 'weekly', 'monthly')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_monthly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  savings_goal numeric(14,2) not null default 0 check (savings_goal >= 0),
  income_goal numeric(14,2) not null default 0 check (income_goal >= 0),
  expense_limit numeric(14,2) not null default 0 check (expense_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_start)
);

create index if not exists finance_categories_user_name_idx
  on public.finance_categories(user_id, name);

create index if not exists finance_transactions_user_date_idx
  on public.finance_transactions(user_id, transaction_date desc);

create index if not exists finance_transactions_user_type_idx
  on public.finance_transactions(user_id, type, transaction_date desc);

create index if not exists finance_monthly_goals_user_month_idx
  on public.finance_monthly_goals(user_id, month_start desc);

do $$
declare
  target_table text;
begin
  foreach target_table in array array['finance_categories', 'finance_transactions', 'finance_monthly_goals'] loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all on public.%I from anon', target_table);
    execute format('grant select, insert, update, delete on public.%I to authenticated', target_table);

    execute format('drop policy if exists %I_select_own on public.%I', target_table, target_table);
    execute format('drop policy if exists %I_insert_own on public.%I', target_table, target_table);
    execute format('drop policy if exists %I_update_own on public.%I', target_table, target_table);
    execute format('drop policy if exists %I_delete_own on public.%I', target_table, target_table);

    execute format(
      'create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      target_table,
      target_table
    );

    execute format(
      'create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      target_table,
      target_table
    );

    execute format(
      'create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      target_table,
      target_table
    );

    execute format(
      'create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      target_table,
      target_table
    );

    execute format('drop trigger if exists %I_set_updated_at on public.%I', target_table, target_table);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()',
      target_table,
      target_table
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';

select 'ASCENDA V9.1: MODO FOCUS y finanzas personales disponibles.' as status;
