/**
 * CR-V2-DOC-LIVE-1A — what the checks behind the code lock would do. The lock is replaced for this file ONLY, with a fake executor.
 * No provider, no key, no real document: `callModel` is a local function. In the real build the lock is false
 * (`live-examination.test.ts`) and the database refuses `live_model` regardless (`creator-record-v2-live-examination.db.test.ts`).
 */
import { createHash } from 'node:crypto'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { parseLiveEnvelope } from '@/lib/creator-record/live-examination/envelope'
import { RECEIPT_LIVE_PROFILE, runLiveExamination, type LiveExaminationDeps } from '@/lib/creator-record/live-examination/examine'
import { profileKey } from '@/lib/creator-record/examination/profile'
import { syntheticPdf } from '@/test-support/synthetic-pdf'

jest.mock('@/lib/creator-record/live-examination/controls', () => ({ ...jest.requireActual('@/lib/creator-record/live-examination/controls'), LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true }))

const OWNER = '11111111-1111-4111-8111-111111111111'
const DOC = '33333333-3333-4333-8333-333333333333'
const BYTES = syntheticPdf(1, 'synthetic-test:unlocked')
const SHA = createHash('sha256').update(BYTES).digest('hex')
const RECORD = { id: DOC, user_id: OWNER, sha256: SHA, media_type: 'application/pdf' as const, byte_size: BYTES.length, state: 'stored' as const }
const REQUEST = { actor_user_id: OWNER, document_id: DOC, profile: { id: 'receipt', version: 1 } }
const OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!.parsed_output

function deps(over: Partial<LiveExaminationDeps> = {}, id = 'msg_fake') {
  const callModel = jest.fn(async () => ({ id, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 1, output_tokens: 1 }, parsed_output: OUTPUT }))
  const out: LiveExaminationDeps = {
    documents: { get: async () => RECORD, readBytes: async () => BYTES },
    isKnownSyntheticFixture: () => false,
    executor: { identity: { mode: 'live_model', provider: 'anthropic', model: 'a-real-model-name' }, callModel: callModel as never, guard: { documentPermitted: () => true, reserveAttempt: () => true } },
    profiles: new Map([[profileKey(RECEIPT_LIVE_PROFILE.ref), RECEIPT_LIVE_PROFILE]]),
    livePermitted: true,
    now: () => new Date('2026-11-06T10:00:00.000Z'),
    ...over,
  }
  return { out, callModel }
}

describe('behind the code lock', () => {
  test('the environment gate is still required', async () => {
    const { out, callModel } = deps({ livePermitted: false })
    expect(await runLiveExamination(out, REQUEST)).toEqual({ kind: 'refused', code: 'live_examination_disabled' })
    expect(callModel).not.toHaveBeenCalled()
  })

  test('a live executor refuses a synthetic fixture, so test data cannot come back labelled as a live reading', async () => {
    const { out, callModel } = deps({ isKnownSyntheticFixture: () => true })
    expect(await runLiveExamination(out, REQUEST)).toEqual({ kind: 'refused', code: 'live_refuses_known_fixture' })
    expect(callModel).not.toHaveBeenCalled()
  })

  test('an envelope says live at every level, and stays evidence only', async () => {
    const { out } = deps()
    const r = await runLiveExamination(out, REQUEST)
    if (r.kind !== 'envelope') throw new Error(r.code)
    expect(parseLiveEnvelope(r.envelope)).toEqual(r.envelope)
    expect(r.envelope).toMatchObject({ execution_origin: 'live_model', content_class: 'customer_document', workflow_authorization: 'not_established', provenance: { provider_response_id: 'msg_fake' } })
    expect(r.envelope.limitations).not.toContain('mock_test_data_not_model_output')
    expect(r.envelope.observations.every((o) => o.origin === 'live_model_extracted' && o.verification === 'not_verified')).toBe(true)
  })

  test('a provider response id that looks like a mock is not a reading', async () => {
    const { out } = deps({}, 'mock-response-1')
    const r = await runLiveExamination(out, REQUEST)
    expect(r.kind === 'envelope' && r.envelope.outcome).toEqual({ status: 'could_not_examine', reason: 'provider_failure' })
    expect(r.kind === 'envelope' && r.envelope.observations).toEqual([])
  })
})
