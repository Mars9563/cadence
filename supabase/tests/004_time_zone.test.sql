-- Migration 004 tests: per-user time zone.
-- Run with: sh supabase/tests/run-local.sh supabase/tests/004_time_zone.test.sql
begin;

-- Fixtures: two users (the auth trigger creates their profiles).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local');

-- Postgres's own answers for a day end inside the DST gap / overlap.
-- These are the expected values G1 / O1 (also used by the web parity tests).
do $$ begin
  raise notice 'G1 %', (timestamp '2026-03-08 02:30' at time zone 'America/New_York');
  raise notice 'O1 %', (timestamp '2026-11-01 01:30' at time zone 'America/New_York');
end $$;

-- ---------------------------------------------------------------------------
-- A. cadence_day_end
-- ---------------------------------------------------------------------------
do $$ begin
  assert public.cadence_day_end('Asia/Kolkata', '04:00', '2026-10-19')
         = timestamptz '2026-10-19 22:30:00+00', 'IST day end';
  assert public.cadence_day_end('America/New_York', '04:00', '2026-03-07')
         = timestamptz '2026-03-08 08:00:00+00', 'NY day end across DST start (EDT, UTC-4)';
  assert public.cadence_day_end('America/New_York', '02:30', '2026-03-07')
         = timestamptz '2026-03-08 07:30:00+00', 'G1: gap';
  assert public.cadence_day_end('America/New_York', '01:30', '2026-10-31')
         = timestamptz '2026-11-01 06:30:00+00', 'O1: overlap';
end $$;

-- ---------------------------------------------------------------------------
-- B. defaults and cadence_date_of
-- ---------------------------------------------------------------------------
do $$
declare u uuid := '00000000-0000-0000-0000-0000000000a1';
begin
  assert (select time_zone from public.profiles where id = u) = 'Asia/Kolkata', 'default zone';
  assert (select onboarded_at from public.profiles where id = u) is null, 'not onboarded';
  assert public.cadence_date_of(u, '2026-10-19 22:29:00+00') = date '2026-10-19', 'before IST boundary';
  assert public.cadence_date_of(u, '2026-10-19 22:30:00+00') = date '2026-10-20', 'at IST boundary';
end $$;

-- ---------------------------------------------------------------------------
-- C. a pending change that is due applies without being folded
-- ---------------------------------------------------------------------------
update public.profiles
set pending_time_zone = 'America/New_York',
    pending_day_end_time = '04:00',
    pending_effective_at = '2026-10-20 08:00:00+00'
where id = '00000000-0000-0000-0000-0000000000b2';

do $$
declare u uuid := '00000000-0000-0000-0000-0000000000b2';
begin
  -- 07:59Z: old IST rule -> 13:29 IST Oct 20 -> 2026-10-20
  assert public.cadence_date_of(u, '2026-10-20 07:59:00+00') = date '2026-10-20', 'before effective';
  -- 08:00Z: New York 04:00 Oct 20 -> 2026-10-20
  assert public.cadence_date_of(u, '2026-10-20 08:00:00+00') = date '2026-10-20', 'at effective';
  -- 07:59Z under New York would be 03:59 -> 2026-10-19; must not be used yet.
  assert public.cadence_date_of(u, '2026-10-20 07:59:00+00') <> date '2026-10-19', 'no early switch';
end $$;

-- ---------------------------------------------------------------------------
-- D. zone validation
-- ---------------------------------------------------------------------------
do $$ begin
  assert public.is_valid_time_zone('Europe/London'), 'London valid';
  assert not public.is_valid_time_zone('Mars/Olympus'), 'fake zone';
  assert not public.is_valid_time_zone('posix/Europe/London'), 'posix variant';
  assert not public.is_valid_time_zone(''), 'empty';
  assert not public.is_valid_time_zone(null), 'null';
end $$;

do $$ begin
  update public.profiles set time_zone = 'Mars/Olympus'
  where id = '00000000-0000-0000-0000-0000000000a1';
  raise exception 'invalid zone was accepted';
exception when check_violation then
  assert sqlerrm like '%invalid time zone%', 'message: ' || sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- E. completed_on is frozen at completion and can't be written directly
-- ---------------------------------------------------------------------------
insert into public.items (id, user_id, kind, title) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'normal', 'Water plants');

update public.items set completed_at = now()
where id = '00000000-0000-0000-0000-0000000000c1';

do $$
declare
  u uuid := '00000000-0000-0000-0000-0000000000a1';
  d date := public.app_today('00000000-0000-0000-0000-0000000000a1');
begin
  assert (select completed_on from public.items where id = '00000000-0000-0000-0000-0000000000c1') = d,
         'completed_on set to today';

  -- A direct write is ignored.
  update public.items set completed_on = date '2099-01-01'
  where id = '00000000-0000-0000-0000-0000000000c1';
  assert (select completed_on from public.items where id = '00000000-0000-0000-0000-0000000000c1') = d,
         'completed_on cannot be overwritten';

  -- Editability follows the frozen date.
  assert public.item_is_editable(u, 'normal', null, null, now(), d), 'editable on its day';
  assert not public.item_is_editable(u, 'normal', null, null, now(), d - 1), 'locked after its day';
  assert public.item_is_editable(u, 'normal', null, null, null, null), 'incomplete is editable';
end $$;

-- Un-completing clears it.
update public.items set completed_at = null
where id = '00000000-0000-0000-0000-0000000000c1';

do $$ begin
  assert (select completed_on from public.items where id = '00000000-0000-0000-0000-0000000000c1') is null,
         'cleared on un-complete';
end $$;

-- ---------------------------------------------------------------------------
-- F. the old day-boundary guard is gone (replaced by pending changes)
-- ---------------------------------------------------------------------------
do $$ begin
  assert not exists (select 1 from pg_trigger where tgname = 'profiles_guard_day_end_time_trg'), 'guard trigger dropped';
  assert to_regprocedure('public.day_end_change_moves_date_back(time, time, timestamptz)') is null, 'guard fn dropped';
end $$;

rollback;
