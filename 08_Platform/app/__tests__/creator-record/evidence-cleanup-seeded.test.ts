/**
 * An operator-seeded synthetic document (E4 history) is never removed by the DOC-1 cleanup routine.
 */

describe('DOC-1 cleanup never removes an operator-seeded document', () => {
  test('when the database refuses removing a stale seeded pending row, cleanupEvidence removes neither the row nor its object, and reports the failure; owner uploads are cleaned as before', async () => {
    const { cleanupEvidence } = await import('@/lib/creator-record/evidence-intake/service')
    type Row = Awaited<ReturnType<Parameters<typeof cleanupEvidence>[0]['store']['pendingCreatedBefore']>>[number]
    const row = (id: string, user: string): Row => ({ id, user_id: user, sha256: 'a'.repeat(64), media_type: 'application/pdf', byte_size: 10, file_name: 'f.pdf', storage_path: `${user}/${id}`, consent_version: null, state: 'pending', created_at: '2026-11-01T00:00:00Z', stored_at: null, deleted_at: null, object_removed_at: null })
    const seeded = row('seeded-row', 'test-identity')
    const owner = { ...row('owner-row', 'creator'), consent_version: 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0' }
    const removedRows: string[] = []
    const removedObjects: string[] = []
    const store = {
      async pendingCreatedBefore() { return [seeded, owner] },
      async deletedWithObject() { return [] },
      // Emulates the database: a seeded row is never deleted by an application role.
      async removePending(id: string) { if (id === seeded.id) throw new Error('creator_record_evidence_store_remove_pending_P0001'); removedRows.push(id); return true },
      async markObjectRemoved() { throw new Error('unreachable') },
    }
    const objects = { async remove(path: string) { removedObjects.push(path) } }
    const logs: string[] = []
    const r = await cleanupEvidence({ store: store as never, objects: objects as never, now: () => new Date('2026-11-02T00:00:00Z'), log: (e: string) => logs.push(e) })
    expect(r).toEqual({ pending_removed: 1, objects_removed: 0, failures: 1 })
    expect(removedRows).toEqual([owner.id])
    expect(removedObjects).toEqual([owner.storage_path])
    expect(logs).toEqual(['creator_record_evidence_cleanup_failures'])
  })
})
