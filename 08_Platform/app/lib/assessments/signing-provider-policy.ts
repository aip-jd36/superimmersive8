/**
 * Signing provider policy (CA-RLK-2d — System-Test Signing Isolation).
 *
 * The single, server-owned decision of WHICH `ProvenanceProvider` a signing
 * run is allowed to use. Provider *selection* owns execution policy; provider
 * *implementation* owns provider behavior — the concrete providers
 * (`MockProvenanceProvider`, `NumbersProvenanceProvider`) know nothing about
 * `is_system_test`, and must not.
 *
 * ── CENTRAL INVARIANT ─────────────────────────────────────────────────────
 * An assessment with `is_system_test = true` MUST NEVER invoke a production
 * external provenance provider (Numbers Protocol), regardless of:
 *   - NUMBERS_API_KEY presence
 *   - client / UI state
 *   - operator action
 *   - environment misconfiguration
 *   - direct API calls / request input
 * The safety boundary is here, in server code — never the UI.
 *
 * ── FAIL CLOSED ───────────────────────────────────────────────────────────
 * `assessments.is_system_test` is `BOOLEAN NOT NULL DEFAULT false`
 * (migration 20260719000000), so a genuine assessment is always exactly
 * `false`. The production provider is therefore selected ONLY when the
 * assessment is affirmatively `=== false`. Any other value — `true`, or a
 * defensive `null` / `undefined` that should never occur — routes to the safe
 * non-production provider.
 *
 * ── SCOPE ─────────────────────────────────────────────────────────────────
 * This milestone isolates provider *execution* only. It does NOT change:
 * Numbers API field mapping, response parsing, idempotency, timeouts,
 * SIGNING recovery, mark-delivered semantics, or public Assessment Record
 * visibility for system-test records. Those remain separately tracked.
 */

import type { ProvenanceProvider } from '@/types/assessment'
import { MockProvenanceProvider } from './providers/mock'
import { NumbersProvenanceProvider } from './providers/numbers'

export interface SigningProviderPolicyInput {
  /**
   * `assessments.is_system_test` for the assessment being signed. Typed
   * `boolean` (the column is NOT NULL DEFAULT false); the implementation still
   * fails closed for any non-`false` runtime value.
   */
  isSystemTest: boolean
  /**
   * `process.env.NUMBERS_API_KEY`, passed in explicitly so this function stays
   * pure and unit-testable and never reads the environment itself.
   */
  numbersApiKey: string | undefined
}

export type SigningProviderKind = 'mock' | 'numbers'

export interface SigningProviderDecision {
  provider: ProvenanceProvider
  /** The concrete provider class actually selected. */
  kind: SigningProviderKind
  /**
   * True when the safe provider was forced *because* the assessment is a
   * system test (i.e. a production provider was available but withheld).
   * Purely informational — for logging / UI, never an authorization signal.
   */
  systemTestIsolated: boolean
}

/**
 * Decide which provenance provider a signing run may use.
 *
 * - `isSystemTest !== false`  → always `MockProvenanceProvider` (isolated).
 * - `isSystemTest === false`  → existing production policy:
 *     - `numbersApiKey` present → `NumbersProvenanceProvider`
 *     - otherwise               → `MockProvenanceProvider`
 */
export function selectSigningProvider(
  input: SigningProviderPolicyInput,
): SigningProviderDecision {
  // CA-RLK-2d isolation gate — fail closed. Only an assessment that is
  // affirmatively NOT a system test may reach a production external provider.
  if (input.isSystemTest !== false) {
    return {
      provider: new MockProvenanceProvider(),
      kind: 'mock',
      systemTestIsolated: true,
    }
  }

  // Real assessment — preserve the pre-CA-RLK-2d production provider policy
  // exactly (Numbers when the key is configured, mock otherwise).
  if (input.numbersApiKey) {
    return {
      provider: new NumbersProvenanceProvider(input.numbersApiKey),
      kind: 'numbers',
      systemTestIsolated: false,
    }
  }
  return {
    provider: new MockProvenanceProvider(),
    kind: 'mock',
    systemTestIsolated: false,
  }
}
