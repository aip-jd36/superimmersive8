/**
 * CRC-Active Tool Extraction Reachability Backstop + Gap Remediation
 * (2026-09-07): a dedicated reachability audit of every currently
 * CRC-active governed tool found that Pika (4 published TopicClaims) and
 * Synthesia (1 published TopicClaim) had ZERO KNOWN_TOOLS extraction
 * aliases -- the same failure class already hit and fixed reactively for
 * Kling, Luma's own observed phrase, Suno, and Midjourney -- and that Luma
 * itself was only PARTIALLY reachable: the LK-89 remediation covered only
 * the one exact observed production phrase ("Luma AI's Dream Machine"),
 * never the platform's ordinary name ("Luma", "Luma AI", "Dream Machine").
 *
 * Mirrors midjourney-extraction-alias.test.ts's own real-pipeline pattern:
 * exercises the REAL, unmodified extraction pipeline end-to-end through
 * retrieve() -> buildBoundedInterpretations(), not a synthetic handoff that
 * bypasses extraction. No live model needed -- pure functions plus a mock
 * candidate extractor.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { buildBoundedInterpretations as buildBoundedInterpretationsRaw } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'

// CAH-4G Slice 1 (2026-09-10): Bounded Interpretation's input contract
// generalized from `UserGoal[]` to the generic `BiIntent[]`. This local
// shim routes every pre-existing call in this suite through the real CRC
// adapter (`userGoalsToBiIntents` -- same active-and-confirmed filter BI
// used to apply inline) with ZERO other change, so this whole file doubles
// as the slice's zero-behavior-change equivalence check.
const buildBoundedInterpretations = (
  goals: Parameters<typeof userGoalsToBiIntents>[0],
  ...rest: [
    Parameters<typeof buildBoundedInterpretationsRaw>[1],
    Parameters<typeof buildBoundedInterpretationsRaw>[2]?,
    Parameters<typeof buildBoundedInterpretationsRaw>[3]?,
  ]
) => buildBoundedInterpretationsRaw(userGoalsToBiIntents(goals), ...rest)
import { runExtractionPipeline, normalizeCandidate } from '@/lib/interview-engine/extraction'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { StructuredUnderstanding } from '@/types/interview-engine'

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

function toolCandidate(rawName: string, rawText: string): CandidateObservation {
  return { proposal_id: 'c1', turn: 1, raw_text: rawText, kind: 'tool_mention', raw_tool_name: rawName }
}

async function runToolThenGoal(rawName: string, text: string) {
  return runExtractionPipeline(
    emptySU(),
    { turn: 1, text },
    constantExtractor([
      toolCandidate(rawName, text),
      {
        proposal_id: 'c2',
        turn: 1,
        raw_text: text,
        kind: 'user_goal',
        goal_confidence_hint: 'confirmed',
        goal_category_hint: 'commercial_use',
        goal_scope_hint: 'informational',
      },
    ]),
  )
}

// ── A. deterministic normalizeCandidate resolution (no LLM call) ─────────

describe('A: normalizeCandidate resolves ordinary surface forms for Pika, Synthesia, Luma', () => {
  test.each(['Pika', 'pika', 'PIKA'])('%s resolves canonically to pika', (raw) => {
    expect(normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: raw, raw_text: raw })).toEqual({
      status: 'resolved',
      canonical_identifier: 'pika',
    })
  })

  test.each(['Synthesia', 'synthesia', 'SYNTHESIA'])('%s resolves canonically to synthesia', (raw) => {
    expect(normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: raw, raw_text: raw })).toEqual({
      status: 'resolved',
      canonical_identifier: 'synthesia',
    })
  })

  test.each(['Luma', 'luma', 'Luma AI', 'Dream Machine', 'Luma Dream Machine', "Luma AI's Dream Machine"])(
    '%s resolves canonically to luma',
    (raw) => {
      expect(normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: raw, raw_text: raw })).toEqual({
        status: 'resolved',
        canonical_identifier: 'luma',
      })
    },
  )

  test('an unrelated, genuinely unknown tool still fails closed (unrecognized)', () => {
    expect(
      normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'TotallyMadeUpToolXYZ', raw_text: 'x' }),
    ).toEqual({ status: 'unrecognized' })
  })

  test('existing providers (Kling, Midjourney, Suno) are unaffected', () => {
    expect(normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Kling', raw_text: 'Kling' })).toEqual({
      status: 'resolved',
      canonical_identifier: 'kling',
    })
    expect(
      normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Midjourney', raw_text: 'Midjourney' }),
    ).toEqual({ status: 'resolved', canonical_identifier: 'midjourney' })
    expect(normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Suno', raw_text: 'Suno' })).toEqual({
      status: 'resolved',
      canonical_identifier: 'suno',
    })
  })

  test('no collision: Pika, Synthesia, and each Luma alias all resolve to their own distinct canonical identity, never to each other', () => {
    const cases: [string, string][] = [
      ['Pika', 'pika'],
      ['Synthesia', 'synthesia'],
      ['Luma', 'luma'],
      ['Luma AI', 'luma'],
      ['Dream Machine', 'luma'],
      ['Luma Dream Machine', 'luma'],
    ]
    for (const [raw, expected] of cases) {
      const r = normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: raw, raw_text: raw })
      expect(r).toEqual({ status: 'resolved', canonical_identifier: expected })
    }
  })
})

// ── B. real-pipeline end-to-end reachability ──────────────────────────────

describe('B: Pika -- real pipeline now reaches the governed TopicClaims end-to-end', () => {
  test('ordinary "Pika" reaches published governed claims through the real, unmodified extraction pipeline', async () => {
    const { updated } = await runToolThenGoal('Pika', 'I used Pika to generate a video. Can I use it commercially?')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'pika' })

    const rHandoff = buildRetrievalHandoff(updated)
    expect(rHandoff.unresolved_aliases).toEqual([])

    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)

    const pikaResults = out.results.filter((r) => r.claim_id.startsWith('CLAIM-PIKA-COMMERCIAL-USE-'))
    expect(pikaResults.length).toBeGreaterThan(0)
    // no duplicate/Matrix-origin authority: the legacy pika Matrix row is retired (crc_eligible: 'No')
    expect(out.results.filter((r) => r.claim_id === 'pika')).toHaveLength(0)

    const interpretations = buildBoundedInterpretations(updated.user_goals, out.results, out.diagnostics)
    expect(interpretations.some((i) => i.supporting_claim_ids.some((id) => id.startsWith('CLAIM-PIKA-COMMERCIAL-USE-')))).toBe(true)
  })

  test('closed-world plan-tier claims (Standard/Pro/Fancy) remain unaffected -- still gated on tool_plan_tier, not spontaneously all returned', async () => {
    const { updated } = await runToolThenGoal('Pika', 'I used Pika.')
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    const tierClaims = out.results.filter((r) => /PAID-PLAN-(STANDARD|PRO|FANCY)/.test(r.claim_id))
    // with no plan_tier fact supplied, none of the three closed-world tier claims should resolve applicable
    expect(tierClaims).toHaveLength(0)
  })

  test('MATRIX_FIXTURE pika row is retired (crc_eligible: No) -- confirms no duplicate authority is possible', () => {
    const row = MATRIX_FIXTURE.find((r) => r.identifier === 'pika')
    expect(row).toBeDefined()
    expect(row!.claims.every((c) => c.crc_eligible === 'No')).toBe(true)
  })
})

describe('C: Synthesia -- real pipeline now reaches the governed claim end-to-end', () => {
  test('ordinary "Synthesia" reaches the published governed claim through the real, unmodified extraction pipeline', async () => {
    const { updated } = await runToolThenGoal('Synthesia', 'I used Synthesia. Can I use it commercially?')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'synthesia' })

    const rHandoff = buildRetrievalHandoff(updated)
    expect(rHandoff.unresolved_aliases).toEqual([])

    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    expect(out.results.map((r) => r.claim_id)).toContain('CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1')

    const synthesiaResults = out.results.filter((r) => r.claim_id === 'CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1')
    expect(synthesiaResults).toHaveLength(1)
  })
})

describe('D: Luma -- ordinary naming now reaches the existing single authority, no duplicate', () => {
  test.each(['Luma', 'Luma AI', 'Dream Machine', 'Luma Dream Machine'])(
    'ordinary phrase "%s" now reaches the governed Luma Matrix claim (previously only the exact LK-89 phrase worked)',
    async (phrase) => {
      const { updated } = await runToolThenGoal(phrase, `I used ${phrase} to generate a video. Can I use it commercially?`)
      expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'luma' })

      const rHandoff = buildRetrievalHandoff(updated)
      const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
      const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)

      const lumaResults = out.results.filter((r) => r.claim_id === 'luma')
      expect(lumaResults).toHaveLength(1)
      expect(lumaResults[0].match_origin).toBe('exact_topic')
    },
  )
})

describe('E: cross-provider non-interference -- Kling/Midjourney/Suno unchanged by this remediation', () => {
  test('Kling still resolves and retrieves correctly end-to-end', async () => {
    const { updated } = await runToolThenGoal('Kling AI', 'I used Kling AI.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'kling' })
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    expect(out.results.some((r) => r.claim_id.startsWith('CLAIM-KLING-'))).toBe(true)
  })

  test('a genuinely unknown tool mention still does not resolve and does not leak into any of the remediated claims', async () => {
    const { updated } = await runToolThenGoal('SomeOtherToolNotRegistered', 'I used SomeOtherToolNotRegistered.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'SomeOtherToolNotRegistered' })
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    const claimIds = out.results.map((r) => r.claim_id)
    expect(claimIds.some((id) => id.includes('PIKA') || id === 'luma' || id.includes('SYNTHESIA'))).toBe(false)
  })
})
