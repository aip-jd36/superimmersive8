/**
 * CRC admin usage-notification gating (CRC-OPS-NOTIFY-1, 2026-09-23). Two
 * small, pure predicates -- extracted out of app/api/crc/turn/route.ts's
 * own inline conditionals so the actual GATING DECISION is directly
 * testable without a full mocked route-handler harness (this repo has none
 * for app/api/crc/turn/route.ts -- see __tests__/api/crc-turn-route.test.ts's
 * own header: only parseRequest is deterministic/testable there today).
 * Mirrors the same "extract the boolean out of route.ts" precedent already
 * established by shouldApplyRateLimiting() (traffic-classification.ts).
 *
 * This module composes nothing, sends nothing, persists nothing -- it
 * decides only WHETHER to notify. The actual send (lib/emails.ts's
 * sendCrcSessionStartedAdminNotification / sendCrcResultsEmailCapturedAdminNotification)
 * and the actual WHEN-to-call-this-module ordering both stay in route.ts,
 * exactly like recordAndNotifyMaterialDemandEvidence's own division of
 * labor.
 */

/**
 * CRC STARTED. Called only from route.ts's existing one-time-per-session
 * hooks (isFreshGuidedInit / the free-form isNewSession block) -- this
 * function does not itself know whether the session is genuinely new;
 * route.ts's own established gating (creation.outcome === 'created',
 * isNewSession && parsed.kind !== 'guided_entry_init') already guarantees
 * that. The one thing this predicate adds is the internal_test exclusion,
 * which neither of those existing gates applies on its own.
 */
export function shouldNotifyCrcSessionStarted(trafficType: string): boolean {
  return trafficType !== 'internal_test'
}

/**
 * CRC COMPLETED (results-email captured). `deliveryKind` is
 * DeliveryResult['kind'] from results-email-delivery.ts, passed as a plain
 * string here to avoid this module importing that one just for a type
 * (mirrors AbuseCheckResult's own reason-literal precedent in
 * abuse-prevention.ts). Only 'sent' can ever be a genuine new acceptance --
 * 'already_sent' is claim_crc_result_send's own atomic idempotent-retry
 * signal and must never notify.
 *
 * `wasAlreadyAcceptedBeforeThisCall` must be computed by the caller from
 * the session's OWN productState.results_email_accepted_at, READ BEFORE
 * calling deliverCrcResultsEmail() -- that column is set once, on the
 * first accepted send, and never cleared afterward (unlike
 * results_email_status, which an email correction resets to 'pending'
 * regardless of prior acceptance history). A true value here means this
 * session already had a genuine first acceptance before this request, so
 * a 'sent' result is necessarily a later, legitimate resend -- per PM
 * clarification, not another CRC completion.
 */
export function shouldNotifyCrcResultsEmailCaptured(deliveryKind: string, wasAlreadyAcceptedBeforeThisCall: boolean, trafficType: string): boolean {
  return deliveryKind === 'sent' && !wasAlreadyAcceptedBeforeThisCall && trafficType !== 'internal_test'
}
