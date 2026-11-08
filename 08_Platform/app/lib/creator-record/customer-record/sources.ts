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
 *   - source texts (question wording, option labels, acknowledgement wording,
 *     dependency labels, caveats) that are not exactly the content an
 *     `approved` Source Text Approval names for this record schema
 *     (`./source-text`, CR-V2-1A);
 *   - a current, eligible ledger entry that is incomplete, duplicated, stale,
 *     lapsed, for an unknown claim, or that names a caveat with no text;
 *   - anything that breaks the declaration integrity contracts
 *     (`declarationIntegrityRefusals`, CR-V2-DECL-1A);
 *   - a questionnaire that is not exactly the contract its approval names, or that
 *     has a field nobody has classified (`./questionnaire-contract`, CR-V2-DECL-1B-1);
 *   - a governed customer string (question wording, help, option labels, acknowledgements,
 *     caveats, dependency labels, eligible ledger explanations and evidence notes) that
 *     breaks the customer wording lock (`../contract/wording-lock`, CR-V2-SCHEMA8-PATH-1).
 *     A safety net only: it never replaces the human approval of that content.
 *
 * An explicitly approved, EMPTY ledger is accepted (a declarations-only record,
 * PRD OD-14). Whether that may launch is a PM decision, not this module's.
 *
 * Pure: no I/O and no clock (`as_of` is supplied).
 */

import type { PublicationLedgerEntry } from '../contract/publication-ledger'
import { declarationIntegrityRefusals, INTEGRITY_REFUSAL_CODES, loadQuestionRegistry, type QuestionRegistry } from '../contract/question-registry'
import { isApproved, isIsoDate, type GovernanceApproval } from '../contract/types'
import { violatesCustomerWordingLock, violatesDependencyLabelLock } from '../contract/wording-lock'
import type { BuildDraftInput, CreatorRecordSources } from '../prototype/build-draft'
import { checkQuestionnaireContract, QUESTIONNAIRE_CONTRACT_REFUSAL_CODES, questionnaireContract, type ApprovedQuestionnaireContract } from './questionnaire-contract'
import { checkSourceText, SOURCE_TEXT_REFUSAL_CODES, sourceTextContent, sourceTextDigest, type AcknowledgementText, type SourceTextApproval, type SourceTextContent } from './source-text'

export type TopicClaims = BuildDraftInput['topicClaims']

/** The approved wording supplied with a record: its approval, and the acknowledgement wording it covers. */
export interface SourceTextInput {
  approval: SourceTextApproval | null
  acknowledgements: AcknowledgementText
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
  ...SOURCE_TEXT_REFUSAL_CODES,
  'max_tools_invalid',
  'ledger_entry_incomplete',
  'ledger_entry_duplicate',
  'ledger_claim_unknown',
  'ledger_claim_reverified',
  'ledger_refresh_lapsed',
  'caveat_text_missing',
  // CR-V2-SCHEMA8-PATH-1 (E5): a governed customer string uses wording the customer wording lock forbids.
  'customer_wording_lock',
  ...INTEGRITY_REFUSAL_CODES,
  ...QUESTIONNAIRE_CONTRACT_REFUSAL_CODES,
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
  source_text: {
    source_id: string
    version: number
    content_sha256: string
    categories: string[]
    record_schema: { id: string; version: number }
    authority: string
    decision_date: string
    review_ref: string | null
  }
  /** The approved wording itself, exactly as approved. */
  source_text_content: SourceTextContent
  /** CR-V2-DECL-1B-2: the contract these sources are, as approved. The same object the form and the record are built from. */
  questionnaire_contract: ApprovedQuestionnaireContract
}

export type SourceCheck = { ok: true; approved: ApprovedSources } | { ok: false; refusals: SourceRefusal[] }

/** Any marker of pilot, prototype or unapproved material. */
const UNAPPROVED_MARKER = /pilot|prototype|unapproved|not a governance approval|not a creator record publication approval/i
const VERSION_UNAVAILABLE = /^\s*$|none approved|internal/i

const marked = (s: string | null | undefined) => typeof s === 'string' && UNAPPROVED_MARKER.test(s)
const approvalMarked = (a: GovernanceApproval | null | undefined) => !!a && (marked(a.approver) || marked(a.review_ref))
const has = (o: Readonly<Record<string, unknown>>, k: string) => Object.prototype.hasOwnProperty.call(o, k)

export function checkApprovedSources(sources: CreatorRecordSources, sourceText: SourceTextInput | null, topicClaims: TopicClaims, asOf: string, recordSchema: { id: string; version: number }): SourceCheck {
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
    for (const m of sources.registry_input.semantic_mappings ?? []) if (marked(m.review_ref)) refuse('pilot_marker', m.q_id)
    for (const r of declarationIntegrityRefusals(sources.registry_input, sources.presentation)) refuse(r.code, r.ref)
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

  // ── Wording: exactly the content an approved Source Text Approval names (CR-V2-1A) ──
  let text: ReturnType<typeof checkSourceText> | null = null
  let wording: string | null = null
  if (registry) {
    text = checkSourceText(sources, registry, sourceText?.acknowledgements ?? null, sourceText?.approval ?? null, recordSchema)
    if (!text.ok) for (const r of text.refusals) refuse(r.code, r.ref)
    // CR-V2-DECL-1B-1: the same `sources` validation and the builder then read, so what is approved is what runs.
    wording = sourceTextDigest(sourceTextContent(sources, registry, sourceText?.acknowledgements ?? {}))
    for (const r of checkQuestionnaireContract(sources, wording)) refuse(r.code, r.ref)
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

  // ── Customer wording lock (CR-V2-SCHEMA8-PATH-1, E5): every governed string a customer reads. A safety net only: it never
  //    approves anything, and each string still needs its own approval (above). The ref names the field, never the text. ──
  const lock = (text: unknown, ref: string, dependencyLabel = false) => {
    if (typeof text !== 'string') return
    if (violatesCustomerWordingLock(text) || (dependencyLabel && violatesDependencyLabelLock(text))) refuse('customer_wording_lock', ref)
  }
  for (const [id, p] of Object.entries(sources.presentation)) {
    lock(p.text, `presentation.${id}.text`)
    lock(p.help, `presentation.${id}.help`)
    for (const [option, label] of Object.entries(p.option_labels ?? {})) lock(label, `presentation.${id}.option_labels.${option}`)
  }
  for (const [id, text] of Object.entries(sourceText?.acknowledgements ?? {})) lock(text, `acknowledgements.${id}`)
  for (const [id, text] of Object.entries(sources.caveats)) lock(text, `caveats.${id}`)
  for (const [id, text] of Object.entries(sources.dependency_labels)) lock(text, `dependency_labels.${id}`, true)
  for (const e of current) {
    if (e.creator_record_eligible !== 'Yes') continue
    lock(e.explanation, `ledger.${e.entry_id}.explanation`)
    for (const [dep, note] of Object.entries(e.evidence_notes ?? {})) lock(note, `ledger.${e.entry_id}.evidence_notes.${dep}`)
  }

  if (refusals.length > 0 || !registry || !text || !text.ok || wording === null) return { ok: false, refusals }
  const a = text.approval
  // No refusal above means the contract built, and its approval is well formed and names it.
  const built = questionnaireContract(sources, wording)
  const contract = sources.questionnaire_approval
  if (!built.ok || !contract) return { ok: false, refusals: [{ code: 'questionnaire_contract_malformed', ref: null }] }
  return {
    ok: true,
    approved: {
      registry,
      registry_version: registryVersion,
      ledger_version: ledgerVersion,
      source_text: {
        source_id: a.source_id, version: a.version, content_sha256: text.digest, categories: [...a.categories].sort(),
        record_schema: { id: a.record_schema.id, version: a.record_schema.version }, authority: a.authority, decision_date: a.decision_date, review_ref: a.review_ref,
      },
      source_text_content: text.content,
      questionnaire_contract: {
        contract_id: contract.contract_id, contract_version: contract.contract_version, contract_sha256: built.sha256,
        authority: contract.authority, decision_date: contract.decision_date, review_ref: contract.review_ref, body: built.contract,
      },
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
