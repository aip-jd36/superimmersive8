/**
 * Midjourney Extraction-Alias Defect fix (2026-09-07): 'midjourney' has been
 * a registered canonical CanonicalToolId and a CRC-eligible governed Matrix
 * authority since 2026-09-07, but had no KNOWN_TOOLS extraction alias --
 * the same reachability gap already fixed reactively for 'kling ai' and
 * "luma ai's dream machine" (see extraction.ts's own KNOWN_TOOLS comments).
 * A reported production interaction showed the question-generator naming
 * "Midjourney" by name in a follow-up question while the governed Matrix
 * authority was never reached, because buildRetrievalHandoff() only forwards
 * resolution.kind === 'canonical' mentions.
 *
 * Mirrors luma-runtime-retrieval.test.ts's own §I (LK-89) real-pipeline
 * pattern: exercises the REAL, unmodified extraction pipeline end-to-end
 * through retrieve() -> buildBoundedInterpretations(), not a synthetic
 * handoff that bypasses extraction. No live model needed -- pure functions
 * plus a mock candidate extractor.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { runExtractionPipeline, normalizeCandidate } from '@/lib/interview-engine/extraction'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { StructuredUnderstanding } from '@/types/interview-engine'

const MIDJOURNEY_ID = 'midjourney'

function emptySU(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

function midjourneyToolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'I used Midjourney to generate the images.',
    kind: 'tool_mention',
    raw_tool_name: 'Midjourney',
    ...overrides,
  }
}

// ── A. deterministic normalizeCandidate resolution (no LLM call) ─────────

describe('A: normalizeCandidate resolves ordinary Midjourney surface forms', () => {
  test.each(['Midjourney', 'midjourney', 'MIDJOURNEY'])('%s resolves canonically to midjourney', (raw) => {
    const result = normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: raw, raw_text: raw })
    expect(result).toEqual({ status: 'resolved', canonical_identifier: 'midjourney' })
  })

  test('an unrelated, genuinely unknown tool still fails closed (unrecognized), not silently canonicalized', () => {
    const result = normalizeCandidate({
      proposal_id: 'c1',
      turn: 1,
      kind: 'tool_mention',
      raw_tool_name: 'TotallyMadeUpToolXYZ',
      raw_text: 'I used TotallyMadeUpToolXYZ',
    })
    expect(result).toEqual({ status: 'unrecognized' })
  })

  test('an existing provider (Kling) is unaffected -- still resolves canonically', () => {
    const result = normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Kling', raw_text: 'I used Kling' })
    expect(result).toEqual({ status: 'resolved', canonical_identifier: 'kling' })
  })
})

// ── B. real-pipeline reproduction of the reported production expression ──

describe('B: real-pipeline reproduction -- Midjourney now reaches the governed Matrix claim end-to-end', () => {
  test('the exact reported opening expression now reaches the governed midjourney claim through the real, unmodified extraction pipeline', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Midjourney to generate the images. Can I use the resulting work commercially?' },
      constantExtractor([
        midjourneyToolCandidate(),
        {
          proposal_id: 'c2',
          turn: 1,
          raw_text: 'Can I use the resulting work commercially?',
          kind: 'user_goal',
          goal_confidence_hint: 'confirmed',
          goal_category_hint: 'commercial_use',
          goal_scope_hint: 'informational',
        },
      ]),
    )
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'midjourney' })

    const rHandoff = buildRetrievalHandoff(updated)
    expect(rHandoff.tools).toEqual([{ identifier: 'midjourney', access_surface: 'unresolved', plan_tier: 'unknown' }])
    expect(rHandoff.unresolved_aliases).toEqual([])

    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, [], facts)
    expect(out.results.map((r) => r.claim_id)).toContain(MIDJOURNEY_ID)

    // exactly one Midjourney authority, Matrix-origin, no duplicate
    const midjourneyResults = out.results.filter((r) => r.claim_id === MIDJOURNEY_ID)
    expect(midjourneyResults).toHaveLength(1)
    expect(midjourneyResults[0].match_origin).toBe('exact_topic')

    const interpretations = buildBoundedInterpretations(updated.user_goals, out.results, out.diagnostics)
    const interp = interpretations.find((i) => i.supporting_claim_ids.includes(MIDJOURNEY_ID))
    expect(interp?.status).toBe('directly_relevant')

    // corporate-revenue qualification/disclaimer remains present in the
    // bounded summary; no company-revenue status is inferred
    expect(interp?.summary).toContain('more than US$1 million in annual gross revenue')
    const forbidden = [
      /your (organization|company) (is|'s) below/i,
      /the threshold does not apply/i,
      /you (hold|have) (a |the )?corporate membership/i,
      /commercially cleared/i,
    ]
    for (const pattern of forbidden) {
      expect(interp?.summary).not.toMatch(pattern)
    }
  })

  test('no TopicClaim is fabricated -- MATRIX_FIXTURE has exactly one midjourney row with exactly one claim, general/educational shape', () => {
    const row = MATRIX_FIXTURE.find((r) => r.identifier === 'midjourney')
    expect(row).toBeDefined()
    expect(row!.claims).toHaveLength(1)
    expect(row!.claims[0].crc_eligible).toBe('Yes')
    expect(row!.claims[0].applicability_requirements).toEqual([])
  })

  test('an existing provider (Kling) is unaffected by the Midjourney alias addition -- still resolves canonically end-to-end', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Kling AI.' },
      constantExtractor([{ proposal_id: 'c1', turn: 1, raw_text: 'I used Kling AI.', kind: 'tool_mention', raw_tool_name: 'Kling AI' }]),
    )
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'kling' })
  })

  test('negative alias safety: a genuinely unknown tool mention does NOT resolve, and does not retrieve the Midjourney claim', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used SomeOtherToolNotRegistered.' },
      constantExtractor([
        { proposal_id: 'c1', turn: 1, raw_text: 'I used SomeOtherToolNotRegistered.', kind: 'tool_mention', raw_tool_name: 'SomeOtherToolNotRegistered' },
      ]),
    )
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'SomeOtherToolNotRegistered' })
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, [], facts)
    expect(out.results.map((r) => r.claim_id)).not.toContain(MIDJOURNEY_ID)
  })
})
