/**
 * CAH-4C §2 / §3 / §12 — getReviewerCrcTranscript (RESOLUTION only; no audit,
 * no wire response). The authoritative-association gate + verbatim shaping.
 *
 * `listActiveAssociationsForSubmission` (handoff) and `getCrcSessionTranscript`
 * (reviewer-context repository) are mocked; the shaper runs REAL.
 */

const listActiveAssociationsForSubmission = jest.fn()
const getCrcSessionTranscript = jest.fn()

jest.mock('@/lib/crc-assurance-handoff', () => {
  const actual = jest.requireActual('@/lib/crc-assurance-handoff')
  return { ...actual, listActiveAssociationsForSubmission }
})
jest.mock('@/lib/reviewer-context/repository', () => ({ getCrcSessionTranscript }))

import { getReviewerCrcTranscript } from '@/lib/reviewer-context/service'

function assoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assoc-1',
    crc_session_id: 'crc-sess-1',
    submission_id: 'sub-1',
    associated_by: 'user-1',
    associated_at: '2026-09-01T00:00:00.000Z',
    authorization_basis: 'authenticated_email_candidate_confirmation',
    status: 'active' as const,
    removed_at: null,
    removed_by: null,
    crc_state_fingerprint: 'fp',
    crc_state_canon_version: 'csi-v1',
    crc_session_runtime_commit: null,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

const RAW_TRANSCRIPT = [
  { role: 'user', text: 'Can I use this commercially?', timestamp: '2026-09-01T00:00:00Z', secret: 'x' },
  { role: 'system', text: 'internal noise' },
  { role: 'assistant', text: 'It depends.', timestamp: null },
]

beforeEach(() => {
  jest.clearAllMocks()
})

test('no active association for the submission -> no_such_active_association, transcript never read', async () => {
  listActiveAssociationsForSubmission.mockResolvedValue([])
  const r = await getReviewerCrcTranscript('sub-1', 'assoc-1')
  expect(r).toEqual({ ok: false, code: 'no_such_active_association' })
  expect(getCrcSessionTranscript).not.toHaveBeenCalled()
})

test('a removed association is invisible (list is active-only) -> no_such_active_association', async () => {
  // listActiveAssociationsForSubmission returns ONLY active rows by contract;
  // a removed association simply is not in the list.
  listActiveAssociationsForSubmission.mockResolvedValue([assoc({ id: 'other-active' })])
  const r = await getReviewerCrcTranscript('sub-1', 'assoc-removed')
  expect(r).toEqual({ ok: false, code: 'no_such_active_association' })
  expect(getCrcSessionTranscript).not.toHaveBeenCalled()
})

test('an association_id belonging to a DIFFERENT submission -> no_such_active_association', async () => {
  // The route passes THIS submission's id; the list is that submission's
  // active associations only. An association_id from another submission is
  // simply absent from the list.
  listActiveAssociationsForSubmission.mockResolvedValue([assoc({ id: 'sub1-assoc' })])
  const r = await getReviewerCrcTranscript('sub-1', 'sub2-assoc')
  expect(r).toEqual({ ok: false, code: 'no_such_active_association' })
})

test('the caller cannot select an arbitrary crc_session_id — the session id comes from the matched association only', async () => {
  listActiveAssociationsForSubmission.mockResolvedValue([assoc({ id: 'assoc-1', crc_session_id: 'the-only-session' })])
  getCrcSessionTranscript.mockResolvedValue(RAW_TRANSCRIPT)

  await getReviewerCrcTranscript('sub-1', 'assoc-1')

  expect(getCrcSessionTranscript).toHaveBeenCalledTimes(1)
  expect(getCrcSessionTranscript).toHaveBeenCalledWith('the-only-session')
  // structural: getReviewerCrcTranscript signature is (submissionId, associationId) — no session id
  expect(getReviewerCrcTranscript.length).toBe(2)
})

test('N active associations remain correctly submission-scoped — only the matching association_id resolves', async () => {
  listActiveAssociationsForSubmission.mockResolvedValue([
    assoc({ id: 'A', crc_session_id: 'sess-A' }),
    assoc({ id: 'B', crc_session_id: 'sess-B' }),
  ])
  getCrcSessionTranscript.mockResolvedValue(RAW_TRANSCRIPT)

  const rB = await getReviewerCrcTranscript('sub-1', 'B')
  expect(rB.ok).toBe(true)
  if (!rB.ok) throw new Error('unreachable')
  expect(rB.crcSessionId).toBe('sess-B')
  expect(getCrcSessionTranscript).toHaveBeenLastCalledWith('sess-B')

  jest.clearAllMocks()
  listActiveAssociationsForSubmission.mockResolvedValue([
    assoc({ id: 'A', crc_session_id: 'sess-A' }),
    assoc({ id: 'B', crc_session_id: 'sess-B' }),
  ])
  const rMiss = await getReviewerCrcTranscript('sub-1', 'C')
  expect(rMiss).toEqual({ ok: false, code: 'no_such_active_association' })
})

test('CRC session row gone -> session_unavailable, zero transcript', async () => {
  listActiveAssociationsForSubmission.mockResolvedValue([assoc()])
  getCrcSessionTranscript.mockResolvedValue(null)
  const r = await getReviewerCrcTranscript('sub-1', 'assoc-1')
  expect(r).toEqual({ ok: false, code: 'session_unavailable' })
})

test('ok -> verbatim shaped entries: role/text/timestamp only, sequence preserved, system entry dropped', async () => {
  listActiveAssociationsForSubmission.mockResolvedValue([assoc()])
  getCrcSessionTranscript.mockResolvedValue(RAW_TRANSCRIPT)
  const r = await getReviewerCrcTranscript('sub-1', 'assoc-1')
  expect(r.ok).toBe(true)
  if (!r.ok) throw new Error('unreachable')
  expect(r.entries).toEqual([
    { role: 'user', text: 'Can I use this commercially?', timestamp: '2026-09-01T00:00:00Z' },
    { role: 'assistant', text: 'It depends.', timestamp: null },
  ])
  expect(JSON.stringify(r.entries)).not.toMatch(/secret|internal noise/)
})

test('empty transcript array -> ok with entries: []', async () => {
  listActiveAssociationsForSubmission.mockResolvedValue([assoc()])
  getCrcSessionTranscript.mockResolvedValue([])
  const r = await getReviewerCrcTranscript('sub-1', 'assoc-1')
  expect(r).toEqual({ ok: true, crcSessionId: 'crc-sess-1', entries: [] })
})
