-- SI8-PRIVACY-CRC-1B — 30-day retention for crc_pilot_events.raw_ip (PROPOSED; not applied to Production).
--
-- Why: raw_ip is written only on `rate_limited` events (20260814000000) so a person can investigate a mistaken lockout. The
-- longest CRC rate-limit window is 7 days (completed sessions per email), so after 30 days the address has no stated purpose.
-- Until now nothing expired it.
--
-- What this adds: ONE function. It sets raw_ip to NULL on events older than 30 days. Nothing else changes: the event row, id,
-- session_id, event_type, detail and created_at are kept; no other table or IP-derived field (e.g. crc_sessions.abuse_key, an
-- HMAC) is touched; no row is deleted. No schedule is created here; the function only runs when called.
--
-- Bounded: at most p_limit rows (1–10000, default 1000) per call, oldest first, rows locked by a concurrent run are skipped.
-- Idempotent: an already-cleared row no longer matches `raw_ip IS NOT NULL`, so repeated calls change nothing further.
-- Auditable without exposing addresses: returns only counts (cleared now, still expired after this call). It never returns,
-- logs or raises an IP value.
--
-- Caller: the service role only, via POST /api/internal/crc/raw-ip-retention (GitHub Actions, gated off by default).
-- Applying this migration does not clear anything. The first call against Production clears every raw_ip older than 30 days
-- (20 rows as of 2026-11-17) and needs separate founder authorization.
--
-- Rollback: DROP FUNCTION IF EXISTS public.clear_expired_crc_pilot_raw_ip(integer);
-- (Cleared addresses cannot be restored.)

CREATE OR REPLACE FUNCTION public.clear_expired_crc_pilot_raw_ip(p_limit integer DEFAULT 1000)
RETURNS TABLE (cleared integer, remaining_expired integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff  timestamptz := now() - interval '30 days';
  v_cleared integer;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'crc_raw_ip_retention_invalid_limit' USING ERRCODE = '22023';
  END IF;

  WITH target AS (
    SELECT id
      FROM public.crc_pilot_events
     WHERE raw_ip IS NOT NULL
       AND created_at < v_cutoff
     ORDER BY created_at, id
     LIMIT p_limit
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.crc_pilot_events e
     SET raw_ip = NULL
    FROM target
   WHERE e.id = target.id;
  GET DIAGNOSTICS v_cleared = ROW_COUNT;

  RETURN QUERY
    SELECT v_cleared,
           (SELECT count(*)::integer
              FROM public.crc_pilot_events
             WHERE raw_ip IS NOT NULL
               AND created_at < v_cutoff);
END
$$;

COMMENT ON FUNCTION public.clear_expired_crc_pilot_raw_ip(integer) IS
  'SI8-PRIVACY-CRC-1B: sets crc_pilot_events.raw_ip to NULL for events older than 30 days; keeps the rows. Returns counts only.';

REVOKE ALL ON FUNCTION public.clear_expired_crc_pilot_raw_ip(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_expired_crc_pilot_raw_ip(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_expired_crc_pilot_raw_ip(integer) TO service_role;
