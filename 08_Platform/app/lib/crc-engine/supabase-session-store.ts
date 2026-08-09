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
import type { SessionStore } from './session-store'

const TABLE = 'crc_sessions'

export function createSupabaseSessionStore(client: SupabaseClient): SessionStore {
  return {
    async load(token: string): Promise<CRCSessionState | null> {
      const { data, error } = await client
        .from(TABLE)
        .select('structured_understanding, boundary_state, pending_clarification')
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

export interface TranscriptEntry {
  role: 'user' | 'assistant'
  text: string
}

export interface CrcSessionProductState {
  turn_count: number
  transcript: TranscriptEntry[]
}

/**
 * Returns null under the exact same "unresolvable" conditions as
 * SessionStore.load() above (no row, or a query error) -- called by the
 * route alongside (not instead of) SessionStore.load() when resuming an
 * existing, client-supplied token.
 */
export async function loadCrcSessionProductState(client: SupabaseClient, token: string): Promise<CrcSessionProductState | null> {
  const { data, error } = await client.from(TABLE).select('turn_count, transcript').eq('id', token).maybeSingle()
  if (error) {
    console.error('[SupabaseSessionStore] loadCrcSessionProductState query error', error)
    return null
  }
  if (!data) return null
  return {
    turn_count: data.turn_count as number,
    transcript: (data.transcript as TranscriptEntry[] | null) ?? [],
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
export async function saveCrcSessionProductState(client: SupabaseClient, token: string, state: CrcSessionProductState): Promise<void> {
  const { data, error } = await client.from(TABLE).update({ turn_count: state.turn_count, transcript: state.transcript }).eq('id', token).select('id')
  if (error) {
    throw new Error(`[SupabaseSessionStore] saveCrcSessionProductState failed: ${error.message}`)
  }
  if (!data || data.length === 0) {
    throw new Error('[SupabaseSessionStore] saveCrcSessionProductState failed: no row found for token -- expected the row to already exist from a prior runTurn() save')
  }
}
