/**
 * Governed Candidate Representation -- CAND-STABILITYAI-COMMERCIAL-USE-001
 * (LK-TRIAL-10, 2026-09-09).
 *
 * MACHINE-CHECKABLE CANDIDATE REPRESENTATION ONLY. Not canonical governed
 * knowledge, not durably Adopted, not CRC-eligible, not authority over
 * proposition meaning -- per LK-14/LK-16's own accepted boundary (the same
 * boundary CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001.ts already establishes
 * precedent for), this artifact is the durable machine-checkable
 * representation associated with a proposition under human governance,
 * never a second proposition authority. Governance meaning remains entirely
 * owned by the FGR record this file represents and by the (not-yet-
 * performed) GOVERNED-CLAIMS.md recording of durable Adoption.
 *
 * Source governance record (verbatim proposition, evidence, and the human
 * ADOPT decision -- this file adds no new substantive judgment):
 *   06_Operations/institutional-knowledge/notebook/governance-reviews/
 *   FGR_017_CAND-STABILITYAI-COMMERCIAL-USE-001_2026-09-09.md
 *   (Human FGR decision: ADOPT, PM: JD, 2026-09-09)
 *
 * Architecture-fit note: unlike Synthesia's own CAND file (which was drafted
 * before LK-7 added `tool_scope`, and had to be corrected retroactively --
 * see FGR_009's second addendum, "ARCHITECTURE_BLOCKER... ", 2026-08-29),
 * this candidate is drafted directly against the current `TopicClaim`
 * schema: `provider_scope: null` (this is a tool, not a third-party asset
 * provider -- `provider_scope` is a closed `AssetProviderId[] | null` union
 * that structurally cannot represent Stability AI) and
 * `tool_scope: ['stability-ai']` (LK-7's generic tool-scope primitive,
 * already proven in production for Synthesia/Kling/Runway/Pika). No
 * candidate framework/loader/registry is introduced -- this is one file,
 * one candidate.
 *
 * Lifecycle: Candidate. crc_eligible: Pending. superseded_by: null --
 * required candidate-process state, never a substantive FGR conclusion.
 * Durable Adoption (Lifecycle: Adopted, a real named Adoption
 * Approver/Date recorded in GOVERNED-CLAIMS.md) has NOT occurred and is
 * explicitly out of scope for this milestone. CPR (CRC Publication Review)
 * has also NOT occurred -- this candidate is not CRC-active by any measure.
 *
 * ── FIELD-BY-FIELD SOURCE MAPPING ──────────────────────────────────────────
 * claim_id: 'CAND-STABILITYAI-COMMERCIAL-USE-001' -- DIRECT GOVERNANCE
 *   REPRESENTATION, the FGR package's own candidate heading. Kept in CAND-
 *   form, not renamed to CLAIM-...-v1 -- that rename happens only at
 *   Adoption, per established precedent (CAND-STOCK-EDITORIAL-001 ->
 *   CLAIM-STOCK-EDITORIAL-001-v1 only once Adopted).
 * topic: 'commercial_use' -- DIRECT GOVERNANCE REPRESENTATION, matches the
 *   claim's actual subject matter (a provider commercial-use license
 *   question), CONTROLLED-VOCABULARY MAPPING (already a GoalCategory
 *   member, no translation).
 * claim_character: 'established' -- DIRECT GOVERNANCE REPRESENTATION. The
 *   license terms are directly quoted from the current, live-linked
 *   primary source, not an inference.
 * jurisdiction: 'Global' -- the FGR package's own finding: the Community
 *   License Agreement's revenue-threshold and license-grant mechanics are
 *   not evidenced as jurisdiction-conditional -- a platform contractual
 *   restriction, not a legal-jurisdiction-scoped rule. 'Global' is the
 *   existing precedent value in this codebase for a jurisdiction-
 *   independent platform-contract claim (mirrors CAND-SYNTHESIA-STOCK-
 *   PAID-PROMOTION-001's own identical reasoning) -- MECHANICAL
 *   CANDIDATE-STATE VALUE representing an already-made governance
 *   characterization, not a new one.
 * lifecycle: 'Candidate' -- MECHANICAL CANDIDATE-STATE VALUE.
 * crc_eligible: 'Pending' -- MECHANICAL CANDIDATE-STATE VALUE, consistent
 *   with the FGR package's own empty CRC Approver/CRC Decision Date; no
 *   CPR has occurred.
 * crc_publication_scope: null, crc_candidate_statement: null -- the FGR
 *   package's own publication-scope and candidate-statement fields are
 *   both undrafted pending CPR. Represented faithfully as null rather than
 *   inventing new CRC-facing wording this file has no governance authority
 *   to author -- MECHANICAL CANDIDATE-STATE VALUE.
 * applicability_requirements: [] -- DIRECT GOVERNANCE REPRESENTATION, the
 *   FGR package's own explicit finding (Section 8): none of the three
 *   identified dependencies (revenue threshold, registration, product-vs-
 *   Core-Model scope) were converted into a structured applicability gate,
 *   consistent with the standing 2026-08-16 PM decision against inventing
 *   organization-revenue-shaped facts, and with the Gemini API precedent.
 * unresolved_project_dependencies -- DIRECT GOVERNANCE REPRESENTATION,
 *   copied from the FGR package's Section 8 finding.
 * provider_scope: null -- MECHANICAL CANDIDATE-STATE VALUE / CONTROLLED-
 *   VOCABULARY MAPPING. Not asset-provider-scoped -- nothing in this
 *   candidate concerns Getty/iStock/Shutterstock/Adobe Stock/Artlist; null
 *   is the valid "not narrowed" value, never invented.
 * tool_scope: ['stability-ai'] -- DIRECT GOVERNANCE REPRESENTATION (the
 *   whole candidate's Domain/Context is explicitly Stability-AI-Core-
 *   Models-specific), CONTROLLED-VOCABULARY MAPPING through the plain
 *   canonical tool-identifier string convention LK-7 establishes (no
 *   CanonicalToolId registry entry exists yet for Stability AI -- that is
 *   a separate, later, mechanical reachability step, explicitly deferred
 *   per CRC-PUBLICATION-POLICY Principle 7's own governance/reachability
 *   independence, and explicitly out of scope for this candidate-formation
 *   milestone).
 * last_verified: '2026-09-09' -- DIRECT GOVERNANCE REPRESENTATION, the FGR
 *   review's own primary-source re-verification date.
 * superseded_by: null -- MECHANICAL CANDIDATE-STATE VALUE, initial version,
 *   no prior version exists.
 */

import type { TopicClaim } from '@/lib/retrieval-engine/types'

export const CAND_STABILITYAI_COMMERCIAL_USE_001: TopicClaim = {
  claim_id: 'CAND-STABILITYAI-COMMERCIAL-USE-001',
  topic: 'commercial_use',
  claim_character: 'established',
  jurisdiction: 'Global',
  lifecycle: 'Candidate',
  crc_eligible: 'Pending',
  crc_publication_scope: null,
  crc_candidate_statement: null,
  applicability_requirements: [],
  unresolved_project_dependencies: [
    'stabilityai_organization_revenue_threshold_status',
    'stabilityai_commercial_registration_completed',
    'stabilityai_product_is_core_model_under_community_license',
  ],
  provider_scope: null,
  tool_scope: ['stability-ai'],
  last_verified: '2026-09-09',
  superseded_by: null,
}
