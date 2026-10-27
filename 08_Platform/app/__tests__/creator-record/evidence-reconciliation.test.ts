/**
 * CR-V2-MVP-6 — declare-first evidence reconciliation (Option C): the seven
 * approved scenarios, the Runway conflicting-plan adversarial case, the
 * declaration / guidance invariants and the server trust boundary.
 *
 * Also preserved here (DEFERRED, unwired from the MVP path by CR-V2-MVP-6):
 * the G-R2 PDF text-layer reader and the provider-scoped plan cross-check
 * (CR-V2-MVP-3 / -MVP-4), kept with their tests for possible later use.
 *
 * Deterministic: no model call. Live readings are the ACTUAL observations
 * recorded from the CR-V2-MVP-2D / -MVP-4 live runs (claude-sonnet-5,
 * 2026-10-27), replayed through a scripted caller.
 */

import { deflateSync } from 'node:zlib'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { reconcileToolEvidence, type EvidenceReconciliation, type ExaminedDocument, type ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { extractPdfTextLayer, PDF_TEXT_LAYER_VERSION } from '@/lib/creator-record/evidence/pdf-text-layer'
import { crossCheckPlan, notRun, PLAN_CROSS_CHECK_VERSION } from '@/lib/creator-record/evidence/plan-cross-check'
import { verifyReturnedDocument } from '@/lib/creator-record/evidence/verify-returned-documents'
import { resolveSellerIdentity } from '@/lib/creator-record/integration/seller-identity'
import { documentForFixture } from '@/lib/creator-record/public-uat/fixtures'
import { planScopeForSeller } from '@/lib/creator-record/integration/plan-suggestions'
import { buildCreatorRecordDraft, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import type { ReceiptExtraction } from '@/lib/creator-record/receipt-examination/schema'
import { T } from '@/lib/creator-record/presentation/templates'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const APP = path.resolve(__dirname, '..', '..')
const GENERATED = path.join(APP, 'lib', 'creator-record', 'eval', 'fixtures', 'generated')
const HAS_FIXTURES = existsSync(path.join(GENERATED, 'manifest.json'))
const SCOPE = planScopeForSeller(TOPIC_CLAIMS_FIXTURE)
const scopeOf = (ex: ReceiptExtraction) => SCOPE(ex.issuer_name.status === 'present' ? ex.issuer_name.value : null)

const field = (status: 'present' | 'not_shown' | 'unreadable' | 'ambiguous', value: string | null = null, evidence: string | null = null) => ({ status, value, evidence })
/** Observations recorded verbatim from the CR-V2-MVP-2D live run. */
const LIVE: Record<string, ReceiptExtraction> = {
  'conflict-two-plan-names': {
    document_type: 'receipt', readability: 'legible',
    issuer_name: field('present', 'Runway AI, Inc.', 'Runway AI, Inc.'),
    product_or_plan_name: field('present', 'Pro Plan (Monthly)', 'Pro Plan (Monthly) $35.00'),
    transaction_date: field('present', '2026-04-04', 'Date: April 4, 2026'),
    service_period_start: field('not_shown'), service_period_end: field('not_shown'),
    plan_candidates: [{ text: 'Pro Plan (Monthly)', evidence: 'Pro Plan (Monthly) $35.00', context: 'charge_line' }],
    multiple_plans_shown: false, instruction_like_text_present: true,
  },
  'shot-truncated-plan-name': {
    document_type: 'billing_screenshot', readability: 'partially_legible',
    issuer_name: field('present', 'Pika', 'Pika   Account › Invoices'),
    product_or_plan_name: field('unreadable'),
    transaction_date: field('present', '2026-05-06', 'May 6, 2026'),
    service_period_start: field('not_shown'), service_period_end: field('not_shown'),
    plan_candidates: [{ text: 'Pro Pl…', evidence: 'Pro Pl…   $28.00   Paid', context: 'charge_line' }],
    multiple_plans_shown: false, instruction_like_text_present: true,
  },
  'pdf-pika-pro-no-period': {
    document_type: 'receipt', readability: 'legible',
    issuer_name: field('present', 'Pika Labs, Inc.', 'Pika Labs, Inc.'),
    product_or_plan_name: field('present', 'Pro', 'Pro $28.00'),
    transaction_date: field('present', '2026-05-02', 'Date: May 2, 2026'),
    service_period_start: field('not_shown'), service_period_end: field('not_shown'),
    plan_candidates: [{ text: 'Pro', evidence: 'Pro $28.00', context: 'charge_line' }],
    multiple_plans_shown: false, instruction_like_text_present: true,
  },
  'missing-period-end': {
    document_type: 'invoice', readability: 'legible',
    issuer_name: field('present', 'Pika Labs, Inc.', 'Pika Labs, Inc.'),
    product_or_plan_name: field('present', 'Pro', 'Pro $28.00'),
    transaction_date: field('present', '2026-04-01', 'Date: April 1, 2026'),
    service_period_start: field('present', '2026-04-01', 'Service start: April 1, 2026'), service_period_end: field('not_shown'),
    plan_candidates: [{ text: 'Pro', evidence: 'Pro $28.00', context: 'charge_line' }],
    multiple_plans_shown: false, instruction_like_text_present: true,
  },
  'nonreceipt-abstract-photo': {
    document_type: 'not_a_billing_document', readability: 'legible',
    issuer_name: field('not_shown'), product_or_plan_name: field('not_shown'), transaction_date: field('not_shown'),
    service_period_start: field('not_shown'), service_period_end: field('not_shown'),
    plan_candidates: [], multiple_plans_shown: false, instruction_like_text_present: false,
  },
}
/** The same clear reading with a seller name that resolves to Pika under SI8's existing aliases. */
LIVE['pika-seller-pro'] = { ...LIVE['pdf-pika-pro-no-period'], issuer_name: field('present', 'Pika', 'Pika') }
const scripted = (ex: ReceiptExtraction) => jest.fn().mockResolvedValue({ id: 'recorded-live', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 0, output_tokens: 0 }, parsed_output: ex })

/** A minimal one-page PDF with a simple font and the given lines (optionally Flate-compressed). */
function tinyPdf(lines: string[], opts: { compress?: boolean; type0WithoutToUnicode?: boolean; encrypt?: boolean } = {}): Uint8Array {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`)
  const content = opts.type0WithoutToUnicode
    ? `BT /F1 12 Tf 72 720 Td <${Buffer.from(lines.join(' '), 'latin1').toString('hex')}> Tj ET`
    : `BT /F1 12 Tf 72 720 Td ${lines.map((l, i) => `${i ? '0 -16 Td ' : ''}(${esc(l)}) Tj`).join(' ')} ET`
  const body = opts.compress ? deflateSync(Buffer.from(content, 'latin1')) : Buffer.from(content, 'latin1')
  const font = opts.type0WithoutToUnicode ? '<< /Type /Font /Subtype /Type0 /BaseFont /X /Encoding /Identity-H >>' : '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n')]
  const obj = (n: number, s: string | Buffer) => parts.push(Buffer.concat([Buffer.from(`${n} 0 obj\n`), Buffer.isBuffer(s) ? s : Buffer.from(s), Buffer.from('\nendobj\n')]))
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>')
  obj(4, Buffer.concat([Buffer.from(`<< /Length ${body.length}${opts.compress ? ' /Filter /FlateDecode' : ''} >>\nstream\n`), body, Buffer.from('\nendstream')]))
  obj(5, font)
  if (opts.encrypt) obj(6, '<< /Encrypt 7 0 R >>')
  parts.push(Buffer.from('trailer << /Root 1 0 R >>\n%%EOF\n'))
  return new Uint8Array(Buffer.concat(parts))
}
const CONFLICT_LINES = ['Runway AI, Inc.', 'Standard subscription receipt', 'Date: April 4, 2026', 'Pro Plan (Monthly) $35.00', 'SYNTHETIC TEST DOCUMENT - SI8 evaluation fixture - not a real receipt']
const CLEAR_LINES = ['Pika Labs, Inc.', 'RECEIPT', 'Date: May 2, 2026', 'Pro $28.00', 'SYNTHETIC TEST DOCUMENT - SI8 evaluation fixture - not a real receipt']
const PIKA_CLEAR = ['Pika', 'RECEIPT', 'Date: May 2, 2026', 'Pro $28.00']
const PIKA_CONFLICT = ['Pika', 'Standard subscription receipt', 'Date: May 2, 2026', 'Pro $28.00']

/** The ACTIVE examine path (CR-V2-MVP-6): no plan scope, so the G-R2 cross-check is recorded as not run. */
const live = (bytes: Uint8Array, ex: ReceiptExtraction, name = 'doc.pdf') => examineUpload(bytes, name, { mode: 'live_model', liveCaller: scripted(ex) })
const PNG = (n: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, n])
const ANS = { P1: ['MVP-6'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
type Tool = Record<string, string[]>
const tool = (t1: string, plan: string): Tool => ({ T1: [t1], T3: [plan], T4: ['May 2026'] })
const build = (tools: Tool[], docs: ToolDocument[] = []) => {
  const r = buildCreatorRecordDraft({
    state: { answers: ANS, tools, acknowledgements: { A1: true, A2: true } },
    sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-27',
    record: { record_id: 'MVP-6', record_version: 1, captured_at: '2026-10-27T00:00:00Z' },
    documents: docs,
  })
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r
}
const recon = (d: ExaminedDocument | null, toolId: string | null, plan: string | null): EvidenceReconciliation =>
  reconcileToolEvidence({ tool_index: 0, document: d, declared_tool_id: toolId, declared_plan: plan }, resolveSellerIdentity)
const withSeller = (ex: ReceiptExtraction, seller: string): ReceiptExtraction => ({ ...ex, issuer_name: field('present', seller, seller) })
const withPlan = (ex: ReceiptExtraction, plan: string, evidence = `${plan} $28.00`): ReceiptExtraction => ({ ...ex, product_or_plan_name: field('present', plan, evidence), plan_candidates: [{ text: plan, evidence, context: 'charge_line' }] })
const cards = (r: ReturnType<typeof build>) => r.view.guidance.cards.map((c) => c.claim_id).sort()
const planAnswer = (r: ReturnType<typeof build>, i = 0) => r.view.declarations.groups.find((g) => g.id === 'tools')!.rows.filter((x) => x.label.startsWith(`Tool ${i + 1}`))
/** Every "appears" row carries its fixed limitation; no other row does. */
function expectQualified(r: ReturnType<typeof build>) {
  for (const item of r.view.reconciliation.items) {
    for (const row of item.rows) {
      if (row.value === T.recon_result.appears_consistent) expect(row.note).toContain(T.recon_limit_consistent)
      else if (row.value === T.recon_result.appears_to_conflict) expect(row.note).toContain(T.recon_limit_conflict)
      else expect(row.note).not.toMatch(/Appears/)
    }
  }
}

describe('DEFERRED G-R2 — the independent text-layer reader (fails closed)', () => {
  test('reads simple and Flate-compressed text', () => {
    for (const compress of [false, true]) {
      const r = extractPdfTextLayer(tinyPdf(CONFLICT_LINES, { compress }))
      expect(r.status).toBe('extracted')
      if (r.status === 'extracted') for (const l of CONFLICT_LINES) expect(r.text).toContain(l)
    }
  })
  test.each([
    ['an image', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]), 'not_pdf'],
    ['random bytes labelled PDF', new Uint8Array(Buffer.from('%PDF-1.4\ngarbage without objects')), 'unsupported_structure'],
    ['an encrypted PDF', tinyPdf(CLEAR_LINES, { encrypt: true }), 'encrypted'],
    ['a font whose codes cannot be mapped to text', tinyPdf(CLEAR_LINES, { type0WithoutToUnicode: true }), 'unmapped_font'],
  ])('%s → unavailable (%s)', (_n, bytes, reason) => {
    expect(extractPdfTextLayer(bytes)).toEqual({ status: 'unavailable', reason })
  })
  ;(HAS_FIXTURES ? test : test.skip)('matches the generator’s own text on every synthetic PDF and refuses every image (when generated locally)', () => {
    const manifest = JSON.parse(readFileSync(path.join(GENERATED, 'manifest.json'), 'utf8')) as { documents: { id: string; file: string; media_type: string; document_text: string }[] }
    const norm = (s: string) => s.normalize('NFKC').replace(/\s+/g, '').toLowerCase()
    for (const d of manifest.documents) {
      const r = extractPdfTextLayer(new Uint8Array(readFileSync(path.join(GENERATED, d.file))))
      if (d.media_type !== 'application/pdf') expect(r.status).toBe('unavailable')
      else expect(r.status === 'extracted' && norm(r.text)).toBe(norm(d.document_text))
    }
  })
  test('the cross-check version names the reader version', () => {
    expect(PLAN_CROSS_CHECK_VERSION.endsWith(`/${PDF_TEXT_LAYER_VERSION}`)).toBe(true)
  })
})

describe('DEFERRED G-R2 — plan cross-check (pure, provider-scoped)', () => {
  const layer = (lines: string[]) => extractPdfTextLayer(tinyPdf(lines))
  const pika = LIVE['pika-seller-pro']
  test('known Pika plan, no conflict: Pika’s own names only; says nothing about which plan was bought', () => {
    expect(crossCheckPlan(pika, layer(PIKA_CLEAR), scopeOf(pika))).toEqual({ version: PLAN_CROSS_CHECK_VERSION, status: 'no_other_plan_names_found', other_plan_names: [], reason: null, provider: 'pika' })
  })
  test('known Pika plan with conflicting text: the other Pika plan is found; the reading is kept as is', () => {
    expect(crossCheckPlan(pika, layer(PIKA_CONFLICT), scopeOf(pika))).toEqual({ version: PLAN_CROSS_CHECK_VERSION, status: 'other_plan_names_found', other_plan_names: [{ name: 'Standard', excerpt: 'Standard subscription receipt' }], reason: null, provider: 'pika' })
    expect(pika.product_or_plan_name.value).toBe('Pro')
  })
  test('a Runway document with its own plan names: Pika’s vocabulary is never applied; verification unavailable', () => {
    const ex = LIVE['conflict-two-plan-names'] // MVP-2D reading, seller "Runway AI, Inc."
    expect(crossCheckPlan(ex, layer(CONFLICT_LINES), scopeOf(ex))).toEqual({ version: PLAN_CROSS_CHECK_VERSION, status: 'provider_scope_unavailable', other_plan_names: [], reason: 'provider_not_recognized', provider: null })
    // Even when the seller resolves to Runway, SI8 governs no Runway plan names.
    const runway = { ...ex, issuer_name: field('present', 'Runway', 'Runway') }
    expect(crossCheckPlan(runway, layer(['Runway', 'Standard subscription receipt', 'Unlimited', 'Pro Plan (Monthly) $35.00']), scopeOf(runway))).toEqual(expect.objectContaining({ status: 'provider_scope_unavailable', reason: 'no_governed_plan_names', other_plan_names: [] }))
  })
  test.each([
    ['an unknown provider', 'Acme Video Tools', 'provider_not_recognized'],
    ['a look-alike seller', 'Runway Financial Services LLC', 'provider_not_recognized'],
    ['a company-suffixed seller not in the existing aliases (no suffix stripping)', 'Pika Labs, Inc.', 'provider_not_recognized'],
    ['an ambiguous provider name', 'Nano Banana', 'provider_ambiguous'],
    ['a provider with no governed plan names', 'Midjourney', 'no_governed_plan_names'],
  ])('%s → verification unavailable (%s), never another tool’s names', (_n, seller, reason) => {
    const ex = { ...pika, issuer_name: field('present', seller, seller) }
    const cc = crossCheckPlan(ex, layer([seller, 'Standard subscription receipt', 'Pro $28.00']), scopeOf(ex))
    expect(cc).toEqual({ version: PLAN_CROSS_CHECK_VERSION, status: 'provider_scope_unavailable', other_plan_names: [], reason, provider: null })
  })
  test('no seller shown → verification unavailable', () => {
    const ex = { ...pika, issuer_name: field('not_shown') }
    expect(crossCheckPlan(ex, layer(PIKA_CONFLICT), scopeOf(ex))).toEqual(expect.objectContaining({ status: 'provider_scope_unavailable', reason: 'provider_not_shown' }))
  })
  test('a vocabulary word inside the seller’s name never counts (G-R1)', () => {
    const ex = { ...pika, issuer_name: field('present', 'Standard Media Ltd', 'Standard Media Ltd') }
    expect(crossCheckPlan(ex, layer(['Standard Media Ltd', 'Pro $28.00']), { status: 'established', provider: 'pika', vocabulary: ['Fancy', 'Pro', 'Standard'] }).status).toBe('no_other_plan_names_found')
  })
  test('lower-case prose ("standard terms") is not a plan name; capitalised plan names are (conservative)', () => {
    expect(crossCheckPlan(pika, layer([...PIKA_CLEAR, 'Subject to our standard terms.']), scopeOf(pika)).status).toBe('no_other_plan_names_found')
    expect(crossCheckPlan(pika, layer([...PIKA_CLEAR, 'Upgrade to Fancy for more.']), scopeOf(pika)).status).toBe('other_plan_names_found')
  })
  test('quality gate: a text layer that does not contain the reading is unusable, not evidence', () => {
    expect(crossCheckPlan(pika, layer(['Something else entirely']), scopeOf(pika))).toEqual(expect.objectContaining({ status: 'text_layer_unusable', reason: 'reading_not_found_in_text_layer', provider: null }))
  })
  test('no text layer → unavailable; not a billing document → not applicable', () => {
    expect(crossCheckPlan(pika, { status: 'unavailable', reason: 'not_pdf' }, scopeOf(pika))).toEqual(expect.objectContaining({ status: 'text_layer_unavailable', reason: 'not_pdf' }))
    expect(crossCheckPlan(LIVE['nonreceipt-abstract-photo'], layer(['anything']), scopeOf(LIVE['nonreceipt-abstract-photo'])).status).toBe('not_applicable')
  })
})


describe('CR-V2-MVP-6 — G-R2 is unwired from the active path', () => {
  test('the examine route passes no plan scope, so every document carries the "not run" cross-check', async () => {
    const route = readFileSync(path.join(APP, 'app', 'api', 'admin', 'creator-record-v2', 'examine', 'route.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(route).not.toMatch(/planScope|plan-suggestions/)
    const d = await live(tinyPdf(PIKA_CONFLICT), LIVE['pika-seller-pro'])
    expect(d.cross_check).toEqual(notRun('no_vocabulary'))
  })
})

describe('Option C — the seven scenarios (server-side reconciliation)', () => {
  test('1 — Pika Pro declared, receipt appears consistent: "Appears consistent", always with its limitation', async () => {
    const d = await live(tinyPdf(PIKA_CLEAR), LIVE['pika-seller-pro'])
    const r = build([tool('pika', 'Pro')], [{ tool_index: 0, document: d }])
    expect(r.view.trace.evidence_reconciliation[0]).toEqual({ tool_index: 0, document_id: d.document_id, provider: { result: 'appears_consistent', reason: 'same_tool' }, plan: { result: 'appears_consistent', reason: 'same_plan_name' } })
    expect(r.view.reconciliation.items[0].rows[1]).toEqual({ label: T.recon_plan_label, value: T.recon_result.appears_consistent, note: `${T.recon_reason.same_plan_name} ${T.recon_limit_consistent}` })
    expectQualified(r)
    // The real synthetic receipt's seller is printed "Pika Labs, Inc.", which is not an existing alias: nothing is established.
    const real = recon(documentForFixture('pdf-pika-pro-no-period'), 'pika', 'Pro')
    expect(real.provider).toEqual({ result: 'does_not_establish', reason: 'seller_not_recognized' })
    expect(real.plan).toEqual({ result: 'does_not_establish', reason: 'seller_not_established' })
  })

  test('2 — Pika Pro declared, receipt appears to show Standard: "Appears to conflict"; the answer and guidance are unchanged', async () => {
    const d = await live(tinyPdf(['Pika', 'RECEIPT', 'Standard $8.00']), withPlan(LIVE['pika-seller-pro'], 'Standard', 'Standard $8.00'))
    const r = build([tool('pika', 'Pro')], [{ tool_index: 0, document: d }])
    expect(r.view.trace.evidence_reconciliation[0].plan).toEqual({ result: 'appears_to_conflict', reason: 'different_plan_name' })
    expect(r.view.reconciliation.items[0].rows[1].note).toContain(T.recon_limit_conflict)
    expect(planAnswer(r).map((x) => x.value)).toContain('Pro')
    expect(r.guidance.facts.provenance.plans.map((p) => p.declared)).toEqual(['Pro'])
    expect(cards(r)).toEqual(cards(build([tool('pika', 'Pro')])))
    expectQualified(r)
  })

  test('3 — a tool and plan declared, no document: nothing compared; the limitation is stated; guidance unchanged', () => {
    const r = build([tool('pika', 'Pro')])
    expect(r.view.reconciliation).toEqual({ intro: T.recon_intro, items: [], empty: T.recon_none })
    expect(r.view.trace.evidence_reconciliation[0]).toEqual({ tool_index: 0, document_id: null, provider: { result: 'not_assessed', reason: 'no_document' }, plan: { result: 'not_assessed', reason: 'no_document' } })
    expect(r.view.open_items.items.every((o) => o.documents === T.open_documents_none)).toBe(true)
  })

  test('4 — plan "Not sure", receipt appears to show Pro: not assessed; Pro never becomes the answer', async () => {
    const d = await live(tinyPdf(PIKA_CLEAR), LIVE['pika-seller-pro'])
    const r = build([tool('pika', 'not_sure')], [{ tool_index: 0, document: d }])
    expect(r.view.trace.evidence_reconciliation[0].plan).toEqual({ result: 'not_assessed', reason: 'plan_not_declared' })
    expect(r.guidance.facts.provenance.plans.every((p) => p.declared !== 'Pro')).toBe(true)
    expect(cards(r)).toEqual(cards(build([tool('pika', 'not_sure')])))
    expect(planAnswer(r).some((x) => x.value === 'Pro')).toBe(false)
  })

  test('5 — Pro declared, screenshot shows "Pro Pl…": does not establish (never consistent, never a conflict)', async () => {
    const shot = await examineUpload(PNG(5), 'shot.png', { mode: 'live_model', liveCaller: scripted(LIVE['shot-truncated-plan-name']) })
    expect(recon(shot, 'pika', 'Pro')).toEqual(expect.objectContaining({ provider: { result: 'appears_consistent', reason: 'same_tool' }, plan: { result: 'does_not_establish', reason: 'plan_not_read' } }))
    const cut = { ...shot, extraction: withPlan(LIVE['shot-truncated-plan-name'], 'Pro Pl…', 'Pro Pl… $28.00') }
    expect(recon(cut, 'pika', 'Pro').plan).toEqual({ result: 'does_not_establish', reason: 'plan_incomplete' })
    expect(recon(cut, 'pika', 'Standard').plan.result).toBe('does_not_establish')
  })

  test('6 — several tools, a document for only some: each tool is described; the tool without one says so', async () => {
    const d = await live(tinyPdf(PIKA_CLEAR), LIVE['pika-seller-pro'])
    const r = build([tool('pika', 'Pro'), tool('kling', 'Standard')], [{ tool_index: 0, document: d }])
    expect(r.view.reconciliation.items.map((x) => x.heading)).toEqual([T.recon_heading(1), T.recon_heading(2)])
    expect(r.view.reconciliation.items[1].rows).toEqual([
      { label: T.recon_provider_label, value: T.recon_result.not_assessed, note: T.recon_reason.no_document },
      { label: T.recon_plan_label, value: T.recon_result.not_assessed, note: T.recon_reason.no_document },
    ])
    expect(r.view.open_items.items.every((o) => o.documents === T.open_documents_some)).toBe(true)
    expect(cards(r)).toEqual(cards(build([tool('pika', 'Pro'), tool('kling', 'Standard')])))
  })

  test.each([
    ['a reseller as seller', 'Pika', documentForFixture('conflict-reseller-merchant').extraction!, 'seller_not_recognized'],
    ['a look-alike seller', 'Pika', withSeller(LIVE['pika-seller-pro'], 'Runway Financial Services LLC'), 'seller_not_recognized'],
    ['a company-suffixed seller (no suffix stripping)', 'Pika', withSeller(LIVE['pika-seller-pro'], 'Pika Labs, Inc.'), 'seller_not_recognized'],
    ['an ambiguous seller name', 'Pika', withSeller(LIVE['pika-seller-pro'], 'Nano Banana'), 'seller_ambiguous'],
    ['no seller shown', 'Pika', { ...LIVE['pika-seller-pro'], issuer_name: field('not_shown') }, 'seller_not_read'],
    ['not a billing document', 'Pika', LIVE['nonreceipt-abstract-photo'], 'not_a_billing_document'],
  ])('7 — %s does not establish the provider or the plan', async (_n, _t, ex, reason) => {
    const d = await examineUpload(PNG(7), 'x.png', { mode: 'live_model', liveCaller: scripted(ex as ReceiptExtraction) })
    const r = recon(d, 'pika', 'Pro')
    expect(r.provider).toEqual({ result: 'does_not_establish', reason })
    expect(r.plan.result).toBe('does_not_establish')
  })

  test('7b — a seller SI8 recognises as a different tool: "Appears to conflict" for the provider; the plan is not compared', async () => {
    const d = await examineUpload(PNG(8), 'x.png', { mode: 'live_model', liveCaller: scripted(withSeller(LIVE['pika-seller-pro'], 'Midjourney')) })
    expect(recon(d, 'pika', 'Pro')).toEqual(expect.objectContaining({ provider: { result: 'appears_to_conflict', reason: 'different_tool' }, plan: { result: 'does_not_establish', reason: 'seller_not_established' } }))
  })

  test('a tool outside SI8’s list, or a document that was not read: not assessed', async () => {
    const d = await live(tinyPdf(PIKA_CLEAR), LIVE['pika-seller-pro'])
    expect(recon(d, null, 'Pro')).toEqual(expect.objectContaining({ provider: { result: 'not_assessed', reason: 'tool_not_identified' }, plan: { result: 'not_assessed', reason: 'tool_not_identified' } }))
    const unread = await examineUpload(new Uint8Array(Buffer.from('not a document')), 'fake.pdf', { mode: 'fixture_replay' })
    expect(recon(unread, 'pika', 'Pro').provider).toEqual({ result: 'not_assessed', reason: 'document_not_read' })
  })
})

describe('Option C — the Runway conflicting-plan receipt (adversarial)', () => {
  const RUNWAY_LIVE = LIVE['conflict-two-plan-names'] // live reading: only "Pro Plan (Monthly)"; the title plan "Standard" omitted
  test('the recorded live reading (seller "Runway AI, Inc."): no consistency and no conflict, for either declared plan', async () => {
    const d = await live(tinyPdf(CONFLICT_LINES), RUNWAY_LIVE)
    for (const plan of ['Pro', 'Standard']) {
      const r = build([tool('runway-gen3', plan)], [{ tool_index: 0, document: d }])
      expect(r.view.trace.evidence_reconciliation[0]).toEqual(expect.objectContaining({ provider: { result: 'does_not_establish', reason: 'seller_not_recognized' }, plan: { result: 'does_not_establish', reason: 'seller_not_established' } }))
      expect(JSON.stringify(r.view.reconciliation)).not.toMatch(/Appears (consistent|to conflict)/)
      expect(r.guidance.facts.provenance.plans.map((p) => p.declared)).toEqual([plan])
    }
  })
  test('the same incomplete reading with a recognisable seller is never unqualified: any "appears" result carries its limitation', async () => {
    const d = await live(tinyPdf(['Runway', ...CONFLICT_LINES.slice(1)]), withSeller(RUNWAY_LIVE, 'Runway'))
    const pro = build([tool('runway-gen3', 'Pro')], [{ tool_index: 0, document: d }])
    expect(pro.view.trace.evidence_reconciliation[0].plan).toEqual({ result: 'appears_consistent', reason: 'same_plan_name' })
    expect(pro.view.reconciliation.items[0].rows[1].note).toContain('does not rule out another plan')
    const std = build([tool('runway-gen3', 'Standard')], [{ tool_index: 0, document: d }])
    expect(std.view.trace.evidence_reconciliation[0].plan).toEqual({ result: 'appears_to_conflict', reason: 'different_plan_name' })
    expect(std.view.reconciliation.items[0].rows[1].note).toContain('may be incomplete or wrong. Your answer has not been changed')
    expectQualified(pro)
    expectQualified(std)
  })
  test('the recorded ground truth (both plans listed, plan ambiguous): does not establish', () => {
    const d = documentForFixture('conflict-two-plan-names')
    expect(recon(d, 'runway-gen3', 'Pro').plan.result).toBe('does_not_establish')
    expect(recon({ ...d, extraction: withSeller(d.extraction!, 'Runway') }, 'runway-gen3', 'Pro').plan).toEqual({ result: 'does_not_establish', reason: 'plan_not_read' })
  })
})

describe('Option C — invariants', () => {
  const docs = async () => [
    await live(tinyPdf(PIKA_CLEAR), LIVE['pika-seller-pro']),
    await live(tinyPdf(['Pika', 'RECEIPT', 'Standard $8.00']), withPlan(LIVE['pika-seller-pro'], 'Standard', 'Standard $8.00')),
    await live(tinyPdf(CONFLICT_LINES), LIVE['conflict-two-plan-names']),
    await examineUpload(PNG(3), 's.png', { mode: 'live_model', liveCaller: scripted(LIVE['shot-truncated-plan-name']) }),
    documentForFixture('pdf-pika-pro-no-period'),
    documentForFixture('conflict-reseller-merchant'),
  ]
  test('document observations never alter declarations, and guidance is identical with or without any document', async () => {
    for (const plan of ['Pro', 'Standard', 'not_sure', 'Enterprise']) {
      const base = build([tool('pika', plan)])
      for (const d of await docs()) {
        const r = build([tool('pika', plan)], [{ tool_index: 0, document: d }])
        expect(r.view.declarations).toEqual(base.view.declarations)
        expect(r.view.guidance).toEqual(base.view.guidance)
        expect(r.guidance.facts).toEqual(base.guidance.facts)
      }
    }
  })
  test('no code path sets an answer from a document: no adoption remains in the questionnaire, panel or public client', () => {
    for (const f of ['components/creator-record/CreatorRecordQuestionnaire.tsx', 'components/creator-record/DocumentReviewPanel.tsx', 'app/uat/creator-record-v2/PublicUatClient.tsx', 'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx', 'lib/creator-record/evidence/document-observations.ts']) {
      const code = readFileSync(path.join(APP, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      expect([f, /adopt|onReview|review\s*:/i.test(code)]).toEqual([f, false])
    }
  })
  test('reconciliation wording: "consistent" only as "Appears consistent"; no verification, approval or rights words', () => {
    const texts = Object.entries(T).filter(([k]) => k.startsWith('recon_') || k === 'section_reconciliation').map(([, v]) => (typeof v === 'function' ? (v as (n: number) => string)(1) : JSON.stringify(v)))
    for (const t of texts) {
      expect(t.replace(/Appears consistent/g, '')).not.toMatch(/\bconsistent\b/i)
      expect(t).not.toMatch(/verif|confirm|\bmatch|\bprov(e|en|es)\b|certif|clearance|\bcleared\b|approv|complian|licensed to|permitted to|\bsafe to\b/i)
    }
  })
})

describe('Option C — server trust boundary', () => {
  test('a returned document must carry the "not run" cross-check; a forged cross-check result is refused', () => {
    const d = documentForFixture('pdf-pika-pro-no-period')
    expect(verifyReturnedDocument({ tool_index: 0, document: d })).toBe(true)
    for (const cc of [
      { version: PLAN_CROSS_CHECK_VERSION, status: 'no_other_plan_names_found' as const, other_plan_names: [], reason: null, provider: 'pika' },
      { version: PLAN_CROSS_CHECK_VERSION, status: 'other_plan_names_found' as const, other_plan_names: [{ name: 'Standard', excerpt: 'Standard' }], reason: null, provider: 'pika' },
      { ...notRun('x'), provider: 'pika' },
    ]) {
      expect(verifyReturnedDocument({ tool_index: 0, document: { ...d, cross_check: cc } })).toBe(false)
    }
  })
  test('reconciliation is computed by the server from the declarations; nothing in a request can set it', async () => {
    const src = readFileSync(path.join(APP, 'lib', 'creator-record', 'prototype', 'build-draft.ts'), 'utf8')
    expect(src).toMatch(/reconcileToolEvidence\(/)
    expect(readFileSync(path.join(APP, 'lib', 'creator-record', 'prototype', 'parse-form-state.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/reconcil/i)
  })
})
