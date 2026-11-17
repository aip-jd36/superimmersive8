-- SI8-PRIVACY-CRC-1B — READ-ONLY preview of what the 30-day raw-IP retention would clear.
-- Aggregate counts only: never selects an address, a session id or any row content. Changes nothing.
-- Result on 2026-11-17: raw_ip_total 20, would_clear_now 20, non_rate_limited_with_ip 0, oldest 2026-08-13, newest 2026-09-28.

SELECT
  count(*) FILTER (WHERE raw_ip IS NOT NULL)                                                   AS raw_ip_total,
  count(*) FILTER (WHERE raw_ip IS NOT NULL AND created_at < now() - interval '30 days')       AS would_clear_now,
  count(*) FILTER (WHERE raw_ip IS NOT NULL AND event_type <> 'rate_limited')                   AS non_rate_limited_with_ip,
  (min(created_at) FILTER (WHERE raw_ip IS NOT NULL))::date                                     AS oldest,
  (max(created_at) FILTER (WHERE raw_ip IS NOT NULL))::date                                     AS newest
FROM public.crc_pilot_events;
