-- =============================================================================
-- ASCENDA WEB V8.2 · SEGURIDAD DE CUENTA Y HÁBITOS SEMANALES FLEXIBLES
-- Ejecutar completo después de schema.sql y V8_1_PUSH_REMINDERS.sql.
-- =============================================================================

alter table public.habits
  add column if not exists frequency_type text not null default 'daily';

alter table public.habits
  add column if not exists weekly_target integer not null default 1;

update public.habits
set frequency_type = 'daily'
where frequency_type is null or frequency_type not in ('daily', 'specific_days', 'weekly_target');

update public.habits
set weekly_target = 1
where weekly_target is null or weekly_target < 1;

alter table public.habits drop constraint if exists habits_frequency_type_check;
alter table public.habits add constraint habits_frequency_type_check
  check (frequency_type in ('daily', 'specific_days', 'weekly_target'));

alter table public.habits drop constraint if exists habits_weekly_target_check;
alter table public.habits add constraint habits_weekly_target_check
  check (weekly_target between 1 and 21);

create index if not exists habits_user_frequency_idx
  on public.habits(user_id, frequency_type, active);

notify pgrst, 'reload schema';
select 'ASCENDA V8.2: seguridad de cuenta y hábitos semanales flexibles disponibles.' as resultado;
