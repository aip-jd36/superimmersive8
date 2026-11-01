-- CR-V2-PROD-2 · Q6 of 6 · M2 (20261101000000) / M3 (20261102000000) compatibility checks. READ-ONLY: one SELECT
-- over the system catalogs (and storage bucket settings); reads no table rows. Returns one row per check:
-- n | check | expected | actual | ok. Paste back the whole grid. Every row with ok = false blocks M2/M3.
WITH
col AS (SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull AS is_not_null, d.adbin IS NOT NULL AS has_default
        FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = 'public.submissions'::regclass AND a.attnum > 0 AND NOT a.attisdropped),
sub_checks AS (SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'public.submissions'::regclass AND contype = 'c'),
fn AS (SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'),
coltype AS (SELECT c.relname, a.attname, format_type(a.atttypid, a.atttypmod) AS type
            FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped),
checks(n, chk, expected, actual) AS (
  -- M2 / M3 not yet applied, and nothing already uses their names (CREATE ... IF NOT EXISTS would silently keep a look-alike).
  SELECT 1, 'M2 table creator_record_v2_prepared absent', 'absent', coalesce(to_regclass('public.creator_record_v2_prepared')::text, 'absent')
  UNION ALL SELECT 2, 'M2 table creator_record_v2_pilot_access absent', 'absent', coalesce(to_regclass('public.creator_record_v2_pilot_access')::text, 'absent')
  UNION ALL SELECT 3, 'M3 column submissions.creator_record_product absent', 'absent', coalesce((SELECT type FROM col WHERE name = 'creator_record_product'), 'absent')
  UNION ALL SELECT 4, 'M2/M3 function names unused', '0',
    (SELECT count(*)::text FROM fn WHERE proname IN ('creator_record_v2_prepared_guard', 'submissions_creator_record_product_guard', 'create_creator_record_v2_submission',
                                                    'creator_record_artifacts_product_guard', 'rights_packages_creator_record_v2_guard'))
  UNION ALL SELECT 5, 'M2/M3 trigger names unused', '0',
    (SELECT count(*)::text FROM pg_trigger WHERE NOT tgisinternal AND tgname IN ('creator_record_v2_prepared_guard', 'submissions_creator_record_product_guard',
                                                                                 'creator_record_artifacts_product_guard', 'rights_packages_creator_record_v2_guard'))
  UNION ALL SELECT 6, 'constraint name submissions_creator_record_product_check unused', 'absent',
    coalesce((SELECT conname FROM sub_checks WHERE conname = 'submissions_creator_record_product_check'), 'absent')
  -- Dependencies M2 / M3 rely on.
  UNION ALL SELECT 7, 'artifact migration 20261028 applied (creator_record_artifacts exists)', 'present',
    CASE WHEN to_regclass('public.creator_record_artifacts') IS NULL THEN 'absent' ELSE 'present' END
  UNION ALL SELECT 8, 'creator_record_artifacts.generator_version is text', 'text',
    coalesce((SELECT type FROM coltype WHERE relname = 'creator_record_artifacts' AND attname = 'generator_version'), 'absent')
  UNION ALL SELECT 9, 'creator-records bucket exists and is private', 'private',
    coalesce((SELECT CASE WHEN public THEN 'PUBLIC' ELSE 'private' END FROM storage.buckets WHERE id = 'creator-records'), 'absent')
  UNION ALL SELECT 10, 'documents bucket (historical v1 PDFs) exists and is private', 'private',
    coalesce((SELECT CASE WHEN public THEN 'PUBLIC' ELSE 'private' END FROM storage.buckets WHERE id = 'documents'), 'absent')
  UNION ALL SELECT 11, 'users.id is uuid (M2 foreign keys)', 'uuid', coalesce((SELECT type FROM coltype WHERE relname = 'users' AND attname = 'id'), 'absent')
  UNION ALL SELECT 12, 'submissions.id is uuid', 'uuid', coalesce((SELECT type FROM col WHERE name = 'id'), 'absent')
  UNION ALL SELECT 13, 'rights_packages.submission_id is uuid', 'uuid', coalesce((SELECT type FROM coltype WHERE relname = 'rights_packages' AND attname = 'submission_id'), 'absent')
  -- The v2 bind function's INSERT into submissions supplies exactly these columns.
  UNION ALL SELECT 14, 'submissions NOT NULL columns without a default',
    'audio_disclosure,authorship_statement,filmmaker_name,ip_confirmation,likeness_confirmation,title,tools_used,user_id',
    (SELECT string_agg(name, ',' ORDER BY name) FROM col WHERE is_not_null AND NOT has_default)
  UNION ALL SELECT 15, 'types of the columns the bind function writes',
    'audio_disclosure:jsonb,authorship_statement:text,filmmaker_name:text,ip_confirmation:jsonb,likeness_confirmation:jsonb,payment_status:text,status:text,tier:text,title:text,tools_used:jsonb,user_id:uuid',
    (SELECT string_agg(name || ':' || type, ',' ORDER BY name) FROM col WHERE name IN ('user_id', 'tier', 'status', 'payment_status', 'title', 'filmmaker_name', 'tools_used',
                                                                                  'authorship_statement', 'likeness_confirmation', 'ip_confirmation', 'audio_disclosure'))
  UNION ALL SELECT 16, 'no CHECK on the neutral bind columns (title, filmmaker_name, authorship_statement, tools_used, likeness/ip/audio)', '0',
    (SELECT count(*)::text FROM sub_checks WHERE def ~ '\m(title|filmmaker_name|authorship_statement|tools_used|likeness_confirmation|ip_confirmation|audio_disclosure)\M')
  UNION ALL SELECT 17, 'tier CHECK allows creator_record', 'true',
    coalesce((SELECT (bool_and(def LIKE '%''creator_record''%'))::text FROM sub_checks WHERE def ~ '\mtier\M'), 'no tier CHECK')
  UNION ALL SELECT 18, 'status CHECK allows pending', 'true',
    coalesce((SELECT (bool_and(def LIKE '%''pending''%'))::text FROM sub_checks WHERE def ~ '\mstatus\M' AND def !~ 'payment_status'), 'no status CHECK')
  UNION ALL SELECT 19, 'payment_status CHECK allows unpaid', 'true',
    coalesce((SELECT (bool_and(def LIKE '%''unpaid''%'))::text FROM sub_checks WHERE def ~ '\mpayment_status\M'), 'no payment_status CHECK')
  -- Built-ins M2 / M3 call.
  UNION ALL SELECT 20, 'gen_random_uuid and hashtextextended available', '2',
    (SELECT count(DISTINCT proname)::text FROM pg_proc WHERE proname IN ('gen_random_uuid', 'hashtextextended'))
  -- Informational: anything else that fires on the tables M3 adds triggers to.
  UNION ALL SELECT 21, 'existing user triggers on submissions / rights_packages / creator_record_artifacts', '(informational)',
    (SELECT coalesce(string_agg(tgrelid::regclass::text || '.' || tgname, ', ' ORDER BY tgrelid::regclass::text || '.' || tgname), 'none') FROM pg_trigger
      WHERE NOT tgisinternal AND tgrelid IN (to_regclass('public.submissions'), to_regclass('public.rights_packages'), to_regclass('public.creator_record_artifacts')))
)
SELECT n, chk AS "check", expected, actual, CASE WHEN expected = '(informational)' THEN NULL ELSE expected = coalesce(actual, 'NULL') END AS ok
FROM checks ORDER BY n;
