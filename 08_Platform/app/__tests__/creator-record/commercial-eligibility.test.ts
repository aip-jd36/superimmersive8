/**
 * CR-V2-MVP-ELIGIBILITY-1 — an unauthorized, stale, historical or synthetic record is not automatically sold or issued.
 *
 * Runs the real enforcement boundaries: `startPurchase`, `checkV2Checkout`, `renderV2ForIssuance`, the registered v2 renderer,
 * `issueCreatorRecordArtifact` and `runPaymentFulfillment`, over in-memory stores. Synthetic fixtures only; nothing reaches Stripe
 * or a database. Schema support is named explicitly in the tests that need it, because a shipped build supports none.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const issuanceDepsRef: { current: unknown } = { current: null }
jest.mock('@/lib/creator-record-flow/production', () => {
  const purchase = jest.requireActual('@/lib/creator-record/customer-flow/purchase')
  return {
    renderCreatorRecordV2Pdf: (sub: unknown, id: string, at: Date) => purchase.renderV2ForIssuance(issuanceDepsRef.current, sub, id, at),
    authorizeCreatorRecordV2Issuance: async (sub: unknown, at: Date) => { await purchase.authorizeV2Issuance(issuanceDepsRef.current, sub, at) },
  }
})
jest.mock('@/lib/creator-record-artifacts/store', () => ({
  artifactGateDecision: jest.fn(), artifactStatus: jest.fn(), artifactTable: {}, newAttemptId: jest.fn(), privateObjectStore: {},
}))
jest.mock('@/lib/payments/repository', () => ({ hasCreatorRecordPdf: jest.fn(), loadFulfillmentSubmission: jest.fn() }))

import { approvedCustomerRecordInputs, approvedGovernanceSnapshot, approvedPdfTemplates, CREATOR_RECORD_V2_SUBMISSIONS, currentPublicationAuthority } from '@/lib/creator-record/customer-flow/approved-inputs'
import { checkV2Checkout, renderV2ForIssuance, startPurchase, V2IssuanceRefusal, type CheckoutSubmission, type PurchaseDeps, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import { getPrepared, verifiedRecord, type ApprovedInputs, type FlowDeps, type PreparedRow } from '@/lib/creator-record/customer-flow/service'
import { isSyntheticRecordAuthority, syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { isSyntheticAuthorityText } from '@/lib/creator-record/customer-record/authority-content'
import { selectAuthorityBundle } from '@/lib/creator-record/governed/publication-authority'
import { evaluateIssuanceEligibility, type IssuanceEligibility } from '@/lib/creator-record/customer-record/eligibility'
import { CURRENT_ISSUANCE_SUPPORT, governanceSnapshotFrom, type CurrentGovernance } from '@/lib/creator-record/customer-record/governance-state'
import { buildCustomerRecord, verifyCustomerRecord, CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { issueCreatorRecordArtifact, sha256Hex, type ArtifactRow, type IssueDeps } from '@/lib/creator-record-artifacts/issue'
import { issueDepsFor } from '@/lib/creator-record-artifacts/production'
import { CREATOR_RECORD_V1_FAMILY, CREATOR_RECORD_V2_FAMILY, CREATOR_RECORD_V2_GENERATOR_VERSION, CreatorRecordIssuanceStoppedError, rendererForFamily, selectCreatorRecordRenderer } from '@/lib/creator-record-artifacts/renderers'
import { runPaymentFulfillment, type FulfillmentDeps } from '@/lib/payments/run-payment-fulfillment'
import type { FulfillmentSubmission } from '@/lib/payments/repository'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { COMMERCIAL_SUPPORT_UNDER_TEST as SUPPORT } from '@/test-support/commercial-support'
import { questionnaireApprovalFor } from '@/test-support/questionnaire-approval'

const NOW = new Date('2026-11-06T09:00:00.000Z')
const AS_OF = '2026-11-06'
const SAVED = JSON.parse(readFileSync(join(process.cwd(), 'test-support', 'fixtures', 'pre-questionnaire-contract-rows.json'), 'utf8')) as PreparedRow[]
const saved = (schema: number) => SAVED.find((r) => r.record_schema_version === schema)!
const OWNER = saved(5).user_id
const SUB_ID = '33333333-3333-4333-8333-333333333333'
const SUB: CheckoutSubmission = { id: SUB_ID, user_id: OWNER, tier: 'creator_record', creator_record_product: 'v2' }
const FULFILLMENT_SUB: FulfillmentSubmission = { ...SUB, status: 'approved', title: 'Creator Record', filmmaker_name: 'Creator', tools_used: [], authorship_statement: '', likeness_confirmation: {}, ip_confirmation: {}, territory_preferences: null }
const SYN = syntheticUatInputs()
type Sources = ApprovedInputs['sources']
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/** A record prepared now, from these inputs, as a stored row. */
function rowFrom(inputs: ApprovedInputs, over: Partial<PreparedRow> = {}, version = 1): PreparedRow {
  const id = over.id ?? `99999999-9999-4999-8999-${String(version).padStart(12, '0')}`
  const built = buildCustomerRecord({ state: saved(5).form_state, sources: inputs.sources, source_text: inputs.source_text, topicClaims: CLAIMS, as_of: AS_OF, record: { record_id: `PREP-${id}`, record_version: version, captured_at: NOW.toISOString() } })
  if (!built.ok) throw new Error(`fixture: ${JSON.stringify(built).slice(0, 300)}`)
  return { id, user_id: OWNER, draft_id: '88888888-8888-4888-8888-888888888888', version, record_ref: `PREP-${id}`, record_schema: CUSTOMER_RECORD_SCHEMA, record_schema_version: built.record.schema_version, canonical: built.canonical, sha256: built.sha256, form_state: saved(5).form_state, status: 'reviewed', created_at: NOW.toISOString(), reviewed_at: NOW.toISOString(), submission_id: null, ...over }
}
const ROW = rowFrom(SYN)
const BOUND = { ...ROW, submission_id: SUB_ID }

const state = (over: Partial<CurrentGovernance> = {}) => governanceSnapshotFrom({ issuance_date: AS_OF, sources: SYN.sources, topicClaims: CLAIMS, source_text_approvals: [SYN.source_text!.approval!], support: SUPPORT, authority_class: 'synthetic_test', ...over })
const withContract = (approval: Sources['questionnaire_approval']): Sources => ({ ...SYN.sources, questionnaire_approval: approval })
const APPROVAL = SYN.sources.questionnaire_approval!

function purchaseDeps(governance: () => ReturnType<typeof state>, rows: PreparedRow[] = [ROW]) {
  const bind = jest.fn(async () => ({ submissionId: SUB_ID, reason: 'created' as const }))
  const deps: PurchaseDeps = {
    submissions: 'open', issuance: 'enabled', hasPilotAccess: async () => true,
    getPrepared: async (id) => rows.find((r) => r.id === id) ?? null,
    latestVersion: async (d) => [...rows].filter((r) => r.draft_id === d).sort((a, b) => b.version - a.version)[0] ?? null,
    boundTo: async () => ({ ...rows[0], submission_id: SUB_ID }),
    bind, governance, now: () => NOW,
  }
  return { deps, bind }
}
function issuanceDeps(governance: () => ReturnType<typeof state>, rows: PreparedRow[] = [BOUND]) {
  const render = jest.fn(async (_input: unknown) => new TextEncoder().encode('PDF'))
  const deps: V2IssuanceDeps = {
    boundTo: async () => rows[0],
    latestVersion: async (d) => [...rows].filter((r) => r.draft_id === d).sort((a, b) => b.version - a.version)[0] ?? null,
    governance, templates: () => ({ templates: null, approval: null }), renderPdf: render,
  }
  return { deps, render }
}
const refusal = (p: Promise<unknown>) => p.then(() => 'issued', (e) => (e instanceof V2IssuanceRefusal ? e.code : `other:${String(e)}`))

/** The same refusal at all three commercial boundaries, with nothing bound or rendered. */
async function refusedEverywhere(governance: () => ReturnType<typeof state>, row: PreparedRow, purchaseCode: string, issuanceCode: string) {
  const p = purchaseDeps(governance, [row])
  expect(await startPurchase(p.deps, row.user_id, row.id)).toMatchObject({ ok: false, code: purchaseCode })
  expect(p.bind).not.toHaveBeenCalled()
  expect(await checkV2Checkout(p.deps, row.user_id, { ...SUB, user_id: row.user_id })).toMatchObject({ ok: false, code: purchaseCode })
  const bound = { ...row, submission_id: SUB_ID }
  const i = issuanceDeps(governance, [bound])
  expect(await refusal(renderV2ForIssuance(i.deps, { ...SUB, user_id: row.user_id }, 'CR-2026-33333333', NOW))).toBe(issuanceCode)
  expect(i.render).not.toHaveBeenCalled()
}

const reasons = (e: IssuanceEligibility) => (e.decision === 'ineligible' ? e.reasons.map((r) => `${r.kind}:${r.code}`) : [])

describe('the control: everything below is refused by the rule named, not by something else', () => {
  test('an unchanged contract, explicitly supported, may be bought and issued', async () => {
    const p = purchaseDeps(state)
    expect(await startPurchase(p.deps, OWNER, ROW.id)).toEqual({ ok: true, submission_id: SUB_ID })
    expect(await checkV2Checkout(p.deps, OWNER, SUB)).toEqual({ ok: true, sha256: ROW.sha256, record_ref: ROW.record_ref })
    const i = issuanceDeps(state)
    await renderV2ForIssuance(i.deps, SUB, 'CR-2026-33333333', NOW)
    expect(i.render).toHaveBeenCalledTimes(1)
  })
})

describe('1 and 2: the questionnaire contract the record embeds must be the current approved one', () => {
  test('the contract is checked as a reference, with its version and digest', () => {
    const e = evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, state())
    expect(e.decision).toBe('eligible')
    if (e.decision === 'eligible') expect(e.checked).toContainEqual({ kind: 'questionnaire_contract', id: APPROVAL.contract_id, version: String(APPROVAL.contract_version), content_sha256: APPROVAL.contract_sha256 })
  })

  test('missing authority refuses every commercial action', async () => {
    const g = () => state({ sources: withContract(null) })
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, g()))).toEqual(['questionnaire_contract:reference_missing'])
    await refusedEverywhere(g, ROW, 'ineligible', 'governance_ineligible')
  })

  test.each([['withdrawn'], ['superseded'], ['pending']] as const)('a %s contract refuses every commercial action', async (lifecycle) => {
    const g = () => state({ sources: withContract({ ...APPROVAL, lifecycle }) })
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, g()))).toEqual([`questionnaire_contract:lifecycle_${lifecycle}`])
    await refusedEverywhere(g, ROW, 'ineligible', 'governance_ineligible')
  })

  test('a replacement that changes only behaviour refuses: the wording and question digests alone would not see it', async () => {
    const behaviour = clone(SYN.sources)
    const q = Object.keys(behaviour.presentation)[0]
    ;(behaviour.presentation as Record<string, { required: boolean }>)[q].required = !(behaviour.presentation as Record<string, { required: boolean }>)[q].required
    const b = questionnaireApprovalFor(behaviour, SYN.source_text!.acknowledgements, { contract_version: 2, authority: APPROVAL.authority, review_ref: APPROVAL.review_ref })
    expect(b.contract_sha256).not.toBe(APPROVAL.contract_sha256)
    const g = () => state({ sources: { ...behaviour, questionnaire_approval: b } })
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, g()))).toEqual(['questionnaire_contract:version_not_current'])
    await refusedEverywhere(g, ROW, 'ineligible', 'governance_ineligible')
  })

  test('a different contract under the same version number is inconsistent: refused as undecidable', async () => {
    const g = () => state({ sources: withContract({ ...APPROVAL, contract_sha256: 'a'.repeat(64) }) })
    const e = evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, g())
    expect(e).toMatchObject({ decision: 'indeterminate', cause: 'conflict' })
    await refusedEverywhere(g, ROW, 'unavailable', 'governance_indeterminate')
  })

  test('a malformed approval, or unavailable sources, are refused as undecidable', () => {
    const malformed = state({ sources: withContract({ ...APPROVAL, contract_version: 0 }) })
    expect(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, malformed)).toMatchObject({ decision: 'indeterminate', cause: 'malformed_state' })
    const forgotten = state()
    delete forgotten.authorities.questionnaire_contract
    expect(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, forgotten)).toMatchObject({ decision: 'indeterminate', cause: 'malformed_state' })
  })

  test('a pilot-marked approval is not treated as approved', () => {
    const g = state({ sources: withContract({ ...APPROVAL, authority: 'PILOT-UAT, not a governance approval' }) })
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, g))).toEqual(['questionnaire_contract:lifecycle_pending'])
  })
})

describe('3: schemas 5 and 6 stay readable and are never commercially eligible', () => {
  /** Everything else as favourable as it can be: support naming these schemas, wording approved under the record's own digest. */
  const favourable = (r: PreparedRow) => {
    const rec = verifiedRecord(r)!
    const identity = { id: rec.schema, version: rec.schema_version }
    return () => state({
      sources: withContract(null),
      source_text_approvals: [{ ...SYN.source_text!.approval!, version: rec.sources.source_text.version, content_sha256: rec.sources.source_text.content_sha256 }],
      support: { record_schemas: [identity], builders: [{ id: rec.builder.id, version: rec.builder.version }] },
    })
  }
  test.each([[5], [6]])('a real saved schema %i row is refused at every commercial boundary, on its missing contract', async (schema) => {
    const r = saved(schema)
    expect(reasons(evaluateIssuanceEligibility(r.canonical, r.sha256, favourable(r)()))).toContain('questionnaire_contract:contract_not_recorded')
    const p = purchaseDeps(favourable(r), [r])
    p.deps.evidenceIntact = async () => ({ ok: true })
    p.deps.examinationsIntact = async () => ({ ok: true })
    expect(await startPurchase(p.deps, r.user_id, r.id)).toMatchObject({ ok: false, code: 'ineligible' })
    expect(p.bind).not.toHaveBeenCalled()
    const i = issuanceDeps(favourable(r), [{ ...r, status: 'reviewed', reviewed_at: NOW.toISOString(), submission_id: SUB_ID }])
    i.deps.evidenceIntact = async () => ({ ok: true })
    i.deps.examinationsIntact = async () => ({ ok: true })
    expect(await refusal(renderV2ForIssuance(i.deps, { ...SUB, user_id: r.user_id }, 'CR-2026-33333333', NOW))).toBe('governance_ineligible')
    expect(i.render).not.toHaveBeenCalled()
  })

  test('no governance state can admit one: the refusal is definitive even when governance cannot be read', () => {
    const r = saved(5)
    expect(evaluateIssuanceEligibility(r.canonical, r.sha256, null as never).decision).toBe('ineligible')
    expect(evaluateIssuanceEligibility(r.canonical, r.sha256, approvedGovernanceSnapshot(AS_OF, CLAIMS, null)).decision).toBe('ineligible')
  })
})

/** The synthetic approvals with nothing synthetic-looking in any text the record keeps: as a real approval set would read. */
function realLooking(): ApprovedInputs {
  const a = { approver: 'Head of Governance', review_ref: 'GOV-1' }
  const s = clone(SYN.sources)
  s.versions = { registry: 'REG-2026-11', ledger: 'LED-2026-11' }
  s.registry_input.questions = s.registry_input.questions.map((q) => (q.approval.status === 'approved' ? { ...q, approval: { ...q.approval, ...a } } : q))
  s.registry_input.observation_map = s.registry_input.observation_map.map((o) => (o.approval.status === 'approved' ? { ...o, approval: { ...o.approval, ...a } } : o))
  s.ledger = s.ledger.map((e) => ({ ...e, entry_id: e.entry_id.replace(/^SYN-/, 'CR-'), approver: a.approver }))
  s.questionnaire_approval = questionnaireApprovalFor(s, SYN.source_text!.acknowledgements, { authority: a.approver, review_ref: 'GOV-CONTRACT-1' })
  return { sources: s, source_text: { approval: { ...SYN.source_text!.approval!, authority: a.approver, review_ref: 'GOV-TEXT-1' }, acknowledgements: SYN.source_text!.acknowledgements } }
}

describe('4: a synthetic record cannot be commercially purchased or issued', () => {
  test.each([['governance'], [undefined]] as const)('class %s: refused at every boundary, though every reference matches', async (authority_class) => {
    const g = () => state({ authority_class })
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, g()))).toEqual(['source_text:synthetic_record'])
    await refusedEverywhere(g, ROW, 'ineligible', 'governance_ineligible')
  })

  test('renaming the current approvals does not help: the record keeps what it was prepared under', async () => {
    const g = () => state({ authority_class: 'governance', sources: withContract({ ...APPROVAL, authority: 'Head of Governance', review_ref: 'GOV-1' }), source_text_approvals: [{ ...SYN.source_text!.approval!, authority: 'Head of Governance', review_ref: 'GOV-1' }] })
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, g()))).toEqual(['source_text:synthetic_record'])
  })

  test('the Production resolution never yields the class that admits one', () => {
    const production = { VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://lehqgcgnenwdmuzudbrs.supabase.co', STRIPE_SECRET_KEY: 'sk_live_x' }
    expect(currentPublicationAuthority(production)?.authority_class).toBe('governance')
    expect(approvedGovernanceSnapshot(AS_OF, CLAIMS, currentPublicationAuthority(production)).authority_class).toBe('governance')
    expect(currentPublicationAuthority({ ...production, SI8_CR_PUBLICATION_AUTHORITY: 'synthetic-isolated-test', SI8_CR_SYNTHETIC_SUPABASE_REF: 'lehqgcgnenwdmuzudbrs' })).toBeNull()
    const none = approvedGovernanceSnapshot(AS_OF, CLAIMS, null)
    expect(none.authority_class).toBeUndefined()
  })

  test('the record-class rule reads text exactly as governance mode and the read path do', () => {
    for (const text of ['SYNTHETIC TEST AUTHORITY', 'a fixture', 'Head of Governance', 'GOV-1']) {
      expect(isSyntheticAuthorityText(text)).toBe(isSyntheticRecordAuthority(text))
      const relabelled = { ...GOV, versions: { registry: text, ledger: 'LED-1' } }
      expect(selectAuthorityBundle({ ok: true, mode: 'governance' }, { governance: relabelled, synthetic_test: null }) === null).toBe(isSyntheticAuthorityText(text))
    }
  })

  test('the rule is not over-broad: a record whose approvals read as real is decided on its references', () => {
    const inputs = realLooking()
    const row = rowFrom(inputs)
    const g = state({ authority_class: 'governance', sources: inputs.sources, source_text_approvals: [inputs.source_text!.approval!] })
    expect(evaluateIssuanceEligibility(row.canonical, row.sha256, g).decision).toBe('eligible')
  })
})

describe('schemas 7 and 8 are not enabled by any of this', () => {
  test('a complete, non-synthetic record under its current contract is still ineligible in a shipped build', async () => {
    const inputs = realLooking()
    const row = rowFrom(inputs)
    const shipped = () => governanceSnapshotFrom({ issuance_date: AS_OF, sources: inputs.sources, topicClaims: CLAIMS, source_text_approvals: [inputs.source_text!.approval!], authority_class: 'governance' })
    expect(reasons(evaluateIssuanceEligibility(row.canonical, row.sha256, shipped()))).toEqual(['builder:reference_missing', 'record_schema:reference_missing'])
    await refusedEverywhere(shipped, row, 'ineligible', 'governance_ineligible')
    expect(CURRENT_ISSUANCE_SUPPORT).toEqual({ record_schemas: [], builders: [] })
  })
})

/** The real runner over an in-memory ledger row and the real artifact path. */
function fulfilment(issuance: V2IssuanceDeps) {
  issuanceDepsRef.current = issuance
  const artifacts = new Map<string, ArtifactRow>()
  const objects = new Map<string, Uint8Array>()
  const ledger = { payment_status: 'paid', amount_paid: 2900, pdf: 'pending', email: 'pending', finished: null as string | null, error: null as string | null }
  const emails = jest.fn(async () => ({ status: 'accepted' as const, providerId: 'p' }))
  const alert = jest.fn(async () => undefined)
  const renderer = rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'enabled')
  let n = 0
  const issueDeps: IssueDeps = {
    artifacts: {
      find: async (sid) => clone(Array.from(artifacts.values()).find((r) => r.submission_id === sid) ?? null),
      insertPending: async (row) => { const full: ArtifactRow = { ...row, id: 'art-1', status: 'pending', issued_at: null }; artifacts.set(full.id, full); return { result: 'inserted', row: clone(full) } },
      takeOver: async () => false,
      markIssued: async (id, attempt, sha) => { const r = artifacts.get(id)!; if (r.attempt_id !== attempt || r.sha256 !== sha) return false; r.status = 'issued'; r.issued_at = NOW.toISOString(); return true },
    },
    objects: { get: async (p) => objects.get(p) ?? null, put: async (p, b) => { objects.set(p, b); return 'stored' } },
    renderer: { family: renderer.family, generator_version: renderer.generator_version, ownsGeneratorVersion: (v) => renderer.ownsGeneratorVersion(v), render: (rid) => renderer.render(FULFILLMENT_SUB, rid, NOW), authorize: () => renderer.authorize!(FULFILLMENT_SUB, NOW) },
    newAttemptId: () => `attempt-${++n}`, now: () => NOW, uat: false,
  }
  const deps: FulfillmentDeps = {
    claim: async () => ({ claimed: true, claimToken: 't', reason: 'claimed', submissionId: SUB_ID, tier: 'creator_record', pdfStatus: ledger.pdf, emailStatus: ledger.email }),
    markStep: async (_s, _t, step, status) => { if (step === 'pdf') ledger.pdf = status; else ledger.email = status; return true },
    finish: async (_s, _t, err) => { ledger.error = err; ledger.finished = err ? 'failed' : 'completed'; return ledger.finished },
    loadSubmission: async () => FULFILLMENT_SUB,
    hasCreatorRecordPdf: async () => Array.from(artifacts.values()).some((a) => a.status === 'issued'),
    generateCreatorRecordPdf: async () => { await issueCreatorRecordArtifact(SUB_ID, issueDeps) },
    loadUserContact: async () => ({ name: 'Creator', email: 'creator@example.test' }),
    sendCreatorRecordEmail: emails, sendCreatorRecordV2Email: emails, sendCertifiedReceivedEmail: emails, notifyAdmin: async () => undefined, alert, siteUrl: 'https://example.test',
  }
  return { deps, ledger, artifacts, objects, emails, alert, issueDeps }
}

describe('5 and 6: a stale checkout cannot reach automatic issuance, and the payment is not lost', () => {
  const later = rowFrom(SYN, { status: 'prepared', reviewed_at: null }, 2)

  test('the control: a current version is issued and the customer told', async () => {
    const f = fulfilment(issuanceDeps(state).deps)
    expect((await runPaymentFulfillment('cs_1', f.deps)).status).toBe('completed')
    expect(f.ledger).toMatchObject({ pdf: 'completed', email: 'accepted' })
    expect(Array.from(f.artifacts.values())[0]).toMatchObject({ status: 'issued', generator_version: CREATOR_RECORD_V2_GENERATOR_VERSION })
  })

  test.each([
    ['corrected while the session stayed open', () => issuanceDeps(state, [BOUND, later]).deps, 'record_superseded'],
    ['contract withdrawn while the session stayed open', () => issuanceDeps(() => state({ sources: withContract({ ...APPROVAL, lifecycle: 'withdrawn' }) })).deps, 'governance_ineligible'],
    ['contract replaced while the session stayed open', () => issuanceDeps(() => state({ sources: withContract(null) })).deps, 'governance_ineligible'],
  ])('%s: no artifact, no ready email, payment recorded, step visibly incomplete', async (_n, deps, code) => {
    const f = fulfilment(deps())
    const out = await runPaymentFulfillment('cs_1', f.deps)
    expect(out.status).toBe('failed')
    expect(f.artifacts.size).toBe(0)
    expect(f.objects.size).toBe(0)
    expect(f.emails).not.toHaveBeenCalled()
    expect(f.ledger).toMatchObject({ payment_status: 'paid', amount_paid: 2900, pdf: 'pending', email: 'pending', finished: 'failed' })
    expect(f.ledger.error).toContain(code)
  })

  test('when retries run out the row reaches the existing manual queue with an alert', async () => {
    const f = fulfilment(issuanceDeps(state, [BOUND, later]).deps)
    const out = await runPaymentFulfillment('cs_1', { ...f.deps, claim: async () => ({ claimed: false, claimToken: null, reason: 'attempts_exhausted', submissionId: SUB_ID, tier: 'creator_record', pdfStatus: 'pending', emailStatus: 'pending' }) })
    expect(out).toMatchObject({ status: 'not_claimed', reason: 'attempts_exhausted' })
    expect(f.alert).toHaveBeenCalledWith('Fulfillment needs reconciliation', expect.objectContaining({ submission: SUB_ID, reason: 'attempts_exhausted' }))
  })

  test('the webhook records the payment before fulfilment runs, and neither a refusal nor a throw undoes it', () => {
    const src = readFileSync(join(process.cwd(), 'app', 'api', 'webhooks', 'stripe', 'route.ts'), 'utf8')
    expect(src.indexOf('await recordCheckoutPayment(facts)')).toBeGreaterThan(0)
    expect(src.indexOf('await recordCheckoutPayment(facts)')).toBeLessThan(src.indexOf('await runPaymentFulfillment('))
  })
})

describe('7: resuming a pending artifact cannot bypass eligibility', () => {
  async function pending(issuance: V2IssuanceDeps) {
    const f = fulfilment(issuance)
    const bytes = new TextEncoder().encode('PDF')
    const row: ArtifactRow = { id: 'art-1', submission_id: SUB_ID, record_id: 'CR-2026-33333333', attempt_id: 'earlier', storage_path: `${SUB_ID}/earlier.pdf`, sha256: sha256Hex(bytes), byte_size: bytes.byteLength, generator_version: CREATOR_RECORD_V2_GENERATOR_VERSION, status: 'pending', uat: false, issued_at: null }
    f.artifacts.set(row.id, row)
    f.objects.set(row.storage_path, bytes)
    return f
  }

  test('the control: an eligible pending attempt completes without rendering again', async () => {
    const i = issuanceDeps(state)
    const f = await pending(i.deps)
    expect((await issueCreatorRecordArtifact(SUB_ID, f.issueDeps)).outcome).toBe('issued')
    expect(i.render).not.toHaveBeenCalled()
  })

  test.each([
    ['contract withdrawn', () => issuanceDeps(() => state({ sources: withContract({ ...APPROVAL, lifecycle: 'withdrawn' }) })).deps, 'governance_ineligible'],
    ['version corrected', () => issuanceDeps(state, [BOUND, rowFrom(SYN, { status: 'prepared', reviewed_at: null }, 2)]).deps, 'record_superseded'],
    ['bound record altered', () => issuanceDeps(state, [{ ...BOUND, canonical: BOUND.canonical.replace('"record_version":1', '"record_version":1 ') }]).deps, 'record_integrity'],
  ])('%s: the attempt stays pending, nothing is issued', async (_n, deps, code) => {
    const f = await pending(deps())
    expect(await refusal(issueCreatorRecordArtifact(SUB_ID, f.issueDeps))).toBe(code)
    expect(f.artifacts.get('art-1')).toMatchObject({ status: 'pending', issued_at: null })
  })

  test('a stored object that differs from its record is still an integrity conflict, before any eligibility check', async () => {
    const f = await pending(issuanceDeps(state).deps)
    f.objects.set(`${SUB_ID}/earlier.pdf`, new TextEncoder().encode('OTHER'))
    expect((await issueCreatorRecordArtifact(SUB_ID, f.issueDeps)).outcome).toBe('integrity_conflict')
  })

  test('production wiring: the v2 renderer carries the check through; v1 has none and is unchanged', () => {
    const v2 = rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'enabled')
    expect(typeof issueDepsFor(FULFILLMENT_SUB, v2).renderer.authorize).toBe('function')
    const v1 = rendererForFamily(CREATOR_RECORD_V1_FAMILY)
    expect(v1.authorize).toBeUndefined()
    expect(issueDepsFor({ ...FULFILLMENT_SUB, creator_record_product: null }, v1).renderer.authorize).toBeUndefined()
  })
})

describe('8: purchased and issued versions stay bound', () => {
  test('issuance renders exactly the bound version, by digest', async () => {
    const i = issuanceDeps(state)
    await renderV2ForIssuance(i.deps, SUB, 'CR-2026-33333333', NOW)
    expect(i.render.mock.calls[0][0]).toMatchObject({ canonical: BOUND.canonical, sha256: BOUND.sha256 })
  })

  test('a binding that does not point back, or another owner, refuses', async () => {
    const g = issuanceDeps(state, [{ ...BOUND, submission_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }])
    expect(await refusal(renderV2ForIssuance(g.deps, SUB, 'CR-2026-33333333', NOW))).toBe('binding_mismatch')
    expect(await refusal(renderV2ForIssuance(issuanceDeps(state).deps, { ...SUB, user_id: 'someone-else' }, 'CR-2026-33333333', NOW))).toBe('binding_mismatch')
  })

  test('a record already issued is not affected by a later correction or withdrawal: nothing is re-checked, re-rendered or replaced', async () => {
    const first = fulfilment(issuanceDeps(state).deps)
    await runPaymentFulfillment('cs_1', first.deps)
    const issued = Array.from(first.artifacts.values())[0]
    const refusing = issuanceDeps(() => state({ sources: withContract({ ...APPROVAL, lifecycle: 'withdrawn' }) }), [BOUND, rowFrom(SYN, { status: 'prepared', reviewed_at: null }, 2)])
    issuanceDepsRef.current = refusing.deps
    const again = await issueCreatorRecordArtifact(SUB_ID, first.issueDeps)
    expect(again).toMatchObject({ outcome: 'already_issued', artifact: { sha256: issued.sha256, status: 'issued' } })
    expect(refusing.render).not.toHaveBeenCalled()
  })
})

describe('9: reading stays exactly as it was', () => {
  test.each([[5], [6]])('a saved schema %i row verifies and reads, byte for byte, with no contract invented', async (schema) => {
    const r = saved(schema)
    const before = r.canonical
    expect(verifyCustomerRecord(r.canonical, r.sha256).ok).toBe(true)
    const deps = {
      submissions: 'stopped', hasPilotAccess: async () => true, store: { get: async () => r } as never, inputs: () => SYN, topicClaims: CLAIMS,
      now: () => NOW, newId: () => 'x', syntheticUat: { admits: () => true, inputs: () => SYN },
    } as unknown as FlowDeps
    const view = await getPrepared(deps, r.user_id, r.id)
    expect(view).toMatchObject({ ok: true, view: { id: r.id, questionnaire_contract: null } })
    expect(r.canonical).toBe(before)
  })

  test('a schema 7 version under a withdrawn contract still reads and verifies: withdrawal stops commercial actions only', async () => {
    const withdrawn: ApprovedInputs = { ...SYN, sources: withContract({ ...APPROVAL, lifecycle: 'withdrawn' }) }
    const deps = {
      submissions: 'stopped', hasPilotAccess: async () => true, store: { get: async () => ROW } as never, inputs: () => withdrawn, topicClaims: CLAIMS,
      now: () => NOW, newId: () => 'x', syntheticUat: { admits: () => true, inputs: () => withdrawn },
    } as unknown as FlowDeps
    expect(await getPrepared(deps, OWNER, ROW.id)).toMatchObject({ ok: true, view: { questionnaire_contract: { contract_sha256: APPROVAL.contract_sha256 } } })
  })
})

describe('10: the existing stops are all still in force', () => {
  test('submissions and issuance are stopped, and customer governance is empty', () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('stopped')
    expect(GOV.questionnaire_approval).toBeNull()
    expect(GOV.source_text_approval).toBeNull()
    expect(GOV.pdf_template_approval).toBeNull()
    expect(approvedCustomerRecordInputs(GOV).source_text).toBeNull()
    expect(approvedPdfTemplates(GOV)).toEqual({ templates: null, approval: null })
  })

  test('the renderer stop still comes first, on every issuance path', () => {
    expect(() => selectCreatorRecordRenderer(FULFILLMENT_SUB)).toThrow(CreatorRecordIssuanceStoppedError)
    expect(() => rendererForFamily(CREATOR_RECORD_V2_FAMILY)).toThrow(CreatorRecordIssuanceStoppedError)
  })

  test('purchase and checkout still refuse on each stop before anything else', async () => {
    const stopped = purchaseDeps(state)
    expect(await startPurchase({ ...stopped.deps, issuance: 'stopped' }, OWNER, ROW.id)).toEqual({ ok: false, status: 503, code: 'issuance_stopped' })
    expect(await startPurchase({ ...stopped.deps, submissions: 'stopped' }, OWNER, ROW.id)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(await checkV2Checkout({ ...stopped.deps, issuance: 'stopped' }, OWNER, SUB)).toEqual({ ok: false, status: 503, code: 'issuance_stopped' })
    expect(stopped.bind).not.toHaveBeenCalled()
  })

  test('the shipped governance snapshot refuses a real-looking record outright', () => {
    const row = rowFrom(realLooking())
    expect(evaluateIssuanceEligibility(row.canonical, row.sha256, approvedGovernanceSnapshot(AS_OF, CLAIMS, GOV)).decision).toBe('ineligible')
  })
})
