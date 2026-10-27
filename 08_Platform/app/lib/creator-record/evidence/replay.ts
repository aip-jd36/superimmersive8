/**
 * CR-V2-EVIDENCE-SLICE-1 — deterministic fixture replay.
 *
 * When live extraction is off (the default), a document is "examined" only if
 * its exact bytes are one of SI8's own synthetic receipt fixtures: the
 * fixture's recorded ground-truth extraction is replayed through the real
 * examination path (byte checks, schema validation) with zero model calls.
 * Any other file is reported as provided but not examined.
 *
 * Replay is RECORDED TEST DATA. It is labelled `fixture_replay` everywhere
 * and is never evidence that extraction works on any document.
 */

import { REPLAY_FIXTURES, REPLAY_SPEC_VERSION } from './replay-fixtures.data'

export interface ReplayFixture {
  fixture_id: string
  sha256: string
  media_type: string
  /** Ground truth in the model's output shape (validated again on every replay). */
  parsed_output: unknown
}

export const REPLAY_SET_VERSION = `${REPLAY_SPEC_VERSION}/oracle-replay`

export type ReplayTable = ReadonlyMap<string, ReplayFixture>

export function buildReplayTable(entries: readonly ReplayFixture[]): ReplayTable {
  const m = new Map<string, ReplayFixture>()
  for (const e of entries) {
    if (m.has(e.sha256)) throw new Error(`duplicate replay fixture hash ${e.sha256}`)
    m.set(e.sha256, e)
  }
  return m
}

export const DEFAULT_REPLAY_TABLE: ReplayTable = buildReplayTable(REPLAY_FIXTURES)
