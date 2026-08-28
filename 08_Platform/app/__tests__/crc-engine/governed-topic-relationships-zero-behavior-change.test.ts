/**
 * Governed Topic Relationships real-fixture proof (Governed Topic
 * Relationships implementation milestone, 2026-08-16; orchestrator-wiring
 * follow-up, 2026-08-16; CLAIM-COPY-004 CRC-publication decision,
 * 2026-08-17; atomic copyright publication package, 2026-08-19) -- uses
 * the REAL governed fixtures (TOPIC_CLAIMS_FIXTURE,
 * TOPIC_RELATIONSHIPS_FIXTURE), never synthetic eligible ones, through the
 * REAL production entry point (runCRCConversation, the exact function
 * every live call site -- app/api/crc/turn/route.ts, run-turn.ts,
 * results-email-delivery.ts -- threads TOPIC_RELATIONSHIPS_FIXTURE into,
 * mirroring exactly how each already threads TOPIC_CLAIMS_FIXTURE).
 *
 * ORIGINAL PURPOSE (2026-08-16, "zero-behavior-change"): prove the
 * relationship genuinely reached Retrieval and was genuinely considered
 * (not just present-but-unwired) while still producing zero related-topic
 * output -- excluded SOLELY by governance (`CRC Eligible: Pending`), not by
 * missing plumbing. That original "layer 3" proof used test-only clones
 * (crc_eligible flipped to 'Yes') of the real fixture entries to
 * demonstrate what WOULD happen once published, without mutating real
 * governance state.
 *
 * UPDATE (2026-08-19, atomic copyright publication package): following a
 * bounded Copyright CRC Publication-Readiness Review (recommendation A --
 * PASS/GO AS-IS for REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 and its three
 * target claims CLAIM-COPY-001-v1/-002-v1/-003-v1, no text/rationale
 * change) and PM approval, that "layer 3" future-behavior proof is now the
 * REAL, live behavior -- published atomically, not sequentially. See
 * `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`.
 * This file is updated, not left stale, to assert the now-real related-
 * topic composition directly against the real, unmodified fixtures --
 * exactly the "prove it once published" moment the original synthetic
 * clone tests existed to anticipate. The clone helpers are removed;
 * nothing left to synthesize once the real state matches what they proved.
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
  test('the real relationship record is Adopted and CRC-Eligible: Yes (published 2026-08-19)', () => {
    const rel = TOPIC_RELATIONSHIPS_FIXTURE.find((r) => r.relationship_id === 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1')
    expect(rel).toBeDefined()
    expect(rel!.lifecycle).toBe('Adopted')
    expect(rel!.crc_eligible).toBe('Yes')
  })

  test('all four CLAIM-COPY claims are Adopted and CRC-Eligible: Yes (004 independently 2026-08-17; 001/002/003 atomically 2026-08-19)', () => {
    const copyrightClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-COPY-'))
    expect(copyrightClaims).toHaveLength(4)
    for (const c of copyrightClaims) {
      expect(c.lifecycle).toBe('Adopted')
      expect(c.crc_eligible).toBe('Yes')
    }
  })
})

describe('layer 1 -- the real orchestrator threads the real relationship fixture through; the full four-claim composition now surfaces for a real copyright_ownership question', () => {
  test('the canonical live scenario ("Do I own the copyright?"), confirmed US jurisdiction, via runCRCConversation called EXACTLY as every real call site now calls it (matrix, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE), now produces the full COPY-004 + COPY-001/002/003 composition -- the intended, approved 2026-08-19 behavior change', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [ownershipGoal()],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 1, source_statement: 'US' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    const interp = output.goal_interpretations[0]
    const copy001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-001-v1')!
    const copy002 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-002-v1')!
    const copy003 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-003-v1')!
    const copy004 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-004-v1')!

    // All four claims' own governed text present, verbatim.
    expect(interp.summary).toContain(copy004.crc_candidate_statement!)
    expect(interp.summary).toContain(copy001.crc_candidate_statement!)
    expect(interp.summary).toContain(copy002.crc_candidate_statement!)
    expect(interp.summary).toContain(copy003.crc_candidate_statement!)

    // Never the old (now-stale) "no coverage" template.
    expect(interp.summary).not.toContain("doesn't establish an answer")
    // Related-topic boundary clause present exactly once (relationship-sourced content).
    expect(interp.summary).toContain('This information is relevant to what you asked, but does not by itself determine the answer.')
    // Case 3B's own closing hedge -- fires because COPY-001/002/003 all carry unresolved_project_dependencies.
    expect(interp.summary).toContain("there isn't enough project-specific information")
    // No internal relationship/claim-id metadata rendered to the user.
    expect(JSON.stringify(output)).not.toContain('REL-COPY-OWNERSHIP-COPYRIGHTABILITY')
    expect(JSON.stringify(output)).not.toContain('relevant_consideration')
  })

  test('with jurisdiction unconfirmed, only COPY-004 surfaces -- COPY-001/002/003 remain silently unreachable via their own applicability_requirements, not via the relationship gate (which is now open)', () => {
    const su: StructuredUnderstanding = { ...DIALOGUE_FIXTURES.no_signal.structured_understanding, user_goals: [ownershipGoal()] }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    const interp = output.goal_interpretations[0]
    const copy004 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-004-v1')!
    expect(interp.summary).toBe(`${copy004.crc_candidate_statement} This is relevant to who owns the copyright, though it doesn't by itself determine the answer for your specific project.`)
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      if (claim.claim_id === 'CLAIM-COPY-004-v1') continue
      if (claim.crc_candidate_statement) {
        expect(interp.summary).not.toContain(claim.crc_candidate_statement)
      }
    }
    expect(interp.summary).not.toContain('This information is relevant to what you asked, but does not by itself determine the answer.')
  })

  test('omitting relationships entirely still defaults to [] -- backward-compatible, and now materially DIFFERENT from passing the real (now-live) fixture explicitly, since the real fixture is no longer inert', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [ownershipGoal()],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 1, source_statement: 'US' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    }
    const withoutRelationships = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const withRealRelationships = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    // Omitting relationships (defaults to []) means lookupRelatedTopicClaims finds no eligible relationship
    // regardless of the real fixture's own state -- COPY-001/002/003 never surface without it.
    expect(withoutRelationships.output.goal_interpretations[0].summary).not.toContain(
      TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-001-v1')!.crc_candidate_statement!,
    )
    expect(withRealRelationships.output).not.toEqual(withoutRelationships.output)
  })
})

describe('layer 2 -- the real relationship fixture explicitly passed to retrieve() directly now produces related-topic results (COPY-004 via exact-topic, COPY-001/002/003 via the now-live relationship)', () => {
  test('retrieve() called directly with TOPIC_RELATIONSHIPS_FIXTURE + TOPIC_CLAIMS_FIXTURE, confirmed US jurisdiction, produces one exact-topic result (COPY-004) and three related-topic results (COPY-001/002/003)', () => {
    const handoff = { tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [], workflow_role: 'unresolved' as const, intended_use: 'unclear' as const, scoped_observations: [], certainty_state: 'gate_1_unmet' as const, exclusions: [] }
    const out = retrieve(
      handoff,
      MATRIX_FIXTURE,
      [ownershipGoal()],
      TOPIC_CLAIMS_FIXTURE,
      { jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [] },
      TOPIC_RELATIONSHIPS_FIXTURE,
    )
    const exactResults = out.results.filter((r) => r.match_origin === 'exact_topic')
    const relatedResults = out.results.filter((r) => r.match_origin === 'related_topic')
    expect(exactResults.map((r) => r.claim_id)).toEqual(['CLAIM-COPY-004-v1'])
    expect(relatedResults.map((r) => r.claim_id).sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1'])
    expect(relatedResults.every((r) => r.relationship_id === 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1')).toBe(true)
    expect(out.results).toHaveLength(4)
  })

  test('retrieve() called directly with jurisdiction unconfirmed still produces only the one exact-topic result (COPY-004) -- COPY-001/002/003 fail their own applicability_requirements regardless of the now-live relationship', () => {
    const handoff = { tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [], workflow_role: 'unresolved' as const, intended_use: 'unclear' as const, scoped_observations: [], certainty_state: 'gate_1_unmet' as const, exclusions: [] }
    const out = retrieve(
      handoff,
      MATRIX_FIXTURE,
      [ownershipGoal()],
      TOPIC_CLAIMS_FIXTURE,
      { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
      TOPIC_RELATIONSHIPS_FIXTURE,
    )
    const relatedResults = out.results.filter((r) => r.match_origin === 'related_topic')
    expect(relatedResults).toEqual([])
    expect(out.results).toHaveLength(1)
    expect(out.results[0]).toMatchObject({ claim_id: 'CLAIM-COPY-004-v1', match_origin: 'exact_topic', relationship_id: null })
  })
})

describe('production call-site consistency -- structural proof route.ts wires TOPIC_RELATIONSHIPS_FIXTURE everywhere it wires TOPIC_CLAIMS_FIXTURE (2026-08-16 follow-up, unaffected by the 2026-08-19 governance decision)', () => {
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
