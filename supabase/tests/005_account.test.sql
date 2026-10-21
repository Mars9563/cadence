-- Migration 005 tests: account deletion.
-- Run with: sh supabase/tests/run-local.sh supabase/tests/005_account.test.sql
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a005', 'gone@test.local'),
  ('00000000-0000-0000-0000-00000000b005', 'stays@test.local');

-- One row of everything for the user who leaves.
insert into public.items (id, user_id, kind, title) values
  ('00000000-0000-0000-0000-0000000c0005', '00000000-0000-0000-0000-00000000a005', 'normal', 'Task');
insert into public.items (id, user_id, kind, title, recurrence_kind, recurrence_start_date) values
  ('00000000-0000-0000-0000-0000000d0005', '00000000-0000-0000-0000-00000000a005', 'habit', 'Read', 'daily', current_date);
insert into public.habit_completions (user_id, item_id, item_kind, occurrence_date)
  values ('00000000-0000-0000-0000-00000000a005', '00000000-0000-0000-0000-0000000d0005', 'habit', current_date);
insert into public.notes (user_id, folder_id, title, content)
  select '00000000-0000-0000-0000-00000000a005', f.id, 'Note', 'body'
  from public.folders f where f.user_id = '00000000-0000-0000-0000-00000000a005' and f.is_root;
insert into public.daily_notes (user_id, note_date, content)
  values ('00000000-0000-0000-0000-00000000a005', current_date, 'today');

-- Anonymous callers are refused.
set local role anon;
do $$ begin
  perform public.delete_my_account();
  raise exception 'anonymous delete was allowed';
exception when insufficient_privilege then null;
end $$;
reset role;

-- The user deletes their own account.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a005","role":"authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a005', true);
set local role authenticated;
select public.delete_my_account();
reset role;

do $$
declare
  u uuid := '00000000-0000-0000-0000-00000000a005';
  t text;
  n int;
begin
  assert not exists (select 1 from auth.users where id = u), 'auth user deleted';
  foreach t in array array['items','folders','notes','daily_notes','habit_completions'] loop
    execute format('select count(*) from public.%I where user_id = $1', t) into n using u;
    assert n = 0, format('%s rows left: %s', t, n);
  end loop;
  assert not exists (select 1 from public.profiles where id = u), 'profile deleted';

  -- The other user is untouched.
  assert exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000b005'), 'other profile kept';
  assert exists (select 1 from public.folders where user_id = '00000000-0000-0000-0000-00000000b005'), 'other folder kept';
end $$;

rollback;
