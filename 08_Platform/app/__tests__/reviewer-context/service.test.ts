/**
 * CAH-4B §§4,7,8,14 — reviewer-context READ service.
 *
 * DB-touching functions are mocked (`listActiveAssociationsForSubmission`,
 * `getCrcSessionForAssociation`); the projection and the state-binding
 * primitives run REAL. Proves:
 *   - context resolves THROUGH the authoritative association;
 *   - there is no arbitrary crc_session_id access path (the service takes a
 *     submissionId only; the session id is always the association's own);
 *   - zero active associations -> `{ linked: false }`, no CRC content;
 *   - multiple associations -> deterministic, one bounded item each;
 *   - state comparison exposes ONLY unchanged / changed / comparison_unavailable;
 *   - unparseable stored state -> `project: null` (never fabricated), and the
 *     association still lists.
 */

import type { StructuredUnderstanding } from '@/types/interview-engine'
import { computeCrcStateIdentity } from '@/lib/crc-assurance-handoff/state-binding'
import { emptyStructuredUnderstanding } from '@/lib/interview-engine/eval/empty-structured-understanding'

const listActiveAssociationsForSubmission = jest.fn()
const getCrcSessionForAssociation = jest.fn()

jest.mock('@/lib/crc-assurance-handoff', () => {
  const actual = jest.requireActual('@/lib/crc-assurance-handoff')
  return { ...actual, listActiveAssociationsForSubmission }
})
jest.mock('@/lib/crc-assurance-handoff/repository', () => ({ getCrcSessionForAssociation }))

import { getReviewerCrcContext } from '@/lib/reviewer-context/service'

function su(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    ...emptyStructuredUnderstanding(),
    user_goals: [
      {
        goal_id: 'g1',
        state: 'confirmed',
        raw_text: 'Can I use this commercially?',
        category: 'commercial_use',
        scope: 'informational',
        superseded_by: null,
        source_turn: 1,
        source_statement: 'Can I use this commercially?',
      },
    ],
    ...overrides,
  }
}

function assoc(overrides: Record<string, unknown> = {}) {
  const s = su()
  const id = computeCrcStateIdentity(s)
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
    crc_state_fingerprint: id.fingerprint,
    crc_state_canon_version: id.canonicalization_version,
    crc_session_runtime_commit: 'abc123',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

test('zero active associations -> { linked: false } and no CRC content', async () => {
  listActiveAssociationsForSubmission.mockResolvedValue([])
  const ctx = await getReviewerCrcContext('sub-1')
  expect(ctx).toEqual({ linked: false })
  expect(getCrcSessionForAssociation).not.toHaveBeenCalled()
  expect(JSON.stringify(ctx)).not.toMatch(/goal|assertion|transcript/i)
})

test('resolves through the authoritative association; session id is the association\'s own, never a parameter', async () => {
  const a = assoc()
  const s = su()
  listActiveAssociationsForSubmission.mockResolvedValue([a])
  getCrcSessionForAssociation.mockResolvedValue({ structured_understanding: s, runtime_commit: 'abc123' })

  const ctx = await getReviewerCrcContext('sub-1')

  expect(listActiveAssociationsForSubmission).toHaveBeenCalledWith('sub-1')
  // the ONLY crc_session_id ever passed downstream is the association's own
  expect(getCrcSessionForAssociation).toHaveBeenCalledTimes(1)
  expect(getCrcSessionForAssociation).toHaveBeenCalledWith('crc-sess-1')

  expect(ctx.linked).toBe(true)
  if (!ctx.linked) throw new Error('unreachable')
  expect(ctx.associations).toHaveLength(1)
  const item = ctx.associations[0]
  expect(item.provenance).toEqual({
    association_id: 'assoc-1',
    authorization_basis: 'authenticated_email_candidate_confirmation',
    associated_at: '2026-09-01T00:00:00.000Z',
    status: 'active',
    crc_session_id: 'crc-sess-1',
  })
  expect(item.project?.goals.map((g) => g.raw_text)).toEqual(['Can I use this commercially?'])
  expect(item.state_comparison).toBe('unchanged')
})

test('the service exposes no way to request an arbitrary crc_session_id', () => {
  // Structural: getReviewerCrcContext is unary (submissionId only).
  expect(getReviewerCrcContext.length).toBe(1)
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', 'lib', 'reviewer-context', 'service.ts'),
    'utf-8',
  )
  // no parameter, destructure, or body path named for a caller-supplied session id
  expect(src).not.toMatch(/function getReviewerCrcContext\([^)]*session/i)
  expect(src).toMatch(/getCrcSessionForAssociation\(\s*a\.crc_session_id\s*\)/)
})

test('CRC state changed since link time -> state_comparison "changed" (no stronger semantic)', async () => {
  const a = assoc() // fingerprint bound to the base SU
  const changed = su({
    project_facts: {
      ...emptyStructuredUnderstanding().project_facts,
      intended_use: { attestation: { state: 'confirmed', value: 'a paid ad' }, source_turn: 2, source_statement: 'a paid ad' },
    },
  })
  listActiveAssociationsForSubmission.mockResolvedValue([a])
  getCrcSessionForAssociation.mockResolvedValue({ structured_understanding: changed, runtime_commit: 'abc123' })

  const ctx = await getReviewerCrcContext('sub-1')
  if (!ctx.linked) throw new Error('unreachable')
  expect(ctx.associations[0].state_comparison).toBe('changed')
  // never a stronger word
  expect(JSON.stringify(ctx)).not.toMatch(/material|risk|stale|invalid|reassess|significant/i)
})

test('canonicalization-version mismatch -> "comparison_unavailable" (fail closed, never a false unchanged)', async () => {
  const a = assoc({ crc_state_canon_version: 'csi-vFUTURE' })
  const s = su()
  listActiveAssociationsForSubmission.mockResolvedValue([a])
  getCrcSessionForAssociation.mockResolvedValue({ structured_understanding: s, runtime_commit: 'abc123' })

  const ctx = await getReviewerCrcContext('sub-1')
  if (!ctx.linked) throw new Error('unreachable')
  expect(ctx.associations[0].state_comparison).toBe('comparison_unavailable')
})

test('unreadable stored state (undefined column) -> project: null (never fabricated); association still lists', async () => {
  const a = assoc()
  listActiveAssociationsForSubmission.mockResolvedValue([a])
  // a genuinely broken row: the JSONB column came back undefined
  getCrcSessionForAssociation.mockResolvedValue({ structured_understanding: undefined, runtime_commit: null })

  const ctx = await getReviewerCrcContext('sub-1')
  if (!ctx.linked) throw new Error('unreachable')
  expect(ctx.associations).toHaveLength(1)
  expect(ctx.associations[0].project).toBeNull()
  expect(ctx.associations[0].state_comparison).toBe('comparison_unavailable')
  expect(ctx.associations[0].provenance.association_id).toBe('assoc-1')
})

test('missing CRC session row -> project: null, comparison_unavailable, association still lists', async () => {
  listActiveAssociationsForSubmission.mockResolvedValue([assoc()])
  getCrcSessionForAssociation.mockResolvedValue(null)
  const ctx = await getReviewerCrcContext('sub-1')
  if (!ctx.linked) throw new Error('unreachable')
  expect(ctx.associations[0].project).toBeNull()
  expect(ctx.associations[0].state_comparison).toBe('comparison_unavailable')
})

test('multiple active associations -> deterministic, one bounded item each, in repository order', async () => {
  const s = su()
  const a1 = assoc({ id: 'assoc-A', crc_session_id: 'sess-A' })
  const a2 = assoc({ id: 'assoc-B', crc_session_id: 'sess-B' })
  listActiveAssociationsForSubmission.mockResolvedValue([a1, a2]) // repository already orders associated_at DESC
  getCrcSessionForAssociation.mockImplementation(async (sid: string) => ({ structured_understanding: s, runtime_commit: null }))

  const ctx = await getReviewerCrcContext('sub-1')
  if (!ctx.linked) throw new Error('unreachable')
  expect(ctx.associations.map((i) => i.provenance.association_id)).toEqual(['assoc-A', 'assoc-B'])
  expect(getCrcSessionForAssociation.mock.calls.map((c) => c[0])).toEqual(['sess-A', 'sess-B'])
})

test('state_comparison is ONLY ever one of the three neutral values', async () => {
  const allowed = new Set(['unchanged', 'changed', 'comparison_unavailable'])
  for (const scenario of [
    { assoc: assoc(), session: { structured_understanding: su(), runtime_commit: null } },
    { assoc: assoc({ crc_state_canon_version: 'x' }), session: { structured_understanding: su(), runtime_commit: null } },
    { assoc: assoc(), session: null },
  ]) {
    listActiveAssociationsForSubmission.mockResolvedValue([scenario.assoc])
    getCrcSessionForAssociation.mockResolvedValue(scenario.session)
    const ctx = await getReviewerCrcContext('sub-1')
    if (!ctx.linked) throw new Error('unreachable')
    expect(allowed.has(ctx.associations[0].state_comparison)).toBe(true)
  }
})
