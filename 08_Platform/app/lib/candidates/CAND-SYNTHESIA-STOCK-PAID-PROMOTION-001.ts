/**
 * Governed Candidate Representation -- CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001
 * (LK-25, 2026-08-30).
 *
 * MACHINE-CHECKABLE CANDIDATE REPRESENTATION ONLY. Not canonical governed
 * knowledge, not durably Adopted, not CRC-eligible, not authority over
 * proposition meaning -- per LK-14/LK-16's own accepted boundary, this
 * artifact is the durable machine-checkable representation associated with
 * a proposition under human governance, never a second proposition
 * authority. Governance meaning remains entirely owned by the FGR record
 * this file represents and by the (not-yet-performed) GOVERNED-CLAIMS.md
 * recording of durable Adoption.
 *
 * Source governance record (verbatim proposition, evidence, and the human
 * ADOPT decision -- this file adds no new substantive judgment):
 *   06_Operations/institutional-knowledge/notebook/SYNTHESIA-SCENARIO-A-FGR-PACKAGE.md
 *   (Candidate A, "### CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001")
 *   06_Operations/institutional-knowledge/notebook/governance-reviews/
 *   FGR_009_SYNTHESIA_SCENARIO_A_PACKAGE_2026-08-29.md
 *   (Human FGR decision: ADOPT, PM: JD, 2026-08-29)
 *
 * Location note (LK-25): LK-14/LK-16 designed a candidate artifact colocated
 * with its FGR package in 06_Operations/institutional-knowledge/notebook/.
 * That location is outside 08_Platform/app/tsconfig.json's own `include`
 * scope (relative recursive TypeScript-file globs, resolved against this
 * tsconfig's own directory) and outside this project's @/ path-alias root -- a .ts file
 * there could not be type-checked or imported by
 * checkTopicClaimRepresentationReadiness() via any existing tooling. This
 * is a disclosed, purely mechanical deviation from LK-14/16's literal file
 * location, not a change to the design's own requirements (durable,
 * repository-relative, TopicClaim-typed, clearly marked as Candidate
 * representation, cross-referenced to its FGR package) -- all of which this
 * file satisfies from inside the buildable tree instead. No candidate
 * framework/loader/registry is introduced -- this is one file, one candidate.
 *
 * Lifecycle: Candidate. crc_eligible: Pending. superseded_by: null --
 * required candidate-process state (LK-25 SS 4), never a substantive FGR
 * conclusion. Durable Adoption (Lifecycle: Adopted, a real named Adoption
 * Approver/Date recorded in GOVERNED-CLAIMS.md) has NOT occurred and is
 * explicitly out of scope for this milestone.
 *
 * ── FIELD-BY-FIELD SOURCE MAPPING (LK-25 SS 3) ─────────────────────────────
 * claim_id: 'CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001' -- DIRECT GOVERNANCE
 *   REPRESENTATION, the package's own heading. Kept in CAND- form, not
 *   renamed to CLAIM-...-v1 -- that rename happens only at Adoption, per
 *   established precedent (CAND-STOCK-EDITORIAL-001 -> CLAIM-STOCK-
 *   EDITORIAL-001-v1 only once Adopted).
 * topic: 'commercial_use' -- DIRECT GOVERNANCE REPRESENTATION ("Topic:
 *   commercial_use"), CONTROLLED-VOCABULARY MAPPING (already a GoalCategory
 *   member, no translation).
 * claim_character: 'established' -- DIRECT GOVERNANCE REPRESENTATION
 *   ("Claim character: established"), CONTROLLED-VOCABULARY MAPPING.
 * jurisdiction: 'Global' -- the package's own Jurisdiction line states "Not
 *   evidenced as jurisdiction-conditional... a platform contractual
 *   restriction, not a legal-jurisdiction-scoped rule." 'Global' is the only
 *   existing precedent value in this codebase for a jurisdiction-independent
 *   claim -- MECHANICAL CANDIDATE-STATE VALUE representing an
 *   already-made governance characterization, not a new one. Flagged (LK-25
 *   report) as differing in KIND from GOVERNED-CLAIMS.md's own calibrated
 *   'Global' definition (cross-jurisdiction-verified statutory
 *   universality): this claim is jurisdiction-independent because it is a
 *   platform contract, not because it was checked against multiple legal
 *   systems -- worth an FGR reviewer's confirming glance before Adoption,
 *   not silently asserted as identical.
 * lifecycle: 'Candidate' -- MECHANICAL CANDIDATE-STATE VALUE (LK-25 SS 4).
 * crc_eligible: 'Pending' -- MECHANICAL CANDIDATE-STATE VALUE (LK-25 SS 4),
 *   consistent with the package's own empty CRC Approver/CRC Decision Date.
 * crc_publication_scope: null, crc_candidate_statement: null -- the
 *   package's own "CRC Publication Scope:" and "CRC Candidate Statement:"
 *   fields are both empty/undrafted. Represented faithfully as null rather
 *   than inventing new CRC-facing wording this file has no governance
 *   authority to author -- MECHANICAL CANDIDATE-STATE VALUE.
 * applicability_requirements: [] -- DIRECT GOVERNANCE REPRESENTATION, the
 *   package's own explicit "Applicability requirements: []" line. No formal
 *   gate was drafted; nothing in the source maps to the closed
 *   APPLICABILITY_FACTS vocabulary (jurisdiction / tool_plan_tier /
 *   tool_account_status) -- "was a Stock Avatar used," "was written consent
 *   obtained" are evidence/documentary questions, already correctly modeled
 *   as dependencies below, not applicability gates.
 * unresolved_project_dependencies -- DIRECT GOVERNANCE REPRESENTATION,
 *   copied verbatim from the package's own "Unresolved project
 *   dependencies:" line.
 * provider_scope: null -- MECHANICAL CANDIDATE-STATE VALUE / CONTROLLED-
 *   VOCABULARY MAPPING. Not asset-provider-scoped -- nothing in the package
 *   concerns Getty/iStock/Shutterstock/Adobe Stock/Artlist; null is the
 *   valid "not narrowed" value, never invented.
 * tool_scope: ['synthesia'] -- DIRECT GOVERNANCE REPRESENTATION (the whole
 *   package's Domain/Context is explicitly Synthesia-Stock-Avatar-specific),
 *   CONTROLLED-VOCABULARY MAPPING through the LK-24-registered canonical id.
 * last_verified: '2026-08-29' -- DIRECT GOVERNANCE REPRESENTATION, the
 *   package's own "Last reviewed: 2026-08-29" line.
 * superseded_by: null -- MECHANICAL CANDIDATE-STATE VALUE, matches the
 *   package's own "Version lineage: v1 (initial) -- supersedes: none --
 *   superseded by: none."
 */

import type { TopicClaim } from '@/lib/retrieval-engine/types'

export const CAND_SYNTHESIA_STOCK_PAID_PROMOTION_001: TopicClaim = {
  claim_id: 'CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001',
  topic: 'commercial_use',
  claim_character: 'established',
  jurisdiction: 'Global',
  lifecycle: 'Candidate',
  crc_eligible: 'Pending',
  crc_publication_scope: null,
  crc_candidate_statement: null,
  applicability_requirements: [],
  unresolved_project_dependencies: ['synthesia_stock_avatar_used_confirmed', 'synthesia_written_consent_obtained'],
  provider_scope: null,
  tool_scope: ['synthesia'],
  last_verified: '2026-08-29',
  superseded_by: null,
}
