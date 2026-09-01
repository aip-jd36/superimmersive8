/**
 * Canonicalization Readiness Gate (LK-94, 2026-09-01 -- implements the LK-93
 * governance decision, which itself resolved the LK-92 process-design
 * proposal following the Trial 5 / Luma production reachability finding).
 *
 * ── WHAT THIS PROVES ────────────────────────────────────────────────────
 *
 * Exactly one property: that the real, unmodified `normalizeCandidate`
 * canonicalization function resolves at least one representative,
 * authoritative expression for a canonical identity to that identity's own
 * canonical identifier. Nothing more.
 *
 * ── WHAT THIS DOES NOT PROVE (LK-93 §C's five-property model) ─────────────
 *
 * 1. CANONICAL REGISTRATION -- a precondition this module consumes
 *    (`CANONICAL_TOOL_IDS`/`ASSET_PROVIDER_IDS`), never establishes.
 * 2. CANONICALIZATION READINESS -- this is what this module proves.
 * 3. CONVERSATIONAL EXTRACTION COVERAGE -- whether a live model, given
 *    ordinary user language, would ever PROPOSE the tested expression as a
 *    candidate in the first place. This module never calls a model and
 *    never simulates extraction -- it only proves what happens to a string
 *    ALREADY handed to `normalizeCandidate`. Per LK-93 §F, this remains a
 *    disclosed limitation under current evidence (all four confirmed
 *    Storyblocks/Pond5/Adobe-Stock/Luma failures were canonicalization-table
 *    defects, not extraction-proposal defects) -- not a gate this module
 *    creates or enforces.
 * 4. GOVERNED KNOWLEDGE REACHABILITY -- whether Retrieval/BI/Composition
 *    behave correctly given a resolved identity. Covered separately by
 *    `synthetic-eligibility-canary.ts` and ordinary CPR review, never by
 *    this module.
 * 5. PRODUCTION DELIVERY -- actual deployed conversational behavior. Only
 *    production UAT establishes this.
 *
 * ── IDENTITY-LEVEL, NOT CLAIM-LEVEL (LK-94 human decision, §1.A) ───────────
 *
 * Canonicalization Readiness is a property of a CANONICAL IDENTITY (one
 * tool, one provider), never of an individual TopicClaim or MatrixRow. It is
 * deliberately NOT stored on `TopicClaim`, `MatrixRow`, `GOVERNED-CLAIMS.md`,
 * or `PLATFORM-RIGHTS-MATRIX.md` -- one canonical identity has exactly one
 * readiness determination, recorded exactly once, here. Storing it
 * per-claim/per-row would both duplicate the same fact across every claim
 * that happens to reference the same identity and conflate an
 * identity-level operational fact with Living Knowledge governance content.
 * This file has no import relationship with, and no influence over,
 * `lib/retrieval-engine/`, `lib/projection-layer/`, or
 * `lib/bounded-interpretation/` -- confirmed by
 * `__tests__/crc-engine/canonicalization-readiness.test.ts`'s own boundary
 * check, mirroring `subsystem-boundaries.test.ts`'s established pattern.
 *
 * ── WHY lib/crc-engine/, NOT lib/tool-identity/ ────────────────────────────
 *
 * `lib/tool-identity/registry.ts` documents itself as a deliberately
 * independent peer module, upstream of `lib/interview-engine/extraction.ts`
 * (which imports `CanonicalToolId` FROM registry.ts, never the reverse).
 * This module needs to call the real `normalizeCandidate` (Interview Engine
 * logic) -- adding that import to `lib/tool-identity/` would introduce a new,
 * unprecedented, backwards dependency. `lib/crc-engine/` is the established
 * home for exactly this shape of tool: `cross-domain-bleed-preflight.ts`
 * already lives here for the identical reason (it also needs real Interview
 * Engine + registry logic, and lives outside `lib/retrieval-engine/`
 * specifically because that subsystem is forbidden from importing Interview
 * Engine logic at all -- see `subsystem-boundaries.test.ts`).
 *
 * ── NO PARALLEL NORMALIZATION LOGIC ────────────────────────────────────────
 *
 * `checkCanonicalizationReadiness` below calls the real, unmodified,
 * production `normalizeCandidate` -- which already internally dispatches on
 * `CandidateObservation.kind` to handle BOTH `tool_mention` (via
 * `KNOWN_TOOLS`/`KNOWN_AMBIGUOUS_TOOLS`) and `asset_provider_mention` (via
 * `KNOWN_ASSET_PROVIDERS` + `findCorroboratingAssetProvider`) through the
 * SAME function. This module therefore needs no separate tool/provider
 * adapters -- one shared assurance concept, reusing the one real dispatcher,
 * per LK-93/LK-94's explicit "one shared assurance concept... unless the
 * existing implementation genuinely requires separate adapters" -- it does
 * not.
 *
 * ── GRANDFATHERING (LK-94 human decision, §1.B / §8) ───────────────────────
 *
 * `PRE_LK94_GRANDFATHERED_TOOL_IDS`/`PRE_LK94_GRANDFATHERED_PROVIDER_IDS`
 * are LITERAL, FROZEN snapshots of `CANONICAL_TOOL_IDS`/`ASSET_PROVIDER_IDS`
 * as they existed at this commit -- deliberately NOT derived live from
 * those arrays. Deriving them live would silently grandfather every future
 * identity too, at the exact moment enforcement is supposed to start
 * applying to it -- defeating the entire purpose of this gate. Any
 * identifier added to either registry after this commit that is not already
 * in one of these two frozen arrays MUST have a passing entry in
 * `NEW_IDENTITY_CANONICALIZATION_READINESS` below, or the enforcement test
 * fails. This makes the prospective boundary mechanical, not a matter of
 * checklist memory (LK-94 §9/§10). Existing identities are NOT edited,
 * aliased, or tested here solely to satisfy this gate -- per explicit human
 * instruction, this is not a remediation campaign.
 */

import type { CanonicalToolId } from '@/lib/tool-identity/registry'
import { CANONICAL_TOOL_IDS } from '@/lib/tool-identity/registry'
import type { AssetProviderId } from '@/types/interview-engine'
import { ASSET_PROVIDER_IDS } from '@/types/interview-engine'
import { normalizeCandidate, type CandidateObservation } from '@/lib/interview-engine/extraction'

export type CanonicalIdentityKind = 'tool' | 'provider'

export interface CanonicalizationReadinessCheck {
  kind: CanonicalIdentityKind
  identifier: string
  /**
   * One authoritative, representative ordinary-language expression for this
   * identity -- sourced from the identity's own canonical/governed name
   * (Matrix section header, GOVERNED-CLAIMS.md claim title, or equivalent
   * authoritative product name), per LK-93 §G. Never a guessed/speculative
   * surface form, never an enumeration of multiple phrasings -- exactly one
   * expression is required and sufficient; this check proves only the
   * tested expression, nothing broader.
   */
  representativeExpression: string
}

/**
 * Runs the tested expression through the real, unmodified `normalizeCandidate`
 * and reports whether it resolves to the claimed canonical identifier.
 * Fails closed (returns false) on any non-`resolved` normalization status,
 * including `known_ambiguous` -- an ambiguous resolution is not readiness.
 */
export function checkCanonicalizationReadiness(check: CanonicalizationReadinessCheck): boolean {
  const candidate: CandidateObservation =
    check.kind === 'tool'
      ? {
          proposal_id: 'canonicalization-readiness-probe',
          turn: 0,
          raw_text: check.representativeExpression,
          kind: 'tool_mention',
          raw_tool_name: check.representativeExpression,
        }
      : {
          proposal_id: 'canonicalization-readiness-probe',
          turn: 0,
          raw_text: check.representativeExpression,
          kind: 'asset_provider_mention',
          raw_provider_name: check.representativeExpression,
        }

  const result = normalizeCandidate(candidate)
  return result.status === 'resolved' && result.canonical_identifier === check.identifier
}

/** Frozen at LK-94 (2026-09-01) -- see this file's own header. Do not derive live. */
export const PRE_LK94_GRANDFATHERED_TOOL_IDS: readonly CanonicalToolId[] = [
  'runway-gen3',
  'kling',
  'elevenlabs',
  'gemini-api',
  'gemini-consumer-app',
  'pika',
  'midjourney',
  'google-veo',
  'adobe-firefly',
  'openai-sora',
  'synthesia',
  'luma',
] as const

/** Frozen at LK-94 (2026-09-01) -- see this file's own header. Do not derive live. */
export const PRE_LK94_GRANDFATHERED_PROVIDER_IDS: readonly AssetProviderId[] = [
  'getty',
  'istock',
  'shutterstock',
  'adobe-stock',
  'artlist',
  'storyblocks',
  'pond5',
] as const

/**
 * Readiness evidence for identities registered AFTER the LK-94 grandfather
 * cutover. Empty today -- no identity has been registered since this
 * milestone. Populate with one entry per new identity at registration time,
 * per LK-93 §E ("required before conversational runtime-ready status and
 * before production UAT is authorized"). This is the ONLY place new
 * readiness evidence is declared -- never on a TopicClaim, MatrixRow, or any
 * Living Knowledge governance document.
 */
export const NEW_IDENTITY_CANONICALIZATION_READINESS: readonly CanonicalizationReadinessCheck[] = [
  // 'suno' (LK-99/LK-100, Trial 6): the first identity registered after the
  // LK-94 grandfather cutover. LK-99's first-attempt check against this
  // exact representative expression FAILED (see PLATFORM-RIGHTS-MATRIX.md's
  // own "Suno" section and LK-99's own report for the preserved evidence);
  // LK-100 remediated the missing KNOWN_TOOLS entry and re-ran this same
  // check, which now genuinely passes. This entry records that passing
  // result -- it does not retroactively imply Suno was ever ready before
  // remediation.
  { kind: 'tool', identifier: 'suno', representativeExpression: 'Suno' },
]

/**
 * The enforcement primitive: given the CURRENT live registries, reports
 * every canonical identity that is neither pre-LK-94-grandfathered nor
 * covered by a `NEW_IDENTITY_CANONICALIZATION_READINESS` entry. A non-empty
 * result means a new identity was registered without satisfying this gate --
 * see `__tests__/crc-engine/canonicalization-readiness.test.ts` for the live
 * enforcement assertion. Pure, deterministic, no I/O.
 */
export function findIdentitiesMissingCanonicalizationReadiness(
  toolIds: readonly string[],
  providerIds: readonly string[],
): { kind: CanonicalIdentityKind; identifier: string }[] {
  const evidenceKeys = new Set(NEW_IDENTITY_CANONICALIZATION_READINESS.map((e) => `${e.kind}:${e.identifier}`))
  const grandfatheredKeys = new Set<string>([
    ...PRE_LK94_GRANDFATHERED_TOOL_IDS.map((id) => `tool:${id}`),
    ...PRE_LK94_GRANDFATHERED_PROVIDER_IDS.map((id) => `provider:${id}`),
  ])

  const missing: { kind: CanonicalIdentityKind; identifier: string }[] = []
  for (const id of toolIds) {
    const key = `tool:${id}`
    if (!grandfatheredKeys.has(key) && !evidenceKeys.has(key)) missing.push({ kind: 'tool', identifier: id })
  }
  for (const id of providerIds) {
    const key = `provider:${id}`
    if (!grandfatheredKeys.has(key) && !evidenceKeys.has(key)) missing.push({ kind: 'provider', identifier: id })
  }
  return missing
}

/**
 * Convenience re-export so callers/tests don't need to separately import
 * the live registries just to drive the enforcement check above.
 */
export const LIVE_CANONICAL_TOOL_IDS: readonly string[] = CANONICAL_TOOL_IDS
export const LIVE_ASSET_PROVIDER_IDS: readonly string[] = ASSET_PROVIDER_IDS
