/**
 * In-memory `SessionStore` test double (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md
 * §6/§7, Live Interview Runtime milestone). Not for production use --
 * state is lost on process restart, and a serverless deployment offers no
 * guarantee this module even stays loaded between requests (exactly the
 * reasoning that ruled out "server-memory session" as a real persistence
 * option in Part 2 Product Integration Planning). Exists solely so
 * `run-turn.ts` can be built and tested against a real, working
 * `SessionStore` implementation before any Supabase-backed one exists --
 * the same role `mock-extractor.ts`/`mock-decision.ts`/
 * `mock-candidate-question.ts` already play for Interview Engine's own
 * LLM-shaped dependencies.
 */

import type { CRCSessionState } from './types'
import type { SessionStore } from './session-store'

export function createInMemorySessionStore(): SessionStore {
  const sessions = new Map<string, CRCSessionState>()

  return {
    async load(token: string): Promise<CRCSessionState | null> {
      return sessions.get(token) ?? null
    },
    async save(token: string, state: CRCSessionState): Promise<void> {
      sessions.set(token, state)
    },
  }
}
