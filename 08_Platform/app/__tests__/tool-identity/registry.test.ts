/**
 * Canonical Tool Identity Authority tests (LK-10, 2026-08-29). Proves the
 * registry's bootstrap population is correct and complete, and that
 * wiring extraction.ts's alias tables against it changed NOTHING observable
 * -- every existing alias, ambiguous-resolution, and unknown-tool behavior
 * is exercised black-box (via normalizeCandidate/attestCandidate, the same
 * exported surface extraction.test.ts already uses) rather than by reaching
 * into the still-private KNOWN_TOOLS/KNOWN_AMBIGUOUS_TOOLS tables, so these
 * tests would fail if the type-only integration had silently changed
 * behavior, not merely if it failed to compile.
 */

import { CANONICAL_TOOL_IDS, isCanonicalToolIdentity, type CanonicalToolId } from '@/lib/tool-identity/registry'
import { normalizeCandidate, attestCandidate, type CandidateObservation } from '@/lib/interview-engine/extraction'

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'I used it.',
    kind: 'tool_mention',
    ...overrides,
  }
}

// ── 1: bootstrap population ─────────────────────────────────────────────────

describe('CANONICAL_TOOL_IDS -- bootstrap population', () => {
  test('1: contains exactly the currently-evidenced union of KNOWN_TOOLS values, KNOWN_AMBIGUOUS_TOOLS candidates, and Matrix identifiers', () => {
    const expected: CanonicalToolId[] = [
      'runway-gen3',
      'kling',
      'elevenlabs',
      'gemini-api',
      'gemini-consumer-app',
      'pika',
      'midjourney',
      'google-veo',
      'adobe-firefly',
      'openai-sora',
    ]
    expect([...CANONICAL_TOOL_IDS].sort()).toEqual([...expected].sort())
  })

  test('isCanonicalToolIdentity is true for every registered id and false for an unregistered string', () => {
    for (const id of CANONICAL_TOOL_IDS) expect(isCanonicalToolIdentity(id)).toBe(true)
    expect(isCanonicalToolIdentity('not-a-real-tool')).toBe(false)
  })
})

// ── 2 & 3: KNOWN_TOOLS / KNOWN_AMBIGUOUS_TOOLS outputs are all valid registry identities ──

describe('extraction canonical outputs are all valid registry identities', () => {
  const KNOWN_ALIASES: { alias: string; expected: CanonicalToolId }[] = [
    { alias: 'runway', expected: 'runway-gen3' },
    { alias: 'runway gen-3', expected: 'runway-gen3' },
    { alias: 'runway gen 3', expected: 'runway-gen3' },
    { alias: 'kling', expected: 'kling' },
    { alias: 'kling ai', expected: 'kling' },
    { alias: 'elevenlabs', expected: 'elevenlabs' },
    { alias: 'eleven labs', expected: 'elevenlabs' },
  ]

  test('2: every KNOWN_TOOLS alias resolves to a canonical identifier present in the registry', () => {
    for (const { alias, expected } of KNOWN_ALIASES) {
      const result = normalizeCandidate(toolCandidate({ raw_tool_name: alias }))
      expect(result).toEqual({ status: 'resolved', canonical_identifier: expected })
      expect(isCanonicalToolIdentity(expected)).toBe(true)
    }
  })

  test('3: every KNOWN_AMBIGUOUS_TOOLS disambiguated candidate resolves to a canonical identifier present in the registry', () => {
    const apiResult = normalizeCandidate(toolCandidate({ raw_tool_name: 'nano banana', raw_text: 'I used the API key for it.' }))
    expect(apiResult).toEqual({ status: 'resolved', canonical_identifier: 'gemini-api', access_surface: 'API' })
    expect(isCanonicalToolIdentity('gemini-api')).toBe(true)

    const consumerResult = normalizeCandidate(toolCandidate({ raw_tool_name: 'nano banana', raw_text: 'I used it on my phone.' }))
    expect(consumerResult).toEqual({ status: 'resolved', canonical_identifier: 'gemini-consumer-app', access_surface: 'Consumer App' })
    expect(isCanonicalToolIdentity('gemini-consumer-app')).toBe(true)
  })
})

// ── 4: extraction behavior is unchanged for all existing aliases ───────────

describe('4: extraction behavior unchanged for existing aliases end-to-end (attestCandidate)', () => {
  test('a canonical alias produces a confirmed, canonical ToolMention exactly as before', () => {
    const candidate = toolCandidate({ raw_tool_name: 'kling ai', raw_text: 'I used Kling AI.' })
    const normalization = normalizeCandidate(candidate)
    const fact = attestCandidate(candidate, normalization)
    expect(fact).toMatchObject({
      kind: 'tool_mention',
      mention: {
        resolution: { kind: 'canonical', identifier: 'kling' },
        confidence: 'confirmed',
      },
    })
  })
})

// ── 5: unknown-tool behavior remains unresolved_alias ───────────────────────

describe('5: unknown-tool behavior', () => {
  test('an unrecognized tool name normalizes to unrecognized and attests as an unresolved_alias', () => {
    const candidate = toolCandidate({ raw_tool_name: 'Some Brand New Tool', raw_text: 'I used Some Brand New Tool.' })
    const normalization = normalizeCandidate(candidate)
    expect(normalization).toEqual({ status: 'unrecognized' })
    const fact = attestCandidate(candidate, normalization)
    expect(fact).toMatchObject({
      kind: 'tool_mention',
      mention: { resolution: { kind: 'unresolved_alias', raw_name: 'Some Brand New Tool' }, confidence: 'unresolved_no_visibility' },
    })
  })
})

// ── 6: ambiguous-tool behavior unchanged ────────────────────────────────────

describe('6: ambiguous-tool behavior unchanged', () => {
  test('zero matching access-method phrases stays known_ambiguous', () => {
    const result = normalizeCandidate(toolCandidate({ raw_tool_name: 'nano banana', raw_text: 'I used Nano Banana for this.' }))
    expect(result).toEqual({ status: 'known_ambiguous', candidate_identifiers: ['gemini-api', 'gemini-consumer-app'] })
  })

  test('contradictory (multiple) matching phrases in the same turn stays known_ambiguous, never guessed', () => {
    const result = normalizeCandidate(
      toolCandidate({ raw_tool_name: 'nano banana', raw_text: 'I used the API key, on my phone via the app.' }),
    )
    expect(result).toEqual({ status: 'known_ambiguous', candidate_identifiers: ['gemini-api', 'gemini-consumer-app'] })
  })
})

// ── 7: registry membership alone never makes a tool extraction-reachable ──

describe('7: registry membership does not create extraction reachability', () => {
  test.each(['pika', 'midjourney', 'google-veo', 'adobe-firefly', 'openai-sora'] as const)(
    '%s is a registered canonical identity but has NO extraction alias -- still normalizes to unrecognized',
    (id) => {
      expect(isCanonicalToolIdentity(id)).toBe(true)
      const result = normalizeCandidate(toolCandidate({ raw_tool_name: id, raw_text: `I used ${id}.` }))
      expect(result).toEqual({ status: 'unrecognized' })
    },
  )
})

// ── 8: RetrievalHandoffTool.identifier outputs remain unchanged ────────────

describe('8: RetrievalHandoffTool.identifier unchanged', () => {
  test('a canonical ToolMention still produces the identical identifier string through the (untouched) handoff builder', async () => {
    const { buildRetrievalHandoff } = await import('@/lib/interview-engine/handoff')
    const { emptyStructuredUnderstanding } = await import('@/lib/interview-engine/eval/empty-structured-understanding')
    const base = emptyStructuredUnderstanding()
    const understanding = {
      ...base,
      tool_mentions: [
        {
          mention_id: 't1-c1',
          resolution: { kind: 'canonical' as const, identifier: 'runway-gen3' as CanonicalToolId },
          access_surface: { state: 'unknown' as const },
          plan_tier: { state: 'unknown' as const },
          account_status: { state: 'unknown' as const },
          confidence: 'confirmed' as const,
          source_turn: 1,
          source_statement: 'I used Runway.',
          superseded_by: null,
        },
      ],
    }
    const handoff = buildRetrievalHandoff(understanding)
    expect(handoff.tools).toEqual([{ identifier: 'runway-gen3', access_surface: 'unresolved', plan_tier: 'unknown' }])
  })
})
