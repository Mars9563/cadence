create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
 
  email text,
  display_name text,
  avatar_url text,
 
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
 
  return new;
end;
$$;
 
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
  
  alter table public.profiles enable row level security;
 
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);
 
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
 
 
-- ============================================================================
-- CADENCE — APPLICATION DATABASE SCHEMA
-- ============================================================================
--
-- Supabase PostgreSQL
-- Raw SQL — no ORM
--
-- IMPORTANT:
--   public.profiles ALREADY EXISTS.
--
-- This script:
--   - does NOT recreate profiles
--   - does NOT drop existing tables
--   - adds profiles.day_end_time
--   - creates all Cadence application tables
--   - creates indexes
--   - creates helper functions
--   - creates updated_at triggers
--   - creates root-folder signup trigger
--   - enables RLS
--   - creates complete RLS policies
--
-- Default Cadence day boundary:
--   04:00 Asia/Kolkata
--
-- Therefore:
--
--   Sep 10 03:59 IST => Cadence date = Sep 9
--   Sep 10 04:00 IST => Cadence date = Sep 10
--
-- ============================================================================
 
 
-- ============================================================================
-- 1. EXISTING PROFILES TABLE
-- ============================================================================
--
-- profiles already exists.
--
-- Add the user's configurable Cadence day boundary.
--
-- Existing users automatically receive 04:00:00.
--
-- Users can change this through their profile/settings.
--
 
alter table public.profiles
  add column if not exists day_end_time time not null default '04:00:00';
 
 
-- ============================================================================
-- 2. HELPER FUNCTIONS
-- ============================================================================
 
 
-- ---------------------------------------------------------------------------
-- set_updated_at
--
-- Automatically updates updated_at whenever a row is modified.
-- ---------------------------------------------------------------------------
 
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
 
 
-- ---------------------------------------------------------------------------
-- app_today
--
-- Returns the user's CURRENT CADENCE DATE.
--
-- This is intentionally NOT simply:
--
--   (now() at time zone 'Asia/Kolkata')::date
--
-- because Cadence has a configurable day boundary.
--
-- Example with day_end_time = 04:00:
--
--   2026-09-10 01:00 IST -> 2026-09-09
--   2026-09-10 03:59 IST -> 2026-09-09
--   2026-09-10 04:00 IST -> 2026-09-10
--
-- The function reads the user's day_end_time from profiles.
--
-- ---------------------------------------------------------------------------
 
create or replace function public.app_today(p_user_id uuid)
returns date
language sql
stable
set search_path = ''
as $$
  select (
    (
      now() at time zone 'Asia/Kolkata'
    )
    -
    (
      coalesce(
        (
          select p.day_end_time
          from public.profiles p
          where p.id = p_user_id
        ),
        time '04:00:00'
      )
      - time '00:00:00'
    )
  )::date;
$$;
 
 
comment on function public.app_today(uuid) is
  'Returns the users current Cadence calendar date using their configurable day boundary in Asia/Kolkata.';
 
 
-- ---------------------------------------------------------------------------
-- item_is_editable
--
-- Determines whether a normal/task/habit definition can still be modified.
--
-- NORMAL:
--   - no date
--   - remains editable while incomplete
--   - once completed, becomes locked after that Cadence day ends
--
-- TASK:
--   - editable while its scheduled date is today or future
--   - locked once its scheduled date becomes past
--
-- HABIT:
--   - active habit definitions remain editable
--   - once recurrence_end_date is past, the definition is locked
--
-- ---------------------------------------------------------------------------
 
create or replace function public.item_is_editable(
  p_user_id             uuid,
  p_kind                text,
  p_scheduled_date      date,
  p_recurrence_end_date date,
  p_completed_at        timestamptz
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case p_kind
 
    when 'normal' then
      p_completed_at is null
      or (
        (
          p_completed_at at time zone 'Asia/Kolkata'
        )::date >= public.app_today(p_user_id)
      )
 
    when 'task' then
      p_scheduled_date >= public.app_today(p_user_id)
 
    when 'habit' then
      p_recurrence_end_date is null
      or p_recurrence_end_date >= public.app_today(p_user_id)
 
    else
      false
 
  end;
$$;
 
 
comment on function public.item_is_editable(
  uuid,
  text,
  date,
  date,
  timestamptz
) is
  'Cadence accountability rule for editing normal items, tasks and habits.';
 
 
-- ---------------------------------------------------------------------------
-- habit_occurs_on
--
-- Determines whether a habit is expected on a specific Cadence date.
--
-- ISO weekdays:
--
--   1 = Monday
--   2 = Tuesday
--   ...
--   7 = Sunday
--
-- ---------------------------------------------------------------------------
 
create or replace function public.habit_occurs_on(
  p_recurrence_kind text,
  p_recurrence_days smallint[],
  p_start_date      date,
  p_end_date        date,
  p_on              date
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_on >= p_start_date
    and (
      p_end_date is null
      or p_on <= p_end_date
    )
    and (
      p_recurrence_kind = 'daily'
 
      or
 
      (
        p_recurrence_kind = 'weekly'
        and extract(isodow from p_on)::smallint = any(p_recurrence_days)
      )
    );
$$;
 
 
comment on function public.habit_occurs_on(
  text,
  smallint[],
  date,
  date,
  date
) is
  'Determines whether a recurring habit occurs on a given Cadence date.';
 
 
-- ============================================================================
-- 3. ITEMS
-- ============================================================================
--
-- One table for:
--
--   normal
--   task
--   habit
--
-- They share most of their data and ownership model.
--
-- ============================================================================
 
create table if not exists public.items (
 
  id uuid primary key default gen_random_uuid(),
 
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
 
  kind text not null
    check (kind in ('normal', 'task', 'habit')),
 
  title text not null
    check (btrim(title) <> ''),
 
  description text,
 
  -- -------------------------------------------------------------------------
  -- TASK
  -- -------------------------------------------------------------------------
 
  scheduled_date date,
 
  scheduled_time time,
 
  -- -------------------------------------------------------------------------
  -- HABIT RECURRENCE
  -- -------------------------------------------------------------------------
 
  recurrence_kind text
    check (recurrence_kind in ('daily', 'weekly')),
 
  recurrence_days smallint[],
 
  recurrence_start_date date,
 
  recurrence_end_date date,
 
  -- -------------------------------------------------------------------------
  -- NORMAL / TASK COMPLETION
  --
  -- Habits use habit_completions instead.
  -- -------------------------------------------------------------------------
 
  completed_at timestamptz,
 
  created_at timestamptz not null default now(),
 
  updated_at timestamptz not null default now(),
 
 
  -- Needed for the composite FK used by habit_completions.
  constraint items_id_user_kind_key
    unique (id, user_id, kind),
 
 
  -- -------------------------------------------------------------------------
  -- NORMAL ITEM RULES
  --
  -- Normal items have:
  --   - no date
  --   - no time
  --   - no recurrence
  --
  -- They remain in the user's inbox until completed or deleted.
  -- -------------------------------------------------------------------------
 
  constraint items_normal_shape
    check (
      kind <> 'normal'
      or (
           scheduled_date is null
       and scheduled_time is null
       and recurrence_kind is null
       and recurrence_days is null
       and recurrence_start_date is null
       and recurrence_end_date is null
      )
    ),
 
 
  -- -------------------------------------------------------------------------
  -- TASK RULES
  --
  -- Tasks have a date.
  -- Time is optional.
  -- Tasks do not recur.
  -- -------------------------------------------------------------------------
 
  constraint items_task_shape
    check (
      kind <> 'task'
      or (
           scheduled_date is not null
       and recurrence_kind is null
       and recurrence_days is null
       and recurrence_start_date is null
       and recurrence_end_date is null
      )
    ),
 
 
  -- -------------------------------------------------------------------------
  -- HABIT RULES
  --
  -- Habits:
  --   - don't have a one-off scheduled date
  --   - don't use completed_at
  --   - require recurrence information
  -- -------------------------------------------------------------------------
 
  constraint items_habit_shape
    check (
      kind <> 'habit'
      or (
           scheduled_date is null
       and completed_at is null
       and recurrence_kind is not null
       and recurrence_start_date is not null
 
       and (
         recurrence_end_date is null
         or recurrence_end_date >= recurrence_start_date
       )
 
       and (
 
         -- Daily habit
         (
           recurrence_kind = 'daily'
           and recurrence_days is null
         )
 
         or
 
         -- Weekly habit
         (
           recurrence_kind = 'weekly'
           and recurrence_days is not null
           and array_length(recurrence_days, 1) between 1 and 7
           and recurrence_days <@
             array[1,2,3,4,5,6,7]::smallint[]
         )
 
       )
      )
    )
 
);
 
 
comment on table public.items is
  'Cadence normal items, scheduled tasks and recurring habits.';
 
comment on column public.items.recurrence_days is
  'ISO weekdays: 1 = Monday through 7 = Sunday. Used only by weekly habits.';
 
 
-- ============================================================================
-- 4. HABIT COMPLETIONS
-- ============================================================================
--
-- A completion represents ACTUALLY completing a habit occurrence.
--
-- IMPORTANT ACCOUNTABILITY RULE:
--
--   occurrence_date must equal the user's CURRENT Cadence date.
--
-- Therefore:
--
--   - cannot complete yesterday
--   - cannot complete tomorrow
--   - cannot backdate
--   - cannot pre-complete
--
-- Historical completions remain readable forever.
--
-- ============================================================================
 
create table if not exists public.habit_completions (
 
  id uuid primary key default gen_random_uuid(),
 
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
 
  item_id uuid not null,
 
  item_kind text not null default 'habit'
    check (item_kind = 'habit'),
 
  occurrence_date date not null,
 
  completed_at timestamptz not null default now(),
 
 
  constraint habit_completions_item_fk
    foreign key (item_id, user_id, item_kind)
    references public.items(id, user_id, kind)
    on delete cascade,
 
 
  -- One completion per habit per Cadence date.
  constraint habit_completions_item_date_key
    unique (item_id, occurrence_date)
 
);
 
 
comment on table public.habit_completions is
  'Immutable historical record of actual habit completions.';
 
 
-- ============================================================================
-- 5. DAILY NOTES
-- ============================================================================
--
-- One Markdown journal entry per user per Cadence date.
--
-- Markdown is stored as TEXT.
--
-- We intentionally do NOT use JSONB.
--
-- ============================================================================
 
create table if not exists public.daily_notes (
 
  id uuid primary key default gen_random_uuid(),
 
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
 
  note_date date not null,
 
  content text not null default '',
 
  created_at timestamptz not null default now(),
 
  updated_at timestamptz not null default now(),
 
  constraint daily_notes_user_date_key
    unique (user_id, note_date)
 
);
 
 
comment on table public.daily_notes is
  'One Markdown journal entry per user per Cadence date.';
 
 
comment on column public.daily_notes.content is
  'Markdown document content stored as plain text.';
 
 
-- ============================================================================
-- 6. FOLDERS
-- ============================================================================
--
-- Hierarchical Markdown note folders.
--
-- Every user receives exactly one root folder.
--
-- Example:
--
-- Root
-- ├── Class Notes
-- │   ├── Databases
-- │   └── Networks
-- ├── Projects
-- │   └── Cadence
-- └── Personal
--
-- ============================================================================
 
create table if not exists public.folders (
 
  id uuid primary key default gen_random_uuid(),
 
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
 
  parent_id uuid,
 
  name text not null
    check (btrim(name) <> ''),
 
  is_root boolean not null default false,
 
  created_at timestamptz not null default now(),
 
  updated_at timestamptz not null default now(),
 
 
  -- Composite key used to guarantee parent belongs to same user.
  constraint folders_id_user_key
    unique (id, user_id),
 
 
  constraint folders_parent_fk
    foreign key (parent_id, user_id)
    references public.folders(id, user_id)
    on delete cascade,
 
 
  constraint folders_root_shape
    check (
      (
        is_root = true
        and parent_id is null
      )
      or
      (
        is_root = false
        and parent_id is not null
      )
    ),
 
 
  constraint folders_no_self_parent
    check (
      parent_id is null
      or parent_id <> id
    )
 
);
 
 
comment on table public.folders is
  'Hierarchical user-owned note folders with exactly one protected root folder.';
 
 
-- ============================================================================
-- 7. NOTES
-- ============================================================================
 
create table if not exists public.notes (
 
  id uuid primary key default gen_random_uuid(),
 
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
 
  folder_id uuid not null,
 
  title text not null default 'Untitled'
    check (btrim(title) <> ''),
 
  content text not null default '',
 
  created_at timestamptz not null default now(),
 
  updated_at timestamptz not null default now(),
 
 
  constraint notes_folder_fk
    foreign key (folder_id, user_id)
    references public.folders(id, user_id)
    on delete cascade
 
);
 
 
comment on table public.notes is
  'User-owned Markdown notes stored inside hierarchical folders.';
 
 
comment on column public.notes.content is
  'Markdown document content stored as plain text.';
 
 
-- ============================================================================
-- 8. INDEXES
-- ============================================================================
 
 
create index if not exists items_user_kind_idx
  on public.items(user_id, kind);
 
 
create index if not exists items_user_scheduled_date_idx
  on public.items(user_id, scheduled_date)
  where kind = 'task';
 
 
create index if not exists items_user_updated_at_idx
  on public.items(user_id, updated_at desc);
 
 
create index if not exists habit_completions_user_date_idx
  on public.habit_completions(user_id, occurrence_date);
 
 
create index if not exists folders_user_parent_idx
  on public.folders(user_id, parent_id);
 
 
create unique index if not exists folders_one_root_per_user_idx
  on public.folders(user_id)
  where is_root;
 
 
create index if not exists notes_folder_user_idx
  on public.notes(folder_id, user_id);
 
 
create index if not exists notes_user_updated_at_idx
  on public.notes(user_id, updated_at desc);
 
 
-- ============================================================================
-- 9. UPDATED_AT TRIGGERS
-- ============================================================================
 
 
drop trigger if exists items_set_updated_at
on public.items;
 
create trigger items_set_updated_at
before update on public.items
for each row
execute function public.set_updated_at();
 
 
drop trigger if exists daily_notes_set_updated_at
on public.daily_notes;
 
create trigger daily_notes_set_updated_at
before update on public.daily_notes
for each row
execute function public.set_updated_at();
 
 
drop trigger if exists folders_set_updated_at
on public.folders;
 
create trigger folders_set_updated_at
before update on public.folders
for each row
execute function public.set_updated_at();
 
 
drop trigger if exists notes_set_updated_at
on public.notes;
 
create trigger notes_set_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();
 
 
-- ============================================================================
-- 10. FOLDER CYCLE PROTECTION
-- ============================================================================
--
-- Prevent:
--
-- A
--  └── B
--      └── C
--
-- from being changed to:
--
-- C
--  └── B
--      └── A
--
-- which would create an invalid cycle.
--
-- ============================================================================
 
create or replace function public.folders_prevent_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
 
  if new.parent_id is null then
    return new;
  end if;
 
 
  if new.parent_id = new.id then
    raise exception 'A folder cannot be its own parent';
  end if;
 
 
  if exists (
 
    with recursive chain as (
 
      select
        f.id,
        f.parent_id
 
      from public.folders f
 
      where f.id = new.parent_id
 
 
      union all
 
 
      select
        f.id,
        f.parent_id
 
      from public.folders f
 
      join chain c
        on f.id = c.parent_id
 
    )
 
    select 1
    from chain
    where chain.id = new.id
 
  ) then
 
    raise exception
      'Cannot move a folder into one of its own descendants';
 
  end if;
 
 
  return new;
 
end;
$$;
 
 
drop trigger if exists folders_prevent_cycle_trg
on public.folders;
 
 
create trigger folders_prevent_cycle_trg
before update of parent_id
on public.folders
for each row
execute function public.folders_prevent_cycle();
 
 
-- ============================================================================
-- 11. ROOT FOLDER CREATION
-- ============================================================================
--
-- Separate from your existing profile trigger.
--
-- When a new auth.users row is created:
--
--   auth.users
--       |
--       +--> existing profile trigger -> profiles
--       |
--       +--> this trigger -> root folder
--
-- ============================================================================
 
create or replace function public.handle_new_user_root_folder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
 
  insert into public.folders (
    user_id,
    parent_id,
    name,
    is_root
  )
 
  values (
    new.id,
    null,
    'Root',
    true
  )
 
  on conflict do nothing;
 
 
  return new;
 
end;
$$;
 
 
drop trigger if exists on_auth_user_created_root_folder
on auth.users;
 
 
create trigger on_auth_user_created_root_folder
after insert on auth.users
for each row
execute function public.handle_new_user_root_folder();
 
 
-- ============================================================================
-- 12. BACKFILL ROOT FOLDERS
-- ============================================================================
--
-- Gives a root folder to any user created before the trigger above existed.
-- A no-op on a fresh database.
--
-- ============================================================================
 
insert into public.folders (
  user_id,
  parent_id,
  name,
  is_root
)
 
select
  u.id,
  null,
  'Root',
  true
 
from auth.users u
 
where not exists (
 
  select 1
 
  from public.folders f
 
  where f.user_id = u.id
    and f.is_root = true
 
)
 
on conflict do nothing;
 
 
-- ============================================================================
-- 13. ENABLE RLS
-- ============================================================================
 
 
alter table public.items
enable row level security;
 
 
alter table public.habit_completions
enable row level security;
 
 
alter table public.daily_notes
enable row level security;
 
 
alter table public.folders
enable row level security;
 
 
alter table public.notes
enable row level security;
 
 
-- ============================================================================
-- 14. TABLE GRANTS
-- ============================================================================
--
-- RLS determines WHICH rows a user can access.
-- Grants determine WHETHER the role can access the table at all.
--
-- Supabase recommends handling both layers.
--
-- ============================================================================
 
grant select, insert, update, delete
on table public.items
to authenticated;
 
 
grant select, insert, update, delete
on table public.habit_completions
to authenticated;
 
 
grant select, insert, update, delete
on table public.daily_notes
to authenticated;
 
 
grant select, insert, update, delete
on table public.folders
to authenticated;
 
 
grant select, insert, update, delete
on table public.notes
to authenticated;
 
 
-- ============================================================================
-- 15. ITEM RLS
-- ============================================================================
 
 
-- ---------------------------------------------------------------------------
-- SELECT
--
-- Users can always view their own history.
-- ---------------------------------------------------------------------------
 
drop policy if exists items_select_own
on public.items;
 
 
create policy items_select_own
on public.items
 
for select
 
to authenticated
 
using (
  user_id = (select auth.uid())
);
 
 
-- ---------------------------------------------------------------------------
-- INSERT
--
-- Normal:
--   allowed because it has no scheduled date.
--
-- Task:
--   cannot be inserted with a past date.
--
-- Habit:
--   must not already be ended.
-- ---------------------------------------------------------------------------
 
drop policy if exists items_insert_own
on public.items;
 
 
create policy items_insert_own
on public.items
 
for insert
 
to authenticated
 
with check (
 
  user_id = (select auth.uid())
 
  and public.item_is_editable(
    user_id,
    kind,
    scheduled_date,
    recurrence_end_date,
    completed_at
  )
 
);
 
 
-- ---------------------------------------------------------------------------
-- UPDATE
--
-- USING:
--   existing row must still be editable.
--
-- WITH CHECK:
--   resulting row must also still be editable.
--
-- This prevents:
--
--   present task -> edit -> move it into past
--
-- ---------------------------------------------------------------------------
 
drop policy if exists items_update_own
on public.items;
 
 
create policy items_update_own
on public.items
 
for update
 
to authenticated
 
using (
 
  user_id = (select auth.uid())
 
  and public.item_is_editable(
    user_id,
    kind,
    scheduled_date,
    recurrence_end_date,
    completed_at
  )
 
)
 
with check (
 
  user_id = (select auth.uid())
 
  and public.item_is_editable(
    user_id,
    kind,
    scheduled_date,
    recurrence_end_date,
    completed_at
  )
 
);
 
 
-- ---------------------------------------------------------------------------
-- DELETE
--
-- Normal incomplete items can be deleted.
-- Normal completed items can only be deleted during their Cadence day.
--
-- Tasks can only be deleted while their scheduled date is current/future.
--
-- Active habits can be deleted.
--
-- Ended habits become historical and are locked.
-- ---------------------------------------------------------------------------
 
drop policy if exists items_delete_own
on public.items;
 
 
create policy items_delete_own
on public.items
 
for delete
 
to authenticated
 
using (
 
  user_id = (select auth.uid())
 
  and public.item_is_editable(
    user_id,
    kind,
    scheduled_date,
    recurrence_end_date,
    completed_at
  )
 
);
 
 
-- ============================================================================
-- 16. HABIT COMPLETION RLS
-- ============================================================================
--
-- Historical completions are readable.
--
-- Writing a completion is ONLY allowed for the user's CURRENT Cadence date.
--
-- No:
--
--   yesterday
--   tomorrow
--
-- This enforces accountability.
--
-- Additionally, the selected date must actually be an occurrence of the habit.
--
-- ============================================================================
 
 
drop policy if exists habit_completions_select_own
on public.habit_completions;
 
 
create policy habit_completions_select_own
on public.habit_completions
 
for select
 
to authenticated
 
using (
  user_id = (select auth.uid())
);
 
 
-- ---------------------------------------------------------------------------
-- INSERT
-- ---------------------------------------------------------------------------
 
drop policy if exists habit_completions_insert_own
on public.habit_completions;
 
 
create policy habit_completions_insert_own
on public.habit_completions
 
for insert
 
to authenticated
 
with check (
 
  user_id = (select auth.uid())
 
  and occurrence_date = public.app_today(user_id)
 
  and exists (
 
    select 1
 
    from public.items i
 
    where i.id = item_id
      and i.user_id = user_id
      and i.kind = 'habit'
 
      and public.habit_occurs_on(
        i.recurrence_kind,
        i.recurrence_days,
        i.recurrence_start_date,
        i.recurrence_end_date,
        occurrence_date
      )
 
  )
 
);
 
 
-- ---------------------------------------------------------------------------
-- UPDATE
--
-- Completion records are intentionally effectively immutable.
--
-- We allow updating completed_at for today's completion if needed,
-- but the occurrence date cannot be moved.
-- ---------------------------------------------------------------------------
 
drop policy if exists habit_completions_update_own
on public.habit_completions;
 
 
create policy habit_completions_update_own
on public.habit_completions
 
for update
 
to authenticated
 
using (
 
  user_id = (select auth.uid())
 
  and occurrence_date = public.app_today(user_id)
 
)
 
with check (
 
  user_id = (select auth.uid())
 
  and occurrence_date = public.app_today(user_id)
 
);
 
 
-- ---------------------------------------------------------------------------
-- DELETE
--
-- A user can undo today's completion.
--
-- Historical completions cannot be deleted.
-- ---------------------------------------------------------------------------
 
drop policy if exists habit_completions_delete_own
on public.habit_completions;
 
 
create policy habit_completions_delete_own
on public.habit_completions
 
for delete
 
to authenticated
 
using (
 
  user_id = (select auth.uid())
 
  and occurrence_date = public.app_today(user_id)
 
);
 
 
-- ============================================================================
-- 17. DAILY NOTES RLS
-- ============================================================================
--
-- Daily notes are completely exempt from the accountability restriction.
--
-- A user can edit yesterday's journal.
-- A user can edit a journal from months ago.
--
-- ============================================================================
 
 
drop policy if exists daily_notes_select_own
on public.daily_notes;
 
 
create policy daily_notes_select_own
on public.daily_notes
 
for select
 
to authenticated
 
using (
  user_id = (select auth.uid())
);
 
 
drop policy if exists daily_notes_insert_own
on public.daily_notes;
 
 
create policy daily_notes_insert_own
on public.daily_notes
 
for insert
 
to authenticated
 
with check (
  user_id = (select auth.uid())
);
 
 
drop policy if exists daily_notes_update_own
on public.daily_notes;
 
 
create policy daily_notes_update_own
on public.daily_notes
 
for update
 
to authenticated
 
using (
  user_id = (select auth.uid())
)
 
with check (
  user_id = (select auth.uid())
);
 
 
drop policy if exists daily_notes_delete_own
on public.daily_notes;
 
 
create policy daily_notes_delete_own
on public.daily_notes
 
for delete
 
to authenticated
 
using (
  user_id = (select auth.uid())
);
 
 
-- ============================================================================
-- 18. FOLDER RLS
-- ============================================================================
--
-- Root folder:
--
--   SELECT    allowed
--   INSERT    impossible
--   UPDATE    impossible
--   DELETE    impossible
--
-- Normal folders:
--
--   fully manageable by their owner.
--
-- Account deletion still cascades through auth.users because the protection
-- happens through RLS rather than a deletion-blocking trigger.
--
-- ============================================================================
 
 
drop policy if exists folders_select_own
on public.folders;
 
 
create policy folders_select_own
on public.folders
 
for select
 
to authenticated
 
using (
  user_id = (select auth.uid())
);
 
 
drop policy if exists folders_insert_own_non_root
on public.folders;
 
 
create policy folders_insert_own_non_root
on public.folders
 
for insert
 
to authenticated
 
with check (
 
  user_id = (select auth.uid())
 
  and is_root = false
 
);
 
 
drop policy if exists folders_update_own_non_root
on public.folders;
 
 
create policy folders_update_own_non_root
on public.folders
 
for update
 
to authenticated
 
using (
 
  user_id = (select auth.uid())
 
  and is_root = false
 
)
 
with check (
 
  user_id = (select auth.uid())
 
  and is_root = false
 
);
 
 
drop policy if exists folders_delete_own_non_root
on public.folders;
 
 
create policy folders_delete_own_non_root
on public.folders
 
for delete
 
to authenticated
 
using (
 
  user_id = (select auth.uid())
 
  and is_root = false
 
);
 
 
-- ============================================================================
-- 19. NOTES RLS
-- ============================================================================
--
-- Notes have NO date restriction.
--
-- Historical notes are fully editable.
--
-- ============================================================================
 
 
drop policy if exists notes_select_own
on public.notes;
 
 
create policy notes_select_own
on public.notes
 
for select
 
to authenticated
 
using (
  user_id = (select auth.uid())
);
 
 
drop policy if exists notes_insert_own
on public.notes;
 
 
create policy notes_insert_own
on public.notes
 
for insert
 
to authenticated
 
with check (
  user_id = (select auth.uid())
);
 
 
drop policy if exists notes_update_own
on public.notes;
 
 
create policy notes_update_own
on public.notes
 
for update
 
to authenticated
 
using (
  user_id = (select auth.uid())
)
 
with check (
  user_id = (select auth.uid())
);
 
 
drop policy if exists notes_delete_own
on public.notes;
 
 
create policy notes_delete_own
on public.notes
 
for delete
 
to authenticated
 
using (
  user_id = (select auth.uid())
);
 
 
-- ============================================================================
-- END OF CADENCE SCHEMA
-- ============================================================================


-- ============================================================================
-- CADENCE — MIGRATION 001: date and integrity fixes
-- ============================================================================
--
-- Idempotent: safe to run more than once.
-- Run AFTER the original Cadence schema. Does not drop any table or data.
--
-- Fixes:
--   1. item_is_editable compared a CALENDAR date with a CADENCE date
--      (introduces public.cadence_date_of, rewires app_today onto it)
--   2. weekly habits could store duplicate weekdays (Zod already rejected them)
--   3. profiles.day_end_time had no range limit
--   4. weekly habits could store an EMPTY days array (array_length('{}') is
--      NULL, and a CHECK treats NULL as passing); Zod already required min 1
--
-- ----------------------------------------------------------------------------
-- PREFLIGHT — run these three queries first. All must return zero rows,
-- otherwise the constraints in sections 3, 4 and 5 will refuse to apply.
--
--   select id, recurrence_days
--   from public.items
--   where kind = 'habit'
--     and recurrence_days is not null
--     and cardinality(recurrence_days) <>
--         (select count(distinct d) from unnest(recurrence_days) as d);
--
--   select id, day_end_time
--   from public.profiles
--   where day_end_time < time '00:00' or day_end_time > time '08:00';
--
--   select id from public.items
--   where kind = 'habit' and recurrence_kind = 'weekly'
--     and cardinality(recurrence_days) = 0;
-- ----------------------------------------------------------------------------


-- ============================================================================
-- 1. CADENCE DATE OF AN ARBITRARY TIMESTAMP
-- ============================================================================
--
-- app_today(user) answers "what Cadence date is it NOW?".
-- The editability rule also needs "what Cadence date was THAT moment in?".
-- Both are the same calculation, so they now share one implementation:
--
--   cadence_date = (timestamp in Asia/Kolkata - day_end_time)::date
--
-- Caveat: this reads the user's CURRENT day_end_time. Changing the boundary
-- re-labels the Cadence date of past timestamps. That only matters for the
-- one-day window in which a completed normal item is still editable.
-- ============================================================================

create or replace function public.cadence_date_of(
  p_user_id uuid,
  p_at      timestamptz
)
returns date
language sql
stable
set search_path = ''
as $$
  select (
    (
      p_at at time zone 'Asia/Kolkata'
    )
    -
    (
      coalesce(
        (
          select p.day_end_time
          from public.profiles p
          where p.id = p_user_id
        ),
        time '04:00:00'
      )
      - time '00:00:00'
    )
  )::date;
$$;

comment on function public.cadence_date_of(uuid, timestamptz) is
  'Cadence calendar date containing the given instant, using the users day_end_time in Asia/Kolkata.';


-- app_today keeps its signature and behaviour; it is now cadence_date_of(now()).
create or replace function public.app_today(p_user_id uuid)
returns date
language sql
stable
set search_path = ''
as $$
  select public.cadence_date_of(p_user_id, now());
$$;

comment on function public.app_today(uuid) is
  'Returns the users current Cadence calendar date using their configurable day boundary in Asia/Kolkata.';


-- ============================================================================
-- 2. item_is_editable — compare Cadence date with Cadence date
-- ============================================================================
--
-- NORMAL (changed):
--   Before: (completed_at at time zone 'Asia/Kolkata')::date >= app_today()
--           calendar date vs Cadence date -> a normal item completed between
--           midnight and the boundary stayed editable for about an extra day.
--   After:  cadence_date_of(completed_at) >= app_today()
--           editable while, and only while, its Cadence day is the current one.
--
-- TASK and HABIT are unchanged.
-- ============================================================================

create or replace function public.item_is_editable(
  p_user_id             uuid,
  p_kind                text,
  p_scheduled_date      date,
  p_recurrence_end_date date,
  p_completed_at        timestamptz
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case p_kind

    when 'normal' then
      p_completed_at is null
      or public.cadence_date_of(p_user_id, p_completed_at)
           >= public.app_today(p_user_id)

    when 'task' then
      p_scheduled_date >= public.app_today(p_user_id)

    when 'habit' then
      p_recurrence_end_date is null
      or p_recurrence_end_date >= public.app_today(p_user_id)

    else
      false

  end;
$$;

comment on function public.item_is_editable(uuid, text, date, date, timestamptz) is
  'Cadence accountability rule for editing normal items, tasks and habits. Normal items lock when the Cadence day of their completion ends.';


-- ============================================================================
-- 3. WEEKLY HABITS: NO DUPLICATE WEEKDAYS
-- ============================================================================
--
-- A CHECK constraint cannot contain a subquery, so the test lives in an
-- immutable function. NULL passes (daily habits have no days array).
-- ============================================================================

create or replace function public.array_has_no_duplicates(p_values smallint[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    cardinality(p_values) = (
      select count(distinct v)
      from unnest(p_values) as v
    ),
    true
  );
$$;

comment on function public.array_has_no_duplicates(smallint[]) is
  'True when a smallint array contains no repeated values. NULL is treated as valid.';

alter table public.items
  drop constraint if exists items_habit_days_distinct;

alter table public.items
  add constraint items_habit_days_distinct
  check (public.array_has_no_duplicates(recurrence_days));


-- ============================================================================
-- 4. profiles.day_end_time RANGE
-- ============================================================================
--
-- Allowed: 00:00:00 through 08:00:00 inclusive.
--
-- The boundary is the moment a Cadence day rolls over. Late-evening values
-- (e.g. 22:00) would label each day with the calendar date it STARTS on, which
-- makes every date in the UI read as off by one.
--
-- Keep in sync with DAY_END_TIME_MAX_SECONDS in @cadence/validation profile.ts.
-- ============================================================================

alter table public.profiles
  drop constraint if exists profiles_day_end_time_range;

alter table public.profiles
  add constraint profiles_day_end_time_range
  check (day_end_time >= time '00:00:00' and day_end_time <= time '08:00:00');


-- ============================================================================
-- 5. WEEKLY HABITS: AT LEAST ONE DAY
-- ============================================================================
--
-- items_habit_shape used array_length(recurrence_days, 1) between 1 and 7.
-- For an empty array array_length() returns NULL, the comparison is NULL, and
-- a CHECK constraint accepts NULL -- so a weekly habit with no days (which can
-- never occur) was storable. cardinality() returns 0 for an empty array.
--
-- The rest of the constraint is reproduced unchanged.
-- ============================================================================

alter table public.items
  drop constraint if exists items_habit_shape;

alter table public.items
  add constraint items_habit_shape
  check (
    kind <> 'habit'
    or (
         scheduled_date is null
     and completed_at is null
     and recurrence_kind is not null
     and recurrence_start_date is not null

     and (
       recurrence_end_date is null
       or recurrence_end_date >= recurrence_start_date
     )

     and (

       -- Daily habit
       (
         recurrence_kind = 'daily'
         and recurrence_days is null
       )

       or

       -- Weekly habit
       (
         recurrence_kind = 'weekly'
         and recurrence_days is not null
         and cardinality(recurrence_days) between 1 and 7
         and recurrence_days <@
           array[1,2,3,4,5,6,7]::smallint[]
       )

     )
    )
  );


-- ============================================================================
-- END OF MIGRATION 001
-- ============================================================================

-- ============================================================================
-- CADENCE — MIGRATION 002 (OPTIONAL): accountability hardening
-- ============================================================================
--
-- Not required by the architecture findings. Two independent sections; apply
-- either or both. Idempotent. Run after 001.
--
--   A. Stop day_end_time being used to backdate.
--   B. Qualify an ambiguous column in the habit_completions insert policy.
-- ============================================================================


-- ============================================================================
-- A. DAY_END_TIME MUST NOT MOVE "TODAY" BACKWARDS
-- ============================================================================
--
-- Cadence forbids completing yesterday's habit. But the boundary is a
-- user-editable column, and the current Cadence date is derived from it:
--
--   06:00 IST, boundary 04:00  -> today = Sep 28
--   user sets boundary to 08:00 -> today = Sep 27   (yesterday is open again)
--
-- so a user could reopen the previous day just by changing a setting.
-- This trigger rejects any change that moves the current Cadence date to an
-- EARLIER date. Moving it forward is allowed (that only closes a day early).
--
-- Because 001 limits the boundary to 00:00-08:00, this can only ever bite
-- between 00:00 and 08:00 IST; outside that window no legal change moves the
-- date backwards.
--
-- Not covered: moving the boundary EARLIER at, say, 02:00 makes "today" the
-- next calendar date a couple of hours early. Closing that fully needs the new
-- boundary to take effect at the next rollover, which means a pending-value
-- column. Deliberately not done here.
-- ============================================================================

create or replace function public.day_end_change_moves_date_back(
  p_old_day_end_time time,
  p_new_day_end_time time,
  p_at               timestamptz
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    ((p_at at time zone 'Asia/Kolkata') - (p_new_day_end_time - time '00:00:00'))::date
    <
    ((p_at at time zone 'Asia/Kolkata') - (p_old_day_end_time - time '00:00:00'))::date;
$$;

comment on function public.day_end_change_moves_date_back(time, time, timestamptz) is
  'True when switching day_end_time from old to new would make the Cadence date at p_at earlier.';


create or replace function public.profiles_guard_day_end_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.day_end_time is distinct from old.day_end_time
     and public.day_end_change_moves_date_back(
           old.day_end_time,
           new.day_end_time,
           now()
         )
  then
    raise exception
      'day_end_time cannot be changed in a way that moves the current Cadence date backwards'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;


drop trigger if exists profiles_guard_day_end_time_trg
on public.profiles;

create trigger profiles_guard_day_end_time_trg
before update of day_end_time
on public.profiles
for each row
execute function public.profiles_guard_day_end_time();


-- ============================================================================
-- B. habit_completions INSERT POLICY: QUALIFY THE OUTER ROW
-- ============================================================================
--
-- The original subquery said:
--
--   from public.items i
--   where i.id = item_id
--     and i.user_id = user_id          <-- resolves to i.user_id = i.user_id
--
-- Inside the subquery an unqualified user_id binds to the NEAREST table that
-- has that column, which is items, so the condition was always true
-- (pg_policies shows it deparsed as "i.user_id = i.user_id").
--
-- No data was ever at risk: habit_completions_item_fk is
-- (item_id, user_id, item_kind) -> items(id, user_id, kind), so the database
-- already guarantees the habit belongs to the same user. This just makes the
-- policy say what it means instead of relying on the foreign key to cover it.
-- ============================================================================

drop policy if exists habit_completions_insert_own
on public.habit_completions;

create policy habit_completions_insert_own
on public.habit_completions

for insert

to authenticated

with check (

  user_id = (select auth.uid())

  and occurrence_date = public.app_today(user_id)

  and exists (

    select 1

    from public.items i

    where i.id = habit_completions.item_id
      and i.user_id = habit_completions.user_id
      and i.kind = 'habit'

      and public.habit_occurs_on(
        i.recurrence_kind,
        i.recurrence_days,
        i.recurrence_start_date,
        i.recurrence_end_date,
        habit_completions.occurrence_date
      )

  )

);


-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================

-- ============================================================================
-- CADENCE — MIGRATION 003: Cloudinary avatars for email-auth users
-- ============================================================================
--
-- Idempotent: safe to run more than once. Run after 001 (and 002 if used).
--
-- profiles now has TWO avatar sources:
--
--   avatar_url        an external URL. Filled by handle_new_user() from OAuth
--                     metadata (Google/GitHub picture). Unchanged.
--   avatar_public_id  the Cloudinary public_id of an image the user uploaded
--                     (email-auth users, or anyone replacing their picture).
--
-- Precedence for display: avatar_public_id when set, else avatar_url.
--
-- Images are uploaded as SIGNED uploads with delivery type 'authenticated',
-- so an image can only be shown through a URL the server signs. Only the
-- public_id is stored; signed URLs are generated per request and never
-- stored (they expire / can be rotated).
--
-- Folder convention, enforced below:
--
--   profiles/<profiles.id>/<name>        e.g.
--   profiles/2b1f...-...-...e9/avatar_1729150000
--
-- Why enforce it in the database: the "Users can update their own profile"
-- policy lets a user update their own row directly (PostgREST + their JWT), so without this a user
-- could point avatar_public_id at someone else's image and have the server
-- sign it. The CHECK ties the id to the row's own user.
--
-- Keep in sync with AVATAR_FOLDER / avatarPublicIdSchema in
-- packages/validation/src/profile.ts and Profile.avatarPublicId in
-- packages/types/src/profile.ts.
-- ============================================================================

alter table public.profiles
  add column if not exists avatar_public_id text;

alter table public.profiles
  drop constraint if exists profiles_avatar_public_id_shape;

alter table public.profiles
  add constraint profiles_avatar_public_id_shape
  check (
    avatar_public_id is null
    or (
      char_length(avatar_public_id) <= 255
      and avatar_public_id ~ ('^profiles/' || id::text || '/[A-Za-z0-9_-]+$')
    )
  );

comment on column public.profiles.avatar_public_id is
  'Cloudinary public_id of the user-uploaded avatar (authenticated delivery, signed URLs). Must live under profiles/<id>/. Takes precedence over avatar_url.';


-- ----------------------------------------------------------------------------
-- (Optional, recommended) profiles.updated_at was never maintained: the
-- original schema added set_updated_at triggers to every app table except
-- profiles. Settings will update profiles, so keep updated_at honest.
-- ----------------------------------------------------------------------------

drop trigger if exists profiles_set_updated_at
on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


-- ============================================================================
-- END OF MIGRATION 003
-- ============================================================================


-- ============================================================================
-- CADENCE — MIGRATION 004: per-user time zone
-- ============================================================================
--
-- Idempotent: safe to run more than once. Run after 003.
--
-- Every user gets their own IANA time zone (profiles.time_zone) instead of
-- the hardcoded Asia/Kolkata, and "today" follows it, daylight saving
-- included:
--
--   cadence_date = ((instant AT TIME ZONE zone) - day_end_time)::date
--
-- Changing the zone or the day end must never move "today" backwards, repeat
-- a date, or reopen a closed day. So a change is stored as PENDING and takes
-- effect once the current day D has ended under BOTH the old and the new
-- settings:
--
--   effective_at = max(end of D under current settings,
--                      end of D under new settings)
--   end of D     = ((D + 1) + day_end_time) AT TIME ZONE zone
--
-- (Waiting for the old day alone is not enough: India -> New York at India's
-- 04:00 would make it Monday again in New York.) A due pending change is used
-- by every rule immediately; copying it into the main columns ("folding") is
-- housekeeping done by the RPCs in part B.
--
-- items.completed_on freezes the Cadence date a normal item was completed on.
-- Editability used to recompute it from completed_at with the CURRENT
-- settings, so a zone change could relabel yesterday's completion as "today"
-- and reopen it.
--
-- Part A: columns, zone-aware date functions, frozen completion date.
-- Part B: write lock-down and the RPCs that change day settings.
-- ============================================================================


-- ============================================================================
-- 004 A1. PROFILE COLUMNS
-- ============================================================================

alter table public.profiles
  add column if not exists time_zone text not null default 'Asia/Kolkata',
  add column if not exists pending_time_zone text,
  add column if not exists pending_day_end_time time,
  add column if not exists pending_effective_at timestamptz,
  add column if not exists onboarded_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_pending_all_or_none;

alter table public.profiles
  add constraint profiles_pending_all_or_none
  check (
    (pending_time_zone is null
     and pending_day_end_time is null
     and pending_effective_at is null)
    or
    (pending_time_zone is not null
     and pending_day_end_time is not null
     and pending_effective_at is not null)
  );

alter table public.profiles
  drop constraint if exists profiles_pending_day_end_time_range;

alter table public.profiles
  add constraint profiles_pending_day_end_time_range
  check (
    pending_day_end_time is null
    or (pending_day_end_time >= time '00:00:00'
        and pending_day_end_time <= time '08:00:00')
  );


-- ============================================================================
-- 004 A2. TIME ZONE NAMES
-- ============================================================================
--
-- Valid = a name Postgres knows (pg_timezone_names), excluding the duplicate
-- posix/ and right/ trees. A CHECK constraint can't run a query, so a trigger
-- enforces it.
-- ============================================================================

create or replace function public.is_valid_time_zone(p_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    p_name <> ''
    and p_name not like 'posix/%'
    and p_name not like 'right/%'
    and exists (
      select 1 from pg_catalog.pg_timezone_names t where t.name = p_name
    ),
    false
  );
$$;

comment on function public.is_valid_time_zone(text) is
  'True for IANA zone names Postgres knows (excluding posix/ and right/ duplicates).';


create or replace function public.profiles_validate_time_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_valid_time_zone(new.time_zone) then
    raise exception 'invalid time zone: %', new.time_zone
      using errcode = 'check_violation';
  end if;

  if new.pending_time_zone is not null
     and not public.is_valid_time_zone(new.pending_time_zone) then
    raise exception 'invalid time zone: %', new.pending_time_zone
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_validate_time_zone_trg
on public.profiles;

create trigger profiles_validate_time_zone_trg
before insert or update of time_zone, pending_time_zone
on public.profiles
for each row
execute function public.profiles_validate_time_zone();


-- ============================================================================
-- 004 A3. ZONE-AWARE CADENCE DATES
-- ============================================================================

-- The user's settings in effect at p_at: the pending ones once they are due.
create or replace function public.effective_day_settings(
  p_user_id uuid,
  p_at      timestamptz
)
returns table (time_zone text, day_end_time time)
language sql
stable
set search_path = ''
as $$
  select
    case when p.pending_effective_at <= p_at
         then p.pending_time_zone else p.time_zone end,
    case when p.pending_effective_at <= p_at
         then p.pending_day_end_time else p.day_end_time end
  from public.profiles p
  where p.id = p_user_id;
$$;

comment on function public.effective_day_settings(uuid, timestamptz) is
  'Time zone and day end in effect for the user at the given instant (a due pending change wins).';


-- The instant the Cadence day p_date ends under (zone, day end).
create or replace function public.cadence_day_end(
  p_time_zone    text,
  p_day_end_time time,
  p_date         date
)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select ((p_date + 1) + p_day_end_time) at time zone p_time_zone;
$$;

comment on function public.cadence_day_end(text, time, date) is
  'Instant the Cadence day p_date ends: the next calendar date at the day end time, in the zone.';


-- Same signature as before; now zone-aware and pending-aware.
create or replace function public.cadence_date_of(
  p_user_id uuid,
  p_at      timestamptz
)
returns date
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (
      select ((p_at at time zone s.time_zone) - (s.day_end_time - time '00:00:00'))::date
      from public.effective_day_settings(p_user_id, p_at) s
    ),
    ((p_at at time zone 'Asia/Kolkata') - interval '4 hours')::date
  );
$$;

comment on function public.cadence_date_of(uuid, timestamptz) is
  'Cadence calendar date containing the given instant, using the users time zone and day end in effect at that instant.';

comment on function public.app_today(uuid) is
  'Returns the users current Cadence calendar date (their time zone and day end, pending change applied once due).';


-- ============================================================================
-- 004 A4. FROZEN COMPLETION DATE FOR NORMAL ITEMS
-- ============================================================================

alter table public.items
  add column if not exists completed_on date;

-- Backfill once with the rule that applied so far (zone is still Asia/Kolkata
-- for everyone here). The trigger below would block this update, and the
-- updated_at trigger shouldn't bump rows that didn't really change.
drop trigger if exists items_set_completed_on_trg on public.items;
alter table public.items disable trigger items_set_updated_at;

update public.items
set completed_on = public.cadence_date_of(user_id, completed_at)
where kind = 'normal'
  and completed_at is not null
  and completed_on is null;

alter table public.items enable trigger items_set_updated_at;


-- The database alone decides completed_on: set from app_today() when an item
-- becomes completed, cleared when it is un-completed, otherwise kept. A value
-- written by a client is always replaced.
create or replace function public.items_set_completed_on()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind <> 'normal' or new.completed_at is null then
    new.completed_on := null;
  elsif tg_op = 'INSERT' or old.completed_at is null then
    new.completed_on := public.app_today(new.user_id);
  else
    new.completed_on := old.completed_on;
  end if;

  return new;
end;
$$;

create trigger items_set_completed_on_trg
before insert or update
on public.items
for each row
execute function public.items_set_completed_on();


-- Editability: normal items lock when their FROZEN completion day ends.
create or replace function public.item_is_editable(
  p_user_id             uuid,
  p_kind                text,
  p_scheduled_date      date,
  p_recurrence_end_date date,
  p_completed_at        timestamptz,
  p_completed_on        date
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case p_kind

    when 'normal' then
      p_completed_at is null
      or p_completed_on >= public.app_today(p_user_id)

    when 'task' then
      p_scheduled_date >= public.app_today(p_user_id)

    when 'habit' then
      p_recurrence_end_date is null
      or p_recurrence_end_date >= public.app_today(p_user_id)

    else
      false

  end;
$$;

comment on function public.item_is_editable(uuid, text, date, date, timestamptz, date) is
  'Cadence accountability rule for editing normal items, tasks and habits. Normal items lock when their frozen completion day (completed_on) ends.';


drop policy if exists items_insert_own on public.items;

create policy items_insert_own
on public.items
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.item_is_editable(
    user_id, kind, scheduled_date, recurrence_end_date, completed_at, completed_on
  )
);

drop policy if exists items_update_own on public.items;

create policy items_update_own
on public.items
for update
to authenticated
using (
  user_id = (select auth.uid())
  and public.item_is_editable(
    user_id, kind, scheduled_date, recurrence_end_date, completed_at, completed_on
  )
)
with check (
  user_id = (select auth.uid())
  and public.item_is_editable(
    user_id, kind, scheduled_date, recurrence_end_date, completed_at, completed_on
  )
);

drop policy if exists items_delete_own on public.items;

create policy items_delete_own
on public.items
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and public.item_is_editable(
    user_id, kind, scheduled_date, recurrence_end_date, completed_at, completed_on
  )
);

-- The old five-argument version recomputed the date from completed_at.
drop function if exists public.item_is_editable(uuid, text, date, date, timestamptz);


-- ============================================================================
-- 004 A5. REMOVE THE OLD DAY-BOUNDARY GUARD (002 A)
-- ============================================================================
--
-- Pending changes (part B) make every change wait for the day to end, which
-- closes the loophole fully; 002's comment said exactly this was needed.
-- ============================================================================

drop trigger if exists profiles_guard_day_end_time_trg on public.profiles;
drop function if exists public.profiles_guard_day_end_time();
drop function if exists public.day_end_change_moves_date_back(time, time, timestamptz);


-- ============================================================================
-- 004 B1. WHEN A PENDING CHANGE TAKES EFFECT
-- ============================================================================
--
-- Pure, so it can be tested without faking now(). See the 004 header.
-- ============================================================================

create or replace function public.compute_pending_effective_at(
  p_cur_zone    text,
  p_cur_day_end time,
  p_new_zone    text,
  p_new_day_end time,
  p_date        date
)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select greatest(
    public.cadence_day_end(p_cur_zone, p_cur_day_end, p_date),
    public.cadence_day_end(p_new_zone, p_new_day_end, p_date)
  );
$$;

comment on function public.compute_pending_effective_at(text, time, text, time, date) is
  'When a day-settings change requested on Cadence date p_date takes effect: after that day ends under both the old and the new settings.';


-- Copy a due pending change into the main columns. Internal; the result of
-- every rule is the same before and after (effective_day_settings already
-- uses due pending values).
create or replace function public.fold_due_day_settings(p_user_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.profiles
  set time_zone            = pending_time_zone,
      day_end_time         = pending_day_end_time,
      pending_time_zone    = null,
      pending_day_end_time = null,
      pending_effective_at = null
  where id = p_user_id
    and pending_effective_at <= now();
$$;

revoke execute on function public.fold_due_day_settings(uuid) from public, anon, authenticated;


-- ============================================================================
-- 004 B2. RPCs: THE ONLY WAY TO CHANGE ZONE, DAY END AND ONBOARDING
-- ============================================================================
--
-- security definer, acting on auth.uid() only. Errors are raised with
-- errcode check_violation and the code as the message, which the server maps:
-- INVALID_TIME_ZONE, DAY_END_TIME_OUT_OF_RANGE, ALREADY_ONBOARDED,
-- DISPLAY_NAME_INVALID.
-- ============================================================================

create or replace function public.schedule_day_settings(
  p_time_zone    text,
  p_day_end_time time
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_valid_time_zone(p_time_zone) then
    raise exception 'INVALID_TIME_ZONE' using errcode = 'check_violation';
  end if;

  if p_day_end_time is null
     or p_day_end_time < time '00:00:00'
     or p_day_end_time > time '08:00:00' then
    raise exception 'DAY_END_TIME_OUT_OF_RANGE' using errcode = 'check_violation';
  end if;

  perform public.fold_due_day_settings(v_user_id);

  select * into v_profile from public.profiles where id = v_user_id;

  if v_profile.time_zone = p_time_zone
     and v_profile.day_end_time = p_day_end_time then
    update public.profiles
    set pending_time_zone = null,
        pending_day_end_time = null,
        pending_effective_at = null
    where id = v_user_id
    returning * into v_profile;
  else
    update public.profiles
    set pending_time_zone    = p_time_zone,
        pending_day_end_time = p_day_end_time,
        pending_effective_at = public.compute_pending_effective_at(
          v_profile.time_zone, v_profile.day_end_time,
          p_time_zone, p_day_end_time,
          public.app_today(v_user_id)
        )
    where id = v_user_id
    returning * into v_profile;
  end if;

  return v_profile;
end;
$$;

comment on function public.schedule_day_settings(text, time) is
  'Schedule a time zone / day end change for the signed-in user; takes effect when the current day has ended under both settings.';


create or replace function public.cancel_pending_day_settings()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  perform public.fold_due_day_settings(v_user_id);

  update public.profiles
  set pending_time_zone = null,
      pending_day_end_time = null,
      pending_effective_at = null
  where id = v_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

comment on function public.cancel_pending_day_settings() is
  'Cancel the signed-in users pending time zone / day end change (a change already in effect stays).';


create or replace function public.complete_onboarding(
  p_time_zone    text,
  p_day_end_time time,
  p_display_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name    text := btrim(coalesce(p_display_name, ''));
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;

  if v_profile.onboarded_at is not null then
    raise exception 'ALREADY_ONBOARDED' using errcode = 'check_violation';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 100 then
    raise exception 'DISPLAY_NAME_INVALID' using errcode = 'check_violation';
  end if;

  if not public.is_valid_time_zone(p_time_zone) then
    raise exception 'INVALID_TIME_ZONE' using errcode = 'check_violation';
  end if;

  if p_day_end_time is null
     or p_day_end_time < time '00:00:00'
     or p_day_end_time > time '08:00:00' then
    raise exception 'DAY_END_TIME_OUT_OF_RANGE' using errcode = 'check_violation';
  end if;

  update public.profiles
  set display_name = v_name,
      onboarded_at = now()
  where id = v_user_id;

  -- Nothing dated yet: apply at once. Otherwise wait for the day to end.
  if not exists (select 1 from public.items where user_id = v_user_id)
     and not exists (select 1 from public.habit_completions where user_id = v_user_id)
     and not exists (select 1 from public.daily_notes where user_id = v_user_id) then
    update public.profiles
    set time_zone            = p_time_zone,
        day_end_time         = p_day_end_time,
        pending_time_zone    = null,
        pending_day_end_time = null,
        pending_effective_at = null
    where id = v_user_id
    returning * into v_profile;
  else
    v_profile := public.schedule_day_settings(p_time_zone, p_day_end_time);
  end if;

  return v_profile;
end;
$$;

comment on function public.complete_onboarding(text, time, text) is
  'First-time setup: name, time zone and day end. Applied immediately for users with no dated data, otherwise scheduled.';


revoke execute on function public.schedule_day_settings(text, time) from public, anon;
revoke execute on function public.cancel_pending_day_settings() from public, anon;
revoke execute on function public.complete_onboarding(text, time, text) from public, anon;

grant execute on function public.schedule_day_settings(text, time) to authenticated;
grant execute on function public.cancel_pending_day_settings() to authenticated;
grant execute on function public.complete_onboarding(text, time, text) to authenticated;


-- ============================================================================
-- 004 B3. PROFILE WRITE LOCK-DOWN
-- ============================================================================
--
-- Until now a signed-in user could update ANY column of their own profile
-- row straight through the REST API. Only the columns the app writes with the
-- user's token stay writable; everything else changes through the RPCs.
-- ============================================================================

revoke update on public.profiles from anon, authenticated;

grant update (display_name, avatar_public_id) on public.profiles to authenticated;


-- ============================================================================
-- CADENCE — MIGRATION 005: account deletion
-- ============================================================================
--
-- Idempotent: safe to run more than once. Run after 004.
--
-- A signed-in user can delete their own account. Every table that belongs to
-- a user references auth.users ON DELETE CASCADE (profiles, items,
-- habit_completions, daily_notes, folders, notes, and Auth's own sessions,
-- identities, MFA factors and one-time tokens), so deleting the auth.users
-- row removes everything in the database in one statement.
--
-- Profile photos live in Cloudinary; the API server removes those after this
-- function succeeds. No service-role key is involved: the function runs as
-- its owner and only ever touches auth.uid()'s own row.
-- ============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  delete from auth.users where id = v_user_id;
end;
$$;

comment on function public.delete_my_account() is
  'Permanently delete the signed-in users account and, through ON DELETE CASCADE, all of their data.';

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- ============================================================================
-- CADENCE — MIGRATION 006: per-account theme
-- ============================================================================
--
-- Idempotent: safe to run more than once. Run after 005.
--
-- The app's colour theme, saved with the account so it follows the user to
-- every device. Keep the list in sync with THEME_IDS in apps/web/lib/theme.ts
-- and themeSchema in @cadence/validation.
-- ============================================================================

alter table public.profiles
  add column if not exists theme text not null default 'sage';

alter table public.profiles
  drop constraint if exists profiles_theme_known;

alter table public.profiles
  add constraint profiles_theme_known
  check (theme in ('sage', 'red', 'blue', 'purple'));

-- 004 locked profile updates down to listed columns; the theme joins them.
grant update (theme) on public.profiles to authenticated;
