-- CR-V2-PROD-UAT-B preflight U4 · READ-ONLY. Whether the CLI migration history records either migration. If the
-- supabase_migrations schema does not exist, report the error text instead (migrations here are applied by hand).
SELECT json_build_object('recorded', (SELECT coalesce(json_agg(m.version ORDER BY m.version), '[]'::json)
                                        FROM supabase_migrations.schema_migrations m
                                       WHERE m.version IN ('20261104000000', '20261105000000'))) AS u4;
