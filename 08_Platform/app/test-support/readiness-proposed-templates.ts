/**
 * CR-PDF-IMPL-1 — test fixtures only (never imported by application code). The PROPOSED Creator Record PDF template sets for the
 * three-level reading layout, built deterministically from the APPROVED bases:
 *   schema 7: `si8/creator-record-v2-pdf-templates` v1 → proposed v4;  schema 8: v3 → proposed v5.
 * Wording: CR-PDF-WORDING-2 as reconciled, with the CR-PDF-APPROVAL-1 / CR-PDF-GATE-1 revision of G4. Every change is an EXACT
 * replacement that throws if the approved text differs. Legacy-only keys (never printed by this layout) are left unchanged.
 *
 * PROPOSED, NOT APPROVED. The committed proposal files (`lib/creator-record/governed/proposals/CR-PDF-TEMPLATES-*.proposal.json`)
 * must equal this builder's output (test-enforced). Nothing here is registered; the approval is `pending` with no authority.
 */
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { templateFingerprint, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { readinessRenderFingerprint } from '@/lib/creator-record/readiness-summary/render'
import { readinessTemplatesFingerprint } from '@/lib/creator-record/readiness-summary/summary'
import { optionRTemplates } from './readiness-scenarios'

export const PROPOSED_STATUS = 'PROPOSED — NOT APPROVED (CR-PDF-IMPL-1, revised by CR-PDF-REVIEW-2). Not registered. Requires founder, Living Knowledge governance and counsel approval and a wording/fingerprint freeze before registration.'
export const PROPOSED_VERSIONS = { 7: { pdf: 4, summary: 1, render: 1 }, 8: { pdf: 5, summary: 1, render: 2 } } as const

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const keyPath = (k: string) => k.replace(/\[(\d+)\]/g, '.$1')
const get = (o: any, key: string) => keyPath(key).split('.').reduce((v, k) => v?.[k], o)
function put(o: any, key: string, v: unknown) { const ks = keyPath(key).split('.'); const last = ks.pop()!; ks.reduce((x, k) => x[k], o)[last] = v }
function edit(o: any, key: string, from: string, to: string) {
  const before = get(o, key)
  if (typeof before !== 'string' || before.split(from).length !== 2) throw new Error(`proposed templates: "${from}" not found exactly once at ${key}`)
  put(o, key, before.replace(from, to))
}

export interface ProposedTemplateSet {
  status: string
  schema: 7 | 8
  base: { template_id: string; version: number; fingerprint: string }
  templates: Record<string, unknown>
  fingerprints: { pdf: string; summary: string; render: string }
  proposed_approval: Omit<PdfTemplateApproval, 'authority' | 'decision_date'> & { authority: null; decision_date: null }
}

export function proposedTemplateSet(schema: 7 | 8): ProposedTemplateSet {
  const base = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: schema }) as { templates: any; approval: PdfTemplateApproval }
  const V = PROPOSED_VERSIONS[schema]
  const draft = optionRTemplates(base, schema).templates.readiness_summary as { summary: any; render: any }
  const pdf = clone(base.templates)
  const summary = { ...clone(draft.summary), version: V.summary }
  const render = { ...clone(draft.render), version: V.render }
  const S = 'sections'
  // ── Printed keys of the approved set (M1–M15, N1, N2) ──
  edit(pdf, `${S}.about.intro[1]`, 'sections 2 to 4', 'sections 3 to 5')
  if (schema === 7) {
    edit(pdf, `${S}.about.intro[2]`, 'in section 5', 'in section 2')
    edit(pdf, `${S}.about.intro[3]`, 'Section 6 lists what this record does not establish. Section 7 lists what SI8 did not do.', 'Section 2 also sets out what remains open and what this record does not establish. Section 6 sets out the record’s limitations, and section 7 lists what SI8 did not do.')
  } else {
    edit(pdf, `${S}.about.intro[2]`, 'Section 5 lists', 'Section 6 lists')
    edit(pdf, `${S}.about.intro[3]`, 'in section 6', 'in section 2')
    edit(pdf, `${S}.about.intro[4]`, 'Section 7 lists what this record does not establish. Section 8 lists what SI8 did not do.', 'Section 2 also sets out what remains open and what this record does not establish. Section 7 sets out the record’s limitations, and section 8 lists what SI8 did not do.')
    edit(pdf, 'examination.heading', '5.', '6.')
    edit(pdf, 'examination.intro[2]', 'in section 6', 'in section 2')
    edit(pdf, `${S}.open_items.limitations[0]`, 'Sections 2 to 4', 'Sections 3 to 5')
    edit(pdf, `${S}.open_items.limitations[1]`, 'in section 5', 'in section 6')
  }
  edit(pdf, `${S}.project.heading`, '2.', '3.')
  edit(pdf, `${S}.tools.heading`, '3.', '4.')
  edit(pdf, `${S}.contribution.heading`, '4.', '5.')
  edit(pdf, `${S}.about.counts.guidance.one`, 'guidance item', 'consideration')
  edit(pdf, `${S}.about.counts.guidance.other`, 'guidance items', 'considerations')
  // ── Readiness sets (printed copies; M5, M6, M7, M16, N3) ──
  edit(summary, 'topic_qualified_note', 'this item’s own conditions', 'this consideration’s own conditions')
  edit(render, 'heading', 'Commercial-readiness considerations', '2. Commercial-readiness considerations')
  edit(render, 'guidance_intro', 'Each item says', 'Each consideration says')
  edit(render, 'guidance_intro', 'An item is not a finding', 'A consideration is not a finding')
  if (schema === 8) edit(render, 'guidance_intro', 'in section 5', 'in section 6')
  render.limitations_heading = schema === 7 ? '6. Documents and limitations' : '7. Limitations of this record'
  const templates = { ...pdf, version: V.pdf, readiness_summary: { summary, render } }
  return {
    status: PROPOSED_STATUS,
    schema,
    base: { template_id: base.approval.template_id, version: base.approval.version, fingerprint: base.approval.fingerprint },
    templates,
    fingerprints: { pdf: templateFingerprint(templates), summary: readinessTemplatesFingerprint(summary), render: readinessRenderFingerprint(render) },
    proposed_approval: { template_id: templates.template_id, version: V.pdf, fingerprint: templateFingerprint(templates), record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: schema }, lifecycle: 'pending', authority: null, decision_date: null, review_ref: null },
  }
}

export const SYNTHETIC_PROPOSED_AUTHORITY = 'SYNTHETIC TEST APPROVAL — CR-PDF-IMPL-1 proposed templates — NOT APPROVED WORDING'
/** For tests and proofs only: the proposed set under a synthetic approval of exactly its content (registered nowhere). */
export function syntheticallyApproved(p: ProposedTemplateSet): { templates: Record<string, unknown>; approval: PdfTemplateApproval } {
  return { templates: p.templates, approval: { ...p.proposed_approval, lifecycle: 'approved', authority: SYNTHETIC_PROPOSED_AUTHORITY, decision_date: '2026-11-13' } }
}
