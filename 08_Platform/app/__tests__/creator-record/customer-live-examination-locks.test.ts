/**
 * CR-V2-MVP-M2A — lifting the EVALUATION lock alone (as a controlled evaluation would) never opens the customer path: the customer
 * entry point, its executor and the route wiring each need the customer lock too.
 */
import { CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/live-examination/controls'
import { examineCustomerDocumentLive, type CustomerLivePorts } from '@/lib/creator-record/live-examination/customer'
import { loadCustomerLiveExecutor } from '@/lib/creator-record/live-examination/real-executor'

jest.mock('@/lib/creator-record/live-examination/controls', () => ({ ...jest.requireActual('@/lib/creator-record/live-examination/controls'), LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true, CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: false })) // CR-V2-MVP-PROD-UAT-ACTIVATION-1: the customer lock ships true; pinned false here
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: new Proxy({}, { get: () => { throw new Error('no database in this test') } }) }))

test('the evaluation lock is lifted here, the customer lock is not', () => {
  expect(LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD).toBe(true)
  expect(CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD).toBe(false)
})

test('the customer entry point, its executor and the route wiring all stay closed', async () => {
  const no = () => { throw new Error('a port was called') }
  const ports: CustomerLivePorts = { getDocument: no, logLiveRead: no, readObject: no, listLiveAttempts: no, reserve: no, record: no, settle: no }
  expect((await examineCustomerDocumentLive({ ports, isKnownSyntheticFixture: () => false, now: () => new Date() }, 'u', 'd')).result).toEqual({ kind: 'disabled', reason: 'code_lock' })
  await expect(loadCustomerLiveExecutor({ document_sha256: 'a'.repeat(64) }, { env: { CREATOR_RECORD_EXTRACTION_API_KEY: 'x' }, loadAdapter: async () => { throw new Error('adapter must not load') } })).rejects.toThrow(/code_lock/)
  const wiring = await import('@/lib/creator-record-flow/examination-customer')
  expect(wiring.customerLiveEnabledInThisBuild()).toBe(false)
  expect('live' in wiring.productionCustomerExaminationDeps()).toBe(false)
})
