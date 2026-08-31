import type { TopicClaim } from '@/lib/retrieval-engine/types'

/**
 * Trial 4 (LK-70 through LK-73) Candidate.
 *
 * REVISION HISTORY: PM FGR REVISE decision (LK-73, following LK-72 human
 * review) removed the original draft's "Adobe provides intellectual-property
 * indemnification protection" clause entirely. Reason: no directly-read
 * source establishes that "Commercially safe" (Source B, Tier 2 product/help
 * term) is equivalent to, or entitles the reader to, "Indemnified Firefly
 * Output" (Source A, Tier 1 defined contractual term, section 1.10 + section
 * 10's materially conditioned, capped indemnification regime). Carrying the
 * Tier 2 phrase "IP indemnification protection" risked implying the Tier 1
 * contractual regime without evidence establishing that link. The
 * indemnification/contractual question is preserved as a SEPARATE,
 * UNRESOLVED, NOT-YET-RESEARCHED future claim family -- see "CONTRACTUAL
 * CLAIM FAMILY" below -- and is NOT part of this Candidate's statement.
 *
 * CANDIDATE STATEMENT (FGR-stage proposition wording, exact, as revised):
 *
 *   Adobe's official AI Studio help material ("AI Studio: Learn about
 *   credits and commercial use", helpx.adobe.com, last updated July 21,
 *   2026) states that content labeled "Commercially safe" in AI Studio is
 *   created using Adobe's generative AI Firefly model, trained on content
 *   Adobe has permission or rights to use, and that this content may be
 *   used in commercial projects. For content generated using a partner
 *   (third-party, non-Adobe) AI model in AI Studio, Adobe directs users to
 *   review that specific model's own terms of service before commercial
 *   use, and states that Adobe cannot verify the training data used to
 *   build a partner model or whether that model's output may contain
 *   third-party intellectual property.
 *
 * SCOPE NOTE -- this is deliberately narrower than LK-70's original
 * hypothesis. LK-70 framed this as parallel to the Getty/iStock/
 * Shutterstock/Pond5 "licensing an existing catalog Stock Asset" pattern.
 * Direct reading of Source A (Tier 1, Adobe Stock Product Specific Terms,
 * last updated 2026-01-16) at LK-72 shows that framing was materially
 * misframed: section 1.10 explicitly defines "Indemnified Firefly Output"
 * as Output generated via Eligible Firefly Features + an Export Event, and
 * explicitly EXCLUDES pre-existing Stock Assets labeled "Generated with AI"
 * or similar from that definition. "Commercially safe" (Source B, Tier 2)
 * is a label describing which AI MODEL was used in an active AI Studio
 * generation/editing session -- not a designation on browsable/licensable
 * catalog Stock Assets. This Candidate is scoped to the AI Studio
 * generation/editing workflow only.
 *
 * CONTRACTUAL CLAIM FAMILY -- preserved, not solved here. A separate future
 * claim may concern Adobe's contractual definition and conditional
 * indemnification of "Indemnified Firefly Output" (Source A section 1.10 +
 * section 10: 8 conditions/exclusions in 10.2, US$10,000 liability cap in
 * 10.3, sole/exclusive remedy in 10.4). That family remains unresolved
 * because it depends on incorporated documents not yet read: the Firefly
 * Product Description, the Adobe Generative AI Product Specific Terms, and
 * potentially the Adobe Generative AI User Guidelines (all referenced at
 * Source A section 9.6/1.8). Whether "Commercially safe" is legally
 * equivalent to "Indemnified Firefly Output" remains UNCONFIRMED -- no
 * sentence in either directly-read source states this equivalence. This
 * Candidate does not depend on that family's future resolution; it states
 * only what Source B itself says.
 *
 * Sources:
 *   - AFFIRMATIVE SUPPORT for the Candidate Statement above (Tier 2,
 *     Official platform help material, Class B human copy/paste capture,
 *     directly read in full): "AI Studio：了解點數和商業用途" ("AI Studio: Learn
 *     about credits and commercial use"), helpx.adobe.com, 上次更新時間
 *     2026年7月21日 (last updated July 21, 2026). Traditional Chinese
 *     (繁體中文) locale capture, supplied verbatim by PM 2026-08-31.
 *     Translation used for analysis; source-language text preserved in the
 *     FGR/CPR governance record. Every clause of the Candidate Statement
 *     traces directly to this source.
 *   - EVIDENCE LIMITATION / BOUNDARY source only, NOT affirmative support
 *     (Tier 1, Official legal/contractual authority, Class A -- PM-supplied
 *     original PDF, directly read in full): Adobe Stock Product Specific
 *     Terms, "Last updated January 16, 2026. Replaces all prior versions."
 *     Footer: Stock-Additional-Terms_en_US_20260116. Supplied 2026-08-31 as
 *     C:\Users\User\Downloads\Adobe1.pdf. This source does not use the
 *     phrase "Commercially safe" anywhere and does not support any clause
 *     of the Candidate Statement directly. Its role here is exclusively to
 *     bound the Candidate: it establishes (1) that a separate, differently-
 *     defined contractual concept ("Indemnified Firefly Output") exists
 *     with real conditions and a liability cap, (2) that this contractual
 *     concept is not shown to be equivalent to "Commercially safe", and (3)
 *     that Adobe's own Terms (section 12(C)) disclaim help/support material
 *     -- including, by its own terms, Source B -- as "provided as a
 *     courtesy only and do not constitute legal advice." This is why the
 *     Candidate Statement above is written as an attributed report of what
 *     Adobe's help material says, not as a legal or contractual conclusion.
 */
/**
 * DEPENDENCY NECESSITY (LK-73, reassessed from zero; rationale corrected at
 * LK-74 human FGR per PM instruction -- see below): unresolved_project_
 * dependencies is deliberately [].
 *
 * AUTHORITATIVE RATIONALE: the governed proposition is safely useful without
 * resolving project-specific model/label state because it presents the
 * Adobe/Firefly and partner-model branches CONDITIONALLY and does not select
 * either branch for the user's project. Bounded Interpretation does not
 * require a project-specific dependency merely for CRC to retrieve and
 * attributively communicate a governed proposition that already carries its
 * own conditionality. Generic principle (not specific to this claim):
 * dependency necessity follows Bounded Interpretation requirements, not
 * merely evidence availability.
 *
 * Two supporting, non-architectural points, kept explicitly subordinate to
 * the rationale above: no existing generic dependency represents this fact,
 * and a gating dependency would risk inviting the user to self-attest a
 * platform-displayed status that CRC should instead verify from evidence.
 *
 * NOT part of the rationale: whether the "Commercially safe" label is a
 * persistent, re-checkable asset attribute (like Editorial designation) or
 * only a session-time AI Studio UI element remains genuinely unestablished
 * by the evidence -- but this is an EVIDENCE OBSERVATION ONLY, not the
 * reason no dependency is required. Even if that persistence question were
 * later resolved in either direction, it would not by itself establish that
 * this governed proposition needs a dependency, because the proposition's
 * own conditional framing is what makes it safe to surface either way.
 *
 * If a future claim in the separate contractual family (see "CONTRACTUAL
 * CLAIM FAMILY" above) requires knowing the user's specific label/model
 * state to state a stronger, non-attributed conclusion, that claim would
 * need its own independent dependency analysis -- it does not retroactively
 * apply here.
 */
export const CAND_ADOBESTOCK_AI_STUDIO_COMMERCIALLY_SAFE_LABEL_001: TopicClaim = {
  claim_id: 'CAND-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001',
  topic: 'commercial_use',
  claim_character: 'established',
  jurisdiction: 'Global',
  lifecycle: 'Candidate', // MECHANICAL CANDIDATE-STATE VALUE -- frozen here even after FGR Adoption (LK-74). The authoritative Lifecycle field is GOVERNED-CLAIMS.md's own `Lifecycle: Adopted`, matching the Pond5/Storyblocks/Synthesia precedent's own convention of never rewriting this file's field after Adoption.
  crc_eligible: 'Pending',
  crc_publication_scope: null,
  crc_candidate_statement: null,
  applicability_requirements: [],
  unresolved_project_dependencies: [],
  provider_scope: ['adobe-stock'],
  tool_scope: null,
  last_verified: '2026-08-31',
  superseded_by: null,
}
