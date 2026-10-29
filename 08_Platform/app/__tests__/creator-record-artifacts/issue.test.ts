/**
 * CR-ARTIFACT-1 — issuance procedure (lib/creator-record-artifacts/issue.ts).
 *
 * The fakes model the database and storage contract the migration enforces:
 * UNIQUE(submission_id), compare-and-swap updates on attempt_id, immutable
 * issued rows, and storage that never overwrites (upsert: false).
 */

import { issueCreatorRecordArtifact, sha256Hex, type ArtifactRow, type ArtifactTable, type IssueDeps, type ObjectStore } from '@/lib/creator-record-artifacts/issue'

const SUB = '3f2a9c10-1111-4222-8333-444455556666'

class FakeTable implements ArtifactTable {
  rows = new Map<string, ArtifactRow>()
  failMarkIssuedOnce = false
  private n = 0
  async find(submissionId: string) {
    const r = Array.from(this.rows.values()).find((x) => x.submission_id === submissionId)
    return r ? { ...r } : null
  }
  async insertPending(row: Omit<ArtifactRow, 'id' | 'status' | 'issued_at'>) {
    if (Array.from(this.rows.values()).some((x) => x.submission_id === row.submission_id)) return { result: 'conflict' as const }
    const full: ArtifactRow = { ...row, id: `art-${++this.n}`, status: 'pending', issued_at: null }
    this.rows.set(full.id, full)
    return { result: 'inserted' as const, row: { ...full } }
  }
  async takeOver(id: string, expected: string, next: Pick<ArtifactRow, 'attempt_id' | 'storage_path' | 'sha256' | 'byte_size'>) {
    const r = this.rows.get(id)
    if (!r || r.status !== 'pending' || r.attempt_id !== expected) return false
    this.rows.set(id, { ...r, ...next })
    return true
  }
  async markIssued(id: string, attemptId: string, sha: string) {
    if (this.failMarkIssuedOnce) {
      this.failMarkIssuedOnce = false
      throw new Error('network')
    }
    const r = this.rows.get(id)
    if (!r || r.status !== 'pending' || r.attempt_id !== attemptId || r.sha256 !== sha) return false
    this.rows.set(id, { ...r, status: 'issued', issued_at: '2026-10-28T00:00:00Z' })
    return true
  }
}

class FakeObjects implements ObjectStore {
  objects = new Map<string, Uint8Array>()
  failPutOnce = false
  failGetWith: Error | null = null
  puts: string[] = []
  async get(path: string) {
    if (this.failGetWith) throw this.failGetWith
    return this.objects.get(path) ?? null
  }
  async put(path: string, bytes: Uint8Array) {
    this.puts.push(path)
    if (this.failPutOnce) {
      this.failPutOnce = false
      throw new Error('upload 503')
    }
    if (this.objects.has(path)) return 'exists' as const
    this.objects.set(path, bytes)
    return 'stored' as const
  }
}

function setup() {
  const table = new FakeTable()
  const objects = new FakeObjects()
  let renders = 0
  let ids = 0
  const deps = (over: Partial<IssueDeps> = {}): IssueDeps => ({
    artifacts: table,
    objects,
    render: async (recordId) => {
      renders++
      return new TextEncoder().encode(`%PDF ${recordId} render ${renders}`)
    },
    newAttemptId: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`,
    now: () => new Date('2026-10-28T12:00:00Z'),
    uat: true,
    ...over,
  })
  return { table, objects, deps, renders: () => renders }
}

describe('initial issuance', () => {
  test('renders once, stores privately at an attempt path, verifies the digest, then issues', async () => {
    const { table, objects, deps, renders } = setup()
    const r = await issueCreatorRecordArtifact(SUB, deps())
    expect(r.outcome).toBe('issued')
    const row = (await table.find(SUB))!
    expect(row).toEqual(expect.objectContaining({ status: 'issued', record_id: 'CR-2026-3F2A9C10', uat: true, generator_version: 'legacy-creator-record-pdf-v2' }))
    expect(row.storage_path).toBe(`${SUB}/${row.attempt_id}.pdf`)
    expect(row.sha256).toBe(sha256Hex(objects.objects.get(row.storage_path)!))
    expect(row.byte_size).toBe(objects.objects.get(row.storage_path)!.byteLength)
    expect(renders()).toBe(1)
  })

  test('repeated issuance is a no-op: no render, no upload, the same artifact', async () => {
    const { table, objects, deps, renders } = setup()
    await issueCreatorRecordArtifact(SUB, deps())
    const before = (await table.find(SUB))!
    const again = await issueCreatorRecordArtifact(SUB, deps())
    expect(again).toEqual({ outcome: 'already_issued', artifact: before })
    expect(renders()).toBe(1)
    expect(objects.puts).toHaveLength(1)
  })
})

describe('failure recovery', () => {
  test('upload failure leaves a pending row; the retry takes over with a new attempt and issues', async () => {
    const { table, objects, deps } = setup()
    objects.failPutOnce = true
    await expect(issueCreatorRecordArtifact(SUB, deps())).rejects.toThrow('upload 503')
    const pending = (await table.find(SUB))!
    expect(pending.status).toBe('pending')
    const r = await issueCreatorRecordArtifact(SUB, deps())
    expect(r.outcome).toBe('issued')
    const issued = (await table.find(SUB))!
    expect(issued.attempt_id).not.toBe(pending.attempt_id)
    expect(issued.storage_path).not.toBe(pending.storage_path)
    expect(issued.record_id).toBe(pending.record_id) // the customer-facing id is fixed at the first attempt
  })

  test('database failure after upload: the retry issues the stored object WITHOUT re-rendering', async () => {
    const { table, objects, deps, renders } = setup()
    table.failMarkIssuedOnce = true
    await expect(issueCreatorRecordArtifact(SUB, deps())).rejects.toThrow('network')
    const pending = (await table.find(SUB))!
    expect(pending.status).toBe('pending')
    expect(objects.objects.has(pending.storage_path)).toBe(true)
    const r = await issueCreatorRecordArtifact(SUB, deps())
    expect(r.outcome).toBe('issued')
    expect(renders()).toBe(1)
    expect((await table.find(SUB))!.sha256).toBe(pending.sha256)
  })

  test('a transient storage read error is thrown, never treated as "missing" (no takeover)', async () => {
    const { table, objects, deps } = setup()
    table.failMarkIssuedOnce = true
    await expect(issueCreatorRecordArtifact(SUB, deps())).rejects.toThrow()
    const pending = (await table.find(SUB))!
    objects.failGetWith = new Error('storage 500')
    await expect(issueCreatorRecordArtifact(SUB, deps())).rejects.toThrow('storage 500')
    expect((await table.find(SUB))!.attempt_id).toBe(pending.attempt_id)
  })
})

describe('concurrency and stale workers', () => {
  test('two simultaneous first attempts: exactly one artifact row; the other is contended', async () => {
    const { table, deps } = setup()
    const [a, b] = await Promise.all([issueCreatorRecordArtifact(SUB, deps()), issueCreatorRecordArtifact(SUB, deps())])
    expect([a.outcome, b.outcome].sort()).toEqual(['contended', 'issued'])
    expect(table.rows.size).toBe(1)
  })

  test('two simultaneous pending-recovery attempts: exactly one takeover wins; the loser stores nothing', async () => {
    const { table, objects, deps } = setup()
    objects.failPutOnce = true
    await expect(issueCreatorRecordArtifact(SUB, deps())).rejects.toThrow('upload 503')
    const pending = (await table.find(SUB))!
    const putsBefore = objects.puts.length
    const events: string[] = []
    const [a, b] = await Promise.all([
      issueCreatorRecordArtifact(SUB, deps({ onEvent: (e) => events.push(e.event) })),
      issueCreatorRecordArtifact(SUB, deps({ onEvent: (e) => events.push(e.event) })),
    ])
    expect([a.outcome, b.outcome].sort()).toEqual(['contended', 'issued'])
    expect(events).toEqual(['takeover'])
    expect(objects.puts.length - putsBefore).toBe(1) // only the winner uploaded
    const issued = (await table.find(SUB))!
    expect(issued.attempt_id).not.toBe(pending.attempt_id)
    expect(objects.objects.has(issued.storage_path)).toBe(true)
  })

  test('a stale worker can neither overwrite the newer attempt nor mark its own attempt issued', async () => {
    const { table, objects, deps } = setup()
    // Worker A inserts its pending row, but its upload stalls.
    let releaseA: () => void = () => {}
    const stalled = new Promise<void>((r) => (releaseA = r))
    const slowObjects: ObjectStore = {
      get: (p) => objects.get(p),
      put: async (p, b) => {
        await stalled
        return objects.put(p, b)
      },
    }
    const aEvents: string[] = []
    const workerA = issueCreatorRecordArtifact(SUB, deps({ objects: slowObjects, onEvent: (e) => aEvents.push(e.event) }))
    await new Promise((r) => setTimeout(r, 0))
    const aRow = (await table.find(SUB))!
    // Worker B (the next claim holder) finds A's object missing, takes over and issues.
    const b = await issueCreatorRecordArtifact(SUB, deps())
    expect(b.outcome).toBe('issued')
    const issued = (await table.find(SUB))!
    expect(issued.attempt_id).not.toBe(aRow.attempt_id)
    const issuedBytes = objects.objects.get(issued.storage_path)
    // A wakes up: its write goes to its own path; it cannot claim success.
    releaseA()
    expect((await workerA).outcome).toBe('contended')
    expect(objects.objects.get(issued.storage_path)).toBe(issuedBytes)
    expect(await table.find(SUB)).toEqual(issued)
    // The late upload is contained: an orphan at A's superseded path, never referenced by the row, and logged.
    expect(objects.objects.has(aRow.storage_path)).toBe(true)
    expect(aRow.storage_path).not.toBe(issued.storage_path)
    expect(aEvents).toEqual(['stale_attempt_lost'])
  })

  test('a stale worker whose upload lands BEFORE the takeover is accepted only for its own attempt; a second worker then sees it issued', async () => {
    const { table, objects, deps } = setup()
    table.failMarkIssuedOnce = true // A uploaded, then lost its database write
    await expect(issueCreatorRecordArtifact(SUB, deps())).rejects.toThrow('network')
    const pending = (await table.find(SUB))!
    // B finds A's object present and matching: it issues A's attempt (no re-render, no takeover).
    const b = await issueCreatorRecordArtifact(SUB, deps())
    expect(b.outcome).toBe('issued')
    expect((await table.find(SUB))!.attempt_id).toBe(pending.attempt_id)
    expect((await issueCreatorRecordArtifact(SUB, deps())).outcome).toBe('already_issued')
  })
})

describe('immutability and integrity', () => {
  test('a stored object that differs from its record is never accepted or overwritten', async () => {
    const { table, objects, deps } = setup()
    table.failMarkIssuedOnce = true
    await expect(issueCreatorRecordArtifact(SUB, deps())).rejects.toThrow()
    const pending = (await table.find(SUB))!
    const tampered = new TextEncoder().encode('%PDF something else')
    objects.objects.set(pending.storage_path, tampered)
    const r = await issueCreatorRecordArtifact(SUB, deps())
    expect(r).toEqual({ outcome: 'integrity_conflict', artifactId: pending.id })
    expect((await table.find(SUB))!.status).toBe('pending')
    expect(objects.objects.get(pending.storage_path)).toBe(tampered)
  })

  test('an issued artifact is never re-rendered or replaced, whatever the caller', async () => {
    const { table, objects, deps, renders } = setup()
    await issueCreatorRecordArtifact(SUB, deps())
    const issued = (await table.find(SUB))!
    for (let i = 0; i < 3; i++) expect((await issueCreatorRecordArtifact(SUB, deps())).outcome).toBe('already_issued')
    expect(await table.takeOver(issued.id, issued.attempt_id, { attempt_id: 'x', storage_path: 'y', sha256: 'z', byte_size: 1 })).toBe(false)
    expect(await table.markIssued(issued.id, issued.attempt_id, issued.sha256)).toBe(false)
    expect(renders()).toBe(1)
    expect(objects.puts).toHaveLength(1)
  })
})
