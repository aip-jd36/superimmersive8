/**
 * CR-OPTION-C-OC1 — what the internal draft PDF prints, as a pure model of the snapshot.
 *
 * Every string comes from the snapshot or from `./templates`; nothing is
 * generated, summarised or reworded, so the PDF can never state more than the
 * snapshot (and the snapshot never more than composition, which is never
 * stronger than Bounded Interpretation).
 *
 * Fail closed: the model is refused unless the snapshot's digest matches, it is
 * an internal unissued draft with the neutral comparison policy, and every
 * guidance conclusion label is the fixed label of its conclusion.
 */

import { T } from '../presentation/templates'
import type { DraftRow } from '../presentation/build-draft-record'
import { snapshotDigestMatches, type InternalDraftSnapshot } from './snapshot'
import { COMPARISON_POLICY, D, INTERNAL_DRAFT_GENERATOR_ID, ISSUED_RECORD_ID } from './templates'

export type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'subheading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'row'; label: string; value: string; note?: string }
  | { kind: 'bullet'; text: string }

export interface DraftSection {
  id: string
  blocks: Block[]
}

export interface InternalDraftDocumentModel {
  /** Printed in the fixed header and footer of every page. */
  marking: { title: string; detail: string; footer: string }
  meta: { title: string; subject: string; creator: string; producer: string }
  title_block: Block[]
  sections: DraftSection[]
}

export class InternalDraftRenderError extends Error {
  constructor(reason: string) {
    super(`internal_draft_render_refused: ${reason}`)
  }
}

const rows = (rs: readonly DraftRow[]): Block[] => rs.map((r) => ({ kind: 'row' as const, label: r.label, value: r.value, ...(r.note ? { note: r.note } : {}) }))

export function buildInternalDraftDocument(snapshot: InternalDraftSnapshot, sha256: string): InternalDraftDocumentModel {
  if (!snapshotDigestMatches(snapshot, sha256)) throw new InternalDraftRenderError('snapshot digest does not match')
  if (snapshot.status !== 'internal_unissued_draft' || snapshot.generator_id !== INTERNAL_DRAFT_GENERATOR_ID) throw new InternalDraftRenderError('not an internal draft snapshot')
  if (snapshot.comparison_policy !== COMPARISON_POLICY) throw new InternalDraftRenderError('comparison policy is not neutral fallback')
  if (ISSUED_RECORD_ID.test(snapshot.record.draft_id)) throw new InternalDraftRenderError('an issued Creator Record id cannot appear on a draft')
  for (const c of snapshot.guidance.cards) {
    if (c.conclusion_label !== T.conclusion_label[c.conclusion]) throw new InternalDraftRenderError(`non-standard conclusion label for ${c.claim_id}`)
  }

  const s = snapshot
  const sections: DraftSection[] = []

  sections.push({ id: 'summary', blocks: [{ kind: 'heading', text: D.section.summary }, ...s.summary.map((t) => ({ kind: 'paragraph' as const, text: t }))] })

  sections.push({
    id: 'declarations',
    blocks: [
      { kind: 'heading', text: D.section.declarations },
      { kind: 'paragraph', text: s.declarations.intro },
      ...s.declarations.groups.flatMap((g): Block[] => [{ kind: 'subheading', text: g.heading }, ...rows(g.rows), ...(g.note ? [{ kind: 'paragraph' as const, text: g.note }] : [])]),
    ],
  })

  // The separate document section (neutral fallback: what each document appears to show; no comparison).
  sections.push({
    id: 'documents',
    blocks: [
      { kind: 'heading', text: D.section.documents },
      { kind: 'paragraph', text: s.comparison.intro },
      ...s.comparison.tools.map((t) => ({ kind: 'bullet' as const, text: t.line })),
      { kind: 'subheading', text: D.documents_subheading },
      ...(s.documents.items.length === 0
        ? [{ kind: 'paragraph' as const, text: s.documents.empty ?? D.comparison_no_documents }]
        : [
            { kind: 'paragraph' as const, text: s.documents.intro },
            ...s.documents.items.flatMap((d): Block[] => [{ kind: 'subheading', text: d.heading }, ...rows(d.rows), ...d.notes.map((n) => ({ kind: 'bullet' as const, text: n }))]),
          ]),
    ],
  })

  sections.push({
    id: 'guidance',
    blocks: [
      { kind: 'heading', text: D.section.guidance },
      { kind: 'paragraph', text: s.guidance.intro },
      ...(s.guidance.empty ? [{ kind: 'paragraph' as const, text: s.guidance.empty }] : []),
      ...s.guidance.cards.flatMap((c): Block[] => [
        { kind: 'subheading', text: c.subject },
        { kind: 'row', label: c.conclusion_label, value: c.explanation },
        ...c.basis.map((t) => ({ kind: 'bullet' as const, text: t })),
        ...c.depends_on.map((t) => ({ kind: 'bullet' as const, text: t })),
        ...c.caveats.map((t) => ({ kind: 'bullet' as const, text: t })),
        { kind: 'paragraph', text: c.source },
        { kind: 'row', label: D.provenance_label, value: `${c.claim_id} · ${c.provenance.publication_entry_id} v${c.provenance.publication_entry_version} · ${c.provenance.objective_id} · ${c.provenance.bi_status}` },
      ]),
    ],
  })

  const o = s.open_items
  sections.push({
    id: 'open_items',
    blocks: [
      { kind: 'heading', text: D.section.open_items },
      { kind: 'paragraph', text: o.intro },
      ...(o.empty ? [{ kind: 'paragraph' as const, text: o.empty }] : []),
      ...(o.not_established.length > 0 ? [{ kind: 'subheading' as const, text: D.not_established_heading }] : []),
      ...o.not_established.flatMap((n): Block[] => [
        { kind: 'row', label: n.label, value: n.status, note: `${n.told_us}${n.next ? ` ${n.next}` : ''}` },
        ...n.for_guidance.map((g) => ({ kind: 'bullet' as const, text: g })),
      ]),
      ...(o.items.length > 0 ? [{ kind: 'subheading' as const, text: D.open_evidence_heading }] : []),
      ...o.items.flatMap((i): Block[] => [
        { kind: 'row', label: i.label, value: i.status, note: i.sufficiency },
        { kind: 'bullet', text: i.told_us },
        { kind: 'bullet', text: i.documents },
        { kind: 'bullet', text: i.evidence },
      ]),
      ...(o.documents_mentioned.length > 0 ? [{ kind: 'subheading' as const, text: D.documents_mentioned_heading }, ...rows(o.documents_mentioned)] : []),
    ],
  })

  sections.push({
    id: 'not_shown',
    blocks: [
      { kind: 'heading', text: D.section.not_shown },
      ...(s.not_shown.intro ? [{ kind: 'paragraph' as const, text: s.not_shown.intro }] : []),
      ...s.not_shown.lines.map((t) => ({ kind: 'bullet' as const, text: t })),
      ...(s.not_shown.empty ? [{ kind: 'paragraph' as const, text: s.not_shown.empty }] : []),
    ],
  })

  sections.push({
    id: 'independent_review',
    blocks: [{ kind: 'heading', text: D.section.independent_review }, { kind: 'paragraph', text: s.independent_review.intro }, ...s.independent_review.lines.map((t) => ({ kind: 'bullet' as const, text: t }))],
  })

  sections.push({ id: 'not_done', blocks: [{ kind: 'heading', text: D.section.not_done }, ...s.not_done.map((t) => ({ kind: 'bullet' as const, text: t }))] })

  sections.push({ id: 'method', blocks: [{ kind: 'heading', text: D.section.method }, ...rows(s.method)] })

  return {
    marking: { title: D.marking, detail: D.marking_detail, footer: `${D.marking} · ${INTERNAL_DRAFT_GENERATOR_ID} · ${D.footer_snapshot(sha256)}` },
    meta: { title: `${D.marking}: ${s.record.draft_id}`, subject: D.marking_detail, creator: INTERNAL_DRAFT_GENERATOR_ID, producer: INTERNAL_DRAFT_GENERATOR_ID },
    title_block: [
      { kind: 'heading', text: s.record.title },
      { kind: 'row', label: D.draft_label, value: `${s.record.draft_id} v${s.record.version} · ${D.prepared(s.record.prepared_on)}` },
      { kind: 'paragraph', text: D.structure_note },
      ...s.pilot_notice.map((t) => ({ kind: 'paragraph' as const, text: t })),
    ],
    sections,
  }
}

/** Every string the PDF would print, in order (used by tests and review tooling). */
export function documentText(model: InternalDraftDocumentModel): string[] {
  const of = (b: Block): string[] => (b.kind === 'row' ? [b.label, b.value, ...(b.note ? [b.note] : [])] : [b.text])
  return [model.marking.title, model.marking.detail, model.marking.footer, ...model.title_block.flatMap(of), ...model.sections.flatMap((s) => s.blocks.flatMap(of))]
}
