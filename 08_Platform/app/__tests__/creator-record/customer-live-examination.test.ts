/**
 * CR-V2-MVP-M2A — the customer live examination in THIS build: both code locks false, so nothing live runs, is wired or is loaded.
 * The end-to-end behaviour with the locks lifted is proved on real PostgreSQL (`__tests__/db/creator-record-v2-customer-live-examination.db.test.ts`).
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD, LIVE_BOUNDS, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/live-examination/controls'
import { examineCustomerDocumentLive, type CustomerLivePorts } from '@/lib/creator-record/live-examination/customer'
import { loadCustomerLiveExecutor } from '@/lib/creator-record/live-examination/real-executor'
import { parseLiveExaminationProjection } from '@/lib/creator-record/live-examination/projection'
import { EVIDENCE_MAX_BYTES, EVIDENCE_STORED_MAX_BYTES } from '@/lib/creator-record/evidence-intake/vocabulary'
import { EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED } from '@/lib/creator-record/evidence-intake/contract'
import { CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { CURRENT_ISSUANCE_SUPPORT } from '@/lib/creator-record/customer-record/governance-state'

jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: new Proxy({}, { get: () => { throw new Error('no database in this test') } }) }))

const APP = process.cwd()
const untouched = (): CustomerLivePorts => {
  const no = () => { throw new Error('a port was called while the locks are off') }
  return { getDocument: no, logLiveRead: no, readObject: no, listLiveAttempts: no, reserve: no, record: no, settle: no }
}

describe('both code locks are off in this build', () => {
  test('the constants', () => {
    expect(LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD).toBe(false)
    expect(CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD).toBe(false)
    expect(readFileSync(path.join(APP, 'lib/creator-record/live-examination/controls.ts'), 'utf8')).toContain('export const CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = false')
  })

  test('the customer entry point refuses on its first line and touches no port', async () => {
    expect(await examineCustomerDocumentLive({ ports: untouched(), isKnownSyntheticFixture: () => false, now: () => new Date() }, 'u', 'd')).toEqual({
      result: { kind: 'disabled', reason: 'code_lock' }, reservation_refusal: null, settlement: { status: 'not_reserved' },
    })
  })

  test('no customer executor can be built', async () => {
    await expect(loadCustomerLiveExecutor({ document_sha256: 'a'.repeat(64) }, { env: { CREATOR_RECORD_EXTRACTION_API_KEY: 'x' }, loadAdapter: async () => { throw new Error('adapter must not load') } })).rejects.toThrow(/code_lock/)
  })

  test('the route wiring supplies no live port, and the projection port reads replay runs only', async () => {
    const wiring = await import('@/lib/creator-record-flow/examination-customer')
    expect(wiring.customerLiveEnabledInThisBuild()).toBe(false)
    expect('live' in wiring.productionCustomerExaminationDeps()).toBe(false)
    // The live modules are loaded on demand only, never statically, so a locked build never loads them.
    const src = readFileSync(path.join(APP, 'lib/creator-record-flow/examination-customer.ts'), 'utf8')
    expect(src).not.toMatch(/^import[^\n]*live-examination\/customer|^import[^\n]*live-examination-production/m)
    expect(src).toContain("import('@/lib/creator-record/live-examination/customer')")
  })

  test('every other gate is closed too', () => {
    expect(EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED).toBe(false)
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('stopped')
    expect(CURRENT_ISSUANCE_SUPPORT).toEqual({ record_schemas: [{ id: 'si8/creator-record-v2-record', version: 7 }, { id: 'si8/creator-record-v2-record', version: 8 }], builders: [{ id: 'si8/creator-record-v2-record-builder', version: 5 }, { id: 'si8/creator-record-v2-record-builder', version: 7 }], examination_methods: [{ origin: 'live_model', provider: 'anthropic', model: 'claude-sonnet-5', profile: { id: 'receipt', version: 1, schema: 'receipt-extraction-v2', prompt: 'receipt-prompt-v2' } }] }) // R15 option (a), JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110
  })
})

describe('reconciled limits', () => {
  // Decision 8P (CR-V2-MVP-INTEGRATION-8P): uploads keep the deployed 4 MB limit; the live examination keeps its own 1 MiB bound and
  // refuses a larger stored document before any read, log or model call (live-examination-real-unlocked.test.ts).
  test('uploads keep the 4 MB bucket limit; the live examination bound stays lower and separate', () => {
    expect(EVIDENCE_MAX_BYTES).toBe(4 * 1024 * 1024)
    expect(LIVE_BOUNDS.max_document_bytes).toBe(1024 * 1024)
    expect(EVIDENCE_STORED_MAX_BYTES).toBe(4 * 1024 * 1024)
    expect(readFileSync(path.join(APP, 'supabase/migrations/20261103000000_creator_record_v2_evidence.sql'), 'utf8')).toContain('byte_size <= 4194304')
  })
})

describe('the live projection is strict', () => {
  test.each([null, {}, { projection: { id: 'si8/creator-record-v2-examination-projection', version: 2 } }, 'not_examined'])('%p is not a projection', (raw) => {
    expect(parseLiveExaminationProjection(raw)).toBeNull()
  })
})
