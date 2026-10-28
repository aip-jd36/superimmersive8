/**
 * CR-ARTIFACT-1 — legacy / private precedence (precedence.ts) and the
 * authenticated delivery contract (deliver.ts).
 */

import { creatorRecordPdfComplete, issuancePath, issueCreatorRecordPdf, ArtifactIntegrityError, EligibilityUnknownError, type PrecedencePorts } from '@/lib/creator-record-artifacts/precedence'
import { deliverCreatorRecordPdf, type DeliveryPorts } from '@/lib/creator-record-artifacts/deliver'
import { sha256Hex, type ArtifactRow } from '@/lib/creator-record-artifacts/issue'

const SUB = '3f2a9c10-1111-4222-8333-444455556666'

function ports(over: Partial<PrecedencePorts> = {}) {
  const calls = { issue: 0, legacy: 0 }
  const p: PrecedencePorts = {
    artifactStatus: async () => null,
    legacyHasPdf: async () => false,
    gate: async () => 'not_allowlisted' as const,
    issue: async () => {
      calls.issue++
      return { outcome: 'contended' }
    },
    legacyGenerate: async () => {
      calls.legacy++
    },
    ...over,
  }
  return { p, calls }
}

describe('precedence', () => {
  test('ordinary customer (no artifact, no legacy PDF, gate closed) → the existing legacy generator, never the private path', async () => {
    const { p, calls } = ports()
    expect(await issuancePath(SUB, p)).toBe('legacy')
    await issueCreatorRecordPdf(SUB, p)
    expect(calls).toEqual({ issue: 0, legacy: 1 })
  })

  test('allowlisted submission (gate open, nothing issued) → private path only', async () => {
    const { p, calls } = ports({ gate: async () => 'allowlisted' as const })
    await issueCreatorRecordPdf(SUB, p)
    expect(calls).toEqual({ issue: 1, legacy: 0 })
  })

  test('an existing legacy PDF wins: never issued again on either path, even if allowlisted later', async () => {
    const { p, calls } = ports({ legacyHasPdf: async () => true, gate: async () => 'allowlisted' as const })
    expect(await issuancePath(SUB, p)).toBe('legacy_complete')
    await issueCreatorRecordPdf(SUB, p)
    expect(calls).toEqual({ issue: 0, legacy: 0 })
    expect(await creatorRecordPdfComplete(SUB, p)).toBe(true)
  })

  test('a pending artifact is always resumed on the private path, even if the gate is closed', async () => {
    const { p, calls } = ports({ artifactStatus: async () => 'pending' })
    await issueCreatorRecordPdf(SUB, p)
    expect(calls).toEqual({ issue: 1, legacy: 0 })
  })

  test('completion: an artifact row decides (pending = incomplete) — a legacy URL never proves a private artifact', async () => {
    expect(await creatorRecordPdfComplete(SUB, ports({ artifactStatus: async () => 'pending', legacyHasPdf: async () => true }).p)).toBe(false)
    expect(await creatorRecordPdfComplete(SUB, ports({ artifactStatus: async () => 'issued' }).p)).toBe(true)
    expect(await creatorRecordPdfComplete(SUB, ports().p)).toBe(false)
  })

  test('an integrity conflict fails the step (left incomplete for retry / manual queue)', async () => {
    const { p } = ports({ gate: async () => 'allowlisted' as const, issue: async () => ({ outcome: 'integrity_conflict', artifactId: 'a1' }) })
    await expect(issueCreatorRecordPdf(SUB, p)).rejects.toBeInstanceOf(ArtifactIntegrityError)
  })
})

describe('CR-ARTIFACT-1C — fail-closed eligibility', () => {
  test('unknown eligibility: no private issuance and NO fallback to public legacy issuance — the step fails (retried)', async () => {
    const { p, calls } = ports({ gate: async () => 'unknown' as const })
    await expect(issuancePath(SUB, p)).rejects.toBeInstanceOf(EligibilityUnknownError)
    await expect(issueCreatorRecordPdf(SUB, p)).rejects.toBeInstanceOf(EligibilityUnknownError)
    expect(calls).toEqual({ issue: 0, legacy: 0 })
  })

  test('an unreadable artifact state is thrown, never read as "no artifact" (no legacy issuance)', async () => {
    const { p, calls } = ports({ artifactStatus: async () => { throw new Error('creator_record_artifact_status_failed:PGRST205') } })
    await expect(issueCreatorRecordPdf(SUB, p)).rejects.toThrow('PGRST205')
    await expect(creatorRecordPdfComplete(SUB, p)).rejects.toThrow('PGRST205')
    expect(calls).toEqual({ issue: 0, legacy: 0 })
  })

  test('the gate is consulted only when there is neither an artifact nor a legacy PDF', async () => {
    let asked = 0
    const gate = async () => ((asked++), 'unknown' as const)
    await issueCreatorRecordPdf(SUB, ports({ artifactStatus: async () => 'issued', gate }).p)
    await issueCreatorRecordPdf(SUB, ports({ legacyHasPdf: async () => true, gate }).p)
    expect(asked).toBe(0)
  })
})

describe('CR-ARTIFACT-1C — issuance-preserving rollback (mode "off" ⇒ gate never allowlists)', () => {
  const off = { gate: async () => 'not_allowlisted' as const }
  test('an issued artifact stays complete; nothing is regenerated on either path', async () => {
    const { p, calls } = ports({ ...off, artifactStatus: async () => 'issued' })
    expect(await creatorRecordPdfComplete(SUB, p)).toBe(true)
    await issueCreatorRecordPdf(SUB, p)
    expect(calls).toEqual({ issue: 1, legacy: 0 }) // resumed → 'already_issued' inside the procedure; never legacy
  })
  test('a pending artifact is resumed privately, never re-issued publicly', async () => {
    const { p, calls } = ports({ ...off, artifactStatus: async () => 'pending' })
    await issueCreatorRecordPdf(SUB, p)
    expect(calls).toEqual({ issue: 1, legacy: 0 })
  })
  test('a new submission (no artifact) takes the legacy path', async () => {
    const { p, calls } = ports(off)
    await issueCreatorRecordPdf(SUB, p)
    expect(calls).toEqual({ issue: 0, legacy: 1 })
  })
})

// ───────────────────────────────────────────── delivery

const BYTES = new TextEncoder().encode('%PDF-1.4 test')
const ISSUED: ArtifactRow = {
  id: 'a1', submission_id: SUB, record_id: 'CR-2026-3F2A9C10', attempt_id: 'att', storage_path: `${SUB}/att.pdf`,
  sha256: sha256Hex(BYTES), byte_size: BYTES.byteLength, generator_version: 'legacy-creator-record-pdf-v1', status: 'issued', uat: true, issued_at: '2026-10-28T00:00:00Z',
}

function delivery(over: Partial<DeliveryPorts> = {}) {
  const logs: unknown[] = []
  const p: DeliveryPorts = {
    currentUserId: async () => 'owner',
    submissionOwner: async () => 'owner',
    isAdmin: async () => false,
    findArtifact: async () => ISSUED,
    getObject: async () => BYTES,
    legacyUrl: async () => null,
    log: (e) => logs.push(e),
    ...over,
  }
  return { p, logs }
}

describe('delivery contract', () => {
  test('anonymous → 401', async () => {
    const r = await deliverCreatorRecordPdf(SUB, delivery({ currentUserId: async () => null }).p)
    expect(r.status).toBe(401)
  })

  test('owner, issued → 200 PDF, bytes verified, private no-store, attachment named by record id', async () => {
    const r = await deliverCreatorRecordPdf(SUB, delivery().p)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('application/pdf')
    expect(r.headers.get('cache-control')).toBe('private, no-store, max-age=0')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(r.headers.get('content-disposition')).toBe('attachment; filename="CR-2026-3F2A9C10.pdf"')
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(BYTES)
  })

  test('admin, issued → 200; another signed-in user → 404, identical to a missing submission', async () => {
    expect((await deliverCreatorRecordPdf(SUB, delivery({ currentUserId: async () => 'admin', isAdmin: async () => true }).p)).status).toBe(200)
    const other = await deliverCreatorRecordPdf(SUB, delivery({ currentUserId: async () => 'someone' }).p)
    const missing = await deliverCreatorRecordPdf(SUB, delivery({ submissionOwner: async () => null }).p)
    expect([other.status, missing.status]).toEqual([404, 404])
    expect(await other.text()).toBe(await missing.text())
  })

  test('a malformed id → 404 without any lookup', async () => {
    let looked = false
    const r = await deliverCreatorRecordPdf('../../etc', delivery({ submissionOwner: async () => ((looked = true), 'owner') }).p)
    expect([r.status, looked]).toEqual([404, false])
  })

  test('pending → 409 processing; integrity mismatch → 500 with no bytes', async () => {
    expect((await deliverCreatorRecordPdf(SUB, delivery({ findArtifact: async () => ({ ...ISSUED, status: 'pending', issued_at: null }) }).p)).status).toBe(409)
    const bad = await deliverCreatorRecordPdf(SUB, delivery({ getObject: async () => new TextEncoder().encode('tampered') }).p)
    expect(bad.status).toBe(500)
    expect(bad.headers.get('content-type')).toBe('application/json')
  })

  test('legacy record (no artifact) → 302 to the existing legacy URL for its owner only', async () => {
    const legacy = 'https://example.supabase.co/storage/v1/object/public/documents/rights-packages/x.pdf'
    const r = await deliverCreatorRecordPdf(SUB, delivery({ findArtifact: async () => null, legacyUrl: async () => legacy }).p)
    expect([r.status, r.headers.get('location')]).toEqual([302, legacy])
    const other = await deliverCreatorRecordPdf(SUB, delivery({ currentUserId: async () => 'someone', findArtifact: async () => null, legacyUrl: async () => legacy }).p)
    expect(other.status).toBe(404)
  })

  test('CR-ARTIFACT-1C: any lookup failure → 500 with no detail; never a downgrade to the legacy URL', async () => {
    const legacy = 'https://example.supabase.co/storage/v1/object/public/documents/rights-packages/x.pdf'
    const r = await deliverCreatorRecordPdf(SUB, delivery({ findArtifact: async () => { throw new Error('PGRST205') }, legacyUrl: async () => legacy }).p)
    expect(r.status).toBe(500)
    expect(r.headers.get('location')).toBeNull()
    expect(await r.text()).not.toMatch(/PGRST|http/)
  })

  test('logs carry only outcome and role — never a path, URL, id or bytes', async () => {
    const { p, logs } = delivery()
    await deliverCreatorRecordPdf(SUB, p)
    expect(logs).toEqual([{ outcome: 'delivered', role: 'owner' }])
    expect(JSON.stringify(logs)).not.toMatch(/pdf|http|CR-|3f2a/i)
  })
})
