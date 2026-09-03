/**
 * CRC <-> Assurance association -- authorization policy (CAH-3D.1).
 *
 * The seam between "the caller is authorized to act on this Assurance
 * submission" (submission ownership -- necessary) and "this specific CRC
 * work-product association action was permitted by a concrete, implemented
 * authorization capability" (this policy -- also necessary).
 *
 * ── The invariant (CAH-3D.1 §1) ──
 *
 * NO production association may be created unless the caller supplies a
 * concrete authorization basis whose capability has ACTUALLY been implemented
 * and enabled. CAH-3D / CAH-3D.1 implement ZERO real-world capabilities, so
 * `PRODUCTION_AUTHORIZATION_POLICY` authorizes NOTHING -- it delegates
 * verbatim to `CURRENTLY_ENABLED_AUTHORIZATION_BASES` (currently the empty
 * set). It contains no hardcoded allow, no `return true`, no env-var / NODE_ENV
 * branch.
 *
 * ── The test seam (CAH-3D.1 §8) ──
 *
 * `associateCrcSessionWithSubmission` takes an `AuthorizationPolicy` parameter
 * that DEFAULTS to `PRODUCTION_AUTHORIZATION_POLICY`. Unit tests that need to
 * exercise the persistence / ownership / completion / state-binding / audit /
 * duplicate / removal paths pass their OWN inline policy that authorizes a
 * real KNOWN basis. That test policy is constructed only inside `__tests__/`
 * and is structurally incapable of becoming a production authorization basis:
 *   - it is never exported from this directory;
 *   - production code has exactly one policy (`PRODUCTION_AUTHORIZATION_POLICY`)
 *     and the service's default is that one;
 *   - a structural test asserts no non-test file in lib/crc-assurance-handoff/
 *     constructs any other policy, and no app/ route imports the service.
 */

import { CURRENTLY_ENABLED_AUTHORIZATION_BASES } from './types'

export interface AuthorizationPolicy {
  /**
   * True iff a concrete, implemented authorization capability corresponding to
   * `basis` is currently enabled. `basis` is passed as a raw string -- the
   * policy is the authority on enablement, not on vocabulary.
   */
  isEnabled(basis: string): boolean
}

/**
 * Production policy: enables exactly what `CURRENTLY_ENABLED_AUTHORIZATION_BASES`
 * says is enabled -- today, nothing.
 */
export const PRODUCTION_AUTHORIZATION_POLICY: AuthorizationPolicy = {
  isEnabled(basis: string): boolean {
    return (CURRENTLY_ENABLED_AUTHORIZATION_BASES as ReadonlySet<string>).has(basis)
  },
}
