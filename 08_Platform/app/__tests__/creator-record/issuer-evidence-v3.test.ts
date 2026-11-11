/**
 * CRV2-IA-4D2 — issuer evidence contract v3: derivation, validation, compatibility, fail-closed consumers, inactivity and the
 * evaluation scorer. Deterministic; no model call, no network.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { reconcileToolEvidence, type ExaminedDocument } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { ISSUER_EVIDENCE_FIXTURES, type IssuerEvidenceDocumentFixture } from '@/lib/creator-record/eval/issuer-evidence-fixtures'
import { scoreIssuerEvidence } from '@/lib/creator-record/eval/score-issuer-evidence'
import { RECEIPT_PROFILE, RECEIPT_PROFILE_V2_INACTIVE, receiptObservationsV3 } from '@/lib/creator-record/examination/receipt-profile'
import { receiptReadingOf } from '@/lib/creator-record/examination/receipt-reading'
import { CURRENT_ISSUANCE_SUPPORT } from '@/lib/creator-record/customer-record/governance-state'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY } from '@/lib/creator-record/governed/sources'
import { resolveSellerIdentity } from '@/lib/creator-record/integration/seller-identity'
import {
  deriveIssuerEvidence,
  issuerEvidenceOf,
  validateIssuerStatements,
  type IssuerStatement,
} from '@/lib/creator-record/receipt-examination/issuer-evidence'
import { RECEIPT_EXAMINATION_SYSTEM_PROMPT, RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3, RECEIPT_PROMPT_VERSION } from '@/lib/creator-record/receipt-examination/prompt'
import {
  RECEIPT_EXTRACTION_SCHEMA,
  RECEIPT_EXTRACTION_SCHEMA_V3,
  RECEIPT_EXTRACTION_SCHEMA_VERSION,
  validateReceiptExtraction,
  validateReceiptExtractionV3,
  type ReceiptExtraction,
} from '@/lib/creator-record/receipt-examination/schema'

const st = (business: string, role: IssuerStatement['role'], evidence = business): IssuerStatement => ({ business, role, evidence })
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

/** A v3 model output for a fixture: what a CORRECT reading reports (statements with excerpts from the printed lines). */
function correctOutput(f: IssuerEvidenceDocumentFixture, over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const line = (b: string) => f.lines.find((l) => l.toLowerCase().includes(b.toLowerCase())) ?? b
  return {
    document_type: 'receipt',
    readability: 'legible',
    product_or_plan_name: { status: 'not_shown', value: null, evidence: null },
    transaction_date: { status: 'present', value: '2026-10-01', evidence: 'Date: October 1, 2026' },
    service_period_start: { status: 'not_shown', value: null, evidence: null },
    service_period_end: { status: 'not_shown', value: null, evidence: null },
    plan_candidates: [],
    multiple_plans_shown: false,
    instruction_like_text_present: false,
    issuer_statements: f.truth.statements.map((s) => ({ business: s.business, role: s.role, evidence: line(s.role === 'issuer_denied' ? 'not issued by' : s.business) })),
    ...over,
  }
}
const docFixtures = ISSUER_EVIDENCE_FIXTURES.filter((f): f is IssuerEvidenceDocumentFixture => f.kind === 'document')
const historical = ISSUER_EVIDENCE_FIXTURES.find((f) => f.kind === 'historical_v2_reading')!
if (historical.kind !== 'historical_v2_reading') throw new Error('fixture')

describe('derivation (fixed rules, spelling-normalised business identity)', () => {
  test.each([
    ['no statement', [], 'missing', null],
    ['a provider or product mention only', [st('Runway', 'mentioned_only')], 'not_attributed', null],
    ['a letterhead or sender alone', [st('Delta Video Services Ltd', 'sender_only')], 'not_attributed', null],
    ['one explicit attribution', [st('Northwind Ltd', 'issuer_attribution')], 'identified', 'Northwind Ltd'],
    ['sender A and merchant B are not a conflict', [st('Gamma Agency', 'sender_only'), st('Pika Labs, Inc.', 'issuer_attribution')], 'identified', 'Pika Labs, Inc.'],
    ['an attribution plus a mention of another business', [st('ResellerHub', 'issuer_attribution'), st('Runway', 'mentioned_only')], 'identified', 'ResellerHub'],
    ['the same business attributed twice (spelling-normalised)', [st('Alpha Media Ltd', 'issuer_attribution'), st('alpha  media ltd', 'issuer_attribution')], 'identified', 'Alpha Media Ltd'],
    ['two different businesses attributed', [st('Alpha Media Ltd', 'issuer_attribution'), st('Beta Studio GmbH', 'issuer_attribution')], 'conflicting', null],
    ['a business both attributed and denied', [st('Runway', 'issuer_attribution'), st('Runway', 'issuer_denied')], 'conflicting', null],
    ['a denial (with a mention of the same business)', [st('Runway', 'mentioned_only'), st('Runway', 'issuer_denied')], 'denied', null],
    ['an attribution of A and a denial of B', [st('Alpha', 'issuer_attribution'), st('Beta', 'issuer_denied')], 'identified', 'Alpha'],
  ] as const)('%s → %s', (_n, statements, state, business) => {
    const r = deriveIssuerEvidence(statements as unknown as IssuerStatement[])
    expect(r.state).toBe(state)
    expect(r.business).toBe(business)
  })

  test('a reading without issuer evidence (every reading before v3) is unclassified', () => {
    expect(issuerEvidenceOf(historical.reading)).toEqual({ state: 'unclassified', business: null, evidence: null })
    expect(issuerEvidenceOf({ issuer_evidence: { contract: 'receipt-extraction-v9' as never, statements: [] } }).state).toBe('unclassified')
  })
})

describe('v3 validation (strict, non-repairing)', () => {
  const f = docFixtures.find((x) => x.id === 'iev3-explicit-merchant')!
  test('a correct v3 output validates; issuer_name is DERIVED from the statements', () => {
    const r = validateReceiptExtractionV3(correctOutput(f))!
    expect(r.issuer_name).toEqual({ status: 'present', value: 'Northwind Studio Tools Ltd', evidence: 'Merchant of record: Northwind Studio Tools Ltd' })
    expect(r.issuer_evidence!.contract).toBe('receipt-extraction-v3')
  })
  test.each([
    ['a model-reported issuer_name', { issuer_name: { status: 'present', value: 'X', evidence: 'X' } }],
    ['an unknown role', { issuer_statements: [{ business: 'X', role: 'issuer', evidence: 'X' }] }],
    ['an excerpt that does not contain the business', { issuer_statements: [{ business: 'Runway', role: 'mentioned_only', evidence: 'Plan: Standard' }] }],
    ['an extra key on a statement', { issuer_statements: [{ business: 'X', role: 'mentioned_only', evidence: 'X', note: 'y' }] }],
    ['too many statements', { issuer_statements: Array.from({ length: 7 }, (_, i) => ({ business: `B${i}`, role: 'mentioned_only', evidence: `B${i}` })) }],
    ['missing statements', { issuer_statements: undefined }],
    ['an empty business', { issuer_statements: [{ business: ' ', role: 'mentioned_only', evidence: 'x' }] }],
  ] as [string, Record<string, unknown>][])('refuses %s', (_n, over) => {
    const raw = correctOutput(f, over)
    if ('issuer_statements' in over && over.issuer_statements === undefined) delete raw.issuer_statements
    expect(validateReceiptExtractionV3(raw)).toBeNull()
  })
  test('a v2 output is not a v3 output, and a v3 output is not a v2 output', () => {
    expect(validateReceiptExtractionV3({ ...historical.reading })).toBeNull()
    expect(validateReceiptExtraction(correctOutput(f))).toBeNull()
    expect(validateIssuerStatements([{ business: 'X', role: 'mentioned_only', evidence: 'Sold: X' }])).toEqual([st('X', 'mentioned_only', 'Sold: X')])
  })
  test('the v3 output schema has no issuer_name and requires issuer_statements; v2 is unchanged', () => {
    expect(Object.keys(RECEIPT_EXTRACTION_SCHEMA_V3.properties)).not.toContain('issuer_name')
    expect(RECEIPT_EXTRACTION_SCHEMA_V3.required).toContain('issuer_statements')
    expect(Object.keys(RECEIPT_EXTRACTION_SCHEMA.properties)).toContain('issuer_name')
    expect(RECEIPT_EXTRACTION_SCHEMA_VERSION).toBe('receipt-extraction-v2')
  })
  test('prompt v3 replaces only the issuer rule; prompt v2 is unchanged', () => {
    expect(RECEIPT_PROMPT_VERSION).toBe('receipt-prompt-v2')
    expect(RECEIPT_EXAMINATION_SYSTEM_PROMPT).toMatch(/^- issuer_name: /m)
    expect(RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3).not.toMatch(/^- issuer_name: /m)
    expect(RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3).toMatch(/^- issuer_statements: /m)
    const strip = (p: string) => p.split('\n').filter((l) => !/^- issuer_|^ {2}- (issuer_attribution|sender_only|issuer_denied|mentioned_only):|^ {2}business is the name only/.test(l))
    expect(strip(RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3)).toEqual(strip(RECEIPT_EXAMINATION_SYSTEM_PROMPT))
  })
})

describe('compatibility: v2 readings and envelopes are unchanged; v3 round-trips exactly', () => {
  test('profile v1 still reads a v2 recorded output exactly as before (no issuer evidence added)', async () => {
    const r = await RECEIPT_PROFILE.readRecorded(PNG, historical.reading)
    expect(r.status).toBe('examined')
    if (r.status !== 'examined') return
    expect(r.observations.some((o) => o.field === 'issuer_statement')).toBe(false)
    const envelope = { outcome: { status: 'examined' }, profile: { id: 'receipt', version: 1, schema: 'receipt-extraction-v2' }, observations: r.observations }
    const back = receiptReadingOf(envelope)!
    expect(back).toEqual(historical.reading)
    expect('issuer_evidence' in back).toBe(false)
    expect(issuerEvidenceOf(back).state).toBe('unclassified')
  })

  test.each(docFixtures.map((f) => [f.id, f] as const))('profile v2 (inactive) reads %s; the envelope round-trips to the same reading and state', async (_id, f) => {
    const r = await RECEIPT_PROFILE_V2_INACTIVE.readRecorded(PNG, correctOutput(f))
    expect(r.status).toBe('examined')
    if (r.status !== 'examined') return
    const envelope = { outcome: { status: 'examined' }, profile: { id: 'receipt', version: 2, schema: 'receipt-extraction-v3' }, observations: r.observations }
    const back = receiptReadingOf(envelope)!
    expect(back).not.toBeNull()
    expect(issuerEvidenceOf(back).state).toBe(f.truth.state)
    expect(receiptObservationsV3(back)).toEqual(r.observations)
  })

  test('a tampered v3 envelope (derived issuer_name edited) is not recoverable', async () => {
    const f = docFixtures.find((x) => x.id === 'iev3-provider-label-only')!
    const r = await RECEIPT_PROFILE_V2_INACTIVE.readRecorded(PNG, correctOutput(f))
    if (r.status !== 'examined') throw new Error('examined')
    const observations = r.observations.map((o) => (o.field === 'issuer_name' ? { ...o, status: 'present' as const, value: 'Runway', excerpt: 'Provider: Runway' } : o))
    expect(receiptReadingOf({ outcome: { status: 'examined' }, profile: { id: 'receipt', version: 2, schema: 'receipt-extraction-v3' }, observations })).toBeNull()
  })

  test('the profiles differ only by version, schema and prompt', () => {
    expect(RECEIPT_PROFILE.ref).toEqual({ id: 'receipt', version: 1, schema: 'receipt-extraction-v2', prompt: 'receipt-prompt-v2' })
    expect(RECEIPT_PROFILE_V2_INACTIVE.ref).toEqual({ id: 'receipt', version: 2, schema: 'receipt-extraction-v3', prompt: 'receipt-prompt-v3' })
  })
})

describe('fail-closed consumers (one shared rule)', () => {
  const doc = (ex: ReceiptExtraction): ExaminedDocument => ({
    document_id: 'DOC-IEV3', file_name: 'x.pdf', sha256: 'a'.repeat(64), bytes: 1, detected_media_type: 'application/pdf', outcome: 'document_examined', reason: null,
    extraction_mode: 'fixture_replay', replay_fixture_id: 'x', versions: { schema: 'receipt-extraction-v3', prompt: 'receipt-prompt-v3', replay_set: 'x' }, model_calls: 0, extraction: ex,
    cross_check: { version: 'x', status: 'not_run', other_plan_names: [], reason: 'test', provider: null } as never,
  })
  const v3 = (statements: IssuerStatement[], plan = 'Pro'): ReceiptExtraction => {
    const base = validateReceiptExtractionV3({
      document_type: 'receipt', readability: 'legible',
      product_or_plan_name: { status: 'present', value: plan, evidence: `Plan: ${plan}` },
      transaction_date: { status: 'present', value: '2026-10-01', evidence: 'Date: October 1, 2026' },
      service_period_start: { status: 'not_shown', value: null, evidence: null }, service_period_end: { status: 'not_shown', value: null, evidence: null },
      plan_candidates: [{ text: plan, evidence: `Plan: ${plan}`, context: 'charge_line' }], multiple_plans_shown: false, instruction_like_text_present: false,
      issuer_statements: statements,
    })
    if (!base) throw new Error('v3 fixture invalid')
    return base
  }
  const recon = (ex: ReceiptExtraction, tool = 'pika', plan = 'Pro') => reconcileToolEvidence({ tool_index: 0, document: doc(ex), declared_tool_id: tool, declared_plan: plan }, resolveSellerIdentity)

  test.each([
    ['a historical v2 reading (even one naming the declared tool)', () => ({ ...historical.reading, issuer_name: { status: 'present' as const, value: 'Pika', evidence: 'Provider: Pika' } }), 'issuer_basis_unavailable'],
    ['a provider mention only', () => v3([st('Pika', 'mentioned_only', 'Provider: Pika')]), 'seller_not_read'],
    ['a sender or letterhead only', () => v3([st('Pika', 'sender_only')]), 'seller_not_read'],
    ['a denial', () => v3([st('Pika', 'mentioned_only', 'Provider: Pika'), st('Pika', 'issuer_denied', 'not issued by Pika')]), 'issuer_denied'],
    ['competing attributions', () => v3([st('Pika', 'issuer_attribution', 'Billed by: Pika'), st('Kling', 'issuer_attribution', 'Issued by: Kling')]), 'issuer_conflicting'],
    ['no business named', () => v3([]), 'seller_not_read'],
  ])('%s never establishes the provider, so the plan is never compared', (_n, ex, reason) => {
    const r = recon(ex())
    expect(r.provider).toEqual({ result: 'does_not_establish', reason })
    expect(r.plan).toEqual({ result: 'does_not_establish', reason: 'seller_not_established' })
  })

  test('only an explicit attribution of a recognised business establishes the provider; the plan is then compared as before', () => {
    expect(recon(v3([st('Pika', 'issuer_attribution', 'Billed by: Pika')]))).toEqual(expect.objectContaining({ provider: { result: 'appears_consistent', reason: 'same_tool' }, plan: { result: 'appears_consistent', reason: 'same_plan_name' } }))
    expect(recon(v3([st('Pika', 'issuer_attribution', 'Billed by: Pika')], 'Standard')).plan).toEqual({ result: 'appears_to_conflict', reason: 'different_plan_name' })
    expect(recon(v3([st('Gamma Agency', 'sender_only'), st('Pika', 'issuer_attribution', 'Billed by: Pika')])).provider).toEqual({ result: 'appears_consistent', reason: 'same_tool' })
    expect(recon(v3([st('Kling', 'issuer_attribution', 'Billed by: Kling')])).provider).toEqual({ result: 'appears_to_conflict', reason: 'different_tool' })
    expect(recon(v3([st('ResellerHub Payments Ltd', 'issuer_attribution'), st('Pika', 'mentioned_only', 'Item: Pika Pro')])).provider).toEqual({ result: 'does_not_establish', reason: 'seller_not_recognized' })
  })

  test('plan scoping gets no issuer from a v2 reading (the cross-check cannot be scoped by an unsupported issuer)', async () => {
    const seen: (string | null)[] = []
    const reading = { ...historical.reading, issuer_name: { status: 'present' as const, value: 'Pika', evidence: 'Provider: Pika' } }
    await examineUpload(PNG, 'x.png', { mode: 'live_model', liveCaller: async () => ({ id: 'x', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 0, output_tokens: 0 }, parsed_output: reading }) as never, planScope: (s: string | null) => { seen.push(s); return { status: 'unavailable', reason: 'test' } as never } } as never)
    expect(seen).toEqual([null])
  })
})

describe('the v3 profile is inactive for customers', () => {
  const APP = path.join(__dirname, '..', '..')
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((f) => {
      const p = path.join(d, f)
      if (['node_modules', '.next', '__tests__'].includes(f)) return []
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
    })
  const runtime = [...walk(path.join(APP, 'lib')), ...walk(path.join(APP, 'app'))]
  const rel = (f: string) => path.relative(APP, f).split(path.sep).join('/')

  test('only its own definition and the exact reading inversion reference the v3 profile, contract, prompt or validator', () => {
    const refs = (re: RegExp) => runtime.filter((f) => re.test(readFileSync(f, 'utf8'))).map(rel).sort()
    // CRV2-IA-4D3 S2b: the synthetic evaluation runner (eval/, which no app path imports) and the live caller's fixed contract table
    // now reference the v3 contract. No app path selects it: only the evaluation runner passes `readingContract` (pinned below).
    expect(refs(/RECEIPT_PROFILE_V2_INACTIVE|RECEIPT_READING_CONTRACT_V3/)).toEqual(['lib/creator-record/eval/run-receipt-eval.ts', 'lib/creator-record/examination/receipt-profile.ts'])
    expect(refs(/RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3/)).toEqual(['lib/creator-record/eval/run-receipt-eval.ts', 'lib/creator-record/receipt-examination/examine.anthropic.ts', 'lib/creator-record/receipt-examination/prompt.ts'])
    expect(refs(/validateReceiptExtractionV3/)).toEqual(['lib/creator-record/examination/receipt-profile.ts', 'lib/creator-record/examination/receipt-reading.ts', 'lib/creator-record/receipt-examination/schema.ts'])
    expect(refs(/RECEIPT_EXTRACTION_SCHEMA_V3\b/)).toEqual(['lib/creator-record/eval/run-receipt-eval.ts', 'lib/creator-record/receipt-examination/examine.anthropic.ts', 'lib/creator-record/receipt-examination/schema.ts'])
    // The app's live callers (evidence/live-caller.ts, live-examination/real-executor.ts) pass no contract, so they still send v2.
    expect(refs(/readingContract/)).toEqual(['lib/creator-record/eval/run-receipt-eval.ts', 'lib/creator-record/receipt-examination/examine.anthropic.ts'])
  })

  test('the supported issuance methods are unchanged (v2 reading method only)', () => {
    expect(CURRENT_ISSUANCE_SUPPORT.examination_methods).toEqual([
      { origin: 'live_model', provider: 'anthropic', model: 'claude-sonnet-5', profile: { id: 'receipt', version: 1, schema: 'receipt-extraction-v2', prompt: 'receipt-prompt-v2' } },
    ])
  })

  test('the approved customer templates carry no label for v3 statements, so a v3 reading cannot be printed (fail closed)', () => {
    const b = CREATOR_RECORD_GOVERNANCE_AUTHORITY
    const all = JSON.stringify([b.pdf_templates, ...(b.pdf_template_sets ?? []).map((s) => s.templates)])
    expect(all).not.toMatch(/"issuer_statement"|"issuer_attribution"|"sender_only"|"issuer_denied"|"mentioned_only"/)
  })
})

describe('evaluation scorer and gates (no model call)', () => {
  const perfect = () => new Map(docFixtures.map((f) => [f.id, validateReceiptExtractionV3(correctOutput(f))]))

  test('every fixture has a valid correct v3 reading, and correct readings PASS every gate', () => {
    for (const [id, r] of Array.from(perfect())) expect([id, r !== null]).toEqual([id, true])
    const s = scoreIssuerEvidence(perfect())
    expect(s.gates.filter((g) => !g.passed)).toEqual([])
    expect(s.verdict).toBe('PASS')
  })

  test('the fixtures cover every required case', () => {
    expect(ISSUER_EVIDENCE_FIXTURES.map((f) => f.case)).toEqual(expect.arrayContaining([
      'Provider or product mention without issuer attribution', 'Explicit issuer or billing attribution', 'Issuer disclaimer', 'Genuine competing issuer assertions',
      'Sender distinct from merchant', 'Reseller-issued receipt', 'App-store merchant', 'Historical v2 reading without issuer basis',
    ]))
  })

  test.each([
    ['a provider mention read as the issuer', 'iev3-provider-label-only', [{ business: 'Runway', role: 'issuer_attribution', evidence: 'Provider: Runway' }], 'false_identified'],
    ['a disclaimed business read as the issuer', 'iev3-issuer-disclaimer', [{ business: 'Runway', role: 'issuer_attribution', evidence: 'Provider: Runway' }], 'denial_identified'],
    ['a sender read as the issuer', 'iev3-sender-only', [{ business: 'Delta Video Services Ltd', role: 'issuer_attribution', evidence: 'Delta Video Services Ltd' }], 'false_identified'],
    ['the wrong business identified', 'iev3-reseller-issued', [{ business: 'Runway', role: 'issuer_attribution', evidence: 'Item: Runway Pro (12 months, resold)' }], 'false_identified'],
  ])('%s FAILS the critical gate', (_n, id, statements, gate) => {
    const readings = perfect()
    const f = docFixtures.find((x) => x.id === id)!
    readings.set(id, validateReceiptExtractionV3(correctOutput(f, { issuer_statements: statements })))
    const s = scoreIssuerEvidence(readings)
    expect(s.gates.find((g) => g.id === gate)!.passed).toBe(false)
    expect(s.verdict).toBe('FAIL')
  })

  test('a v2 reading in a v3 evaluation, or a missing reading, FAILS', () => {
    const a = perfect()
    a.set('iev3-explicit-merchant', historical.reading)
    expect(scoreIssuerEvidence(a).gates.find((g) => g.id === 'v3_readings')!.passed).toBe(false)
    const b = perfect()
    b.delete('iev3-explicit-merchant')
    expect(scoreIssuerEvidence(b).gates.find((g) => g.id === 'readings_complete')!.passed).toBe(false)
  })
})
