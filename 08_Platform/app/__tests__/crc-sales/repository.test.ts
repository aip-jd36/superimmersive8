/**
 * CAH-3B — repository: eligibility filtering, transcript strip, and the
 * FAIL-CLOSED transcript-access audit (Correction 2). Uses a controllable
 * in-memory fake for @/lib/supabase/admin.
 */

// ── controllable fake supabase-js client ─────────────────────────────────
type Outcome = { data: unknown; error: unknown }
const state: {
  sessions: Record<string, unknown>[]
  sales_state: Record<string, unknown>[]
  leads: Record<string, unknown>[]
  auditInsert: Outcome
  salesUpsert: Outcome
} = { sessions: [], sales_state: [], leads: [], auditInsert: { data: {}, error: null }, salesUpsert: { data: {}, error: null } }

function makeBuilder(table: string) {
  let rows: Record<string, unknown>[] = []
  if (table === 'crc_sessions') rows = state.sessions
  else if (table === 'crc_sales_state') rows = state.sales_state
  else if (table === 'crc_leads') rows = state.leads

  const filters: Array<(r: Record<string, unknown>) => boolean> = []
  let idEq: string | null = null
  const b: Record<string, unknown> = {}
  const chain = () => b
  b.select = chain
  b.order = chain
  b.not = (col: string, _op: string, _val: unknown) => {
    filters.push((r) => r[col] != null)
    return b
  }
  b.eq = (col: string, val: unknown) => {
    if (col === 'id') idEq = String(val)
    filters.push((r) => r[col] === val)
    return b
  }
  b.in = (col: string, vals: unknown[]) => {
    filters.push((r) => vals.includes(r[col]))
    return b
  }
  const applied = () => rows.filter((r) => filters.every((f) => f(r)))
  b.then = (resolve: (o: Outcome) => void) => resolve({ data: applied(), error: null })
  b.maybeSingle = async () => ({ data: applied()[0] ?? null, error: null })
  b.single = async () => ({ data: applied()[0] ?? null, error: null })
  b.insert = async (_payload: unknown) => state.auditInsert
  b.upsert = (_payload: unknown) => {
    const u: Record<string, unknown> = {}
    u.select = () => u
    u.single = async () => state.salesUpsert
    return u
  }
  void idEq
  return b
}

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (t: string) => makeBuilder(t) },
}))

import {
  recordTranscriptViewAudit,
  getEligibleSessionTranscript,
  listSalesContacts,
} from '@/lib/crc-sales/repository'

const completedSU = { completion_reason: 'gate_1_gate_2_met', user_goals: [], tool_mentions: [], asset_provider_mentions: [], assessment_jurisdiction_mentions: [], content_presence_mentions: [], scoped_observations: [], project_facts: { intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' }, workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' }, jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' }, human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' } } }
const incompleteSU = { ...completedSU, completion_reason: null }

function session(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 's1', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T01:00:00Z',
    email: 'x@y.com', email_captured_at: '2026-09-01T01:00:00Z', identity_source: 'email_gate', crc_lead_id: 'lead-1',
    structured_understanding: completedSU, transcript: [], results_email_status: 'accepted',
    results_email_last_recipient: 'x@y.com', results_email_accepted_at: '2026-09-01T01:05:00Z',
    traffic_type: 'pilot', runtime_commit: 'abc', turn_count: 4,
    ...overrides,
  }
}

beforeEach(() => {
  state.sessions = []
  state.sales_state = []
  state.leads = [{ id: 'lead-1', email: 'x@y.com' }]
  state.auditInsert = { data: {}, error: null }
  state.salesUpsert = { data: {}, error: null }
})

describe('recordTranscriptViewAudit — FAIL CLOSED (Correction 2)', () => {
  test('resolves when the audit row persists', async () => {
    state.auditInsert = { data: {}, error: null }
    await expect(recordTranscriptViewAudit('user-1', 's1')).resolves.toBeUndefined()
  })

  test('THROWS when the audit row cannot be persisted — caller must then deny the transcript', async () => {
    state.auditInsert = { data: null, error: { message: 'db down' } }
    await expect(recordTranscriptViewAudit('user-1', 's1')).rejects.toThrow(/audit/i)
  })
})

describe('getEligibleSessionTranscript', () => {
  test('non-eligible session (incomplete) → null (no transcript)', async () => {
    state.sessions = [session({ id: 's1', structured_understanding: incompleteSU, transcript: [{ role: 'user', text: 'hi' }] })]
    expect(await getEligibleSessionTranscript('s1')).toBeNull()
  })

  test('non-eligible session (no email) → null', async () => {
    state.sessions = [session({ id: 's1', email: null, transcript: [{ role: 'user', text: 'hi' }] })]
    expect(await getEligibleSessionTranscript('s1')).toBeNull()
  })

  test('eligible session → only user/assistant entries, internal metadata stripped', async () => {
    state.sessions = [session({ id: 's1', transcript: [
      { role: 'user', text: 'hi', timestamp: 't1', message_kind: 'user' },
      { role: 'assistant', text: 'hello', message_kind: 'question' },
      { role: 'system', text: 'internal' },
      { role: 'educational_takeaway', text: 'aside' },
    ] })]
    const t = await getEligibleSessionTranscript('s1')
    expect(t).toEqual([
      { role: 'user', text: 'hi', timestamp: 't1' },
      { role: 'assistant', text: 'hello', timestamp: null },
    ])
  })

  test('eligible session, empty transcript → [] (not null, does not block)', async () => {
    state.sessions = [session({ id: 's1', transcript: [] })]
    expect(await getEligibleSessionTranscript('s1')).toEqual([])
  })
})

describe('listSalesContacts', () => {
  test('groups eligible sessions by contact; excludes ineligible; NEW is the default status', async () => {
    state.sessions = [
      session({ id: 's-ok-1', crc_lead_id: 'lead-1', email_captured_at: '2026-09-02T00:00:00Z' }),
      session({ id: 's-ok-2', crc_lead_id: 'lead-1', email_captured_at: '2026-09-01T00:00:00Z' }),
      session({ id: 's-incomplete', crc_lead_id: 'lead-1', structured_understanding: incompleteSU }),
      session({ id: 's-noemail', crc_lead_id: 'lead-1', email: null }),
    ]
    state.sales_state = [{ crc_session_id: 's-ok-2', status: 'CONVERTING', close_reason: null }]
    const contacts = await listSalesContacts()
    expect(contacts).toHaveLength(1)
    expect(contacts[0].email).toBe('x@y.com')
    expect(contacts[0].eligible_session_count).toBe(2)
    expect(contacts[0].status_summary).toEqual({ NEW: 1, CONTACTED: 0, CONVERTING: 1, CLOSED: 0 })
    expect(contacts[0].most_recent_eligible_at).toBe('2026-09-02T00:00:00Z')
  })

  test('contact with no eligible session does not appear', async () => {
    state.sessions = [session({ id: 's-incomplete', structured_understanding: incompleteSU })]
    expect(await listSalesContacts()).toEqual([])
  })
})
