/**
 * Canonical Tool Identity Authority (Living Knowledge -- LK-9 design /
 * LK-10 bounded implementation, 2026-08-29).
 *
 * The first-class answer to "what tool entities does SI8 recognize, and what
 * stable identifier names each one" -- deliberately independent of, and
 * upstream from, every other tool-identity-adjacent concept in this
 * codebase:
 *
 *   THIS MODULE (identity)
 *     -> lib/interview-engine/extraction.ts (alias/extraction resolution)
 *     -> RetrievalHandoffTool.identifier (transport)
 *     -> TopicClaim.tool_scope / applicability_requirements[].tool /
 *        MatrixRow.identifier (scope/applicability/knowledge consumers)
 *
 * LK-8 found that KNOWN_TOOLS/KNOWN_AMBIGUOUS_TOOLS (extraction.ts) were
 * functioning as a DE FACTO identity authority purely because every
 * downstream consumer happened to trust their output strings, with no
 * shared type connecting them. LK-9 rejected formalizing that as the
 * permanent design (see LK-9 Final Report SS D/E): five of the ten Matrix
 * tool rows already carry real, PM-authored governed knowledge with ZERO
 * extraction alias coverage -- direct proof that canonical identity already
 * exists independently of, and prior to, alias coverage in this codebase.
 * Deriving "identity" from the alias table would have silently excluded
 * those five, and would have made a future extraction refactor able to
 * shrink the "authoritative" set with no governance signal.
 *
 * This module is the correction: identity lives on its own, in a neutral
 * peer module (not lib/interview-engine/, not types/interview-engine.ts,
 * despite AssetProviderId's own precedent living there -- LK-9 SS B/I
 * deliberately did not assume that precedent's location was mandatory).
 * It imports nothing -- not extraction, not retrieval, not the Matrix, not
 * Living Knowledge, not UI, not any governance document -- so every other
 * subsystem may depend on it and it can never be made to depend on them.
 *
 * MIGRATION BOOTSTRAP EVIDENCE ONLY (LK-10 SS 5): the initial population
 * below is the union of KNOWN_TOOLS' canonical values, KNOWN_AMBIGUOUS_TOOLS'
 * candidate identifiers, and MATRIX_FIXTURE's identifiers, as they stood on
 * 2026-08-29 -- reconciled to prove each entry already functions as a
 * canonical identity somewhere in this repository (see the LK-10 Final
 * Report SS F for the entry-by-entry evidence table). This bootstrap
 * reconciliation does NOT establish "anything in the Matrix is a canonical
 * tool" or "anything in extraction aliases is a canonical tool" as an
 * ongoing rule -- from this point forward, THIS array is the authority, and
 * a future addition to it is a deliberate registration decision, not an
 * automatic derivation from Matrix or extraction content.
 *
 * Deliberately minimal (LK-10 SS 6): only a stable identifier and
 * machine-enumerable membership. No Matrix-coverage field, no CRC-
 * eligibility field, no alias list, no claim references, no plan-tier/
 * account-status data, no source provenance, no marketing metadata --
 * those are alias concerns (extraction.ts) or knowledge-coverage concerns
 * (the Matrix / Living Knowledge), never identity concerns. Keeping this
 * list purely "does this tool entity exist" is what lets LK-9's SS D
 * finding (identity may exist with zero alias or zero Matrix coverage)
 * remain representable rather than re-conflated.
 *
 * Data-driven, not a hand-maintained closed union (LK-10 SS 4): the `as
 * const` array below is the sole authority; `CanonicalToolId` is a type
 * DERIVED from it, exactly mirroring AssetProviderId's own established
 * pattern (types/interview-engine.ts) -- adding an identity means editing
 * this array, never a parallel manually-maintained union.
 */

export const CANONICAL_TOOL_IDS = [
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
] as const

/**
 * 'synthesia' added 2026-08-29 (LK-24, Synthesia Canonical Tool Identity
 * Extension) -- pure generic registry extension, same mechanism as every
 * entry above, no new category. Repository evidence (evidence-captures/
 * synthesia/MANIFEST.md: all four captured sources -- Video Licensing,
 * Acceptable Use Policy, Customer Terms of Service, Terms & Policy Archives
 * -- attributed to one unified `Provider: Synthesia`) supports exactly one
 * canonical identity; no access-surface split analogous to gemini-api/
 * gemini-consumer-app is evidenced anywhere in the captured material.
 * Registration is independent of any Synthesia claim's own governance
 * status -- see SYNTHESIA-SCENARIO-A-FGR-PACKAGE.md, still
 * Lifecycle: Candidate, entirely unaffected by this registration -- and
 * does not itself make any Synthesia proposition extraction-reachable
 * (no KNOWN_TOOLS alias was added), Adopted, or CRC-eligible.
 */

export type CanonicalToolId = (typeof CANONICAL_TOOL_IDS)[number]

const CANONICAL_TOOL_ID_SET: ReadonlySet<string> = new Set(CANONICAL_TOOL_IDS)

/**
 * Membership check against the authority -- not a validator wired into any
 * authoring or CI path yet (that is explicitly deferred, LK-10 Hard
 * Boundaries: "No governance validator yet"). Exists now so this milestone's
 * own tests, and any future validator, have exactly one function to call
 * rather than re-deriving Set membership independently.
 */
export function isCanonicalToolIdentity(id: string): boolean {
  return CANONICAL_TOOL_ID_SET.has(id)
}
