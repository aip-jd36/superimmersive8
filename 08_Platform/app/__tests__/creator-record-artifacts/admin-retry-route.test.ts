/**
 * CR-ARTIFACT-1 — admin retry route (generate-creator-record): artifact-path
 * submissions are resumed through the issuance procedure and an issued
 * artifact is never replaced, even with ?force=true; legacy submissions keep
 * the existing behaviour.
 */

const state = {
  isAdmin: true,
  submission: { id: 's1', tier: 'creator_record', status: 'approved', payment_status: 'paid', title: 'T' } as Record<string, unknown>,
  path: 'artifact' as 'artifact' | 'legacy' | 'legacy_complete' | 'unknown',
  issue: { outcome: 'issued', artifact: { record_id: 'CR-2026-S1' } } as Record<string, unknown>,
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
jest.mock('@/lib/creator-record-artifacts/precedence', () => {
  class EligibilityUnknownError extends Error {}
  return {
    EligibilityUnknownError,
    issuancePath: async () => {
      state.pathCalls++
      if (state.path === 'unknown') throw new EligibilityUnknownError('creator_record_artifact_eligibility_unknown')
      return state.path
    },
  }
})
jest.mock('@/lib/creator-record-artifacts/issue', () => ({ issueCreatorRecordArtifact: async () => ((state.issueCalls++), state.issue) }))
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
  state.submission = { id: 's1', tier: 'creator_record', status: 'approved', payment_status: 'paid', title: 'T' }
  state.path = 'artifact'
  state.issue = { outcome: 'issued', artifact: { record_id: 'CR-2026-S1' } }
  state.legacyCalls = 0
  state.pathCalls = 0
  state.issueCalls = 0
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

test('legacy path: the existing generator is used; the response carries the authenticated delivery path, never the storage URL', async () => {
  state.path = 'legacy'
  const r = await call()
  expect(r.status).toBe(200)
  expect(state.legacyCalls).toBe(1)
  const body = await r.json()
  expect(body.downloadPath).toBe('/api/creator-record/s1/pdf')
  expect(JSON.stringify(body)).not.toMatch(/https?:|legacy\.example/)
})

// CR-LEGACY-DOCUMENT-SECURITY-1C: one eligibility rule (approved = paid Creator Record) guards BOTH paths,
// before any eligibility lookup or generation. Previously the legacy path issued for any status.
// CR-LEGACY-DOCUMENT-SECURITY-1C.2: approved AND paid, on both branches, with or without ?force=true.
// A fully discounted ($0) payment is recorded as 'paid' and stays eligible.
const ELIGIBILITY: Array<[string, Record<string, unknown>, boolean]> = [
  ['approved + paid', { status: 'approved', payment_status: 'paid', amount_paid: 49900 }, true],
  ['approved + paid, $0 (fully discounted)', { status: 'approved', payment_status: 'paid', amount_paid: 0 }, true],
  ['approved + unpaid', { status: 'approved', payment_status: 'unpaid' }, false],
  ['approved + refunded', { status: 'approved', payment_status: 'refunded' }, false],
  ['approved + payment status missing', { status: 'approved', payment_status: null }, false],
  ['pending + paid', { status: 'pending', payment_status: 'paid' }, false],
  ['rejected + paid', { status: 'rejected', payment_status: 'paid' }, false],
]
test.each(ELIGIBILITY)('%s → eligible=%p on both branches, with and without force; rejection precedes any lookup, generation or write', async (_label, over, eligible) => {
  for (const path of ['legacy', 'artifact'] as const) {
    for (const force of [false, true]) {
      state.path = path
      state.submission = { id: 's1', tier: 'creator_record', title: 'T', ...over }
      state.legacyCalls = 0
      state.pathCalls = 0
      state.issueCalls = 0
      const r = await call(force)
      if (eligible) {
        expect([path, force, r.status]).toEqual([path, force, 200])
        expect(state.pathCalls).toBe(1)
        expect(state.legacyCalls + state.issueCalls).toBe(1)
      } else {
        expect([path, force, r.status]).toEqual([path, force, 409])
        expect(await r.json()).toEqual({ error: 'Creator Record is not approved (paid) yet' })
        expect([state.pathCalls, state.legacyCalls, state.issueCalls]).toEqual([0, 0, 0])
      }
    }
  }
})

test.each([['pending'], ['under_review'], ['info_requested'], ['rejected'], [null]])(
  'status %p → 409 on the legacy path (and with ?force=true): nothing generated, no eligibility lookup', async (status) => {
    for (const path of ['legacy', 'artifact'] as const) {
      for (const force of [false, true]) {
        state.path = path
        state.submission = { ...state.submission, status }
        state.legacyCalls = 0
        state.pathCalls = 0
        state.issueCalls = 0
        const r = await call(force)
        expect([path, force, r.status]).toEqual([path, force, 409])
        expect(await r.json()).toEqual({ error: 'Creator Record is not approved (paid) yet' })
        expect([state.legacyCalls, state.pathCalls, state.issueCalls]).toEqual([0, 0, 0])
      }
    }
  })

test('CR-ARTIFACT-1C: unknown eligibility → 503; nothing issued on either path', async () => {
  state.path = 'unknown'
  const r = await call(true)
  expect([r.status, (await r.json()).status]).toEqual([503, 'unavailable'])
  expect(state.legacyCalls).toBe(0)
})
