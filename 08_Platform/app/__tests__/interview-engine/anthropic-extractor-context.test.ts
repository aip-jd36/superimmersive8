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

  test('current_human_contribution_description present -> prepends a deterministic context prefix quoting the confirmed value verbatim (Copyright UAT Cumulative-Restatement Fix, 2026-08-19)', () => {
    const turn: RawUserTurn = {
      turn: 5,
      text: 'I sourced everything else on my end.',
      current_human_contribution_description: 'I selected the takes and arranged the sequence. I also edited it as well.',
    }
    const content = buildUserMessageContent(turn)
    expect(content).toContain('I selected the takes and arranged the sequence. I also edited it as well.')
    expect(content).toContain('I sourced everything else on my end.')
    expect(content.endsWith('I sourced everything else on my end.')).toBe(true)
  })

  test('current_human_contribution_description null/absent -> no context line added, same as before this fix', () => {
    const turn: RawUserTurn = { turn: 1, text: 'Kling.', current_human_contribution_description: null }
    expect(buildUserMessageContent(turn)).toBe('Kling.')
  })

  test('both pending_clarification and current_human_contribution_description present -> both context lines composed, each independently, text last', () => {
    const turn: RawUserTurn = {
      turn: 6,
      text: 'The API one.',
      pending_clarification: { signal_id: 'tm-1', kind: 'follow_up_on_signal', unresolved_summary: "tool mention 'Nano Banana', not yet resolved to a specific platform" },
      current_human_contribution_description: 'I selected the takes and arranged the sequence.',
    }
    const content = buildUserMessageContent(turn)
    expect(content).toContain("tool mention 'Nano Banana'")
    expect(content).toContain('I selected the takes and arranged the sequence.')
    expect(content.endsWith('The API one.')).toBe(true)
  })

  // Second-Jurisdiction UX milestone (2026-08-20), J1; context-prefix text
  // generalized by the Assessment-Jurisdiction Mention Model (2026-08-28) --
  // was Copyright-only/country-only wording, now scope-general.
  test('answering_jurisdiction_question: true -> prepends a deterministic, fixed context line', () => {
    const turn: RawUserTurn = { turn: 2, text: 'My client is in the US.', answering_jurisdiction_question: true }
    const content = buildUserMessageContent(turn)
    expect(content).toContain('directly asked the user which jurisdiction(s) CRC should consider for this assessment')
    expect(content).toContain('My client is in the US.')
    expect(content.endsWith('My client is in the US.')).toBe(true)
  })

  test('answering_jurisdiction_question: false -> no context line added, byte-identical to turn.text', () => {
    const turn: RawUserTurn = { turn: 1, text: 'My client is in the US.', answering_jurisdiction_question: false }
    expect(buildUserMessageContent(turn)).toBe('My client is in the US.')
  })

  test('answering_jurisdiction_question absent -> same as false, no context line', () => {
    const turn: RawUserTurn = { turn: 1, text: 'My client is in the US.' }
    expect(buildUserMessageContent(turn)).toBe('My client is in the US.')
  })

  test('all three context lines can compose together, independently, text always last', () => {
    const turn: RawUserTurn = {
      turn: 7,
      text: 'United States.',
      pending_clarification: { signal_id: 'tm-1', kind: 'follow_up_on_signal', unresolved_summary: "tool mention 'Nano Banana'" },
      current_human_contribution_description: 'I selected the takes.',
      answering_jurisdiction_question: true,
    }
    const content = buildUserMessageContent(turn)
    expect(content).toContain("tool mention 'Nano Banana'")
    expect(content).toContain('I selected the takes.')
    expect(content).toContain('directly asked the user which jurisdiction(s) CRC should consider for this assessment')
    expect(content.endsWith('United States.')).toBe(true)
  })

  // CRC Content-Presence Mention Model (2026-08-28). Generic plumbing only
  // -- no production caller sets this flag in this milestone (see
  // RawUserTurn's own doc comment); this proves the mechanism itself works
  // correctly for a future caller, without rewriting the literal turn text.
  test('answering_content_presence_question: true -> prepends a deterministic, fixed context line, without rewriting the literal reply', () => {
    const turn: RawUserTurn = { turn: 2, text: 'Yes.', answering_content_presence_question: true }
    const content = buildUserMessageContent(turn)
    expect(content).toContain('directly asked the user whether the project\'s output contains a recognizable real person\'s image or voice')
    expect(content).toContain('Yes.')
    expect(content.endsWith('Yes.')).toBe(true)
  })

  test('answering_content_presence_question: false -> no context line added, byte-identical to turn.text', () => {
    const turn: RawUserTurn = { turn: 1, text: 'Yes.', answering_content_presence_question: false }
    expect(buildUserMessageContent(turn)).toBe('Yes.')
  })

  test('answering_content_presence_question absent -> same as false, no context line', () => {
    const turn: RawUserTurn = { turn: 1, text: 'Yes.' }
    expect(buildUserMessageContent(turn)).toBe('Yes.')
  })
})
