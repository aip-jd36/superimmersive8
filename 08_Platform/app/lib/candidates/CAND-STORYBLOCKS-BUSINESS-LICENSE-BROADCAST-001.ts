/**
 * Governed Candidate Representation -- CAND-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001
 * (LK-49, 2026-08-30, Trial 2 Living Knowledge onboarding benchmark).
 *
 * MACHINE-CHECKABLE CANDIDATE REPRESENTATION ONLY. Not canonical governed
 * knowledge, not CRC-eligible, not authority over proposition meaning -- per
 * the LK-14/LK-16 boundary this session's Synthesia trial already
 * established, this artifact is the durable machine-checkable
 * representation associated with a proposition under human governance,
 * never a second proposition authority. Governance meaning is owned by the
 * human ADOPT decision recorded directly (LK-49, HUMAN_REVIEW_TURN #4) and
 * by the durable GOVERNED-CLAIMS.md entry this file's own commit will be
 * referenced from once Adoption is recorded.
 *
 * Source governance record: human-verified primary-evidence findings
 * (LK-49 Section 3), reviewed against the preserved, hashed evidence
 * artifacts captured in LK-48:
 *   06_Operations/institutional-knowledge/notebook/evidence-captures/
 *   storyblocks/MANIFEST.md
 *   -- individual-license_20260830T100514+0800_9c6ce786.pdf
 *      (Storyblocks Individual License Agreement; human-verified visible
 *      "Last updated: June 18, 2026"; PDF /Title metadata itself reads
 *      "Individual License - 2023" -- a distinct, disclosed fact, not
 *      collapsed with the visible in-document date -- see field-by-field
 *      mapping below)
 *   -- small-business-license_20260830T100534+0800_aff19658.pdf
 *      (Storyblocks Small Business License Agreement; human-verified
 *      visible "Last updated: October 20, 2025")
 *   -- license-comparison_20260830T100501+0800_17e0d6f2.pdf
 *      (Storyblocks License Comparison page; corroborating, distinguishes
 *      Individual/Small Business/Business scope)
 * The CLI's own PDF tooling could not extract or render these three files
 * (zero embedded text layer, no OCR/page-render capability in this
 * environment -- see LK-48's own MANIFEST.md disclosure); the findings
 * above are HUMAN-VERIFIED SOURCE FACTS, not CLI-extracted text, per LK-49
 * Section 2/3's own explicit instruction.
 *
 * This is the first real Candidate representation to exercise
 * `provider_scope` (not `tool_scope`) since the original Stock domain
 * build-out -- Storyblocks is a stock asset provider (footage/audio/images
 * incorporated into a production), structurally identical in kind to
 * Getty/iStock/Shutterstock/Adobe Stock/Artlist, not an AI generation tool.
 * `tool_scope` is correctly null.
 *
 * Lifecycle: Candidate. crc_eligible: Pending. superseded_by: null --
 * required candidate-process state, never a substantive FGR conclusion.
 * Durable Adoption (Lifecycle: Adopted, a real named Adoption Approver/Date
 * recorded in GOVERNED-CLAIMS.md) is recorded separately, in the same
 * milestone, referencing this file's own commit hash once known -- mirrors
 * the Synthesia Candidate A precedent (CAND-SYNTHESIA-STOCK-PAID-
 * PROMOTION-001.ts) exactly.
 *
 * -- FIELD-BY-FIELD SOURCE MAPPING --
 * claim_id: 'CAND-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001' -- DIRECT
 *   GOVERNANCE REPRESENTATION, mirrors the established CAND-<PROVIDER>-
 *   <SUBJECT>-NNN naming convention. Kept in CAND- form, not renamed to
 *   CLAIM-...-v1 -- that rename happens only at Adoption recording, per
 *   established precedent.
 * topic: 'commercial_use' -- DIRECT GOVERNANCE REPRESENTATION, CONTROLLED-
 *   VOCABULARY MAPPING (already a GoalCategory member).
 * claim_character: 'established' -- DIRECT GOVERNANCE REPRESENTATION: the
 *   human-verified findings describe a plainly stated, currently-in-force
 *   license-scope rule visible in both Agreements, not a conditional or
 *   unsettled proposition.
 * jurisdiction: 'Global' -- MECHANICAL CANDIDATE-STATE VALUE under the
 *   already-approved bounded transitional compatibility convention
 *   (GOVERNED-CLAIMS.md governance-discipline section, 2026-08-30): this is
 *   a platform-contractual license-scope restriction, not a legal-
 *   jurisdiction-scoped rule, and jurisdiction is not itself a dimension of
 *   the proposition. Not reinterpreted as worldwide legal validation. Any
 *   governing-law clause the Agreements may contain was not read (no
 *   content extraction occurred) and is not conflated with CRC assessment
 *   jurisdiction.
 * lifecycle: 'Candidate' -- MECHANICAL CANDIDATE-STATE VALUE.
 * crc_eligible: 'Pending' -- MECHANICAL CANDIDATE-STATE VALUE; this
 *   milestone performs Adoption only, explicitly not CRC Publication Review.
 * crc_publication_scope: null, crc_candidate_statement: null -- neither has
 *   been drafted or reviewed at Candidate stage; represented faithfully as
 *   null rather than inventing CRC-facing wording this file has no
 *   governance authority to author -- MECHANICAL CANDIDATE-STATE VALUE,
 *   mirrors CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001's own precedent exactly.
 * applicability_requirements: [] -- DIRECT GOVERNANCE REPRESENTATION. No
 *   formal gate was drafted; the license-tier fact this proposition depends
 *   on has no implemented `ApplicabilityFact` type to reference (only
 *   `jurisdiction`, `tool_plan_tier`, `tool_account_status` exist -- no
 *   analogous asset-provider-license-tier fact type exists in the current
 *   schema, confirmed during LK-47's own FGR analysis) -- correctly modeled
 *   as a dependency instead, never forced into an unsupported applicability
 *   gate.
 * unresolved_project_dependencies: ['storyblocks_license_tier_confirmed'] --
 *   DIRECT GOVERNANCE REPRESENTATION: CRC cannot structurally verify which
 *   Storyblocks license tier (Individual / Small Business / Business) a
 *   specific user holds, or whether their specific plan includes an
 *   explicit broadcast/TV/OTT grant beyond the tier default. Evidence-only
 *   by construction (absent from dependency-askability.ts's registry,
 *   defaulting to non-askable; no DAR performed or proposed).
 * provider_scope: ['storyblocks'] -- DIRECT GOVERNANCE REPRESENTATION,
 *   CONTROLLED-VOCABULARY MAPPING through the identity registered this same
 *   milestone (ASSET_PROVIDER_IDS, types/interview-engine.ts). Not
 *   extraction-reachable as of this registration -- no KNOWN_ASSET_PROVIDERS
 *   alias was added, deliberately (see that registration commit's own
 *   message).
 * tool_scope: null -- MECHANICAL CANDIDATE-STATE VALUE / CONTROLLED-
 *   VOCABULARY MAPPING. Storyblocks is a stock asset provider, not a
 *   generation tool -- never conflated with tool_scope's own, structurally
 *   independent mechanism.
 * last_verified: '2026-08-30' -- DIRECT GOVERNANCE REPRESENTATION, the date
 *   of the human-assisted evidence capture and review (LK-48/LK-49). The
 *   two underlying Agreements carry their own distinct visible dates
 *   (Individual: "Last updated: June 18, 2026"; Small Business: "Last
 *   updated: October 20, 2025") -- both preserved in the governed record's
 *   own evidence-limitations text, never collapsed into this one field.
 * superseded_by: null -- MECHANICAL CANDIDATE-STATE VALUE, first version.
 */

import type { TopicClaim } from '@/lib/retrieval-engine/types'

export const CAND_STORYBLOCKS_BUSINESS_LICENSE_BROADCAST_001: TopicClaim = {
  claim_id: 'CAND-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001',
  topic: 'commercial_use',
  claim_character: 'established',
  jurisdiction: 'Global',
  lifecycle: 'Candidate',
  crc_eligible: 'Pending',
  crc_publication_scope: null,
  crc_candidate_statement: null,
  applicability_requirements: [],
  unresolved_project_dependencies: ['storyblocks_license_tier_confirmed'],
  provider_scope: ['storyblocks'],
  tool_scope: null,
  last_verified: '2026-08-30',
  superseded_by: null,
}
