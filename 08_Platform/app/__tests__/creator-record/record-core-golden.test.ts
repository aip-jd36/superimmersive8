/**
 * CR-V2-1A — the CR-V2-1 extraction of canonical JSON and the projection
 * combinators into record-core/ changed no output.
 *
 * The hashes below were computed by the pre-extraction code at commit 0368a1f2
 * (OC-1B), run from a read-only copy of that commit, on exactly these inputs.
 * The current code must reproduce them. If pilot data or the governed claim
 * fixture changes, these change too: re-derive them deliberately from the
 * pre-extraction code rather than copying the new values.
 */

import { createHash } from 'node:crypto'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { buildReplayTable, type ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { buildInternalDraftSnapshot } from '@/lib/creator-record/internal-draft/snapshot'
import { InternalDraftProjectionError, projectPermittedDraft } from '@/lib/creator-record/internal-draft/projection'
import { buildCreatorRecordDraft, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const RECORD = { record_id: 'PROTOTYPE-GOLDEN', record_version: 1, captured_at: '2026-10-31T00:00:00Z' }
const ANS = { P1: ['Golden synthetic video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
async function doc(id: string, tool_index: number) {
  const bytes = new Uint8Array([...PNG, ...Buffer.from(`synthetic:${id}`)])
  const f = REPLAY_FIXTURES.find((x) => x.fixture_id === id)!
  return { tool_index, document: await examineUpload(bytes, `${id}.png`, { mode: 'fixture_replay', replayTable: buildReplayTable([{ ...f, sha256: sha(bytes) } as ReplayFixture]) }) }
}
const tool = (t: string, p: string) => ({ T1: [t], T3: [p], T4: ['May 2026'] })
const st = (...tools: ReturnType<typeof tool>[]) => ({ answers: ANS, tools, acknowledgements: { A1: true, A2: true } })

/** From 0368a1f2 (pre-extraction). */
const GOLDEN = {
  'pika-pro-no-docs': '5be37e2ae14ca0a2cd2afbcc1e9ce850008aa766992a2bd59d134f6faa441f42',
  'kling-standard-no-docs': 'd7ed69d03cc9c9da45bb490024793b14374d058378d1bca78e4a73c610703c50',
  'pika-pro-one-doc': 'b99ef135cf3bed1319b782fd03a545987b600b2f4861de653a253dc512be9b3a',
  'two-tools-two-docs': 'be46e51665ceeea59c337efc4841f67b4580103b7ca671d9abb1a57bc30f3c51',
  'canonical-sample': 'dd5e19a32d80a2ee588a0925d22bff2ce021df5df0a30b34e7b40a827254f244',
}

test('internal draft snapshots hash exactly as before the extraction', async () => {
  const cases: [keyof typeof GOLDEN, ReturnType<typeof st>, Awaited<ReturnType<typeof doc>>[]][] = [
    ['pika-pro-no-docs', st(tool('pika', 'Pro')), []],
    ['kling-standard-no-docs', st(tool('kling', 'Standard')), []],
    ['pika-pro-one-doc', st(tool('pika', 'Pro')), [await doc('shot-pika-multiple-payments', 0)]],
    ['two-tools-two-docs', st(tool('pika', 'Standard'), tool('kling', 'Pro')), [await doc('shot-pika-multiple-payments', 0), await doc('pdf-kling-pro-monthly', 1)]],
  ]
  for (const [name, state, documents] of cases) {
    const r = buildInternalDraftSnapshot({ state, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-31', record: RECORD, documents })
    expect([name, r.ok ? r.sha256 : 'FAILED']).toEqual([name, GOLDEN[name]])
  }
})

test('canonical JSON is unchanged (key order, unicode, negative and nested values)', () => {
  const sample = { b: [1, 'é', { z: null, a: true }], a: -0.5, 'ä': ' ', '': 'x' }
  expect(canonicalJson(sample)).toBe('{"":"x","a":-0.5,"b":[1,"é",{"a":true,"z":null}],"ä":" "}')
  expect(sha256Hex(canonicalJson(sample))).toBe(GOLDEN['canonical-sample'])
})

test('a projection refusal is still reported as the internal draft error, with the same message', () => {
  const r = buildCreatorRecordDraft({ state: st(tool('pika', 'Pro')), sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-31', record: RECORD })
  if (!r.ok) throw new Error('draft failed')
  const view = { ...r.view, new_comparison_field: [] } as unknown as typeof r.view
  expect(() => projectPermittedDraft(view, [])).toThrow(InternalDraftProjectionError)
  expect(() => projectPermittedDraft(view, [])).toThrow('internal_draft_projection_refused: view.new_comparison_field: unsupported field')
})
