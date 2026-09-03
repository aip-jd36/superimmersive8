/**
 * CAH-3D -- association core service: contract, authorization, completion,
 * and fail-closed audit. Covers CAH-3D §29 tests 1-14 and 26-29.
 *
 * Uses a controllable in-memory fake for @/lib/supabase/admin that mirrors the
 * transaction semantics of the two Postgres functions in migration
 * 20260904000000 (atomic association + required audit; audit failure rolls the
 * whole operation back).
 */

import { randomUUID } from 'crypto'

// ── controllable fake supabase-js client ─────────────────────────────────

type Assoc = {
  id: string
  crc_session_id: string
  submission_id: string
  associated_by: string
  associated_at: string
  authorization_basis: string
  status: 'active' | 'removed'
  removed_at: string | null
  removed_by: string | null
  crc_state_fingerprint: string
  crc_state_canon_version: string
  crc_session_runtime_commit: string | null
  created_at: string
  updated_at: string
}
type Event = {
  id: string
  event_type: 'association_created' | 'association_removed'
  association_id: string
  actor_user_id: string
  crc_session_id: string
  submission_id: string
  authorization_basis: string | null
  created_at: string
}

const db: {
  submissions: Array<{ id: string; user_id: string }>
  crc_sessions: Array<{ id: string; structured_understanding: unknown; runtime_commit: string | null }>
  associations: Assoc[]
  events: Event[]
  forceAuditFailure: boolean
  forceRpcError: boolean
  forceReadError: boolean
} = {
  submissions: [],
  crc_sessions: [],
  associations: [],
  events: [],
  forceAuditFailure: false,
  forceRpcError: false,
  forceReadError: false,
}

function reset() {
  db.submissions = []
  db.crc_sessions = []
  db.associations = []
  db.events = []
  db.forceAuditFailure = false
  db.forceRpcError = false
  db.forceReadError = false
}

function fromBuilder(table: string) {
  let idEq: string | null = null
  const b: Record<string, unknown> = {}
  b.select = () => b
  b.order = () => b
  b.eq = (col: string, val: unknown) => {
    if (col === 'id') idEq = String(val)
    return b
  }
  b.maybeSingle = async () => {
    if (db.forceReadError) return { data: null, error: { message: 'read failed' } }
    if (table === 'submissions') {
      const row = db.submissions.find((r) => r.id === idEq)
      return { data: row ? { user_id: row.user_id } : null, error: null }
    }
    if (table === 'crc_sessions') {
      const row = db.crc_sessions.find((r) => r.id === idEq)
      return {
        data: row ? { structured_understanding: row.structured_understanding, runtime_commit: row.runtime_commit } : null,
        error: null,
      }
    }
    return { data: null, error: null }
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
  const sessionExists = db.crc_sessions.some((s) => s.id === p.p_crc_session_id)
  if (!sessionExists) return { data: { ok: false, reason: 'reference_not_found' }, error: null }

  // Audit failure -> whole transaction rolls back: NOTHING is written.
  if (db.forceAuditFailure) return { data: null, error: { message: 'audit insert failed' } }

  const now = new Date().toISOString()
  const assoc: Assoc = {
    id: randomUUID(),
    crc_session_id: String(p.p_crc_session_id),
    submission_id: String(p.p_submission_id),
    associated_by: String(p.p_associated_by),
    associated_at: now,
    authorization_basis: String(p.p_authorization_basis),
    status: 'active',
    removed_at: null,
    removed_by: null,
    crc_state_fingerprint: String(p.p_crc_state_fingerprint),
    crc_state_canon_version: String(p.p_crc_state_canon_version),
    crc_session_runtime_commit: (p.p_crc_session_runtime_commit as string | null) ?? null,
    created_at: now,
    updated_at: now,
  }
  db.associations.push(assoc)
  db.events.push({
    id: randomUUID(),
    event_type: 'association_created',
    association_id: assoc.id,
    actor_user_id: assoc.associated_by,
    crc_session_id: assoc.crc_session_id,
    submission_id: assoc.submission_id,
    authorization_basis: assoc.authorization_basis,
    created_at: now,
  })
  return { data: { ok: true, association: assoc }, error: null }
}

function rpcRemove(p: Record<string, unknown>) {
  if (db.forceRpcError) return { data: null, error: { message: 'rpc failed' } }
  const assoc = db.associations.find((a) => a.id === p.p_association_id)
  if (!assoc) return { data: { ok: false, reason: 'association_not_found' }, error: null }
  if (assoc.status !== 'active') return { data: { ok: false, reason: 'not_active' }, error: null }
  const owns = db.submissions.some((s) => s.id === assoc.submission_id && s.user_id === p.p_removed_by)
  if (!owns) return { data: { ok: false, reason: 'not_submission_owner' }, error: null }

  if (db.forceAuditFailure) return { data: null, error: { message: 'audit insert failed' } }

  const now = new Date().toISOString()
  assoc.status = 'removed'
  assoc.removed_at = now
  assoc.removed_by = String(p.p_removed_by)
  assoc.updated_at = now
  db.events.push({
    id: randomUUID(),
    event_type: 'association_removed',
    association_id: assoc.id,
    actor_user_id: String(p.p_removed_by),
    crc_session_id: assoc.crc_session_id,
    submission_id: assoc.submission_id,
    authorization_basis: null,
    created_at: now,
  })
  return { data: { ok: true, association: assoc }, error: null }
}

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (t: string) => fromBuilder(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'create_crc_assurance_association') return rpcCreate(args)
      if (fn === 'remove_crc_assurance_association') return rpcRemove(args)
      return { data: null, error: { message: `unknown rpc ${fn}` } }
    },
  },
}))

import {
  associateCrcSessionWithSubmission,
  removeCrcAssuranceAssociation,
} from '@/lib/crc-assurance-handoff/service'
import type { AuthorizationBasis } from '@/lib/crc-assurance-handoff/types'
import {
  KNOWN_AUTHORIZATION_BASES,
  CURRENTLY_ENABLED_AUTHORIZATION_BASES,
} from '@/lib/crc-assurance-handoff/types'
import { PRODUCTION_AUTHORIZATION_POLICY, type AuthorizationPolicy } from '@/lib/crc-assurance-handoff/authorization-policy'

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
const SESSION = 'sess-1'
const BASIS: AuthorizationBasis = 'association_token_confirmation' // a real KNOWN basis

/**
 * CAH-3D.1 test seam: an inline policy that authorizes any KNOWN basis. It is
 * constructed only here in __tests__/, never exported, and structurally cannot
 * become a production policy (the production default is
 * PRODUCTION_AUTHORIZATION_POLICY, which enables nothing). Used ONLY to reach
 * the persistence / ownership / completion / state-binding / audit / duplicate
 * / removal code paths that must remain proven.
 */
const TEST_POLICY: AuthorizationPolicy = { isEnabled: () => true }
const associate = (i: Parameters<typeof associateCrcSessionWithSubmission>[0]) =>
  associateCrcSessionWithSubmission(i, TEST_POLICY)

function seed(su: unknown = completedSU(), runtimeCommit: string | null = 'abc123') {
  db.submissions.push({ id: SUB, user_id: OWNER })
  db.crc_sessions.push({ id: SESSION, structured_understanding: su, runtime_commit: runtimeCommit })
}

beforeEach(reset)

// ── ASSOCIATION CONTRACT ─────────────────────────────────────────────────

describe('CAH-3D association contract', () => {
  test('1: association records actor / submission / session / time / authorization basis', async () => {
    seed()
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.association.associated_by).toBe(OWNER)
    expect(res.association.submission_id).toBe(SUB)
    expect(res.association.crc_session_id).toBe(SESSION)
    expect(res.association.authorization_basis).toBe('association_token_confirmation')
    expect(typeof res.association.associated_at).toBe('string')
    expect(res.association.crc_state_fingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(res.association.crc_state_canon_version).toBe('csi-v1')
    expect(res.association.crc_session_runtime_commit).toBe('abc123')
    expect(res.association.status).toBe('active')
  })

  test('2: no field implies historical CRC ownership', async () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'lib/crc-assurance-handoff/types.ts'), 'utf8')
    for (const forbidden of ['ownership_mechanism', 'ownership_verified', 'verified_crc_owner', 'crc_owner', 'historical_owner']) {
      // Only flag as an identifier, not inside prose/comments.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      expect(code).not.toContain(forbidden)
    }
    seed()
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(Object.keys(res.association)).not.toContain('ownership_mechanism')
  })

  test('3: multiple CRC sessions may associate to one submission', async () => {
    db.submissions.push({ id: SUB, user_id: OWNER })
    db.crc_sessions.push({ id: 'sess-a', structured_understanding: completedSU(), runtime_commit: null })
    db.crc_sessions.push({ id: 'sess-b', structured_understanding: completedSU({ completion_reason: 'declined' }), runtime_commit: null })
    const a = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: 'sess-a', authorizationBasis: BASIS })
    const b = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: 'sess-b', authorizationBasis: BASIS })
    expect(a.ok && b.ok).toBe(true)
    expect(db.associations.filter((x) => x.submission_id === SUB && x.status === 'active')).toHaveLength(2)
  })

  test('4: same CRC session cannot create a duplicate ACTIVE association to the same submission', async () => {
    seed()
    const first = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(first.ok).toBe(true)
    const dup = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(dup).toEqual({ ok: false, code: 'duplicate_active' })
  })

  test('5: the same CRC session MAY associate to a different submission (no global one-submission-per-CRC)', async () => {
    db.submissions.push({ id: SUB, user_id: OWNER })
    db.submissions.push({ id: 'sub-2', user_id: OWNER })
    db.crc_sessions.push({ id: SESSION, structured_understanding: completedSU(), runtime_commit: null })
    const a = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    const b = await associate({ actorUserId: OWNER, submissionId: 'sub-2', crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(a.ok && b.ok).toBe(true)
    // And the migration DDL (comments stripped) must not contain a global
    // UNIQUE(crc_session_id).
    const migRaw = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'supabase/migrations/20260904000000_crc_assurance_associations.sql'),
      'utf8',
    )
    const migDdl = migRaw.replace(/^\s*--.*$/gm, '')
    expect(migDdl).not.toMatch(/UNIQUE\s*\(\s*crc_session_id\s*\)/i)
    expect(migDdl).not.toMatch(/crc_session_id\s+UUID[^,]*\bUNIQUE\b/i)
  })

  test('6: a removed association is distinguishable from an active one', async () => {
    seed()
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const rm = await removeCrcAssuranceAssociation({ actorUserId: OWNER, associationId: res.association.id })
    expect(rm.ok).toBe(true)
    if (!rm.ok) return
    expect(rm.association.status).toBe('removed')
    expect(rm.association.removed_by).toBe(OWNER)
    expect(typeof rm.association.removed_at).toBe('string')
    // A fresh active association for the same pair is now allowed.
    const again = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(again.ok).toBe(true)
  })
})

// ── AUTHORIZATION / OWNERSHIP ────────────────────────────────────────────

describe('CAH-3D authorization / ownership', () => {
  test('7 + 8: actor must own the target submission; non-owner cannot create', async () => {
    seed()
    const res = await associate({ actorUserId: OTHER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res).toEqual({ ok: false, code: 'not_submission_owner' })
    expect(db.associations).toHaveLength(0)
  })

  test('9: non-owner cannot remove', async () => {
    seed()
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const rm = await removeCrcAssuranceAssociation({ actorUserId: OTHER, associationId: res.association.id })
    expect(rm).toEqual({ ok: false, code: 'not_submission_owner' })
    expect(db.associations[0].status).toBe('active')
  })

  test('10: arbitrary / unknown authorization basis fails closed (regardless of policy)', async () => {
    seed()
    for (const bad of ['totally-made-up', '', 'internal', 'admin', 'system']) {
      const res = await associateCrcSessionWithSubmission(
        { actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: bad as unknown as AuthorizationBasis },
        { isEnabled: () => true }, // even a permissive policy cannot rescue an unknown basis
      )
      expect(res).toEqual({ ok: false, code: 'unknown_authorization_basis' })
    }
    expect(db.associations).toHaveLength(0)
  })

  test('11: the core service performs no email / cookie / token / Sales check', () => {
    const fs = require('fs')
    const path = require('path')
    const dir = path.join(__dirname, '..', '..', 'lib/crc-assurance-handoff')
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.ts')) continue
      const code = fs
        .readFileSync(path.join(dir, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
      // No dependency on any front-door subsystem, in ANY file.
      expect(code).not.toMatch(/crc_sales_state|crc_sales_events|crc-sales/i)
      expect(code).not.toMatch(/email_normalized|crc_leads/i)
      expect(code).not.toMatch(/attribution_token|CONVERTING/i)
      // No front-door VERB anywhere (the AuthorizationBasis union in types.ts
      // legitimately NAMES the future classes as unsupported string literals;
      // what must not exist is logic that reads a cookie / redeems a token /
      // matches an email).
      expect(code).not.toMatch(/cookies?\s*\(|getCookie|readCookie/i)
      expect(code).not.toMatch(/redeemToken|verifyToken|consumeToken|matchEmail|emailMatches/i)
    }
    // The service specifically branches on NOTHING but supported basis +
    // ownership + completion + state readability.
    const svc = fs
      .readFileSync(path.join(dir, 'service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
    expect(svc).not.toMatch(/same_browser|possession_reference|association_token|delegated_authorization/)
  })
})

// ── COMPLETION ──────────────────────────────────────────────────────────

describe('CAH-3D completion eligibility', () => {
  test('12: an incomplete CRC session cannot be associated', async () => {
    seed(completedSU({ completion_reason: null }))
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res).toEqual({ ok: false, code: 'crc_session_not_completed' })
    expect(db.associations).toHaveLength(0)
  })

  test('13: all five governed completion reasons are accepted', async () => {
    const reasons = ['gate_1_gate_2_met', 'declined', 'gate_1_unmet_exhausted', 'questioning_exhausted', 'question_budget_exhausted']
    for (const r of reasons) {
      reset()
      db.submissions.push({ id: SUB, user_id: OWNER })
      db.crc_sessions.push({ id: SESSION, structured_understanding: completedSU({ completion_reason: r }), runtime_commit: null })
      const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
      expect(res.ok).toBe(true)
    }
  })

  test('14: product_stop_reason alone does NOT make a session eligible', async () => {
    // completion_reason still null, but a product_stop_reason is set on the row.
    seed(completedSU({ completion_reason: null }))
    // Even if the raw persisted state carries a product_stop_reason-like flag,
    // the service never reads it -- eligibility depends solely on completion_reason.
    ;(db.crc_sessions[0].structured_understanding as Record<string, unknown>).product_stop_reason = 'conversation_limit_reached'
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res).toEqual({ ok: false, code: 'crc_session_not_completed' })
  })

  test('missing submission / missing session fail closed', async () => {
    db.crc_sessions.push({ id: SESSION, structured_understanding: completedSU(), runtime_commit: null })
    expect(await associate({ actorUserId: OWNER, submissionId: 'nope', crcSessionId: SESSION, authorizationBasis: BASIS })).toEqual({
      ok: false,
      code: 'submission_not_found',
    })
    reset()
    db.submissions.push({ id: SUB, user_id: OWNER })
    expect(await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: 'nope', authorizationBasis: BASIS })).toEqual({
      ok: false,
      code: 'crc_session_not_found',
    })
  })

  test('unreadable persisted CRC state fails closed', async () => {
    db.submissions.push({ id: SUB, user_id: OWNER })
    db.crc_sessions.push({ id: SESSION, structured_understanding: { user_goals: 'not-an-array' }, runtime_commit: null })
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res).toEqual({ ok: false, code: 'crc_state_unreadable' })
  })
})

// ── AUDIT (fail-closed) ─────────────────────────────────────────────────

describe('CAH-3D fail-closed audit', () => {
  test('26: creation-audit failure means NO association is created', async () => {
    seed()
    db.forceAuditFailure = true
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res).toEqual({ ok: false, code: 'persistence_failed' })
    expect(db.associations).toHaveLength(0)
    expect(db.events).toHaveLength(0)
  })

  test('27: removal-audit failure means the association remains ACTIVE', async () => {
    seed()
    const created = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    db.forceAuditFailure = true
    const rm = await removeCrcAssuranceAssociation({ actorUserId: OWNER, associationId: created.association.id })
    expect(rm).toEqual({ ok: false, code: 'persistence_failed' })
    expect(db.associations[0].status).toBe('active')
    expect(db.events.filter((e) => e.event_type === 'association_removed')).toHaveLength(0)
  })

  test('28: a successful creation has exactly one association_created audit event', async () => {
    seed()
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const created = db.events.filter((e) => e.event_type === 'association_created' && e.association_id === res.association.id)
    expect(created).toHaveLength(1)
    expect(created[0].actor_user_id).toBe(OWNER)
  })

  test('29: a successful removal has exactly one association_removed audit event', async () => {
    seed()
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    await removeCrcAssuranceAssociation({ actorUserId: OWNER, associationId: res.association.id })
    const removed = db.events.filter((e) => e.event_type === 'association_removed' && e.association_id === res.association.id)
    expect(removed).toHaveLength(1)
  })

  test('a transient RPC/DB error fails closed to persistence_failed', async () => {
    seed()
    db.forceRpcError = true
    expect(await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })).toEqual({
      ok: false,
      code: 'persistence_failed',
    })
    db.forceRpcError = false
    const ok = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    db.forceRpcError = true
    expect(await removeCrcAssuranceAssociation({ actorUserId: OWNER, associationId: ok.association.id })).toEqual({ ok: false, code: 'persistence_failed' })
  })

  test('remove of a non-existent / already-removed association fails closed', async () => {
    seed()
    expect(await removeCrcAssuranceAssociation({ actorUserId: OWNER, associationId: randomUUID() })).toEqual({
      ok: false,
      code: 'association_not_found',
    })
    const res = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    await removeCrcAssuranceAssociation({ actorUserId: OWNER, associationId: res.association.id })
    expect(await removeCrcAssuranceAssociation({ actorUserId: OWNER, associationId: res.association.id })).toEqual({ ok: false, code: 'not_active' })
  })
})

// ── CAH-3D.1: authorization fail-closed correction ──────────────────────

describe('CAH-3D.1 authorization fail-closed', () => {
  test('1: the production enabled authorization-basis set is EMPTY', () => {
    expect(CURRENTLY_ENABLED_AUTHORIZATION_BASES.size).toBe(0)
    expect([...CURRENTLY_ENABLED_AUTHORIZATION_BASES]).toEqual([])
  })

  test('2: every KNOWN future real-world basis is rejected by the PRODUCTION service', async () => {
    seed()
    for (const basis of KNOWN_AUTHORIZATION_BASES) {
      // No policy arg -> PRODUCTION_AUTHORIZATION_POLICY (enables nothing).
      const res = await associateCrcSessionWithSubmission({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: basis })
      expect(res).toEqual({ ok: false, code: 'authorization_basis_not_enabled' })
    }
    expect(db.associations).toHaveLength(0)
    expect(db.events).toHaveLength(0)
  })

  test('3: an arbitrary unknown basis is rejected (unknown, not "not enabled")', async () => {
    seed()
    const res = await associateCrcSessionWithSubmission({
      actorUserId: OWNER,
      submissionId: SUB,
      crcSessionId: SESSION,
      authorizationBasis: 'made_up_basis' as unknown as AuthorizationBasis,
    })
    expect(res).toEqual({ ok: false, code: 'unknown_authorization_basis' })
  })

  test('4 + 5: no placeholder / synonym bypass basis exists', async () => {
    seed()
    const bypasses = [
      'core_internal_uninferred', 'internal', 'trusted_caller', 'system', 'manual',
      'admin', 'service_role', 'internal_service', 'preauthorized', 'test',
      'migration', 'support', 'unspecified', 'inferred', 'legacy',
    ]
    for (const bypass of bypasses) {
      const res = await associateCrcSessionWithSubmission({
        actorUserId: OWNER,
        submissionId: SUB,
        crcSessionId: SESSION,
        authorizationBasis: bypass as unknown as AuthorizationBasis,
      })
      expect(res).toEqual({ ok: false, code: 'unknown_authorization_basis' })
    }
    expect(db.associations).toHaveLength(0)
  })

  test('6: submission ownership ALONE cannot create an association', async () => {
    seed()
    const res = await associateCrcSessionWithSubmission({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res.ok).toBe(false)
    expect(db.associations).toHaveLength(0)
  })

  test('7 + 8: completed CRC + ownership together STILL cannot create without an enabled capability', async () => {
    seed()
    const res = await associateCrcSessionWithSubmission({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(res).toEqual({ ok: false, code: 'authorization_basis_not_enabled' })
    expect(db.events).toHaveLength(0)
  })

  test('9/10/11: no Sales / email / cookie authorization input or capability exists', () => {
    const fs = require('fs')
    const path = require('path')
    const dir = path.join(__dirname, '..', '..', 'lib/crc-assurance-handoff')
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.ts')) continue
      const code = fs
        .readFileSync(path.join(dir, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
      expect(code).not.toMatch(/CONVERTING|crc_sales|email_normalized/i)
    }
    expect([...KNOWN_AUTHORIZATION_BASES]).not.toContain('sales_converting' as never)
    expect([...KNOWN_AUTHORIZATION_BASES]).not.toContain('email_match' as never)
    expect([...KNOWN_AUTHORIZATION_BASES]).not.toContain('cookie_present' as never)
  })

  test('12: no customer / browser / API association route exists', () => {
    const fs = require('fs')
    const path = require('path')
    const APP = path.join(__dirname, '..', '..')
    for (const p of [
      'app/api/crc-assurance-handoff', 'app/api/associations',
      'app/api/admin/crc-associations', 'app/admin/crc-associations',
      'app/dashboard/associations',
    ]) {
      expect(fs.existsSync(path.join(APP, p))).toBe(false)
    }
  })

  test('13-19 (seam): persistence / audit / duplicate / removal still provable via the TEST policy', async () => {
    seed()
    const created = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(db.associations).toHaveLength(1)
    expect(db.events.filter((e) => e.event_type === 'association_created')).toHaveLength(1)
    const dup = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(dup).toEqual({ ok: false, code: 'duplicate_active' })
    const rm = await removeCrcAssuranceAssociation({ actorUserId: OWNER, associationId: created.association.id })
    expect(rm.ok).toBe(true)
    expect(db.events.filter((e) => e.event_type === 'association_removed')).toHaveLength(1)

    reset()
    seed()
    db.forceAuditFailure = true
    const failed = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(failed).toEqual({ ok: false, code: 'persistence_failed' })
    expect(db.associations).toHaveLength(0)

    reset()
    seed()
    const c2 = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(c2.ok).toBe(true)
    if (!c2.ok) return
    db.forceAuditFailure = true
    const rm2 = await removeCrcAssuranceAssociation({ actorUserId: OWNER, associationId: c2.association.id })
    expect(rm2).toEqual({ ok: false, code: 'persistence_failed' })
    expect(db.associations[0].status).toBe('active')
  })

  test('23 + 24: incomplete CRC / product_stop_reason still fail closed (even with an enabling policy)', async () => {
    seed(completedSU({ completion_reason: null }))
    ;(db.crc_sessions[0].structured_understanding as Record<string, unknown>).product_stop_reason = 'conversation_limit_reached'
    const prod = await associateCrcSessionWithSubmission({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(prod.ok).toBe(false)
    const withPolicy = await associate({ actorUserId: OWNER, submissionId: SUB, crcSessionId: SESSION, authorizationBasis: BASIS })
    expect(withPolicy).toEqual({ ok: false, code: 'crc_session_not_completed' })
  })

  test('PRODUCTION_AUTHORIZATION_POLICY delegates to the enabled set (no hardcoded allow, no env branch)', () => {
    for (const b of KNOWN_AUTHORIZATION_BASES) expect(PRODUCTION_AUTHORIZATION_POLICY.isEnabled(b)).toBe(false)
    expect(PRODUCTION_AUTHORIZATION_POLICY.isEnabled('anything')).toBe(false)
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'lib/crc-assurance-handoff/authorization-policy.ts'),
      'utf8',
    )
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    expect(code).toMatch(/CURRENTLY_ENABLED_AUTHORIZATION_BASES/)
    expect(code).not.toMatch(/return\s+true/)
    expect(code).not.toMatch(/NODE_ENV|process\.env/)
  })
})
