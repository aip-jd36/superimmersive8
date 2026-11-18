/**
 * CR-PUBLIC-1 — who may use Creator Record v2 (the customer flow): the one access policy.
 *
 * Two modes:
 *   - 'invitation' (the default, and Production today): a signed-in creator needs a row in
 *     `creator_record_v2_pilot_access` (`./pilot-access`);
 *   - 'public': any signed-in creator may use it (public self-service).
 *
 * The mode is a reviewed CODE constant, like the other Creator Record switches (`CREATOR_RECORD_V2_SUBMISSIONS`,
 * `CREATOR_RECORD_V2_ISSUANCE`): not an environment variable, a request parameter or anything a client can send. Changing it to
 * 'public' is a separately authorized Production release (see
 * `08_Platform/implementation/cr-public-1/CR-PUBLIC-1-ACTIVATION-CHECKLIST.md`). Any value other than exactly 'public' resolves to
 * 'invitation' (fail closed).
 *
 * This policy decides eligibility only. It never replaces or relaxes authentication (every route resolves the session user
 * first and answers 401 without one), ownership (each service re-checks the owner of every draft, document, version and
 * submission), payment verification (Stripe signature, ledger, amount and binding) or database access (service-role only).
 * Payment fulfilment, issuance and downloads never consulted the invitation and do not consult this policy.
 *
 * Enforcement: every production port binds `hasCreatorRecordAccess` (from `./pilot-access`) as its `hasPilotAccess`
 * dependency: `productionFlowDeps` and `productionPurchaseDeps` (`./production`), the evidence-intake deps
 * (`./evidence-production`) and the customer examination deps (`./examination-customer`). The /creator-record page uses
 * `productionFlowDeps`. Nothing else may decide access; `__tests__/creator-record-flow/access-policy.test.ts` checks this.
 */

export type CreatorRecordAccessMode = 'invitation' | 'public'

/** THE switch. 'public' since the founder-authorized public launch (CR-PUBLIC-LAUNCH, 2026-11-18). 'invitation' restores the
 * invitation-only gate (rollback). */
export const CREATOR_RECORD_V2_ACCESS: string = 'public'

/** Fail closed: exactly 'public' is public; anything else, including a missing or malformed value, is 'invitation'. */
export function resolveCreatorRecordAccessMode(raw: unknown): CreatorRecordAccessMode {
  return raw === 'public' ? 'public' : 'invitation'
}

export function creatorRecordAccessMode(): CreatorRecordAccessMode {
  return resolveCreatorRecordAccessMode(CREATOR_RECORD_V2_ACCESS)
}

/**
 * The eligibility check for a signed-in user. Public mode admits any non-empty user id (the caller has already authenticated
 * it); invitation mode asks the invitation list. A missing user id is never eligible.
 */
export function createCreatorRecordAccessCheck(
  mode: CreatorRecordAccessMode,
  isInvited: (userId: string) => Promise<boolean>,
): (userId: string) => Promise<boolean> {
  return async (userId: string) => {
    if (typeof userId !== 'string' || userId.length === 0) return false
    if (mode === 'public') return true
    return isInvited(userId)
  }
}
