/**
 * CR-V2-1 — which sources a Creator Record v2 customer record may be built from.
 *
 * Only APPROVED GOVERNED sources are accepted. Anything else is refused before
 * any answer is read, with every reason found (never only the first):
 *   - pilot or prototype sources, or anything carrying a pilot marker;
 *   - a registry or ledger without an approved version (none is invented);
 *   - a registry that does not load, or approves no question;
 *   - question wording that is missing, or present for a question that is not
 *     approved, or an option without approved wording;
 *   - no approval for the source texts that have no approval of their own
 *     (question wording, option labels, acknowledgements, dependency labels,
 *     caveats): `SourceTextApproval`;
 *   - a current, eligible ledger entry that is incomplete, duplicated, stale,
 *     lapsed, for an unknown claim, or that names a caveat with no text.
 *
 * An explicitly approved, EMPTY ledger is accepted (a declarations-only record,
 * PRD OD-14). Whether that may launch is a PM decision, not this module's.
 *
 * Pure: no I/O and no clock (`as_of` is supplied).
 */

import type { PublicationLedgerEntry } from '../contract/publication-ledger'
import { loadQuestionRegistry, type QuestionRegistry } from '../contract/question-registry'
import { isApproved, isIsoDate, type GovernanceApproval } from '../contract/types'
import type { BuildDraftInput, CreatorRecordSources } from '../prototype/build-draft'

export type TopicClaims = BuildDraftInput['topicClaims']

/** Approval of the source texts that carry no approval of their own. */
export interface SourceTextApproval {
  version: string
  approval: GovernanceApproval
}

export const SOURCE_REFUSAL_CODES = [
  'not_governed_sources',
  'pilot_marker',
  'registry_version_missing',
  'ledger_version_missing',
  'registry_invalid',
  'no_approved_questions',
  'question_presentation_missing',
  'presentation_without_approved_question',
  'option_label_missing',
  'source_text_not_approved',
  'max_tools_invalid',
  'ledger_entry_incomplete',
  'ledger_entry_duplicate',
  'ledger_claim_unknown',
  'ledger_claim_reverified',
  'ledger_refresh_lapsed',
  'caveat_text_missing',
] as const
export type SourceRefusalCode = (typeof SOURCE_REFUSAL_CODES)[number]
export interface SourceRefusal {
  code: SourceRefusalCode
  /** The entry concerned (question, entry or field id), never free text. */
  ref: string | null
}

export interface ApprovedSources {
  registry: QuestionRegistry
  registry_version: string
  ledger_version: string
  source_text: { version: string; approver: string; decision_date: string; review_ref: string | null }
}

export type SourceCheck = { ok: true; approved: ApprovedSources } | { ok: false; refusals: SourceRefusal[] }

/** Any marker of pilot, prototype or unapproved material. */
const UNAPPROVED_MARKER = /pilot|prototype|unapproved|not a governance approval|not a creator record publication approval/i
const VERSION_UNAVAILABLE = /^\s*$|none approved|internal/i

const marked = (s: string | null | undefined) => typeof s === 'string' && UNAPPROVED_MARKER.test(s)
const approvalMarked = (a: GovernanceApproval | null | undefined) => !!a && (marked(a.approver) || marked(a.review_ref))
const has = (o: Readonly<Record<string, unknown>>, k: string) => Object.prototype.hasOwnProperty.call(o, k)

export function checkApprovedSources(sources: CreatorRecordSources, sourceText: SourceTextApproval | null, topicClaims: TopicClaims, asOf: string): SourceCheck {
  const refusals: SourceRefusal[] = []
  const refuse = (code: SourceRefusalCode, ref: string | null = null) => refusals.push({ code, ref })

  if (sources.kind !== 'governed') refuse('not_governed_sources')
  if (!isIsoDate(asOf)) throw new Error('as_of must be YYYY-MM-DD')

  // ── Versions: recorded only when they exist; never invented. ──
  const { registry: registryVersion, ledger: ledgerVersion } = sources.versions
  if (typeof registryVersion !== 'string' || VERSION_UNAVAILABLE.test(registryVersion)) refuse('registry_version_missing')
  else if (marked(registryVersion)) refuse('pilot_marker', 'versions.registry')
  if (typeof ledgerVersion !== 'string' || VERSION_UNAVAILABLE.test(ledgerVersion)) refuse('ledger_version_missing')
  else if (marked(ledgerVersion)) refuse('pilot_marker', 'versions.ledger')

  // ── Source texts without an approval of their own ──
  if (!sourceText || typeof sourceText.version !== 'string' || VERSION_UNAVAILABLE.test(sourceText.version) || !isApproved(sourceText.approval)) refuse('source_text_not_approved')
  else if (marked(sourceText.version) || approvalMarked(sourceText.approval)) refuse('pilot_marker', 'source_text')

  if (!Number.isInteger(sources.max_tools) || sources.max_tools < 1) refuse('max_tools_invalid')

  // ── Question Registry and Observation Map ──
  const loaded = loadQuestionRegistry(sources.registry_input)
  let registry: QuestionRegistry | null = null
  if (!loaded.ok) refuse('registry_invalid')
  else {
    registry = loaded.registry
    const questions = Array.from(registry.questions.values())
    for (const q of questions) if (approvalMarked(q.approval)) refuse('pilot_marker', q.q_id)
    for (const o of registry.observation_map) if (approvalMarked(o.approval)) refuse('pilot_marker', o.o_id)
    const approved = questions.filter((q) => isApproved(q.approval))
    if (approved.length === 0) refuse('no_approved_questions')
    for (const q of approved) {
      if (!has(sources.presentation, q.q_id)) {
        refuse('question_presentation_missing', q.q_id)
        continue
      }
      const p = sources.presentation[q.q_id]
      if (typeof p.text !== 'string' || p.text.trim() === '') refuse('question_presentation_missing', q.q_id)
      if (q.options !== 'free_text') for (const option of q.options) if (!has(p.option_labels, option) || String(p.option_labels[option]).trim() === '') refuse('option_label_missing', `${q.q_id}.${option}`)
    }
    const approvedIds = new Set(approved.map((q) => q.q_id))
    for (const id of Object.keys(sources.presentation)) if (!approvedIds.has(id)) refuse('presentation_without_approved_question', id)
  }

  // ── Publication ledger ──
  const claims = new Map(topicClaims.map((c) => [c.claim_id, c]))
  const current = sources.ledger.filter((e) => e.superseded_by === null)
  const perClaim = new Map<string, number>()
  for (const e of current) perClaim.set(e.claim_id, (perClaim.get(e.claim_id) ?? 0) + 1)
  for (const e of sources.ledger) if (marked(e.entry_id) || marked(e.approver)) refuse('pilot_marker', e.entry_id)
  for (const e of current) {
    if ((perClaim.get(e.claim_id) ?? 0) > 1) refuse('ledger_entry_duplicate', e.entry_id)
    if (e.creator_record_eligible !== 'Yes') continue
    if (!complete(e)) refuse('ledger_entry_incomplete', e.entry_id)
    else if ((e.refresh_by as string) < asOf) refuse('ledger_refresh_lapsed', e.entry_id)
    const claim = claims.get(e.claim_id)
    if (!claim) refuse('ledger_claim_unknown', e.entry_id)
    else if (claim.last_verified !== e.claim_last_verified) refuse('ledger_claim_reverified', e.entry_id)
    for (const id of e.required_caveats) if (!has(sources.caveats, id) || String(sources.caveats[id]).trim() === '') refuse('caveat_text_missing', `${e.entry_id}.${id}`)
  }

  if (refusals.length > 0 || !registry || !sourceText) return { ok: false, refusals }
  const a = sourceText.approval
  return {
    ok: true,
    approved: {
      registry,
      registry_version: registryVersion,
      ledger_version: ledgerVersion,
      source_text: { version: sourceText.version, approver: a.approver as string, decision_date: a.decision_date as string, review_ref: a.review_ref },
    },
  }
}

function complete(e: PublicationLedgerEntry): boolean {
  return (
    typeof e.approver === 'string' && e.approver.trim() !== '' &&
    isIsoDate(e.decision_date) &&
    typeof e.explanation === 'string' && e.explanation.trim() !== '' &&
    (e.applicability_policy === 'met_only' || e.applicability_policy === 'met_or_unresolved') &&
    isIsoDate(e.refresh_by) &&
    isIsoDate(e.claim_last_verified)
  )
}
