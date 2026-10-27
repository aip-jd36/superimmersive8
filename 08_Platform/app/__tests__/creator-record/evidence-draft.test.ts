/**
 * CR-V2-EVIDENCE-SLICE-1 — documents in the draft Creator Record: the E1–E14
 * scenarios (deterministic, fixture replay), creator review and correction,
 * the interpretation boundary (documents never drive guidance) and wording.
 *
 * What this proves: the interface, the boundaries and the wording, given a
 * document observation. What it CANNOT prove: that a model extracts these
 * observations correctly from real or synthetic files — replay returns the
 * fixtures' recorded ground truth. Those scenarios are marked LIVE-ONLY in
 * the UAT matrix.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as guidanceModule from '@/lib/creator-record/integration/run-creator-record-guidance'
import { adoptablePlanValues, parseExaminedDocument, type ReviewDecision, type ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { buildReplayTable, type ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { buildCreatorRecordDraft, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { parseFormState } from '@/lib/creator-record/prototype/parse-form-state'
import type { DraftRecordView } from '@/lib/creator-record/presentation/build-draft-record'
import { NEGATION_ALLOWLIST, T } from '@/lib/creator-record/presentation/templates'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const RECORD = { record_id: 'UAT-EVIDENCE', record_version: 1, captured_at: '2026-10-27T00:00:00Z' }
const ACK = { A1: true, A2: true }
const ANS = { P1: ['UAT test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')

/** Runs the REAL examination path (fixture replay) for a synthetic fixture's recorded extraction. */
async function examined(fixtureId: string, tag = fixtureId) {
  const bytes = new Uint8Array([...PNG, ...Buffer.from(`synthetic:${tag}`)])
  const fixture = REPLAY_FIXTURES.find((f) => f.fixture_id === fixtureId)!
  const table = buildReplayTable([{ ...fixture, sha256: sha(bytes) } as ReplayFixture])
  return examineUpload(bytes, `${fixtureId}.png`, { mode: 'fixture_replay', replayTable: table })
}
async function toolDoc(fixtureId: string, tool_index = 0, decision: ReviewDecision = 'not_reviewed', adopted_value: string | null = null): Promise<ToolDocument> {
  const document = await examined(fixtureId)
  return { tool_index, document, review: { document_id: document.document_id, decision, adopted_value } }
}
const state = (tools: Record<string, string[]>[], answers: Record<string, string[]> = {}): CreatorRecordFormState => ({ answers: { ...ANS, ...answers }, tools, acknowledgements: ACK })
const pika = (plan: string) => ({ T1: ['pika'], T3: [plan], T4: ['May 2026'] })
function draft(s: CreatorRecordFormState, documents: ToolDocument[] = []) {
  const r = buildCreatorRecordDraft({ state: s, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-27', record: RECORD, documents })
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r
}
const ids = (v: DraftRecordView) => v.guidance.cards.map((c) => c.claim_id).sort()
const docText = (v: DraftRecordView) => JSON.stringify(v.documents)
const toolRows = (v: DraftRecordView) => v.declarations.groups.find((g) => g.id === 'tools')!.rows

// ─────────────────────────────────────────────── the interpretation boundary

describe('documents never drive guidance', () => {
  test('the guidance pipeline receives exactly the same declarations with or without documents', async () => {
    const spy = jest.spyOn(guidanceModule, 'runCreatorRecordGuidance')
    const s = state([pika('Pro')])
    draft(s)
    draft(s, [await toolDoc('pdf-pika-pro-no-period')])
    draft(s, [await toolDoc('conflict-two-plan-names')])
    const inputs = spy.mock.calls.map((c) => c[0].observations)
    expect(inputs[1]).toEqual(inputs[0])
    expect(inputs[2]).toEqual(inputs[0])
    for (const obs of inputs) expect(obs.every((o) => o.source_kind === 'customer_declared')).toBe(true)
    spy.mockRestore()
  })

  test('guidance, open items and not-included lines are identical whatever the document shows', async () => {
    const s = state([pika('Standard')])
    const base = draft(s).view
    for (const f of ['pdf-pika-pro-no-period', 'conflict-reseller-merchant', 'inject-pricing-page-claims-invoice', 'unreadable-dark-image']) {
      const v = draft(s, [await toolDoc(f)]).view
      expect(v.guidance).toEqual(base.guidance)
      expect(v.open_items).toEqual(base.open_items)
      expect(v.not_shown).toEqual(base.not_shown)
    }
  })

  test('document observations are kept in the trace as document_examined provenance, never as declarations', async () => {
    const r = draft(state([pika('Pro')]), [await toolDoc('pdf-pika-pro-no-period')])
    const obs = r.view.trace.document_observations
    expect(obs.length).toBeGreaterThan(0)
    expect(obs.every((o) => o.source_kind === 'document_examined')).toBe(true)
    expect(obs[0].profile).toEqual(expect.objectContaining({ id: 'receipt-fixture-replay' }))
    expect(obs.some((o) => (o as unknown as Record<string, unknown>).target !== undefined)).toBe(false)
    const facts = r.guidance.facts.provenance
    expect([...facts.tools, ...facts.plans].every((f) => f.observation_id.indexOf(':DOC:') === -1)).toBe(true)
  })

  test('there is no "verified" state anywhere in a document or its review', () => {
    const src = readFileSync(path.join(__dirname, '..', '..', 'lib', 'creator-record', 'evidence', 'document-observations.ts'), 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    expect(code).not.toMatch(/'verified'|'confirmed'|'matched'|'consistent'|'approved'/)
  })
})

// ─────────────────────────────────────────────── E1–E14 (fixture replay)

describe('E1–E14 (deterministic fixture replay)', () => {
  test('E1 Pika Pro + matching synthetic receipt: document shown beside the answer; guidance unchanged; nothing compared', async () => {
    const r = draft(state([pika('Pro')]), [await toolDoc('pdf-pika-pro-no-period')])
    expect(ids(r.view)).toEqual(ids(draft(state([pika('Pro')])).view))
    const d = r.view.documents.items[0]
    expect(d.heading).toBe('Document for Tool 1: pdf-pika-pro-no-period.png')
    expect(d.rows).toContainEqual(expect.objectContaining({ label: T.doc_field_label.product_or_plan_name, value: 'Appears to show “Pro”' }))
    expect(d.rows).toContainEqual(expect.objectContaining({ label: T.doc_read_label, value: T.doc_read_replay }))
    expect(d.rows).toContainEqual(expect.objectContaining({ label: T.doc_fingerprint_label, note: T.doc_fingerprint_note }))
    expect(d.not_compared).toBe(T.doc_not_compared)
    expect(r.view.banner!.lines[1]).toBe(T.record_banner_files_replay)
    expect(r.view.not_done).toContain(T.not_done_documents)
    expect(r.view.method).toContainEqual(expect.objectContaining({ label: T.method_documents }))
  })

  test('E2 the same receipt with Standard declared: guidance follows the declaration; no difference is asserted', async () => {
    const r = draft(state([pika('Standard')]), [await toolDoc('pdf-pika-pro-no-period')])
    expect(ids(r.view)).toContain('CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1')
    expect(ids(r.view)).not.toContain('CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1')
    expect(docText(r.view)).toContain('Appears to show “Pro”')
    const documentText = JSON.stringify([r.view.documents, r.view.banner, r.view.declarations])
    expect(documentText).not.toMatch(/differ|mismatch|contradict|inconsistent|does not agree/i)
  })

  test('E3 plan "Not sure", then adopt "Pro" from the document: still a declaration, "on what you told us"', async () => {
    const doc = await toolDoc('pdf-pika-pro-no-period', 0, 'adopted', 'Pro')
    const r = draft(state([pika('Pro')]), [doc])
    const proCard = r.view.guidance.cards.find((c) => c.claim_id === 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1')!
    expect(proCard.conclusion_label).toBe(T.conclusion_label.relevant_on_declared_facts)
    expect(proCard.basis).toEqual([T.basis_plan('Pika', 'Pro')])
    const planRow = toolRows(r.view).find((x) => x.value === 'Pro')!
    expect(planRow.note).toContain(T.plan_adopted_note)
    expect(r.view.documents.items[0].review).toBe(T.doc_review.adopted('Pro'))
    // The declaration records the creator's answer, not the document.
    const declaredPlan = r.guidance.facts.provenance.plans[0]
    expect(declaredPlan.declared).toBe('Pro')
    expect(declaredPlan.observation_id).not.toContain(':DOC:')
  })

  test('E4 truncated plan name: shown as "could not be determined"; the creator enters their own answer', async () => {
    const doc = await toolDoc('shot-truncated-plan-name', 0, 'entered_different')
    const r = draft(state([pika('Pro')]), [doc])
    expect(r.view.documents.items[0].rows).toContainEqual(expect.objectContaining({ label: T.doc_field_label.product_or_plan_name, value: T.doc_field_status.ambiguous }))
    expect(r.view.documents.items[0].review).toBe(T.doc_review.entered_different)
    expect(ids(r.view)).toContain('CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1')
  })

  test('E5 two plan names on one receipt: every printed name is listed, no single plan is taken from it', async () => {
    const doc = await toolDoc('conflict-two-plan-names')
    const r = draft(state([{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['May 2026'] }]), [doc])
    const d = r.view.documents.items[0]
    expect(d.rows).toContainEqual(expect.objectContaining({ label: T.doc_plan_names_label, value: '“Standard”; “Pro Plan (Monthly)”' }))
    expect(d.rows).toContainEqual(expect.objectContaining({ label: T.doc_field_label.product_or_plan_name, value: T.doc_field_status.ambiguous }))
    expect(d.notes).toContain(T.doc_multiple_plans)
  })

  test('E6 pricing page with embedded instructions: not a billing document; the instruction text changes nothing', async () => {
    const doc = await toolDoc('inject-pricing-page-claims-invoice')
    const r = draft(state([pika('Pro')]), [doc])
    const d = r.view.documents.items[0]
    expect(d.rows).toContainEqual(expect.objectContaining({ label: T.doc_type_label, value: T.doc_type.not_a_billing_document }))
    expect(d.notes).toContain(T.doc_instruction_text)
    expect(adoptablePlanValues(doc.document)).toEqual([])
  })

  test('E7 a photo that is not a receipt, and E8 an unreadable image: no value shown, nothing adoptable', async () => {
    const photo = await toolDoc('nonreceipt-abstract-photo')
    const dark = await toolDoc('unreadable-dark-image')
    const r = draft(state([pika('Pro'), { T1: ['kling'], T3: ['not_sure'], T4: ['May 2026'] }]), [photo, { ...dark, tool_index: 1 }])
    const [p, k] = r.view.documents.items
    expect(p.rows).toContainEqual(expect.objectContaining({ label: T.doc_type_label, value: T.doc_type.not_a_billing_document }))
    expect(k.rows).toContainEqual(expect.objectContaining({ label: T.doc_readability_label, value: T.doc_readability.illegible }))
    expect(k.rows).toContainEqual(expect.objectContaining({ label: T.doc_field_label.issuer_name, value: T.doc_field_status.unreadable }))
    expect(docText(r.view)).not.toMatch(/Appears to show/)
    expect(adoptablePlanValues(photo.document)).toEqual([])
    expect(adoptablePlanValues(dark.document)).toEqual([])
  })

  test('E9/E10 a rejected file is listed as not read, with zero model calls', async () => {
    const bytes = new Uint8Array(Buffer.from('plain text pretending to be a pdf'))
    const document = await examineUpload(bytes, 'fake.pdf', { mode: 'fixture_replay' })
    const r = draft(state([pika('Pro')]), [{ tool_index: 0, document, review: { document_id: document.document_id, decision: 'not_reviewed', adopted_value: null } }])
    expect(r.view.documents.items[0].rows).toContainEqual(expect.objectContaining({ label: T.doc_read_label, value: T.doc_not_read.unsupported_format }))
    expect(document.model_calls).toBe(0)
  })

  test('E11 reseller as merchant: the seller is shown as printed and never identifies the tool', async () => {
    const doc = await toolDoc('conflict-reseller-merchant', 0, 'adopted', 'Pika Pro (Monthly)')
    const r = draft(state([pika('Pika Pro (Monthly)')]), [doc])
    const issuer = r.view.documents.items[0].rows.find((x) => x.label === T.doc_field_label.issuer_name)!
    expect(issuer.value).toBe('Appears to show “ResellerHub Payments Ltd”')
    expect(issuer.note).toContain(T.doc_issuer_note)
    expect(r.guidance.facts.activeToolIds).toEqual(['pika'])
    // Adopting a non-governed plan text from a document does not make it a governed plan:
    // no plan card is "relevant on what you told us"; every plan card stays "may be relevant".
    expect(r.guidance.facts.provenance.plans[0].passed_to_applicability).toBe(false)
    const planCards = r.view.guidance.cards.filter((c) => c.claim_id.includes('PAID-PLAN'))
    expect(planCards.length).toBeGreaterThan(0)
    expect(planCards.every((c) => c.conclusion === 'relevant_applicability_unresolved')).toBe(true)
  })

  test('E13 no persistence: the draft carries no storage path, URL or file bytes', async () => {
    const r = draft(state([pika('Pro')]), [await toolDoc('pdf-pika-pro-no-period')])
    const all = JSON.stringify(r.view)
    expect(all).not.toMatch(/https?:\/\/|supabase|storage|base64|data:/i)
  })

  test('without documents the record says so, and the banner says no files were uploaded', () => {
    const r = draft(state([pika('Pro')]))
    expect(r.view.documents).toEqual({ intro: T.documents_intro, items: [], empty: T.documents_none })
    expect(r.view.banner!.lines[1]).toBe(T.record_banner_no_files)
    expect(r.view.not_done).not.toContain(T.not_done_documents)
  })
})

// ─────────────────────────────────────────────── review integrity and corrections

describe('creator review: explicit, immutable, no stale facts', () => {
  test('an "adopted" review whose value is no longer the plan answer is refused (stale), not recorded as adopted', async () => {
    const doc = await toolDoc('pdf-pika-pro-no-period', 0, 'adopted', 'Pro')
    const r = buildCreatorRecordDraft({ state: state([pika('Standard')]), sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-27', record: RECORD, documents: [doc] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues).toContainEqual({ q_id: 'T3', tool_index: 0, issue: 'stale_document_review' })
  })

  test('adopting a value the document does not appear to show is refused', async () => {
    const doc = await toolDoc('pdf-pika-pro-no-period', 0, 'adopted', 'Fancy')
    const r = buildCreatorRecordDraft({ state: state([pika('Fancy')]), sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-27', record: RECORD, documents: [doc] })
    expect(r.ok).toBe(false)
  })

  test('correcting after adoption ("entered_different") leaves only the corrected plan in the record', async () => {
    const doc = await toolDoc('pdf-pika-pro-no-period', 0, 'entered_different')
    const r = draft(state([pika('Standard')]), [doc])
    expect(ids(r.view)).not.toContain('CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1')
    expect(r.guidance.facts.provenance.plans.map((p) => p.declared)).toEqual(['Standard'])
    expect(toolRows(r.view).find((x) => x.value === 'Standard')!.note ?? '').not.toContain(T.plan_adopted_note)
  })

  test('"ignored" shows the document with the creator’s choice; nothing else changes', async () => {
    const r = draft(state([pika('Pro')]), [await toolDoc('pdf-pika-pro-no-period', 0, 'ignored')])
    expect(r.view.documents.items[0].review).toBe(T.doc_review.ignored)
    expect(ids(r.view)).toEqual(ids(draft(state([pika('Pro')])).view))
  })

  test('a document sent back with an edited extraction, a forged id, a fake model count or extra fields is refused (400)', async () => {
    const doc = await toolDoc('pdf-pika-pro-no-period')
    const body = (d: unknown) => ({ ...state([pika('Pro')]), documents: [{ tool_index: 0, document: d, review: doc.review }] })
    const plain = JSON.parse(JSON.stringify(doc.document))
    expect(parseFormState(body(plain)).ok).toBe(true)
    const edits: ((d: any) => void)[] = [
      (d) => (d.extraction.product_or_plan_name = { status: 'present', value: 'Pro', evidence: null }),
      (d) => (d.extraction.verified = true),
      (d) => (d.document_id = 'DOC-000000000000'),
      (d) => (d.model_calls = 1),
      (d) => (d.extraction_mode = 'certified'),
      (d) => (d.outcome = 'document_examined', (d.reason = 'no_replay_fixture')),
      (d) => (d.file_name = '../../etc/passwd'),
      (d) => (d.storage_path = 'x'),
    ]
    for (const e of edits) {
      const d = JSON.parse(JSON.stringify(plain))
      e(d)
      expect(parseExaminedDocument(d)).toBeNull()
      expect(parseFormState(body(d)).ok).toBe(false)
    }
  })

  test('documents must belong to an existing tool block, one per block, with a matching review', async () => {
    const doc = JSON.parse(JSON.stringify(await toolDoc('pdf-pika-pro-no-period')))
    const s = state([pika('Pro')])
    expect(parseFormState({ ...s, documents: [{ ...doc, tool_index: 1 }] }).ok).toBe(false)
    expect(parseFormState({ ...s, documents: [doc, doc] }).ok).toBe(false)
    expect(parseFormState({ ...s, documents: [{ ...doc, review: { ...doc.review, document_id: 'DOC-ABCDEF123456' } }] }).ok).toBe(false)
    expect(parseFormState({ ...s, documents: [{ ...doc, review: { ...doc.review, decision: 'approved' } }] }).ok).toBe(false)
  })
})

// ─────────────────────────────────────────────── wording

describe('document wording', () => {
  const BANNED: [string, RegExp][] = [
    ['match', /\bmatch(es|ed|ing)?\b/i],
    ['consistent', /\b(in)?consistent\b/i],
    ['confirm', /\bconfirm(s|ed|ing|ation)?\b/i],
    ['contradict', /contradict/i],
    ['prove', /\bprov(e|es|ed|en|ing)\b/i],
    ['verify', /verif/i],
    ['authentic', /authentic/i],
    ['valid', /\bvalid(ated|ates|ity)?\b/i],
    ['clear', /\bclear(ed|ance|ing|s)?\b/i],
    ['approved', /\bapprov/i],
    ['certified', /certif/i],
    ['compliant', /complian/i],
    ['licensed to / permitted to / safe to', /licensed to|permitted to|\bsafe to\b/i],
  ]
  const clean = (t: string) => NEGATION_ALLOWLIST.reduce((s, n) => s.split(n).join(' '), t).split('approved for Creator Records').join(' ')

  test('no document-related template or rendered document text asserts a match, confirmation, proof or verification', async () => {
    const templates = Object.entries(T)
      .filter(([k]) => k.startsWith('doc') || k.startsWith('documents') || k.startsWith('record_banner') || k.includes('documents') || k === 'plan_adopted_note' || k.startsWith('tool_') || k.startsWith('provider_'))
      .map(([, v]) => (typeof v === 'function' ? (v as (...a: unknown[]) => string)('X', 'Y') : JSON.stringify(v)))
    const docs = await Promise.all(['pdf-pika-pro-no-period', 'shot-truncated-plan-name', 'conflict-two-plan-names', 'inject-pricing-page-claims-invoice', 'unreadable-dark-image', 'conflict-reseller-merchant'].map((f) => toolDoc(f)))
    const rendered = docs.map((d) => JSON.stringify(draft(state([pika('Pro')]), [d]).view.documents))
    const review = [T.doc_review.adopted('Pro'), T.doc_review.entered_different, T.doc_review.ignored, T.doc_review.not_reviewed]
    const panel = readFileSync(path.join(__dirname, '..', '..', 'components', 'creator-record', 'DocumentReviewPanel.tsx'), 'utf8')
    const panelText = Array.from(panel.matchAll(/>([^<>{}]+)</g)).map((m) => m[1])
    const offenders = [...templates, ...rendered, ...review, ...panelText].flatMap((t) => BANNED.filter(([, re]) => re.test(clean(t))).map(([n]) => `${n}: ${t.slice(0, 160)}`))
    expect(offenders).toEqual([])
  })
})
