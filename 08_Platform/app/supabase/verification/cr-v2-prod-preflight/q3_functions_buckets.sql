-- CR-V2-PROD-2 · Q3 of 6 · Public functions (an MD5 of each body, not the body) and storage bucket settings.
-- READ-ONLY: SELECTs over pg_proc and storage.buckets (bucket configuration only; no objects are read).
-- Paste back the single JSON cell (column "q3").
SELECT jsonb_build_object(
  'functions', (SELECT jsonb_object_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
                 jsonb_build_object('md5', md5(p.prosrc), 'security_definer', p.prosecdef, 'lang', l.lanname))
                FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace JOIN pg_language l ON l.oid = p.prolang
                WHERE n.nspname = 'public' AND p.prokind = 'f'),
  'buckets', (SELECT jsonb_agg(jsonb_build_array(id, public, file_size_limit, allowed_mime_types) ORDER BY id) FROM storage.buckets)
) AS q3;
