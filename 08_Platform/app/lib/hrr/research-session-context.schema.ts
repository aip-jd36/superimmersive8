/**
 * ResearchSessionContext — SERVER TRUST BOUNDARY (CAH-4G.15, 2026-09-11).
 *
 * ============================================================================
 * INERT. Not imported by the live HRR research route in this milestone. The
 * server must treat any future client-supplied `ResearchSessionContext` as
 * UNTRUSTED INTERPRETIVE INPUT, never as authoritative state — this module is
 * that boundary, pre-built and pre-tested before any route wiring exists.
 * ============================================================================
 *
 * Two entry points, deliberately separate:
 *
 *   `validateResearchSessionContext(raw)` — STRICT. Returns the validated
 *   context, or `null` on ANY shape problem (wrong type, unknown enum value,
 *   over-limit array, oversized string, unexpected extra field, inconsistent
 *   combination). Useful for tests and for a future caller that wants to
 *   observe/log a malformed-context event.
 *
 *   `resolveResearchSessionContext(raw)` — LENIENT / FAIL-CLOSED. NEVER
 *   returns `null`. Delegates to the strict validator; on any failure (or
 *   absence: `undefined`/`null` input) it degrades to
 *   `EMPTY_RESEARCH_SESSION_CONTEXT` — i.e. "proceed exactly as if no context
 *   were supplied". This is the shape `ADR-003` §14 requires: a malformed
 *   context must never guess a stronger meaning and must never block the
 *   underlying research request (never a 500 caused by a context parse
 *   failure) — the failure is silently absorbed to "no context", not
 *   propagated as an error to the caller of `resolveResearchSessionContext`.
 */

import {
  EMPTY_RESEARCH_SESSION_CONTEXT,
  HRR_MAX_REFERENT_IDENTIFIER_LENGTH,
  HRR_MAX_UNRESOLVED_REFERENTS,
  type ResearchSessionContext,
} from './research-session-context'
import { REVIEWER_RESEARCH_TOPICS, type ReviewerResearchTopic } from '@/lib/reviewer-lk/types'

const REVIEWER_RESEARCH_TOPIC_SET = new Set<string>(REVIEWER_RESEARCH_TOPICS)
const ORIGIN_VALUES = new Set(['topic_selection', 'interpreted_question'])
const ALLOWED_KEYS = new Set(['activeFocus', 'activeFocusOrigin', 'unresolvedReferents'])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Strict shape validator. `null` on ANY problem — deliberately does not try
 * to salvage a partially-valid payload (e.g. never silently truncates an
 * over-limit `unresolvedReferents` array; the whole payload is rejected,
 * never guessed-at). Rejects unrecognized extra top-level fields outright
 * (no forward-compatible "ignore unknown keys" — an unexpected field on this
 * specific, narrow, security-relevant contract is treated as tampering or a
 * client/server version mismatch, not swallowed silently).
 */
export function validateResearchSessionContext(raw: unknown): ResearchSessionContext | null {
  if (raw === null || raw === undefined) return { ...EMPTY_RESEARCH_SESSION_CONTEXT } // "no context supplied" is always valid

  if (!isPlainObject(raw)) return null // malformed/nested structure (array, string, number, etc.)

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) return null // reject arbitrary extra fields outright
  }

  // ── activeFocus ────────────────────────────────────────────────────────
  let activeFocus: ReviewerResearchTopic | null = null
  if ('activeFocus' in raw && raw.activeFocus !== null && raw.activeFocus !== undefined) {
    if (typeof raw.activeFocus !== 'string' || !REVIEWER_RESEARCH_TOPIC_SET.has(raw.activeFocus)) return null // unknown focus -> fail closed (reject whole payload)
    activeFocus = raw.activeFocus as ReviewerResearchTopic
  }

  // ── activeFocusOrigin ─────────────────────────────────────────────────
  let activeFocusOrigin: 'topic_selection' | 'interpreted_question' | null = null
  if ('activeFocusOrigin' in raw && raw.activeFocusOrigin !== null && raw.activeFocusOrigin !== undefined) {
    if (typeof raw.activeFocusOrigin !== 'string' || !ORIGIN_VALUES.has(raw.activeFocusOrigin)) return null
    activeFocusOrigin = raw.activeFocusOrigin as 'topic_selection' | 'interpreted_question'
  }
  // Internally-inconsistent combinations are treated as malformed, not coerced.
  if (activeFocus === null && activeFocusOrigin !== null) return null

  // ── unresolvedReferents ───────────────────────────────────────────────
  let unresolvedReferents: string[] = []
  if ('unresolvedReferents' in raw && raw.unresolvedReferents !== undefined) {
    const arr = raw.unresolvedReferents
    if (!Array.isArray(arr)) return null
    if (arr.length > HRR_MAX_UNRESOLVED_REFERENTS) return null // over-limit -> reject the whole payload (never silently truncate)
    for (const entry of arr) {
      if (typeof entry !== 'string' || entry.length === 0 || entry.length > HRR_MAX_REFERENT_IDENTIFIER_LENGTH) {
        return null // free-text-shaped / oversized / empty entries fail closed
      }
    }
    unresolvedReferents = arr as string[]
  }
  if (activeFocus === null && unresolvedReferents.length > 0) return null // referents with no focus makes no sense — malformed

  return { activeFocus, activeFocusOrigin, unresolvedReferents }
}

/**
 * Lenient, fail-closed wrapper — the ONLY function a future route should
 * ever call directly. Never throws, never returns `null`, never blocks the
 * underlying research request on a parse failure.
 */
export function resolveResearchSessionContext(raw: unknown): ResearchSessionContext {
  const validated = validateResearchSessionContext(raw)
  return validated ?? { ...EMPTY_RESEARCH_SESSION_CONTEXT }
}
