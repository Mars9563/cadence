# SQL tests

`sh supabase/tests/run-local.sh <test.sql ...>` starts a throwaway `supabase/postgres`
container, applies `stubs.sql` + `supabase/schema.sql`, runs each test file, then deletes
the container. Needs Docker. It never connects to a real database.
`APPLY_TWICE=1` applies the schema twice (checks the migrations are idempotent).
Test files wrap everything in `begin; ... rollback;` and fail by raising an exception.
