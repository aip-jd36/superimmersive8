/**
 * Adobe Firefly Runtime Identity / Reachability Remediation (2026-09-10).
 *
 * 'adobe-firefly' became a CRC-active governed Matrix authority on
 * 2026-09-10 (CPR_024, CPR APPROVE WITH BOUNDED WORDING -- Firefly Output
 * Indemnification proposition, crc_eligible Pending -> Yes) but had zero
 * KNOWN_TOOLS coverage: "Adobe Firefly" and "Firefly" both resolved
 * `unrecognized`. This is the same reachability-gap class already fixed
 * for Kling, Luma, Pika, Synthesia, Midjourney, Gemini API, Gemini
 * Consumer App, Stability AI, and Google Veo.
 *
 * This milestone adds ONLY:
 *   - KNOWN_TOOLS aliases: "adobe firefly" / "firefly"
 * REPRESENTATIVE_EXPRESSIONS['adobe-firefly'] = 'Adobe Firefly' was
 * already added at CRC-activation time (commit 6c689a3), unchanged here.
 * Deliberately does NOT add "creative cloud", "adobe", "firefly video",
 * "firefly image", "firefly boards", "firefly services", "adobe express",
 * "photoshop", or "premiere" -- those are either a broader containing
 * company/suite name, unrelated Adobe products, or specific Eligible
 * Firefly Features/Surfaces whose exact current list this claim's own
 * governed proposition explicitly leaves unconfirmed. No provider-specific
 * Retrieval/BI/Composition, no new UserGoal, no questioning, no
 * reachability-backstop special-casing.
 *
 * Mirrors google-veo-extraction-reachability.test.ts's own real-pipeline
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
  test('A. "Adobe Firefly" -> adobe-firefly', () => {
    expect(nc('Adobe Firefly')).toEqual({ status: 'resolved', canonical_identifier: 'adobe-firefly' })
  })
  test('B. "Firefly" -> adobe-firefly', () => {
    expect(nc('Firefly')).toEqual({ status: 'resolved', canonical_identifier: 'adobe-firefly' })
  })
  test('C. "Creative Cloud" -> unrecognized (containing product suite, not a 1:1 Firefly synonym -- MUST remain unresolved)', () => {
    expect(nc('Creative Cloud')).toEqual({ status: 'unrecognized' })
  })
  test('D. bare "Adobe" -> unrecognized (company name, not a tool identity)', () => {
    expect(nc('Adobe')).toEqual({ status: 'unrecognized' })
  })
  test('E. "Adobe Express" -> unrecognized (separate Adobe product, never Firefly)', () => {
    expect(nc('Adobe Express')).toEqual({ status: 'unrecognized' })
  })
  test('F. "Photoshop" -> unrecognized (separate Adobe product, never Firefly)', () => {
    expect(nc('Photoshop')).toEqual({ status: 'unrecognized' })
  })
  test('G. "Premiere Pro" -> unrecognized (separate Adobe product, never Firefly)', () => {
    expect(nc('Premiere Pro')).toEqual({ status: 'unrecognized' })
  })
  test('H. "Firefly Services" -> unrecognized (specific surface/feature, not aliased)', () => {
    expect(nc('Firefly Services')).toEqual({ status: 'unrecognized' })
  })
  test('I. "Google Veo" -> google-veo (never Firefly)', () => {
    expect(nc('Google Veo')).toEqual({ status: 'resolved', canonical_identifier: 'google-veo' })
  })
  test('J. "Gemini API" -> gemini-api (never Firefly)', () => {
    expect(nc('Gemini API')).toEqual({ status: 'resolved', canonical_identifier: 'gemini-api' })
  })
  test('K. unrelated provider control "Kling" -> kling (unaffected)', () => {
    expect(nc('Kling')).toEqual({ status: 'resolved', canonical_identifier: 'kling' })
  })
  test('L. "Stability AI" -> stability-ai (unaffected)', () => {
    expect(nc('Stability AI')).toEqual({ status: 'resolved', canonical_identifier: 'stability-ai' })
  })
  test('M. unknown tool -> unrecognized (fail closed)', () => {
    expect(nc('TotallyMadeUpToolXYZ')).toEqual({ status: 'unrecognized' })
  })
})

// ── §7 B: asset-provider-table isolation (different candidate kind) ───────

describe('§7 B: Adobe Stock (asset provider) is a separate table/candidate kind, no collision', () => {
  test('"Adobe Firefly" as a tool_mention never resolves via the asset-provider table', () => {
    const result = normalizeCandidate({
      proposal_id: 'c1',
      turn: 1,
      kind: 'asset_provider_mention',
      raw_provider_name: 'Adobe Firefly',
      raw_text: 'Adobe Firefly',
    })
    expect(result).toEqual({ status: 'unrecognized' })
  })
  test('"Adobe Stock" as an asset_provider_mention still resolves to adobe-stock, unaffected by this milestone', () => {
    const result = normalizeCandidate({
      proposal_id: 'c1',
      turn: 1,
      kind: 'asset_provider_mention',
      raw_provider_name: 'Adobe Stock',
      raw_text: 'Adobe Stock',
    })
    expect(result).toEqual({ status: 'resolved', canonical_identifier: 'adobe-stock' })
  })
})

// ── §8: real end-to-end pipeline -- exactly the Adobe Firefly authority ───

describe('§8: real pipeline reaches the governed Adobe Firefly Matrix authority end-to-end', () => {
  test.each(['Adobe Firefly', 'Firefly'])(
    'ordinary "%s" reaches the published governed Matrix claim through the real, unmodified extraction pipeline',
    async (phrase) => {
      const { updated } = await runToolThenGoal(phrase, `I made an image with ${phrase}. Can I use it commercially?`)
      expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'adobe-firefly' })

      const rHandoff = buildRetrievalHandoff(updated)
      expect(rHandoff.unresolved_aliases).toEqual([])

      const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
      const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)

      const fireflyResults = out.results.filter((r) => r.claim_id === 'adobe-firefly')
      expect(fireflyResults).toHaveLength(1)
      expect(fireflyResults[0].match_origin).toBe('exact_topic')

      // exactly the Firefly authority -- zero leakage from other Adobe/Google identities
      expect(out.results.some((r) => r.claim_id === 'google-veo')).toBe(false)
      expect(out.results.some((r) => r.claim_id === 'gemini-api')).toBe(false)
      expect(out.results.some((r) => r.claim_id === 'gemini-consumer-app')).toBe(false)
      expect(out.results.filter((r) => r.claim_id.startsWith('CLAIM-')).length).toBe(0)
    },
  )

  test('the approved bounded indemnification proposition survives unchanged through Retrieval -- reachability does not strengthen it', async () => {
    const { updated } = await runToolThenGoal('Firefly', 'I used Firefly. Can I use it commercially?')
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    const result = out.results.find((r) => r.claim_id === 'adobe-firefly')
    expect(result).toBeDefined()
    const stmt = result!.candidate_statement ?? ''

    // governed hedges survive verbatim
    expect(stmt).toMatch(/isn't something we've independently confirmed/i)
    expect(stmt).toMatch(/doesn't by itself mean you're covered/i)
    expect(stmt).toMatch(/separate from.{0,10}and doesn't by itself establish/i)

    // no fabricated eligibility / entitlement / clearance / ownership
    expect(stmt).not.toMatch(/your plan is (an )?eligible/i)
    expect(stmt).not.toMatch(/your (feature|surface) (is|qualifies as) eligible/i)
    expect(stmt).not.toMatch(/an export event (has occurred|occurred for your)/i)
    expect(stmt).not.toMatch(/Adobe will defend (this|your) claim/i)
    expect(stmt).not.toMatch(/guaranteed (payout|coverage)/i)
    expect(stmt).not.toMatch(/you own the output/i)
    expect(stmt).not.toMatch(/non-adobe models? (receive|get|are covered by) the same/i)
    expect(stmt).not.toMatch(/commercially cleared/i)
    expect(stmt).not.toMatch(/(is|are) legally cleared/i)

    // it survived verbatim -- byte-identical to the governed MATRIX_FIXTURE row
    const govRow = MATRIX_FIXTURE.find((r) => r.identifier === 'adobe-firefly')!
    expect(stmt).toBe(govRow.claims[0].crc_candidate_statement)
  })

  test('BI status for the directly-applicable claim is inspected -- applicability_requirements:[] and zero deps do not manufacture a stronger conclusion', async () => {
    const { updated } = await runToolThenGoal('Adobe Firefly', 'I used Adobe Firefly. Commercial use?')
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    const result = out.results.find((r) => r.claim_id === 'adobe-firefly')!
    expect(result.unresolved_project_dependencies).toEqual([])
  })
})

// ── §9: negative / cross-tool controls ────────────────────────────────────

describe('§9: cross-tool / Adobe-surface isolation + fail-closed controls', () => {
  async function retrieveFor(rawName: string, text: string) {
    const { updated } = await runToolThenGoal(rawName, text)
    const rHandoff = buildRetrievalHandoff(updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    return { updated, out: retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts) }
  }

  test('Google Veo mention -> zero Adobe Firefly leakage; the Veo claim is unaffected', async () => {
    const { updated, out } = await retrieveFor('Google Veo', 'I used Google Veo. Commercial use?')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'google-veo' })
    expect(out.results.some((r) => r.claim_id === 'adobe-firefly')).toBe(false)
    expect(out.results.some((r) => r.claim_id === 'google-veo')).toBe(true)
  })

  test('Gemini API mention -> zero Adobe Firefly leakage; the Gemini API claim is unaffected', async () => {
    const { updated, out } = await retrieveFor('Gemini API', 'I used Gemini API. Commercial use?')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'gemini-api' })
    expect(out.results.some((r) => r.claim_id === 'adobe-firefly')).toBe(false)
  })

  test('Creative Cloud mention -> unresolved, zero Adobe Firefly leakage (fails closed)', async () => {
    const { updated, out } = await retrieveFor('Creative Cloud', 'I used Creative Cloud.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'Creative Cloud' })
    expect(out.results.some((r) => r.claim_id === 'adobe-firefly')).toBe(false)
  })

  test('Photoshop / Premiere Pro mention -> unresolved, zero Adobe Firefly leakage', async () => {
    for (const name of ['Photoshop', 'Premiere Pro']) {
      const { updated, out } = await retrieveFor(name, `I used ${name}.`)
      expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: name })
      expect(out.results.some((r) => r.claim_id === 'adobe-firefly')).toBe(false)
    }
  })

  test('Kling mention -> zero Adobe Firefly leakage; Kling claims still retrieved', async () => {
    const { out } = await retrieveFor('Kling AI', 'I used Kling AI. Commercial use?')
    expect(out.results.some((r) => r.claim_id === 'adobe-firefly')).toBe(false)
    expect(out.results.some((r) => r.claim_id.startsWith('CLAIM-KLING-'))).toBe(true)
  })

  test('unknown provider -> fail closed, zero Adobe Firefly leakage', async () => {
    const { updated, out } = await retrieveFor('SomeUnregisteredThing', 'I used SomeUnregisteredThing.')
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'SomeUnregisteredThing' })
    expect(out.results.some((r) => r.claim_id === 'adobe-firefly')).toBe(false)
  })

  test('no tool/provider context -> no fabricated Adobe Firefly relevance', async () => {
    const updated = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use my image commercially?' },
      constantExtractor([
        { proposal_id: 'g', turn: 1, raw_text: 'Can I use my image commercially?', kind: 'user_goal', goal_confidence_hint: 'confirmed', goal_category_hint: 'commercial_use', goal_scope_hint: 'informational' },
      ]),
    )
    const rHandoff = buildRetrievalHandoff(updated.updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.updated.user_goals, TOPIC_CLAIMS_FIXTURE, facts)
    expect(out.results.some((r) => r.claim_id === 'adobe-firefly')).toBe(false)
  })
})

// ── §10: representation / canonicalization readiness ──────────────────────

describe('§10: representation-readiness for adobe-firefly', () => {
  test('the real canonicalization-readiness check resolves "Adobe Firefly" -> adobe-firefly', () => {
    expect(
      checkCanonicalizationReadiness({ kind: 'tool', identifier: 'adobe-firefly', representativeExpression: 'Adobe Firefly' }),
    ).toBe(true)
  })
})

// ── §11: CRC-active reachability backstop ──────────────────────────────────

describe('§11: CRC-active reachability backstop -- adobe-firefly defect remediated', () => {
  test('adobe-firefly now has a representative expression and is reachable', () => {
    const row = auditCrcActiveReachability().find((r) => r.identifier === 'adobe-firefly')
    expect(row).toBeDefined()
    expect(row!.representativeExpression).toBe('Adobe Firefly')
    expect(row!.reachable).toBe(true)
  })

  test('zero unreachable CRC-active identities remain', () => {
    expect(findUnreachableCrcActiveIdentities()).toEqual([])
  })

  test('google-veo / gemini-api / gemini-consumer-app reachability is unchanged (still reachable)', () => {
    expect(auditCrcActiveReachability().find((r) => r.identifier === 'google-veo')).toEqual({
      kind: 'tool',
      identifier: 'google-veo',
      representativeExpression: 'Google Veo',
      reachable: true,
    })
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
