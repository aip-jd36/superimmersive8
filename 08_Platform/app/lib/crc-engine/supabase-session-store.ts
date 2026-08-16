/**
 * Supabase-backed SessionStore implementation (CRC Product Integration --
 * First Usable Live Slice). Implements the existing SessionStore interface
 * (session-store.ts) exactly as written -- this module depends on that
 * interface, never the other way around. runTurn() and every other engine
 * module remain entirely unaware Supabase exists.
 *
 * Dependency-injected (accepts a Supabase client, does not import
 * supabaseAdmin itself) so it is testable with a fake client, matching how
 * CandidateExtractor/CandidateQuestionGenerator/ConstraintADecider are
 * already injected into runTurn() rather than hard-imported.
 *
 * Only ever writes the three CRCSessionState fields
 * (structured_understanding, boundary_state, pending_clarification) --
 * exactly what the SessionStore.save() signature receives. Product-layer
 * bookkeeping this table also holds (transcript, turn_count) is
 * deliberately NOT part of this module: SessionStore's own interface has
 * no way to carry those fields (and must not be changed to add one -- see
 * crc_sessions migration's own header comment for why they aren't part of
 * CRCSessionState at all), so the two small helper functions below exist
 * alongside this store for the API route to call directly, on the same
 * table, as a clearly separate concern.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  serializeStructuredUnderstanding,
  deserializeStructuredUnderstanding,
  serializeBoundaryState,
  deserializeBoundaryState,
} from '@/lib/interview-engine/serialization'
import type { PendingClarification } from '@/lib/interview-engine/pending-clarification'
import type { CRCSessionState } from './types'
import type { CommercialReadinessCategory } from './commercial-readiness-catalog'
import type { SessionStore } from './session-store'

const TABLE = 'crc_sessions'

export function createSupabaseSessionStore(client: SupabaseClient): SessionStore {
  return {
    async load(token: string): Promise<CRCSessionState | null> {
      const { data, error } = await client
        .from(TABLE)
        .select('structured_understanding, boundary_state, pending_clarification, pending_commercial_readiness_takeaway')
        .eq('id', token)
        .maybeSingle()

      if (error) {
        // A query failure is treated identically to "no such row" -- never
        // returned as a thrown exception the caller has to separately
        // catch, and never silently defaulted to a valid-looking empty
        // state either. The caller (the API route) is responsible for
        // distinguishing "no token supplied at all" (legitimately start
        // fresh) from "a token was supplied but load() returned null"
        // (session could not be resumed) -- see route.ts.
        console.error('[SupabaseSessionStore] load query error', error)
        return null
      }
      if (!data) return null

      try {
        return {
          structured_understanding: deserializeStructuredUnderstanding(JSON.stringify(data.structured_understanding)),
          boundary_state: deserializeBoundaryState(JSON.stringify(data.boundary_state)),
          pending_clarification: (data.pending_clarification as PendingClarification | null) ?? null,
          pending_commercial_readiness_takeaway: (data.pending_commercial_readiness_takeaway as CommercialReadinessCategory | null) ?? null,
        }
      } catch (err) {
        // Corrupt/malformed stored JSON -- same "unresolvable" outcome as
        // a missing row, per the module header.
        console.error('[SupabaseSessionStore] load deserialize error', err)
        return null
      }
    },

    async save(token: string, state: CRCSessionState): Promise<void> {
      // Manual update-then-insert-if-no-row, not .upsert() -- confirmed
      // live (2026-08-09, isolated diagnostic against the real project)
      // that .upsert() reliably fails to recognize an existing row as a
      // conflict regardless of an explicit onConflict option, always
      // attempting a plain INSERT and failing NOT NULL constraints on any
      // column outside the payload. .update() and .insert() were each
      // independently verified to behave correctly and predictably
      // (.update() against a non-matching id returns an empty data array
      // with no error, never a false "success"), so this composes them
      // directly rather than depending on .upsert()'s own conflict
      // detection at all.
      const payload = {
        structured_understanding: JSON.parse(serializeStructuredUnderstanding(state.structured_understanding)),
        boundary_state: JSON.parse(serializeBoundaryState(state.boundary_state)),
        pending_clarification: state.pending_clarification,
        pending_commercial_readiness_takeaway: state.pending_commercial_readiness_takeaway,
      }
      const { data: updated, error: updateError } = await client.from(TABLE).update(payload).eq('id', token).select('id')
      if (updateError) {
        throw new Error(`[SupabaseSessionStore] save failed: ${updateError.message}`)
      }
      if (updated && updated.length > 0) return

      const { error: insertError } = await client.from(TABLE).insert({ id: token, ...payload })
      if (insertError) {
        throw new Error(`[SupabaseSessionStore] save failed: ${insertError.message}`)
      }
    },
  }
}

// ── Product-layer helpers (NOT part of SessionStore -- see module header) ──

/**
 * Transcript v2 (CRC Identity + Abuse Prevention + Analytics milestone,
 * design report §6). `timestamp`/`message_kind` are additive and OPTIONAL
 * at the individual-entry level -- JSONB doesn't enforce a schema per
 * array element, so historical rows saved before this milestone (plain
 * {role, text}) remain valid as stored and are never rewritten. Any code
 * reading a transcript entry must treat a missing timestamp/message_kind
 * as unknown, never crash, never guess/backfill.
 *
 * message_kind values map 1:1 to real, existing outcome shapes (nothing
 * invented): 'user' for every user turn; 'ordinary_question' for a
 * regular candidate-generator question; 'acknowledgment' for the fixed
 * ACKNOWLEDGMENT_COPY (decline path); 'commercial_readiness_discovery_question'
 * for a Discovery Catalog question; 'educational_takeaway' for the fixed
 * Educational Takeaway delivered the turn after. Deliberately excludes a
 * completion/opening/summary kind (ProjectionOutput is never persisted,
 * for the same reason as always -- cheap to recompute) and an error/retry
 * kind (a failed turn is never saved at all; crc_pilot_events.retryable_failure
 * already captures the operationally relevant signal) -- see design report
 * §6 for the full reasoning on both declined additions.
 */
export type MessageKind = 'user' | 'ordinary_question' | 'acknowledgment' | 'commercial_readiness_discovery_question' | 'educational_takeaway' | 'jurisdiction_clarification_question'

export interface TranscriptEntry {
  role: 'user' | 'assistant'
  text: string
  timestamp?: string
  message_kind?: MessageKind
}

export interface CrcSessionProductState {
  turn_count: number
  transcript: TranscriptEntry[]
  /**
   * Session-meta fields added by the CRC Identity + Abuse Prevention +
   * Analytics milestone. Selected alongside turn_count/transcript (one
   * query, not two) since every call site that needs turn_count also needs
   * these for the email-gate/abuse checks in route.ts.
   */
  updated_at: string
  email: string | null
  traffic_type: string
  abuse_key: string | null
  attribution_token: string | null
  /** 'conversation_limit_reached' | null -- see types.ts-adjacent note in route.ts for why this is not a completion_reason value. 'email_declined' retired with the mid-conversation gate (Results Gate milestone, 2026-08-14) -- no new code path ever writes it, but the CHECK constraint still permits it for historical rows. */
  product_stop_reason: string | null
  /** Results Gate milestone (2026-08-14) additions -- see that migration's own header. */
  created_at: string
  crc_lead_id: string | null
  capture_notice_version: string | null
  results_email_status: string | null
  results_email_last_recipient: string | null
}

/**
 * Returns null under the exact same "unresolvable" conditions as
 * SessionStore.load() above (no row, or a query error) -- called by the
 * route alongside (not instead of) SessionStore.load() when resuming an
 * existing, client-supplied token.
 */
export async function loadCrcSessionProductState(client: SupabaseClient, token: string): Promise<CrcSessionProductState | null> {
  const { data, error } = await client
    .from(TABLE)
    .select(
      'turn_count, transcript, updated_at, email, traffic_type, abuse_key, attribution_token, product_stop_reason, created_at, crc_lead_id, capture_notice_version, results_email_status, results_email_last_recipient',
    )
    .eq('id', token)
    .maybeSingle()
  if (error) {
    console.error('[SupabaseSessionStore] loadCrcSessionProductState query error', error)
    return null
  }
  if (!data) return null
  return {
    turn_count: data.turn_count as number,
    transcript: (data.transcript as TranscriptEntry[] | null) ?? [],
    updated_at: data.updated_at as string,
    email: (data.email as string | null) ?? null,
    traffic_type: data.traffic_type as string,
    abuse_key: (data.abuse_key as string | null) ?? null,
    attribution_token: (data.attribution_token as string | null) ?? null,
    product_stop_reason: (data.product_stop_reason as string | null) ?? null,
    created_at: data.created_at as string,
    crc_lead_id: (data.crc_lead_id as string | null) ?? null,
    capture_notice_version: (data.capture_notice_version as string | null) ?? null,
    results_email_status: (data.results_email_status as string | null) ?? null,
    results_email_last_recipient: (data.results_email_last_recipient as string | null) ?? null,
  }
}

/**
 * Session-creation-time facts (CRC Identity + Abuse Prevention + Analytics
 * milestone) -- traffic_type, abuse_key, runtime_commit, model_config,
 * attribution_token. NOT part of CRCSessionState (SessionStore.save()'s
 * insert-fallback only ever writes the four CRCSessionState columns), so
 * for a brand-new token these would otherwise silently take their DB
 * defaults (traffic_type='pilot', everything else null) forever. Called
 * exactly once, only on the branch that mints a new token, AFTER runTurn()
 * has already created the row via its own save() -- same ordering
 * dependency saveCrcSessionProductState already has on runTurn(), see
 * route.ts.
 */
export interface CrcSessionCreationMeta {
  traffic_type: string
  abuse_key: string | null
  runtime_commit: string
  model_config: Record<string, unknown>
  attribution_token: string
}

export async function saveCrcSessionCreationMeta(client: SupabaseClient, token: string, meta: CrcSessionCreationMeta): Promise<void> {
  const { error } = await client.from(TABLE).update(meta).eq('id', token)
  if (error) {
    throw new Error(`[SupabaseSessionStore] saveCrcSessionCreationMeta failed: ${error.message}`)
  }
}

/**
 * Persists a captured email (the gate's own write). identity_source is
 * currently always 'email_gate' -- the only capture mechanism that exists.
 */
export async function saveCrcSessionEmail(client: SupabaseClient, token: string, email: string): Promise<void> {
  const { error } = await client
    .from(TABLE)
    .update({ email, email_captured_at: new Date().toISOString(), identity_source: 'email_gate' })
    .eq('id', token)
  if (error) {
    throw new Error(`[SupabaseSessionStore] saveCrcSessionEmail failed: ${error.message}`)
  }
}

/**
 * Sets the product-layer stop reason -- see route.ts's own note on why
 * this is deliberately separate from structured_understanding.completion_reason
 * (an Interview-Engine-owned field this milestone never touches).
 * 'email_declined' retired from this function's own type (Results Gate
 * milestone, 2026-08-14) -- no code path writes it anymore, since there is
 * no more mid-conversation gate to decline. The DB CHECK constraint still
 * permits the value for historical rows; not removed, per migration safety.
 */
export async function saveCrcSessionProductStop(client: SupabaseClient, token: string, reason: 'conversation_limit_reached'): Promise<void> {
  const { error } = await client.from(TABLE).update({ product_stop_reason: reason }).eq('id', token)
  if (error) {
    throw new Error(`[SupabaseSessionStore] saveCrcSessionProductStop failed: ${error.message}`)
  }
}

/**
 * Plain .update() -- deliberately never .upsert() (see save()'s own
 * comment for the confirmed-live reason) and deliberately never an
 * insert-fallback either, unlike save() above: this function's own
 * contract is that it is ONLY ever called after a successful runTurn()
 * call, whose own SessionStore.save() has already created the row for a
 * brand-new token -- see route.ts for the ordering this depends on. A
 * zero-row update here means that invariant was violated, so it's
 * surfaced as an error rather than silently doing nothing.
 *
 * Only sets turn_count/transcript, leaving
 * structured_understanding/boundary_state/pending_clarification
 * untouched -- .update() only ever assigns columns present in its own
 * payload.
 */
/**
 * Deliberately narrower than CrcSessionProductState (the full read shape) --
 * this write only ever sets turn_count/transcript, so its own parameter
 * type should say exactly that, not the broader interface loadCrcSessionProductState
 * returns. Keeps callers (and tests) from having to fabricate the read-only
 * session-meta fields (email, traffic_type, etc.) just to call a function
 * that never touches them.
 */
export interface CrcSessionProductStateUpdate {
  turn_count: number
  transcript: TranscriptEntry[]
}

export async function saveCrcSessionProductState(client: SupabaseClient, token: string, state: CrcSessionProductStateUpdate): Promise<void> {
  const { data, error } = await client.from(TABLE).update({ turn_count: state.turn_count, transcript: state.transcript }).eq('id', token).select('id')
  if (error) {
    throw new Error(`[SupabaseSessionStore] saveCrcSessionProductState failed: ${error.message}`)
  }
  if (!data || data.length === 0) {
    throw new Error('[SupabaseSessionStore] saveCrcSessionProductState failed: no row found for token -- expected the row to already exist from a prior runTurn() save')
  }
}

export interface CrcSessionFeedback {
  rating: 'yes' | 'somewhat' | 'no'
  text: string | null
}

/**
 * CRC Limited Pilot, Part 3. Same plain-.update()-only shape as
 * saveCrcSessionProductState above, and the same precondition: only ever
 * called for a token whose row already exists (the feedback route itself
 * verifies the session is resolvable and complete before calling this).
 * Only sets feedback_rating/feedback_text, leaving every other column
 * (including turn_count/transcript) untouched.
 */
export async function saveCrcSessionFeedback(client: SupabaseClient, token: string, feedback: CrcSessionFeedback): Promise<void> {
  const { data, error } = await client.from(TABLE).update({ feedback_rating: feedback.rating, feedback_text: feedback.text }).eq('id', token).select('id')
  if (error) {
    throw new Error(`[SupabaseSessionStore] saveCrcSessionFeedback failed: ${error.message}`)
  }
  if (!data || data.length === 0) {
    throw new Error('[SupabaseSessionStore] saveCrcSessionFeedback failed: no row found for token -- expected the row to already exist')
  }
}
