-- =============================================================================
-- ASCENDA WEB V8.1
-- Recordatorios push reales, historial de entregas y suscripciones por dispositivo.
-- Ejecutar completo desde Supabase > SQL Editor > New query > Run.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- SUSCRIPCIONES PUSH DEL NAVEGADOR
-- -----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_active_idx
  on public.push_subscriptions(user_id, active);

-- -----------------------------------------------------------------------------
-- AMPLIACIÓN DE RECORDATORIOS
-- -----------------------------------------------------------------------------
alter table public.reminders add column if not exists enabled boolean not null default true;
alter table public.reminders add column if not exists last_sent_at timestamptz;
alter table public.reminders add column if not exists last_viewed_at timestamptz;
alter table public.reminders add column if not exists last_snoozed_at timestamptz;

alter table public.reminders drop constraint if exists reminders_source_type_check;
alter table public.reminders add constraint reminders_source_type_check
  check (source_type in ('standalone','task','event','routine','habit','goal'));

alter table public.reminders drop constraint if exists reminders_status_check;
alter table public.reminders add constraint reminders_status_check
  check (status in ('active','sent','dismissed','cancelled'));

create index if not exists reminders_due_push_idx
  on public.reminders(next_trigger_at)
  where status = 'active' and enabled = true;

-- -----------------------------------------------------------------------------
-- HISTORIAL DE ENTREGAS
-- -----------------------------------------------------------------------------
alter table public.notification_history add column if not exists scheduled_for timestamptz;
alter table public.notification_history add column if not exists delivery_status text not null default 'pending';
alter table public.notification_history add column if not exists sent_at timestamptz;
alter table public.notification_history add column if not exists viewed_at timestamptz;
alter table public.notification_history add column if not exists snoozed_until timestamptz;
alter table public.notification_history add column if not exists error_message text;
alter table public.notification_history add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.notification_history drop constraint if exists notification_history_delivery_status_check;
alter table public.notification_history add constraint notification_history_delivery_status_check
  check (delivery_status in ('pending','sent','viewed','snoozed','failed'));

create unique index if not exists notification_history_occurrence_uidx
  on public.notification_history(reminder_id, scheduled_for)
  where reminder_id is not null and scheduled_for is not null;

create index if not exists notification_history_user_fired_idx
  on public.notification_history(user_id, fired_at desc);

-- -----------------------------------------------------------------------------
-- CÁLCULO DE LA SIGUIENTE REPETICIÓN
-- Avanza hasta una fecha futura para evitar una ráfaga de avisos atrasados.
-- -----------------------------------------------------------------------------
create or replace function public.compute_next_reminder_trigger(
  base_trigger timestamptz,
  recurrence_type text,
  recurrence_interval integer,
  after_time timestamptz default now()
)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  next_trigger timestamptz := base_trigger;
  step integer := greatest(coalesce(recurrence_interval, 1), 1);
begin
  if recurrence_type = 'none' then
    return base_trigger;
  end if;

  loop
    if recurrence_type = 'daily' then
      next_trigger := next_trigger + make_interval(days => step);
    elsif recurrence_type = 'weekly' then
      next_trigger := next_trigger + make_interval(days => step * 7);
    elsif recurrence_type = 'monthly' then
      next_trigger := next_trigger + make_interval(months => step);
    else
      return base_trigger;
    end if;
    exit when next_trigger > after_time;
  end loop;

  return next_trigger;
end;
$$;

-- -----------------------------------------------------------------------------
-- RECLAMO ATÓMICO DE RECORDATORIOS VENCIDOS
-- La Edge Function llama esta RPC con service_role. Cada ocurrencia se procesa una vez.
-- -----------------------------------------------------------------------------
create or replace function public.claim_due_reminders(batch_size integer default 100)
returns table (
  delivery_id uuid,
  reminder_id uuid,
  user_id uuid,
  title text,
  description text,
  priority text,
  sound_enabled boolean,
  source_type text,
  source_id uuid,
  recurrence_type text,
  recurrence_interval integer,
  scheduled_for timestamptz,
  next_trigger_after timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select r.*
    from public.reminders r
    where r.status = 'active'
      and r.enabled = true
      and r.next_trigger_at <= now()
    order by r.next_trigger_at
    limit greatest(1, least(coalesce(batch_size, 100), 500))
    for update skip locked
  ), deliveries as (
    insert into public.notification_history (
      user_id, reminder_id, title, scheduled_for, action, delivery_status, metadata
    )
    select
      d.user_id,
      d.id,
      d.title,
      d.next_trigger_at,
      'pending_push',
      'pending',
      jsonb_build_object('priority', d.priority, 'source_type', d.source_type, 'source_id', d.source_id)
    from due d
    on conflict (reminder_id, scheduled_for) where reminder_id is not null and scheduled_for is not null
    do nothing
    returning id, reminder_id, scheduled_for
  ), advanced as (
    update public.reminders r
    set
      last_sent_at = now(),
      status = case when r.recurrence_type = 'none' then 'sent' else 'active' end,
      next_trigger_at = case
        when r.recurrence_type = 'none' then r.next_trigger_at
        else public.compute_next_reminder_trigger(r.next_trigger_at, r.recurrence_type, r.recurrence_interval, now())
      end,
      updated_at = now()
    from deliveries d
    where r.id = d.reminder_id
    returning r.*, d.id as delivery_id, d.scheduled_for
  )
  select
    a.delivery_id,
    a.id as reminder_id,
    a.user_id,
    a.title,
    a.description,
    a.priority,
    a.sound_enabled,
    a.source_type,
    a.source_id,
    a.recurrence_type,
    a.recurrence_interval,
    a.scheduled_for,
    a.next_trigger_at as next_trigger_after
  from advanced a;
end;
$$;

revoke all on function public.claim_due_reminders(integer) from public;
grant execute on function public.claim_due_reminders(integer) to service_role;

-- -----------------------------------------------------------------------------
-- updated_at + RLS
-- -----------------------------------------------------------------------------
drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute procedure public.set_updated_at();

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
select 'ASCENDA V8.1: suscripciones push, historial de entregas y procesamiento recurrente disponibles.' as resultado;
