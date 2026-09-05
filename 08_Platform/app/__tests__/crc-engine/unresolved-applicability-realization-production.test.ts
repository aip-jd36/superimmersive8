/**
 * M2B.1 -- production-registry-path realization test. Deliberately NO
 * jest.mock() of either `selector-askability.ts` or
 * `applicability-fact-display.ts` -- this proves the real, currently-shipped
 * production wiring produces the approved bounded sentence, as a sibling to
 * (never a replacement for) the synthetic/mock-based generic coverage in
 * unresolved-applicability-realization.test.ts. Kept in its own file rather
 * than a new describe block in that file specifically so no `jest.mock()`
 * hoisting at the top of that file can ever shadow this one's real-registry
 * intent.
 *
 * Uses a synthetic tool identifier (not any real provider) -- the fact
 * itself (`tool_account_status`) and its production classification/label are
 * real; the tool/claim/goal are still test fixtures, per this milestone's
 * own "no provider-specific production logic" discipline.
 */

import { realizeUnresolvedApplicability } from '@/lib/crc-engine/unresolved-applicability-realization'
import type { PlanClaimRef, PlanGoalSection } from '@/lib/crc-engine/consultative-answer-plan'
import { getSelectorAskabilityEntry } from '@/lib/crc-engine/selector-askability'
import { getApplicabilityFactLabel } from '@/lib/crc-engine/applicability-fact-display'

const SYNTH_TOOL = 'synthtool'

function claimRef(overrides: Partial<PlanClaimRef> & Pick<PlanClaimRef, 'claim_id'>): PlanClaimRef {
  return { matrix_identifier: SYNTH_TOOL, match_origin: 'exact_topic', matched_goal_category: 'commercial_use', relationship_id: null, last_verified: null, ...overrides }
}

function qualifyingSection(): PlanGoalSection {
  return {
    goal_text: 'Can I use this commercially?',
    category: 'commercial_use',
    bi_status: 'directly_relevant',
    disposition: 'governed_guidance_available_with_open_items',
    supported_claim_refs: [claimRef({ claim_id: 'BASELINE-CLAIM' })],
    summary_claim_refs: [claimRef({ claim_id: 'BASELINE-CLAIM' })],
    unresolved_items: [{ kind: 'unresolved_applicability', claim_id: 'MEMBER-CLAIM', fact: 'tool_account_status', tool: SYNTH_TOOL }],
    missing_evidence: [],
    boundary_ref: 'case_3b_unresolved',
    bi_summary_blocks: [
      'Baseline statement text.',
      "There's additional governed guidance relevant to this topic that hasn't been confirmed as applicable based on what's been described here — it may or may not apply, and CRC can't determine that from this conversation.",
    ],
  }
}

describe('realizeUnresolvedApplicability -- production registry path (no mocks)', () => {
  test('sanity: production registries are wired the way this test assumes', () => {
    expect(getSelectorAskabilityEntry('tool_account_status')?.treatment).toBe('askable_in_crc')
    expect(getApplicabilityFactLabel('tool_account_status')).toBe('account or membership status')
  })

  test('a qualifying unresolved tool_account_status section produces the exact bounded note using the real production label', () => {
    const notes = realizeUnresolvedApplicability([qualifyingSection()])
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toBe("Specifically, this depends on your account or membership status, which hasn't been confirmed in this conversation.")
  })

  test('the note contains the approved label and none of the forbidden strengthening language', () => {
    const [note] = realizeUnresolvedApplicability([qualifyingSection()])
    expect(note.text).toContain('account or membership status')
    expect(note.text).not.toMatch(/member account|paid|starter|commercial clearance/i)
    expect(note.text).not.toMatch(/material|significant|risk|blocks?|prevents|defeats|clears|verif|require|document|principal|severity|priority/i)
    expect(note.text).not.toMatch(/commercial assurance/i)
    expect(note.text).not.toContain('tool_account_status') // raw enum never surfaces
  })
})

// ── negative tests: activating tool_account_status must not cause a note for
// anything else, against the REAL production registries (not the mocks in
// unresolved-applicability-realization.test.ts, which already thoroughly
// prove the generic mechanism -- these confirm the actual shipped registry
// content produces the same fail-closed outcomes). ──────────────────────────

describe('activating tool_account_status does not affect other facts/cases (production registries)', () => {
  test('tool_plan_tier unresolved -> zero notes (unregistered in production -- also covers the generic requires_documentary_evidence/applicability_unresolved fail-closed branch)', () => {
    expect(getApplicabilityFactLabel('tool_plan_tier')).toBeUndefined()
    const s = { ...qualifyingSection(), unresolved_items: [{ kind: 'unresolved_applicability' as const, claim_id: 'X', fact: 'tool_plan_tier' as const, tool: SYNTH_TOOL }] }
    expect(realizeUnresolvedApplicability([s])).toEqual([])
  })

  test('jurisdiction unresolved -> zero notes (dedicated path guard, regardless of registry content)', () => {
    const s = { ...qualifyingSection(), unresolved_items: [{ kind: 'unresolved_applicability' as const, claim_id: 'X', fact: 'jurisdiction' as const, tool: null }] }
    expect(realizeUnresolvedApplicability([s])).toEqual([])
  })

  test('multiple distinct unresolved facts (tool_account_status + tool_plan_tier) -> zero notes, even though one of them IS labeled', () => {
    const s = {
      ...qualifyingSection(),
      unresolved_items: [
        { kind: 'unresolved_applicability' as const, claim_id: 'A', fact: 'tool_account_status' as const, tool: SYNTH_TOOL },
        { kind: 'unresolved_applicability' as const, claim_id: 'B', fact: 'tool_plan_tier' as const, tool: SYNTH_TOOL },
      ],
    }
    expect(realizeUnresolvedApplicability([s])).toEqual([])
  })

  test('not_met / met (no unresolved_applicability item present) -> zero notes', () => {
    const s = { ...qualifyingSection(), unresolved_items: [] }
    expect(realizeUnresolvedApplicability([s])).toEqual([])
  })

  test('irrelevant/unattached (no supported claim at all, pure Case 3A shape) -> zero notes even with a qualifying item', () => {
    const s = { ...qualifyingSection(), supported_claim_refs: [], summary_claim_refs: [] }
    expect(realizeUnresolvedApplicability([s])).toEqual([])
  })
})
