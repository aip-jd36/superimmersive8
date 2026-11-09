/**
 * Decision 8P (CR-V2-MVP-INTEGRATION-8P): Creator Record v2 evidence uploads keep the deployed 4 MB limit, while the live AI
 * examination keeps its own, lower 1 MiB bound. Boundaries of the upload validation, the customer-facing messages, and the
 * separation of the two limits. (The live engine's refusal of an oversized stored document before any read, log or model call is
 * pinned in live-examination-real-unlocked.test.ts, "a stored size over the bound is not read".)
 */
import { readFileSync } from 'fs'
import path from 'path'

jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {} }))

import { validateEvidenceBytes, EVIDENCE_MAX_REQUEST_BYTES } from '@/lib/creator-record/evidence-intake/contract'
import { EVIDENCE_MAX_BYTES, EVIDENCE_STORED_MAX_BYTES } from '@/lib/creator-record/evidence-intake/vocabulary'
import { LIVE_BOUNDS } from '@/lib/creator-record/live-examination/controls'
import { evidenceError, invalidRequest } from '@/lib/creator-record-flow/evidence-http'

const APP = path.join(__dirname, '..', '..')
const MB4 = 4 * 1024 * 1024
const MIB1 = 1024 * 1024

/** A well-formed PDF of exactly `size` bytes (a comment pads the body; the `%%EOF` marker stays at the end). */
function pdfOfSize(size: number): Uint8Array {
  const shell = (pad: string) => `%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%${pad}\ntrailer << /Root 1 0 R >>\n%%EOF\n`
  const bytes = new TextEncoder().encode(shell('x'.repeat(size - shell('').length)))
  if (bytes.length !== size) throw new Error('fixture size')
  return bytes
}

describe('Decision 8P: 4 MB upload limit, separate from the 1 MiB AI-examination bound', () => {
  test('the upload limit is 4 MiB again, equal to the bucket and stored-record limit; the live bound is unchanged at 1 MiB', () => {
    expect(EVIDENCE_MAX_BYTES).toBe(MB4)
    expect(EVIDENCE_STORED_MAX_BYTES).toBe(MB4)
    expect(LIVE_BOUNDS.max_document_bytes).toBe(MIB1)
    expect(EVIDENCE_MAX_BYTES).toBeGreaterThan(LIVE_BOUNDS.max_document_bytes)
    // The request bound (file + multipart framing) stays under Vercel's 4.5 MB body limit.
    expect(EVIDENCE_MAX_REQUEST_BYTES).toBe(MB4 + 64 * 1024)
    expect(EVIDENCE_MAX_REQUEST_BYTES).toBeLessThan(4.5 * 1000 * 1000)
    expect(readFileSync(path.join(APP, 'supabase/migrations/20261103000000_creator_record_v2_evidence.sql'), 'utf8')).toContain('4194304')
  })

  test.each([
    ['exactly 4 MiB', MB4, true],
    ['4 MiB - 1', MB4 - 1, true],
    ['1 MiB + 1 (above the AI-examination bound, still a valid upload)', MIB1 + 1, true],
    ['exactly 1 MiB', MIB1, true],
    ['4 MiB + 1', MB4 + 1, false],
    ['5 MiB', 5 * MIB1, false],
  ])('a PDF of %s is %s', (_label, size, accepted) => {
    const r = validateEvidenceBytes(pdfOfSize(size))
    if (accepted) expect(r).toMatchObject({ ok: true, byte_size: size, media_type: 'application/pdf' })
    else expect(r).toEqual({ ok: false, code: 'file_too_large' })
  })

  test('the customer-facing message for an oversized file names 4 MB, on both refusal paths', async () => {
    const tooLargeBody = await invalidRequest(413).json()
    expect(tooLargeBody).toEqual({ error: 'The file is larger than 4 MB.', code: 'file_too_large' })
    const validated = evidenceError({ ok: false, status: 400, code: 'file_too_large' })
    expect(validated.status).toBe(400)
    expect(await validated.json()).toEqual({ error: 'The file is larger than 4 MB.', code: 'file_too_large' })
  })

  test('the upload help text and the route contract say 4 MB; no 1 MB upload wording remains', () => {
    // CR-V2-MVP-PROD-PREP-1: the panel's help text and the error messages live in the customer wording set (`wording.ts`).
    const panel = readFileSync(path.join(APP, 'components/creator-record/DocumentReviewPanel.tsx'), 'utf8')
    const wording = readFileSync(path.join(APP, 'lib/creator-record-flow/wording.ts'), 'utf8')
    expect(panel).toContain('PANEL_TEXT.billing_document_help')
    expect(wording).toContain('PDF, PNG or JPEG, up to 4 MB.')
    expect(panel + wording).not.toMatch(/up to 1 MB/)
    expect(readFileSync(path.join(APP, 'app/api/creator-record-v2/evidence/route.ts'), 'utf8')).toMatch(/at most 4 MB/)
    expect(readFileSync(path.join(APP, 'lib/creator-record-flow/evidence-http.ts'), 'utf8') + wording).not.toMatch(/larger than 1 MB/)
  })
})
