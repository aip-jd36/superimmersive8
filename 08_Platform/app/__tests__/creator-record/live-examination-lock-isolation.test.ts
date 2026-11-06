/**
 * CR-V2-DOC-LIVE-1B-FIX — opening the OLD prototype lock must not open v3. The old lock is replaced for this file ONLY. The Anthropic SDK is
 * replaced by a module that throws when loaded, so nothing here can reach a provider. The other direction, v3 open with the old lock and the
 * admin prototype still closed, is in `live-examination-real-unlocked.test.ts`.
 */
import { LIVE_EXTRACTION_ENV, LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/evidence/config'
import { profileKey } from '@/lib/creator-record/examination/profile'
import { LIVE_EVALUATION_ENV, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD, liveEvaluationEnabled } from '@/lib/creator-record/live-examination/controls'
import { RECEIPT_LIVE_PROFILE, runLiveExamination } from '@/lib/creator-record/live-examination/examine'
import { loadRealLiveExecutor } from '@/lib/creator-record/live-examination/real-executor'

jest.mock('@/lib/creator-record/evidence/config', () => ({ ...jest.requireActual('@/lib/creator-record/evidence/config'), LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD: true }))
jest.mock('@anthropic-ai/sdk', () => {
  throw new Error('the Anthropic SDK must not load in this file')
})
jest.mock('@anthropic-ai/sdk/helpers/json-schema', () => {
  throw new Error('the Anthropic SDK must not load in this file')
})

const SHA = 'a'.repeat(64)
const AUTH = { authorization_id: 'eval-2026-test', expires_at: '2099-01-01T00:00:00.000Z', max_estimated_usd: 5, permitted_documents: [{ sha256: SHA, consent_reference: 'consent-ref-1' }] }
const ENV = { [LIVE_EXTRACTION_ENV]: 'enabled', [LIVE_EVALUATION_ENV]: AUTH.authorization_id, CREATOR_RECORD_EXTRACTION_API_KEY: 'x' }

describe('the old prototype lock open, the v3 lock closed', () => {
  test('the two locks are in that state', () => {
    expect(LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD).toBe(true)
    expect(LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD).toBe(false)
    expect(liveEvaluationEnabled(ENV, AUTH, new Date('2026-11-06T10:00:00.000Z'))).toBe(false)
  })

  test('the v3 examination refuses, with no read and no model call, whatever the caller supplies', async () => {
    const callModel = jest.fn()
    const readBytes = jest.fn()
    const get = jest.fn()
    const guard = { documentPermitted: jest.fn(() => true), reserveAttempt: jest.fn(() => true) }
    const r = await runLiveExamination(
      {
        documents: { get, readBytes },
        isKnownSyntheticFixture: () => false,
        executor: { identity: { mode: 'live_model', provider: 'anthropic', model: 'claude-sonnet-5' }, callModel, guard },
        profiles: new Map([[profileKey(RECEIPT_LIVE_PROFILE.ref), RECEIPT_LIVE_PROFILE]]),
        livePermitted: true,
        now: () => new Date('2026-11-06T10:00:00.000Z'),
      },
      { actor_user_id: '11111111-1111-4111-8111-111111111111', document_id: '33333333-3333-4333-8333-333333333333', profile: { id: 'receipt', version: 1 } },
    )
    expect(r).toEqual({ kind: 'refused', code: 'live_examination_disabled' })
    for (const f of [callModel, readBytes, get, guard.documentPermitted, guard.reserveAttempt]) expect(f).not.toHaveBeenCalled()
  })

  test('the real executor cannot be built, and the adapter is never loaded', async () => {
    const loadAdapter = jest.fn()
    await expect(loadRealLiveExecutor(AUTH, { env: ENV, now: () => new Date('2026-11-06T10:00:00.000Z'), loadAdapter })).rejects.toThrow('live_examination_disabled:code_lock')
    expect(loadAdapter).not.toHaveBeenCalled()
  })
})
