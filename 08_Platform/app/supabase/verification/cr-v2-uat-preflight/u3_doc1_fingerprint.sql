-- CR-V2-PROD-UAT-B preflight U3 · READ-ONLY. Fingerprint of the DOC-1 objects 20261105000000 builds on (it changes
-- none of these functions): function bodies (md5 of the source), definer flag, settings and owner; the documents
-- table's constraints, triggers, API grants and consent nullability. Compare with expected/u3_post_doc1.json.
SELECT json_build_object(
  'functions', (SELECT json_object_agg(p.proname, json_build_object('md5', md5(p.prosrc), 'definer', p.prosecdef, 'config', p.proconfig, 'owner', pg_get_userbyid(p.proowner)))
                  FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
                   AND p.proname IN ('creator_record_v2_documents_guard', 'creator_record_v2_prepared_documents_link', 'creator_record_v2_append_only_guard')),
  'documents_constraints', (SELECT json_object_agg(c.conname, pg_get_constraintdef(c.oid)) FROM pg_constraint c WHERE c.conrelid = 'public.creator_record_v2_documents'::regclass),
  'documents_triggers', (SELECT json_agg(t.tgname ORDER BY t.tgname) FROM pg_trigger t WHERE t.tgrelid = 'public.creator_record_v2_documents'::regclass AND NOT t.tgisinternal),
  'documents_api_grants', (SELECT json_object_agg(r.role, json_build_array(
                              has_table_privilege(r.role, 'public.creator_record_v2_documents', 'SELECT'), has_table_privilege(r.role, 'public.creator_record_v2_documents', 'INSERT'),
                              has_table_privilege(r.role, 'public.creator_record_v2_documents', 'UPDATE'), has_table_privilege(r.role, 'public.creator_record_v2_documents', 'DELETE')))
                             FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(role)),
  'consent_version_not_null', (SELECT a.attnotnull FROM pg_attribute a WHERE a.attrelid = 'public.creator_record_v2_documents'::regclass AND a.attname = 'consent_version')
) AS u3;
