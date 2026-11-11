/**
 * CRV2-IA-4B — CANDIDATE copyright-guidance package for Creator Record. NOT APPROVED. NOT ACTIVE.
 *
 * This module holds, in one reviewable place, everything the founder decision package (IA-3C, corrected by IA-3D/IA-3E)
 * proposes for the copyright expansion: the J1 question and presentation, its observation map entries, the objective-fact
 * authorizations, the five ledger entries, the customer explanations, caveats, the evidence note and the template lines.
 *
 * It is inert by construction:
 *   - every approval here is `pending` with no approver or decision date, and every ledger entry is
 *     `creator_record_eligible: 'Pending'` with no approver, so `isApproved` and `authorizePublication` refuse all of it;
 *   - neither authority bundle includes it, and no runtime module imports it (asserted in
 *     `__tests__/creator-record/ia4b-questionnaire-authorization.test.ts`);
 *   - the question registry still refuses the guidance-place target, so J1 cannot load even if someone wired it in.
 *
 * Activation (a later, separately approved slice) means: founder approvals of the items below; a questionnaire rules-version
 * bump with registry acceptance of the guidance-place target; new questionnaire contract, registry, Source Text and PDF
 * template versions with their approvals; activation of the copyright objectives; and the F7 day-of-approval checks (PACER for
 * Allen v. Perlmutter, the TIPO copyright bulletin board). Nothing here may be copied into a bundle without those approvals.
 */

import type { ObjectiveFactAuthorization } from '../contract/objective-fact-authorization'
import type { PublicationLedgerEntry } from '../contract/publication-ledger'
import type { ObservationMapEntry, QuestionEntry } from '../contract/question-registry'
import type { GovernanceApproval } from '../contract/types'
import type { CreatorRecordSources } from '../prototype/build-draft'

type QuestionPresentation = CreatorRecordSources['presentation'][string]

export const COPYRIGHT_CANDIDATE_ID = 'CRV2-IA-4B-COPYRIGHT-CANDIDATE'
export const COPYRIGHT_CANDIDATE_VERSION = 1

/** Pending: no approver, no decision date. Refused by `isApproved` everywhere. */
export const CANDIDATE_PENDING_APPROVAL: GovernanceApproval = Object.freeze({ status: 'pending', approver: null, decision_date: null, review_ref: 'CRV2-IA-3C/3D/3E (pending founder approval)' })

// ── J1 (IA-3C §2) ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const CANDIDATE_J1_QUESTION: QuestionEntry = Object.freeze({
  q_id: 'J1',
  version: 1,
  question_kind: 'factual_value',
  wording_ref: `${COPYRIGHT_CANDIDATE_ID}-WORDING-J1`,
  options: ['us', 'tw', 'none', 'not_sure'],
  display_condition: { kind: 'always' },
  approval: CANDIDATE_PENDING_APPROVAL,
}) as QuestionEntry

export const CANDIDATE_J1_PRESENTATION: QuestionPresentation = Object.freeze({
  q_id: 'J1',
  section: 'locations',
  input: 'multi',
  required: true,
  per_tool: false,
  allow_not_sure: false,
  text: 'Which places would you like general copyright guidance about?',
  help: 'Choosing a place only decides which general guidance appears in your record. It does not mean that place’s law applies to your video. SI8 does not decide which law applies.',
  option_labels: { none: 'None of these', not_sure: 'Not sure', tw: 'Taiwan', us: 'United States' },
  exclusive_options: ['none'],
}) as QuestionPresentation

/** One entry per place option; `none` and `not_sure` are record-only (never mapped). */
export const CANDIDATE_J1_OBSERVATION_MAP: readonly ObservationMapEntry[] = Object.freeze(
  ([['us', 'United States'], ['tw', 'Taiwan']] as const).map(([code, place]) => ({
    o_id: `${COPYRIGHT_CANDIDATE_ID}-O-J1-${code}`,
    version: 1,
    q_id: 'J1',
    q_version: 1,
    applies_to: { kind: 'option' as const, value: code },
    observation_kind: 'declared_value' as const,
    target: { kind: 'guidance_place' as const, place },
    value_mapping_version: `${COPYRIGHT_CANDIDATE_ID}-MAP-1`,
    approval: CANDIDATE_PENDING_APPROVAL,
  })) as unknown as ObservationMapEntry[],
)

/** Echo line in "What you told us" (IA-3C §2). */
export const CANDIDATE_J1_ECHO_LABEL = 'Places you asked for general copyright guidance about'

// ── Objective-fact authorizations (IA-3E §5): J1 v1 → jurisdiction, copyright objectives only ──────────────────────────
export const CANDIDATE_OBJECTIVE_FACT_AUTHORIZATIONS: readonly ObjectiveFactAuthorization[] = Object.freeze(
  (['copyright_ownership', 'copyrightability'] as const).map((topic) => ({
    authorization_id: `${COPYRIGHT_CANDIDATE_ID}-OFA-${topic}`,
    version: 1,
    objective_id: `creator-record:${topic}:v1`,
    fact: 'jurisdiction' as const,
    source: { q_id: 'J1', q_version: 1 },
    semantic_review_ref: 'CRV2-IA-3D §4.1 / CRV2-IA-3E §4 (J1 = request for general guidance about a place; never attachment)',
    approval: CANDIDATE_PENDING_APPROVAL,
  })),
)

// ── Customer wording (IA-3E §3, final corrected text) ─────────────────────────────────────────────────────────────────────
export const CANDIDATE_EXPLANATIONS: Readonly<Record<string, string>> = Object.freeze({
  'CLAIM-COPY-004-v1':
    'Whether an AI tool’s terms let you use its output commercially, and whether that output is protected by copyright and who owns it, are separate questions. A tool’s permission to use output commercially does not answer either one by itself.',
  'CLAIM-COPY-001-v1':
    'Under current United States copyright law, AI-generated video made without meaningful human creative contribution is generally not eligible for copyright protection. That is a separate question from whether you may use the video commercially.',
  'CLAIM-COPY-002-v1':
    'Under United States copyright law, writing prompts alone, even detailed or repeated ones, generally does not establish enough human authorship for copyright protection.',
  'CLAIM-COPY-003-v1':
    'Under United States copyright law, selecting, arranging or editing AI-generated material in a sufficiently creative way can be protected by copyright, even where the AI-generated material itself is not. Any such protection covers that human contribution, not the AI-generated material. Whether a particular project’s selection, arrangement or editing is enough is decided case by case.',
  'CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1':
    'Under Taiwan copyright law, AI-assisted output may be eligible for copyright protection where a person contributed genuine creative input and used AI as an assisting tool. Output generated entirely by AI, with no human creative input, is not eligible. Who owns the economic rights in a protected work is governed separately by Articles 11 (employment) and 12 (commissioned work) of Taiwan’s Copyright Act, and does not automatically follow from whether the work is protected. In a dispute, whether a specific work is protected is decided by the courts on its facts.',
})

export const CANDIDATE_CAVEATS: Readonly<Record<string, string>> = Object.freeze({
  'CR-CAV-COPYRIGHT-NOT-DETERMINED': 'This record does not say whether your video is protected by copyright, whether your contribution is enough, or who owns the copyright.',
  'CR-CAV-PLACE-SELECTED': 'This guidance appears because you chose this place. Choosing a place does not mean its law applies to your video, and SI8 has not decided which law applies.',
  'CR-CAV-LAW-DEVELOPING': 'The law and official guidance in this area are still developing and may change.',
})

export const CANDIDATE_EVIDENCE_NOTES: Readonly<Record<string, string>> = Object.freeze({
  human_contribution_description: 'You described your own contribution. SI8 has not assessed whether it is enough for copyright protection, and has not examined any document as evidence of it.',
})

/** Internal objective/topic labels for the record and PDF (not yet in any approved template set). */
export const CANDIDATE_TOPIC_LABELS: Readonly<Record<string, string>> = Object.freeze({
  copyright_ownership: 'Commercial use and copyright are separate questions',
  copyrightability: 'Copyright protection in the places you asked about',
})

/** Template lines for "What remains open" and "What this record does not conclude" (IA-3C §5, IA-3E §3). */
export const CANDIDATE_TEMPLATE_LINES = Object.freeze({
  open_contribution: 'Whether your own contribution is enough for copyright protection in the places you chose.',
  open_ownership: 'Who owns any copyright in the video, as between you and anyone you made it for.',
  not_concluded:
    'This record does not say that your video is protected by copyright, who owns it, that your contribution is sufficient, that any place’s law applies, or that the video is cleared for commercial use.',
})

// ── Ledger entries (IA-3E F7): drafts only, every one refused ─────────────────────────────────────────────────────────────
const LAST_VERIFIED: Readonly<Record<string, string>> = {
  'CLAIM-COPY-004-v1': '2026-08-16',
  'CLAIM-COPY-001-v1': '2026-08-16',
  'CLAIM-COPY-002-v1': '2026-08-16',
  'CLAIM-COPY-003-v1': '2026-08-16',
  'CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1': '2026-09-21',
}
const PLACE_SCOPED = new Set(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1'])

export const CANDIDATE_LEDGER_ENTRIES: readonly PublicationLedgerEntry[] = Object.freeze(
  Object.keys(CANDIDATE_EXPLANATIONS).map((claim_id) => ({
    entry_id: `${COPYRIGHT_CANDIDATE_ID}-LEDGER-${claim_id}`,
    version: 1,
    claim_id,
    claim_last_verified: LAST_VERIFIED[claim_id],
    creator_record_eligible: 'Pending' as const,
    explanation: CANDIDATE_EXPLANATIONS[claim_id],
    applicability_policy: PLACE_SCOPED.has(claim_id) ? ('requirements_met' as const) : ('met_only' as const),
    evidence_notes: PLACE_SCOPED.has(claim_id) ? { ...CANDIDATE_EVIDENCE_NOTES } : {},
    required_caveats: [
      'CR-CAV-COPYRIGHT-NOT-DETERMINED',
      ...(PLACE_SCOPED.has(claim_id) ? ['CR-CAV-PLACE-SELECTED', 'CR-CAV-LAW-DEVELOPING'] : []),
    ],
    approver: null,
    decision_date: null,
    refresh_by: null,
    superseded_by: null,
  })),
)
