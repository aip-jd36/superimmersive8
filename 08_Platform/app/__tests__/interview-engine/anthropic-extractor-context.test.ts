/**
 * buildUserMessageContent deterministic unit test (Live Interview Runtime
 * milestone -- Option D3 wiring into anthropic-extractor.ts). Deliberately
 * scoped to this one pure helper, not the adapter's live-model call --
 * anthropic-extractor.ts has never had a unit test file (confirmed before
 * adding this one), consistent with this project's standing discipline of
 * never exercising a live model inside a deterministic test suite. This
 * one function is pure and new, so it's tested in isolation.
 */

import { buildUserMessageContent } from '@/lib/interview-engine/anthropic-extractor'
import type { RawUserTurn } from '@/lib/interview-engine/extraction'

describe('buildUserMessageContent', () => {
  test('no pending_clarification -> returns turn.text unchanged, byte-for-byte', () => {
    const turn: RawUserTurn = { turn: 1, text: 'We used Runway.' }
    expect(buildUserMessageContent(turn)).toBe('We used Runway.')
  })

  test('pending_clarification present -> prepends a deterministic context prefix built only from unresolved_summary', () => {
    const turn: RawUserTurn = {
      turn: 2,
      text: 'The API one.',
      pending_clarification: { signal_id: 'tm-1', kind: 'follow_up_on_signal', unresolved_summary: "tool mention 'Nano Banana', not yet resolved to a specific platform" },
    }
    const content = buildUserMessageContent(turn)
    expect(content).toContain("tool mention 'Nano Banana', not yet resolved to a specific platform")
    expect(content).toContain('The API one.')
    expect(content.endsWith('The API one.')).toBe(true)
  })

  test('null pending_clarification -> same as absent, returns turn.text unchanged', () => {
    const turn: RawUserTurn = { turn: 1, text: 'Kling.', pending_clarification: null }
    expect(buildUserMessageContent(turn)).toBe('Kling.')
  })
})
