/**
 * CRC-EMAIL-HISTORY-1B — getResultsEmailHistoryForSession /
 * recordResultsEmailViewAudit.
 *
 * Covers the §6 authority rule explicitly: isSalesEligible's
 * completion_reason predicate must NOT become the gate for whether a
 * persisted results-email artifact may be viewed, while cross-lead /
 * arbitrary-session access must still be rejected (no enumeration oracle).
 */

type Outcome = { data: unknown; error: unknown }
const state: {
  sessions: Record<string, unknown>[]
  artifacts: Record<string, unknown>[]
  attempts: Record<string, unknown>[]
  auditInsert: Outcome
} = { sessions: [], artifacts: [], attempts: [], auditInsert: { data: {}, error: null } }

function makeBuilder(table: string) {
  let rows: Record<string, unknown>[] = []
  if (table === 'crc_sessions') rows = state.sessions
  else if (table === 'crc_results_email_artifacts') rows = state.artifacts
  else if (table === 'crc_results_email_delivery_attempts') rows = state.attempts
  else if (table === 'crc_sales_state') rows = []
  else if (table === 'crc_leads') rows = []

  const filters: Array<(r: Record<string, unknown>) => boolean> = []
  const orderCols: Array<{ col: string; ascending: boolean }> = []
  const b: Record<string, unknown> = {}
  const chain = () => b
  b.select = chain
  b.not = (col: string, _op: string, _val: unknown) => {
    filters.push((r) => r[col] != null)
    return b
  }
  b.eq = (col: string, val: unknown) => {
    filters.push((r) => r[col] === val)
    return b
  }
  b.in = (col: string, vals: unknown[]) => {
    filters.push((r) => vals.includes(r[col]))
    return b
  }
  b.order = (col: string, opts?: { ascending?: boolean }) => {
    orderCols.push({ col, ascending: opts?.ascending ?? true })
    return b
  }
  const applied = () => {
    let rs = rows.filter((r) => filters.every((f) => f(r)))
    for (const { col, ascending } of orderCols.slice().reverse()) {
      rs = rs.slice().sort((a, b2) => {
        const av = String(a[col] ?? '')
        const bv = String(b2[col] ?? '')
        if (av === bv) return 0
        return ascending ? (av < bv ? -1 : 1) : av > bv ? -1 : 1
      })
    }
    return rs
  }
  b.then = (resolve: (o: Outcome) => void) => resolve({ data: applied(), error: null })
  b.maybeSingle = async () => ({ data: applied()[0] ?? null, error: null })
  b.single = async () => ({ data: applied()[0] ?? null, error: null })
  b.insert = async (_payload: unknown) => state.auditInsert
  return b
}

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (t: string) => makeBuilder(t) },
}))

import { getResultsEmailHistoryForSession, recordResultsEmailViewAudit } from '@/lib/crc-sales/repository'

const completedSU = {
  completion_reason: 'gate_1_gate_2_met',
  user_goals: [],
  tool_mentions: [],
  asset_provider_mentions: [],
  assessment_jurisdiction_mentions: [],
  content_presence_mentions: [],
  scoped_observations: [],
  project_facts: {
    intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
  },
}
// The known product-layer completion path (CRC-EMAIL-HISTORY-1A): the
// interview never concluded (completion_reason null) -- only a business-
// decision turn ceiling stopped it.
const turnCeilingSU = { ...completedSU, completion_reason: null }

function session(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 's1',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T01:00:00Z',
    email: 'customer@example.com',
    email_captured_at: '2026-10-01T01:00:00Z',
    identity_source: 'email_gate',
    crc_lead_id: 'lead-1',
    structured_understanding: completedSU,
    transcript: [],
    results_email_status: 'accepted',
    results_email_last_recipient: 'customer@example.com',
    results_email_accepted_at: '2026-10-01T01:05:00Z',
    traffic_type: 'pilot',
    runtime_commit: 'abc123',
    turn_count: 6,
    ...overrides,
  }
}

function artifact(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'artifact-1',
    crc_session_id: 's1',
    recipient_normalized: 'customer@example.com',
    subject: 'Your Commercial Readiness Check results',
    html: '<p>hello</p>',
    text: 'hello',
    content_hash: 'hash-1',
    template_version: 'results-email-v1',
    runtime_commit: 'abc123',
    attribution_token: null,
    generated_at: '2026-10-01T01:04:00Z',
    previous_artifact_id: null,
    ...overrides,
  }
}

beforeEach(() => {
  state.sessions = []
  state.artifacts = []
  state.attempts = []
  state.auditInsert = { data: {}, error: null }
})

describe('getResultsEmailHistoryForSession', () => {
  // Case A: ordinary Sales-eligible session with a persisted artifact.
  test('ordinary eligible session with an artifact → found, artifact returned with its attempts', async () => {
    state.sessions = [session({ id: 's1' })]
    state.artifacts = [artifact({ id: 'a1', crc_session_id: 's1' })]
    state.attempts = [
      { artifact_id: 'a1', outcome: 'accepted', provider_message_id: 'resend-1', error_detail: null, attempted_at: '2026-10-01T01:04:30Z', accepted_at: '2026-10-01T01:04:31Z' },
    ]

    const result = await getResultsEmailHistoryForSession('s1')
    expect(result.found).toBe(true)
    if (!result.found) return
    expect(result.artifacts).toHaveLength(1)
    expect(result.artifacts[0].subject).toBe('Your Commercial Readiness Check results')
    expect(result.artifacts[0].text).toBe('hello')
    expect(result.artifacts[0].html).toBe('<p>hello</p>')
    expect(result.artifacts[0].attempts).toEqual([
      { outcome: 'accepted', provider_message_id: 'resend-1', error_detail: null, attempted_at: '2026-10-01T01:04:30Z', accepted_at: '2026-10-01T01:04:31Z' },
    ])
  })

  // Case B (the central §6 fix): the session itself is NOT Sales-eligible
  // (turn-ceiling, completion_reason null) but belongs to a lead that IS
  // authorized via a different, genuinely eligible session. The artifact
  // must still be returned -- isSalesEligible must not hide it.
  test('authorized lead with a legitimate artifact on a non-eligible (turn-ceiling) session → still found', async () => {
    state.sessions = [
      session({ id: 's-eligible', crc_lead_id: 'lead-1' }),
      session({ id: 's-turn-ceiling', crc_lead_id: 'lead-1', structured_understanding: turnCeilingSU, email_captured_at: '2026-10-02T00:00:00Z' }),
    ]
    state.artifacts = [artifact({ id: 'a1', crc_session_id: 's-turn-ceiling' })]

    const result = await getResultsEmailHistoryForSession('s-turn-ceiling')
    expect(result.found).toBe(true)
    if (!result.found) return
    expect(result.artifacts).toHaveLength(1)
    expect(result.artifacts[0].id).toBe('a1')
  })

  // Case C: a lead with ZERO genuinely eligible sessions is not an
  // authorized lead at all -- its sessions' artifacts (if any) are not
  // reachable through this path. Pre-existing Sales-reachability boundary,
  // not loosened by this milestone.
  test('lead with no Sales-eligible session anywhere → not found, even with a persisted artifact', async () => {
    state.sessions = [session({ id: 's-turn-ceiling-only', crc_lead_id: 'lead-2', structured_understanding: turnCeilingSU })]
    state.artifacts = [artifact({ id: 'a1', crc_session_id: 's-turn-ceiling-only' })]

    const result = await getResultsEmailHistoryForSession('s-turn-ceiling-only')
    expect(result.found).toBe(false)
  })

  // Case D: session belongs to a DIFFERENT (even if itself authorized) lead
  // than the one being looked up under -- proven here by requesting a
  // session id that exists on lead-2 while lead-1's own eligible session
  // exists too; lead-2 has no eligible session of its own, so its session
  // must not leak through.
  test('cross-lead: a session on an unauthorized lead is rejected even though another lead is authorized', async () => {
    state.sessions = [
      session({ id: 's-lead1', crc_lead_id: 'lead-1' }),
      session({ id: 's-lead2', crc_lead_id: 'lead-2', structured_understanding: turnCeilingSU }),
    ]
    state.artifacts = [artifact({ id: 'a-lead2', crc_session_id: 's-lead2' })]

    expect((await getResultsEmailHistoryForSession('s-lead1')).found).toBe(true)
    expect((await getResultsEmailHistoryForSession('s-lead2')).found).toBe(false)
  })

  // Case E: arbitrary / nonexistent session id.
  test('nonexistent session id → not found', async () => {
    state.sessions = []
    const result = await getResultsEmailHistoryForSession('does-not-exist')
    expect(result.found).toBe(false)
  })

  // Case F: session with no crc_lead_id at all (should never have an
  // artifact by construction, but the guard is explicit regardless).
  test('session with no crc_lead_id → not found', async () => {
    state.sessions = [session({ id: 's-no-lead', crc_lead_id: null })]
    const result = await getResultsEmailHistoryForSession('s-no-lead')
    expect(result.found).toBe(false)
  })

  // Pre-1B historical session: authorized, zero artifacts -- honest empty
  // state, never reconstructed.
  test('authorized session with zero persisted artifacts → found, empty array', async () => {
    state.sessions = [session({ id: 's1' })]
    state.artifacts = []
    const result = await getResultsEmailHistoryForSession('s1')
    expect(result).toEqual({ found: true, artifacts: [] })
  })

  // Multiple artifacts: all returned, most-recent-first, never collapsed.
  test('multiple artifacts for one session → all returned, most-recent-first', async () => {
    state.sessions = [session({ id: 's1' })]
    state.artifacts = [
      artifact({ id: 'a-old', crc_session_id: 's1', generated_at: '2026-10-01T01:00:00Z', previous_artifact_id: null }),
      artifact({ id: 'a-new', crc_session_id: 's1', generated_at: '2026-10-01T02:00:00Z', previous_artifact_id: 'a-old' }),
    ]
    const result = await getResultsEmailHistoryForSession('s1')
    expect(result.found).toBe(true)
    if (!result.found) return
    expect(result.artifacts.map((a) => a.id)).toEqual(['a-new', 'a-old'])
    expect(result.artifacts[0].previous_artifact_id).toBe('a-old')
  })

  // Failed/unknown delivery outcomes pass through unmodified -- 'accepted'
  // is never the only state rendered.
  test('failed and unknown delivery outcomes are passed through verbatim', async () => {
    state.sessions = [session({ id: 's1' })]
    state.artifacts = [artifact({ id: 'a1', crc_session_id: 's1' })]
    state.attempts = [
      { artifact_id: 'a1', outcome: 'failed', provider_message_id: null, error_detail: 'invalid recipient', attempted_at: '2026-10-01T01:04:30Z', accepted_at: null },
    ]
    const result = await getResultsEmailHistoryForSession('s1')
    expect(result.found).toBe(true)
    if (!result.found) return
    expect(result.artifacts[0].attempts[0]).toEqual({
      outcome: 'failed',
      provider_message_id: null,
      error_detail: 'invalid recipient',
      attempted_at: '2026-10-01T01:04:30Z',
      accepted_at: null,
    })
  })

  // Exact content round-trip: subject/text returned byte-for-byte.
  test('subject and plain text are returned exactly as persisted, no transformation', async () => {
    state.sessions = [session({ id: 's1' })]
    state.artifacts = [artifact({ id: 'a1', crc_session_id: 's1', subject: 'Exact Subject™ — "quoted"', text: 'Line one.\nLine two.' })]
    const result = await getResultsEmailHistoryForSession('s1')
    expect(result.found).toBe(true)
    if (!result.found) return
    expect(result.artifacts[0].subject).toBe('Exact Subject™ — "quoted"')
    expect(result.artifacts[0].text).toBe('Line one.\nLine two.')
  })
})

describe('recordResultsEmailViewAudit — fail-closed, mirrors recordTranscriptViewAudit', () => {
  test('resolves when the audit row persists', async () => {
    state.auditInsert = { data: {}, error: null }
    await expect(recordResultsEmailViewAudit('user-1', 's1')).resolves.toBeUndefined()
  })

  test('THROWS when the audit row cannot be persisted', async () => {
    state.auditInsert = { data: null, error: { message: 'db down' } }
    await expect(recordResultsEmailViewAudit('user-1', 's1')).rejects.toThrow(/audit/i)
  })
})
