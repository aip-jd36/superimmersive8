/**
 * CR-ARTIFACT-1 — admin retry route (generate-creator-record): artifact-path
 * submissions are resumed through the issuance procedure and an issued
 * artifact is never replaced, even with ?force=true; legacy submissions keep
 * the existing behaviour.
 */

const state = {
  isAdmin: true,
  submission: { id: 's1', tier: 'creator_record', status: 'approved', title: 'T' } as Record<string, unknown>,
  path: 'artifact' as 'artifact' | 'legacy' | 'legacy_complete' | 'unknown',
  issue: { outcome: 'issued', artifact: { record_id: 'CR-2026-S1' } } as Record<string, unknown>,
  legacyCalls: 0,
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
jest.mock('@/lib/creator-record-artifacts/precedence', () => {
  class EligibilityUnknownError extends Error {}
  return {
    EligibilityUnknownError,
    issuancePath: async () => {
      if (state.path === 'unknown') throw new EligibilityUnknownError('creator_record_artifact_eligibility_unknown')
      return state.path
    },
  }
})
jest.mock('@/lib/creator-record-artifacts/issue', () => ({ issueCreatorRecordArtifact: async () => state.issue }))
jest.mock('@/lib/creator-record-artifacts/production', () => ({ issueDepsFor: () => ({}) }))
jest.mock('@/lib/creator-record-artifacts/store', () => ({ artifactStatus: async () => null, artifactGateDecision: async () => 'not_allowlisted' }))
jest.mock('@/lib/payments/repository', () => ({ hasCreatorRecordPdf: async () => false }))
jest.mock('@/lib/pdf/generateChainOfTitle', () => ({
  generateCreatorRecordPDF: async () => {
    state.legacyCalls++
    return 'https://legacy.example/x.pdf'
  },
}))

import { POST } from '@/app/api/admin/submissions/[id]/generate-creator-record/route'

const call = (force = false) => POST(new Request(`http://localhost/api/admin/submissions/s1/generate-creator-record${force ? '?force=true' : ''}`, { method: 'POST' }) as any, { params: { id: 's1' } })

beforeEach(() => {
  state.isAdmin = true
  state.submission = { id: 's1', tier: 'creator_record', status: 'approved', title: 'T' }
  state.path = 'artifact'
  state.issue = { outcome: 'issued', artifact: { record_id: 'CR-2026-S1' } }
  state.legacyCalls = 0
})

test('non-admin → 403 (unchanged)', async () => {
  state.isAdmin = false
  expect((await call()).status).toBe(403)
})

test('artifact path: issues through the procedure; returns the record id, never a storage path or URL', async () => {
  const r = await call()
  expect(r.status).toBe(200)
  const body = await r.json()
  expect(body).toEqual({ success: true, status: 'issued', recordId: 'CR-2026-S1' })
  expect(state.legacyCalls).toBe(0)
})

test('artifact path: an issued artifact is never replaced, even with ?force=true → 409', async () => {
  state.issue = { outcome: 'already_issued', artifact: { record_id: 'CR-2026-S1' } }
  const r = await call(true)
  expect(r.status).toBe(409)
  expect((await r.json()).status).toBe('issued')
  expect(state.legacyCalls).toBe(0)
})

test('artifact path: contended → 409 in progress; integrity conflict → 500, nothing changed', async () => {
  state.issue = { outcome: 'contended' }
  expect((await call()).status).toBe(409)
  state.issue = { outcome: 'integrity_conflict', artifactId: 'a1' }
  const r = await call()
  expect([r.status, (await r.json()).status]).toEqual([500, 'integrity_conflict'])
})

test('artifact path requires an approved (paid) Creator Record', async () => {
  state.submission = { ...state.submission, status: 'pending' }
  expect((await call()).status).toBe(409)
})

test('legacy path: the existing generator is used, unchanged', async () => {
  state.path = 'legacy'
  const r = await call()
  expect(r.status).toBe(200)
  expect(state.legacyCalls).toBe(1)
})

test('CR-ARTIFACT-1C: unknown eligibility → 503; nothing issued on either path', async () => {
  state.path = 'unknown'
  const r = await call(true)
  expect([r.status, (await r.json()).status]).toEqual([503, 'unavailable'])
  expect(state.legacyCalls).toBe(0)
})
