/**
 * CR-V2-DOC-2B — the replay executor and the trusted synthetic registry, from SI8's committed replay set.
 *
 * Both read the same committed table that DOC-1 intake already uses to decide what is a synthetic test
 * document (`lib/creator-record-flow/evidence-production.ts`: `DEFAULT_REPLAY_TABLE.has(sha256)`). Neither
 * accepts anything from a request. Replay is recorded test data, never model output.
 */

import { DEFAULT_REPLAY_TABLE, REPLAY_SET_VERSION, type ReplayTable } from '../evidence/replay'
import { buildProfileRegistry, type ProfileRegistry } from './profile'
import { RECEIPT_PROFILE } from './receipt-profile'
import type { ReplayExecutor, SyntheticDocumentRegistry } from './examine-document'

export function replayExecutor(table: ReplayTable = DEFAULT_REPLAY_TABLE): ReplayExecutor {
  return {
    identity: { mode: 'fixture_replay', replay_set: REPLAY_SET_VERSION },
    recordingFor(sha256: string) {
      const f = table.get(sha256)
      return f ? { fixture_id: f.fixture_id, parsed_output: f.parsed_output } : null
    },
  }
}

export function syntheticRegistry(table: ReplayTable = DEFAULT_REPLAY_TABLE): SyntheticDocumentRegistry {
  return { isSyntheticTestDocument: (sha256: string) => table.has(sha256) }
}

/** The registered profiles. DOC-2B: the receipt profile only. */
export function defaultProfileRegistry(): ProfileRegistry {
  return buildProfileRegistry([RECEIPT_PROFILE])
}
