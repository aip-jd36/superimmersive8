-- CR-V2-PROD-UAT-B preflight U2 · READ-ONLY. Can every existing DOC-1 document be classified 'owner_upload'?
-- Counts only (no ids, paths, names, file names or consent text). 20261105000000 refuses unless
-- provenance_establishable is true: every row carries the one consent value the DOC-1 intake writes. This is
-- CONSISTENCY EVIDENCE (rows look like DOC-1 intake writes), not proof that any user completed a consent step.
SELECT json_build_object(
  'documents_total',                (SELECT count(*) FROM public.creator_record_v2_documents),
  'documents_with_intake_consent',  (SELECT count(*) FROM public.creator_record_v2_documents WHERE consent_version = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'),
  'documents_with_other_consent',   (SELECT count(*) FROM public.creator_record_v2_documents WHERE consent_version IS DISTINCT FROM 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'),
  'documents_by_state',             (SELECT coalesce(json_object_agg(s.state, s.n), '{}'::json) FROM (SELECT d.state, count(*) AS n FROM public.creator_record_v2_documents d GROUP BY d.state) s),
  'owners_with_documents',          (SELECT count(DISTINCT user_id) FROM public.creator_record_v2_documents),
  'access_log_rows',                (SELECT count(*) FROM public.creator_record_v2_evidence_access_log),
  'prepared_document_references',   (SELECT count(*) FROM public.creator_record_v2_prepared_documents),
  'provenance_establishable',       NOT EXISTS (SELECT 1 FROM public.creator_record_v2_documents WHERE consent_version IS DISTINCT FROM 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0')
) AS u2;
