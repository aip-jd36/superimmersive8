/**
 * Gemini API Extraction / Runtime Reachability Remediation (2026-09-08):
 * 'gemini-api' became a CRC-active governed Matrix authority (Evidence
 * Limitation / Non-Determination Proposition, CRC eligibility APPROVE) but
 * had zero KNOWN_TOOLS coverage -- "Gemini API," "Gemini Developer API,"
 * and bare "Gemini" all resolved unrecognized, and only "Nano Banana"
 * phrasings reached governed knowledge via the existing API-vs-Consumer-App
 * disambiguation. This is the same reachability-gap class already hit and
 * fixed for Kling, Luma, Pika, Synthesia, and Midjourney.
 *
 * Mirrors crc-active-reachability-remediation.test.ts's own real-pipeline
 * pattern: exercises the REAL, unmodified extraction pipeline end-to-end
 * through retrieve(), not a synthetic handoff that bypasses extraction. No
 * live model needed -- pure functions plus a mock candidate extractor.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
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

describe('A: normalizeCandidate resolves explicit Gemini API naming', () => {
  test.each(['Gemini API', 'gemini api', 'GEMINI API', 'Gemini Developer API', 'gemini developer api'])(
    '%s resolves canonically to gemini-api',
    (raw) => {
      expect(normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: raw, raw_text: raw })).toEqual({
        status: 'resolved',
        canonical_identifier: 'gemini-api',
      })
    },
  )

  test('bare "Gemini" remains unrecognized -- intentional, evidenced ambiguity, not a defect', () => {
    expect(normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Gemini', raw_text: 'Gemini' })).toEqual({
      status: 'unrecognized',
    })
  })

  test('"Gemini app" names the Consumer App surface -- must NOT resolve to gemini-api (updated 2026-09-09: resolves to gemini-consumer-app since its own CPR APPROVE + reachability remediation, LK-TRIAL-11 -- was `unrecognized` while that row was Pending)', () => {
    const r = normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Gemini app', raw_text: 'Gemini app' })
    expect(r).toEqual({ status: 'resolved', canonical_identifier: 'gemini-consumer-app' })
    // the governing invariant of this test is unchanged: "Gemini app" is not the API
    expect(r).not.toEqual({ status: 'resolved', canonical_identifier: 'gemini-api' })
  })

  test('"Vertex AI" remains unrecognized -- separate deferred contractual scope, no row, must not resolve to gemini-api', () => {
    expect(
      normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Vertex AI', raw_text: 'Vertex AI' }),
    ).toEqual({ status: 'unrecognized' })
  })

  test('existing Nano Banana disambiguation is unaffected by this change', () => {
    expect(
      normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Nano Banana', raw_text: 'I used Nano Banana for this.' }),
    ).toEqual({ status: 'known_ambiguous', candidate_identifiers: ['gemini-api', 'gemini-consumer-app'] })

    expect(
      normalizeCandidate({
        proposal_id: 'c1',
        turn: 1,
        kind: 'tool_mention',
        raw_tool_name: 'Nano Banana',
        raw_text: 'I used Nano Banana through the API, developer key.',
      }),
    ).toEqual({ status: 'resolved', canonical_identifier: 'gemini-api', access_surface: 'API' })
  })

  test('an unrelated, genuinely unknown tool still fails closed (unrecognized)', () => {
    expect(
      normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'TotallyMadeUpToolXYZ', raw_text: 'x' }),
    ).toEqual({ status: 'unrecognized' })
  })

  test('existing providers (Kling, Midjourney, Pika, Synthesia, Luma) are unaffected', () => {
    expect(normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Kling', raw_text: 'Kling' })).toEqual({
      status: 'resolved',
      canonical_identifier: 'kling',
    })
    expect(
      normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Midjourney', raw_text: 'Midjourney' }),
    ).toEqual({ status: 'resolved', canonical_identifier: 'midjourney' })
    expect(normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Pika', raw_text: 'Pika' })).toEqual({
      status: 'resolved',
      canonical_identifier: 'pika',
    })
    expect(
      normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Synthesia', raw_text: 'Synthesia' }),
    ).toEqual({ status: 'resolved', canonical_identifier: 'synthesia' })
    expect(normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Luma', raw_text: 'Luma' })).toEqual({
      status: 'resolved',
      canonical_identifier: 'luma',
    })
  })

  test('no collision: "Gemini API" and "Gemini Developer API" both resolve to gemini-api only, never to gemini-consumer-app or any other identity', () => {
    const cases: [string, string][] = [
      ['Gemini API', 'gemini-api'],
      ['Gemini Developer API', 'gemini-api'],
    ]
    for (const [raw, expected] of cases) {
      const r = normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: raw, raw_text: raw })
      expect(r).toEqual({ status: 'resolved', canonical_identifier: expected })
    }
  })
})

// ── B. real-pipeline end-to-end reachability ──────────────────────────────

describe('B: Gemini API -- real pipeline now reaches the governed Matrix authority end-to-end', () => {
  test.each(['Gemini API', 'Gemini Developer API'])(
    'ordinary "%s" reaches the published governed Matrix claim through the real, unmodified extraction pipeline',
    async (phrase) => {
      const { updated } = await runToolThenGoal(phrase, `I used ${phrase} to generate images. Can I use it commercially?`)
      expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'gemini-api' })

      const rHandoff = buildRetrievalHandoff(updated)
      expect(rHandoff.unresolved_aliases).toEqual([])

      const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
      const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)

      const geminiResults = out.results.filter((r) => r.claim_id === 'gemini-api')
      expect(geminiResults).toHaveLength(1)
      expect(geminiResults[0].match_origin).toBe('exact_topic')

      // No TopicClaim authority exists for gemini-api -- Matrix-origin only.
      expect(out.results.filter((r) => r.claim_id.startsWith('CLAIM-GEMINI'))).toHaveLength(0)
      // No Consumer App bleed.
      expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(false)
    },
  )

  test('the evidence-limitation / non-determination proposition text survives unchanged through Retrieval', async () => {
    const { updated } = await runToolThenGoal('Gemini API', 'I used Gemini API. Can I use it commercially?')
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    const result = out.results.find((r) => r.claim_id === 'gemini-api')
    expect(result).toBeDefined()
    const text = JSON.stringify(result)
    // Reachability must not have strengthened the proposition -- the
    // governed hedge must survive verbatim, and no bare affirmative or
    // prohibitive commercial-use conclusion may appear.
    expect(text).toMatch(/neither an affirmative commercial-use grant nor an explicit commercial-use (restriction|prohibition)/i)
    expect(text).not.toMatch(/gemini api output may be used commercially/i)
    expect(text).not.toMatch(/gemini api output may not be used commercially/i)
    expect(text).not.toMatch(/gemini api (prohibits|allows) commercial use/i)
  })

  test('MATRIX_FIXTURE gemini-consumer-app row was Pending at the time of this 2026-09-08 remediation -- unaffected by it (its own separate CPR APPROVE, 2026-09-09, changed this afterward and is out of this test file\'s own historical scope)', () => {
    const row = MATRIX_FIXTURE.find((r) => r.identifier === 'gemini-consumer-app')
    expect(row).toBeDefined()
    // Updated 2026-09-09: gemini-consumer-app's own CPR APPROVE decision set
    // crc_eligible to Yes -- this file's own extraction-reachability
    // remediation (2026-09-08) never touched it either way; both facts
    // coexist without contradiction.
    expect(row!.claims.every((c) => c.crc_eligible === 'Yes')).toBe(true)
  })
})

describe('C: cross-provider non-interference -- Kling/Midjourney/Pika/Synthesia/Luma unchanged by this remediation', () => {
  test('Kling still resolves and retrieves correctly end-to-end', async () => {
    const { updated } = await runToolThenGoal('Kling AI', 'I used Kling AI.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'kling' })
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    expect(out.results.some((r) => r.claim_id.startsWith('CLAIM-KLING-'))).toBe(true)
  })

  test('Pika still resolves and retrieves correctly end-to-end', async () => {
    const { updated } = await runToolThenGoal('Pika', 'I used Pika.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'pika' })
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    expect(out.results.some((r) => r.claim_id.startsWith('CLAIM-PIKA-COMMERCIAL-USE-'))).toBe(true)
  })

  test('a genuinely unknown tool mention still does not resolve and does not leak into the gemini-api claim', async () => {
    const { updated } = await runToolThenGoal('SomeOtherToolNotRegistered', 'I used SomeOtherToolNotRegistered.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'SomeOtherToolNotRegistered' })
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    expect(out.results.some((r) => r.claim_id === 'gemini-api')).toBe(false)
  })
})
