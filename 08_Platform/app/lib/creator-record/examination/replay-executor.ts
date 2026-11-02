/**
 * CR-V2-DOC-2B — the replay executor and the known-fixture registry, from SI8's committed replay set.
 *
 * Both read the same committed table that DOC-1 intake already uses to recognise synthetic fixture bytes
 * (`lib/creator-record-flow/evidence-production.ts`). Neither accepts anything from a request. Replay is
 * recorded test data, never model output.
 *
 * The registry answers a CONTENT question only: are these bytes one of SI8's committed fixtures? The fixture
 * generator is public, so recognised bytes establish no authority over who uploaded them or why
 * (CR-V2-DOC-2B-IDENTITY-1).
 */

import { DEFAULT_REPLAY_TABLE, REPLAY_SET_VERSION, type ReplayTable } from '../evidence/replay'
import { buildProfileRegistry, type ProfileRegistry } from './profile'
import { RECEIPT_PROFILE } from './receipt-profile'
import type { KnownFixtureRegistry, ReplayExecutor } from './examine-document'

/** The executor's static identity. The recorded-output digest is added per examination by the core. */
export function replayExecutor(table: ReplayTable = DEFAULT_REPLAY_TABLE): ReplayExecutor {
  return {
    identity: { mode: 'fixture_replay', replay_set: REPLAY_SET_VERSION },
    recordingFor(sha256: string) {
      const f = table.get(sha256)
      return f ? { fixture_id: f.fixture_id, parsed_output: f.parsed_output } : null
    },
  }
}

export function knownFixtureRegistry(table: ReplayTable = DEFAULT_REPLAY_TABLE): KnownFixtureRegistry {
  return { isKnownSyntheticFixture: (sha256: string) => table.has(sha256) }
}

/** The registered profiles. DOC-2B: the receipt profile only. */
export function defaultProfileRegistry(): ProfileRegistry {
  return buildProfileRegistry([RECEIPT_PROFILE])
}
