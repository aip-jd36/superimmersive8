/**
 * CR-SUM-PDF-A — test fixtures only (never imported by application code). A SYNTHETIC PDF PROOF, not Stage B.
 *
 * Takes the real customer document model (built by the unchanged `buildCustomerDocument` with the live approved PDF
 * templates) and the real rendered summary (`renderReadinessSummary`), and returns a copy of the model with the summary
 * as a new FIRST section, so the unchanged `CustomerRecordPDF` component can lay it out. The original sections are not
 * touched. A visible banner marks the section as a synthetic proof.
 *
 * Block mapping is mechanical: each render block becomes the existing block kind of the same name. Text that is a
 * render-template string or an approved summary-template string is tagged `template`; any other summary string
 * (record text the summary carries) is tagged `record`. No text is created, changed or dropped, except the banner.
 */
import type { Block, CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import type { ReadinessRenderTemplates, RenderedReadinessSummary } from '@/lib/creator-record/readiness-summary/render'
import type { ReadinessSummaryTemplates } from '@/lib/creator-record/readiness-summary/summary'

export const PROOF_BANNER = 'SYNTHETIC PROOF (CR-SUM-PDF-A): this first section uses draft wording under a synthetic test approval. It is not approved, not a real record, and not how any issued Creator Record looks today.'
export const PROOF_SECTION_ID = 'readiness_summary_proof'

const stringsOf = (v: unknown, out = new Set<string>()): Set<string> => {
  if (typeof v === 'string') out.add(v)
  else if (Array.isArray(v)) v.forEach((x) => stringsOf(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => stringsOf(x, out))
  return out
}

export function withReadinessSection(model: CustomerDocumentModel, rendered: RenderedReadinessSummary, summaryTemplates: ReadinessSummaryTemplates, renderTemplates: ReadinessRenderTemplates): CustomerDocumentModel {
  const templateStrings = new Set([...stringsOf(summaryTemplates), ...stringsOf(renderTemplates)])
  const origin = (text: string, source: 'summary' | 'render' | 'mechanical'): Block extends { from: infer F } ? F : never =>
    (source === 'summary' && !templateStrings.has(text) ? 'record' : 'template') as never
  const blocks: Block[] = [{ kind: 'paragraph', text: PROOF_BANNER, from: 'template' }]
  for (const b of rendered.blocks) {
    if (b.kind === 'row') blocks.push({ kind: 'row', label: b.label, label_from: origin(b.label, b.label_source), value: b.value, value_from: origin(b.value, b.value_source) })
    else blocks.push({ kind: b.kind, text: b.text, from: origin(b.text, b.source) })
  }
  return { ...model, sections: [{ id: PROOF_SECTION_ID as never, blocks }, ...model.sections] }
}
