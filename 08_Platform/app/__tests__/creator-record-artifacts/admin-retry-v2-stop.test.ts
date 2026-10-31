/**
 * CR-V2-MVP-M2 — the admin generation retry route refuses a Creator Record v2 submission
 * while v2 issuance is stopped: 409 `issuance_stopped`, and no eligibility lookup,
 * artifact issuance or legacy generation runs. v1 behaviour is covered by
 * admin-retry-renderer.test.ts and is unchanged.
 */

const state = { submission: {} as Record<string, unknown>, pathCalls: 0, issueCalls: 0, legacyCalls: 0 }
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }) } }) }))
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const b: Record<string, unknown> = {}
      b.select = () => b
      b.eq = () => b
      b.single = async () => (table === 'users' ? { data: { is_admin: true }, error: null } : { data: state.submission, error: null })
      b.maybeSingle = async () => ({ data: null, error: null })
      return b
    },
  },
}))
jest.mock('@/lib/creator-record-artifacts/precedence', () => ({
  EligibilityUnknownError: class extends Error {},
  issuancePath: async () => ((state.pathCalls++), 'artifact'),
}))
jest.mock('@/lib/creator-record-artifacts/issue', () => ({ issueCreatorRecordArtifact: async () => ((state.issueCalls++), { outcome: 'issued', artifact: { record_id: 'CR-2026-0A1B2C3D' } }) }))
jest.mock('@/lib/creator-record-artifacts/production', () => ({ issueDepsFor: () => ({}) }))
jest.mock('@/lib/creator-record-artifacts/store', () => ({ artifactStatus: async () => null, artifactGateDecision: async () => 'all' }))
jest.mock('@/lib/payments/repository', () => ({ hasCreatorRecordPdf: async () => false }))
jest.mock('@/lib/pdf/generateChainOfTitle', () => ({ generateCreatorRecordPDF: async () => ((state.legacyCalls++), 'https://legacy.example/x.pdf') }))

import { POST } from '@/app/api/admin/submissions/[id]/generate-creator-record/route'

const call = (query = '') =>
  POST(new Request(`http://localhost/api/admin/submissions/s1/generate-creator-record${query}`, { method: 'POST' }) as any, { params: { id: 's1' } })

test.each(['', '?force=true'])('a v2 submission is not issued while v2 issuance is stopped (%s)', async (query) => {
  state.submission = { id: 's1', user_id: 'u1', tier: 'creator_record', status: 'approved', payment_status: 'paid', title: 'V2', creator_record_product: 'v2' }
  state.pathCalls = state.issueCalls = state.legacyCalls = 0
  const res = await call(query)
  expect(res.status).toBe(409)
  expect((await res.json()).status).toBe('issuance_stopped')
  expect(state).toMatchObject({ pathCalls: 0, issueCalls: 0, legacyCalls: 0 })
})

test('a v1 submission still reaches the artifact path', async () => {
  state.submission = { id: 's1', user_id: 'u1', tier: 'creator_record', status: 'approved', payment_status: 'paid', title: 'V1' }
  state.pathCalls = state.issueCalls = state.legacyCalls = 0
  const res = await call()
  expect(res.status).toBe(200)
  expect(state).toMatchObject({ pathCalls: 1, issueCalls: 1, legacyCalls: 0 })
})
