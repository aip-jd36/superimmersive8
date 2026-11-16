/**
 * SI8-UX-2 local browser harness — a FAKE, in-page stand-in for the Creator Record v2 customer API. SYNTHETIC DATA ONLY.
 *
 * Nothing here talks to a network, Supabase, Stripe or an AI model. It answers the exact routes the page calls, with the response
 * shapes the real routes return, so the real client components can be exercised in a real browser. It is NOT the server: the
 * server's behaviour is proven by the unit tests (`__tests__/creator-record/ux2-preparation-references.test.ts` and the existing
 * suites). Every request body the page sends is recorded in `window.__ux2.requests`, so the serialized document references can be
 * inspected exactly as they would reach the server.
 */
import { loadQuestionRegistry, type RegistryInput } from '@/lib/creator-record/contract/question-registry'
import { validateForm, visibleQuestions, visibleToolQuestions, type CreatorRecordFormState, type FormConfig, type QuestionPresentation } from '@/lib/creator-record/prototype/form'
import { parseEvidenceReferencesForHarness } from './references'

export interface HarnessRequest { method: string; path: string; body: unknown }
interface StoredDoc { id: string; file_name: string; media_type: string; byte_size: number; sha256: string; created_at: string }

export interface FakeApiOptions {
  registryInput: RegistryInput
  presentation: Readonly<Record<string, QuestionPresentation & { section: string; text: string; help: string | null }>>
  acknowledgements: Readonly<Record<string, string>>
  maxTools: number
  contractSha256: string
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const hex = (n: number) => n.toString(16).padStart(12, '0')

export function installFakeApi(o: FakeApiOptions) {
  const loaded = loadQuestionRegistry(o.registryInput)
  if (!loaded.ok) throw new Error('registry')
  const config: FormConfig = { registry: loaded.registry, presentation: o.presentation, acknowledgement_ids: Object.keys(o.acknowledgements), max_tools: o.maxTools }
  const requests: HarnessRequest[] = []
  let seq = 0
  const docs: StoredDoc[] = [
    // Two documents the synthetic creator added in an earlier session ("previously uploaded").
    { id: `00000000-0000-4000-8000-${hex(101)}`, file_name: 'SYNTHETIC-runway-receipt-2026-10.pdf', media_type: 'application/pdf', byte_size: 48211, sha256: 'a'.repeat(64), created_at: '2026-11-10T10:00:00Z' },
    { id: `00000000-0000-4000-8000-${hex(102)}`, file_name: 'SYNTHETIC-higgsfield-invoice-2026-09.pdf', media_type: 'application/pdf', byte_size: 51003, sha256: 'b'.repeat(64), created_at: '2026-11-11T10:00:00Z' },
  ]
  const examined = new Set<string>()
  const examineAttempts = new Map<string, number>()
  const versions = new Map<string, any>()
  const state = { questionnaireChanged: false }

  function answersOf(s: CreatorRecordFormState) {
    const label = (q_id: string, v: string[]) => {
      const p = o.presentation[q_id]
      const q = loaded.ok ? loaded.registry.questions.get(q_id) : undefined
      // As the server records it (`verbatimFor`): a free-text "Not sure" is recorded as the words "Not sure".
      if (q?.options === 'free_text') return p.allow_not_sure && v[0] === 'not_sure' ? 'Not sure' : v[0]
      return v.map((x) => p.option_labels[x] ?? x).join('; ')
    }
    const out: { q_id: string; tool_index: number | null; question: string; answer: string }[] = []
    const shown = visibleQuestions(config, s.answers)
    for (const q of shown.single) if ((s.answers[q.q_id] ?? []).some((v) => v !== '')) out.push({ q_id: q.q_id, tool_index: null, question: o.presentation[q.q_id].text, answer: label(q.q_id, s.answers[q.q_id]) })
    s.tools.forEach((t, i) => {
      for (const q of visibleToolQuestions(config, s.answers, t)) if ((t[q.q_id] ?? []).some((v) => v !== '')) out.push({ q_id: q.q_id, tool_index: i, question: o.presentation[q.q_id].text, answer: label(q.q_id, t[q.q_id]) })
    })
    return out
  }

  function prepare(body: any) {
    if (state.questionnaireChanged) return json(409, { code: 'questionnaire_changed', error: 'The questionnaire has changed since this page was loaded. Nothing was recorded.' })
    const s = body.state as CreatorRecordFormState
    const issues = validateForm(config, s)
    if (issues.length > 0) return json(400, { code: 'invalid_answers', error: 'Some answers need attention.', issues })
    const refs = parseEvidenceReferencesForHarness(body.documents, s.tools.length)
    if (!refs) return json(400, { code: 'invalid_documents', error: 'One or more documents could not be used. Check your documents and try again.' })
    const draft_id = body.draft_id ?? `00000000-0000-4000-9000-${hex(++seq)}`
    const version = [...versions.values()].filter((v) => v.draft_id === draft_id).length + 1
    const id = `00000000-0000-4000-a000-${hex(++seq)}`
    const documents = refs.map((r) => { const d = docs.find((x) => x.id === r.document_id)!; return { document_id: d.id, file_name: d.file_name, media_type: d.media_type, byte_size: d.byte_size, sha256: d.sha256, category: r.category, tool_index: r.tool_index } })
    const read = documents.filter((d) => examined.has(d.document_id))
    const view: any = {
      id, draft_id, version, status: 'prepared', record_ref: `PREP-${id}`, created_at: new Date().toISOString(), reviewed_at: null,
      questionnaire_contract: { contract_id: 'si8/creator-record-v2-questionnaire-contract', contract_version: 3, contract_sha256: o.contractSha256 },
      form_state: s, declarations: { answers: answersOf(s), acknowledgements: Object.entries(o.acknowledgements).map(([id, text]) => ({ id, text })) },
      documents, guidance_items: 1, purchasable: false,
      ...(body.include_examinations && read.length > 0 ? {
        examination: {
          documents: read.map((d, n) => ({
            document_id: d.document_id, run_id: `run-${n + 1}`, verification: 'not_verified', outcome: { status: 'examined', reason: null },
            observations: [
              { observation_id: `o-${n}-1`, field: 'document_kind', qualifier: null, basis: 'model_description', status: 'present', value: 'Subscription confirmation (SYNTHETIC)', excerpt: null, verification: 'not_verified' },
              { observation_id: `o-${n}-2`, field: 'plan_name', qualifier: null, basis: 'printed_text', status: 'present', value: 'SYNTHETIC TEST PLAN LABEL', excerpt: 'Plan: SYNTHETIC TEST PLAN LABEL', verification: 'not_verified' },
              { observation_id: `o-${n}-3`, field: 'service_period', qualifier: null, basis: 'printed_text', status: 'present', value: '2026-10-01 → 2026-10-31', excerpt: 'Billing period: October 1 – October 31, 2026 (synthetic)', verification: 'not_verified' },
            ],
            limitations: ['observations_not_verified', 'no_location_reference', 'single_plan_reading_does_not_exclude_others'],
          })),
          comparisons: [], responses: (body.responses ?? []).map((r: any) => ({ ...r, given_in_version: version })), response_codes: ['reading_incorrect', 'wrong_document', 'other_plan_applies', 'not_relevant'], guidance: [],
        },
      } : {}),
    }
    versions.set(id, view)
    return json(201, { prepared: view })
  }

  async function handler(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    const path = url.replace(/^https?:\/\/[^/]+/, '')
    const method = (init?.method ?? 'GET').toUpperCase()
    let body: unknown = null
    if (init?.body instanceof FormData) body = { file: (init.body.get('file') as File | null)?.name ?? null, consent: init.body.get('consent') }
    else if (typeof init?.body === 'string') body = JSON.parse(init.body)
    requests.push({ method, path, body })
    await new Promise((r) => setTimeout(r, 120))

    if (path === '/api/creator-record-v2/evidence' && method === 'GET') return json(200, { documents: docs })
    if (path === '/api/creator-record-v2/evidence' && method === 'POST') {
      const b = body as { file: string | null; consent: string }
      if (b.consent !== 'harness-consent-version') return json(400, { code: 'consent_required', error: 'Please agree to the document storage notice before adding documents.' })
      const existing = docs.find((d) => d.file_name === b.file)
      if (existing) return json(200, { document: existing, deduplicated: true })
      const d: StoredDoc = { id: `00000000-0000-4000-8000-${hex(200 + ++seq)}`, file_name: b.file ?? 'file.pdf', media_type: 'application/pdf', byte_size: 40000 + seq, sha256: String(seq % 10).repeat(64), created_at: new Date().toISOString() }
      docs.push(d)
      return json(201, { document: d, deduplicated: false })
    }
    const exam = path.match(/^\/api\/creator-record-v2\/evidence\/([^/]+)\/examination$/)
    if (exam && method === 'POST') {
      const id = exam[1]
      const b = body as { ai_permission?: string } | null
      if (b?.ai_permission !== 'harness-ai-permission-version') return json(400, { code: 'ai_permission_required', error: 'Before a document is read, confirm that SI8 may send it to an AI model provider to be read.' })
      const n = (examineAttempts.get(id) ?? 0) + 1
      examineAttempts.set(id, n)
      // The first attempt on a NEW upload is a transient outage, to show the existing retry state; everything else reads.
      if (n === 1 && !id.endsWith(hex(101)) && !id.endsWith(hex(102))) return json(503, { code: 'unavailable', error: 'AI reading is not available right now.' })
      const result = examined.has(id) ? 'existing' : 'created'
      examined.add(id)
      return json(200, { examination: { result, run_id: `run-${id.slice(-4)}` } })
    }
    if (path === '/api/creator-record-v2/prepared' && method === 'POST') return prepare(body)
    const review = path.match(/^\/api\/creator-record-v2\/prepared\/([^/]+)\/review$/)
    if (review && method === 'POST') {
      const v = versions.get(review[1])
      if (!v) return json(404, { code: 'not_found', error: 'Not found.' })
      v.status = 'reviewed'; v.reviewed_at = new Date().toISOString(); v.purchasable = true
      return json(200, { prepared: v })
    }
    const purchase = path.match(/^\/api\/creator-record-v2\/prepared\/([^/]+)\/purchase$/)
    if (purchase && method === 'POST') return json(200, { submission_id: '33333333-3333-4333-8333-333333333333' })
    if (path === '/api/checkout/create-session' && method === 'POST') return json(200, { url: '#stripe-hosted-checkout-simulated-redirect' })
    return json(404, { error: `harness: no route for ${method} ${path}` })
  }

  ;(window as any).fetch = handler
  ;(window as any).__ux2 = { requests, setQuestionnaireChanged: (v: boolean) => { state.questionnaireChanged = v } }
}
