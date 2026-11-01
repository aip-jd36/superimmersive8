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
 * Errors: `CustomerPdfRefusal` with a code, never a partial model.
 */

import { CREATOR_RECORD_CONCLUSIONS } from '../contract/compose'
import { isIsoDate } from '../contract/types'
import { verifyCustomerRecord, type CustomerRecordV2 } from '../customer-record/record'
import { arr, int, nullable, obj, oneOf, opt, ProjectionRefusal, str, WITHHELD } from '../record-core/projection'
import { EVIDENCE_CATEGORIES, EVIDENCE_MEDIA_TYPES } from '../evidence-intake/vocabulary'
import { canonicalJson } from '../record-core/canonical'
import { checkTemplates, fill, type CustomerPdfSectionId, type CustomerPdfTemplates, type PdfTemplateApproval, type TemplateRefusalCode } from './templates'

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
    snapshot_sha256: string
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

const ISSUED_RECORD_ID = /^CR-\d{4}-[0-9A-F]{8}$/

// ── The record, read through an exact-key projection (schema v3) ──

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
const recordSpec = obj({
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
  }),
  declarations: obj({ answers: arr(answer), observations: arr(observation), acknowledgements: arr(obj({ id: str, text: str })) }),
  documents: obj({
    policy: oneOf(['inventory_only'] as const),
    items: arr(obj({
      document_id: str, sha256: str, media_type: oneOf(EVIDENCE_MEDIA_TYPES), byte_size: int, file_name: str,
      category: oneOf(EVIDENCE_CATEGORIES), tool_index: nullable(int), examination: oneOf(['not_examined'] as const),
    })),
  }),
  comparison: obj({ policy: oneOf(['disabled'] as const) }),
  guidance: obj({ items: arr(guidanceItem) }),
})
type RecordView = ReturnType<typeof recordSpec>

export function buildCustomerDocument(input: CustomerDocumentInput): CustomerDocumentModel {
  // 1. The record first: nothing is read from a record that does not verify.
  const verified = verifyCustomerRecord(input.canonical, input.sha256)
  if (!verified.ok) throw new CustomerPdfRefusal('record_invalid', verified.reason)
  let r: RecordView
  try {
    r = recordSpec(verified.record as unknown, 'record')
  } catch (err) {
    if (err instanceof ProjectionRefusal) throw new CustomerPdfRefusal('record_unsupported', `${err.path}: ${err.reason}`)
    throw err
  }

  // 2. Issuance identity.
  const issued = input.issued
  if (!issued || typeof issued.record_id !== 'string' || !ISSUED_RECORD_ID.test(issued.record_id)) throw new CustomerPdfRefusal('issued_record_id_invalid')
  if (!isIsoDate(issued.issued_on) || issued.issued_on < r.record.prepared_on) throw new CustomerPdfRefusal('issued_on_invalid')

  // 3. Exactly the approved templates, for this record schema.
  const check = checkTemplates(input.templates, input.template_approval, { id: r.schema, version: r.schema_version })
  if (!check.ok) throw new CustomerPdfRefusal(`templates_${check.refusals[0].code}` as `templates_${TemplateRefusalCode}`, check.refusals.map((x) => (x.ref ? `${x.code}:${x.ref}` : x.code)).join(', '))
  const t = check.templates

  try {
    return compose(r, issued, t, check.fingerprint, input.sha256)
  } catch (err) {
    if (err instanceof CustomerPdfRefusal) throw err
    // A template slot that does not match its values: the templates are unusable.
    throw new CustomerPdfRefusal('templates_unusable', err instanceof Error ? err.message : String(err))
  }
}

function compose(r: RecordView, issued: CustomerDocumentInput['issued'], t: CustomerPdfTemplates, fingerprint: string, sha256: string): CustomerDocumentModel {
  const tpl = (text: string): Block => ({ kind: 'paragraph', text, from: 'template' })
  const heading = (text: string): Block => ({ kind: 'heading', text, from: 'template' })
  const row = (label: string, value: string, value_from: TextOrigin = 'record'): Block => ({ kind: 'row', label, label_from: 'template', value, value_from })
  const count = (p: { one: string; other: string }, n: number) => fill(n === 1 ? p.one : p.other, { n })
  const S = t.sections

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
  const notSure = r.declarations.answers.filter((a) => a.values.some((v) => v.kind === 'not_sure'))
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
        ...(r.documents.items.length === 0
          ? [tpl(S.open_items.documents_not_provided)]
          : [
              tpl(t.documents.intro),
              ...r.documents.items.flatMap((d, i): Block[] => [
                { kind: 'row', label: fill(t.documents.item_label, { n: i + 1 }), label_from: 'template', value: d.file_name, value_from: 'record' },
                { kind: 'row', label: t.documents.type, label_from: 'template', value: t.document_type_labels[d.media_type], value_from: 'template' },
                { kind: 'row', label: t.documents.category, label_from: 'template', value: t.document_category_labels[d.category], value_from: 'template' },
                ...(d.tool_index === null ? [] : [{ kind: 'row', label: t.documents.tool, label_from: 'template', value: fill(t.documents.tool_value, { n: d.tool_index + 1 }), value_from: 'template' } as Block]),
                { kind: 'row', label: t.documents.size, label_from: 'template', value: fill(t.documents.size_value, { bytes: d.byte_size }), value_from: 'template' },
                { kind: 'row', label: t.documents.fingerprint, label_from: 'template', value: d.sha256, value_from: 'record' },
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
            return [{ kind: 'label', text: ref(item), from: 'template' }, row(L.publication_version, String(p.version))]
          }),
        ]
      })(),
    },
  ]

  return {
    meta: { title: fill(t.document_title, { record_id: issued.record_id }), subject: t.stamp, creator: `${t.template_id} v${t.version}`, producer: `${r.builder.id} v${r.builder.version}` },
    marking: { stamp: t.stamp, record_id: issued.record_id, footer: fill(t.footer, { record_id: issued.record_id }), page_label: t.page_label },
    sections,
    identity: { record_id: issued.record_id, issued_on: issued.issued_on, record_ref: r.record.record_ref, snapshot_sha256: sha256, templates: { id: t.template_id, version: t.version, fingerprint } },
  }
}

/** Every text in the model, in order (for review and tests). */
export function documentText(model: CustomerDocumentModel): string[] {
  return [model.marking.stamp, model.marking.footer, ...model.sections.flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text])))]
}

/** Canonical form of the model, to compare two renders. */
export const documentModelCanonical = (model: CustomerDocumentModel): string => canonicalJson(model)

export type { CustomerRecordV2 }
