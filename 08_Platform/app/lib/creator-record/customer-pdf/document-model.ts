/**
 * CR-V2-2B — the customer PDF document model: a pure projection of a VERIFIED
 * Creator Record v2 into eight sections of blocks. The PDF component
 * (`./CustomerRecordPDF.tsx`) only lays this model out.
 *
 * Inputs: the stored record (canonical text + digest), the issuance identity
 * (record id and date, assigned at issuance), and an approved template set.
 * Nothing else: no governance, no sources, no clock.
 *
 * Rules:
 *   - the record is verified first (`verifyCustomerRecord`), then read through an
 *     exact-key projection; unknown, missing or ill-typed fields refuse;
 *   - the templates must be exactly the approved set (`./templates`);
 *   - every block says where its text comes from: the record (verbatim), the
 *     issuance identity, or a template (with only counts and record values
 *     filled into its slots);
 *   - nothing is interpreted: codes are mapped to approved labels, answers and
 *     approved texts are printed verbatim, counts are counted, order is the
 *     record's own. An unknown conclusion, topic, fact or code refuses;
 *   - CR-V2-DOC-1: documents are printed as an inventory (fingerprint, type, size, the creator's own
 *     description) and always as not examined; any other document state refuses.
 *
 *   - CR-V2-MVP-M3A: schema 8 (examination-bearing) also renders, with one more section, `documents`: each document's inventory
 *     entry, its examination state, its observations verbatim with their basis and reading status, the creator's own closed-code
 *     responses, the examination's limitations and provenance. Observations are never declarations, never facts and never guidance
 *     inputs; they are printed apart from both. The record's derived comparisons are NOT printed (no consistency conclusion).
 *   - CR-V2-PDF-7: schema 7 (and, since M3A, 8) only. Issued PDFs are stored bytes and are never re-rendered, so narrowing this affects no historical
 *     artifact; schemas 5 and 6 are never commercially eligible. Each refuses here by name. Every
 *     answer must be what the record's own embedded contract allows. The PDF names the contract by id, version and a short
 *     reference; the full digest stays in the record, which the printed snapshot digest fixes. Approval text is never printed.
 *
 * Errors: `CustomerPdfRefusal` with a code, never a partial model.
 */

import { assessIntegrated, type IntegratedAssessment } from '../integrated-assessment/assess'
import { CREATOR_RECORD_CONCLUSIONS } from '../contract/compose'
import { isIsoDate } from '../contract/types'
import { CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, CUSTOMER_RECORD_SCHEMA_VERSION, declarationIncompatibilities, isUncertainValue, verifyCustomerRecord, type CustomerRecordV2 } from '../customer-record/record'
import { COMPARISON_FIELDS, CREATOR_RESPONSE_CODES } from '../customer-record/examination-section'
import { arr, fail, int, isPlainObject, nullable, obj, oneOf, opt, ProjectionRefusal, str, WITHHELD, type P } from '../record-core/projection'
import { CUSTOMER_SUPPRESSED_OBSERVATION_FIELDS, EVIDENCE_CATEGORIES, EVIDENCE_MEDIA_TYPES } from '../evidence-intake/vocabulary'
import { CONTENT_CLASSES, EXAMINATION_FAILURE_REASONS, EXAMINATION_LIMITATIONS, EXECUTOR_MODES, OBSERVATION_BASES, OBSERVATION_STATUSES, WORKFLOW_AUTHORIZATIONS } from '../examination/envelope'
import { LIVE_LIMITATIONS } from '../live-examination/envelope'
import { canonicalJson } from '../record-core/canonical'
import { checkTemplates, fill, type CustomerPdfSectionId, type CustomerPdfTemplates, type PdfTemplateApproval, type TemplateRefusalCode } from './templates'
import { buildReadinessSummary, readinessTemplatesFingerprint, ReadinessSummaryRefusal, type ReadinessSummary, type ReadinessSummaryTemplates } from '../readiness-summary/summary'
import { readinessRenderFingerprint, renderReadinessSummary, ReadinessRenderRefusal, type ReadinessRenderTemplates, type RenderedReadinessSummary } from '../readiness-summary/render'

export type TextOrigin = 'record' | 'issuance' | 'template'

export type Block =
  | { kind: 'heading' | 'subheading' | 'label' | 'paragraph' | 'bullet'; text: string; from: TextOrigin }
  | { kind: 'row'; label: string; label_from: TextOrigin; value: string; value_from: TextOrigin }

export interface CustomerDocumentSection {
  id: CustomerPdfSectionId
  blocks: Block[]
}

export interface CustomerDocumentModel {
  meta: { title: string; subject: string; creator: string; producer: string }
  marking: { stamp: string; record_id: string; footer: string; page_label: string }
  sections: CustomerDocumentSection[]
  identity: {
    record_id: string
    issued_on: string
    record_ref: string
    record_version: number
    snapshot_sha256: string
    /** The full identity, from the record. Only the short reference is printed. */
    questionnaire_contract: { id: string; version: number; sha256: string }
    templates: { id: string; version: number; fingerprint: string }
  }
}

export interface CustomerDocumentInput {
  canonical: string
  sha256: string
  issued: { record_id: string; issued_on: string }
  templates: unknown
  template_approval: PdfTemplateApproval | null
}

export class CustomerPdfRefusal extends Error {
  constructor(readonly code: string, readonly ref: string | null = null) {
    super(`creator_record_v2_pdf_refused: ${code}${ref ? `: ${ref}` : ''}`)
  }
}

/** CR-V2-ISSUER-DISPLAY-1: reading fields never printed to a customer (the shared list, `../evidence-intake/vocabulary`). */
const SUPPRESSED_OBSERVATION_FIELDS: ReadonlySet<string> = new Set(CUSTOMER_SUPPRESSED_OBSERVATION_FIELDS)

const ISSUED_RECORD_ID = /^CR-\d{4}-[0-9A-F]{8}$/

// ── The record, read through an exact-key projection (schema 7) ──

const answerValue = obj({ value: str, kind: oneOf(['option', 'free_text', 'not_sure'] as const), label: nullable(str) })
const answer = obj({ q_id: str, q_version: int, tool_index: nullable(int), question: str, answer_verbatim: str, values: arr(answerValue) })
const observation = obj({
  observation_id: str, source_kind: oneOf(['customer_declared'] as const), record_id: str, record_version: int,
  question: obj({ q_id: str, q_version: int }), instance: nullable(str), answer_verbatim: str, normalized_value: nullable(str),
  observation_kind: str, target: WITHHELD, map_entry: WITHHELD, captured_at: str, supersedes: nullable(str),
})
const requirement = obj({ fact: str, tool: opt(str), operator: str, value: str })
const basis = obj({ fact: str, tool: nullable(str), instance: nullable(str), observation_id: str, normalized_value: nullable(str) })
const declaration = obj({ observation_id: str, observation_kind: str, normalized_value: nullable(str), answer_verbatim: str, map_entry: WITHHELD })
const dependencyRow = obj({
  dependency_id: str, label: str, declarations: arr(declaration), evidence_note: nullable(str),
  evidence_requirement: oneOf(['not_defined_by_governance'] as const), treated_as: oneOf(['evidence_required'] as const),
  sufficiency: oneOf(['not_assessed'] as const), status: oneOf(['open'] as const),
})
const guidanceItem = obj({
  claim_id: str,
  conclusion: oneOf(CREATOR_RECORD_CONCLUSIONS),
  explanation: str,
  caveats: arr(obj({ caveat_id: str, text: str })),
  applicability: obj({ status: oneOf(['met', 'unresolved'] as const), material_unresolved: arr(requirement) }),
  declared_applicability_basis: arr(basis),
  dependency_rows: arr(dependencyRow),
  selection_basis: obj({ scopes: arr(obj({ scope: oneOf(['tool', 'asset_provider'] as const), matched_ids: arr(str), observation_ids: arr(str) })) }),
  provenance: obj({
    claim: obj({ claim_id: str, last_verified: str }),
    objective: obj({ objective_id: str, version: int, topic: str, origin: str }),
    // CR-V2-2H: read (not interpreted) to say accurately why an item is qualified.
    bounded_interpretation: obj({ goal_id: str, status: str, citation: oneOf(['supporting', 'unresolved_relevant'] as const) }),
    publication: obj({ entry_id: str, version: int, approver: str, decision_date: str, refresh_by: str }),
  }),
})
// ── CR-V2-MVP-M3A: an examination-bearing record (schema 8), read through the same kind of exact-key projection ──
// The envelope is read field by field, so a shape the renderer does not know (a live-model origin, a location, a new limitation)
// refuses instead of printing. `verifyCustomerRecord` has already re-verified every projection, its digest and its document.
const isNull: P<null> = (v, path) => (v === null ? null : fail(path, 'expected null'))
const isFalse: P<false> = (v, path) => (v === false ? false : fail(path, 'expected false'))
const observationSpec = obj({
  observation_id: str, field: str, qualifier: nullable(str), basis: oneOf(OBSERVATION_BASES), status: oneOf(OBSERVATION_STATUSES),
  value: nullable(str), excerpt: nullable(str), source: obj({ document_sha256: str, location: isNull }),
  verification: oneOf(['not_verified'] as const), origin: oneOf(['fixture_replay_recorded'] as const),
})
const envelopeSpec = obj({
  envelope: obj({ id: str, version: int }), examination_key: str, identity: oneOf(['deterministic_replay_key'] as const),
  document: obj({ document_id: str, sha256: str, media_type: oneOf(EVIDENCE_MEDIA_TYPES), byte_size: int }),
  content_class: oneOf(CONTENT_CLASSES), workflow_authorization: oneOf(WORKFLOW_AUTHORIZATIONS),
  profile: obj({ id: str, version: int, schema: str, prompt: str }),
  executor: obj({ mode: oneOf(EXECUTOR_MODES), replay_set: str, recording_sha256: str }),
  outcome: obj({ status: oneOf(['examined', 'could_not_examine'] as const), reason: nullable(oneOf(EXAMINATION_FAILURE_REASONS)) }),
  observations: arr(observationSpec),
  limitations: arr(oneOf(EXAMINATION_LIMITATIONS)),
  provenance: obj({ integrity: oneOf(['sha256_size_and_type_rechecked'] as const), replay_fixture_id: str, engine_attempts: int, model_calls: int, prompt_sent: isFalse }),
})
const projectionSpec = obj({
  projection: obj({ id: str, version: int }), run_id: str, envelope_sha256: str, execution_boundary: str,
  run_integrity: oneOf(['persisted_run_rechecked'] as const), verification: oneOf(['not_verified'] as const), envelope: envelopeSpec,
})
// CR-V2-MVP-M2A: a reading made by an AI model for a customer (projection version 2, envelope version 3). Only the `live_model` shape is
// read: a mocked reading, a failed attempt or any other origin refuses here.
const liveObservationSpec = obj({
  observation_id: str, field: str, qualifier: nullable(str), basis: oneOf(OBSERVATION_BASES), status: oneOf(OBSERVATION_STATUSES),
  value: nullable(str), excerpt: nullable(str), source: obj({ document_sha256: str, location: isNull }),
  verification: oneOf(['not_verified'] as const), origin: oneOf(['live_model_extracted'] as const),
})
const liveEnvelopeSpec = obj({
  envelope: obj({ id: str, version: int }), examination_key: str, identity: oneOf(['execution_key'] as const),
  execution_origin: oneOf(['live_model'] as const), executed_at: str,
  document: obj({ document_id: str, sha256: str, media_type: oneOf(EVIDENCE_MEDIA_TYPES), byte_size: int }),
  content_class: oneOf(['customer_document'] as const), workflow_authorization: oneOf(WORKFLOW_AUTHORIZATIONS),
  profile: obj({ id: str, version: int, schema: str, prompt: str }),
  executor: obj({ mode: oneOf(['live_model'] as const), provider: oneOf(['anthropic'] as const), model: str }),
  outcome: obj({ status: oneOf(['examined'] as const), reason: isNull }),
  observations: arr(liveObservationSpec),
  limitations: arr(oneOf(LIVE_LIMITATIONS)),
  provenance: obj({ integrity: oneOf(['sha256_size_and_type_rechecked'] as const), model_calls: int, prompt_sent: WITHHELD, input_tokens: WITHHELD, output_tokens: WITHHELD, provider_response_id: WITHHELD }),
})
const liveProjectionSpec = obj({
  projection: obj({ id: str, version: int }), run_id: str, envelope_sha256: str, execution_boundary: oneOf(['customer_live_examination'] as const),
  run_integrity: oneOf(['persisted_attempt_rechecked'] as const), verification: oneOf(['not_verified'] as const), envelope: liveEnvelopeSpec,
})
type ReplayProjectionView = ReturnType<typeof projectionSpec>
type LiveProjectionView = ReturnType<typeof liveProjectionSpec>
type ProjectionView = ReplayProjectionView | LiveProjectionView
const examinationOf: P<'not_examined' | ProjectionView> = (v, path) => {
  if (v === 'not_examined') return 'not_examined'
  const version = isPlainObject(v) && isPlainObject(v.projection) ? v.projection.version : null
  return version === 2 ? liveProjectionSpec(v, path) : projectionSpec(v, path)
}
const isLive = (p: ProjectionView): p is LiveProjectionView => p.envelope.envelope.version === 3
const responseTargetOf: P<{ kind: 'observation'; run_id: string; observation_id: string } | { kind: 'comparison'; tool_index: number; document_id: string; field: (typeof COMPARISON_FIELDS)[number] }> = (v, path) =>
  isPlainObject(v) && v.kind === 'observation'
    ? obj({ kind: oneOf(['observation'] as const), run_id: str, observation_id: str })(v, path)
    : obj({ kind: oneOf(['comparison'] as const), tool_index: int, document_id: str, field: oneOf(COMPARISON_FIELDS) })(v, path)
const documentFields = { document_id: str, sha256: str, media_type: oneOf(EVIDENCE_MEDIA_TYPES), byte_size: int, file_name: str, category: oneOf(EVIDENCE_CATEGORIES), tool_index: nullable(int) }

const commonFields = {
  schema: str,
  schema_version: int,
  status: oneOf(['prepared_not_issued'] as const),
  content: obj({ id: str, version: int, generated_text: oneOf(['none'] as const) }),
  builder: obj({ id: str, version: int }),
  record: obj({ record_ref: str, record_version: int, prepared_on: str, captured_at: str }),
  sources: obj({
    kind: oneOf(['governed'] as const),
    registry_version: str,
    ledger_version: str,
    source_text: obj({ source_id: str, version: int, content_sha256: str, categories: arr(str), record_schema: obj({ id: str, version: int }), authority: str, decision_date: str, review_ref: nullable(str) }),
    guidance_as_of: str,
    questions: WITHHELD,
    publications: arr(obj({ entry_id: str, version: int, claim_id: str, claim_last_verified: str, approver: str, decision_date: str, refresh_by: str })),
    authority_digests: WITHHELD,
    questionnaire_contract: obj({ contract_id: str, contract_version: int, contract_sha256: str, authority: WITHHELD, decision_date: WITHHELD, review_ref: WITHHELD, body: WITHHELD, wording: WITHHELD }),
  }),
  declarations: obj({ answers: arr(answer), observations: arr(observation), acknowledgements: arr(obj({ id: str, text: str })) }),
  guidance: obj({ items: arr(guidanceItem) }),
} as const
const recordSpec = obj({
  ...commonFields,
  documents: obj({ policy: oneOf(['inventory_only'] as const), items: arr(obj({ ...documentFields, examination: oneOf(['not_examined'] as const) })) }),
  comparison: obj({ policy: oneOf(['disabled'] as const) }),
})
/**
 * CR-V2-MVP-M3A: schema 8. The derived comparisons stay in the record (the snapshot digest covers them) but are not read: they are
 * labelled provisional descriptions ("appears consistent", "appears to conflict"), and this PDF states no consistency conclusion.
 * Whether a customer PDF may ever show them is a separate decision.
 */
const examinationRecordSpec = obj({
  ...commonFields,
  documents: obj({ policy: oneOf(['inventory_with_examination'] as const), items: arr(obj({ ...documentFields, examination: examinationOf })) }),
  comparison: obj({ policy: oneOf(['derived_per_version'] as const), method: WITHHELD, items: WITHHELD }),
  creator_responses: obj({
    policy: oneOf(['closed_codes_this_version_only'] as const),
    items: arr(obj({ target: responseTargetOf, code: oneOf(CREATOR_RESPONSE_CODES), responded_by: oneOf(['creator'] as const), given_in_version: int })),
  }),
})
type RecordView = Omit<ReturnType<typeof recordSpec>, 'documents' | 'comparison'> & {
  documents: { policy: 'inventory_only' | 'inventory_with_examination'; items: (ReturnType<typeof examinationRecordSpec>['documents']['items'][number])[] }
  creator_responses?: ReturnType<typeof examinationRecordSpec>['creator_responses']
}

export function buildCustomerDocument(input: CustomerDocumentInput): CustomerDocumentModel {
  // 1. The record first: nothing is read from a record that does not verify.
  const verified = verifyCustomerRecord(input.canonical, input.sha256)
  if (!verified.ok) throw new CustomerPdfRefusal('record_invalid', verified.reason)
  const version = verified.record.schema_version
  if (version !== CUSTOMER_RECORD_SCHEMA_VERSION && version !== CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION) throw new CustomerPdfRefusal('record_schema_unsupported', String(version))
  const examinationBearing = version === CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION
  let r: RecordView
  try {
    r = (examinationBearing ? examinationRecordSpec : recordSpec)(verified.record as unknown, 'record') as RecordView
  } catch (err) {
    if (err instanceof ProjectionRefusal) throw new CustomerPdfRefusal('record_unsupported', `${err.path}: ${err.reason}`)
    throw err
  }
  const incompatible = declarationIncompatibilities(verified.record)
  if (incompatible.length > 0) throw new CustomerPdfRefusal('declarations_incompatible', incompatible.join(', '))

  // 2. Issuance identity.
  const issued = input.issued
  if (!issued || typeof issued.record_id !== 'string' || !ISSUED_RECORD_ID.test(issued.record_id)) throw new CustomerPdfRefusal('issued_record_id_invalid')
  if (!isIsoDate(issued.issued_on) || issued.issued_on < r.record.prepared_on) throw new CustomerPdfRefusal('issued_on_invalid')

  // 3. Exactly the approved templates, for this record schema.
  const check = checkTemplates(input.templates, input.template_approval, { id: r.schema, version: r.schema_version })
  if (!check.ok) throw new CustomerPdfRefusal(`templates_${check.refusals[0].code}` as `templates_${TemplateRefusalCode}`, check.refusals.map((x) => (x.ref ? `${x.code}:${x.ref}` : x.code)).join(', '))
  const t = check.templates
  // CR-V2-MVP-M3A: a schema 8 record prints only through templates that carry the examination wording (approved with them).
  if (examinationBearing && !t.examination) throw new CustomerPdfRefusal('templates_examination_missing')
  // CR-V2-MVP-M2A: and a reading made by an AI model only through templates that carry its wording too.
  if (r.documents.items.some((d) => d.examination !== 'not_examined' && isLive(d.examination)) && !t.live_examination) throw new CustomerPdfRefusal('templates_live_examination_missing')

  // CR-SUM-PDF-B1 (Option R): only a template set that carries `readiness_summary` selects the consultative summary. Its
  // summary and render approvals are DERIVED from this template approval (already checked above, and binding the block through
  // the template fingerprint); they are never supplied or approved separately. A refusal stops the document: there is no
  // fallback to the legacy guidance and open-items presentation for a set that selects the summary.
  const readiness = t.readiness_summary ? readinessOf(input, t.readiness_summary, input.template_approval as PdfTemplateApproval) : null

  try {
    // CR-V2-MVP-INTEGRATION-2: assessed from the full verified record (the projected view omits declaration targets).
    const integrated = examinationBearing && t.integrated_assessment ? assessIntegrated(verified.record) : null
    return compose(r, issued, t, check.fingerprint, input.sha256, integrated, readiness)
  } catch (err) {
    if (err instanceof CustomerPdfRefusal) throw err
    // A template slot that does not match its values: the templates are unusable.
    throw new CustomerPdfRefusal('templates_unusable', err instanceof Error ? err.message : String(err))
  }
}

type ReadinessBlock = NonNullable<CustomerPdfTemplates['readiness_summary']>
interface Readiness { summary: ReadinessSummary; rendered: RenderedReadinessSummary; block: ReadinessBlock }

/** CR-SUM-PDF-B1: the bounded summary and its rendering, under approvals derived from the (already checked) template approval. */
function readinessOf(input: CustomerDocumentInput, block: ReadinessBlock, approval: PdfTemplateApproval): Readiness {
  const derived = (template_id: string, version: number, fingerprint: string) => ({ template_id, version, fingerprint, lifecycle: 'approved' as const, authority: approval.authority, decision_date: approval.decision_date })
  const summaryTemplates = block.summary as ReadinessSummaryTemplates
  const renderTemplates = block.render as ReadinessRenderTemplates
  try {
    const summary = buildReadinessSummary({ canonical: input.canonical, sha256: input.sha256, templates: summaryTemplates, approval: derived(summaryTemplates.template_id, summaryTemplates.version, readinessTemplatesFingerprint(summaryTemplates)) })
    const rendered = renderReadinessSummary(summary, renderTemplates, derived(renderTemplates.template_id, renderTemplates.version, readinessRenderFingerprint(renderTemplates)))
    return { summary, rendered, block }
  } catch (err) {
    if (err instanceof ReadinessSummaryRefusal) throw new CustomerPdfRefusal('readiness_summary_refused', err.ref ? `${err.code}: ${err.ref}` : err.code)
    if (err instanceof ReadinessRenderRefusal) throw new CustomerPdfRefusal('readiness_render_refused', err.ref ? `${err.code}: ${err.ref}` : err.code)
    throw err
  }
}

function compose(r: RecordView, issued: CustomerDocumentInput['issued'], t: CustomerPdfTemplates, fingerprint: string, sha256: string, integrated: IntegratedAssessment | null, readiness: Readiness | null = null): CustomerDocumentModel {
  const tpl = (text: string): Block => ({ kind: 'paragraph', text, from: 'template' })
  const heading = (text: string): Block => ({ kind: 'heading', text, from: 'template' })
  const row = (label: string, value: string, value_from: TextOrigin = 'record'): Block => ({ kind: 'row', label, label_from: 'template', value, value_from })
  const count = (p: { one: string; other: string }, n: number) => fill(n === 1 ? p.one : p.other, { n })
  const S = t.sections
  const examinationBearing = r.documents.policy === 'inventory_with_examination'

  // Answers: values printed verbatim with their approved labels; "Not sure" from the template when the record has no label for it.
  const valueBlocks = (a: RecordView['declarations']['answers'][number]): Block[] =>
    a.values.map((v) =>
      v.label !== null ? { kind: 'bullet', text: v.label, from: 'record' }
        : v.kind === 'not_sure' ? { kind: 'bullet', text: t.not_sure_label, from: 'template' }
          : { kind: 'bullet', text: v.value, from: 'record' },
    )
  const answerBlocks = (a: RecordView['declarations']['answers'][number]): Block[] => [{ kind: 'label', text: a.question, from: 'record' }, ...valueBlocks(a)]

  const single = r.declarations.answers.filter((a) => a.tool_index === null)
  for (const a of single) if (!Object.prototype.hasOwnProperty.call(t.question_sections, a.q_id)) throw new CustomerPdfRefusal('question_section_unmapped', a.q_id)
  const inSection = (s: 'project' | 'contribution') => single.filter((a) => t.question_sections[a.q_id] === s)
  const toolIndexes = Array.from(new Set(r.declarations.answers.filter((a) => a.tool_index !== null).map((a) => a.tool_index as number))).sort((x, y) => x - y)

  const observations = new Map(r.declarations.observations.map((o) => [o.observation_id, o]))
  const answerFor = (q_id: string, instance: string | null) => {
    const idx = instance === null ? null : Number(/^tool-(\d+)$/.exec(instance)?.[1] ?? NaN) - 1
    if (idx !== null && !Number.isInteger(idx)) throw new CustomerPdfRefusal('record_unsupported', `instance ${instance}`)
    const found = r.declarations.answers.find((a) => a.q_id === q_id && a.tool_index === idx)
    if (!found) throw new CustomerPdfRefusal('record_unsupported', `no answer for ${q_id}`)
    return found
  }

  // CR-V2-2C: every condition the record leaves open is listed in section 6, and the "open items" count is
  // the number of entries listed there (a mechanical display count, never an assessment):
  //   - each governed dependency row (status `open`, sufficiency `not_assessed`);
  //   - each fact not established, grouped by fact and tool code, with the guidance items it affects;
  //   - guidance whose conclusion is "applicability unresolved" but whose record lists no condition;
  //   - each question answered "Not sure".
  const items = r.guidance.items
  const indexOf = new Map(items.map((i, n) => [i, n + 1]))
  const ref = (i: RecordView['guidance']['items'][number]) => fill(S.open_items.item_ref, { index: indexOf.get(i)! })
  const factLabel = (fact: string) => {
    if (!Object.prototype.hasOwnProperty.call(t.fact_labels, fact)) throw new CustomerPdfRefusal('fact_unlabelled', fact)
    return t.fact_labels[fact]
  }
  const notSure = r.declarations.answers.filter((a) => a.values.some(isUncertainValue))
  const dependencyRows = items.flatMap((i) => i.dependency_rows.map((d) => ({ item: i, row: d })))
  const notEstablished = new Map<string, { fact: string; indexes: number[] }>()
  for (const i of items) {
    for (const q of i.applicability.material_unresolved) {
      const key = `${q.fact}\u0000${q.tool ?? ''}`
      const entry = notEstablished.get(key) ?? { fact: q.fact, indexes: [] }
      if (!entry.indexes.includes(indexOf.get(i)!)) entry.indexes.push(indexOf.get(i)!)
      notEstablished.set(key, entry)
    }
  }
  // CR-V2-2H/2I: why an unresolved item is unresolved, from the record alone (nothing is re-interpreted).
  // Bounded Interpretation's status is goal-level and is the ceiling for every item of that objective (ADR-002). An item
  // whose own applicability is met, with no dependency, cited as supporting under an unresolved objective, is qualified
  // only by that topic-level status. The record does not establish which inputs produced it (an input can be omitted from
  // the record after interpretation, and an unresolved applicability need not list a fact), so no other item is named:
  // the explanation is generic and topic-level. "Not listed" is said only where the item's own condition is genuinely
  // not represented: applicability unresolved with no material fact, or (defensively) no reason the record can show.
  type ItemView = RecordView['guidance']['items'][number]
  const topicLevel = (i: ItemView) =>
    i.conclusion === 'relevant_applicability_unresolved' &&
    i.applicability.status === 'met' &&
    i.dependency_rows.length === 0 &&
    i.provenance.bounded_interpretation.citation === 'supporting' &&
    i.provenance.bounded_interpretation.status === 'relevant_applicability_unresolved'
  const ownUnlisted = (i: ItemView) => i.applicability.status === 'unresolved' && i.applicability.material_unresolved.length === 0
  const shownReason = (i: ItemView) => i.applicability.material_unresolved.length > 0 || i.dependency_rows.length > 0 || topicLevel(i)
  const topicQualified = items.filter(topicLevel)
  const unspecified = items.filter((i) => i.conclusion === 'relevant_applicability_unresolved' && (ownUnlisted(i) || !shownReason(i)))
  const openCount = dependencyRows.length + notEstablished.size + topicQualified.length + unspecified.length + notSure.length

  // CR-V2-2E: the declarations a guidance item was selected on, exactly as the record cites them.
  const selectionObservations = (i: RecordView['guidance']['items'][number]) =>
    i.selection_basis.scopes.flatMap((sc) =>
      sc.observation_ids.map((id) => {
        const o = observations.get(id)
        if (!o) throw new CustomerPdfRefusal('record_unsupported', `selection observation ${id}`)
        return o
      }),
    )

  // Guidance subject: the approved topic label, with the declared tool block when every cited declaration
  // (applicability basis and selection basis) belongs to the same one.
  const subjectOf = (i: RecordView['guidance']['items'][number]): string => {
    const topic = i.provenance.objective.topic
    if (!Object.prototype.hasOwnProperty.call(t.topic_labels, topic)) throw new CustomerPdfRefusal('topic_unlabelled', topic)
    const instances = Array.from(new Set([...i.declared_applicability_basis.map((b) => b.instance), ...selectionObservations(i).map((o) => o.instance)]))
    const m = instances.length === 1 && instances[0] !== null ? /^tool-(\d+)$/.exec(instances[0]) : null
    return m ? fill(S.guidance.subject_with_tool, { topic: t.topic_labels[topic], n: Number(m[1]) }) : t.topic_labels[topic]
  }

  // CR-V2-DOC-1: one document's inventory entry, exactly as before (the examination row is added by the caller).
  const inventoryRows = (d: RecordView['documents']['items'][number], i: number): Block[] => [
    { kind: 'row', label: fill(t.documents.item_label, { n: i + 1 }), label_from: 'template', value: d.file_name, value_from: 'record' },
    { kind: 'row', label: t.documents.type, label_from: 'template', value: t.document_type_labels[d.media_type], value_from: 'template' },
    { kind: 'row', label: t.documents.category, label_from: 'template', value: t.document_category_labels[d.category], value_from: 'template' },
    ...(d.tool_index === null ? [] : [{ kind: 'row', label: t.documents.tool, label_from: 'template', value: fill(t.documents.tool_value, { n: d.tool_index + 1 }), value_from: 'template' } as Block]),
    { kind: 'row', label: t.documents.size, label_from: 'template', value: fill(t.documents.size_value, { bytes: d.byte_size }), value_from: 'template' },
    { kind: 'row', label: t.documents.fingerprint, label_from: 'template', value: d.sha256, value_from: 'record' },
  ]

  // CR-V2-MVP-M3A: what each document appears to show, printed apart from the declarations and from guidance. Every code is mapped
  // to an approved label (an unlabelled field, qualifier or classification refuses); values and excerpts are the examination's own,
  // verbatim. Every creator response is printed exactly once, under the document it concerns, or the record refuses.
  const documentsSection = (): CustomerDocumentSection => {
    const X = t.examination!
    const labelled = (labels: Record<string, string>, key: string, code: string): string => {
      if (!Object.prototype.hasOwnProperty.call(labels, key)) throw new CustomerPdfRefusal(code, key)
      return labels[key]
    }
    const responses = r.creator_responses?.items ?? []
    let printed = 0
    const blocks: Block[] = [heading(X.heading), ...X.intro.map(tpl)]
    if (r.documents.items.length === 0) blocks.push(tpl(S.open_items.documents_not_provided))
    r.documents.items.forEach((d, i) => {
      blocks.push({ kind: 'subheading', text: fill(X.document_heading, { n: i + 1 }), from: 'template' }, ...inventoryRows(d, i))
      const e = d.examination
      const comparisonResponses = responses.filter((x) => x.target.kind === 'comparison' && x.target.document_id === d.document_id)
      const responseRows = (list: typeof responses): Block[] =>
        list.map((x): Block => {
          printed += 1
          const label = x.target.kind === 'comparison' ? fill(X.comparison_response, { field: X.comparison_field_labels[x.target.field] }) : X.your_response
          return row(label, X.response_labels[x.code], 'template')
        })
      if (e === 'not_examined') {
        blocks.push(row(X.status, X.status_labels.not_examined, 'template'), ...responseRows(comparisonResponses))
        return
      }
      const env = e.envelope
      const live = isLive(e) ? t.live_examination! : null
      blocks.push(row(X.status, X.status_labels[env.outcome.status], 'template'))
      if (!isLive(e) && e.envelope.outcome.reason !== null) blocks.push(row(X.failure, X.failure_labels[e.envelope.outcome.reason], 'template'))
      blocks.push({ kind: 'label', text: X.observations_heading, from: 'template' })
      // CR-V2-ISSUER-DISPLAY-1: a reading's issuer is not printed. The v2 reading reports the model's own judgement of the issuer,
      // which IA-4D/S3-PUBLIC showed it cannot make reliably (a provider label or a letterhead is reported as the issuer), so no
      // label could describe it accurately. The stored reading is unchanged. A creator response aimed at it cannot be printed
      // where it belongs, so the record refuses (fail closed; checked before checkout, at issuance and before marking issued).
      for (const o of env.observations) {
        if (!SUPPRESSED_OBSERVATION_FIELDS.has(o.field)) continue
        if (responses.some((x) => x.target.kind === 'observation' && x.target.run_id === e.run_id && x.target.observation_id === o.observation_id)) {
          throw new CustomerPdfRefusal('response_targets_suppressed_observation', o.field)
        }
      }
      const shown = env.observations.filter((o) => !SUPPRESSED_OBSERVATION_FIELDS.has(o.field))
      if (shown.length === 0) blocks.push(tpl(X.no_observations))
      for (const o of shown) {
        const field = labelled(X.field_labels, o.field, 'observation_field_unlabelled')
        // A value is printed only where the examination reports it present; otherwise the reading status is printed instead.
        const value: [string, TextOrigin] = o.status !== 'present' || o.value === null
          ? [X.reading_labels[o.status], 'template']
          : o.basis === 'examiner_classification'
            ? [labelled(Object.prototype.hasOwnProperty.call(X.classification_labels, o.field) ? X.classification_labels[o.field] : {}, o.value, 'classification_unlabelled'), 'template']
            : [o.value, 'record']
        blocks.push({ kind: 'row', label: field, label_from: 'template', value: value[0], value_from: value[1] })
        if (o.qualifier !== null) blocks.push(row(X.qualifier, labelled(X.qualifier_labels, o.qualifier, 'observation_qualifier_unlabelled'), 'template'))
        blocks.push(row(X.basis, X.basis_labels[o.basis], 'template'))
        if (o.excerpt !== null) blocks.push(row(X.excerpt, o.excerpt))
        blocks.push(...responseRows(responses.filter((x) => x.target.kind === 'observation' && x.target.run_id === e.run_id && x.target.observation_id === o.observation_id)))
      }
      blocks.push(...responseRows(comparisonResponses))
      const limitationLabel = (l: string) => (isLive(e) ? live!.limitation_labels[l] : X.limitation_labels[l as (typeof EXAMINATION_LIMITATIONS)[number]])
      blocks.push({ kind: 'label', text: X.limitations_heading, from: 'template' }, ...env.limitations.map((l): Block => ({ kind: 'bullet', text: limitationLabel(l), from: 'template' })))
      blocks.push({ kind: 'label', text: X.provenance_heading, from: 'template' }, row(X.reference, e.envelope_sha256.slice(0, 12)))
      if (isLive(e)) {
        // A model reading names its provider, the exact model and when it was made. Tokens and the provider's response id stay in the record.
        blocks.push(
          row(X.method, live!.method, 'template'),
          row(live!.provider, live!.provider_labels[e.envelope.executor.provider], 'template'),
          row(live!.model, e.envelope.executor.model),
          row(live!.executed_at, e.envelope.executed_at),
          row(X.content, live!.content_labels[e.envelope.content_class], 'template'),
        )
      } else {
        blocks.push(row(X.method, X.method_labels[e.envelope.executor.mode], 'template'), row(X.content, X.content_labels[e.envelope.content_class], 'template'))
      }
      blocks.push(row(X.profile, fill(X.profile_value, { id: env.profile.id, version: env.profile.version }), 'template'))
    })
    if (printed !== responses.length) throw new CustomerPdfRefusal('record_unsupported', 'creator response without its document')
    if (r.documents.items.length > 0) blocks.push(tpl(t.documents.fingerprint_note))
    blocks.push(tpl(X.comparison_note))
    return { id: 'documents', blocks }
  }

  // CR-V2-MVP-INTEGRATION-2 (PRD MVP scope §9): the integrated assessment, inside each guidance item, only when the approved
  // templates carry its wording (the activation gate). Derived from this record alone; the conclusion printed above is the
  // record's own and nothing here changes it. Every code maps to an approved label; readings are printed verbatim with their
  // provenance and are never compared with the creator's answer.
  const IA = examinationBearing ? t.integrated_assessment : undefined
  const documentNumber = new Map(r.documents.items.map((d, n) => [d.document_id, n + 1]))
  const integratedBlocks = (i: ItemView): Block[] => {
    if (!IA || !integrated) return []
    const at = r.guidance.items.indexOf(i)
    const ia = integrated.items[at]
    if (!ia || ia.claim_id !== i.claim_id || ia.conclusion !== i.conclusion) throw new CustomerPdfRefusal('record_unsupported', `integrated assessment for ${i.claim_id}`)
    if (ia.requirements.length === 0) return []
    // The explanation's paragraphs (blank-line separated in the approved text) print as separate paragraphs, so the heading keeps
    // with the first one (CustomerRecordPDF `groupHeadings`). The text is unchanged.
    const blocks: Block[] = [{ kind: 'label', text: IA.heading, from: 'template' }, ...IA.intro.split('\n\n').map(tpl)]
    for (const q of ia.requirements) {
      blocks.push(
        q.requirement.kind === 'applicability'
          ? row(IA.requirement, factLabel(q.requirement.fact), 'template')
          : q.requirement.label !== null
            ? row(IA.requirement, q.requirement.label, 'record')
            : row(IA.requirement, IA.unlabelled_requirement, 'template'),
        row(IA.standing, IA.standing_labels[q.standing], 'template'),
        { kind: 'label', text: IA.you_told_us, from: 'template' },
        ...(q.declared.length > 0 ? q.declared.map((x): Block => ({ kind: 'bullet', text: x.answer_verbatim, from: 'record' })) : [{ kind: 'bullet', text: IA.nothing_told, from: 'template' } as Block]),
      )
      if (q.evidence !== 'documents_considered') {
        blocks.push(tpl(IA.evidence_labels[q.evidence]))
        continue
      }
      for (const d of q.documents) {
        const n = documentNumber.get(d.document_id)
        if (n === undefined) throw new CustomerPdfRefusal('record_unsupported', `integrated assessment document ${d.document_id}`)
        blocks.push(row(fill(IA.document, { n }), IA.status_labels[d.status], 'template'), row(IA.reason, IA.reason_labels[d.reason], 'template'))
        if (d.observed) {
          blocks.push(row(IA.appears_to_show, d.observed.value))
          if (d.observed.excerpt !== null) blocks.push(row(IA.excerpt, d.observed.excerpt))
        }
        for (const code of d.responses) blocks.push(row(IA.your_response, t.examination!.response_labels[code], 'template'))
      }
    }
    blocks.push(tpl(IA.not_compared), tpl(fill(IA.method, { version: integrated.method.version })))
    return blocks
  }

  const sections: CustomerDocumentSection[] = [
    {
      id: 'about',
      blocks: [
        heading(S.about.heading),
        ...S.about.intro.map(tpl),
        tpl(count(S.about.counts.answers, r.declarations.answers.length)),
        tpl(count(S.about.counts.guidance, r.guidance.items.length)),
        tpl(count(S.about.counts.open_items, openCount)),
      ],
    },
    { id: 'project', blocks: [heading(S.project.heading), tpl(S.project.intro), ...(inSection('project').length > 0 ? inSection('project').flatMap(answerBlocks) : [tpl(S.project.empty)])] },
    {
      id: 'tools',
      blocks: [
        heading(S.tools.heading),
        tpl(S.tools.intro),
        ...(toolIndexes.length > 0
          ? toolIndexes.flatMap((i) => [
              { kind: 'subheading', text: fill(S.tools.tool_heading, { n: i + 1 }), from: 'template' } as Block,
              ...r.declarations.answers.filter((a) => a.tool_index === i).flatMap(answerBlocks),
            ])
          : [tpl(S.tools.empty)]),
      ],
    },
    { id: 'contribution', blocks: [heading(S.contribution.heading), tpl(S.contribution.intro), ...(inSection('contribution').length > 0 ? inSection('contribution').flatMap(answerBlocks) : [tpl(S.contribution.empty)])] },
    ...(examinationBearing ? [documentsSection()] : []),
    {
      id: 'guidance',
      blocks: [
        heading(S.guidance.heading),
        tpl(S.guidance.intro),
        ...(r.guidance.items.length === 0
          ? [tpl(S.guidance.empty)]
          : r.guidance.items.flatMap((i): Block[] => [
              { kind: 'subheading', text: fill(S.guidance.item_heading, { index: indexOf.get(i)!, subject: subjectOf(i) }), from: 'template' },
              row(S.guidance.conclusion, t.conclusion_labels[i.conclusion], 'template'),
              { kind: 'paragraph', text: i.explanation, from: 'record' },
              { kind: 'paragraph', text: S.guidance.item_limitation, from: 'template' },
              ...(i.selection_basis.scopes.length > 0
                ? [
                    { kind: 'label', text: S.guidance.selected_because, from: 'template' } as Block,
                    ...selectionObservations(i).map((o): Block => {
                      const a = answerFor(o.question.q_id, o.instance)
                      return { kind: 'row', label: a.question, label_from: 'record', value: o.answer_verbatim, value_from: 'record' }
                    }),
                  ]
                : []),
              ...(i.declared_applicability_basis.length > 0
                ? [
                    { kind: 'label', text: S.guidance.on_what_you_told_us, from: 'template' } as Block,
                    ...i.declared_applicability_basis.map((b): Block => {
                      const o = observations.get(b.observation_id)
                      if (!o) throw new CustomerPdfRefusal('record_unsupported', `basis observation ${b.observation_id}`)
                      const a = answerFor(o.question.q_id, o.instance)
                      return { kind: 'row', label: a.question, label_from: 'record', value: o.answer_verbatim, value_from: 'record' }
                    }),
                  ]
                : []),
              ...(i.applicability.material_unresolved.length > 0
                ? [
                    { kind: 'label', text: S.guidance.depends_on, from: 'template' } as Block,
                    ...i.applicability.material_unresolved.map((q): Block => ({ kind: 'bullet', text: factLabel(q.fact), from: 'template' })),
                  ]
                : []),
              ...(topicQualified.includes(i) ? [{ kind: 'paragraph', text: S.guidance.topic_level, from: 'template' } as Block] : []),
              ...(unspecified.includes(i) ? [{ kind: 'paragraph', text: S.guidance.unspecified_condition, from: 'template' } as Block] : []),
              ...(i.caveats.length > 0 ? [{ kind: 'label', text: S.guidance.caveats, from: 'template' } as Block, ...i.caveats.map((c): Block => ({ kind: 'bullet', text: c.text, from: 'record' }))] : []),
              ...integratedBlocks(i),
            ])),
      ],
    },
    {
      id: 'open_items',
      blocks: [
        heading(S.open_items.heading),
        tpl(S.open_items.intro),
        ...(openCount === 0 ? [tpl(S.open_items.empty)] : []),
        ...dependencyRows.flatMap(({ item, row: d }): Block[] => [
          { kind: 'subheading', text: d.label, from: 'record' },
          row(S.open_items.for_guidance, ref(item), 'template'),
          { kind: 'label', text: S.open_items.what_you_told_us, from: 'template' },
          ...(d.declarations.length > 0 ? d.declarations.map((x): Block => ({ kind: 'bullet', text: x.answer_verbatim, from: 'record' })) : [{ kind: 'bullet', text: S.open_items.nothing_told, from: 'template' } as Block]),
          ...(d.evidence_note !== null ? [row(S.open_items.evidence_note, d.evidence_note)] : []),
          row(S.open_items.status, t.dependency_codes.status[d.status], 'template'),
          row(S.open_items.sufficiency, t.dependency_codes.sufficiency[d.sufficiency], 'template'),
        ]),
        ...(notEstablished.size > 0
          ? [
              { kind: 'subheading', text: S.open_items.not_established_heading, from: 'template' } as Block,
              ...Array.from(notEstablished.values()).map((e): Block => ({ kind: 'row', label: factLabel(e.fact), label_from: 'template', value: fill(S.open_items.affects, { items: e.indexes.join(', ') }), value_from: 'template' })),
            ]
          : []),
        ...(topicQualified.length > 0
          ? [{ kind: 'subheading', text: S.open_items.topic_qualified_heading, from: 'template' } as Block, ...topicQualified.map((i): Block => ({ kind: 'bullet', text: ref(i), from: 'template' }))]
          : []),
        ...(unspecified.length > 0 ? [{ kind: 'subheading', text: S.open_items.unspecified_heading, from: 'template' } as Block, ...unspecified.map((i): Block => ({ kind: 'bullet', text: ref(i), from: 'template' }))] : []),
        ...(notSure.length > 0 ? [{ kind: 'subheading', text: S.open_items.not_sure_heading, from: 'template' } as Block, ...notSure.map((a): Block => ({ kind: 'bullet', text: a.question, from: 'record' }))] : []),
        { kind: 'subheading', text: S.open_items.documents_heading, from: 'template' },
        ...(examinationBearing
          ? [tpl(t.examination!.open_items_pointer)]
          : r.documents.items.length === 0
            ? [tpl(S.open_items.documents_not_provided)]
            : [
                tpl(t.documents.intro),
                ...r.documents.items.flatMap((d, i): Block[] => [
                  ...inventoryRows(d, i),
                  { kind: 'row', label: t.documents.examination, label_from: 'template', value: t.documents.not_examined, value_from: 'template' },
                ]),
                tpl(t.documents.fingerprint_note),
              ]),
        { kind: 'subheading', text: S.open_items.limitations_heading, from: 'template' },
        ...S.open_items.limitations.map((l): Block => ({ kind: 'bullet', text: l, from: 'template' })),
      ],
    },
    { id: 'not_done', blocks: [heading(S.not_done.heading), ...S.not_done.lines.map((l): Block => ({ kind: 'bullet', text: l, from: 'template' }))] },
    {
      id: 'provenance',
      blocks: ((): Block[] => {
        const P = S.provenance
        const L = P.labels
        const st = r.sources.source_text
        return [
          heading(P.heading),
          { kind: 'subheading', text: P.acknowledgements_heading, from: 'template' },
          ...r.declarations.acknowledgements.map((a): Block => ({ kind: 'bullet', text: a.text, from: 'record' })),
          { kind: 'subheading', text: P.identity_heading, from: 'template' },
          row(L.record_id, issued.record_id, 'issuance'),
          row(L.issued_on, issued.issued_on, 'issuance'),
          row(L.prepared_ref, r.record.record_ref),
          row(L.record_version, String(r.record.record_version)),
          row(L.prepared_on, r.record.prepared_on),
          row(L.captured_at, r.record.captured_at),
          row(L.snapshot, sha256),
          { kind: 'subheading', text: P.sources_heading, from: 'template' },
          row(L.record_schema, r.schema),
          row(L.record_schema_version, String(r.schema_version)),
          row(L.builder, r.builder.id),
          row(L.builder_version, String(r.builder.version)),
          row(L.registry_version, r.sources.registry_version),
          row(L.ledger_version, r.sources.ledger_version),
          row(L.wording, st.source_id),
          row(L.wording_version, String(st.version)),
          row(L.wording_digest, st.content_sha256),
          row(L.questionnaire_contract, r.sources.questionnaire_contract.contract_id),
          row(L.questionnaire_contract_version, String(r.sources.questionnaire_contract.contract_version)),
          row(L.questionnaire_contract_ref, r.sources.questionnaire_contract.contract_sha256.slice(0, 12)),
          row(L.templates, t.template_id, 'template'),
          row(L.templates_version, String(t.version), 'template'),
          row(L.templates_fingerprint, fingerprint, 'template'),
          ...(r.sources.publications.length > 0 ? [{ kind: 'subheading', text: P.publications_heading, from: 'template' } as Block] : []),
          // CR-V2-2H: each publication by the guidance item it supports; no internal ledger id is printed.
          // CR-V2-MVP-M1: no date is printed. `refresh_by` is a future re-check date, not a historical review
          // date, and no authoritative "last reviewed" date is defined yet (PM direction 9); it stays in the record.
          ...r.sources.publications.flatMap((p): Block[] => {
            const item = items.find((i) => i.claim_id === p.claim_id)
            if (!item) throw new CustomerPdfRefusal('record_unsupported', 'publication without its guidance item')
            // CR-SUM-PDF-B1 (Option R): the summary replaces the "Item n" numbering, so a publication is referenced by its
            // consideration number instead (one numbering scheme across the document). Without the block: unchanged.
            if (readiness) {
              const c = readiness.summary.groups.flatMap((g) => g.considerations).find((x) => x.claim_id === p.claim_id)
              if (!c) throw new CustomerPdfRefusal('readiness_render_refused', 'publication without its consideration')
              const label = (readiness.block.render as ReadinessRenderTemplates).consideration_ref_label
              return [row(label, String(c.index), 'template'), row(L.publication_version, String(p.version))]
            }
            return [{ kind: 'label', text: ref(item), from: 'template' }, row(L.publication_version, String(p.version))]
          }),
        ]
      })(),
    },
  ]

  // CR-SUM-PDF-B1 (Option R). Without the block, `sections` is returned exactly as composed above. With it, `guidance` and
  // `open_items` are REPLACED (never kept alongside) by the consultative summary and by `record_limitations`.
  const finalSections = readiness ? replaceWithReadiness(sections) : sections

  function replaceWithReadiness(legacy: CustomerDocumentSection[]): CustomerDocumentSection[] {
    const { summary, rendered, block } = readiness!
    const templateStrings = new Set<string>()
    const collectStrings = (v: unknown) => { if (typeof v === 'string') templateStrings.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(collectStrings) }
    collectStrings(block)
    const origin = (text: string, source: 'summary' | 'render' | 'mechanical'): TextOrigin => (source === 'summary' && !templateStrings.has(text) ? 'record' : 'template')
    const itemOf = new Map(summary.groups.flatMap((g) => g.considerations).map((c) => [c.index, items.find((i) => i.claim_id === c.claim_id)!]))
    const out: Block[] = []
    rendered.blocks.forEach((b, k) => {
      if (b.kind === 'row') out.push({ kind: 'row', label: b.label, label_from: origin(b.label, b.label_source), value: b.value, value_from: origin(b.value, b.value_source) })
      else out.push({ kind: b.kind, text: b.text, from: origin(b.text, b.source) })
      // The approved integrated assessment (schema 8) stays inside its own guidance item: after that consideration's last block.
      const next = rendered.blocks[k + 1]
      if (b.section === 'guidance' && b.consideration !== undefined && !(next && next.section === 'guidance' && next.consideration === b.consideration)) {
        const item = itemOf.get(b.consideration)
        if (!item) throw new CustomerPdfRefusal('readiness_render_refused', `consideration ${b.consideration}`)
        out.push(...integratedBlocks(item))
      }
    })
    // Record-level content the replaced open-items section carried: a schema 7 record's document inventory (a schema 8 record
    // keeps its own documents section) and the record's limitations, both exactly as the open-items section prints them.
    const limitations: Block[] = [
      ...(examinationBearing
        ? []
        : [
            { kind: 'subheading', text: S.open_items.documents_heading, from: 'template' } as Block,
            ...(r.documents.items.length === 0
              ? [tpl(S.open_items.documents_not_provided)]
              : [
                  tpl(t.documents.intro),
                  ...r.documents.items.flatMap((d, i): Block[] => [
                    ...inventoryRows(d, i),
                    { kind: 'row', label: t.documents.examination, label_from: 'template', value: t.documents.not_examined, value_from: 'template' },
                  ]),
                  tpl(t.documents.fingerprint_note),
                ]),
          ]),
      { kind: 'subheading', text: S.open_items.limitations_heading, from: 'template' },
      ...S.open_items.limitations.map((l): Block => ({ kind: 'bullet', text: l, from: 'template' })),
    ]
    const result: CustomerDocumentSection[] = []
    for (const s of legacy) {
      if (s.id === 'guidance') result.push({ id: 'readiness_summary', blocks: out }, { id: 'record_limitations', blocks: limitations })
      else if (s.id !== 'open_items') result.push(s)
    }
    return result
  }

  return {
    meta: { title: fill(t.document_title, { record_id: issued.record_id }), subject: t.stamp, creator: `${t.template_id} v${t.version}`, producer: `${r.builder.id} v${r.builder.version}` },
    marking: { stamp: t.stamp, record_id: issued.record_id, footer: fill(t.footer, { record_id: issued.record_id }), page_label: t.page_label },
    sections: finalSections,
    identity: { record_id: issued.record_id, issued_on: issued.issued_on, record_ref: r.record.record_ref, record_version: r.record.record_version, snapshot_sha256: sha256, questionnaire_contract: { id: r.sources.questionnaire_contract.contract_id, version: r.sources.questionnaire_contract.contract_version, sha256: r.sources.questionnaire_contract.contract_sha256 }, templates: { id: t.template_id, version: t.version, fingerprint } },
  }
}

/** Every text in the model, in order (for review and tests). */
export function documentText(model: CustomerDocumentModel): string[] {
  return [model.marking.stamp, model.marking.footer, ...model.sections.flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text])))]
}

/** Canonical form of the model, to compare two renders. */
export const documentModelCanonical = (model: CustomerDocumentModel): string => canonicalJson(model)

export type { CustomerRecordV2 }
