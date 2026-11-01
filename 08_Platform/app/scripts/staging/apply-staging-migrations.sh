#!/usr/bin/env bash
# CR-V2-MVP-M4C — apply the full migration history to a FRESH, NON-PRODUCTION Supabase database.
#
#   STAGING_SUPABASE_REF=<20-char staging ref> STAGING_DATABASE_URL='<direct Postgres URL of that project>' \
#     scripts/staging/apply-staging-migrations.sh            # run from 08_Platform/app; needs psql 15+
#
# Order: 08_Platform/supabase/migrations/*.sql (001-006, base schema), then supabase/migrations/*.sql
# (through 20261102000000, M3), each file in its own transaction, stopping at the first error. The
# staging-only placeholder supabase/staging/before_20260909000000_assessment_publications.sql runs just
# before 20260909000000, which otherwise refuses on a database without Production's ASSESS-005.
#
# Refuses: the Production ref anywhere in the inputs; a URL that does not name the staging ref; a
# database that is not empty (public.submissions already exists). It never prints the URL.
# Applied with psql, so the CLI's migration history is not written: do not `supabase db push` to staging.
set -euo pipefail

PROD_REF='lehqgcgnenwdmuzudbrs'
: "${STAGING_SUPABASE_REF:?set STAGING_SUPABASE_REF}"
: "${STAGING_DATABASE_URL:?set STAGING_DATABASE_URL}"
PSQL="${PSQL:-psql}"
APP="$(cd "$(dirname "$0")/../.." && pwd)"

[[ "$STAGING_SUPABASE_REF" =~ ^[a-z0-9]{20}$ ]] || { echo "REFUSED: STAGING_SUPABASE_REF is not a Supabase project ref"; exit 1; }
[[ "$STAGING_SUPABASE_REF" != "$PROD_REF" ]] || { echo "REFUSED: that is the Production project"; exit 1; }
[[ "$STAGING_DATABASE_URL" != *"$PROD_REF"* ]] || { echo "REFUSED: the database URL names the Production project"; exit 1; }
[[ "$STAGING_DATABASE_URL" == *"$STAGING_SUPABASE_REF"* ]] || { echo "REFUSED: the database URL does not name $STAGING_SUPABASE_REF"; exit 1; }

q() { "$PSQL" -X -q -v ON_ERROR_STOP=1 -d "$STAGING_DATABASE_URL" "$@"; }
[[ "$(q -Atc "select to_regclass('public.submissions') is null")" == "t" ]] || { echo "REFUSED: database is not empty (public.submissions exists)"; exit 1; }

n=0
for f in "$APP"/../supabase/migrations/*.sql "$APP"/supabase/migrations/*.sql; do
  b="$(basename "$f" .sql)"
  hook="$APP/supabase/staging/before_$b.sql"
  if [[ -f "$hook" ]]; then q -1 -f "$hook"; echo "STAGING  before_$b"; fi
  q -1 -f "$f"
  n=$((n + 1))
  echo "APPLIED  $b"
done
echo "DONE: $n migrations applied to $STAGING_SUPABASE_REF"
q -Atc "select 'bucket ' || id || ' public=' || public from storage.buckets where id = 'creator-records'"
q -Atc "select 'guard ' || tgname from pg_trigger where tgname in ('creator_record_artifacts_product_guard','rights_packages_creator_record_v2_guard','submissions_creator_record_product_guard') order by 1"
