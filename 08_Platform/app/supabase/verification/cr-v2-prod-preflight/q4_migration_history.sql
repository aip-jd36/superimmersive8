-- CR-V2-PROD-2 · Q4 of 6 · Supabase CLI migration history (version and name only). READ-ONLY: one SELECT.
-- Incomplete by design: migrations applied through the SQL Editor are not recorded here; Q1-Q3 and Q6 are the
-- authority for what exists. If this errors with "relation does not exist", paste the error text instead.
SELECT jsonb_agg(jsonb_build_array(version, name) ORDER BY version) AS q4 FROM supabase_migrations.schema_migrations;
