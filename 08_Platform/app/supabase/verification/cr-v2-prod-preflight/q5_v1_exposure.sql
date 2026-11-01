-- CR-V2-PROD-2 · Q5 of 6 · Existing Creator Record v1 payment and artifact exposure. READ-ONLY: one SELECT.
-- Returns submission ids, Stripe checkout-session ids (needed to expire an open v1 session in Stripe), statuses,
-- counts and timestamps only: no names, emails, titles, answers, payment intents, tokens or file paths.
-- Written for the CURRENT Production schema (before M2/M3): it does not reference creator_record_product, so
-- every creator_record row it reports is v1. Paste back the single JSON cell (column "q5").
SELECT jsonb_build_object(
  'as_of', now(),
  'cr_submissions_by_state', (SELECT jsonb_object_agg(k, n) FROM (
      SELECT coalesce(status, 'null') || '/' || coalesce(payment_status, 'null') AS k, count(*) AS n
      FROM public.submissions WHERE tier = 'creator_record' GROUP BY 1) x),
  'unpaid_v1_with_persisted_session', (SELECT coalesce(jsonb_agg(jsonb_build_object('submission_id', id, 'session', stripe_checkout_session_id, 'created_at', created_at, 'updated_at', updated_at) ORDER BY updated_at DESC), '[]')
      FROM public.submissions WHERE tier = 'creator_record' AND payment_status = 'unpaid' AND stripe_checkout_session_id IS NOT NULL),
  'paid_cr_without_any_pdf', (SELECT coalesce(jsonb_agg(jsonb_build_object('submission_id', s.id, 'status', s.status, 'updated_at', s.updated_at)), '[]')
      FROM public.submissions s
      WHERE s.tier = 'creator_record' AND s.payment_status = 'paid'
        AND NOT EXISTS (SELECT 1 FROM public.creator_record_artifacts a WHERE a.submission_id = s.id AND a.status = 'issued')
        AND NOT EXISTS (SELECT 1 FROM public.rights_packages r WHERE r.submission_id = s.id AND r.document_url IS NOT NULL)),
  'ledger_cr_not_completed', (SELECT coalesce(jsonb_agg(jsonb_build_object('session', stripe_checkout_session_id, 'submission_id', submission_id, 'outcome', outcome,
          'fulfillment', fulfillment_status, 'pdf', pdf_status, 'email', email_status, 'anomaly', anomaly_status, 'attempts', attempts,
          'last_attempt_at', last_attempt_at, 'updated_at', updated_at) ORDER BY updated_at DESC), '[]')
      FROM public.payment_fulfillments
      WHERE tier = 'creator_record' AND (fulfillment_status NOT IN ('completed', 'not_required') OR anomaly_status = 'open')),
  'ledger_cr_by_state', (SELECT jsonb_object_agg(k, n) FROM (
      SELECT outcome || '/' || fulfillment_status || '/' || pdf_status || '/' || email_status AS k, count(*) AS n
      FROM public.payment_fulfillments WHERE tier = 'creator_record' GROUP BY 1) x),
  'ledger_any_tier_not_completed', (SELECT count(*) FROM public.payment_fulfillments WHERE fulfillment_status NOT IN ('completed', 'not_required') OR anomaly_status = 'open'),
  'artifacts_by_state', (SELECT jsonb_object_agg(k, n) FROM (
      SELECT status || '/' || generator_version || '/uat=' || uat AS k, count(*) AS n FROM public.creator_record_artifacts GROUP BY 1) x),
  'artifacts_pending', (SELECT coalesce(jsonb_agg(jsonb_build_object('submission_id', submission_id, 'generator', generator_version, 'created_at', created_at, 'updated_at', updated_at)), '[]')
      FROM public.creator_record_artifacts WHERE status = 'pending'),
  'historical_downloads', jsonb_build_object(
      'issued_private_artifacts', (SELECT count(*) FROM public.creator_record_artifacts WHERE status = 'issued'),
      'legacy_rights_packages_with_pdf_for_cr', (SELECT count(*) FROM public.rights_packages r JOIN public.submissions s ON s.id = r.submission_id
                                                 WHERE s.tier = 'creator_record' AND r.document_url IS NOT NULL),
      'cr_with_both', (SELECT count(*) FROM public.submissions s WHERE s.tier = 'creator_record'
                        AND EXISTS (SELECT 1 FROM public.creator_record_artifacts a WHERE a.submission_id = s.id)
                        AND EXISTS (SELECT 1 FROM public.rights_packages r WHERE r.submission_id = s.id AND r.document_url IS NOT NULL)),
      'legacy_objects_in_documents_bucket', (SELECT count(*) FROM storage.objects WHERE bucket_id = 'documents'),
      'objects_in_creator_records_bucket', (SELECT count(*) FROM storage.objects WHERE bucket_id = 'creator-records')),
  'uat_allowlist_rows', (SELECT count(*) FROM public.creator_record_artifact_uat),
  'legacy_session_policy', (SELECT to_jsonb(p) - 'activation_note' FROM public.payment_legacy_session_policy p),
  'unpaid_legacy_certified_with_session', (SELECT count(*) FROM public.submissions WHERE tier = 'certified' AND payment_status = 'unpaid' AND stripe_checkout_session_id IS NOT NULL)
) AS q5;
