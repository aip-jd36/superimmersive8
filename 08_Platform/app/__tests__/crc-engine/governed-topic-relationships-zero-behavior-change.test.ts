/**
 * Zero-UNAPPROVED-behavior-change proof (Governed Topic Relationships
 * implementation milestone, 2026-08-16; orchestrator-wiring follow-up,
 * 2026-08-16; CLAIM-COPY-004 CRC-publication decision, 2026-08-17) -- uses
 * the REAL governed fixtures (TOPIC_CLAIMS_FIXTURE,
 * TOPIC_RELATIONSHIPS_FIXTURE), never synthetic eligible ones by default,
 * through the REAL production entry point (runCRCConversation, the exact
 * function every live call site -- app/api/crc/turn/route.ts, run-turn.ts,
 * results-email-delivery.ts -- threads TOPIC_RELATIONSHIPS_FIXTURE into,
 * mirroring exactly how each already threads TOPIC_CLAIMS_FIXTURE).
 *
 * UPDATED 2026-08-17 for the first real governance change this file has
 * ever had to reflect: CLAIM-COPY-004-v1 is now `crc_eligible: 'Yes'` (CRC
 * Approver: JD/PM, 2026-08-17) -- this is an INTENDED, approved behavior
 * change, not a regression, and this file's assertions are updated to
 * expect it. What remains proven unchanged, and is the file's continuing
 * purpose: the governed RELATIONSHIP (REL-COPY-OWNERSHIP-COPYRIGHTABILITY-
 * v1) and CLAIM-COPY-001/002/003 all remain `crc_eligible: 'Pending'`, and
 * the real relationship object genuinely reaches Retrieval and is
 * genuinely considered (not just present-but-unwired) yet still produces
 * zero related-topic output -- excluded SOLELY because governance says
 * Pending, not because it never arrived.
 */

import * as fs from 'fs'
import * as path from 'path'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import type { StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'

function ownershipGoal(): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Do I own the copyright?',
    category: 'copyright_ownership',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Do I own the copyright?',
  }
}

describe('governance state as of this milestone -- confirms the premise the rest of this file relies on', () => {
  test('the real relationship record is Adopted but CRC-Eligible: Pending', () => {
    const rel = TOPIC_RELATIONSHIPS_FIXTURE.find((r) => r.relationship_id === 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1')
    expect(rel).toBeDefined()
    expect(rel!.lifecycle).toBe('Adopted')
    expect(rel!.crc_eligible).toBe('Pending')
  })

  test('CLAIM-COPY-004 is CRC-Eligible: Yes (2026-08-17 publication decision); COPY-001/002/003 remain Pending, unchanged by that same decision', () => {
    const copyrightClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-COPY-'))
    expect(copyrightClaims).toHaveLength(4)
    for (const c of copyrightClaims) {
      expect(c.lifecycle).toBe('Adopted')
      expect(c.crc_eligible).toBe(c.claim_id === 'CLAIM-COPY-004-v1' ? 'Yes' : 'Pending')
    }
  })
})

describe('layer 1 -- the real orchestrator DOES thread the real relationship fixture through; COPY-004 now surfaces (approved), everything else stays governance-blocked', () => {
  test('the canonical live scenario ("Do I own the copyright?") via runCRCConversation, called EXACTLY as every real call site now calls it (matrix, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE), now produces CLAIM-COPY-004\'s real governed statement -- the intended, approved 2026-08-17 behavior change', () => {
    const su: StructuredUnderstanding = { ...DIALOGUE_FIXTURES.no_signal.structured_understanding, user_goals: [ownershipGoal()] }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    const interp = output.goal_interpretations[0]
    const copy004 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-004-v1')!
    // ProjectionGoalInterpretation carries only goal_text/summary (status is
    // an internal-only BoundedInterpretation field, never exposed this far
    // downstream) -- the rendered text itself is the observable proof of
    // directly_relevant status at this layer.
    expect(interp.summary).toBe(`${copy004.crc_candidate_statement} This is relevant to who owns the copyright, though it doesn't by itself determine the answer for your specific project.`)
    // Never the old (now-stale) "no coverage" template.
    expect(interp.summary).not.toContain("doesn't establish an answer")

    // None of the still-Pending COPY-001/002/003 statements ever appear.
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      if (claim.claim_id === 'CLAIM-COPY-004-v1') continue
      if (claim.crc_candidate_statement) {
        expect(interp.summary).not.toContain(claim.crc_candidate_statement)
      }
    }
    // No related-topic boundary clause -- the relationship never activated (still Pending).
    expect(interp.summary).not.toContain('This information is relevant to what you asked, but does not by itself determine the answer.')
    expect(JSON.stringify(output)).not.toContain('REL-COPY-OWNERSHIP-COPYRIGHTABILITY')
  })

  test('omitting relationships entirely still defaults to [] -- backward-compatible, identical output to passing the real fixture explicitly (since the real fixture is inert while Pending)', () => {
    const su: StructuredUnderstanding = { ...DIALOGUE_FIXTURES.no_signal.structured_understanding, user_goals: [ownershipGoal()] }
    const withoutRelationships = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const withRealRelationships = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(withRealRelationships.output).toEqual(withoutRelationships.output)
  })
})

describe('layer 2 -- even with the real relationship fixture explicitly passed to retrieve() directly, Pending blocks RELATED-topic expansion (COPY-004 itself now correctly surfaces via its own exact-topic path)', () => {
  test('retrieve() called directly with TOPIC_RELATIONSHIPS_FIXTURE + TOPIC_CLAIMS_FIXTURE produces exactly one exact-topic result (COPY-004) and zero related-topic results', () => {
    const handoff = { tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [], workflow_role: 'unresolved' as const, intended_use: 'unclear' as const, scoped_observations: [], certainty_state: 'gate_1_unmet' as const, exclusions: [] }
    const out = retrieve(
      handoff,
      MATRIX_FIXTURE,
      [ownershipGoal()],
      TOPIC_CLAIMS_FIXTURE,
      { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] },
      TOPIC_RELATIONSHIPS_FIXTURE,
    )
    const relatedResults = out.results.filter((r) => r.match_origin === 'related_topic')
    expect(relatedResults).toEqual([])
    expect(out.results).toHaveLength(1)
    expect(out.results[0]).toMatchObject({ claim_id: 'CLAIM-COPY-004-v1', match_origin: 'exact_topic', relationship_id: null })
  })
})

describe('layer 3 -- LOAD-BEARING: the real relationship IS considered, blocked SOLELY by governance, not by missing plumbing (PM-required proof, 2026-08-16 follow-up)', () => {
  /**
   * Test-only clones of the REAL fixture entries, with ONLY crc_eligible
   * flipped to 'Yes' -- everything else (relationship_id, source_topic,
   * target_topic, rationale, claim_id, crc_candidate_statement, etc.)
   * stays byte-identical to the real governed record. The real fixtures
   * themselves (TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE) are
   * never mutated -- these are separate, new objects.
   */
  function cloneEligible(rel: TopicRelationship): TopicRelationship {
    return { ...rel, crc_eligible: 'Yes' }
  }
  function cloneEligibleClaim(claim: TopicClaim): TopicClaim {
    return { ...claim, crc_eligible: 'Yes' }
  }

  test('with the REAL relationship record (only crc_eligible cloned to Yes) + REAL target claims (only crc_eligible cloned to Yes), the real orchestration path produces the real, governed related-topic content', () => {
    const realRel = TOPIC_RELATIONSHIPS_FIXTURE.find((r) => r.relationship_id === 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1')!
    const realCopy002 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-002-v1')!
    const realCopy003 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-003-v1')!
    const realCopy004 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-004-v1')!

    const testOnlyEligibleRel = cloneEligible(realRel)
    const testOnlyEligibleClaims = TOPIC_CLAIMS_FIXTURE.map((c) => (c.claim_id.startsWith('CLAIM-COPY-') ? cloneEligibleClaim(c) : c))

    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [ownershipGoal()],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 1, source_statement: 'US' },
      },
    }

    const { output, trace } = runCRCConversation(su, MATRIX_FIXTURE, testOnlyEligibleClaims, [testOnlyEligibleRel])

    // The real relationship_id and real claim_ids are genuinely present --
    // this is the real governed record, not a synthetic stand-in. All
    // three claims tagged topic: 'copyrightability' (COPY-001/002/003)
    // correctly surface as related-topic -- not just the two used in the
    // design report's own illustrative worked scenario.
    const realCopy001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-001-v1')!
    const relatedResults = trace.retrieval_results.filter((r) => r.match_origin === 'related_topic')
    expect(relatedResults.map((r) => r.claim_id).sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1'])
    expect(relatedResults.every((r) => r.relationship_id === 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1')).toBe(true)
    expect(relatedResults.every((r) => r.matched_goal_category === 'copyright_ownership')).toBe(true)

    const interp = output.goal_interpretations[0]
    expect(interp.summary).toContain(realCopy004.crc_candidate_statement!)
    expect(interp.summary).toContain(realCopy001.crc_candidate_statement!)
    expect(interp.summary).toContain(realCopy002.crc_candidate_statement!)
    expect(interp.summary).toContain(realCopy003.crc_candidate_statement!)

    // The REAL fixtures were never mutated -- still Pending, still excluded on their own.
    expect(TOPIC_RELATIONSHIPS_FIXTURE.find((r) => r.relationship_id === 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1')!.crc_eligible).toBe('Pending')
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-002-v1')!.crc_eligible).toBe('Pending')
  })

  test('the SAME real relationship + real claims, unmodified (crc_eligible left at the real Pending value), produce zero related-topic content through the identical code path -- proving the difference is governance, not plumbing', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [ownershipGoal()],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 1, source_statement: 'US' },
      },
    }
    const { trace } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(trace.retrieval_results.filter((r) => r.match_origin === 'related_topic')).toEqual([])
  })
})

describe('production call-site consistency -- structural proof route.ts wires TOPIC_RELATIONSHIPS_FIXTURE everywhere it wires TOPIC_CLAIMS_FIXTURE (2026-08-16 follow-up)', () => {
  // Regex-over-source-text, same discipline as subsystem-boundaries.test.ts
  // -- app/api/crc/turn/route.ts is a Next.js Route Handler (cookies(),
  // NextRequest, Supabase admin client) with no established pattern in this
  // repo for invoking it directly in a unit test (the one existing route
  // test file, crc-turn-route.test.ts, tests only the extracted pure
  // parseRequest() function for exactly this reason). A structural source
  // scan is the smallest reliable way to prove wiring consistency here.
  const ROUTE_PATH = path.join(__dirname, '..', '..', 'app', 'api', 'crc', 'turn', 'route.ts')

  test('route.ts imports TOPIC_RELATIONSHIPS_FIXTURE', () => {
    const src = fs.readFileSync(ROUTE_PATH, 'utf-8')
    expect(src).toMatch(/import\s*\{\s*TOPIC_RELATIONSHIPS_FIXTURE\s*\}\s*from\s*['"]@\/lib\/retrieval-engine\/topic-relationships-fixture['"]/)
  })

  test('every runCRCConversation( call in route.ts passes TOPIC_RELATIONSHIPS_FIXTURE as its 4th argument', () => {
    const src = fs.readFileSync(ROUTE_PATH, 'utf-8')
    // Exclude bare `runCRCConversation()` doc-comment mentions (e.g. "via
    // runCRCConversation() internally") -- only match real calls, which
    // always carry at least one argument.
    const calls = (src.match(/runCRCConversation\([^)]+\)/g) ?? []).filter((c) => !c.startsWith('runCRCConversation()'))
    expect(calls.length).toBeGreaterThan(0) // fails loudly if the call pattern itself ever changes shape
    for (const call of calls) {
      expect(call).toContain('TOPIC_RELATIONSHIPS_FIXTURE')
    }
  })

  test('the deliverCrcResultsEmail(...) params object in route.ts includes relationships: TOPIC_RELATIONSHIPS_FIXTURE', () => {
    const src = fs.readFileSync(ROUTE_PATH, 'utf-8')
    const deliverCallMatch = src.match(/deliverCrcResultsEmail\(supabaseAdmin,\s*\{[\s\S]*?\n\s*\}\)/)
    expect(deliverCallMatch).not.toBeNull()
    expect(deliverCallMatch![0]).toMatch(/relationships:\s*TOPIC_RELATIONSHIPS_FIXTURE/)
  })

  test('the RunTurnDeps object in route.ts includes relationships: TOPIC_RELATIONSHIPS_FIXTURE', () => {
    const src = fs.readFileSync(ROUTE_PATH, 'utf-8')
    const depsMatch = src.match(/const deps: RunTurnDeps = \{[\s\S]*?\n\s*\}/)
    expect(depsMatch).not.toBeNull()
    expect(depsMatch![0]).toMatch(/relationships:\s*TOPIC_RELATIONSHIPS_FIXTURE/)
  })

  test('the number of TOPIC_RELATIONSHIPS_FIXTURE usages in route.ts equals the number of TOPIC_CLAIMS_FIXTURE usages minus the one import line each -- one-for-one wiring, nothing left behind', () => {
    const src = fs.readFileSync(ROUTE_PATH, 'utf-8')
    const claimsUsages = (src.match(/TOPIC_CLAIMS_FIXTURE/g) ?? []).length
    const relationshipsUsages = (src.match(/TOPIC_RELATIONSHIPS_FIXTURE/g) ?? []).length
    expect(relationshipsUsages).toBe(claimsUsages)
  })
})
