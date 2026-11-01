-- CR-V2-PROD-2 · Q2 of 6 · Constraints, triggers, indexes, row-level security and grants. READ-ONLY: one SELECT
-- over the system catalogs; reads no table rows. Paste back the single JSON cell (column "q2").
WITH t(name) AS (VALUES ('submissions'), ('rights_packages'), ('creator_record_artifacts'), ('creator_record_artifact_uat'), ('payment_fulfillments'), ('payment_legacy_session_policy'), ('users'), ('creator_record_v2_prepared'), ('creator_record_v2_pilot_access')),
rel AS (SELECT c.oid, c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN t ON t.name = c.relname
        WHERE n.nspname = 'public' AND c.relkind = 'r')
SELECT jsonb_build_object(
  'constraints', (SELECT jsonb_object_agg(r.relname, (SELECT jsonb_agg(jsonb_build_array(co.conname, pg_get_constraintdef(co.oid)) ORDER BY co.conname)
      FROM pg_constraint co WHERE co.conrelid = r.oid)) FROM rel r),
  'triggers', (SELECT jsonb_object_agg(r.relname, (SELECT jsonb_agg(pg_get_triggerdef(tg.oid) ORDER BY tg.tgname)
      FROM pg_trigger tg WHERE tg.tgrelid = r.oid AND NOT tg.tgisinternal)) FROM rel r),
  'indexes', (SELECT jsonb_object_agg(r.relname, (SELECT jsonb_agg(pg_get_indexdef(i.indexrelid) ORDER BY 1) FROM pg_index i WHERE i.indrelid = r.oid)) FROM rel r),
  'rls_enabled', (SELECT jsonb_object_agg(relname, relrowsecurity) FROM rel),
  'table_grants', (SELECT jsonb_object_agg(r.relname, (SELECT jsonb_agg(DISTINCT g.grantee || ':' || g.privilege_type)
      FROM information_schema.role_table_grants g
      WHERE g.table_schema = 'public' AND g.table_name = r.relname AND g.grantee IN ('anon', 'authenticated', 'service_role'))) FROM rel r)
) AS q2;
