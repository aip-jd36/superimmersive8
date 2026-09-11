/**
 * Google Veo Runtime Identity / Reachability Remediation (2026-09-10).
 *
 * 'google-veo' became a CRC-active governed Matrix authority on 2026-09-10
 * (CPR_023, CPR APPROVE WITH BOUNDED WORDING -- evidence-limitation /
 * non-determination proposition, crc_eligible Pending -> Yes) but had zero
 * KNOWN_TOOLS coverage: "Veo," "Google Veo," "Veo 3," and "Veo 3.1" all
 * resolved `unrecognized`. This is the same reachability-gap class already
 * fixed for Kling, Luma, Pika, Synthesia, Midjourney, Gemini API, Gemini
 * Consumer App, and Stability AI.
 *
 * This milestone adds ONLY:
 *   - KNOWN_TOOLS aliases: "veo" / "google veo" / "veo 3" / "veo 3.1"
 *   - REPRESENTATIVE_EXPRESSIONS['google-veo'] = 'Google Veo' (already
 *     added at CRC-activation time, unchanged by this milestone)
 * Deliberately does NOT add "flow" or "google flow" -- "Flow" names
 * Google's containing multi-tool creative-studio surface, not a 1:1
 * synonym for the Veo model specifically; no evidence establishes a safe
 * one-to-one canonicalization, so it fails closed and stays unresolved.
 * No provider-specific Retrieval/BI/Composition, no new UserGoal, no
 * questioning, no reachability-backstop special-casing.
 *
 * Mirrors gemini-api-extraction-reachability.test.ts's and
 * gemini-consumer-app-extraction-reachability.test.ts's own real-pipeline
 * pattern: the REAL, unmodified extraction pipeline end-to-end through
 * retrieve(). No live model -- pure functions plus a mock candidate extractor.
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
import { auditCrcActiveReachability, findUnreachableCrcActiveIdentities } from '@/lib/crc-engine/crc-active-reachability-backstop'
import { checkCanonicalizationReadiness } from '@/lib/crc-engine/canonicalization-readiness'

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
    distribution_territory_mentions: [],
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

const nc = (raw: string, text = raw) =>
  normalizeCandidate({ proposal_id: 'c1', turn: 1, kind: 'tool_mention', raw_tool_name: raw, raw_text: text })

// ── §7 A: extraction test matrix -- exact canonical result per expression ──

describe('§7 A: deterministic normalizeCandidate resolution (no LLM call)', () => {
  test('A. "Veo" -> google-veo', () => {
    expect(nc('Veo')).toEqual({ status: 'resolved', canonical_identifier: 'google-veo' })
  })
  test('B. "Google Veo" -> google-veo', () => {
    expect(nc('Google Veo')).toEqual({ status: 'resolved', canonical_identifier: 'google-veo' })
  })
  test('C. "Veo 3" -> google-veo', () => {
    expect(nc('Veo 3')).toEqual({ status: 'resolved', canonical_identifier: 'google-veo' })
  })
  test('D. "Veo 3.1" -> google-veo', () => {
    expect(nc('Veo 3.1')).toEqual({ status: 'resolved', canonical_identifier: 'google-veo' })
  })
  test('E. bare "Flow" -> unrecognized (containing multi-tool surface, not a 1:1 Veo synonym -- MUST remain unresolved)', () => {
    expect(nc('Flow')).toEqual({ status: 'unrecognized' })
  })
  test('F. "Google Flow" -> unrecognized (same containing-surface ambiguity as bare "Flow")', () => {
    expect(nc('Google Flow')).toEqual({ status: 'unrecognized' })
  })
  test('G. "Gemini" -> unrecognized (separate Google product family, never Veo)', () => {
    expect(nc('Gemini')).toEqual({ status: 'unrecognized' })
  })
  test('H. "Gemini app" -> gemini-consumer-app (never Veo)', () => {
    expect(nc('Gemini app')).toEqual({ status: 'resolved', canonical_identifier: 'gemini-consumer-app' })
  })
  test('I. "Gemini API" -> gemini-api (never Veo)', () => {
    expect(nc('Gemini API')).toEqual({ status: 'resolved', canonical_identifier: 'gemini-api' })
  })
  test('J. "Nano Banana" (no context) -> known_ambiguous between the two Gemini surfaces, never Veo', () => {
    expect(nc('Nano Banana', 'Nano Banana')).toEqual({
      status: 'known_ambiguous',
      candidate_identifiers: ['gemini-api', 'gemini-consumer-app'],
    })
  })
  test('K. "Vertex AI" -> unrecognized (separate, deliberately out-of-scope Google surface, never Veo)', () => {
    expect(nc('Vertex AI')).toEqual({ status: 'unrecognized' })
  })
  test('L. "Google Cloud" -> unrecognized (separate, deliberately out-of-scope Google surface, never Veo)', () => {
    expect(nc('Google Cloud')).toEqual({ status: 'unrecognized' })
  })
  test('M. unrelated provider control "Kling" -> kling (unaffected)', () => {
    expect(nc('Kling')).toEqual({ status: 'resolved', canonical_identifier: 'kling' })
  })
  test('N. unknown tool -> unrecognized (fail closed)', () => {
    expect(nc('TotallyMadeUpToolXYZ')).toEqual({ status: 'unrecognized' })
  })
})

// ── §8: real end-to-end pipeline -- exactly the Google Veo authority ──────

describe('§8: real pipeline reaches the governed Google Veo Matrix authority end-to-end', () => {
  test.each(['Veo', 'Google Veo', 'Veo 3', 'Veo 3.1'])(
    'ordinary "%s" reaches the published governed Matrix claim through the real, unmodified extraction pipeline',
    async (phrase) => {
      const { updated } = await runToolThenGoal(phrase, `I made a video with ${phrase}. Can I use it commercially?`)
      expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'google-veo' })

      const rHandoff = buildRetrievalHandoff(updated)
      expect(rHandoff.unresolved_aliases).toEqual([])

      const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
      const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)

      const veoResults = out.results.filter((r) => r.claim_id === 'google-veo')
      expect(veoResults).toHaveLength(1)
      expect(veoResults[0].match_origin).toBe('exact_topic')

      // exactly the Veo authority -- zero Gemini API/Consumer App leakage, zero other leakage
      expect(out.results.some((r) => r.claim_id === 'gemini-api')).toBe(false)
      expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(false)
      expect(out.results.filter((r) => r.claim_id.startsWith('CLAIM-')).length).toBe(0)
    },
  )

  test('the approved non-determination proposition survives unchanged through Retrieval -- reachability does not strengthen it', async () => {
    const { updated } = await runToolThenGoal('Veo', 'I used Veo. Can I use it commercially?')
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    const result = out.results.find((r) => r.claim_id === 'google-veo')
    expect(result).toBeDefined()
    const stmt = result!.candidate_statement ?? ''
    // governed hedge survives verbatim
    expect(stmt).toMatch(/neither an affirmative commercial-use grant nor an explicit commercial-use restriction/i)
    // no fabricated permission / prohibition / plan inference / ownership-as-permission
    expect(stmt).not.toMatch(/output (may|can) be used commercially/i)
    expect(stmt).not.toMatch(/output (may not|cannot) be used commercially/i)
    expect(stmt).not.toMatch(/(paid|pro|ultra|plus) plan (grants|creates|gives)/i)
    expect(stmt).not.toMatch(/free (tier|plan) (prohibits|blocks|forbids)/i)
    expect(stmt).not.toMatch(/ownership disclaimer means/i)
    expect(stmt).not.toMatch(/Vertex AI/i)
    expect(stmt).not.toMatch(/Google Cloud Platform/i)
    expect(stmt).not.toMatch(/Pre-GA/i)
    // ownership finding stays distinct, never conflated with commercial-use
    expect(stmt).toMatch(/does not claim ownership/i)
    // it survived verbatim -- byte-identical to the governed MATRIX_FIXTURE row
    const govRow = MATRIX_FIXTURE.find((r) => r.identifier === 'google-veo')!
    expect(stmt).toBe(govRow.claims[0].crc_candidate_statement)
  })

  test('BI status for the directly-applicable claim is inspected -- applicability_requirements:[] and zero deps do not manufacture a stronger conclusion', async () => {
    const { updated } = await runToolThenGoal('Google Veo', 'I used Google Veo. Commercial use?')
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    const result = out.results.find((r) => r.claim_id === 'google-veo')!
    expect(result.unresolved_project_dependencies).toEqual([])
  })
})

// ── §9: negative / cross-provider controls ───────────────────────────────

describe('§9: cross-provider / Google-surface isolation + fail-closed controls', () => {
  async function retrieveFor(rawName: string, text: string) {
    const { updated } = await runToolThenGoal(rawName, text)
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    return { updated, out: retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts) }
  }

  test('Gemini API mention -> zero Google Veo leakage; the API claim is unaffected', async () => {
    const { updated, out } = await retrieveFor('Gemini API', 'I used Gemini API. Commercial use?')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'gemini-api' })
    expect(out.results.some((r) => r.claim_id === 'google-veo')).toBe(false)
    expect(out.results.some((r) => r.claim_id === 'gemini-api')).toBe(true)
  })

  test('Gemini Consumer App mention -> zero Google Veo leakage; the Consumer App claim is unaffected', async () => {
    const { updated, out } = await retrieveFor('the Gemini app', 'I used the Gemini app. Commercial use?')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'gemini-consumer-app' })
    expect(out.results.some((r) => r.claim_id === 'google-veo')).toBe(false)
    expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(true)
  })

  test('bare "Flow" mention -> unresolved, zero Google Veo leakage (fails closed)', async () => {
    const { updated, out } = await retrieveFor('Flow', 'I used Flow.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'Flow' })
    expect(out.results.some((r) => r.claim_id === 'google-veo')).toBe(false)
  })

  test('Vertex AI / Google Cloud mention -> unresolved, zero Google Veo leakage', async () => {
    for (const name of ['Vertex AI', 'Google Cloud']) {
      const { updated, out } = await retrieveFor(name, `I used ${name}.`)
      expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: name })
      expect(out.results.some((r) => r.claim_id === 'google-veo')).toBe(false)
    }
  })

  test('Kling mention -> zero Google Veo leakage; Kling claims still retrieved', async () => {
    const { out } = await retrieveFor('Kling AI', 'I used Kling AI. Commercial use?')
    expect(out.results.some((r) => r.claim_id === 'google-veo')).toBe(false)
    expect(out.results.some((r) => r.claim_id.startsWith('CLAIM-KLING-'))).toBe(true)
  })

  test('unknown provider -> fail closed, zero Google Veo leakage', async () => {
    const { updated, out } = await retrieveFor('SomeUnregisteredThing', 'I used SomeUnregisteredThing.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'SomeUnregisteredThing' })
    expect(out.results.some((r) => r.claim_id === 'google-veo')).toBe(false)
  })

  test('no tool/provider context -> no fabricated Google Veo relevance', async () => {
    const updated = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use my video commercially?' },
      constantExtractor([
        { proposal_id: 'g', turn: 1, raw_text: 'Can I use my video commercially?', kind: 'user_goal', goal_confidence_hint: 'confirmed', goal_category_hint: 'commercial_use', goal_scope_hint: 'informational' },
      ]),
    )
    const rHandoff = buildRetrievalHandoff(updated.updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    expect(out.results.some((r) => r.claim_id === 'google-veo')).toBe(false)
  })
})

// ── §10: representation / canonicalization readiness ─────────────────────

describe('§10: representation-readiness for google-veo', () => {
  test('the real canonicalization-readiness check resolves "Google Veo" -> google-veo', () => {
    expect(
      checkCanonicalizationReadiness({ kind: 'tool', identifier: 'google-veo', representativeExpression: 'Google Veo' }),
    ).toBe(true)
  })
})

// ── §11: CRC-active reachability backstop ────────────────────────────────

describe('§11: CRC-active reachability backstop -- google-veo defect remediated', () => {
  test('google-veo now has a representative expression and is reachable', () => {
    const row = auditCrcActiveReachability().find((r) => r.identifier === 'google-veo')
    expect(row).toBeDefined()
    expect(row!.representativeExpression).toBe('Google Veo')
    expect(row!.reachable).toBe(true)
  })

  test('zero unreachable CRC-active identities remain', () => {
    expect(findUnreachableCrcActiveIdentities()).toEqual([])
  })

  test('gemini-api / gemini-consumer-app reachability is unchanged (still reachable)', () => {
    expect(auditCrcActiveReachability().find((r) => r.identifier === 'gemini-api')).toEqual({
      kind: 'tool',
      identifier: 'gemini-api',
      representativeExpression: 'Gemini API',
      reachable: true,
    })
    expect(auditCrcActiveReachability().find((r) => r.identifier === 'gemini-consumer-app')).toEqual({
      kind: 'tool',
      identifier: 'gemini-consumer-app',
      representativeExpression: 'Gemini Consumer App',
      reachable: true,
    })
  })
})
