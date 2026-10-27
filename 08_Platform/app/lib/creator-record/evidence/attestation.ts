/**
 * CR-V2-MVP-7 — server-issued attestation for a LIVE document observation.
 *
 * Problem: nothing is stored, so a live reading travels to the browser and
 * back. Unlike fixture replay (re-derived from SI8's own table), a live
 * observation cannot be re-derived without paying for a second reading, so a
 * page could otherwise fabricate or edit one before the draft is built.
 *
 * Mechanism (no persistence): the examine route signs the complete
 * observation it produced — every field, including provenance (mode, model
 * calls, versions, fingerprint) and the cross-check — with HMAC-SHA256 under a
 * server-only key, bound to the authenticated admin's user id and session id
 * (both from the verified Supabase token) and to a short expiry. The draft
 * route accepts a live observation only when the attestation verifies against
 * the observation as received AND the requester's own verified context.
 *
 *   token = base64url(payload JSON) "." base64url(HMAC-SHA256(key, "<version>.<payload>"))
 *   payload = { v, purpose, sub, sid, iat, exp, doc }   doc = SHA-256 of the canonical observation
 *
 * The key never leaves the server; the browser holds only an opaque token it
 * cannot forge or extend. A token does not make an observation true: it only
 * shows that SI8's server produced exactly this observation for this admin
 * session, recently. Reconciliation is still computed on the server.
 *
 * Server-only (node:crypto). Pure apart from the injected clock and key.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { ExaminedDocument } from './document-observations'

export const EVIDENCE_SIGNING_KEY_ENV = 'CREATOR_RECORD_EVIDENCE_SIGNING_KEY'
export const ATTESTATION_VERSION = 'cr-doc-att-v1'
const PURPOSE = 'creator-record-v2/live-document-observation'
/** Short-lived: long enough to finish the questionnaire, short enough to bound reuse. */
export const ATTESTATION_TTL_SECONDS = 30 * 60
/** Tolerated clock skew for `iat` between server instances. */
const MAX_SKEW_SECONDS = 60
/** At least 32 characters (256 bits of a random base64 key ≈ 43 characters). */
export const MIN_SIGNING_KEY_CHARS = 32
export const MAX_ATTESTATION_CHARS = 1024
export const ATTESTATION_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

/** The verified identity an attestation is bound to. */
export interface EvidenceContext {
  user_id: string
  session_id: string
}

export type AttestationCheck = 'valid' | 'missing' | 'malformed' | 'bad_signature' | 'expired' | 'not_yet_valid' | 'context_mismatch' | 'document_mismatch'

/** The signing key, or null when absent or too short (callers fail closed). Never logged or returned. */
export function evidenceSigningKey(env: Readonly<Record<string, string | undefined>> = process.env): Buffer | null {
  const raw = env[EVIDENCE_SIGNING_KEY_ENV]
  return typeof raw === 'string' && raw.length >= MIN_SIGNING_KEY_CHARS ? Buffer.from(raw, 'utf8') : null
}

/** Deterministic JSON: object keys sorted at every level; arrays keep their order. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
    .join(',')}}`
}

const digest = (doc: ExaminedDocument) => createHash('sha256').update(canonicalJson(doc)).digest('hex')
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const mac = (key: Buffer, payloadB64: string) => createHmac('sha256', key).update(`${ATTESTATION_VERSION}.${payloadB64}`).digest()

export function issueAttestation(doc: ExaminedDocument, ctx: EvidenceContext, key: Buffer, nowMs: number): string {
  const iat = Math.floor(nowMs / 1000)
  const payload = b64(JSON.stringify({ v: ATTESTATION_VERSION, purpose: PURPOSE, sub: ctx.user_id, sid: ctx.session_id, iat, exp: iat + ATTESTATION_TTL_SECONDS, doc: digest(doc) }))
  return `${payload}.${b64(mac(key, payload))}`
}

export function checkAttestation(token: string | undefined, doc: ExaminedDocument, ctx: EvidenceContext, key: Buffer, nowMs: number): AttestationCheck {
  if (token === undefined || token === '') return 'missing'
  if (token.length > MAX_ATTESTATION_CHARS || !ATTESTATION_PATTERN.test(token)) return 'malformed'
  const [payloadB64, sigB64] = token.split('.')
  const expected = mac(key, payloadB64)
  const given = Buffer.from(sigB64, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return 'bad_signature'
  let p: Record<string, unknown>
  try {
    p = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  } catch {
    return 'malformed'
  }
  if (!p || typeof p !== 'object' || p.v !== ATTESTATION_VERSION || p.purpose !== PURPOSE) return 'malformed'
  const { iat, exp } = p
  if (typeof iat !== 'number' || typeof exp !== 'number' || !Number.isInteger(iat) || !Number.isInteger(exp)) return 'malformed'
  const now = Math.floor(nowMs / 1000)
  if (exp - iat > ATTESTATION_TTL_SECONDS || exp <= iat) return 'malformed'
  if (iat > now + MAX_SKEW_SECONDS) return 'not_yet_valid'
  if (now >= exp) return 'expired'
  if (p.sub !== ctx.user_id || p.sid !== ctx.session_id) return 'context_mismatch'
  if (p.doc !== digest(doc)) return 'document_mismatch'
  return 'valid'
}
