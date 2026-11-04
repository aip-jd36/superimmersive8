-- CR-V2-PROD-UAT-B — revoke every unrevoked operator synthetic examination UAT grant (kill switch).
-- Database operator only. Revocation ends examination authorization immediately (the access-log guard and the write
-- function re-check the grant under its row lock). It DELETES NOTHING: documents, objects, access events, runs and
-- the grant row itself are left exactly as they are. Any later cleanup is a separate, governed decision.
-- Edit ONLY the two EDIT constants.

DO $revoke$
DECLARE
  c_revoked_by     constant text := 'EDIT: operator name';
  c_revoke_reason  constant text := 'EDIT: reason (e.g. UAT complete, or partial seed contained)';
  v_n integer;
BEGIN
  IF c_revoked_by LIKE 'EDIT:%' OR c_revoke_reason LIKE 'EDIT:%' THEN
    RAISE EXCEPTION 'REFUSED: edit both EDIT constants first';
  END IF;
  UPDATE public.creator_record_v2_examination_uat_grants
     SET revoked_at = now(), revoked_by = c_revoked_by, revoke_reason = c_revoke_reason
   WHERE revoked_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'revoked % grant(s)', v_n;
END
$revoke$;
