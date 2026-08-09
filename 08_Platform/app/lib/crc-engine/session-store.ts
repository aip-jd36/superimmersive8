/**
 * Session persistence boundary (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md
 * §6/§7, Live Interview Runtime milestone). Interface only -- no Supabase
 * implementation, no table, no schema. Deliberately kept this narrow so
 * `run-turn.ts` can be built and tested (against `in-memory-session-store.ts`)
 * without any real persistence technology existing yet, mirroring exactly
 * how `DialogueRunnerDeps` already injects extractor/generator/decider
 * rather than hard-coding a specific implementation.
 *
 * `token` is an opaque string -- this interface makes no assumption about
 * where it comes from (httpOnly cookie, URL param, etc.) or how it's
 * generated; that is entirely an API-route-layer concern, not designed
 * here.
 */

import type { CRCSessionState } from './types'

export interface SessionStore {
  load(token: string): Promise<CRCSessionState | null>
  save(token: string, state: CRCSessionState): Promise<void>
}
