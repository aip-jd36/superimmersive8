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
      const { error } = await client.from(TABLE).upsert({
        id: token,
        structured_understanding: JSON.parse(serializeStructuredUnderstanding(state.structured_understanding)),
        boundary_state: JSON.parse(serializeBoundaryState(state.boundary_state)),
        pending_clarification: state.pending_clarification,
      })
      if (error) {
        throw new Error(`[SupabaseSessionStore] save failed: ${error.message}`)
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
 * Partial-column upsert -- only sets turn_count/transcript, leaving
 * structured_understanding/boundary_state/pending_clarification untouched
 * (Supabase's generated ON CONFLICT DO UPDATE only assigns columns present
 * in the payload). Must only be called AFTER a successful runTurn() call,
 * whose own SessionStore.save() has already upserted the row for a
 * brand-new token -- see route.ts for the ordering this depends on.
 */
export async function saveCrcSessionProductState(client: SupabaseClient, token: string, state: CrcSessionProductState): Promise<void> {
  const { error } = await client.from(TABLE).upsert({
    id: token,
    turn_count: state.turn_count,
    transcript: state.transcript,
  })
  if (error) {
    throw new Error(`[SupabaseSessionStore] saveCrcSessionProductState failed: ${error.message}`)
  }
}
