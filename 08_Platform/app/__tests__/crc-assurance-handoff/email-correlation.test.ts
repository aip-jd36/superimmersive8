/**
 * CAH-3F -- Authenticated Email-Correlated CRC Candidate Confirmation.
 *
 * Behavioral tests are authoritative (§25). Structural/lexicon tests live in
 * boundaries.test.ts. Uses a controllable in-memory fake for
 * @/lib/supabase/admin covering submissions / crc_leads / crc_sessions /
 * crc_assurance_associations + the create RPC.
 */

import { randomUUID, createHash } from 'crypto'

// ── controllable fake supabase-js client ─────────────────────────────────

type SessionRow = {
  id: string
  crc_lead_id: string | null
  identity_source: string | null
  email: string | null
  structured_understanding: unknown
  runtime_commit: string | null
}
type AssocRow = {
  id: string
  crc_session_id: string
  submission_id: string
  status: 'active' | 'removed'
  authorization_basis: string
}

const db: {
  submissions: Array<{ id: string; user_id: string }>
  crc_leads: Array<{ id: string; email_normalized: string }>
  crc_sessions: SessionRow[]
  associations: AssocRow[]
  events: Array<{ event_type: string; association_id: string; authorization_basis: string | null }>
  forceReadError: boolean
  forceRpcError: boolean
} = { submissions: [], crc_leads: [], crc_sessions: [], associations: [], events: [], forceReadError: false, forceRpcError: false }

function reset() {
  db.submissions = []
  db.crc_leads = []
  db.crc_sessions = []
  db.associations = []
  db.events = []
  db.forceReadError = false
  db.forceRpcError = false
}

function fromBuilder(table: string) {
  const eqs: Array<[string, unknown]> = []
  const b: Record<string, unknown> = {}
  const chain = () => b
  b.select = chain
  b.order = chain
  b.eq = (col: string, val: unknown) => {
    eqs.push([col, val])
    return b
  }
  const rowsFor = (): Record<string, unknown>[] => {
    let rows: Record<string, unknown>[] =
      table === 'submissions' ? db.submissions
      : table === 'crc_leads' ? db.crc_leads
      : table === 'crc_sessions' ? (db.crc_sessions as unknown as Record<string, unknown>[])
      : table === 'crc_assurance_associations' ? (db.associations as unknown as Record<string, unknown>[])
      : []
    for (const [c, v] of eqs) rows = rows.filter((r) => r[c] === v)
    return rows
  }
  b.maybeSingle = async () => {
    if (db.forceReadError) return { data: null, error: { message: 'read failed' } }
    return { data: rowsFor()[0] ?? null, error: null }
  }
  b.single = b.maybeSingle
  b.then = (resolve: (o: { data: unknown; error: unknown }) => void) => {
    if (db.forceReadError) return resolve({ data: null, error: { message: 'read failed' } })
    resolve({ data: rowsFor(), error: null })
  }
  return b
}

function rpcCreate(p: Record<string, unknown>) {
  if (db.forceRpcError) return { data: null, error: { message: 'rpc failed' } }
  const owns = db.submissions.some((s) => s.id === p.p_submission_id && s.user_id === p.p_associated_by)
  if (!owns) return { data: { ok: false, reason: 'not_submission_owner' }, error: null }
  const dup = db.associations.some(
    (a) => a.status === 'active' && a.crc_session_id === p.p_crc_session_id && a.submission_id === p.p_submission_id,
  )
  if (dup) return { data: { ok: false, reason: 'duplicate_active' }, error: null }
  const sess = db.crc_sessions.find((s) => s.id === p.p_crc_session_id)
  if (!sess) return { data: { ok: false, reason: 'reference_not_found' }, error: null }
  const assoc: AssocRow = {
    id: randomUUID(),
    crc_session_id: String(p.p_crc_session_id),
    submission_id: String(p.p_submission_id),
    status: 'active',
    authorization_basis: String(p.p_authorization_basis),
  }
  db.associations.push(assoc)
  db.events.push({ event_type: 'association_created', association_id: assoc.id, authorization_basis: assoc.authorization_basis })
  return { data: { ok: true, association: assoc }, error: null }
}

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (t: string) => fromBuilder(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'create_crc_assurance_association') return rpcCreate(args)
      return { data: null, error: { message: `unknown rpc ${fn}` } }
    },
  },
}))

import {
  discoverEmailCorrelatedCandidate,
  associateEmailCorrelatedCandidate,
  EMAIL_CORRELATION_AUTHORIZATION_BASIS,
} from '@/lib/crc-assurance-handoff/capabilities/email-correlation'

// ── fixtures ─────────────────────────────────────────────────────────────

function completedSU(overrides: Record<string, unknown> = {}) {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    current_phase: 4,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: 'gate_1_gate_2_met',
    opt_out_scope: null,
    ...overrides,
  }
}

const OWNER = 'user-owner'
const OTHER = 'user-other'
const SUB = 'sub-1'
const EMAIL = 'Customer@Example.com' // verified Assurance email, mixed-case
const EMAIL_NORM = 'customer@example.com'

function seedLead(id = 'lead-1', norm = EMAIL_NORM) {
  db.crc_leads.push({ id, email_normalized: norm })
  return id
}
function seedSession(over: Partial<SessionRow> = {}): SessionRow {
  const row: SessionRow = {
    id: over.id ?? `sess-${db.crc_sessions.length + 1}`,
    crc_lead_id: over.crc_lead_id ?? 'lead-1',
    identity_source: over.identity_source ?? 'email_gate',
    email: over.email ?? EMAIL_NORM,
    structured_understanding: over.structured_understanding ?? completedSU(),
    runtime_commit: over.runtime_commit ?? null,
  }
  db.crc_sessions.push(row)
  return row
}
function seedSubmission(id = SUB, owner = OWNER) {
  db.submissions.push({ id, user_id: owner })
}
const handleFor = (sid: string) => createHash('sha256').update(`cah3f:${sid}`, 'utf8').digest('hex').slice(0, 24)

const discover = (over: Record<string, unknown> = {}) =>
  discoverEmailCorrelatedCandidate({ actorUserId: OWNER, verifiedEmail: EMAIL, submissionId: SUB, ...over })
const associate = (candidateHandle: string, over: Record<string, unknown> = {}) =>
  associateEmailCorrelatedCandidate({ actorUserId: OWNER, verifiedEmail: EMAIL, submissionId: SUB, candidateHandle, ...over })

beforeEach(reset)

// ── DISCOVERY ────────────────────────────────────────────────────────────

describe('CAH-3F discovery', () => {
  test('2: owned submission + verified email + no CRC correlation -> no candidate', async () => {
    seedSubmission()
    expect(await discover()).toEqual({ available: false, reason: 'no_candidate' })
  })

  test('submission not found / not owner fail closed', async () => {
    expect(await discover()).toEqual({ available: false, reason: 'submission_not_found' })
    reset()
    seedSubmission(SUB, OTHER)
    expect(await discover()).toEqual({ available: false, reason: 'not_submission_owner' })
  })

  test('3: correlation to an incomplete CRC -> omitted (no candidate)', async () => {
    seedSubmission()
    seedLead()
    seedSession({ structured_understanding: completedSU({ completion_reason: null }) })
    expect(await discover()).toEqual({ available: false, reason: 'no_candidate' })
  })

  test('4: product_stop_reason without governed completion -> omitted', async () => {
    seedSubmission()
    seedLead()
    const su = completedSU({ completion_reason: null }) as Record<string, unknown>
    su.product_stop_reason = 'conversation_limit_reached'
    seedSession({ structured_understanding: su })
    expect(await discover()).toEqual({ available: false, reason: 'no_candidate' })
  })

  test('5 + 6: one eligible completed correlated CRC -> bounded candidate handle, NO content', async () => {
    seedSubmission()
    seedLead()
    const s = seedSession({ id: 'sess-A' })
    const res = await discover()
    expect(res).toEqual({ available: true, candidateHandle: handleFor('sess-A') })
    // allow-list: exactly two keys, no substantive CRC content anywhere.
    expect(Object.keys(res).sort()).toEqual(['available', 'candidateHandle'])
    expect(JSON.stringify(res)).not.toContain('sess-A') // raw UUID never exposed
    expect(JSON.stringify(res)).not.toMatch(/completion_reason|structured_understanding|goal|jurisdiction|tool_|transcript/i)
    void s
  })

  test('7 + 8: multiple indistinguishable eligible CRCs -> fail closed, never auto-selected/ranked', async () => {
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A' })
    seedSession({ id: 'sess-B' })
    const res = await discover()
    expect(res).toEqual({ available: false, reason: 'multiple_candidates_require_stronger_disambiguation' })
    // no association attempted, nothing ranked
    expect(db.associations).toHaveLength(0)
  })

  test('email correlation uses exact normalized match only (case-insensitive, no fuzzy)', async () => {
    seedSubmission()
    seedLead('lead-1', EMAIL_NORM)
    seedSession({ id: 'sess-A' })
    // mixed-case verified email still correlates (normalize = trim+lowercase)
    expect(await discover({ verifiedEmail: '  CUSTOMER@example.COM  ' })).toEqual({ available: true, candidateHandle: handleFor('sess-A') })
    // a plus-alias must NOT correlate (no plus-stripping)
    expect(await discover({ verifiedEmail: 'customer+x@example.com' })).toEqual({ available: false, reason: 'no_candidate' })
  })

  test('candidate already associated with another submission -> disclosed as bounded reason', async () => {
    seedSubmission()
    db.submissions.push({ id: 'sub-2', user_id: OWNER })
    seedLead()
    const s = seedSession({ id: 'sess-A' })
    db.associations.push({ id: 'a1', crc_session_id: s.id, submission_id: 'sub-2', status: 'active', authorization_basis: EMAIL_CORRELATION_AUTHORIZATION_BASIS })
    expect(await discover()).toEqual({ available: false, reason: 'candidate_already_associated_elsewhere' })
  })

  test('a session already associated with THIS submission does not block discovery', async () => {
    seedSubmission()
    seedLead()
    const s = seedSession({ id: 'sess-A' })
    db.associations.push({ id: 'a1', crc_session_id: s.id, submission_id: SUB, status: 'active', authorization_basis: EMAIL_CORRELATION_AUTHORIZATION_BASIS })
    // still surfaces; the core's duplicate-active-pair check handles the POST
    expect(await discover()).toEqual({ available: true, candidateHandle: handleFor('sess-A') })
  })

  test('lookup failure fails closed', async () => {
    seedSubmission()
    db.forceReadError = true
    expect(await discover()).toEqual({ available: false, reason: 'lookup_failed' })
  })

  test('session linked to lead but not via email_gate is not a candidate', async () => {
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A', identity_source: 'something_else' })
    expect(await discover()).toEqual({ available: false, reason: 'no_candidate' })
  })
})

// ── ASSOCIATION ──────────────────────────────────────────────────────────

describe('CAH-3F association', () => {
  test('14 + 15 + 17: valid explicit confirmation -> association succeeds with the FIXED basis + audit', async () => {
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A' })
    const res = await associate(handleFor('sess-A'))
    expect(res).toEqual({ ok: true })
    expect(db.associations).toHaveLength(1)
    expect(db.associations[0].authorization_basis).toBe('authenticated_email_candidate_confirmation')
    expect(db.events.filter((e) => e.event_type === 'association_created')).toHaveLength(1)
  })

  test('10: submission ownership mismatch -> denied', async () => {
    db.submissions.push({ id: SUB, user_id: OTHER })
    seedLead()
    seedSession({ id: 'sess-A' })
    expect(await associate(handleFor('sess-A'))).toEqual({ ok: false, code: 'not_submission_owner' })
    expect(db.associations).toHaveLength(0)
  })

  test('11: stale / malformed / wrong candidate handle -> denied (stale_candidate)', async () => {
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A' })
    expect(await associate('not-a-real-handle')).toEqual({ ok: false, code: 'stale_candidate' })
    expect(await associate(handleFor('some-other-session'))).toEqual({ ok: false, code: 'stale_candidate' })
    expect(db.associations).toHaveLength(0)
  })

  test('12: email correlation disappears before POST -> denied', async () => {
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A' })
    const h = handleFor('sess-A')
    // lead vanishes (email changed / erased) before confirm
    db.crc_leads = []
    expect(await associate(h)).toEqual({ ok: false, code: 'no_candidate' })
  })

  test('13: candidate completion becomes invalid before POST -> denied', async () => {
    seedSubmission()
    seedLead()
    const s = seedSession({ id: 'sess-A' })
    const h = handleFor('sess-A')
    s.structured_understanding = completedSU({ completion_reason: null })
    expect(await associate(h)).toEqual({ ok: false, code: 'no_candidate' })
  })

  test('7 -> POST: a second candidate appearing between GET and POST -> fail closed', async () => {
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A' })
    const h = handleFor('sess-A')
    seedSession({ id: 'sess-B' }) // now ambiguous
    expect(await associate(h)).toEqual({ ok: false, code: 'multiple_candidates_require_stronger_disambiguation' })
  })

  test('20: CRC already actively associated with ANOTHER submission -> fail closed (V1 cross-submission rule)', async () => {
    seedSubmission()
    db.submissions.push({ id: 'sub-2', user_id: OWNER })
    seedLead()
    const s = seedSession({ id: 'sess-A' })
    db.associations.push({ id: 'a1', crc_session_id: s.id, submission_id: 'sub-2', status: 'active', authorization_basis: EMAIL_CORRELATION_AUTHORIZATION_BASIS })
    expect(await associate(handleFor('sess-A'))).toEqual({ ok: false, code: 'candidate_already_associated_elsewhere' })
    expect(db.associations.filter((a) => a.submission_id === SUB)).toHaveLength(0)
  })

  test('21: duplicate active same pair -> existing accepted semantics (duplicate_active)', async () => {
    seedSubmission()
    seedLead()
    const s = seedSession({ id: 'sess-A' })
    db.associations.push({ id: 'a1', crc_session_id: s.id, submission_id: SUB, status: 'active', authorization_basis: EMAIL_CORRELATION_AUTHORIZATION_BASIS })
    expect(await associate(handleFor('sess-A'))).toEqual({ ok: false, code: 'duplicate_active' })
  })

  test('19: client cannot associate an arbitrary crcSessionId outside the bounded candidate flow', async () => {
    // The AssociateInput has no crcSessionId field at all; the only lever is
    // candidateHandle, which must match the server-derived single candidate.
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A' })
    // A handle for a real session that exists but is NOT correlated to this email:
    db.crc_sessions.push({ id: 'sess-Z', crc_lead_id: 'other-lead', identity_source: 'email_gate', email: 'z@z.z', structured_understanding: completedSU(), runtime_commit: null })
    expect(await associate(handleFor('sess-Z'))).toEqual({ ok: false, code: 'stale_candidate' })
    expect(db.associations.some((a) => a.crc_session_id === 'sess-Z')).toBe(false)
  })

  test('persistence failure -> fail closed', async () => {
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A' })
    db.forceRpcError = true
    expect(await associate(handleFor('sess-A'))).toEqual({ ok: false, code: 'persistence_failed' })
  })
})

// ── PRIVACY / DISCLOSURE ─────────────────────────────────────────────────

describe('CAH-3F pre-association disclosure is allow-listed and minimal', () => {
  test('discovery response never contains substantive CRC content, transcript, Retrieval/BI/Projection/Composition, or Sales state', async () => {
    seedSubmission()
    seedLead()
    seedSession({
      id: 'sess-A',
      structured_understanding: completedSU({
        user_goals: [{ goal_id: 'g', raw_text: 'SECRET GOAL TEXT', category: 'commercial_use', scope: 'informational', state: 'confirmed', superseded_by: null, source_turn: 1, source_statement: 'SECRET GOAL TEXT' }],
      }),
    })
    const res = await discover()
    const s = JSON.stringify(res)
    expect(s).not.toContain('SECRET GOAL TEXT')
    for (const forbidden of ['structured_understanding', 'transcript', 'goal', 'provider', 'tool_', 'jurisdiction', 'retrieval', 'bounded_interpretation', 'projection', 'composition', 'crc_sales', 'CONVERTING', 'completion_reason', 'runtime_commit', 'email']) {
      expect(s.toLowerCase()).not.toContain(forbidden.toLowerCase())
    }
  })

  test('discovery response is one of exactly the allow-listed shapes', async () => {
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A' })
    const ok = await discover()
    expect(ok.available).toBe(true)
    if (ok.available) expect(Object.keys(ok).sort()).toEqual(['available', 'candidateHandle'])

    reset()
    seedSubmission()
    const none = await discover()
    expect(none).toEqual({ available: false, reason: 'no_candidate' })
    if (!none.available) expect(Object.keys(none).sort()).toEqual(['available', 'reason'])
  })
})

// ── CROSS-DEVICE ─────────────────────────────────────────────────────────

describe('CAH-3F cross-device', () => {
  test('25 + 26: discovery + association succeed with NO crc_session cookie and NO same-browser continuity', async () => {
    // The capability signature has no request/cookie parameter at all -- it is
    // purely (actorUserId, verifiedEmail, submissionId[, candidateHandle]).
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A' })
    expect(await discover()).toEqual({ available: true, candidateHandle: handleFor('sess-A') })
    expect(await associate(handleFor('sess-A'))).toEqual({ ok: true })
  })
})

// ── SEMANTIC CONTRACT ────────────────────────────────────────────────────

describe('CAH-3F semantic contract', () => {
  test('the fixed basis is authenticated_email_candidate_confirmation and nothing else', () => {
    expect(EMAIL_CORRELATION_AUTHORIZATION_BASIS).toBe('authenticated_email_candidate_confirmation')
  })

  test('the governed-completion set matches the association core exactly', async () => {
    // Both are `new Set(COMPLETION_REASONS)` -- assert via behaviour: every
    // governed reason yields a candidate; a non-governed string does not.
    const reasons = ['gate_1_gate_2_met', 'declined', 'gate_1_unmet_exhausted', 'questioning_exhausted', 'question_budget_exhausted']
    for (const r of reasons) {
      reset()
      seedSubmission()
      seedLead()
      seedSession({ id: 'sess-A', structured_understanding: completedSU({ completion_reason: r }) })
      // eslint-disable-next-line no-await-in-loop
      expect(await discover()).toEqual({ available: true, candidateHandle: handleFor('sess-A') })
    }
    reset()
    seedSubmission()
    seedLead()
    seedSession({ id: 'sess-A', structured_understanding: completedSU({ completion_reason: 'not_a_governed_reason' }) })
    expect(await discover()).toEqual({ available: false, reason: 'no_candidate' })
  })
})
