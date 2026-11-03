-- CR-V2-UAT-PROD-3 · 07 · READ-ONLY Production preflight for 20261106000000: the standalone form of the checks that
-- 05_apply_20261106.sql makes ITSELF and that 02 / 04 / 06 do not cover: server version, Production identity, the exact
-- E4 fingerprint (runs, documents, examination events, grants), no active grant, no isolated-test marker, and the
-- migration's own precondition (the exact 20261105 run authority constraint). Plus diagnostic counts.
-- One SELECT; reads only. HAND-MAINTAINED, but every authoritative condition is the positive form of 05's, text for text
-- (__tests__/ops/cr-v2-preflight-20261106-sync.test.ts fails on any divergence).
-- Run AFTER 04_verify_20261105.sql reports state 'applied' (this query reads 20261105 tables and errors if they are absent).
-- Expected: every boolean true; counts grants 1, documents 1, examination_events 1, events_with_grant 1, runs 1,
-- marker_rows 0. Any false or other count = NO-GO (see README.md). Returns booleans and counts only (no ids or rows).
SELECT json_build_object(
  'server_version_ok', current_setting('server_version_num')::int >= 150000,
  'looks_like_production', EXISTS (SELECT 1 FROM public.assessments
       WHERE assessment_number = 'ASSESS-005-2026-07-12' AND methodology_version IS DISTINCT FROM 'STAGING-PLACEHOLDER'),
  'counts', json_build_object(
    'grants', (SELECT count(*) FROM public.creator_record_v2_examination_uat_grants),
    'documents', (SELECT count(*) FROM public.creator_record_v2_documents),
    'examination_events', (SELECT count(*) FROM public.creator_record_v2_evidence_access_log WHERE purpose = 'examination'),
    'events_with_grant', (SELECT count(*) FROM public.creator_record_v2_evidence_access_log WHERE uat_grant_id IS NOT NULL),
    'runs', (SELECT count(*) FROM public.creator_record_v2_examination_runs),
    'marker_rows', (SELECT count(*) FROM public.creator_record_v2_examination_environment)),
  'e4_run_exact', (SELECT count(*) FROM public.creator_record_v2_examination_runs) = 1 AND EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs r
       WHERE r.id = '5a2f9a72-1ae5-4db0-9d27-7dbee34ff697' AND r.examination_key = 'd1e75f5c11bac55f5be45271188d733aca815370af6312ad64928e78bac6fcf5' AND r.document_id = 'daa1f62d-1655-46cd-906b-7d44817d1f88'
         AND r.user_id = '45f0d04f-4082-42ba-b65e-d8e28a3fc8bf' AND r.uat_grant_id = '27d8c027-44d0-4c4a-91fb-fa8ba5518848' AND r.execution_boundary = 'operator_synthetic_uat'
         AND r.environment_project_ref = 'lehqgcgnenwdmuzudbrs' AND r.document_sha256 = '4db805768f966b748098e3890d9a8c4a76ed12e46609aaeccb8902733563501c' AND r.replay_fixture_id = 'pdf-kling-pro-monthly'
         AND r.outcome_status = 'examined' AND r.outcome_reason IS NULL AND r.supersedes_id IS NULL),
  'e4_document_exact', (SELECT count(*) FROM public.creator_record_v2_documents) = 1 AND EXISTS (SELECT 1 FROM public.creator_record_v2_documents d
       WHERE d.id = 'daa1f62d-1655-46cd-906b-7d44817d1f88' AND d.user_id = '45f0d04f-4082-42ba-b65e-d8e28a3fc8bf' AND d.sha256 = '4db805768f966b748098e3890d9a8c4a76ed12e46609aaeccb8902733563501c'
         AND d.origin = 'operator_synthetic_seed' AND d.seed_grant_id = '27d8c027-44d0-4c4a-91fb-fa8ba5518848' AND d.consent_version IS NULL AND d.state = 'stored'),
  'e4_event_exact', (SELECT count(*) FROM public.creator_record_v2_evidence_access_log WHERE purpose = 'examination') = 1
     AND (SELECT count(*) FROM public.creator_record_v2_evidence_access_log WHERE uat_grant_id IS NOT NULL) = 1
     AND EXISTS (SELECT 1 FROM public.creator_record_v2_evidence_access_log l JOIN public.creator_record_v2_examination_runs r ON r.access_log_id = l.id
       WHERE l.purpose = 'examination' AND l.actor_role = 'owner' AND l.document_id = 'daa1f62d-1655-46cd-906b-7d44817d1f88'
         AND l.actor_user_id = '45f0d04f-4082-42ba-b65e-d8e28a3fc8bf' AND l.uat_grant_id = '27d8c027-44d0-4c4a-91fb-fa8ba5518848' AND r.id = '5a2f9a72-1ae5-4db0-9d27-7dbee34ff697'),
  'e4_grant_exact_and_revoked', (SELECT count(*) FROM public.creator_record_v2_examination_uat_grants) = 1 AND EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants g
       WHERE g.id = '27d8c027-44d0-4c4a-91fb-fa8ba5518848' AND g.test_user_id = '45f0d04f-4082-42ba-b65e-d8e28a3fc8bf' AND g.document_sha256 = '4db805768f966b748098e3890d9a8c4a76ed12e46609aaeccb8902733563501c'
         AND g.bound_document_id = 'daa1f62d-1655-46cd-906b-7d44817d1f88' AND g.supabase_project_ref = 'lehqgcgnenwdmuzudbrs'
         AND g.created_at = '2026-11-03T08:50:18.968754Z'::timestamptz AND g.expires_at = '2026-11-03T10:50:18.968754Z'::timestamptz
         AND g.max_read_events = 4 AND g.max_new_runs = 1
         AND g.revoked_at IS NOT NULL AND g.revoked_by IS NOT NULL AND g.revoke_reason IS NOT NULL),
  'no_active_grant', NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants WHERE revoked_at IS NULL AND expires_at > now()),
  'no_marker', NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_environment),
  'run_authority_constraint_is_20261105', (SELECT pg_get_constraintdef(oid) FROM pg_constraint
       WHERE conrelid = 'public.creator_record_v2_examination_runs'::regclass AND conname = 'creator_record_v2_examination_runs_authority_check')
     = 'CHECK (((environment_project_ref ~ ''^[a-z0-9]{20}$''::text) AND (((execution_boundary = ''isolated_synthetic_test''::text) AND (uat_grant_id IS NULL) AND (environment_project_ref <> ''lehqgcgnenwdmuzudbrs''::text)) OR ((execution_boundary = ''operator_synthetic_uat''::text) AND (uat_grant_id IS NOT NULL)))))',
  'grant_kind_absent', NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.creator_record_v2_examination_uat_grants'::regclass AND attname = 'grant_kind' AND attnum > 0 AND NOT attisdropped)
) AS preflight_20261106;
