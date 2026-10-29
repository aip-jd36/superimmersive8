/**
 * CR-PDF-DECLARATIONS-1 / 1C — admin generate-creator-record route, legacy branch:
 *   - first-time generation passes the recorded declaration flags to the generator;
 *   - an EXISTING issued legacy PDF is never regenerated automatically, whatever its
 *     declaration flags: with ?force=true the route answers 409 regeneration_review_required
 *     and generates nothing; without it, the existing 400 status and response shape are unchanged (message updated in 1D);
 *   - the artifact branch is unchanged.
 */

const state = {
  submission: {} as Record<string, unknown>,
  existing: null as null | { id: string; document_url: string },
  path: 'legacy' as 'artifact' | 'legacy',
  generated: [] as Array<Record<string, unknown>>,
  issueCalls: 0,
}

jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }) } }) }))
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const b: Record<string, unknown> = {}
      b.select = () => b
      b.eq = () => b
      b.single = async () => (table === 'users' ? { data: { is_admin: true }, error: null } : { data: state.submission, error: null })
      b.maybeSingle = async () => ({ data: table === 'rights_packages' ? state.existing : null, error: null })
      return b
    },
  },
}))
jest.mock('@/lib/creator-record-artifacts/precedence', () => ({ EligibilityUnknownError: class extends Error {}, issuancePath: async () => state.path }))
jest.mock('@/lib/creator-record-artifacts/issue', () => ({
  issueCreatorRecordArtifact: async () => { state.issueCalls++; return { outcome: 'already_issued', artifact: { record_id: 'CR-2026-S1' } } },
}))
jest.mock('@/lib/creator-record-artifacts/production', () => ({ issueDepsFor: () => ({}) }))
jest.mock('@/lib/creator-record-artifacts/store', () => ({ artifactStatus: async () => null, artifactGateDecision: async () => 'not_allowlisted' }))
jest.mock('@/lib/payments/repository', () => ({ hasCreatorRecordPdf: async () => false }))
jest.mock('@/lib/pdf/generateChainOfTitle', () => ({
  generateCreatorRecordPDF: async (params: Record<string, unknown>) => {
    state.generated.push(params)
    return 'https://legacy.example/x.pdf'
  },
}))

import { POST } from '@/app/api/admin/submissions/[id]/generate-creator-record/route'

const call = (force = false) => POST(new Request(`http://localhost/api/admin/submissions/s1/generate-creator-record${force ? '?force=true' : ''}`, { method: 'POST' }) as any, { params: { id: 's1' } })

const submission = (c: unknown, i: unknown) => ({
  id: 's1', tier: 'creator_record', status: 'approved', title: 'T', filmmaker_name: 'F', tools_used: '[]',
  likeness_confirmation: '{}', ip_confirmation: '{}', territory_preferences: 'Global',
  custodian_declaration: c, indemnification_confirmed: i,
})

beforeEach(() => {
  state.existing = null
  state.path = 'legacy'
  state.generated = []
  state.issueCalls = 0
})

describe('first-time legacy generation (no existing PDF)', () => {
  test.each([
    [true, true],
    [false, false],
    [true, false],
    [null, undefined],
  ])('custodian=%p indemnification=%p are passed to the generator unchanged', async (c, i) => {
    state.submission = submission(c, i)
    const r = await call(true) // the admin UI button always sends ?force=true
    expect(r.status).toBe(200)
    expect(state.generated).toHaveLength(1)
    expect(state.generated[0].custodianDeclaration).toBe(c)
    expect(state.generated[0].indemnificationConfirmed).toBe(i)
  })
})

describe('an existing issued legacy PDF', () => {
  beforeEach(() => { state.existing = { id: 'rp1', document_url: 'https://legacy.example/old.pdf' } })

  const STATES: Array<[unknown, unknown]> = [[true, true], [false, false], [true, false], [false, true], [null, undefined]]

  test.each(STATES)('custodian=%p indemnification=%p, ?force=true → 409 regeneration_review_required, nothing generated', async (c, i) => {
    state.submission = submission(c, i)
    const r = await call(true)
    expect(r.status).toBe(409)
    expect(await r.json()).toEqual({
      error: 'This Creator Record PDF has already been issued and is not regenerated automatically. Nothing was changed; operator review is required.',
      status: 'regeneration_review_required',
    })
    expect(state.generated).toHaveLength(0)
  })

  test.each(STATES)('custodian=%p indemnification=%p, no force → 400 with the same shape, nothing generated', async (c, i) => {
    state.submission = submission(c, i)
    const r = await call(false)
    expect(r.status).toBe(400)
    expect(await r.json()).toEqual({
      error: 'Creator Record PDF already exists. It is not regenerated automatically; operator review is required.',
      documentUrl: 'https://legacy.example/old.pdf',
    })
    expect(state.generated).toHaveLength(0)
  })
})

test('artifact branch is unaffected: an issued artifact still answers 409 already issued, legacy generator never runs', async () => {
  state.path = 'artifact'
  state.submission = submission(false, false)
  const r = await call(true)
  expect(r.status).toBe(409)
  expect((await r.json()).status).toBe('issued')
  expect(state.issueCalls).toBe(1)
  expect(state.generated).toHaveLength(0)
})
