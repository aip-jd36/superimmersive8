/**
 * CR-V2-DOC-1 — the evidence intake contract: byte validation, file names and document references.
 *
 * Server-only (SHA-256 via node:crypto). No model call, no examination, no I/O. Nothing here reads what a
 * document says beyond the few structural bytes needed to identify and bound it.
 *
 * Validation (fail closed, fixed reason codes):
 *   - the type is decided from the leading bytes only (PDF `%PDF-`, PNG signature, JPEG SOI); a browser or
 *     file-name type is never read;
 *   - empty and over-size files are refused;
 *   - PDF: must end with an `%%EOF` marker; refused when it is encrypted or names active or embedded content
 *     (JavaScript, launch and remote go-to actions, form submission, embedded files, rich media, XFA forms),
 *     after decoding `#xx` name escapes. This is DEFENCE IN DEPTH ONLY: content inside compressed streams is
 *     not inspected, so a PDF that passes is not thereby safe. Stored files are never rendered, parsed or
 *     executed by SI8, and are only ever downloaded as attachments;
 *   - PNG / JPEG: the declared pixel dimensions must be present and within bounds (decompression-bomb guard).
 *
 * The code lock `EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED = false` means only SI8's own synthetic test
 * documents can be stored (checked by the service against the committed fixture table). Lifting it is a
 * reviewed code change and needs approved consent, retention and deletion policy.
 */

import { createHash } from 'node:crypto'
import { EVIDENCE_CATEGORIES, EVIDENCE_MAX_BYTES, EVIDENCE_MAX_FILE_NAME_CHARS, EVIDENCE_MAX_PER_RECORD, EVIDENCE_MAX_PER_TOOL, type EvidenceCategory, type EvidenceMediaType } from './vocabulary'

export const EVIDENCE_BUCKET = 'creator-record-evidence'

/** Code lock: real customer documents are not accepted in this build. */
export const EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED: boolean = false

/**
 * DRAFT consent identifier. NOT approved wording: it only lets the server require and record that a consent
 * step occurred. The approved consent text and version replace it before any customer sees intake.
 */
export const EVIDENCE_CONSENT_DRAFT_VERSION = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'

/** Request bodies: one file plus a small form overhead. */
export const EVIDENCE_MAX_REQUEST_BYTES = EVIDENCE_MAX_BYTES + 64 * 1024
/** Provisional bound on a creator's live (stored or in-flight) documents, to limit storage abuse. */
export const EVIDENCE_MAX_LIVE_PER_CREATOR = 24
/** Images: per-side and total pixel bounds. */
export const EVIDENCE_MAX_IMAGE_SIDE = 12_000
export const EVIDENCE_MAX_IMAGE_PIXELS = 60_000_000
/** An upload still `pending` after this long is treated as abandoned by cleanup. */
export const EVIDENCE_PENDING_STALE_MS = 15 * 60 * 1000

export const EVIDENCE_REFUSALS = [
  'empty_file',
  'file_too_large',
  'unsupported_format',
  'pdf_malformed',
  'pdf_encrypted',
  'pdf_active_content',
  'image_header_invalid',
  'image_too_large',
] as const
export type EvidenceRefusal = (typeof EVIDENCE_REFUSALS)[number]

export type ValidatedEvidence = { ok: true; media_type: EvidenceMediaType; byte_size: number; sha256: string } | { ok: false; code: EvidenceRefusal }

export const sha256Bytes = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')

export function sniffMediaType(b: Uint8Array): EvidenceMediaType | null {
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return 'application/pdf'
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png'
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  return null
}

const latin1 = (b: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return s
}

/** PDF names that carry active or embedded content (after `#xx` escapes are decoded). */
// `/OpenAction` and `/AA` are not refused on their own (ordinary PDFs use them to set the opening view); the
// payloads they could run (JavaScript, launch, remote go-to, form submission) are.
const PDF_ACTIVE_NAMES = /\/(JavaScript|JS|Launch|EmbeddedFile|EmbeddedFiles|RichMedia|XFA|SubmitForm|ImportData|GoToR|GoToE)(?![A-Za-z0-9])/

export function pdfStructureRefusal(b: Uint8Array): EvidenceRefusal | null {
  const text = latin1(b).replace(/#([0-9A-Fa-f]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
  if (!/%%EOF\s*$/.test(text.slice(-2048))) return 'pdf_malformed'
  if (/\/Encrypt(?![A-Za-z0-9])/.test(text)) return 'pdf_encrypted'
  if (PDF_ACTIVE_NAMES.test(text)) return 'pdf_active_content'
  return null
}

const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]
const u16 = (b: Uint8Array, o: number) => (b[o] << 8) + b[o + 1]

/** Declared image dimensions, or null when the header cannot be read. */
export function imageDimensions(b: Uint8Array, type: 'image/png' | 'image/jpeg'): { width: number; height: number } | null {
  if (type === 'image/png') {
    // Signature (8), then the first chunk must be IHDR: length 13, type, width, height.
    if (b.length < 24 || u32(b, 8) !== 13 || latin1(b.subarray(12, 16)) !== 'IHDR') return null
    return { width: u32(b, 16), height: u32(b, 20) }
  }
  // JPEG: walk the marker segments to the first start-of-frame.
  let i = 2
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null
    const marker = b[i + 1]
    if (marker === 0xff) {
      i += 1
      continue
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2
      continue
    }
    if (marker === 0xd9 || marker === 0xda) return null
    const len = u16(b, i + 2)
    if (len < 2) return null
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof) {
      if (i + 9 > b.length) return null
      return { height: u16(b, i + 5), width: u16(b, i + 7) }
    }
    i += 2 + len
  }
  return null
}

export function validateEvidenceBytes(bytes: Uint8Array): ValidatedEvidence {
  if (bytes.length === 0) return { ok: false, code: 'empty_file' }
  if (bytes.length > EVIDENCE_MAX_BYTES) return { ok: false, code: 'file_too_large' }
  const media = sniffMediaType(bytes)
  if (!media) return { ok: false, code: 'unsupported_format' }
  if (media === 'application/pdf') {
    const refusal = pdfStructureRefusal(bytes)
    if (refusal) return { ok: false, code: refusal }
  } else {
    const dims = imageDimensions(bytes, media)
    if (!dims || dims.width < 1 || dims.height < 1) return { ok: false, code: 'image_header_invalid' }
    if (dims.width > EVIDENCE_MAX_IMAGE_SIDE || dims.height > EVIDENCE_MAX_IMAGE_SIDE || dims.width * dims.height > EVIDENCE_MAX_IMAGE_PIXELS) return { ok: false, code: 'image_too_large' }
  }
  return { ok: true, media_type: media, byte_size: bytes.length, sha256: sha256Bytes(bytes) }
}

/** Display name only: no path, no control characters, at most 120 characters. Never used to build a path. */
export function sanitizeEvidenceFileName(name: unknown): string {
  const raw = typeof name === 'string' ? name : ''
  const base = raw.split(/[\\/]/).pop() ?? ''
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim()
  const cut = Array.from(clean).slice(0, EVIDENCE_MAX_FILE_NAME_CHARS).join('').trim()
  return cut === '' ? 'document' : cut
}

/** A creator's reference to one of their documents from a prepared version. */
export interface EvidenceReference {
  document_id: string
  category: EvidenceCategory
  tool_index: number | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** Strict: exact keys, closed categories, tool indexes in range, unique documents, per-tool and per-record limits. Null on anything else. */
export function parseEvidenceReferences(v: unknown, toolCount: number): EvidenceReference[] | null {
  if (v === undefined) return []
  if (!Array.isArray(v) || v.length > EVIDENCE_MAX_PER_RECORD) return null
  const out: EvidenceReference[] = []
  const seen = new Set<string>()
  const perTool = new Map<number, number>()
  for (const item of v) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const o = item as Record<string, unknown>
    const keys = Object.keys(o).sort()
    if (keys.join(',') !== 'category,document_id,tool_index') return null
    if (typeof o.document_id !== 'string' || !UUID.test(o.document_id) || seen.has(o.document_id)) return null
    if (typeof o.category !== 'string' || !(EVIDENCE_CATEGORIES as readonly string[]).includes(o.category)) return null
    const t = o.tool_index
    if (t !== null && (typeof t !== 'number' || !Number.isInteger(t) || t < 0 || t >= toolCount)) return null
    if (t !== null) {
      const n = (perTool.get(t) ?? 0) + 1
      if (n > EVIDENCE_MAX_PER_TOOL) return null
      perTool.set(t, n)
    }
    seen.add(o.document_id)
    out.push({ document_id: o.document_id, category: o.category as EvidenceCategory, tool_index: t as number | null })
  }
  return out
}
