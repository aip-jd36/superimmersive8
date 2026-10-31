/**
 * CR-OPTION-C-OC2A — admin generation retry route: the renderer is selected
 * from the stored submission only, after the existing authorization and
 * eligibility checks and before any issuance lookup. An unsupported product
 * family issues nothing on either path; request values never choose a renderer.
 */

const state = {
  isAdmin: true,
  submission: {} as Record<string, unknown>,
  path: 'artifact' as 'artifact' | 'legacy' | 'legacy_complete',
  select: 'real' as 'real' | 'throw' | 'no_legacy',
  selectedFrom: [] as unknown[],
  depsRenderers: [] as unknown[],
  legacyCalls: 0,
  pathCalls: 0,
  issueCalls: 0,
}

jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }) } }) }))
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const b: Record<string, unknown> = {}
      b.select = () => b
      b.eq = () => b
      b.single = async () => (table === 'users' ? { data: { is_admin: state.isAdmin }, error: null } : { data: state.submission, error: null })
      b.maybeSingle = async () => ({ data: null, error: null })
      return b
    },
  },
}))
jest.mock('@/lib/creator-record-artifacts/precedence', () => ({
  EligibilityUnknownError: class extends Error {},
  issuancePath: async () => ((state.pathCalls++), state.path),
}))
jest.mock('@/lib/creator-record-artifacts/issue', () => ({ issueCreatorRecordArtifact: async () => ((state.issueCalls++), { outcome: 'issued', artifact: { record_id: 'CR-2026-S1' } }) }))
jest.mock('@/lib/creator-record-artifacts/production', () => ({ issueDepsFor: (_sub: unknown, renderer: unknown) => ((state.depsRenderers.push(renderer)), {}) }))
jest.mock('@/lib/creator-record-artifacts/store', () => ({ artifactStatus: async () => null, artifactGateDecision: async () => 'not_allowlisted' }))
jest.mock('@/lib/payments/repository', () => ({ hasCreatorRecordPdf: async () => false }))
jest.mock('@/lib/pdf/generateChainOfTitle', () => ({ generateCreatorRecordPDF: async () => ((state.legacyCalls++), 'https://legacy.example/x.pdf') }))
jest.mock('@/lib/creator-record-artifacts/renderers', () => {
  const actual = jest.requireActual('@/lib/creator-record-artifacts/renderers')
  return {
    ...actual,
    selectCreatorRecordRenderer: (sub: unknown) => {
      state.selectedFrom.push(sub)
      if (state.select === 'throw') throw new actual.UnsupportedProductFamilyError()
      const r = actual.selectCreatorRecordRenderer(sub)
      return state.select === 'no_legacy' ? { ...r, legacy_path_permitted: false } : r
    },
  }
})

import { POST } from '@/app/api/admin/submissions/[id]/generate-creator-record/route'
import { CREATOR_RECORD_V1_FAMILY, rendererForFamily } from '@/lib/creator-record-artifacts/renderers'

const call = (query = '', body?: unknown) =>
  POST(new Request(`http://localhost/api/admin/submissions/s1/generate-creator-record${query}`, { method: 'POST', ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}) }) as any, { params: { id: 's1' } })

beforeEach(() => {
  state.isAdmin = true
  state.submission = { id: 's1', tier: 'creator_record', status: 'approved', payment_status: 'paid', title: 'T' }
  state.path = 'artifact'
  state.select = 'real'
  state.selectedFrom = []
  state.depsRenderers = []
  state.legacyCalls = state.pathCalls = state.issueCalls = 0
})

test('authorization and eligibility are checked first, unchanged; no renderer is selected for a refused request', async () => {
  state.isAdmin = false
  expect((await call()).status).toBe(403)
  state.isAdmin = true
  state.submission = { ...state.submission, payment_status: 'unpaid' }
  expect((await call()).status).toBe(409)
  state.submission = { ...state.submission, tier: 'si8_certified', payment_status: 'paid' }
  expect((await call()).status).toBe(400)
  expect(state.selectedFrom).toHaveLength(0)
})

test('artifact path: the v1 renderer selected from the stored submission is the one passed to issuance', async () => {
  const r = await call()
  expect(r.status).toBe(200)
  expect(state.selectedFrom).toEqual([state.submission])
  expect(state.depsRenderers).toEqual([rendererForFamily(CREATOR_RECORD_V1_FAMILY)])
})

test('request values cannot choose a renderer, family or generator version', async () => {
  const r = await call('?renderer=v2&family=creator_record_v2&generator_version=x', { renderer: 'v2', family: 'creator_record_v2', generator_version: 'x' })
  expect(r.status).toBe(200)
  expect(state.selectedFrom).toEqual([state.submission])
  expect(state.depsRenderers).toEqual([rendererForFamily(CREATOR_RECORD_V1_FAMILY)])
})

test('unsupported family: 409 before any issuance lookup; nothing issued on either path', async () => {
  state.select = 'throw'
  for (const p of ['artifact', 'legacy'] as const) {
    state.path = p
    const r = await call('?force=true')
    expect(r.status).toBe(409)
    expect((await r.json()).status).toBe('unsupported_product_family')
  }
  expect(state.pathCalls + state.issueCalls + state.legacyCalls).toBe(0)
})

test('a family that does not permit the legacy generator never reaches it', async () => {
  state.select = 'no_legacy'
  state.path = 'legacy'
  const r = await call()
  expect(r.status).toBe(409)
  expect((await r.json()).status).toBe('unsupported_product_family')
  expect(state.legacyCalls).toBe(0)
})

test('legacy path for v1 is unchanged', async () => {
  state.path = 'legacy'
  const r = await call()
  expect(r.status).toBe(200)
  expect(state.legacyCalls).toBe(1)
  expect(state.issueCalls).toBe(0)
})
