/**
 * CR-V2-MVP-1 — live extraction readiness (Workstream B) and the gated
 * end-to-end MVP acceptance (Workstream C).
 *
 * B: every safeguard on the live path is tested WITHOUT a model call
 * (scripted callers only): code lock, dedicated key, pinned model, call budget,
 * server-enforced consent (see evidence-examine), live size cap, reconciliation of
 * live results, display-only documents.
 *
 * C: `MVP acceptance (LIVE)` makes REAL paid model calls on 5 synthetic
 * fixtures through the real examination path, then declaration → reconciliation →
 * governed guidance → draft. It is SKIPPED unless ALL hold:
 *   - CR_MVP_LIVE_ACCEPTANCE=I_AUTHORIZE_PAID_MODEL_CALLS (explicit PM authorization),
 *   - the dedicated key `CREATOR_RECORD_EXTRACTION_API_KEY` is set,
 *   - the synthetic fixtures are generated locally.
 * Hard cap: 10 model calls (5 documents × at most 2). It never runs in a
 * normal test run. It does NOT go through the app's code lock (which stays
 * closed); it calls the same adapter and examination path directly.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { liveExtractionEnabled, LIVE_EXTRACTION_ENV, LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/evidence/config'
import { type ExaminedDocument, type ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { LIVE_EXTRACTION_API_KEY_ENV, LIVE_EXTRACTION_MODEL, LIVE_MAX_MODEL_CALLS_PER_INSTANCE, loadLiveCaller, withInstanceBudget } from '@/lib/creator-record/evidence/live-caller'
import { verifyReturnedDocument } from '@/lib/creator-record/evidence/verify-returned-documents'
import { loadFixtureSpec, resolveFixtures } from '@/lib/creator-record/eval/fixtures'
import { scoreObservation } from '@/lib/creator-record/eval/score'
import { RECEIPT_PROMPT_VERSION } from '@/lib/creator-record/receipt-examination/prompt'
import { RECEIPT_EXTRACTION_SCHEMA_VERSION } from '@/lib/creator-record/receipt-examination/schema'
import { buildCreatorRecordDraft, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import { T } from '@/lib/creator-record/presentation/templates'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import * as guidanceModule from '@/lib/creator-record/integration/run-creator-record-guidance'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const APP = path.resolve(__dirname, '..', '..')
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const scripted = (parsed: unknown) => jest.fn().mockResolvedValue({ id: 'scripted', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 1, output_tokens: 1 }, parsed_output: parsed })
const replayed = (id: string) => REPLAY_FIXTURES.find((f) => f.fixture_id === id)!.parsed_output

describe('B — live path safeguards (no model call)', () => {
  test('the code lock is still closed; the environment alone cannot open it', () => {
    expect(LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD).toBe(false)
    expect(liveExtractionEnabled({ [LIVE_EXTRACTION_ENV]: 'enabled', [LIVE_EXTRACTION_API_KEY_ENV]: 'x' })).toBe(false)
  })

  test('loading the live caller fails closed without the gate, and the dedicated key is checked after the gate', async () => {
    await expect(loadLiveCaller({ [LIVE_EXTRACTION_ENV]: 'enabled', [LIVE_EXTRACTION_API_KEY_ENV]: 'x' })).rejects.toThrow('disabled')
    const src = readFileSync(path.join(APP, 'lib', 'creator-record', 'evidence', 'live-caller.ts'), 'utf8')
    const gate = src.indexOf('if (!liveExtractionEnabled(env))')
    const key = src.indexOf('if (!env[LIVE_EXTRACTION_API_KEY_ENV])')
    const load = src.indexOf("await import('../receipt-examination/examine.anthropic')")
    expect(gate).toBeGreaterThan(-1)
    expect(key).toBeGreaterThan(gate)
    expect(load).toBeGreaterThan(key)
  })

  test('the model is pinned in code to the evaluated model, and the app path uses the dedicated key (never ANTHROPIC_API_KEY)', () => {
    expect(LIVE_EXTRACTION_MODEL).toBe('claude-sonnet-5')
    expect(LIVE_EXTRACTION_API_KEY_ENV).toBe('CREATOR_RECORD_EXTRACTION_API_KEY')
    const src = readFileSync(path.join(APP, 'lib', 'creator-record', 'evidence', 'live-caller.ts'), 'utf8')
    expect(src).toMatch(/createAnthropicReceiptCaller\(\{ model: LIVE_EXTRACTION_MODEL, apiKeyEnv: LIVE_EXTRACTION_API_KEY_ENV, timeoutMs: LIVE_REQUEST_TIMEOUT_MS \}\)/)
    expect(src.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/ANTHROPIC_API_KEY|process\.env\.CREATOR_RECORD_RECEIPT_MODEL/)
    const adapter = readFileSync(path.join(APP, 'lib', 'creator-record', 'receipt-examination', 'examine.anthropic.ts'), 'utf8')
    expect(adapter).toMatch(/maxRetries: 0/)
    expect(adapter.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/console\./)
  })

  test('the per-instance call budget stops calling once spent', async () => {
    const inner = scripted(replayed('pdf-pika-pro-no-period'))
    const budgeted = withInstanceBudget(inner, 2, { used: 0 })
    await budgeted({ content: [], maxTokens: 1 })
    await budgeted({ content: [], maxTokens: 1 })
    await expect(budgeted({ content: [], maxTokens: 1 })).rejects.toThrow('budget')
    expect(inner).toHaveBeenCalledTimes(2)
    expect(LIVE_MAX_MODEL_CALLS_PER_INSTANCE).toBeLessThanOrEqual(40)
  })

  test('a spent budget makes examination fail closed (model_error), never a partial result', async () => {
    const budgeted = withInstanceBudget(scripted(replayed('pdf-pika-pro-no-period')), 0, { used: 0 })
    const d = await examineUpload(new Uint8Array([...PNG, 1, 2, 3]), 'x.png', { mode: 'live_model', liveCaller: budgeted })
    expect(d).toEqual(expect.objectContaining({ outcome: 'could_not_examine', reason: 'model_error', extraction: null }))
  })

  describe('a live result is consumed by the existing draft path unchanged', () => {
    const liveDoc = async (parsed: unknown) => examineUpload(new Uint8Array([...PNG, ...Buffer.from(JSON.stringify(parsed).slice(0, 20))]), 'live.png', { mode: 'live_model', liveCaller: scripted(parsed) })

    test('labelled live_model with the current schema and prompt versions', async () => {
      const d = await liveDoc(replayed('pdf-pika-pro-no-period'))
      expect(d).toEqual(expect.objectContaining({ outcome: 'document_examined', extraction_mode: 'live_model', replay_fixture_id: null, model_calls: 1 }))
      expect(d.versions).toEqual({ schema: RECEIPT_EXTRACTION_SCHEMA_VERSION, prompt: RECEIPT_PROMPT_VERSION, replay_set: null })
      expect(d.extraction?.product_or_plan_name.value).toBe('Pro')
    })

    test('returned live documents: refused in the locked build, accepted (strictly) only where live is permitted', async () => {
      const d = await liveDoc(replayed('pdf-pika-pro-no-period'))
      const td: ToolDocument = { tool_index: 0, document: d }
      expect(verifyReturnedDocument(td)).toBe(false)
      expect(verifyReturnedDocument(td, undefined, 'live_model')).toBe(true)
      for (const bad of [{ ...d, model_calls: 0 }, { ...d, replay_fixture_id: 'pdf-pika-pro-no-period' }, { ...d, versions: { ...d.versions, prompt: 'receipt-prompt-v1' } }, { ...d, extraction: { ...d.extraction!, readability: 'perfect' } } as unknown as ExaminedDocument]) {
        expect(verifyReturnedDocument({ ...td, document: bad }, undefined, 'live_model')).toBe(false)
      }
    })

    test('the draft uses only the creator’s declaration; the live observation is display-only and labelled', async () => {
      const spy = jest.spyOn(guidanceModule, 'runCreatorRecordGuidance')
      const d = await liveDoc(replayed('pdf-pika-pro-no-period'))
      const state = { answers: { P1: ['Live'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } }
      const record = { record_id: 'LIVE-READY', record_version: 1, captured_at: '2026-10-27T00:00:00Z' }
      const r = buildCreatorRecordDraft({ state, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-27', record, documents: [{ tool_index: 0, document: d }] })
      if (!r.ok) throw new Error(JSON.stringify(r.issues))
      expect(spy.mock.calls[0][0].observations.every((o) => o.source_kind === 'customer_declared')).toBe(true)
      expect(r.view.documents.items[0].rows).toContainEqual({ label: T.doc_read_label, value: T.doc_read_live(1) })
      expect(r.view.banner!.lines[1]).toBe(T.record_banner_files_live)
      spy.mockRestore()
    })
  })
})

// ───────────────────────────────────────────── C — gated live acceptance

const AUTHORIZED = process.env.CR_MVP_LIVE_ACCEPTANCE === 'I_AUTHORIZE_PAID_MODEL_CALLS'
/**
 * CR-V2-MVP-2B — TEST-ONLY, process-scoped key source. The acceptance run may
 * use an existing key under its usual name (`ANTHROPIC_API_KEY`) when the
 * operator sets `CR_MVP_ACCEPTANCE_KEY_ENV=ANTHROPIC_API_KEY` for that one
 * process. Only these two names are allowed. The deployed app's live path is
 * unaffected: it still requires CREATOR_RECORD_EXTRACTION_API_KEY (asserted above).
 */
const ACCEPTANCE_KEY_ENV = process.env.CR_MVP_ACCEPTANCE_KEY_ENV === 'ANTHROPIC_API_KEY' ? 'ANTHROPIC_API_KEY' : LIVE_EXTRACTION_API_KEY_ENV
const KEY_PRESENT = !!process.env[ACCEPTANCE_KEY_ENV]
const GENERATED = path.join(APP, 'lib', 'creator-record', 'eval', 'fixtures', 'generated')
const HAS_FIXTURES = existsSync(path.join(GENERATED, 'manifest.json'))
const RUN_LIVE = AUTHORIZED && KEY_PRESENT && HAS_FIXTURES

export const MVP_MAX_DOCUMENTS = 5
export const MVP_MAX_MODEL_REQUESTS = 10

/** The 5 MVP acceptance documents (synthetic) and the declared tool for each. */
export const MVP_ACCEPTANCE_FIXTURES = [
  // CR-V2-MVP-6 (declare first): the creator's own plan answer is fixed per document, never taken from it.
  { id: 'pdf-pika-pro-no-period', purpose: 'clear Pika Pro receipt', tool: 'pika', declared_plan: 'Pro' },
  { id: 'shot-truncated-plan-name', purpose: 'ambiguous / truncated plan name', tool: 'pika', declared_plan: 'Pro' },
  { id: 'missing-period-end', purpose: 'missing service period end', tool: 'pika', declared_plan: 'Pro' },
  { id: 'conflict-two-plan-names', purpose: 'conflicting plan information (known omission risk)', tool: 'runway-gen3', declared_plan: 'Pro' },
  { id: 'nonreceipt-abstract-photo', purpose: 'not a receipt', tool: 'pika', declared_plan: 'Pro' },
] as const

test('C — the test-only key source accepts only the two allowed names, and the app path still requires the dedicated key', () => {
  expect(['ANTHROPIC_API_KEY', LIVE_EXTRACTION_API_KEY_ENV]).toContain(ACCEPTANCE_KEY_ENV)
  const app = readFileSync(path.join(APP, 'lib', 'creator-record', 'evidence', 'live-caller.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  expect(app).not.toMatch(/ANTHROPIC_API_KEY|CR_MVP_ACCEPTANCE_KEY_ENV/)
})

test('C — the MVP acceptance set is defined and covered by the synthetic spec', () => {
  const ids = new Set(resolveFixtures(loadFixtureSpec()).map((f) => f.id))
  for (const f of MVP_ACCEPTANCE_FIXTURES) expect(ids.has(f.id)).toBe(true)
  if (!RUN_LIVE) console.info(`[CR-V2-MVP-1] live acceptance NOT RUN (authorized=${AUTHORIZED}, key (${ACCEPTANCE_KEY_ENV})=${KEY_PRESENT}, fixtures=${HAS_FIXTURES}). Actual extraction: NOT TESTED.`)
})

;(RUN_LIVE ? describe : describe.skip)('C — MVP acceptance (LIVE, paid, synthetic only)', () => {
  jest.setTimeout(240_000)
  const manifest = RUN_LIVE ? (JSON.parse(readFileSync(path.join(GENERATED, 'manifest.json'), 'utf8')) as { documents: { id: string; file: string; document_text: string }[] }) : { documents: [] }
  const resolved = new Map(resolveFixtures(loadFixtureSpec()).map((f) => [f.id, f]))
  const report: unknown[] = []

  test('declaration → upload → actual AI extraction → server reconciliation → governed guidance → draft', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createAnthropicReceiptCaller: createAdapterCaller } = require('@/lib/creator-record/receipt-examination/examine.anthropic')
    // Measurement only: records the token usage each real response reports. Never alters a request or a response.
    const usage: { input_tokens: number; output_tokens: number }[] = []
    const createAnthropicReceiptCaller = (opts: unknown) => {
      const inner = createAdapterCaller(opts)
      return async (req: unknown) => {
        const res = await inner(req)
        usage.push({ input_tokens: res?.usage?.input_tokens ?? 0, output_tokens: res?.usage?.output_tokens ?? 0 })
        return res
      }
    }
    const guidanceSpy = jest.spyOn(guidanceModule, 'runCreatorRecordGuidance')
    const failures: string[] = []
    // Free preflight (no generation, no token cost): the pinned model must be available to the
    // dedicated key, or the run stops here before any paid request. The key is never printed.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Anthropic = require('@anthropic-ai/sdk').default
    const model = await new Anthropic({ apiKey: process.env[ACCEPTANCE_KEY_ENV], maxRetries: 0, timeout: 15_000 }).models.retrieve(LIVE_EXTRACTION_MODEL)
    expect(model.id).toBe(LIVE_EXTRACTION_MODEL)
    console.info(`[CR-V2-MVP-2] model preflight OK: ${model.id}`)

    // ABSOLUTE cap for this run: 10 model requests, counted on this run's own budget.
    const budget = { used: 0 }
    const caller = withInstanceBudget(createAnthropicReceiptCaller({ model: LIVE_EXTRACTION_MODEL, apiKeyEnv: ACCEPTANCE_KEY_ENV, timeoutMs: 25_000 }), MVP_MAX_MODEL_REQUESTS, budget)
    expect(MVP_ACCEPTANCE_FIXTURES.length).toBeLessThanOrEqual(MVP_MAX_DOCUMENTS)
    for (const f of MVP_ACCEPTANCE_FIXTURES) {
      try {
      const m = manifest.documents.find((x) => x.id === f.id)!
      const callsBefore = usage.length
      // CR-V2-MVP-6: exactly the active examine path (G-R2 deferred: no plan scope, cross-check recorded as not run).
      const d = await examineUpload(new Uint8Array(readFileSync(path.join(GENERATED, m.file))), m.file, { mode: 'live_model', liveCaller: caller })
      if (d.extraction_mode !== 'live_model') failures.push(`${f.id}: not labelled live_model`)
      if (d.model_calls > 2) failures.push(`${f.id}: more than 2 calls`)
      const outcome = d.extraction
        ? { status: 'examined' as const, extraction: d.extraction, detected_media_type: d.detected_media_type!, usage: { attempts: d.model_calls, input_tokens: 0, output_tokens: 0, latency_ms: 0 }, schema_version: RECEIPT_EXTRACTION_SCHEMA_VERSION, prompt_version: RECEIPT_PROMPT_VERSION }
        : { status: 'could_not_examine' as const, reason: (d.reason ?? 'model_error') as 'model_error', detected_media_type: d.detected_media_type, usage: { attempts: d.model_calls, input_tokens: 0, output_tokens: 0, latency_ms: 0 }, schema_version: RECEIPT_EXTRACTION_SCHEMA_VERSION, prompt_version: RECEIPT_PROMPT_VERSION }
      const score = scoreObservation(resolved.get(f.id)!, { fixture_id: f.id, repeat: 0, outcome }, m.document_text)

      // Declare first: the creator's plan answer is fixed; nothing is taken from the document.
      const plan = f.declared_plan
      const state = { answers: { P1: [`MVP ${f.id}`], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: [f.tool], T3: [plan], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } }
      const r = buildCreatorRecordDraft({ state, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: new Date().toISOString().slice(0, 10), record: { record_id: `MVP-${f.id}`, record_version: 1, captured_at: new Date().toISOString() }, documents: [{ tool_index: 0, document: d }] })
      const td = { tool_index: 0, document: d }
      const returnedAccepted = verifyReturnedDocument(td, undefined, 'live_model')
      const declaredOnly = (guidanceSpy.mock.calls.at(-1)?.[0].observations ?? []).every((o) => o.source_kind === 'customer_declared')
      if (!r.ok) {
        failures.push(`${f.id}: draft refused ${JSON.stringify(r.issues)}`)
        report.push({ fixture: f.id, purpose: f.purpose, outcome: d.outcome, reason: d.reason, model_calls: d.model_calls, draft: 'refused', issues: r.issues })
        continue
      }
      const readRow = r.view.documents.items[0]?.rows.find((x) => x.label === T.doc_read_label)?.value ?? ''
      if (!/Read by an AI model/.test(readRow) && d.outcome === 'document_examined') failures.push(`${f.id}: record does not label the AI reading`)
      if (!declaredOnly) failures.push(`${f.id}: a non-declaration reached guidance`)
      const truth = resolved.get(f.id)!
      report.push({
        fixture: f.id,
        purpose: f.purpose,
        truth: { ...truth.truth, plan_names_shown: truth.plan_names_shown },
        outcome: d.outcome,
        reason: d.reason,
        model_calls: d.model_calls,
        usage: usage.slice(callsBefore),
        extraction: d.extraction,
        score: { fields: score.fields, document_type_ok: score.document_type_ok, readability_ok: score.readability_ok, plan_conflict: score.plan_conflict, multiple_plans_ok: score.multiple_plans_ok, unsupported_value_in_document: score.unsupported_value_in_document, evidence_unsupported: score.evidence_unsupported, plan_candidates_not_in_document: score.plan_candidates_not_in_document, instruction_flag_ok: score.instruction_flag_ok },
        returned_document_accepted: returnedAccepted,
        reconciliation: r.view.trace.evidence_reconciliation[0],
        reconciliation_rows: r.view.reconciliation.items[0]?.rows.map((x) => `${x.label}: ${x.value} — ${x.note ?? ''}`),
        cross_check: d.cross_check,
        declared_plan: plan,
        guidance_inputs_declarations_only: declaredOnly,
        cards: r.view.guidance.cards.map((c) => ({ subject: c.subject, claim: c.claim_id, conclusion: c.conclusion, basis: c.basis, depends_on: c.depends_on })),
        not_established: r.view.open_items.not_established.map((n) => `${n.label} — told us: ${n.told_us}`),
        summary: r.view.summary[1],
        document_rows: r.view.documents.items[0]?.rows.map((x) => `${x.label}: ${x.value}`),
        document_notes: r.view.documents.items[0]?.notes,
      })
      } catch (err) {
        failures.push(`${f.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    guidanceSpy.mockRestore()
    const totals = usage.reduce((a, u) => ({ input_tokens: a.input_tokens + u.input_tokens, output_tokens: a.output_tokens + u.output_tokens }), { input_tokens: 0, output_tokens: 0 })
    const out = { generated_at: new Date().toISOString(), model: model.id, preflight: 'models.retrieve (free)', paid_requests: budget.used, responses_with_usage: usage.length, cap: MVP_MAX_MODEL_REQUESTS, tokens: totals, failures, report }
    if (process.env.CR_MVP_REPORT_OUT) require('node:fs').writeFileSync(process.env.CR_MVP_REPORT_OUT, JSON.stringify(out, null, 2))
    console.info(`[CR-V2-MVP-2] live acceptance: ${budget.used} paid requests (cap ${MVP_MAX_MODEL_REQUESTS}); tokens in ${totals.input_tokens}, out ${totals.output_tokens}; failures ${failures.length}`)
    expect(budget.used).toBeLessThanOrEqual(MVP_MAX_MODEL_REQUESTS)
    expect(failures).toEqual([])
  })
})
