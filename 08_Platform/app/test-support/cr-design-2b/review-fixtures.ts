/**
 * CR-DESIGN-2B — TEST ONLY. The thirteen review cases (P1–P13 of CR-DESIGN-2A `05-CR-DESIGN-2B-ACCEPTANCE-CRITERIA.md`).
 *
 * Records are built by the REAL record builder from the CURRENT governed sources (registry, ledger and wording approved for
 * Production: `approvedCustomerRecordInputs`), except P13, which needs the pilot sources' topic-qualified case. Model readings are made
 * by the REAL customer live entry point with a FAKE model behind the adapter seam (no network, no provider, no key): every document,
 * receipt text and reading value is SYNTHETIC. Answers, titles and file names are synthetic. Nothing here is product behaviour.
 */
import { createHash, randomUUID } from 'node:crypto'
import { approvedCustomerRecordInputs } from '@/lib/creator-record/customer-flow/approved-inputs'
import { examinationProjectionFor } from '@/lib/creator-record/customer-flow/examination'
import { buildCustomerRecord } from '@/lib/creator-record/customer-record/record'
import type { EvidenceCategory } from '@/lib/creator-record/evidence-intake/vocabulary'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { examineCustomerDocumentLive, type CustomerLivePorts } from '@/lib/creator-record/live-examination/customer'
import { parseLiveEnvelope } from '@/lib/creator-record/live-examination/envelope'
import type { CustomerLiveAttemptRow } from '@/lib/creator-record/live-examination/projection'
import type { LiveAnthropicAdapter } from '@/lib/creator-record/live-examination/real-executor'
import { sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { READINESS_SCENARIOS } from '@/test-support/readiness-scenarios'
import { syntheticTextPdf } from '@/test-support/synthetic-pdf'

export interface ReviewCase {
  id: string
  title: string
  schema: 7 | 8
  /** What in this case is synthetic (shown on the review index). */
  synthetic: string[]
  record: { canonical: string; sha256: string }
}

const OWNER = '11111111-1111-4111-8111-111111111111'
const NOW = new Date('2026-11-14T15:00:00.000Z')
const AS_OF = '2026-11-14'
const ACK = { A1: true, A2: true }
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const RUNWAY = { T1: ['runway-gen3'], T3: ['Pro'], T4: ['October 2026'] }
const HIGGSFIELD = { T1: ['higgsfield'], T3: ['Creator'], T4: ['October 2026'] }
const BASE = { P3: ['own_channels', 'paid_advertising'], F1: ['TW'], F2: ['online_worldwide'], F3: ['US'], L1: ['no'], M0: ['none'], H1: ['edited'] }

type Doc = { document_id: string; sha256: string; media_type: 'application/pdf'; byte_size: number; file_name: string; category: EvidenceCategory; tool_index: number | null }

/** One synthetic receipt PDF and a fake-model reading of it, through the real live entry point. `invalid` makes the reading fail. */
async function liveReading(documentId: string, text: string, output: Record<string, unknown> | 'invalid'): Promise<{ attempt: CustomerLiveAttemptRow; bytes: Uint8Array }> {
  const bytes = syntheticTextPdf(text)
  const rows: CustomerLiveAttemptRow[] = []
  const sha = createHash('sha256').update(bytes).digest('hex')
  const adapter: LiveAnthropicAdapter = {
    createAnthropicReceiptCaller: (o) => async () => ({ id: 'msg_review_fake', model: o.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 3000, output_tokens: 400 }, parsed_output: output === 'invalid' ? { not: 'a reading' } : output }) as never,
    classifyAnthropicFailure: () => 'server_error',
  }
  const ports: CustomerLivePorts = {
    getDocument: async (id) => (id === documentId ? { id: documentId, user_id: OWNER, sha256: sha, media_type: 'application/pdf', byte_size: bytes.length, state: 'stored' } : null),
    logLiveRead: async () => 1,
    readObject: async () => bytes,
    listLiveAttempts: async () => clone(rows),
    reserve: async () => randomUUID(),
    async record(reservationId, raw) {
      const e = parseLiveEnvelope(JSON.parse(raw))!
      const id = randomUUID()
      rows.push({
        id, attempt_number: rows.length + 1, examination_key: e.examination_key, document_id: documentId, user_id: OWNER, document_sha256: e.document.sha256,
        envelope_version: e.envelope.version, execution_origin: e.execution_origin, content_class: e.content_class, profile_id: e.profile.id, profile_version: e.profile.version,
        schema_version: e.profile.schema, prompt_version: e.profile.prompt, executor_mode: e.executor.mode, provider: e.executor.provider, model: e.executor.model,
        outcome_status: e.outcome.status, outcome_reason: e.outcome.reason, executed_at: e.executed_at, envelope_canonical: raw, envelope_sha256: sha256Hex(raw),
        access_log_id: 1, created_at: NOW.toISOString(), reservation_id: reservationId,
      })
      return { attempt_id: id, result: 'created' }
    },
    settle: async (_r, charged) => charged,
  }
  await examineCustomerDocumentLive({ ports, isKnownSyntheticFixture: () => false, now: () => NOW, executorOptions: { env: { CREATOR_RECORD_EXTRACTION_API_KEY: 'test-key-not-real' }, loadAdapter: async () => adapter } }, OWNER, documentId)
  const attempt = rows[rows.length - 1]
  if (!attempt) throw new Error('fixture: no reading recorded')
  return { attempt, bytes }
}

/** A synthetic Runway receipt reading, modelled on the CR-2026-7E82CA09 reading (values marked synthetic). */
const RUNWAY_READING = {
  ...clone(REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-pika-pro-no-period')!.parsed_output as Record<string, unknown>),
  document_type: 'subscription_confirmation',
  readability: 'legible',
  issuer_name: { status: 'present', value: 'Runway (synthetic)', evidence: 'Runway (synthetic)' },
  product_or_plan_name: { status: 'present', value: 'Runway Standard (SYNTHETIC TEST PLAN LABEL)', evidence: 'Plan: Runway Standard (SYNTHETIC TEST PLAN LABEL)' },
  transaction_date: { status: 'present', value: '2026-10-01', evidence: 'Receipt date: October 1, 2026 (synthetic)' },
  service_period_start: { status: 'present', value: '2026-10-01', evidence: 'Billing period: October 1, 2026 – October 31, 2026' },
  service_period_end: { status: 'present', value: '2026-10-31', evidence: 'Billing period: October 1, 2026 – October 31, 2026' },
  plan_candidates: [{ text: 'Runway Standard (SYNTHETIC TEST PLAN LABEL)', evidence: 'Plan: Runway Standard (SYNTHETIC TEST PLAN LABEL)', context: 'account_detail' }],
  multiple_plans_shown: false,
  instruction_like_text_present: true,
}

async function record(id: string, answers: Record<string, string[]>, tools: Record<string, string[]>[], o: { docs?: { doc: Doc; reading?: CustomerLiveAttemptRow }[]; responses?: (doc: string) => unknown[] } = {}) {
  const i = approvedCustomerRecordInputs(GOV as never)
  const docs = o.docs ?? []
  const examinations = []
  for (const d of docs) {
    if (!d.reading) continue
    const p = await examinationProjectionFor({ listRuns: async () => [] }, OWNER, d.doc.document_id, undefined, { listAttempts: async () => [clone(d.reading!)] })
    if (p.kind !== 'projection') throw new Error(`fixture projection: ${JSON.stringify(p)}`)
    examinations.push({ document_id: d.doc.document_id, projection: p.projection })
  }
  const schema8 = examinations.length > 0
  const built = buildCustomerRecord({
    state: { answers, tools, acknowledgements: ACK } as never,
    sources: i.sources as never,
    source_text: (schema8 ? i.source_text_examination : i.source_text) as never,
    topicClaims: CLAIMS, as_of: AS_OF,
    record: { record_id: `PREP-${id}`, record_version: 1, captured_at: NOW.toISOString() },
    documents: docs.map((d) => d.doc),
    ...(schema8 ? { examinations } : {}),
    ...(o.responses && docs[0]?.reading ? { responses: o.responses(docs[0].doc.document_id) as never } : {}),
  })
  if (!built.ok) throw new Error(`fixture ${id}: ${JSON.stringify(built).slice(0, 600)}`)
  return { canonical: built.canonical, sha256: built.sha256 }
}

const docOf = (n: number, bytes: Uint8Array, file_name: string, tool_index: number | null, category: EvidenceCategory = 'billing_receipt'): Doc => ({
  document_id: `33333333-3333-4333-8333-3333333330${String(n).padStart(2, '0')}`, sha256: createHash('sha256').update(bytes).digest('hex'),
  media_type: 'application/pdf', byte_size: bytes.length, file_name, category, tool_index,
})

export async function reviewCases(): Promise<ReviewCase[]> {
  const cases: ReviewCase[] = []
  const add = (c: ReviewCase) => cases.push(c)

  add({ id: 'P1', title: 'Schema 7, no documents, Runway guidance', schema: 7, synthetic: ['answers and title'],
    record: await record('2B-P1', { ...BASE, P1: ['Urban Futures — synthetic review record'] }, [RUNWAY]) })

  const inv1 = syntheticTextPdf('SYNTHETIC receipt for review only')
  const inv2 = syntheticTextPdf('SYNTHETIC licence for review only')
  add({ id: 'P2', title: 'Schema 7 with documents (inventory, not examined)', schema: 7, synthetic: ['answers', 'both documents'],
    record: await record('2B-P2', { ...BASE, P1: ['Urban Futures — inventory case (synthetic)'] }, [RUNWAY], { docs: [{ doc: docOf(1, inv1, 'runway-receipt-synthetic.pdf', 0) }, { doc: docOf(2, inv2, 'music-licence-synthetic.pdf', null, 'licence') }] }) })

  const d3 = await liveReading('33333333-3333-4333-8333-333333333003', 'SYNTHETIC Runway receipt for review only', RUNWAY_READING)
  add({ id: 'P3', title: 'Schema 8 with one reading and one document not examined (substitute: a schema 8 record without documents cannot be built)', schema: 8, synthetic: ['answers', 'documents', 'fake-model reading'],
    record: await record('2B-P3', { ...BASE, P1: ['Urban Futures — mixed documents (synthetic)'] }, [RUNWAY], { docs: [{ doc: docOf(3, d3.bytes, 'runway-receipt-synthetic.pdf', 0), reading: d3.attempt }, { doc: docOf(4, inv2, 'music-licence-synthetic.pdf', null, 'licence') }] }) })

  const d4 = await liveReading('33333333-3333-4333-8333-333333333005', 'SYNTHETIC Runway receipt, CR-2026-7E82CA09 shape', RUNWAY_READING)
  add({ id: 'P4', title: 'Schema 8, one model reading with a plan-name qualifier, AI-addressed text and a creator response', schema: 8, synthetic: ['answers', 'document', 'fake-model reading (modelled on CR-2026-7E82CA09)', 'creator response'],
    record: await record('2B-P4', { ...BASE, P1: ['SI8-REVIEW-2026-11-15 — Urban Futures'], M0: ['music'], M1: ['artlist'], M2: ['not_sure'] }, [RUNWAY], {
      docs: [{ doc: docOf(5, d4.bytes, 'SI8-REVIEW-RUNWAY-2026-10-001_synthetic-runway-receipt.pdf', 0), reading: d4.attempt }],
      responses: () => {
        const e = parseLiveEnvelope(JSON.parse(d4.attempt.envelope_canonical))!
        const o = e.observations.find((x) => x.field === 'product_or_plan_name')!
        return [{ target: { kind: 'observation', run_id: d4.attempt.id, observation_id: o.observation_id }, code: 'reading_incorrect' }]
      },
    }) })

  add({ id: 'P5', title: 'Multiple considerations across two governed providers (Runway, Higgsfield)', schema: 7, synthetic: ['answers'],
    record: await record('2B-P5', { ...BASE, P1: ['Two-tool campaign (synthetic)'] }, [RUNWAY, HIGGSFIELD]) })

  const s4 = READINESS_SCENARIOS['4-incomplete-declarations']()
  add({ id: 'P6', title: 'Unresolved applicability (plan and dates not known)', schema: 7, synthetic: ['answers (existing readiness scenario 4)'], record: { canonical: s4.canonical, sha256: s4.sha256 } })

  add({ id: 'P7', title: 'Uncovered tool or service named (music source with no published guidance)', schema: 7, synthetic: ['answers'],
    record: await record('2B-P7', { ...BASE, P1: ['Uncovered source case (synthetic)'], M0: ['music'], M1: ['artlist'], M2: ['yes'] }, [RUNWAY]) })

  add({ id: 'P8', title: 'Unidentified provider (tool answered "Not sure")', schema: 7, synthetic: ['answers'],
    record: await record('2B-P8', { ...BASE, P1: ['Unidentified tool case (synthetic)'] }, [{ T1: ['not_sure'], T3: ['not_sure'], T4: ['October 2026'] }]) })

  add({ id: 'P9', title: 'Zero selected guidance', schema: 7, synthetic: ['answers'],
    record: await record('2B-P9', { ...BASE, P1: ['No guidance case (synthetic)'], M0: ['music'], M1: ['artlist'], M2: ['no'] }, [{ T1: ['not_sure'], T3: ['not_sure'], T4: ['not_sure'] }]) })

  const r10a = await liveReading('33333333-3333-4333-8333-333333333010', 'SYNTHETIC Runway receipt A', RUNWAY_READING)
  const r10b = await liveReading('33333333-3333-4333-8333-333333333011', 'SYNTHETIC unreadable file B', 'invalid')
  const r10c = await liveReading('33333333-3333-4333-8333-333333333012', 'SYNTHETIC Higgsfield invoice C', { ...RUNWAY_READING, issuer_name: { status: 'present', value: 'Higgsfield (synthetic)', evidence: 'Higgsfield (synthetic)' }, product_or_plan_name: { status: 'not_shown', value: null, evidence: null }, service_period_start: { status: 'not_shown', value: null, evidence: null }, service_period_end: { status: 'not_shown', value: null, evidence: null }, plan_candidates: [], readability: 'partially_legible', instruction_like_text_present: false })
  add({ id: 'P10', title: 'Multiple documents: a reading, a partly legible reading with fields not shown, and two documents not read (one after a failed attempt)', schema: 8, synthetic: ['answers', 'all four documents', 'fake-model readings'],
    record: await record('2B-P10', { ...BASE, P1: ['Multiple documents case (synthetic)'] }, [RUNWAY, HIGGSFIELD], { docs: [
      { doc: docOf(10, r10a.bytes, 'runway-receipt-A-synthetic.pdf', 0), reading: r10a.attempt },
      // A reading that failed is never carried into a record (`examinationProjectionFor`): the document is listed as not read.
      { doc: docOf(11, r10b.bytes, 'unreadable-B-synthetic.pdf', 0) },
      { doc: docOf(12, r10c.bytes, 'higgsfield-invoice-C-synthetic.pdf', 1), reading: r10c.attempt },
      { doc: docOf(13, inv2, 'licence-D-synthetic.pdf', null, 'licence') },
    ] }) })

  const longTitle = 'Urban Futures: A Long-Form Promotional Campaign Film for a Fictional Sustainable Lifestyle Brand — Director’s Extended Cut (Working Title, Subject to Change Before Final Delivery, Synthetic Review Fixture)'
  const r11 = await liveReading('33333333-3333-4333-8333-333333333014', 'SYNTHETIC long-name receipt', RUNWAY_READING)
  add({ id: 'P11', title: 'Long title, long multi-select answers, long file name, digests', schema: 8, synthetic: ['answers', 'document', 'fake-model reading'],
    record: await record('2B-P11', { ...BASE, P1: [longTitle], P3: ['own_channels', 'paid_advertising'], F2: ['online_worldwide'], H1: ['edited'] }, [RUNWAY, HIGGSFIELD], { docs: [{ doc: docOf(14, r11.bytes, 'SI8-REVIEW-RUNWAY-2026-10-001_an-exceptionally-long-synthetic-file-name-for-wrapping-checks_final-final-v3_signed_co.pdf' /* exactly the maximum the intake accepts */, 0), reading: r11.attempt }] }) })

  add({ id: 'P12', title: 'International text in the title (Traditional Chinese, Japanese, Korean, Vietnamese)', schema: 7, synthetic: ['answers and title'],
    record: await record('2B-P12', { ...BASE, P1: ['城市未來：永續生活品牌宣傳片 — 都市の未来 — 도시의 미래 — Tương lai đô thị (synthetic)'] }, [RUNWAY]) })

  const s5 = READINESS_SCENARIOS['5-unresolved-and-topic-caps']()
  add({ id: 'P13', title: 'Topic-qualified subject and unspecified conditions (pilot sources)', schema: 7, synthetic: ['answers', 'PILOT/SYNTHETIC sources and ledger (existing readiness scenario 5; Pika appears only as pilot test data)'], record: { canonical: s5.canonical, sha256: s5.sha256 } })

  return cases
}

/** CR-DESIGN-2B-R2 — TEST ONLY: a schema 7 record whose declared title is the given SYNTHETIC text (glyph-isolation regression). */
export const titledRecord = (id: string, title: string) => record(id, { ...BASE, P1: [title] }, [RUNWAY])
