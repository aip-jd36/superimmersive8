-- CR-V2-PROD-2 · Q1 of 6 · Table columns. READ-ONLY: one SELECT over the system catalogs; reads no table rows.
-- Run alone in the Supabase SQL Editor (Production). Paste back the single JSON cell (column "q1").
WITH t(name) AS (VALUES ('submissions'), ('rights_packages'), ('creator_record_artifacts'), ('creator_record_artifact_uat'), ('payment_fulfillments'), ('payment_legacy_session_policy'), ('users'), ('creator_record_v2_prepared'), ('creator_record_v2_pilot_access')),
rel AS (SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN t ON t.name = c.relname
        WHERE n.nspname = 'public' AND c.relkind = 'r')
SELECT jsonb_build_object(
  'server_version', current_setting('server_version'),
  'tables_present', (SELECT jsonb_agg(relname ORDER BY relname) FROM rel),
  'columns', (SELECT jsonb_object_agg(r.relname, (
      SELECT jsonb_agg(jsonb_build_array(a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull, pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attname)
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped)) FROM rel r)
) AS q1;
