#!/usr/bin/env bash
set -euo pipefail
[[ "${PGHOST:-}" == localhost && "${PGDATABASE:-}" == academy_ci ]] || exit 1
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
sql(){ psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
for scope in checkout:ci subscription:ci; do
  sql "set role service_role; select public.academy_acquire_lease('$scope','11111111-1111-4111-8111-111111111111')" > "$tmp/a" &
  a=$!
  sql "set role service_role; select public.academy_acquire_lease('$scope','22222222-2222-4222-8222-222222222222')" > "$tmp/b" &
  b=$!
  wait "$a"; wait "$b"
  [[ $(cat "$tmp/a" "$tmp/b" | sort | tr '\n' ' ') == 'f t ' ]]
  winner=11111111-1111-4111-8111-111111111111
  loser=22222222-2222-4222-8222-222222222222
  if [[ $(cat "$tmp/b") == t ]]; then swap=$winner; winner=$loser; loser=$swap; fi
  sql "set role service_role; select public.academy_release_lease('$scope','$loser')" >/dev/null
  [[ $(sql "set role service_role; select public.academy_acquire_lease('$scope','$loser')") == f ]]
  sql "set role service_role; select public.academy_release_lease('$scope','$winner')" >/dev/null
  [[ $(sql "set role service_role; select public.academy_acquire_lease('$scope','$loser')") == t ]]
  sql "update public.academy_operation_leases set expires_at=now()-interval '1 second' where scope='$scope'" >/dev/null
  [[ $(sql "set role service_role; select public.academy_acquire_lease('$scope','$winner')") == t ]]
  sql "set role service_role; select public.academy_release_lease('$scope','$winner')" >/dev/null
  echo "$scope concurrent acquisition, owner release and expiry passed"
done
