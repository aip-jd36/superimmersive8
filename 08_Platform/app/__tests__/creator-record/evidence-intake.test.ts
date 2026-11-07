/**
 * CR-V2-DOC-1 — evidence intake: byte validation, references, and the intake service (fakes).
 *
 * Covers: format sniffing and hostile-document refusals; size limits; file names; strict references; the
 * stop, invite, consent and synthetic-only gates; deduplication (sequential and concurrent); failed-write
 * cleanup; owner/admin reads (logged before content, re-hashed); cross-user denial; deletion of unreferenced
 * documents only; abandoned-upload and deleted-object cleanup; the per-creator cap.
 */
import { createHash } from 'crypto'
import {
  EVIDENCE_CONSENT_DRAFT_VERSION, EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED, EVIDENCE_MAX_LIVE_PER_CREATOR, EVIDENCE_PENDING_STALE_MS,
  imageDimensions, parseEvidenceReferences, sanitizeEvidenceFileName, validateEvidenceBytes,
} from '@/lib/creator-record/evidence-intake/contract'
import {
  verifyEvidenceIntact, cleanupEvidence, deleteEvidence, listEvidence, readEvidenceFile, resolveEvidenceReferences, uploadEvidence,
  type EvidenceDeps, type EvidenceObjects, type EvidenceRow, type EvidenceStore,
} from '@/lib/creator-record/evidence-intake/service'
import { EVIDENCE_MAX_BYTES, EVIDENCE_MAX_PER_RECORD, EVIDENCE_MAX_PER_TOOL } from '@/lib/creator-record/evidence-intake/vocabulary'

// ── Synthetic test files ──
const enc = (s: string) => new TextEncoder().encode(s)
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}
export const pdf = (body = '1 0 obj << /Type /Catalog >> endobj') => enc(`%PDF-1.4\n${body}\ntrailer << /Root 1 0 R >>\n%%EOF\n`)
const be32 = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])
export const png = (w = 100, h = 50) => cat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), be32(13), enc('IHDR'), be32(w), be32(h), new Uint8Array([8, 2, 0, 0, 0, 0, 0, 0, 0]))
export const jpeg = (w = 640, h = 480) => new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x11, 0x08, (h >> 8) & 255, h & 255, (w >> 8) & 255, w & 255, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
])
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')

describe('byte validation', () => {
  test('PDF, PNG and JPEG are identified from their bytes and fingerprinted', () => {
    for (const [b, type] of [[pdf(), 'application/pdf'], [png(), 'image/png'], [jpeg(), 'image/jpeg']] as const) {
      expect(validateEvidenceBytes(b)).toEqual({ ok: true, media_type: type, byte_size: b.length, sha256: sha(b) })
    }
    expect(imageDimensions(png(321, 123), 'image/png')).toEqual({ width: 321, height: 123 })
    expect(imageDimensions(jpeg(800, 600), 'image/jpeg')).toEqual({ width: 800, height: 600 })
  })

  test.each([
    ['an empty file', new Uint8Array(), 'empty_file'],
    ['a file over 1 MiB', cat(pdf(), new Uint8Array(EVIDENCE_MAX_BYTES)), 'file_too_large'],
    ['a Word or zip file', cat(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), enc('word/document.xml')), 'unsupported_format'],
    ['HTML that names itself a PDF', enc('<html><script>alert(1)</script></html>'), 'unsupported_format'],
    ['a PDF without an end marker', enc('%PDF-1.4\n1 0 obj << >> endobj\n'), 'pdf_malformed'],
    ['an encrypted PDF', pdf('1 0 obj << /Encrypt 2 0 R >> endobj'), 'pdf_encrypted'],
    ['a PDF with JavaScript', pdf('1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >> endobj'), 'pdf_active_content'],
    ['a PDF with a hex-escaped JavaScript name', pdf('1 0 obj << /S /J#61vaScript >> endobj'), 'pdf_active_content'],
    ['a PDF that launches a program', pdf('1 0 obj << /S /Launch /F (cmd.exe) >> endobj'), 'pdf_active_content'],
    ['a PDF with an embedded file', pdf('1 0 obj << /Type /EmbeddedFile >> endobj'), 'pdf_active_content'],
    ['a PNG without a header', cat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), enc('junk')), 'image_header_invalid'],
    ['a decompression-bomb PNG', png(50_000, 50_000), 'image_too_large'],
    ['a JPEG with no frame header', new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 'image_header_invalid'],
  ])('%s is refused (%s)', (_, bytes, code) => {
    expect(validateEvidenceBytes(bytes)).toEqual({ ok: false, code })
  })

  test('an ordinary /OpenAction that only sets the opening view is accepted', () => {
    expect(validateEvidenceBytes(pdf('1 0 obj << /OpenAction [3 0 R /Fit] >> endobj')).ok).toBe(true)
  })

  test('file names are display text only: no path, no control or bidi characters, at most 120 characters', () => {
    expect(sanitizeEvidenceFileName('..\\..\\etc/passwd')).toBe('passwd')
    expect(sanitizeEvidenceFileName('in\u0000voice‮.pdf')).toBe('invoice.pdf')
    expect(sanitizeEvidenceFileName('   ')).toBe('document')
    expect(sanitizeEvidenceFileName(undefined)).toBe('document')
    expect(Array.from(sanitizeEvidenceFileName('x'.repeat(500))).length).toBe(120)
  })

  test('the code lock is on: real documents are not accepted in this build', () => {
    expect(EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED).toBe(false)
    expect(EVIDENCE_CONSENT_DRAFT_VERSION).toMatch(/^DRAFT-UNAPPROVED-/)
  })
})

describe('document references', () => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const ref = (n: number, tool_index: number | null = 0, category = 'billing_receipt') => ({ document_id: id(n), category, tool_index })

  test('valid references parse in order', () => {
    expect(parseEvidenceReferences([ref(1, 0), ref(2, null, 'project_file')], 1)).toEqual([ref(1, 0), ref(2, null, 'project_file')])
    expect(parseEvidenceReferences(undefined, 0)).toEqual([])
  })

  test.each([
    ['an unknown category', [ref(1, 0, 'verified_licence')]],
    ['an extra key', [{ ...ref(1), sha256: 'a'.repeat(64) }]],
    ['a missing key', [{ document_id: id(1), category: 'licence' }]],
    ['a duplicate document', [ref(1), ref(1)]],
    ['a tool index out of range', [ref(1, 3)]],
    ['a non-uuid id', [{ ...ref(1), document_id: '../x' }]],
    [`more than ${EVIDENCE_MAX_PER_TOOL} per tool`, [ref(1, 0), ref(2, 0), ref(3, 0)]],
    [`more than ${EVIDENCE_MAX_PER_RECORD} per record`, Array.from({ length: EVIDENCE_MAX_PER_RECORD + 1 }, (_, i) => ref(i + 1, null))],
    ['not an array', { 0: ref(1) }],
  ])('%s is refused', (_, v) => {
    expect(parseEvidenceReferences(v, 2)).toBeNull()
  })
})

// ── An in-memory store with the database's rules (one live row per creator and SHA-256, legal transitions) ──
function fakeStore(referenced = new Set<string>()) {
  const rows = new Map<string, EvidenceRow>()
  const access: { document_id: string; actor: string; role: string }[] = []
  let failLog = false
  const store: EvidenceStore & { rows: typeof rows; access: typeof access; failLog(v: boolean): void } = {
    rows, access,
    failLog: (v) => { failLog = v },
    async insertPending(row) {
      const live = Array.from(rows.values()).find((r) => r.user_id === row.user_id && r.sha256 === row.sha256 && r.state !== 'deleted')
      if (live) return { inserted: false, existing: live }
      // The database's per-creator cap, applied atomically at insert (migration trigger).
      if (Array.from(rows.values()).filter((r) => r.user_id === row.user_id && r.state !== 'deleted').length >= EVIDENCE_MAX_LIVE_PER_CREATOR) return { inserted: false, existing: null, quota_exceeded: true }
      const r: EvidenceRow = { ...row, state: 'pending', created_at: new Date().toISOString(), stored_at: null, deleted_at: null, object_removed_at: null }
      rows.set(r.id, r)
      return { inserted: true, row: r }
    },
    async markStored(id, userId, at) {
      const r = rows.get(id)
      if (!r || r.user_id !== userId || r.state !== 'pending') return null
      r.state = 'stored'
      r.stored_at = at.toISOString()
      return { ...r }
    },
    async removePending(id) {
      const r = rows.get(id)
      if (!r || r.state !== 'pending') return false
      rows.delete(id)
      return true
    },
    async get(id) {
      const r = rows.get(id)
      return r ? { ...r } : null
    },
    async listStored(userId) {
      return Array.from(rows.values()).filter((r) => r.user_id === userId && r.state === 'stored').map((r) => ({ ...r }))
    },
    async countLive(userId) {
      return Array.from(rows.values()).filter((r) => r.user_id === userId && r.state !== 'deleted').length
    },
    async markDeleted(id, userId, at) {
      const r = rows.get(id)
      if (!r || r.user_id !== userId || r.state !== 'stored') return 'not_stored'
      if (referenced.has(id)) return 'referenced'
      r.state = 'deleted'
      r.deleted_at = at.toISOString()
      return 'deleted'
    },
    async markObjectRemoved(id, at) {
      const r = rows.get(id)
      if (r && r.state === 'deleted' && !r.object_removed_at) r.object_removed_at = at.toISOString()
    },
    async pendingCreatedBefore(before) {
      return Array.from(rows.values()).filter((r) => r.state === 'pending' && new Date(r.created_at) < before)
    },
    async deletedWithObject() {
      return Array.from(rows.values()).filter((r) => r.state === 'deleted' && !r.object_removed_at)
    },
    async logAccess(document_id, actor, role) {
      if (failLog) throw new Error('log down')
      access.push({ document_id, actor, role })
    },
  }
  return store
}

function fakeObjects() {
  const objects = new Map<string, Uint8Array>()
  let putGate: Promise<void> | null = null
  let failPut = false
  let failRemove = false
  const o: EvidenceObjects & { objects: typeof objects; holdPuts(p: Promise<void> | null): void; failPut(v: boolean): void; failRemove(v: boolean): void } = {
    objects,
    holdPuts: (p) => { putGate = p },
    failPut: (v) => { failPut = v },
    failRemove: (v) => { failRemove = v },
    async put(path, bytes) {
      if (putGate) await putGate
      if (failPut) throw new Error('storage down')
      if (objects.has(path)) throw new Error('exists')
      objects.set(path, bytes)
    },
    async get(path) {
      return objects.get(path) ?? null
    },
    async remove(path) {
      if (failRemove) throw new Error('storage down')
      objects.delete(path)
    },
  }
  return o
}

const USER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
let seq = 0
function deps(over: Partial<EvidenceDeps> = {}, store = fakeStore(), objects = fakeObjects()) {
  const d: EvidenceDeps & { store: ReturnType<typeof fakeStore>; objects: ReturnType<typeof fakeObjects> } = {
    submissions: 'open',
    hasPilotAccess: async () => true,
    realDocumentsPermitted: false,
    isSyntheticTestDocument: () => true,
    store,
    objects,
    newId: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
    now: () => new Date(),
    log: () => undefined,
    ...(over as object),
  } as never
  return d
}
const upload = (d: EvidenceDeps, bytes: Uint8Array = pdf(), user = USER, consent: unknown = EVIDENCE_CONSENT_DRAFT_VERSION) => uploadEvidence(d, user, { bytes, file_name: 'receipt.pdf', consent })

describe('intake gates', () => {
  test('the stop refuses every write and listing before anything else', async () => {
    const d = deps({ submissions: 'stopped', hasPilotAccess: jest.fn(async () => true) })
    expect(await upload(d)).toMatchObject({ status: 503, code: 'submissions_stopped' })
    expect(await listEvidence(d, USER)).toMatchObject({ status: 503, code: 'submissions_stopped' })
    expect(await deleteEvidence(d, USER, '00000000-0000-4000-8000-000000000001')).toMatchObject({ status: 503, code: 'submissions_stopped' })
    expect(d.hasPilotAccess).not.toHaveBeenCalled()
    expect(d.store.rows.size + d.objects.objects.size).toBe(0)
  })

  test('an uninvited creator is refused', async () => {
    expect(await upload(deps({ hasPilotAccess: async () => false }))).toMatchObject({ status: 403, code: 'not_invited' })
  })

  test('consent must be given (the draft identifier) and is recorded on the document', async () => {
    const d = deps()
    for (const c of [undefined, null, '', 'yes', 'DRAFT-UNAPPROVED-other']) expect(await uploadEvidence(d, USER, { bytes: pdf(), file_name: 'receipt.pdf', consent: c })).toMatchObject({ status: 400, code: 'consent_required' })
    const r = await upload(d)
    expect(r.ok).toBe(true)
    expect(Array.from(d.store.rows.values())[0].consent_version).toBe(EVIDENCE_CONSENT_DRAFT_VERSION)
  })

  test('while real documents are not permitted, only SI8 synthetic test documents are stored', async () => {
    const synthetic = pdf('1 0 obj << /Title (SYNTHETIC) >> endobj')
    const d = deps({ isSyntheticTestDocument: (s) => s === sha(synthetic) })
    expect(await upload(d, pdf())).toMatchObject({ status: 403, code: 'synthetic_documents_only' })
    expect((await upload(d, synthetic)).ok).toBe(true)
    expect(d.store.rows.size).toBe(1)
  })

  test('an invalid file is refused before anything is written', async () => {
    const d = deps()
    expect(await upload(d, enc('not a document'))).toMatchObject({ status: 400, code: 'unsupported_format' })
    expect(d.store.rows.size + d.objects.objects.size).toBe(0)
  })

  test('the per-creator cap refuses new documents but still answers a re-upload of one already held', async () => {
    const d = deps()
    const first = await upload(d, png(1, 1))
    for (let i = 2; i <= EVIDENCE_MAX_LIVE_PER_CREATOR; i += 1) expect((await upload(d, png(i, 1))).ok).toBe(true)
    expect(await upload(d, png(999, 1))).toMatchObject({ status: 409, code: 'too_many_documents' })
    expect(await upload(d, png(1, 1))).toEqual({ ok: true, document: (first as { document: unknown }).document, deduplicated: true })
  })
})

describe('storage, deduplication and cleanup', () => {
  test('a stored document is private to its path, fingerprinted and listed for its owner only', async () => {
    const d = deps()
    const r = await upload(d)
    if (!r.ok) throw new Error('upload')
    const row = d.store.rows.get(r.document.id)!
    expect(row).toMatchObject({ state: 'stored', user_id: USER, sha256: sha(pdf()), storage_path: `${USER}/${r.document.id}`, file_name: 'receipt.pdf' })
    expect(d.objects.objects.get(row.storage_path)).toEqual(pdf())
    expect((await listEvidence(d, USER) as { documents: unknown[] }).documents).toHaveLength(1)
    expect((await listEvidence(d, OTHER) as { documents: unknown[] }).documents).toHaveLength(0)
  })

  test('the same bytes from the same creator are one document; another creator gets their own', async () => {
    const d = deps()
    const a = await upload(d)
    const b = await upload(d)
    const c = await upload(d, pdf(), OTHER)
    if (!a.ok || !b.ok || !c.ok) throw new Error('upload')
    expect(b).toEqual({ ok: true, document: a.document, deduplicated: true })
    expect(c.document.id).not.toBe(a.document.id)
    expect(d.objects.objects.size).toBe(2)
  })

  test('concurrent uploads of the same bytes converge on one stored object', async () => {
    const d = deps()
    let release!: () => void
    d.objects.holdPuts(new Promise<void>((r) => { release = r }))
    const racing = Promise.all([upload(d), upload(d), upload(d)])
    await new Promise((r) => setTimeout(r, 0))
    release()
    const results = await racing
    const stored = results.filter((r) => r.ok && !r.deduplicated)
    const inProgress = results.filter((r) => !r.ok && r.code === 'upload_in_progress')
    expect(stored).toHaveLength(1)
    expect(inProgress).toHaveLength(2)
    expect(d.objects.objects.size).toBe(1)
    expect(Array.from(d.store.rows.values()).map((r) => r.state)).toEqual(['stored'])
    expect(await upload(d)).toMatchObject({ ok: true, deduplicated: true })
  })

  test('a failed object write leaves no row and no object', async () => {
    const d = deps()
    d.objects.failPut(true)
    expect(await upload(d)).toMatchObject({ status: 500, code: 'storage_failed' })
    expect(d.store.rows.size + d.objects.objects.size).toBe(0)
  })

  test('cleanup removes abandoned pending uploads with their object, and objects of deleted documents', async () => {
    const d = deps()
    await d.store.insertPending({ id: 'p1', user_id: USER, sha256: 'a'.repeat(64), media_type: 'application/pdf', byte_size: 1, file_name: 'x', storage_path: `${USER}/p1`, consent_version: 'c' })
    d.store.rows.get('p1')!.created_at = new Date(Date.now() - EVIDENCE_PENDING_STALE_MS - 1000).toISOString()
    d.objects.objects.set(`${USER}/p1`, pdf())
    const fresh = await upload(d)
    const gone = await upload(d, png())
    if (!fresh.ok || !gone.ok) throw new Error('upload')
    d.objects.failRemove(true)
    expect(await deleteEvidence(d, USER, gone.document.id)).toEqual({ ok: true }) // row deleted; object removal deferred
    d.objects.failRemove(false)
    expect(await cleanupEvidence(d)).toEqual({ pending_removed: 1, objects_removed: 1, failures: 0 })
    expect(d.store.rows.has('p1')).toBe(false)
    expect(d.objects.objects.has(`${USER}/p1`)).toBe(false)
    expect(d.store.rows.get(gone.document.id)).toMatchObject({ state: 'deleted' })
    expect(d.store.rows.get(gone.document.id)!.object_removed_at).not.toBeNull()
    expect(d.store.rows.get(fresh.document.id)!.state).toBe('stored') // a recent upload is never touched
  })
})

describe('reads and deletion', () => {
  async function stored(d: ReturnType<typeof deps>, bytes = pdf()) {
    const r = await upload(d, bytes)
    if (!r.ok) throw new Error('upload')
    return r.document.id
  }

  test('the owner and an admin can read; every read is logged before any content', async () => {
    const d = deps()
    const id = await stored(d)
    expect(await readEvidenceFile(d, { userId: USER, isAdmin: false }, id)).toEqual({ ok: true, bytes: pdf(), media_type: 'application/pdf', file_name: 'receipt.pdf' })
    expect((await readEvidenceFile(d, { userId: OTHER, isAdmin: true }, id)).ok).toBe(true)
    expect(d.store.access).toEqual([{ document_id: id, actor: USER, role: 'owner' }, { document_id: id, actor: OTHER, role: 'admin' }])
  })

  test('another creator gets the same answer as for a missing document, and nothing is logged', async () => {
    const d = deps()
    const id = await stored(d)
    expect(await readEvidenceFile(d, { userId: OTHER, isAdmin: false }, id)).toMatchObject({ status: 404, code: 'not_found' })
    expect(await readEvidenceFile(d, { userId: OTHER, isAdmin: false }, '00000000-0000-4000-8000-0000000fffff')).toMatchObject({ status: 404, code: 'not_found' })
    expect(await readEvidenceFile(d, { userId: USER, isAdmin: false }, '../x')).toMatchObject({ status: 404, code: 'not_found' })
    expect(d.store.access).toEqual([])
  })

  test('no log, no content; a missing object and altered bytes fail closed', async () => {
    const d = deps()
    const id = await stored(d)
    d.store.failLog(true)
    expect(await readEvidenceFile(d, { userId: USER, isAdmin: false }, id)).toMatchObject({ status: 503, code: 'audit_unavailable' })
    d.store.failLog(false)
    const path = d.store.rows.get(id)!.storage_path
    d.objects.objects.set(path, pdf('1 0 obj << /Tampered true >> endobj'))
    expect(await readEvidenceFile(d, { userId: USER, isAdmin: false }, id)).toMatchObject({ status: 500, code: 'integrity_failure' })
    d.objects.objects.delete(path)
    expect(await readEvidenceFile(d, { userId: USER, isAdmin: false }, id)).toMatchObject({ status: 410, code: 'object_missing' })
  })

  test('an unreferenced document can be deleted by its owner; a referenced one is retained', async () => {
    const referenced = new Set<string>()
    const d = deps({}, fakeStore(referenced))
    const free = await stored(d)
    const kept = await stored(d, png())
    referenced.add(kept)
    expect(await deleteEvidence(d, OTHER, free)).toMatchObject({ status: 404, code: 'not_found' })
    expect(await deleteEvidence(d, USER, free)).toEqual({ ok: true })
    expect(d.objects.objects.has(`${USER}/${free}`)).toBe(false)
    expect(await deleteEvidence(d, USER, kept)).toMatchObject({ status: 409, code: 'document_retained' })
    expect(d.objects.objects.has(`${USER}/${kept}`)).toBe(true)
    expect(await deleteEvidence(d, USER, free)).toMatchObject({ status: 404, code: 'not_found' }) // already deleted
    expect(await readEvidenceFile(d, { userId: USER, isAdmin: false }, free)).toMatchObject({ status: 404, code: 'not_found' })
  })

  test('references resolve only to the same creator\'s stored documents', async () => {
    const d = deps()
    const mine = await stored(d)
    const theirs = (await upload(d, png(), OTHER) as { document: { id: string } }).document.id
    const ok = await resolveEvidenceReferences(d.store, USER, [{ document_id: mine, category: 'licence', tool_index: 0 }])
    expect(ok).toEqual({ ok: true, documents: [{ document_id: mine, sha256: sha(pdf()), media_type: 'application/pdf', byte_size: pdf().length, file_name: 'receipt.pdf', category: 'licence', tool_index: 0 }] })
    expect(await resolveEvidenceReferences(d.store, USER, [{ document_id: theirs, category: 'licence', tool_index: null }])).toEqual({ ok: false })
    expect(await resolveEvidenceReferences(d.store, USER, [{ document_id: '00000000-0000-4000-8000-0000000eeeee', category: 'other', tool_index: null }])).toEqual({ ok: false })
    await deleteEvidence(d, USER, mine)
    expect(await resolveEvidenceReferences(d.store, USER, [{ document_id: mine, category: 'licence', tool_index: 0 }])).toEqual({ ok: false })
  })
})

describe('DOC-1 boundary: no examination, model, retrieval or interpretation code', () => {
  test('evidence-intake modules import only each other and node:crypto', () => {
    const { readdirSync, readFileSync } = jest.requireActual<typeof import('fs')>('fs')
    const path = jest.requireActual<typeof import('path')>('path')
    const dir = path.join(__dirname, '..', '..', 'lib', 'creator-record', 'evidence-intake')
    const imports = readdirSync(dir).flatMap((f: string) => Array.from(readFileSync(path.join(dir, f), 'utf8').matchAll(/^import\b[^;]*?\sfrom\s+'([^']+)'/gm)).map((m) => (m as RegExpMatchArray)[1]))
    // CR-V2-MVP-RETENTION-M1A: ./retention reuses ./service's cleanup (still only each other).
    expect(Array.from(new Set(imports)).sort()).toEqual(['./contract', './service', './vocabulary', 'node:crypto'])
  })
})

describe('CR-V2-DOC-1B corrections', () => {
  test('concurrent uploads of different files cannot exceed the per-creator cap (the database is authoritative)', async () => {
    const d = deps({ store: (() => { const st = fakeStore(); st.countLive = async () => 0; return st })() }) // the service pre-check sees nothing
    const results = await Promise.all(Array.from({ length: EVIDENCE_MAX_LIVE_PER_CREATOR + 6 }, (_, i) => upload(d, png(i + 1, 1))))
    expect(results.filter((r) => r.ok)).toHaveLength(EVIDENCE_MAX_LIVE_PER_CREATOR)
    expect(results.filter((r) => !r.ok && r.code === 'too_many_documents')).toHaveLength(6)
    expect(d.objects.objects.size).toBe(EVIDENCE_MAX_LIVE_PER_CREATOR)
  })

  test('cleanup never strands a stored document: an upload completing during cleanup keeps its row and bytes', async () => {
    const d = deps()
    let release!: () => void
    d.objects.holdPuts(new Promise<void>((r) => { release = r }))
    const pending = upload(d)
    await new Promise((r) => setTimeout(r, 0))
    const row = Array.from(d.store.rows.values())[0]
    row.created_at = new Date(Date.now() - EVIDENCE_PENDING_STALE_MS - 1000).toISOString()
    // Cleanup wins the row first: the upload then fails its own pending → stored step and removes its object.
    expect(await cleanupEvidence(d)).toMatchObject({ pending_removed: 1 })
    release()
    expect(await pending).toMatchObject({ ok: false, code: 'storage_failed' })
    expect(d.store.rows.size + d.objects.objects.size).toBe(0)

    // The opposite order: the upload completes first; cleanup then finds nothing pending and removes nothing.
    const done = await upload(d, png())
    if (!done.ok) throw new Error('upload')
    expect(await cleanupEvidence(d)).toEqual({ pending_removed: 0, objects_removed: 0, failures: 0 })
    expect(d.objects.objects.size).toBe(1)
  })

  test('cleanup never strands a stored document under the worst interleaving (upload marks stored while cleanup is mid-way)', async () => {
    const d = deps()
    const gate = () => { let open!: () => void; const p = new Promise<void>((r) => { open = r }); return { p, open } }
    const g1 = gate() // holds the upload's pending → stored step
    const g2 = gate() // holds cleanup's row removal
    const markStored = d.store.markStored.bind(d.store)
    const removePending = d.store.removePending.bind(d.store)
    d.store.markStored = async (...a) => { await g1.p; return markStored(...a) }
    d.store.removePending = async (id) => { await g2.p; return removePending(id) }
    const uploading = upload(d)
    await new Promise((r) => setTimeout(r, 0)) // object written; waiting at pending → stored
    const row = Array.from(d.store.rows.values())[0]
    row.created_at = new Date(Date.now() - EVIDENCE_PENDING_STALE_MS - 1000).toISOString()
    const cleaning = cleanupEvidence(d)
    await new Promise((r) => setTimeout(r, 0))
    g1.open() // the upload completes: its row is stored
    expect(await uploading).toMatchObject({ ok: true, deduplicated: false })
    g2.open() // cleanup now finds the row no longer pending
    await cleaning
    expect(d.store.rows.get(row.id)!.state).toBe('stored')
    expect(d.objects.objects.has(row.storage_path)).toBe(true) // bytes kept
  })

  test('verifyEvidenceIntact: stored, same owner and fingerprint, bytes present and unaltered; anything else fails closed', async () => {
    const d = deps()
    const r = await upload(d)
    if (!r.ok) throw new Error('upload')
    const item = { document_id: r.document.id, sha256: r.document.sha256, byte_size: r.document.byte_size }
    const ports = { store: d.store, objects: d.objects }
    expect(await verifyEvidenceIntact(ports, USER, [item])).toEqual({ ok: true })
    expect(await verifyEvidenceIntact(ports, OTHER, [item])).toEqual({ ok: false, reason: 'not_stored' })
    expect(await verifyEvidenceIntact(ports, USER, [{ ...item, sha256: 'f'.repeat(64) }])).toEqual({ ok: false, reason: 'fingerprint_mismatch' })
    const path = d.store.rows.get(r.document.id)!.storage_path
    const original = d.objects.objects.get(path)!
    d.objects.objects.set(path, png()) // replaced by another object
    expect(await verifyEvidenceIntact(ports, USER, [item])).toEqual({ ok: false, reason: 'object_altered' })
    d.objects.objects.delete(path)
    expect(await verifyEvidenceIntact(ports, USER, [item])).toEqual({ ok: false, reason: 'object_missing' })
    d.objects.objects.set(path, original)
    expect(await verifyEvidenceIntact({ store: d.store, objects: { get: async () => { throw new Error('storage down') } } }, USER, [item])).toEqual({ ok: false, reason: 'unavailable' })
    await deleteEvidence(d, USER, r.document.id)
    expect(await verifyEvidenceIntact(ports, USER, [item])).toEqual({ ok: false, reason: 'not_stored' })
  })
})

describe('CR-V2-DOC-1B: no storage policy can reach the evidence bucket', () => {
  test('every storage.objects policy in every migration is scoped to a named bucket, and none to creator-record-evidence', () => {
    const { readdirSync, readFileSync } = jest.requireActual<typeof import('fs')>('fs')
    const path = jest.requireActual<typeof import('path')>('path')
    const dirs = [path.join(__dirname, '..', '..', 'supabase', 'migrations'), path.join(__dirname, '..', '..', '..', 'supabase', 'migrations')]
    const policies = dirs.flatMap((dir) => readdirSync(dir).filter((f: string) => f.endsWith('.sql')).flatMap((f: string) =>
      Array.from(readFileSync(path.join(dir, f), 'utf8').matchAll(/CREATE POLICY[\s\S]*?;/g)).map((m) => ({ file: f, sql: (m as RegExpMatchArray)[0] }))))
    const storage = policies.filter((p) => /ON\s+storage\.objects/i.test(p.sql))
    expect(storage.length).toBeGreaterThan(0)
    for (const p of storage) {
      expect({ file: p.file, scoped: /bucket_id\s*=\s*'[a-z-]+'/.test(p.sql) }).toEqual({ file: p.file, scoped: true })
      expect(p.sql).not.toContain('creator-record-evidence')
    }
    const evidence = readFileSync(path.join(dirs[0], '20261103000000_creator_record_v2_evidence.sql'), 'utf8')
    expect(evidence).not.toMatch(/CREATE POLICY/)
    expect(evidence).toContain("VALUES ('creator-record-evidence', 'creator-record-evidence', false, 4194304")
  })

  test('the service cap and the database cap are the same number', () => {
    const { readFileSync } = jest.requireActual<typeof import('fs')>('fs')
    const path = jest.requireActual<typeof import('path')>('path')
    const sql = readFileSync(path.join(__dirname, '..', '..', 'supabase', 'migrations', '20261103000000_creator_record_v2_evidence.sql'), 'utf8')
    expect(sql).toContain(`AND d.state <> 'deleted') >= ${EVIDENCE_MAX_LIVE_PER_CREATOR} THEN`)
  })
})

describe('CR-V2-UAT-PROD-MIN-1: the identity-scoped synthetic UAT exception (submissions stopped)', () => {
  test('inside the window only the synthetic fixture is accepted; after expiry no upload, listing or deletion, while the owner-download contract is unchanged', async () => {
    const synthetic = pdf('1 0 obj << /Title (SYNTHETIC UAT) >> endobj')
    let now = new Date('2026-11-05T10:00:00.000Z')
    const window = { start: Date.parse('2026-11-05T09:00:00.000Z'), end: Date.parse('2026-11-05T15:00:00.000Z') }
    const d = deps({
      submissions: 'stopped',
      now: () => now,
      isSyntheticTestDocument: (s: string) => s === sha(synthetic),
      syntheticUat: { admits: (u: string, t: Date) => u === USER && t.getTime() >= window.start && t.getTime() < window.end },
    })
    // Inside the window: the UAT identity, synthetic fixture only; anyone else stays stopped.
    expect(await upload(d, pdf())).toMatchObject({ status: 403, code: 'synthetic_documents_only' })
    const r = await upload(d, synthetic)
    if (!r.ok) throw new Error('upload')
    expect(await upload(d, synthetic, OTHER)).toMatchObject({ status: 503, code: 'submissions_stopped' })
    // After expiry: every write and the listing are closed again.
    now = new Date('2026-11-05T15:00:00.000Z')
    expect(await upload(d, synthetic)).toMatchObject({ status: 503, code: 'submissions_stopped' })
    expect(await listEvidence(d, USER)).toMatchObject({ status: 503, code: 'submissions_stopped' })
    expect(await deleteEvidence(d, USER, r.document.id)).toMatchObject({ status: 503, code: 'submissions_stopped' })
    // The existing owner-download contract (not a UAT operation) is unchanged: the owner (logged), never another user.
    expect(await readEvidenceFile(d, { userId: USER, isAdmin: false }, r.document.id)).toMatchObject({ ok: true, bytes: synthetic })
    expect(await readEvidenceFile(d, { userId: OTHER, isAdmin: false }, r.document.id)).toMatchObject({ status: 404, code: 'not_found' })
    expect(d.store.access).toEqual([{ document_id: r.document.id, actor: USER, role: 'owner' }])
  })
})
