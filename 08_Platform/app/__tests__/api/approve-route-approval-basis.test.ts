/**
 * CR-PDF-CLAIMS-1C.1 — the admin approve route tells the approval email what the approval establishes.
 *   - si8_certified is approvable only with an ACTIVE assessment sign-off (existing gate, unchanged),
 *     so it is the only tier whose email may describe a signed-off, human-reviewed Assessment;
 *   - creator_record and the /record 'certified' tier are approved by an admin status change only.
 */
const state = {
  tier: 'si8_certified' as string,
  signoff: 'active' as string | null,
  updates: 0,
}
const mockSendApproved = jest.fn(async (..._args: unknown[]) => undefined)

jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }) } }) }))
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      let cols = ''
      const b: Record<string, unknown> = {}
      b.select = (c: string) => { cols = c; return b }
      b.eq = () => b
      b.update = () => { state.updates++; return { eq: async () => ({ error: null }) } }
      b.single = async () => {
        if (table === 'users') return { data: { is_admin: true }, error: null }
        if (table === 'assessments') return { data: state.signoff ? { signoff_status: state.signoff } : null, error: null }
        if (cols === 'tier, risk_rating') return { data: { tier: state.tier, risk_rating: 'low' }, error: null }
        return { data: { id: 's1', tier: state.tier, title: 'Synthetic Film', filmmaker_name: 'Synthetic Creator', risk_rating: 'low', user: { email: 'creator@example.test', name: 'C' } }, error: null }
      }
      return b
    },
  },
}))
jest.mock('@/lib/emails', () => ({ sendSubmissionApprovedEmail: (...args: unknown[]) => mockSendApproved(...args) }))

import { POST } from '@/app/api/admin/submissions/[id]/approve/route'

const call = () => POST(new Request('http://localhost/api/admin/submissions/s1/approve', { method: 'POST', body: '{}' }) as any, { params: { id: 's1' } })

beforeEach(() => { mockSendApproved.mockClear(); state.updates = 0; state.signoff = 'active' })

test.each([
  ['si8_certified', 'active', 'assessment_signed_off'],
  ['creator_record', null, 'status_only'],
  ['certified', null, 'status_only'],
  ['certified', 'active', 'status_only'],
])('tier %s (assessment sign-off %p) → approval email basis %s', async (tier, signoff, basis) => {
  state.tier = tier
  state.signoff = signoff
  const res = await call()
  expect(res.status).toBe(200)
  expect(mockSendApproved).toHaveBeenCalledTimes(1)
  expect(mockSendApproved.mock.calls[0][5]).toBe(basis)
})

test.each([[null], ['revoked'], ['pending']])('si8_certified without an active sign-off (%p) is still refused: no approval, no email', async (signoff) => {
  state.tier = 'si8_certified'
  state.signoff = signoff
  const res = await call()
  expect(res.status).toBe(400)
  expect(state.updates).toBe(0)
  expect(mockSendApproved).not.toHaveBeenCalled()
})
