/**
 * LK-DEMAND-2D1 (2026-09-18) -- durable governance-candidate foundation.
 * Behavioral tests against an in-memory fake Supabase client (no live DB).
 */

import {
  createGovernanceCandidate,
  updateGovernanceCandidateLabel,
  linkDemandEvidence,
  unlinkDemandEvidence,
} from '../../lib/crc-engine/governance-candidates'

type Row = Record<string, any>

/**
 * A small, purpose-built in-memory fake for the exact chained query shapes
 * governance-candidates.ts uses: insert().select().single(),
 * update().eq().select().single(), select().eq().eq().maybeSingle(). Not a
 * generic Supabase mock -- tailored to this module's own call shapes only.
 */
type FakeError = { code?: string; message: string }
type ErrorHook = (op: 'select' | 'insert' | 'update') => FakeError | null

function createFakeClient(tables: Record<string, Row[]>, errorHooks: Record<string, ErrorHook> = {}) {
  let idCounter = 0
  return {
    from(tableName: string) {
      const rows = tables[tableName]
      let pendingInsert: Row | null = null
      let pendingUpdate: Row | null = null
      const filters: [string, any][] = []
      const builder: any = {
        insert(row: Row) {
          pendingInsert = row
          return builder
        },
        update(patch: Row) {
          pendingUpdate = patch
          return builder
        },
        eq(col: string, val: any) {
          filters.push([col, val])
          return builder
        },
        select() {
          return builder
        },
        async maybeSingle() {
          return resolve(true, 'select')
        },
        async single() {
          return resolve(false, pendingInsert ? 'insert' : 'update')
        },
      }
      function applyFilters(arr: Row[]) {
        return arr.filter((r) => filters.every(([c, v]) => r[c] === v))
      }
      function resolve(allowZero: boolean, op: 'select' | 'insert' | 'update') {
        const hookError = errorHooks[tableName]?.(op)
        if (hookError) return { data: null, error: hookError }
        if (pendingInsert) {
          idCounter += 1
          const isLinkTable = tableName === 'crc_knowledge_demand_governance_candidate_evidence'
          const defaults: Row = isLinkTable
            ? { id: `row-${idCounter}`, linked_at: new Date().toISOString(), unlinked_at: null }
            : { id: `row-${idCounter}`, created_at: new Date().toISOString() }
          const newRow: Row = { ...defaults, ...pendingInsert }
          rows.push(newRow)
          return { data: { ...newRow }, error: null }
        }
        if (pendingUpdate) {
          const matches = applyFilters(rows)
          matches.forEach((r) => Object.assign(r, pendingUpdate))
          const result = matches[0] ?? null
          if (!result) return { data: null, error: allowZero ? null : { message: 'no rows updated' } }
          return { data: { ...result }, error: null }
        }
        const matches = applyFilters(rows)
        if (allowZero) return { data: matches[0] ? { ...matches[0] } : null, error: null }
        return { data: matches[0] ? { ...matches[0] } : null, error: matches[0] ? null : { message: 'no rows found' } }
      }
      return builder
    },
  } as any
}

function freshDb() {
  return {
    crc_knowledge_demand_governance_candidates: [] as Row[],
    crc_knowledge_demand_governance_candidate_evidence: [] as Row[],
  }
}

describe('createGovernanceCandidate', () => {
  test('1. candidate can be created with a human label', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await createGovernanceCandidate(client, { label: 'Distribution destination questions', actorUserId: 'user-1' })
    expect(candidate.label).toBe('Distribution destination questions')
    expect(candidate.created_by).toBe('user-1')
    expect(candidate.id).toBeDefined()
    expect(tables.crc_knowledge_demand_governance_candidates).toHaveLength(1)
  })

  test('rejects an empty or whitespace-only label', async () => {
    const client = createFakeClient(freshDb())
    await expect(createGovernanceCandidate(client, { label: '   ', actorUserId: 'user-1' })).rejects.toThrow()
  })

  test('2. candidate label can be edited', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await createGovernanceCandidate(client, { label: 'Original label', actorUserId: 'user-1' })
    const updated = await updateGovernanceCandidateLabel(client, { candidateId: candidate.id, label: 'Revised label' })
    expect(updated.label).toBe('Revised label')
    expect(updated.id).toBe(candidate.id)
    // editing the label must not touch created_by/created_at
    expect(updated.created_by).toBe('user-1')
  })

  test('3. duplicate labels are allowed across different candidates', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const a = await createGovernanceCandidate(client, { label: 'Same wording', actorUserId: 'user-1' })
    const b = await createGovernanceCandidate(client, { label: 'Same wording', actorUserId: 'user-2' })
    expect(a.id).not.toBe(b.id)
    expect(tables.crc_knowledge_demand_governance_candidates).toHaveLength(2)
  })

  test('4/5. a created candidate row contains no subject/coverage/domain/onboarding/workflow field, and no other table is touched', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await createGovernanceCandidate(client, { label: 'x', actorUserId: 'user-1' })
    expect(Object.keys(candidate).sort()).toEqual(['created_at', 'created_by', 'id', 'label'].sort())
    // the fake db only has the two governance tables at all -- there is no
    // GovernedSubject/StructuredUnderstanding table for this call to have
    // reached; this is reinforced by source inspection (see final report).
  })
})

describe('linkDemandEvidence / unlinkDemandEvidence', () => {
  async function seedCandidateAndEvidence(client: any) {
    const candidate = await createGovernanceCandidate(client, { label: 'x', actorUserId: 'user-1' })
    return candidate
  }

  test('6. evidence UUID can be linked to a candidate', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await seedCandidateAndEvidence(client)
    const link = await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1', actorUserId: 'user-1' })
    expect(link.candidate_id).toBe(candidate.id)
    expect(link.evidence_row_id).toBe('evidence-1')
    expect(link.unlinked_at).toBeNull()
  })

  test('7. the same evidence row can link to two different candidates', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const c1 = await createGovernanceCandidate(client, { label: 'c1', actorUserId: 'user-1' })
    const c2 = await createGovernanceCandidate(client, { label: 'c2', actorUserId: 'user-1' })
    await linkDemandEvidence(client, { candidateId: c1.id, evidenceRowId: 'evidence-1', actorUserId: 'user-1' })
    await linkDemandEvidence(client, { candidateId: c2.id, evidenceRowId: 'evidence-1', actorUserId: 'user-1' })
    const links = tables.crc_knowledge_demand_governance_candidate_evidence.filter((l) => l.evidence_row_id === 'evidence-1')
    expect(links).toHaveLength(2)
  })

  test('8. one candidate can link evidence from multiple sessions (opaque evidence UUIDs)', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await seedCandidateAndEvidence(client)
    await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-session-a', actorUserId: 'user-1' })
    await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-session-b', actorUserId: 'user-1' })
    const links = tables.crc_knowledge_demand_governance_candidate_evidence.filter((l) => l.candidate_id === candidate.id)
    expect(links.map((l) => l.evidence_row_id).sort()).toEqual(['evidence-session-a', 'evidence-session-b'])
  })

  test('9. duplicate active link is idempotent -- cannot create a duplicate row', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await seedCandidateAndEvidence(client)
    const first = await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1', actorUserId: 'user-1' })
    const second = await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1', actorUserId: 'user-1' })
    expect(second.id).toBe(first.id)
    expect(tables.crc_knowledge_demand_governance_candidate_evidence).toHaveLength(1)
  })

  test('10. unlink sets unlinked_at', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await seedCandidateAndEvidence(client)
    await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1', actorUserId: 'user-1' })
    const unlinked = await unlinkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1' })
    expect(unlinked!.unlinked_at).not.toBeNull()
  })

  test('11. repeated unlink is idempotent', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await seedCandidateAndEvidence(client)
    await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1', actorUserId: 'user-1' })
    const first = await unlinkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1' })
    const second = await unlinkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1' })
    expect(second!.id).toBe(first!.id)
    expect(second!.unlinked_at).toBe(first!.unlinked_at)
    expect(tables.crc_knowledge_demand_governance_candidate_evidence).toHaveLength(1)
  })

  test('unlink on an association that never existed is a safe no-op, not an error', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await seedCandidateAndEvidence(client)
    const result = await unlinkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'never-linked' })
    expect(result).toBeNull()
    expect(tables.crc_knowledge_demand_governance_candidate_evidence).toHaveLength(0)
  })

  test('12/13. relink reactivates the SAME row and preserves the original linked_at -- no second row', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await seedCandidateAndEvidence(client)
    const original = await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1', actorUserId: 'user-1' })
    await unlinkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1' })
    const relinked = await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1', actorUserId: 'user-2' })
    expect(relinked.id).toBe(original.id) // same row, not a new one
    expect(relinked.linked_at).toBe(original.linked_at) // original first-link timestamp preserved
    expect(relinked.unlinked_at).toBeNull()
    expect(tables.crc_knowledge_demand_governance_candidate_evidence).toHaveLength(1)
  })

  test('14. concurrent-insert race: unique-violation (23505) on the INSERT resolves as idempotent success against the concurrent winner row (LK-DEMAND-2D1-R1)', async () => {
    const tables = freshDb()
    const candidate = await createGovernanceCandidate(createFakeClient(freshDb()), { label: 'x', actorUserId: 'user-1' })

    // Simulates: this request's own lookup observes no row (array is empty
    // at that point), then its INSERT hits the database's real
    // UNIQUE(candidate_id, evidence_row_id) constraint because a concurrent
    // request's own insert landed first. The hook fires ONLY for the
    // insert op (not the preceding select) -- pushes the "concurrent
    // winner" row into the table (simulating the other request's
    // already-committed insert) and returns the 23505 error for THIS
    // request's own insert attempt.
    let insertAttempted = false
    const client = createFakeClient(tables, {
      crc_knowledge_demand_governance_candidate_evidence: (op) => {
        if (op === 'insert' && !insertAttempted) {
          insertAttempted = true
          tables.crc_knowledge_demand_governance_candidate_evidence.push({
            id: 'row-concurrent-winner',
            candidate_id: candidate.id,
            evidence_row_id: 'evidence-1',
            linked_by: 'other-actor',
            linked_at: '2026-01-01T00:00:00.000Z',
            unlinked_at: null,
          })
          return { code: '23505', message: 'duplicate key value violates unique constraint "crc_knowledge_demand_governance_candidate_evidence_unique"' }
        }
        return null
      },
    })

    const result = await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1', actorUserId: 'racing-actor' })

    expect(insertAttempted).toBe(true)
    expect(result.id).toBe('row-concurrent-winner')
    expect(result.candidate_id).toBe(candidate.id)
    expect(result.evidence_row_id).toBe('evidence-1')
    expect(result.unlinked_at).toBeNull()
    // linked_by is NEVER rewritten to the losing request's actor -- the
    // concurrent winner's own original actor is preserved.
    expect(result.linked_by).toBe('other-actor')
    // exactly one durable row, not two.
    expect(tables.crc_knowledge_demand_governance_candidate_evidence).toHaveLength(1)
  })

  test('a genuine (non-23505) insert error still throws, never silently resolved', async () => {
    const tables = freshDb()
    const candidate = await createGovernanceCandidate(createFakeClient(freshDb()), { label: 'x', actorUserId: 'user-1' })
    const client = createFakeClient(tables, {
      crc_knowledge_demand_governance_candidate_evidence: (op) => (op === 'insert' ? { message: 'connection reset' } : null),
    })
    await expect(linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1', actorUserId: 'user-1' })).rejects.toThrow(
      /connection reset/,
    )
  })

  test('15. an invalid candidate FK fails (simulated DB error surfaces as a thrown error)', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables, {
      crc_knowledge_demand_governance_candidate_evidence: (op) =>
        op === 'insert' ? { message: 'insert or update on table violates foreign key constraint (candidate_id)' } : null,
    })
    await expect(linkDemandEvidence(client, { candidateId: 'nonexistent-candidate', evidenceRowId: 'evidence-1', actorUserId: 'user-1' })).rejects.toThrow(
      /foreign key/,
    )
  })

  test('16. an invalid evidence FK fails (simulated DB error surfaces as a thrown error)', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables, {
      crc_knowledge_demand_governance_candidate_evidence: (op) =>
        op === 'insert' ? { message: 'insert or update on table violates foreign key constraint (evidence_row_id)' } : null,
    })
    const candidate = await createGovernanceCandidate(createFakeClient(freshDb()), { label: 'x', actorUserId: 'user-1' })
    await expect(linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'nonexistent-evidence', actorUserId: 'user-1' })).rejects.toThrow(
      /foreign key/,
    )
  })

  test('17. superseded evidence may remain historically linked -- this module has no awareness of superseded_by at all and never filters on it', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await seedCandidateAndEvidence(client)
    // evidenceRowId is an opaque UUID reference; whether the referenced
    // crc_knowledge_demand_occurrences row is superseded is invisible to
    // and irrelevant to this module -- linking succeeds identically either
    // way, proving no automatic unlink/exclusion occurs.
    const link = await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-superseded', actorUserId: 'user-1' })
    expect(link.unlinked_at).toBeNull()
  })
})

describe('security/authority shape', () => {
  test('18. neither GovernanceCandidate nor GovernanceCandidateEvidenceLink contains any subject/coverage/domain/onboarding/workflow/decision field', async () => {
    const tables = freshDb()
    const client = createFakeClient(tables)
    const candidate = await createGovernanceCandidate(client, { label: 'x', actorUserId: 'user-1' })
    const link = await linkDemandEvidence(client, { candidateId: candidate.id, evidenceRowId: 'evidence-1', actorUserId: 'user-1' })
    const forbiddenKeys = [
      'resolved_subject_id',
      'target_subject_id',
      'subject_id',
      'subject_type',
      'subject_type_guess',
      'normalized_concept',
      'domain',
      'workflow_state',
      'status',
      'decision',
      'coverage_status',
      'knowledge_gap_status',
      'onboarding_status',
      'priority',
      'confidence',
      'crc_eligible',
    ]
    for (const key of forbiddenKeys) {
      expect(Object.prototype.hasOwnProperty.call(candidate, key)).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(link, key)).toBe(false)
    }
  })
})
