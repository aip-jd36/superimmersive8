/**
 * CR-IMPL-1 / CR-IMPL-1b — bounded composition: explicit claim → objective →
 * interpretation provenance, never stronger than Bounded Interpretation,
 * fail closed on ambiguity or broken provenance. Synthetic only.
 */

import type { InterpretationStatus } from '@/lib/bounded-interpretation/types'
import { INTERPRETATION_STATUSES } from '@/lib/bounded-interpretation/types'
import { biRankForStatus, composeGuidance, conclusionRank, CREATOR_RECORD_CONCLUSIONS, type CompositionInput, type CreatorRecordObjective, type ObjectiveEvaluation } from '@/lib/creator-record/contract/compose'
import type { DeclaredObservation, RecordContext } from '@/lib/creator-record/contract/provenance'
import { loadQuestionRegistry, mapAnswer } from '@/lib/creator-record/contract/question-registry'
import type { ClaimDescriptor } from '@/lib/creator-record/contract/publication-ledger'
import { synBi, synClaim, synLabel, synLedgerEntry, synRegistryInput, synSelected } from '@/lib/creator-record/contract/testing/synthetic-fixtures'

const CTX: RecordContext = { record_id: 'SYN-REC-3', record_version: 1, captured_at: '2026-10-25T00:00:00Z' }
const reg = (() => {
  const r = loadQuestionRegistry(synRegistryInput())
  if (!r.ok) throw new Error(r.errors.join('; '))
  return r.registry
})()
const declare = (q_id: string, values: string[], answers: Record<string, string[]> = {}): DeclaredObservation[] => {
  const r = mapAnswer(reg, answers, CTX, { q_id, q_version: 1, values, verbatim: values.join(', ') })
  if (!r.ok) throw new Error(r.reason)
  return r.observations
}

const OBJ_A: CreatorRecordObjective = { objective_id: 'SYN-OBJ-A', version: 1, topic: 'commercial_use', origin: 'creator_record_system_objective' }
const OBJ_B: CreatorRecordObjective = { objective_id: 'SYN-OBJ-B', version: 1, topic: 'third_party_source_rights', origin: 'creator_record_system_objective' }

const PLAIN = synClaim({ claim_id: 'CLAIM-SYN-PLAIN-v1', applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'syn-tool', operator: 'equals', value: 'syn_paid' }] })
const DEP = synClaim({ claim_id: 'CLAIM-SYN-DEP-v1', unresolved_project_dependencies: ['syn_evidence_only_dep'] })

const evalOf = (objective: CreatorRecordObjective, status: InterpretationStatus | null, claims: ClaimDescriptor[], opts: { unresolvedCited?: string[]; applicability?: 'met' | 'unresolved'; goalId?: string } = {}): ObjectiveEvaluation => ({
  objective,
  fed_claims: claims.map((c) => synSelected(c, opts.applicability ?? 'met')),
  interpretation: status === null ? null : synBi(status, opts.unresolvedCited ? [] : claims.map((c) => c.claim_id), opts.unresolvedCited ?? [], opts.goalId ?? objective.objective_id),
})

function input(over: Partial<CompositionInput> = {}): CompositionInput {
  return {
    evaluations: [evalOf(OBJ_A, 'directly_relevant', [PLAIN]), evalOf(OBJ_B, 'relevant_applicability_unresolved', [DEP])],
    ledger: [synLedgerEntry({ claim_id: PLAIN.claim_id }), synLedgerEntry({ claim_id: DEP.claim_id, evidence_notes: { syn_evidence_only_dep: 'SYN evidence note' } })],
    observations: [...declare('SYN-TOOL-PLAN', ['syn_paid']), ...declare('SYN-PRESENCE', ['yes']), ...declare('SYN-DOC-EXISTS', ['yes'], { 'SYN-PRESENCE': ['yes'] })],
    dependencyLabel: synLabel,
    as_of: '2026-10-25',
    ...over,
  }
}

describe('Creator Record never strengthens a Bounded Interpretation conclusion', () => {
  test('its vocabulary has no direct-relevance, met, satisfied or clearance term', () => {
    expect(CREATOR_RECORD_CONCLUSIONS.join(' ')).not.toMatch(/direct|\bmet\b|satisf|clear|complian|verif|certif|approv|\bresolved\b/)
  })

  const cases = [PLAIN, DEP].flatMap((claim) =>
    INTERPRETATION_STATUSES.flatMap((status) =>
      (['met_only', 'met_or_unresolved'] as const).flatMap((policy) =>
        (['supporting', 'unresolved_relevant'] as const).flatMap((role) => (['met', 'unresolved'] as const).map((app) => [claim, status, policy, role, app] as const)),
      ),
    ),
  )
  test.each(cases)('%#: claim/status/policy/citation/applicability', (claim, status, policy, role, app) => {
    const ev = evalOf(OBJ_A, status, [claim], { applicability: app, unresolvedCited: role === 'unresolved_relevant' ? [claim.claim_id] : undefined })
    const out = composeGuidance(input({ evaluations: [ev], ledger: [synLedgerEntry({ claim_id: claim.claim_id, applicability_policy: policy })] }))
    const ceiling = role === 'supporting' ? biRankForStatus(status) : Math.min(biRankForStatus(status), 1)
    for (const item of out.items) {
      expect(conclusionRank(item.conclusion)).toBeLessThanOrEqual(ceiling)
      if (app === 'unresolved') expect(item.conclusion).toBe('relevant_applicability_unresolved')
    }
    expect(out.items.length + out.omissions.length).toBe(1)
  })
})

describe('explicit claim → objective provenance replaces "weakest wins"', () => {
  test('a claim cited by two objectives is omitted as ambiguous, never combined', () => {
    const out = composeGuidance(input({ evaluations: [evalOf(OBJ_A, 'directly_relevant', [PLAIN]), evalOf(OBJ_B, 'relevant_applicability_unresolved', [PLAIN])] }))
    expect(out.items).toEqual([])
    expect(out.omissions).toEqual([{ claim_id: PLAIN.claim_id, objective_id: null, reason: 'ambiguous_objective_citation' }])
  })

  test('the same ambiguity with identical statuses is still omitted (no silent merge)', () => {
    const out = composeGuidance(input({ evaluations: [evalOf(OBJ_A, 'directly_relevant', [PLAIN]), evalOf(OBJ_B, 'directly_relevant', [PLAIN])] }))
    expect(out.omissions.map((o) => o.reason)).toEqual(['ambiguous_objective_citation'])
  })

  test('an interpretation whose goal_id does not echo its objective fails closed', () => {
    const out = composeGuidance(input({ evaluations: [evalOf(OBJ_A, 'directly_relevant', [PLAIN], { goalId: 'SOMETHING-ELSE' })] }))
    expect(out).toEqual({ items: [], omissions: [{ claim_id: PLAIN.claim_id, objective_id: 'SYN-OBJ-A', reason: 'interpretation_objective_mismatch' }] })
  })

  test('BI citing a claim the objective never fed fails closed', () => {
    const ev: ObjectiveEvaluation = { objective: OBJ_A, fed_claims: [], interpretation: synBi('directly_relevant', [PLAIN.claim_id], [], OBJ_A.objective_id) }
    expect(composeGuidance(input({ evaluations: [ev] })).omissions).toEqual([{ claim_id: PLAIN.claim_id, objective_id: 'SYN-OBJ-A', reason: 'cited_claim_not_fed' }])
  })

  test('fed claims BI did not cite, or with BI not called, are reported, not shown', () => {
    const notCited: ObjectiveEvaluation = { objective: OBJ_A, fed_claims: [synSelected(PLAIN)], interpretation: synBi('outside_current_coverage', [], [], OBJ_A.objective_id) }
    expect(composeGuidance(input({ evaluations: [notCited] })).omissions).toEqual([{ claim_id: PLAIN.claim_id, objective_id: 'SYN-OBJ-A', reason: 'not_cited_by_bi' }])
    const noBi: ObjectiveEvaluation = { objective: OBJ_A, fed_claims: [synSelected(PLAIN)], interpretation: null }
    expect(composeGuidance(input({ evaluations: [noBi] })).omissions).toEqual([{ claim_id: PLAIN.claim_id, objective_id: 'SYN-OBJ-A', reason: 'not_cited_by_bi' }])
  })

  test('declined interpretations permit nothing even if they name a claim', () => {
    const out = composeGuidance(input({ evaluations: [evalOf(OBJ_A, 'determination_declined', [PLAIN])] }))
    expect(out.omissions).toEqual([{ claim_id: PLAIN.claim_id, objective_id: 'SYN-OBJ-A', reason: 'bi_permits_nothing' }])
  })
})

describe('narrowing and provenance', () => {
  const out = composeGuidance(input())
  const item = (id: string) => out.items.find((i) => i.claim_id === id)!

  test('a plain, met claim under directly-relevant BI is "relevant on declared facts", with the declared basis and full provenance', () => {
    const p = item(PLAIN.claim_id)
    expect(p.conclusion).toBe('relevant_on_declared_facts')
    expect(p.applicability).toEqual({ status: 'met', material_unresolved: [] })
    expect(p.declared_applicability_basis).toEqual([{ fact: 'tool_plan_tier', tool: 'syn-tool', instance: null, observation_id: 'SYN-REC-3:v1:SYN-TOOL-PLAN:0', normalized_value: 'syn_paid' }])
    expect(p.provenance).toEqual({
      claim: { claim_id: PLAIN.claim_id, last_verified: '2026-09-01' },
      objective: { objective_id: 'SYN-OBJ-A', version: 1, topic: 'commercial_use', origin: 'creator_record_system_objective' },
      bounded_interpretation: { goal_id: 'SYN-OBJ-A', status: 'directly_relevant', citation: 'supporting' },
      publication: { entry_id: `SYN-LEDGER-${PLAIN.claim_id}`, version: 1, approver: 'SYN-APPROVER', decision_date: '2026-10-01', refresh_by: '2027-01-01' },
    })
    expect(JSON.stringify(p)).not.toContain('SYN BI summary')
  })

  test('a met claim is still capped when the selector says applicability is unresolved', () => {
    const o = composeGuidance(input({ evaluations: [evalOf(OBJ_A, 'directly_relevant', [PLAIN], { applicability: 'unresolved' })] }))
    expect(o.items[0]).toMatchObject({ conclusion: 'relevant_applicability_unresolved', applicability: { status: 'unresolved' } })
  })

  test('open dependencies stay open; the declaration is shown beside them and resolves nothing', () => {
    const d = item(DEP.claim_id)
    expect(d.conclusion).toBe('relevant_applicability_unresolved')
    expect(d.dependency_rows).toEqual([expect.objectContaining({ dependency_id: 'syn_evidence_only_dep', status: 'open', sufficiency: 'not_assessed', evidence_note: 'SYN evidence note' })])
    expect(d.dependency_rows[0].declarations.map((x) => x.observation_kind)).toEqual(['declared_document_existence'])
  })

  test('the ledger is re-checked at composition: a refused claim is omitted even if BI cited it', () => {
    const o = composeGuidance(input({ ledger: [synLedgerEntry({ claim_id: PLAIN.claim_id, creator_record_eligible: 'Pending' })] }))
    expect(o.items).toEqual([])
    expect(o.omissions).toEqual([
      { claim_id: PLAIN.claim_id, objective_id: 'SYN-OBJ-A', reason: 'not_eligible' },
      { claim_id: DEP.claim_id, objective_id: 'SYN-OBJ-B', reason: 'no_ledger_entry' },
    ])
  })

  test('met_only removes a claim that is not relevant on declared facts', () => {
    const o = composeGuidance(input({ evaluations: [evalOf(OBJ_B, 'relevant_applicability_unresolved', [DEP])], ledger: [synLedgerEntry({ claim_id: DEP.claim_id, applicability_policy: 'met_only' })] }))
    expect(o).toEqual({ items: [], omissions: [{ claim_id: DEP.claim_id, objective_id: 'SYN-OBJ-B', reason: 'policy_requires_met' }] })
  })

  test('deterministic and non-mutating', () => {
    const i = input()
    const snap = JSON.stringify({ ...i, dependencyLabel: undefined })
    expect(composeGuidance(i)).toEqual(composeGuidance(input()))
    expect(JSON.stringify({ ...i, dependencyLabel: undefined })).toBe(snap)
  })

  test('no evaluations → nothing', () => {
    expect(composeGuidance(input({ evaluations: [] }))).toEqual({ items: [], omissions: [] })
  })
})
