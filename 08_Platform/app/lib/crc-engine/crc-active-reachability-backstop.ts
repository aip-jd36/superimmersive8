/**
 * CRC-Active Extraction Reachability Backstop (CRC-Active Tool Extraction
 * Reachability Backstop + Gap Remediation milestone).
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────
 *
 * A production UAT failure for Midjourney (KNOWN_TOOLS had zero alias for a
 * registered, CRC-active canonical identity) traced to a recurring class:
 * canonical registration and extraction-alias coverage drift independently
 * (`lib/tool-identity/registry.ts`'s own documented decoupling). A dedicated
 * reachability audit re-derived this empirically across the FULL current
 * CRC-active estate and found two more live, unremediated instances (Pika,
 * Synthesia -- both fully unreachable) and one partial instance (Luma --
 * only one obscure exact phrase resolved, not the platform's ordinary
 * name). This module is the generic backstop for that failure class.
 *
 * ── RELATIONSHIP TO canonicalization-readiness.ts (LK-94) ───────────────
 *
 * LK-94's Canonicalization Readiness gate is deliberately FORWARD-ONLY: it
 * enforces readiness for identities registered after the 2026-09-01
 * cutover, and explicitly grandfathers every identity registered before
 * it -- including 'pika', 'midjourney', and 'synthesia' -- via
 * `PRE_LK94_GRANDFATHERED_TOOL_IDS`. LK-94's own header states pre-cutover
 * identities are "NOT edited, aliased, or tested here solely to satisfy
 * this gate -- per explicit human instruction, this is not a remediation
 * campaign." This module respects that decision: it does NOT modify LK-94's
 * forward-only semantics, its grandfather list, or its enforcement
 * primitive. It ADDS a separate, retroactive check that audits every
 * CURRENTLY CRC-active identity regardless of when it was registered --
 * closing exactly the gap LK-94 deliberately left open, without rewriting
 * LK-94's own history or intent.
 *
 * ── WHAT THIS PROVES ────────────────────────────────────────────────────
 *
 * Exactly the same one property LK-94's `checkCanonicalizationReadiness`
 * proves (reused verbatim, not reimplemented) -- that at least one
 * representative, authoritative expression for a CRC-active identity
 * resolves, via the real `normalizeCandidate`, to that identity's own
 * canonical identifier. It does NOT prove full conversational extraction
 * coverage, governed-knowledge Retrieval/BI/Composition correctness, or
 * production delivery -- LK-93 §C's five-property model applies here
 * identically to LK-94; see that file's own header for the full
 * distinction. Property 4 (governed knowledge reachability) is exercised
 * empirically in this milestone's own test suite via the real `retrieve()`
 * pipeline, not by this module.
 *
 * ── POPULATION DERIVATION ───────────────────────────────────────────────
 *
 * Derived directly from the authoritative runtime fixtures -- never a
 * hand-maintained duplicate list, so this can't silently drift from what's
 * actually governed:
 *   - Matrix-origin: every MATRIX_FIXTURE row with at least one claim
 *     `crc_eligible === 'Yes'`.
 *   - TopicClaim-origin: every TOPIC_CLAIMS_FIXTURE claim with
 *     `crc_eligible === 'Yes'` AND `lifecycle === 'Adopted'` AND a non-null,
 *     non-empty `tool_scope` (tool identity) or `provider_scope` (asset
 *     provider identity).
 *
 * EXEMPTION: a TopicClaim with `tool_scope === null` AND
 * `provider_scope === null` (a generic, non-tool-scoped claim -- e.g. the
 * CLAIM-COPY-* claims) carries no tool/provider identity to make reachable
 * and is correctly excluded from this population. This is not an invented
 * exemption mechanism -- it mirrors `tool_scope`/`provider_scope`'s own
 * existing null-means-"applies regardless of tool" semantics
 * (types.ts's own doc comments).
 *
 * ── REPRESENTATIVE EXPRESSIONS ──────────────────────────────────────────
 *
 * Per LK-93 §G (same discipline `NEW_IDENTITY_CANONICALIZATION_READINESS`
 * uses): exactly one authoritative, representative ordinary-language
 * expression per identity, sourced from the identity's own canonical/
 * governed name (PLATFORM-RIGHTS-MATRIX.md section header for Matrix-origin
 * identities; the claim's own platform name for TopicClaim-only identities
 * with no Matrix row, e.g. Synthesia). Never a guessed/speculative form.
 */

import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { checkCanonicalizationReadiness, type CanonicalIdentityKind } from './canonicalization-readiness'

/**
 * One representative expression per CRC-active identity currently known to
 * this backstop, sourced per this file's own header discipline. An identity
 * absent from this map is reported as `MISSING_REPRESENTATIVE_EXPRESSION`
 * by `auditCrcActiveReachability` below rather than silently skipped --
 * every CRC-active identity must have an explicit entry here, added at the
 * same time the identity's governing claim is published.
 */
const REPRESENTATIVE_EXPRESSIONS: Record<string, string> = {
  // Matrix-origin
  midjourney: 'Midjourney',
  elevenlabs: 'ElevenLabs',
  luma: 'Luma',
  suno: 'Suno',
  // 'gemini-api' added 2026-09-08 (Gemini API Extraction / Runtime
  // Reachability Remediation): the representative expression is "Gemini
  // API," matching PLATFORM-RIGHTS-MATRIX.md's own section-header name
  // for this identity ("Gemini API (Nano Banana image generation)"),
  // trimmed to the core product name per this file's own header
  // discipline (mirrors midjourney/luma/suno above, none of which use
  // their full parenthetical row title either).
  'gemini-api': 'Gemini API',
  // 'gemini-consumer-app' added 2026-09-09 (Gemini Consumer App Runtime
  // Identity / Reachability Remediation, LK-TRIAL-11): this row became a
  // CRC-active Matrix authority on 2026-09-09 (CPR APPROVE, crc_eligible
  // Pending -> Yes) but had no KNOWN_TOOLS coverage -- only the existing
  // "Nano Banana" + Consumer-App-context disambiguation resolved it. Same
  // reachability-gap class already fixed for gemini-api above. The
  // representative expression is "Gemini Consumer App," trimmed from this
  // identity's own PLATFORM-RIGHTS-MATRIX.md section-header name ("Gemini
  // Consumer App (Nano Banana image generation)"), exactly as 'gemini-api'
  // is trimmed from "Gemini API (Nano Banana image generation)". The
  // phrase unambiguously names the consumer surface -- it cannot be the
  // API ("Gemini API"/"Gemini Developer API"), Vertex AI ("Vertex AI"),
  // or Workspace ("Gemini for Workspace"). The KNOWN_TOOLS entry added in
  // the same milestone also covers the ordinary conversational forms
  // "Gemini app" / "the Gemini app".
  'gemini-consumer-app': 'Gemini Consumer App',
  // TopicClaim-origin
  kling: 'Kling',
  'runway-gen3': 'Runway',
  pika: 'Pika',
  synthesia: 'Synthesia',
  getty: 'Getty',
  istock: 'iStock',
  shutterstock: 'Shutterstock',
  'adobe-stock': 'Adobe Stock',
  artlist: 'Artlist',
  storyblocks: 'Storyblocks',
  pond5: 'Pond5',
  // 'stability-ai' added 2026-09-09 (Stability AI Runtime Identity /
  // Representation-Readiness Remediation, Trial 10): TopicClaim-origin,
  // matching Synthesia/Pika's own precedent (no Matrix row). Sourced from
  // the claim's own platform name, same as every other TopicClaim-origin
  // entry above.
  'stability-ai': 'Stability AI',
  // 'envato-elements' / 'epidemic-sound' added 2026-09-10 (Envato +
  // Epidemic Provider Registration / CPR-Readiness Remediation, then CRC
  // Publication via CPR_022): TopicClaim-origin, matching Artlist/
  // Storyblocks/Pond5's own precedent (no Matrix row). Sourced from each
  // claim's own governed product name.
  'envato-elements': 'Envato Elements',
  'epidemic-sound': 'Epidemic Sound',
  // 'google-veo' added 2026-09-10 (Google Veo CPR Concurrence / CRC
  // Activation, CPR_023, LK-TRIAL-12): Matrix-origin, matching Gemini
  // API/Gemini Consumer App's own precedent -- this entry documents the
  // authoritative representative expression per this file's own required-
  // at-publication-time convention. It deliberately does NOT itself add a
  // KNOWN_TOOLS extraction alias for "Veo"/"Google Veo"/"Flow" -- no such
  // alias exists yet, so this identity is correctly and loudly reported as
  // `reachable: false` (a detected-but-authorized gap, not a silent
  // MISSING-representative-expression gap) until a separate, later, purely
  // mechanical runtime-reachability milestone closes it. Sourced from this
  // row's own Matrix section header, "Google Veo."
  'google-veo': 'Google Veo',
}

export interface CrcActiveReachabilityResult {
  kind: CanonicalIdentityKind
  identifier: string
  representativeExpression: string | null
  reachable: boolean
}

/**
 * Derives the current CRC-active tool identifier set from MATRIX_FIXTURE
 * (any row with >=1 claim crc_eligible==='Yes') and TOPIC_CLAIMS_FIXTURE
 * (any claim crc_eligible==='Yes' && lifecycle==='Adopted' && tool_scope
 * non-null/non-empty). Pure, deterministic, no I/O.
 */
export function deriveCrcActiveToolIds(): string[] {
  const ids = new Set<string>()
  for (const row of MATRIX_FIXTURE) {
    if (row.claims.some((c) => c.crc_eligible === 'Yes')) ids.add(row.identifier)
  }
  for (const claim of TOPIC_CLAIMS_FIXTURE) {
    if (claim.crc_eligible === 'Yes' && claim.lifecycle === 'Adopted' && claim.tool_scope) {
      for (const t of claim.tool_scope) ids.add(t)
    }
  }
  return Array.from(ids).sort()
}

/**
 * Derives the current CRC-active asset-provider identifier set from
 * TOPIC_CLAIMS_FIXTURE (provider_scope is Matrix-native for tools; asset
 * providers are TopicClaim-only in this codebase today). Pure,
 * deterministic, no I/O.
 */
export function deriveCrcActiveProviderIds(): string[] {
  const ids = new Set<string>()
  for (const claim of TOPIC_CLAIMS_FIXTURE) {
    if (claim.crc_eligible === 'Yes' && claim.lifecycle === 'Adopted' && claim.provider_scope) {
      for (const p of claim.provider_scope) ids.add(p)
    }
  }
  return Array.from(ids).sort()
}

/**
 * The enforcement primitive: for every currently CRC-active tool/provider
 * identity, reports whether its representative expression resolves
 * canonically via the real, unmodified `normalizeCandidate` (through
 * `checkCanonicalizationReadiness`, reused verbatim from LK-94 -- not
 * reimplemented). A `reachable: false` result, or a null
 * `representativeExpression` (missing map entry), both indicate a real
 * backstop failure -- see `__tests__/crc-engine/crc-active-reachability-
 * backstop.test.ts` for the live enforcement assertion.
 */
export function auditCrcActiveReachability(): CrcActiveReachabilityResult[] {
  const results: CrcActiveReachabilityResult[] = []

  for (const id of deriveCrcActiveToolIds()) {
    const expr = REPRESENTATIVE_EXPRESSIONS[id] ?? null
    results.push({
      kind: 'tool',
      identifier: id,
      representativeExpression: expr,
      reachable: expr !== null && checkCanonicalizationReadiness({ kind: 'tool', identifier: id, representativeExpression: expr }),
    })
  }

  for (const id of deriveCrcActiveProviderIds()) {
    const expr = REPRESENTATIVE_EXPRESSIONS[id] ?? null
    results.push({
      kind: 'provider',
      identifier: id,
      representativeExpression: expr,
      reachable: expr !== null && checkCanonicalizationReadiness({ kind: 'provider', identifier: id, representativeExpression: expr }),
    })
  }

  return results
}

/** Convenience filter used by the enforcement test. */
export function findUnreachableCrcActiveIdentities(): CrcActiveReachabilityResult[] {
  return auditCrcActiveReachability().filter((r) => !r.reachable)
}
