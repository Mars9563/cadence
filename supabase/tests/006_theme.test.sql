-- Migration 006 tests: per-account theme.
-- Run with: sh supabase/tests/run-local.sh supabase/tests/006_theme.test.sql
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a006', 'a6@test.local'),
  ('00000000-0000-0000-0000-00000000b006', 'b6@test.local');

do $$ begin
  assert (select theme from public.profiles where id = '00000000-0000-0000-0000-00000000a006') = 'sage',
         'default theme is sage';
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a006","role":"authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a006', true);
set local role authenticated;

-- A user can change their own theme...
update public.profiles set theme = 'purple' where id = auth.uid();

-- ...but not to an unknown one,
do $$ begin
  update public.profiles set theme = 'neon' where id = auth.uid();
  raise exception 'unknown theme accepted';
exception when check_violation then null;
end $$;

-- ...and not someone else's (RLS: the row is invisible, nothing changes).
update public.profiles set theme = 'red' where id = '00000000-0000-0000-0000-00000000b006';

reset role;

do $$ begin
  assert (select theme from public.profiles where id = '00000000-0000-0000-0000-00000000a006') = 'purple', 'own theme saved';
  assert (select theme from public.profiles where id = '00000000-0000-0000-0000-00000000b006') = 'sage', 'other user untouched';
end $$;

rollback;
