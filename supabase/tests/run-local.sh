#!/bin/sh
# Load supabase/schema.sql into a throwaway local Supabase Postgres and run
# SQL test files against it. Needs Docker. Never touches any real database.
#
#   sh supabase/tests/run-local.sh [test.sql ...]
set -eu

cd "$(dirname "$0")/../.."

IMAGE=supabase/postgres:15.8.1.085
NAME=cadence-sqltest

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1' EXIT

i=0
until docker exec "$NAME" pg_isready -U postgres -h localhost >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -gt 90 ] && { echo "database did not start"; exit 1; }
  sleep 1
done
# The image restarts once after its init scripts; wait for that too.
sleep 3
until docker exec "$NAME" pg_isready -U postgres -h localhost >/dev/null 2>&1; do sleep 1; done

run_sql() {
  docker exec -i "$NAME" psql -X -q -v ON_ERROR_STOP=1 -U supabase_admin -h localhost -d postgres
}

run_sql < supabase/tests/stubs.sql
run_sql < supabase/schema.sql
if [ "${APPLY_TWICE:-0}" = 1 ]; then run_sql < supabase/schema.sql; fi
echo "schema loaded"

failed=0
for test in "$@"; do
  if run_sql < "$test"; then echo "PASS $test"; else echo "FAIL $test"; failed=1; fi
done
[ "$#" -eq 0 ] && echo "0 test files"
exit "$failed"
