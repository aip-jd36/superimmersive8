/**
 * CRC-BI-MULTI-D0-PRESERVATION-1 (2026-10-14, PM/Architecture-authorized,
 * narrowly scoped) — regression suite for the generic multi-D0 preservation
 * fix in build-bounded-interpretation.ts.
 *
 * Root cause (see CRC-CC-MULTI-RESULT-POSTURE-COMPOSITION-1's own read-only
 * architecture investigation for the full trace): when more than one
 * dependency-free (D0), fully-applicable governed claim matched the same
 * goal category, the prior `directly_relevant` branch fused every matched
 * claim's own `candidate_statement` into one undifferentiated string before
 * a single shared boundary clause was appended — destroying claim-level
 * separation. Proven live in production for
 * CLAIM-RUNWAY-COMMERCIAL-USE-001-v1 + CLAIM-KLING-COMMERCIAL-USE-BASELINE-
 * 001-v1 (test D below, through the real production pipeline).
 *
 * The fix: each matched D0 claim now renders as its OWN relevance block
 * (reusing `directlyRelevantSummary`'s existing per-claim template
 * verbatim) — no precedence, no contradiction detection, no conflict
 * resolution. A single matching claim produces the exact byte-identical
 * single block as before.
 *
 * Most cases here call `buildBoundedInterpretations` directly with
 * `BiIntent[]`/`BiResult[]` (no Retrieval), mirroring
 * bi-result-applicability.test.ts's own established pattern — this is the
 * fastest, most direct way to exercise the BI boundary itself. Test D uses
 * the real production pipeline (`retrieve()` + the live
 * TOPIC_CLAIMS_FIXTURE) specifically to prove the fix against the actual
 * already-published claims the defect was found on, not just a synthetic
 * analog.
 */

import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { BiIntent, BiResult } from '@/lib/bounded-interpretation/types'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'

const intent = (over: Partial<BiIntent> = {}): BiIntent => ({
  intent_id: 'i-1',
  intent_text: 'Can I use this commercially?',
  category: 'commercial_use',
  scope: 'informational',
  ...over,
})

const result = (over: Partial<BiResult> = {}): BiResult => ({
  matched_goal_category: 'commercial_use',
  unresolved_project_dependencies: [],
  claim_id: 'CLAIM-A-v1',
  candidate_statement: 'Statement A.',
  match_origin: 'exact_topic',
  source_fact: { kind: 'tool' },
  ...over,
})

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [],
    unresolved_aliases: [],
    asset_providers: [],
    unresolved_asset_provider_mentions: [],
    workflow_role: 'unresolved',
    intended_use: 'unclear',
    scoped_observations: [],
    certainty_state: 'gate_1_unmet',
    exclusions: [],
    ...overrides,
  }
}
function tool(identifier: string) {
  return { identifier, access_surface: 'unresolved', plan_tier: 'unknown' }
}
function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text'>): UserGoal {
  return {
    state: 'confirmed',
    category: 'unknown',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: overrides.raw_text,
    ...overrides,
  }
}

describe('CRC-BI-MULTI-D0-PRESERVATION-1 — matrix', () => {
  // A. zero applicable D0 claims
  test('A: no matching results -> outside_current_coverage, no blocks fused', () => {
    const [bi] = buildBoundedInterpretations([intent()], [])
    expect(bi.status).toBe('outside_current_coverage')
    expect(bi.summary_blocks).toHaveLength(1)
  })

  // B. one D0 claim -> byte-identical single-block shape (hard gate)
  test('B: exactly one D0 claim -> single block, unchanged shape', () => {
    const [bi] = buildBoundedInterpretations([intent()], [result({ claim_id: 'CLAIM-A-v1', candidate_statement: 'Statement A.' })])
    expect(bi.status).toBe('directly_relevant')
    expect(bi.summary_blocks).toHaveLength(1)
    expect(bi.summary_blocks[0]).toBe(bi.summary)
    expect(bi.summary).toContain('Statement A.')
    expect(bi.summary).toMatch(/This is relevant to/)
  })

  // C. two compatible (non-oppositional) D0 claims -> both preserved, separately
  test('C: two compatible D0 claims -> two separate blocks, neither dropped, neither fused', () => {
    const [bi] = buildBoundedInterpretations(
      [intent()],
      [
        result({ claim_id: 'CLAIM-A-v1', candidate_statement: 'Claim A permits commercial use broadly.' }),
        result({ claim_id: 'CLAIM-B-v1', candidate_statement: 'Claim B also permits commercial use, separately.' }),
      ],
    )
    expect(bi.status).toBe('directly_relevant')
    expect(bi.summary_blocks).toHaveLength(2)
    expect(bi.summary_blocks[0]).toContain('Claim A')
    expect(bi.summary_blocks[0]).not.toContain('Claim B')
    expect(bi.summary_blocks[1]).toContain('Claim B')
    expect(bi.summary_blocks[1]).not.toContain('Claim A')
    expect(bi.supporting_claim_ids.sort()).toEqual(['CLAIM-A-v1', 'CLAIM-B-v1'])
  })

  // D. Runway + Kling — the real, already-published production pair the
  // defect was proven live on. Full real pipeline: retrieve() against the
  // live TOPIC_CLAIMS_FIXTURE, not a synthetic result.
  test('D: Runway + Kling (real production claims) -> preserved as separate blocks, not fused into one oppositional sentence', () => {
    const h = handoff({ tools: [tool('runway-gen3'), tool('kling')] })
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const out = retrieve(h, MATRIX_FIXTURE, [g], TOPIC_CLAIMS_FIXTURE)
    const [bi] = buildBoundedInterpretations(userGoalsToBiIntents([g]), out.results, out.diagnostics)
    expect(bi.status).toBe('directly_relevant')
    const klingBlock = bi.summary_blocks.find((b) => b.includes('Kling'))
    const runwayBlock = bi.summary_blocks.find((b) => b.includes('Runway'))
    expect(klingBlock).toBeDefined()
    expect(runwayBlock).toBeDefined()
    // The defect: Kling's restriction and Runway's permission used to share
    // one fused sentence. Now each is its own block.
    expect(klingBlock).not.toContain('Runway')
    expect(runwayBlock).not.toContain('Kling')
    expect(bi.supporting_claim_ids.sort()).toEqual(['CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1', 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1'])
  })

  // E. Higgsfield + Kling architectural canary — Higgsfield is Adopted but
  // WITHHELD from CRC (CPR_035) and has NO production fixture entry. This
  // test does NOT make it CRC-eligible or touch the fixture — it proves,
  // synthetically, that if both claims were ever simultaneously
  // represented, the generic BI fix would preserve them separately rather
  // than reproducing the exact fused-oppositional-statement defect CPR_035
  // found. Statement text mirrors (not quotes verbatim from any runtime
  // file) the shape of GOVERNED-CLAIMS.md's own CLAIM-HIGGSFIELD-
  // COMMERCIAL-USE-001-v1 entry.
  test('E: Higgsfield + Kling architectural canary (Higgsfield remains unpublished; synthetic only)', () => {
    const [bi] = buildBoundedInterpretations(
      [intent()],
      [
        result({
          claim_id: 'CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1',
          candidate_statement: "Higgsfield's current Terms of Use do not claim ownership of your Inputs or Outputs, nor do they restrict your commercial use of Outputs.",
        }),
        result({
          claim_id: 'CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1',
          candidate_statement: "Under Kling's current Terms of Service, you may not use, reproduce, distribute, modify, or create derivative works from generated Output for commercial purposes without Kling's written permission.",
        }),
      ],
    )
    expect(bi.status).toBe('directly_relevant')
    expect(bi.summary_blocks).toHaveLength(2)
    const higgsfieldBlock = bi.summary_blocks.find((b) => b.includes('Higgsfield'))
    const klingBlock = bi.summary_blocks.find((b) => b.includes('Kling'))
    expect(higgsfieldBlock).not.toContain('Kling')
    expect(klingBlock).not.toContain('Higgsfield')
  })

  // F. one dependency-bearing claim (Case 3B / unchanged path)
  test('F: one dependency-bearing D1 claim -> relevant_applicability_unresolved, unchanged Case-3B shape', () => {
    const [bi] = buildBoundedInterpretations(
      [intent({ category: 'copyrightability' })],
      [
        result({
          matched_goal_category: 'copyrightability',
          claim_id: 'CLAIM-DEP-v1',
          candidate_statement: 'Dependency-bearing statement.',
          unresolved_project_dependencies: ['human_contribution_description'],
          source_fact: { kind: 'topic' },
        }),
      ],
    )
    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.summary).toContain('Dependency-bearing statement.')
  })

  // G. multiple dependency-bearing claims (existing CC-1 behavior,
  // intentionally untouched by this milestone — still flattened together,
  // tracked as a known, separately-scoped follow-up, not silently ignored)
  test('G: two dependency-bearing D1 claims -> both quoted, existing (unextended) CC-1 join shape preserved', () => {
    const [bi] = buildBoundedInterpretations(
      [intent({ category: 'copyrightability' })],
      [
        result({
          matched_goal_category: 'copyrightability',
          claim_id: 'CLAIM-DEP-A-v1',
          candidate_statement: 'First dependency-bearing statement.',
          unresolved_project_dependencies: ['human_contribution_description'],
          source_fact: { kind: 'topic' },
        }),
        result({
          matched_goal_category: 'copyrightability',
          claim_id: 'CLAIM-DEP-B-v1',
          candidate_statement: 'Second dependency-bearing statement.',
          unresolved_project_dependencies: ['human_contribution_description'],
          source_fact: { kind: 'topic' },
        }),
      ],
    )
    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.summary).toContain('First dependency-bearing statement.')
    expect(bi.summary).toContain('Second dependency-bearing statement.')
  })

  // H. one D0 + one dependency-bearing claim (existing CC-1 split, unchanged)
  test('H: one D0 + one dependency-bearing claim -> CC-1 splits them into two clauses (pre-existing, unchanged behavior)', () => {
    const [bi] = buildBoundedInterpretations(
      [intent()],
      [
        result({ claim_id: 'CLAIM-D0-v1', candidate_statement: 'Dependency-free statement.' }),
        result({
          claim_id: 'CLAIM-DEP-v1',
          candidate_statement: 'Dependency-bearing statement.',
          unresolved_project_dependencies: ['human_contribution_description'],
        }),
      ],
    )
    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.summary).toContain('Dependency-free statement.')
    expect(bi.summary).toContain('Dependency-bearing statement.')
  })

  // I. multiple D0 + one dependency-bearing claim. The D0 subgroup here
  // still flattens together within CC-1's own noDependencyStatement join
  // (deliberately NOT extended by this milestone -- see the code comment
  // in build-bounded-interpretation.ts for why) -- this test documents that
  // known, narrower, not-yet-fixed shape rather than silently assuming it
  // was also fixed.
  test('I: two D0 claims + one dependency-bearing claim -> both D0 statements present (still jointly clausal, not yet claim-separated — tracked follow-up)', () => {
    const [bi] = buildBoundedInterpretations(
      [intent()],
      [
        result({ claim_id: 'CLAIM-D0-A-v1', candidate_statement: 'First D0 statement.' }),
        result({ claim_id: 'CLAIM-D0-B-v1', candidate_statement: 'Second D0 statement.' }),
        result({
          claim_id: 'CLAIM-DEP-v1',
          candidate_statement: 'Dependency-bearing statement.',
          unresolved_project_dependencies: ['human_contribution_description'],
        }),
      ],
    )
    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.summary).toContain('First D0 statement.')
    expect(bi.summary).toContain('Second D0 statement.')
    expect(bi.summary).toContain('Dependency-bearing statement.')
  })

  // L. unresolved applicability (CAH-4G.3A path) — must still render under
  // relevant_applicability_unresolved, never directly_relevant, unaffected
  // by this milestone.
  test('L: unresolved applicability -> relevant_applicability_unresolved, unaffected by this fix', () => {
    const [bi] = buildBoundedInterpretations(
      [intent()],
      [
        result({
          claim_id: 'CLAIM-UNRESOLVED-APPLICABILITY-v1',
          candidate_statement: 'Applicability-unresolved statement.',
          applicability: { status: 'unresolved', unresolved_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] },
        }),
      ],
    )
    expect(bi.status).toBe('relevant_applicability_unresolved')
  })

  // M. unrelated goal categories never interact
  test('M: two D0 claims matching DIFFERENT categories never share a block', () => {
    const results = [
      result({ claim_id: 'CLAIM-A-v1', candidate_statement: 'Commercial-use statement.', matched_goal_category: 'commercial_use' }),
      result({ claim_id: 'CLAIM-B-v1', candidate_statement: 'Trademark statement.', matched_goal_category: 'trademark', source_fact: { kind: 'topic' } }),
    ]
    const [biCommercial, biTrademark] = buildBoundedInterpretations(
      [intent({ intent_id: 'i-1', category: 'commercial_use' }), intent({ intent_id: 'i-2', category: 'trademark', intent_text: 'Trademark question' })],
      results,
    )
    expect(biCommercial.summary_blocks).toHaveLength(1)
    expect(biCommercial.summary).toContain('Commercial-use statement.')
    expect(biCommercial.summary).not.toContain('Trademark statement.')
    expect(biTrademark.summary_blocks).toHaveLength(1)
    expect(biTrademark.summary).toContain('Trademark statement.')
    expect(biTrademark.summary).not.toContain('Commercial-use statement.')
  })

  // Related-topic "appears once" invariant under multi-D0 preservation —
  // regression-locks the fix made to this exact edge case during this
  // milestone's own regression run (related-topic-interpretation.test.ts
  // already covers this at the Retrieval+BI integration level; this is the
  // direct BI-boundary equivalent).
  test('related-topic boundary clause appears at most once even with two related-topic-origin D0 matches', () => {
    const [bi] = buildBoundedInterpretations(
      [intent({ category: 'copyright_ownership', intent_text: 'Do I own the copyright?' })],
      [
        result({
          claim_id: 'CLAIM-REL-A-v1',
          candidate_statement: 'Related statement A.',
          matched_goal_category: 'copyright_ownership',
          match_origin: 'related_topic',
          source_fact: { kind: 'topic' },
        }),
        result({
          claim_id: 'CLAIM-REL-B-v1',
          candidate_statement: 'Related statement B.',
          matched_goal_category: 'copyright_ownership',
          match_origin: 'related_topic',
          source_fact: { kind: 'topic' },
        }),
      ],
    )
    const occurrences = bi.summary.split('This information is relevant to what you asked, but does not by itself determine the answer.').length - 1
    expect(occurrences).toBe(1)
  })
})
