/**
 * CRC <-> Assurance association -- state binding (CAH-3D §8-§12).
 *
 * Establishes the CAH-3C.1 state-binding invariants:
 *   SB1 -- which CRC session (the association row's crc_session_id; not here)
 *   SB2 -- when (the association row's associated_at; not here)
 *   SB3 -- WHAT PERSISTED CRC PROJECT STATE the association referred to, as a
 *          canonical-form digest of the persisted StructuredUnderstanding
 *   SB4 -- whether that persisted project state has CHANGED since -- a neutral
 *          comparison, no materiality
 *
 * What state identity is bound to (CAH-3C.1 §L, P9): a canonical form of the
 * PERSISTED StructuredUnderstanding, normalized through the project's single
 * established funnel (`deserializeStructuredUnderstanding`). It is NOT bound to
 * the handoff representation, current Living Knowledge, current Retrieval,
 * current Bounded Interpretation, Projection, Composition, Sales context, the
 * transcript (a redisplay artifact per the crc_sessions migration header, not
 * authoritative project state), or runtime_commit (a SEPARATE weak temporal
 * anchor, never folded in here).
 *
 * Future-field fail-closed (CAH-3C.1 §10, CAH-3D §10): the canonical form is
 * the COMPLETE normalized StructuredUnderstanding object -- there is NO
 * hand-maintained field whitelist. Any authority-relevant field added to
 * StructuredUnderstanding in the future is therefore included in the digest
 * automatically; it cannot be silently omitted. The canonicalization version
 * below makes the REASON for a later difference interpretable, and makes a
 * cross-version comparison fail closed. Forgetting to bump it when the
 * deserialize-defaults contract changes produces, at worst, a conservative
 * false "changed" -- never a false "unchanged".
 */

import { createHash } from 'crypto'
import { deserializeStructuredUnderstanding } from '@/lib/interview-engine/serialization'
import type { CrcStateComparison } from './types'

/**
 * Canonicalization contract version. Bump (and add a matching note here) when
 * either the canonicalization algorithm below OR the
 * `deserializeStructuredUnderstanding` normalization it depends on changes in
 * a way that would legitimately shift the digest for unchanged project state.
 *
 *   csi-v1 (CAH-3D, 2026-09-04) -- complete normalized StructuredUnderstanding,
 *   recursively key-sorted, array order preserved, SHA-256 of the canonical
 *   JSON string.
 */
export const CANONICALIZATION_VERSION = 'csi-v1'

export interface CrcStateIdentity {
  fingerprint: string
  canonicalization_version: string
}

/**
 * Recursively produce a canonical structure:
 *   - object keys sorted (incidental key ordering must not change identity);
 *   - array order PRESERVED (order is part of persisted meaning -- e.g.
 *     append-only content_presence_mentions, the sequence facts were
 *     established; arrays are never sorted for hashing convenience);
 *   - primitives and null unchanged.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

/**
 * Canonical JSON string of the complete normalized StructuredUnderstanding.
 * Throws if `raw` is not a deserializable StructuredUnderstanding -- callers
 * MUST treat that as fail-closed (no association / comparison unavailable),
 * never as "empty state".
 */
export function canonicalizeStructuredUnderstanding(raw: unknown): string {
  // Normalize through the single established funnel so a session persisted
  // before a field existed and one where the field is genuinely absent
  // produce the SAME canonical form (CAH-3D §11.1).
  const normalized = deserializeStructuredUnderstanding(JSON.stringify(raw))
  return JSON.stringify(canonicalize(normalized))
}

/**
 * SB3: the persisted-project-state identity captured at association time.
 * Throws on unreadable input (see above).
 */
export function computeCrcStateIdentity(raw: unknown): CrcStateIdentity {
  const canonical = canonicalizeStructuredUnderstanding(raw)
  const fingerprint = createHash('sha256').update(canonical, 'utf8').digest('hex')
  return { fingerprint, canonicalization_version: CANONICALIZATION_VERSION }
}

/**
 * SB4: neutral comparison of a stored identity against a freshly computed one.
 * Cross-version comparison FAILS CLOSED to 'comparison_unavailable' -- never a
 * false 'unchanged'. 'changed'/'unchanged' carry no materiality.
 */
export function compareCrcStateIdentity(stored: CrcStateIdentity, current: CrcStateIdentity): CrcStateComparison {
  if (stored.canonicalization_version !== current.canonicalization_version) return 'comparison_unavailable'
  return stored.fingerprint === current.fingerprint ? 'unchanged' : 'changed'
}
