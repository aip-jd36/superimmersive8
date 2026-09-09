/**
 * Gemini API Extraction Identity Preservation (2026-09-08).
 *
 * Live production UAT (session 97f2ccb7, runtime_commit edf790e -- the exact
 * commit that added the 'gemini api'/'gemini developer api' KNOWN_TOOLS
 * aliases) showed the fix from that commit never actually firing: the real
 * extractor split "the Gemini API" into raw_tool_name: "Gemini" plus a
 * SEPARATE attributes.access_surface: "API" entry, so the compound string
 * "Gemini API" never existed anywhere downstream of extraction, and
 * normalizeCandidate's exact-match lookup against KNOWN_TOOLS never had a
 * chance to match.
 *
 * These tests exercise the real extraction-to-normalization path with
 * candidates SHAPED LIKE THE REAL PRODUCTION DATA -- raw_tool_name and
 * access_surface_value_hint as two separate fields on the same candidate,
 * never a single pre-combined "Gemini API" string -- which is exactly the
 * shape gemini-api-extraction-reachability.test.ts's Section A did NOT
 * cover (it only ever passed the compound string directly as
 * raw_tool_name, which is why the underlying defect shipped undetected).
 */

import { normalizeCandidate, runExtractionPipeline } from '@/lib/interview-engine/extraction'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
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

/** Mirrors the REAL production shape: raw_tool_name and access_surface are two separate structured fields, never pre-combined. */
function splitToolCandidate(rawToolName: string, accessSurfaceValue: string | undefined, rawText: string): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: rawText,
    kind: 'tool_mention',
    raw_tool_name: rawToolName,
    ...(accessSurfaceValue ? { access_surface_confidence_hint: 'confirmed' as const, access_surface_value_hint: accessSurfaceValue } : {}),
  }
}

async function runSplitToolThenGoal(rawToolName: string, accessSurfaceValue: string | undefined, text: string) {
  return runExtractionPipeline(
    emptySU(),
    { turn: 1, text },
    constantExtractor([
      splitToolCandidate(rawToolName, accessSurfaceValue, text),
      { proposal_id: 'c2', turn: 1, raw_text: text, kind: 'user_goal', goal_confidence_hint: 'confirmed', goal_category_hint: 'commercial_use', goal_scope_hint: 'informational' },
    ]),
  )
}

// ── A. deterministic normalizeCandidate resolution on the real split shape ──

describe('A: normalizeCandidate reconstructs compound identity from split raw_tool_name + access_surface', () => {
  test('the exact real production shape: raw_tool_name "Gemini" + access_surface "API" resolves to gemini-api', () => {
    expect(
      normalizeCandidate({
        proposal_id: 'c1',
        turn: 1,
        kind: 'tool_mention',
        raw_tool_name: 'Gemini',
        raw_text: 'using the Gemini API',
        access_surface_confidence_hint: 'confirmed',
        access_surface_value_hint: 'API',
      }),
    ).toEqual({ status: 'resolved', canonical_identifier: 'gemini-api', access_surface: 'API' })
  })

  test('access_surface value with a leading article ("the API") still resolves -- article stripped deterministically', () => {
    expect(
      normalizeCandidate({
        proposal_id: 'c1',
        turn: 1,
        kind: 'tool_mention',
        raw_tool_name: 'Gemini',
        raw_text: 'using the Gemini API',
        access_surface_confidence_hint: 'confirmed',
        access_surface_value_hint: 'the API',
      }),
    ).toEqual({ status: 'resolved', canonical_identifier: 'gemini-api', access_surface: 'the API' })
  })

  test('split "Gemini Developer" + access_surface "API" also resolves to gemini-api', () => {
    expect(
      normalizeCandidate({
        proposal_id: 'c1',
        turn: 1,
        kind: 'tool_mention',
        raw_tool_name: 'Gemini Developer',
        raw_text: 'using the Gemini Developer API',
        access_surface_confidence_hint: 'confirmed',
        access_surface_value_hint: 'API',
      }),
    ).toEqual({ status: 'resolved', canonical_identifier: 'gemini-api', access_surface: 'API' })
  })

  test('bare "Gemini" with NO access_surface hint remains unrecognized -- genuine ambiguity, not a defect', () => {
    expect(
      normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: 'Gemini', raw_text: 'I use Gemini.' }),
    ).toEqual({ status: 'unrecognized' })
  })

  test('an unmatched compound (raw_tool_name + access_surface that names no real product) falls through to unrecognized, never guessed', () => {
    expect(
      normalizeCandidate({
        proposal_id: 'c1',
        turn: 1,
        kind: 'tool_mention',
        raw_tool_name: 'TotallyMadeUpToolXYZ',
        raw_text: 'x',
        access_surface_confidence_hint: 'confirmed',
        access_surface_value_hint: 'API',
      }),
    ).toEqual({ status: 'unrecognized' })
  })
})

// ── C. an already-resolving provider must not acquire a spurious "API" identity ──

describe('C: existing providers with a separately-stated access_surface are unaffected', () => {
  test('Kling + access_surface "API" (e.g. "I used Kling through its API") still resolves to plain kling, never a corrupted compound', () => {
    expect(
      normalizeCandidate({
        proposal_id: 'c1',
        turn: 1,
        kind: 'tool_mention',
        raw_tool_name: 'Kling',
        raw_text: "I'm using Kling through its API.",
        access_surface_confidence_hint: 'confirmed',
        access_surface_value_hint: 'API',
      }),
    ).toEqual({ status: 'resolved', canonical_identifier: 'kling' })
    // Reason this is safe by construction: the direct KNOWN_TOOLS lookup for
    // "kling" already succeeds before the compound-reconstruction fallback
    // ever runs, so a nonexistent "kling api" identity is never attempted.
  })

  test('Midjourney + access_surface "API" still resolves to plain midjourney', () => {
    expect(
      normalizeCandidate({
        proposal_id: 'c1',
        turn: 1,
        kind: 'tool_mention',
        raw_tool_name: 'Midjourney',
        raw_text: 'Midjourney, via the API.',
        access_surface_confidence_hint: 'confirmed',
        access_surface_value_hint: 'API',
      }),
    ).toEqual({ status: 'resolved', canonical_identifier: 'midjourney' })
  })
})

// ── E. scope protection ───────────────────────────────────────────────────

describe('E: Consumer App / Vertex AI scope protection', () => {
  test('"Gemini" + access_surface "app" resolves to gemini-consumer-app -- NEVER gemini-api (updated 2026-09-09, LK-TRIAL-11: "gemini app" gained a KNOWN_TOOLS entry -> gemini-consumer-app once that Matrix row became CRC-active; the compound reconstruction correctly routes the Consumer App surface. The governing invariant of this test -- "not the API" -- is unchanged.)', () => {
    const r = normalizeCandidate({
      proposal_id: 'c1',
      turn: 1,
      kind: 'tool_mention',
      raw_tool_name: 'Gemini',
      raw_text: 'the Gemini app on my phone',
      access_surface_confidence_hint: 'confirmed',
      access_surface_value_hint: 'app',
    })
    expect(r).toEqual({ status: 'resolved', canonical_identifier: 'gemini-consumer-app', access_surface: 'app' })
    expect(r).not.toEqual(expect.objectContaining({ canonical_identifier: 'gemini-api' }))
  })

  test('"Vertex AI" + access_surface "API" does not resolve to gemini-api -- separate deferred scope, no row', () => {
    expect(
      normalizeCandidate({
        proposal_id: 'c1',
        turn: 1,
        kind: 'tool_mention',
        raw_tool_name: 'Vertex AI',
        raw_text: 'Vertex AI, via the API.',
        access_surface_confidence_hint: 'confirmed',
        access_surface_value_hint: 'API',
      }),
    ).toEqual({ status: 'unrecognized' })
  })
})

// ── F. existing recognition behavior remains intact ───────────────────────

describe('F: Nano Banana disambiguation and other providers unaffected', () => {
  test('Nano Banana ambiguous/API/Consumer-App disambiguation behavior is unchanged', () => {
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

  test('a genuinely unknown tool with an access_surface hint still fails closed', () => {
    expect(
      normalizeCandidate({
        proposal_id: 'c1',
        turn: 1,
        kind: 'tool_mention',
        raw_tool_name: 'SomeOtherToolNotRegistered',
        raw_text: 'x',
        access_surface_confidence_hint: 'confirmed',
        access_surface_value_hint: 'API',
      }),
    ).toEqual({ status: 'unrecognized' })
  })
})

// ── B. real end-to-end pipeline: split extraction -> Retrieval ────────────

describe('B: real pipeline reaches governed Gemini API knowledge from the split production shape', () => {
  test('raw_tool_name "Gemini" + access_surface "API" (the exact production shape) resolves canonically and reaches the governed Matrix authority', async () => {
    const { updated } = await runSplitToolThenGoal('Gemini', 'API', "I'm using the Gemini API for this project. Can I use the resulting output commercially?")
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'gemini-api' })

    const rHandoff = buildRetrievalHandoff(updated)
    expect(rHandoff.unresolved_aliases).toEqual([])

    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)

    const geminiResults = out.results.filter((r) => r.claim_id === 'gemini-api')
    expect(geminiResults).toHaveLength(1)
    expect(geminiResults[0].match_origin).toBe('exact_topic')
    expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(false)
    expect(out.results.filter((r) => r.claim_id.startsWith('CLAIM-GEMINI'))).toHaveLength(0)

    const text = JSON.stringify(geminiResults[0])
    expect(text).toMatch(/neither an affirmative commercial-use grant nor an explicit commercial-use (restriction|prohibition)/i)
    expect(text).not.toMatch(/gemini api output may be used commercially/i)
    expect(text).not.toMatch(/gemini api output may not be used commercially/i)
  })

  test('bare "Gemini" with no access_surface hint still falls back to the unresolved-platform path end-to-end', async () => {
    const { updated } = await runSplitToolThenGoal('Gemini', undefined, "I'm using Gemini. Can I use the resulting output commercially?")
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'Gemini' })
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    expect(out.results.some((r) => r.claim_id === 'gemini-api')).toBe(false)
  })
})
