/**
 * Gemini Consumer App Runtime Identity / Reachability Remediation
 * (LK-TRIAL-11, 2026-09-09).
 *
 * 'gemini-consumer-app' became a CRC-active governed Matrix authority on
 * 2026-09-09 (Gemini Consumer App CPR APPROVE -- evidence-limitation /
 * non-determination proposition, crc_eligible Pending -> Yes) but had zero
 * KNOWN_TOOLS coverage: "Gemini Consumer App," "Gemini app," "the Gemini
 * app," and bare "Gemini" all resolved `unrecognized`, and only "Nano
 * Banana" + Consumer-App context reached this identity via the existing
 * KNOWN_AMBIGUOUS_TOOLS disambiguation. This is the same reachability-gap
 * class already fixed for Kling, Luma, Pika, Synthesia, Midjourney, Stability
 * AI, and (2026-09-08) Gemini API.
 *
 * This milestone adds ONLY:
 *   - KNOWN_TOOLS aliases: "gemini consumer app" / "gemini app" / "the gemini app"
 *   - REPRESENTATIVE_EXPRESSIONS['gemini-consumer-app'] = 'Gemini Consumer App'
 * No provider-specific Retrieval/BI/Composition, no new UserGoal, no
 * questioning, no reachability-backstop special-casing.
 *
 * Mirrors gemini-api-extraction-reachability.test.ts's own real-pipeline
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
  test('A. "Gemini Consumer App" -> gemini-consumer-app', () => {
    expect(nc('Gemini Consumer App')).toEqual({ status: 'resolved', canonical_identifier: 'gemini-consumer-app' })
  })
  test('B. "Gemini app" -> gemini-consumer-app', () => {
    expect(nc('Gemini app')).toEqual({ status: 'resolved', canonical_identifier: 'gemini-consumer-app' })
  })
  test('C. "the Gemini app" -> gemini-consumer-app', () => {
    expect(nc('the Gemini app')).toEqual({ status: 'resolved', canonical_identifier: 'gemini-consumer-app' })
  })
  test('D. bare "Gemini" -> unrecognized (whole product family -- MUST remain unresolved)', () => {
    expect(nc('Gemini')).toEqual({ status: 'unrecognized' })
  })
  test('E. "Gemini API" -> gemini-api (never the Consumer App)', () => {
    expect(nc('Gemini API')).toEqual({ status: 'resolved', canonical_identifier: 'gemini-api' })
  })
  test('F. "Gemini Developer API" -> gemini-api (never the Consumer App)', () => {
    expect(nc('Gemini Developer API')).toEqual({ status: 'resolved', canonical_identifier: 'gemini-api' })
  })
  test('G. "Nano Banana" + Consumer App context -> gemini-consumer-app (existing disambiguation, preserved)', () => {
    expect(nc('Nano Banana', 'I used Nano Banana, the app, on my phone.')).toEqual({
      status: 'resolved',
      canonical_identifier: 'gemini-consumer-app',
      access_surface: 'Consumer App',
    })
  })
  test('H. "Nano Banana" + API context -> gemini-api (existing disambiguation, preserved)', () => {
    expect(nc('Nano Banana', 'I used Nano Banana with an API key.')).toEqual({
      status: 'resolved',
      canonical_identifier: 'gemini-api',
      access_surface: 'API',
    })
  })
  test('H2. "Nano Banana" with NO context -> known_ambiguous (fail-closed, preserved)', () => {
    expect(nc('Nano Banana', 'I used Nano Banana for this one.')).toEqual({
      status: 'known_ambiguous',
      candidate_identifiers: ['gemini-api', 'gemini-consumer-app'],
    })
  })
  test('I. "Vertex AI" -> unrecognized (separate Google surface, never the Consumer App)', () => {
    expect(nc('Vertex AI')).toEqual({ status: 'unrecognized' })
  })
  test('J. "Google Workspace" -> unrecognized (separate Google surface, never the Consumer App)', () => {
    expect(nc('Google Workspace')).toEqual({ status: 'unrecognized' })
  })
  test('J2. "Gemini for Workspace" / "Gemini Business" -> unrecognized (never the Consumer App)', () => {
    expect(nc('Gemini for Workspace')).toEqual({ status: 'unrecognized' })
    expect(nc('Gemini Business')).toEqual({ status: 'unrecognized' })
  })
  test('K. unrelated provider control "Kling" -> kling (unaffected)', () => {
    expect(nc('Kling')).toEqual({ status: 'resolved', canonical_identifier: 'kling' })
  })
  test('L. unknown tool -> unrecognized (fail closed)', () => {
    expect(nc('TotallyMadeUpToolXYZ')).toEqual({ status: 'unrecognized' })
  })
})

// ── §6: Nano Banana disambiguation regression ─────────────────────────────

describe('§6: Nano Banana disambiguation is meaningful architecture -- unchanged by this remediation', () => {
  test('bare Nano Banana -> known_ambiguous; API context -> gemini-api; Consumer App context -> gemini-consumer-app', () => {
    expect(nc('Nano Banana', 'Nano Banana')).toEqual({
      status: 'known_ambiguous',
      candidate_identifiers: ['gemini-api', 'gemini-consumer-app'],
    })
    expect(nc('Nano Banana', 'Nano Banana through the developer API')).toEqual({
      status: 'resolved',
      canonical_identifier: 'gemini-api',
      access_surface: 'API',
    })
    expect(nc('Nano Banana', 'Nano Banana in the app on my phone')).toEqual({
      status: 'resolved',
      canonical_identifier: 'gemini-consumer-app',
      access_surface: 'Consumer App',
    })
  })
})

// ── §8: real end-to-end pipeline -- exactly the Consumer App authority ─────

describe('§8: real pipeline reaches the governed Gemini Consumer App Matrix authority end-to-end', () => {
  test.each(['Gemini Consumer App', 'Gemini app', 'the Gemini app'])(
    'ordinary "%s" reaches the published governed Matrix claim through the real, unmodified extraction pipeline',
    async (phrase) => {
      const { updated } = await runToolThenGoal(phrase, `I made a video in the ${phrase}. Can I use it commercially?`)
      expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'gemini-consumer-app' })

      const rHandoff = buildRetrievalHandoff(updated)
      expect(rHandoff.unresolved_aliases).toEqual([])

      const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
      const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)

      const consumerResults = out.results.filter((r) => r.claim_id === 'gemini-consumer-app')
      expect(consumerResults).toHaveLength(1)
      expect(consumerResults[0].match_origin).toBe('exact_topic')

      // exactly the Consumer App authority -- zero Gemini API leakage, zero other leakage
      expect(out.results.some((r) => r.claim_id === 'gemini-api')).toBe(false)
      expect(out.results.filter((r) => r.claim_id.startsWith('CLAIM-')).length).toBe(0)
    },
  )

  test('the approved non-determination proposition survives unchanged through Retrieval -- reachability does not strengthen it', async () => {
    const { updated } = await runToolThenGoal('the Gemini app', 'I used the Gemini app. Can I use it commercially?')
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    const result = out.results.find((r) => r.claim_id === 'gemini-consumer-app')
    expect(result).toBeDefined()
    // The USER-FACING statement is what must not be strengthened. The
    // `publication_scope` field is a governance INSTRUCTION to CRC and
    // legitimately contains the forbidden phrasings as "CRC must not ..."
    // clauses -- scoping the fabrication scan to candidate_statement.
    const stmt = result!.candidate_statement ?? ''
    // governed hedge survives verbatim
    expect(stmt).toMatch(/neither an affirmative commercial-use grant nor an explicit commercial-use restriction/i)
    // no fabricated permission / prohibition / plan inference / ownership-as-permission
    expect(stmt).not.toMatch(/output (may|can) be used commercially/i)
    expect(stmt).not.toMatch(/output (may not|cannot) be used commercially/i)
    expect(stmt).not.toMatch(/(paid|pro|ultra|plus) plan (grants|creates|gives)/i)
    expect(stmt).not.toMatch(/free plan (prohibits|blocks|forbids)/i)
    expect(stmt).not.toMatch(/ownership disclaimer means/i)
    // ownership finding stays distinct, never conflated with commercial-use
    expect(stmt).toMatch(/does not claim ownership/i)
    // it survived verbatim -- byte-identical to the governed MATRIX_FIXTURE row
    const govRow = MATRIX_FIXTURE.find((r) => r.identifier === 'gemini-consumer-app')!
    expect(stmt).toBe(govRow.claims[0].crc_candidate_statement)
  })

  test('BI status for the directly-applicable claim is inspected -- applicability_requirements:[] and zero deps do not manufacture a stronger conclusion', async () => {
    const { updated } = await runToolThenGoal('Gemini Consumer App', 'I used the Gemini Consumer App. Commercial use?')
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    const result = out.results.find((r) => r.claim_id === 'gemini-consumer-app')!
    // 'directly_relevant'-equivalent structural classification is expected
    // (empty applicability_requirements, no unresolved deps) -- this is a
    // structural fact about routing, NOT a claim that the commercial-use
    // question is answered. The proposition text itself carries the hedge.
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

  test('Gemini API mention -> zero Gemini Consumer App leakage; the API claim is unaffected', async () => {
    const { updated, out } = await retrieveFor('Gemini API', 'I used Gemini API. Commercial use?')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'gemini-api' })
    expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(false)
    expect(out.results.some((r) => r.claim_id === 'gemini-api')).toBe(true)
  })

  test('Vertex AI mention -> zero Gemini Consumer App leakage (unresolved)', async () => {
    const { updated, out } = await retrieveFor('Vertex AI', 'I used Vertex AI.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'Vertex AI' })
    expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(false)
  })

  test('Google Workspace / Gemini Business mention -> zero Gemini Consumer App leakage (unresolved)', async () => {
    for (const name of ['Google Workspace', 'Gemini Business']) {
      const { updated, out } = await retrieveFor(name, `I used ${name}.`)
      expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: name })
      expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(false)
    }
  })

  test('Kling mention -> zero Gemini Consumer App leakage; Kling claims still retrieved', async () => {
    const { out } = await retrieveFor('Kling AI', 'I used Kling AI. Commercial use?')
    expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(false)
    expect(out.results.some((r) => r.claim_id.startsWith('CLAIM-KLING-'))).toBe(true)
  })

  test('unknown provider -> fail closed, zero Gemini Consumer App leakage', async () => {
    const { updated, out } = await retrieveFor('SomeUnregisteredThing', 'I used SomeUnregisteredThing.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'SomeUnregisteredThing' })
    expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(false)
  })

  test('no tool/provider context -> no fabricated Gemini Consumer App relevance', async () => {
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
    expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(false)
  })
})

// ── §10: representation / canonicalization readiness ─────────────────────

describe('§10: representation-readiness for gemini-consumer-app', () => {
  test('the real canonicalization-readiness check resolves "Gemini Consumer App" -> gemini-consumer-app', () => {
    expect(
      checkCanonicalizationReadiness({ kind: 'tool', identifier: 'gemini-consumer-app', representativeExpression: 'Gemini Consumer App' }),
    ).toBe(true)
  })
})

// ── §11: CRC-active reachability backstop ────────────────────────────────

describe('§11: CRC-active reachability backstop -- gemini-consumer-app defect remediated', () => {
  test('gemini-consumer-app now has a representative expression and is reachable', () => {
    const row = auditCrcActiveReachability().find((r) => r.identifier === 'gemini-consumer-app')
    expect(row).toBeDefined()
    expect(row!.representativeExpression).toBe('Gemini Consumer App')
    expect(row!.reachable).toBe(true)
  })

  test('zero unreachable CRC-active identities remain', () => {
    expect(findUnreachableCrcActiveIdentities()).toEqual([])
  })

  test('gemini-api reachability is unchanged (still "Gemini API", still reachable)', () => {
    const row = auditCrcActiveReachability().find((r) => r.identifier === 'gemini-api')
    expect(row).toEqual({ kind: 'tool', identifier: 'gemini-api', representativeExpression: 'Gemini API', reachable: true })
  })
})
