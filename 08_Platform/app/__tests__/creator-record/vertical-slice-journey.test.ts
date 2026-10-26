/**
 * CR-V2-VERTICAL-SLICE-1 — questionnaire → existing guidance pipeline → draft
 * record, over the REAL governed claim fixtures and the INTERNAL pilot sources.
 * Deterministic: no clock, no I/O, no model call.
 */

import { runCreatorRecordGuidance } from '@/lib/creator-record/integration/run-creator-record-guidance'
import { CREATOR_RECORD_PUBLICATION_LEDGER, CREATOR_RECORD_REGISTRY_INPUT } from '@/lib/creator-record/governed/sources'
import { PILOT_PUBLICATION_LEDGER } from '@/lib/creator-record/pilot/pilot-ledger'
import { isPilotApproval, PILOT_REGISTRY_INPUT } from '@/lib/creator-record/pilot/pilot-registry'
import { isJurisdictionScoped } from '@/lib/creator-record/contract/publication-ledger'
import { buildCreatorRecordDraft, governedSources, loadFormConfig, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import { formToObservations, validateForm, type CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { T } from '@/lib/creator-record/presentation/templates'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const PIKA_BASE = 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1'
const PIKA_STD = 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1'
const PIKA_PRO = 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1'
const PIKA_FANCY = 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1'
const KLING_BASE = 'CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1'
const KLING_MEMBER = 'CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1'
const GETTY = 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1'
const ARTLIST = 'CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1'

const RECORD = { record_id: 'UAT-TEST', record_version: 1, captured_at: '2026-10-26T00:00:00Z' }
const base = (over: Partial<CreatorRecordFormState> = {}): CreatorRecordFormState => ({
  answers: { P1: ['Night Market'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['wrote_script', 'edited'] },
  tools: [{ T1: ['Pika'], T3: ['Pro'], T4: ['March–May 2026'] }],
  acknowledgements: { A1: true, A2: true },
  ...over,
})
const withAnswers = (answers: Record<string, string[]>, over: Partial<CreatorRecordFormState> = {}) => {
  const b = base(over)
  return { ...b, answers: { ...b.answers, ...answers } }
}
function draft(state: CreatorRecordFormState) {
  const r = buildCreatorRecordDraft({ state, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-26', record: RECORD })
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r
}
const cardIds = (r: ReturnType<typeof draft>) => r.view.guidance.cards.map((c) => c.claim_id)
const card = (r: ReturnType<typeof draft>, id: string) => r.view.guidance.cards.find((c) => c.claim_id === id)!

describe('1. normal questionnaire-to-record journey (Pika, Pro plan)', () => {
  const r = draft(base())

  test('shows the Pika baseline and Pro-plan guidance, relevant on what the creator told us', () => {
    expect(cardIds(r)).toEqual([PIKA_BASE, PIKA_PRO])
    for (const c of r.view.guidance.cards) {
      expect(c.conclusion).toBe('relevant_on_declared_facts')
      expect(c.conclusion_label).toBe(T.conclusion_label.relevant_on_declared_facts)
      expect(c.subject).toBe('Pika (AI tool)')
      expect(c.explanation).toBe(PILOT_PUBLICATION_LEDGER.find((e) => e.claim_id === c.claim_id)!.explanation)
    }
    expect(card(r, PIKA_PRO).basis).toEqual(['You told us you were on the “Pro” plan with Pika. SI8 has not checked this.'])
  })

  test('the card conclusion is exactly the composition conclusion (never upgraded)', () => {
    const byId = new Map(r.guidance.composition.items.map((i) => [i.claim_id, i.conclusion]))
    for (const c of r.view.guidance.cards) expect(c.conclusion).toBe(byId.get(c.claim_id))
  })

  test('declarations are recorded verbatim, with locations recorded but never used as jurisdiction', () => {
    const loc = r.view.declarations.groups.find((g) => g.id === 'locations')!
    expect(loc.rows.map((x) => x.value)).toEqual(['Taiwan', 'Online, worldwide'])
    expect(loc.note).toBe(T.locations_note)
    expect(r.guidance.facts.applicabilityFacts.jurisdiction).toEqual({ included: [], excluded: [] })
    expect(r.view.declarations.groups.find((g) => g.id === 'project')!.rows[0]).toEqual({ label: 'What is the title of the video?', value: 'Night Market' })
  })

  test('fixed sections are always present', () => {
    expect(r.view.not_done).toEqual([...T.not_done])
    expect(r.view.independent_review.lines).toContain(T.review_laws)
    expect(r.view.banner?.title).toBe(T.prototype_banner_title)
    expect(r.view.header.status).toBe(T.status_draft)
  })

  test('is deterministic', () => {
    expect(draft(base()).view).toEqual(r.view)
  })
})

describe('2. changing an earlier answer', () => {
  test('changing the plan from Pro to Standard changes which plan guidance is shown', () => {
    const pro = draft(base())
    const std = draft(base({ tools: [{ T1: ['Pika'], T3: ['Standard'], T4: ['May 2026'] }] }))
    expect(cardIds(pro)).toContain(PIKA_PRO)
    expect(cardIds(std)).toEqual([PIKA_BASE, PIKA_STD])
    expect(std.view.not_shown.lines).toContain('Pika (AI tool): not included, because on what you told us this guidance concerns a different Pika plan (“Pro”).')
  })

  test('an answer to a question that is no longer shown is discarded and never reaches the record', () => {
    // L1 was "yes" (so L3 was shown and answered), then changed to "no".
    const r = draft(withAnswers({ L1: ['no'], L3: ['yes'] }))
    expect(r.view.trace.discarded_answers).toEqual([{ q_id: 'L3', tool_index: null }])
    const people = r.view.declarations.groups.find((g) => g.id === 'people')!
    expect(people.rows.map((x) => x.label)).toEqual(['Does the video include the likeness or voice of a real person?'])
    expect(r.view.open_items.documents_mentioned).toEqual([])
    expect(r.view.independent_review.lines).not.toContain(T.review_likeness)
    const config = loadFormConfig(pilotSources())
    expect(formToObservations(config, withAnswers({ L1: ['no'], L3: ['yes'] }), RECORD).observations.some((o) => o.question.q_id === 'L3')).toBe(false)
  })

  test('the same answer, once shown again, is recorded', () => {
    const r = draft(withAnswers({ L1: ['yes'], L3: ['yes'] }))
    expect(r.view.trace.discarded_answers).toEqual([])
    expect(r.view.open_items.documents_mentioned.map((d) => d.note)).toEqual([T.existence_yes_not_provided])
    expect(r.view.independent_review.lines).toContain(T.review_likeness)
  })
})

describe('3. missing or conflicting subscription-plan information', () => {
  test('plan "Not sure": baseline shown; every paid-plan claim held unresolved and says which plan it is about', () => {
    const r = draft(base({ tools: [{ T1: ['Pika'], T3: ['not_sure'], T4: ['May 2026'] }] }))
    expect(cardIds(r).sort()).toEqual([PIKA_BASE, PIKA_STD, PIKA_PRO, PIKA_FANCY].sort())
    for (const id of [PIKA_STD, PIKA_PRO, PIKA_FANCY]) expect(card(r, id).conclusion).toBe('relevant_applicability_unresolved')
    expect(card(r, PIKA_PRO).depends_on).toEqual(['This guidance is about the Pika “Pro” plan. You did not tell us which Pika plan you were on.'])
    expect(card(r, PIKA_PRO).basis).toEqual([])
    expect(r.view.declarations.groups.find((g) => g.id === 'tools')!.rows[1].note).toBe(T.plan_not_sure)
  })

  test('a plan name no guidance refers to is not used, and the record says so', () => {
    const r = draft(base({ tools: [{ T1: ['Pika'], T3: ['Ultra Max'], T4: ['May 2026'] }] }))
    expect(r.view.declarations.groups.find((g) => g.id === 'tools')!.rows[1].note).toBe(T.plan_not_a_plan_name)
    expect(card(r, PIKA_PRO).depends_on).toEqual(['This guidance is about the Pika “Pro” plan. The plan name you gave (“Ultra Max”) is not one this guidance refers to.'])
  })

  test('two different plans for the same tool: neither is used; plan claims held unresolved', () => {
    const r = draft(base({ tools: [{ T1: ['Pika'], T3: ['Pro'], T4: ['May 2026'] }, { T1: ['Pika'], T3: ['Standard'], T4: ['May 2026'] }] }))
    expect(r.guidance.facts.provenance.plans.every((p) => !p.passed_to_applicability)).toBe(true)
    for (const id of [PIKA_STD, PIKA_PRO, PIKA_FANCY]) expect(card(r, id).conclusion).toBe('relevant_applicability_unresolved')
    expect(card(r, PIKA_PRO).depends_on).toEqual(['This guidance is about the Pika “Pro” plan. You gave more than one plan for Pika.'])
    expect(card(r, PIKA_PRO).basis).toEqual([])
    const notes = r.view.declarations.groups.find((g) => g.id === 'tools')!.rows.filter((x) => x.label.endsWith('made the video?')).map((x) => x.note)
    expect(notes).toEqual([T.plan_conflicting, T.plan_conflicting])
  })

  test('case and spacing differences are the same plan, not a conflict', () => {
    const r = draft(base({ tools: [{ T1: ['pika'], T3: ['  pro '], T4: ['May 2026'] }] }))
    expect(cardIds(r)).toEqual([PIKA_BASE, PIKA_PRO])
  })
})

describe('4. claims that are not applicable on what the creator told us', () => {
  test('other Pika plans are excluded before Bounded Interpretation and explained, not shown as guidance', () => {
    const r = draft(base())
    const t = r.view.trace.objectives.find((o) => o.objective_id === 'creator-record:commercial_use:v1')!
    expect(t.excluded_not_met.sort()).toEqual([PIKA_FANCY, PIKA_STD].sort())
    expect(t.bi_input_claim_ids).toEqual([PIKA_BASE, PIKA_PRO])
    expect(r.view.not_shown.lines).toEqual(
      expect.arrayContaining([
        'Pika (AI tool): not included, because on what you told us this guidance concerns a different Pika plan (“Standard”).',
        'Pika (AI tool): not included, because on what you told us this guidance concerns a different Pika plan (“Fancy”).',
      ]),
    )
  })
})

describe('5. claims without Creator Record publication authorization', () => {
  test('Runway and Higgsfield have no pilot entry: their guidance never reaches BI and the record says none is approved yet', () => {
    const r = draft(base({ tools: [{ T1: ['Runway'], T3: ['Standard'], T4: ['May 2026'] }, { T1: ['Higgsfield'], T3: ['not_sure'], T4: ['May 2026'] }] }))
    expect(r.view.guidance.cards).toEqual([])
    expect(r.view.guidance.empty).toBe(T.guidance_none)
    const refused = r.view.trace.objectives.flatMap((o) => o.refused_before_bi)
    expect(refused).toEqual(
      expect.arrayContaining([
        { claim_id: 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1', reason: 'no_ledger_entry' },
        { claim_id: 'CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1', reason: 'no_ledger_entry' },
      ]),
    )
    expect(r.view.trace.objectives.every((o) => o.bi_input_claim_ids.length === 0)).toBe(true)
    expect(r.view.not_shown.lines).toEqual(
      expect.arrayContaining(['Runway (AI tool): SI8 has no guidance approved for Creator Records about this yet.', 'Higgsfield (AI tool): SI8 has no guidance approved for Creator Records about this yet.']),
    )
  })

  test('an unrecognized tool name contributes nothing and is reported', () => {
    const r = draft(base({ tools: [{ T1: ['Vidmagic 9000'], T3: ['Pro'], T4: ['May 2026'] }] }))
    expect(r.view.guidance.cards).toEqual([])
    expect(r.view.not_shown.lines).toContain('“Vidmagic 9000”: SI8 did not recognize this name, so no guidance about it is included.')
    expect(r.view.declarations.groups.find((g) => g.id === 'tools')!.rows[0].note).toBe(T.tool_not_recognized)
  })

  test('the AUTHORITATIVE ledger is empty and fails closed: the same declarations publish nothing', () => {
    expect(CREATOR_RECORD_PUBLICATION_LEDGER).toEqual([])
    const config = loadFormConfig(pilotSources())
    const { observations } = formToObservations(config, base(), RECORD)
    const g = runCreatorRecordGuidance({ observations, topicClaims: TOPIC_CLAIMS_FIXTURE, ledger: CREATOR_RECORD_PUBLICATION_LEDGER, dependencyLabel: () => undefined, as_of: '2026-10-26' })
    expect(g.composition.items).toEqual([])
    expect(g.objectives.flatMap((o) => o.refused_before_bi).every((x) => x.reason === 'no_ledger_entry')).toBe(true)
  })

  test('the AUTHORITATIVE registry is empty: no question is shown, so no answer can be recorded', () => {
    expect(CREATOR_RECORD_REGISTRY_INPUT.questions).toEqual([])
    const r = buildCreatorRecordDraft({ state: base(), sources: governedSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-26', record: RECORD })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues.some((i) => i.issue === 'unknown_question')).toBe(true)
  })

  test('a pilot entry stops working when the governed claim is re-verified after it (refresh discipline holds)', () => {
    const reverified = TOPIC_CLAIMS_FIXTURE.map((c) => (c.claim_id === PIKA_PRO ? { ...c, last_verified: '2026-10-20' } : c))
    const r = buildCreatorRecordDraft({ state: base(), sources: pilotSources(), topicClaims: reverified, as_of: '2026-10-26', record: RECORD })
    if (!r.ok) throw new Error('unexpected')
    expect(r.view.guidance.cards.map((c) => c.claim_id)).toEqual([PIKA_BASE])
    expect(r.view.trace.objectives[0].refused_before_bi).toContainEqual({ claim_id: PIKA_PRO, reason: 'claim_reverified_since_approval' })
  })
})

describe('6. missing evidence and unresolved dependencies', () => {
  const r = draft(withAnswers({ M0: ['music', 'stock'], M1: ['Artlist'], M2: ['yes'], M3: ['Getty Images'], M3D: ['yes'] }))

  test('Getty and Artlist guidance is shown capped at "may be relevant", with every dependency open', () => {
    expect(card(r, GETTY).conclusion).toBe('relevant_applicability_unresolved')
    expect(card(r, ARTLIST).conclusion).toBe('relevant_applicability_unresolved')
    expect(r.view.open_items.items.map((o) => o.dependency_id).sort()).toEqual(
      ['artlist_subscription_active_at_publication_confirmed', 'asset_confirmed_getty', 'editorial_designation_confirmed', 'separate_authorization_obtained'].sort(),
    )
    for (const o of r.view.open_items.items) {
      expect(o.status).toBe(T.open_status)
      expect(o.sufficiency).toBe(T.open_sufficiency)
      expect(o.documents).toBe(T.open_documents_none)
    }
  })

  test('Editorial designation and separate authorization are never resolved or even attached to by a declaration', () => {
    for (const id of ['editorial_designation_confirmed', 'separate_authorization_obtained']) {
      expect(r.view.open_items.items.find((o) => o.dependency_id === id)!.told_us).toBe(T.open_told_us_none)
    }
    expect(r.guidance.composition.items.flatMap((i) => i.dependency_rows).every((row) => row.status === 'open' && row.sufficiency === 'not_assessed')).toBe(true)
  })

  test('documents the creator says they have are recorded as "not provided", never as evidence', () => {
    expect(r.view.open_items.documents_mentioned.map((d) => d.note)).toEqual([T.existence_yes_not_provided, T.existence_yes_not_provided])
  })

  test('the pilot registry cannot map any answer to an evidence-only or legal-determination dependency', () => {
    const targets = PILOT_REGISTRY_INPUT.observation_map.flatMap((o) => (o.target.kind === 'dependency' ? [o.target.dependency_id] : []))
    for (const t of targets) expect(PILOT_REGISTRY_INPUT.prohibited_dependency_targets).not.toContain(t)
    expect(targets).not.toContain('editorial_designation_confirmed')
    expect(targets).not.toContain('release_status_confirmed')
    expect(targets).not.toContain('separate_authorization_obtained')
    expect(targets).not.toContain('rights_and_clearance_status')
  })
})

describe('7. multi-tool records (BI narrows per objective)', () => {
  test('one unresolved claim in an objective holds every claim in that objective at "may be relevant"', () => {
    const r = draft(base({ tools: [{ T1: ['Pika'], T3: ['Pro'], T4: ['May 2026'] }, { T1: ['Kling'], T3: ['Standard'], T4: ['May 2026'] }] }))
    expect(cardIds(r)).toEqual(expect.arrayContaining([PIKA_BASE, PIKA_PRO, KLING_BASE, KLING_MEMBER]))
    expect(r.view.guidance.cards.every((c) => c.conclusion === 'relevant_applicability_unresolved')).toBe(true)
    expect(card(r, KLING_MEMBER).depends_on).toEqual(['This guidance is about a Kling account type (“Member Account”). This record does not ask about account types.'])
  })
})

describe('8. validation', () => {
  const config = loadFormConfig(pilotSources())
  test('required questions, at least one tool and both acknowledgements', () => {
    const issues = validateForm(config, { answers: {}, tools: [], acknowledgements: {} })
    const kinds = issues.map((i) => `${i.q_id}:${i.issue}`)
    expect(kinds).toEqual(expect.arrayContaining(['P1:required', 'P3:required', 'F1:required', 'F2:required', 'L1:required', 'M0:required', 'H1:required', 'null:no_tools', 'A1:acknowledgement_required', 'A2:acknowledgement_required']))
  })
  test('per-tool required answers, invalid options, single-choice and tool limit', () => {
    const issues = validateForm(config, withAnswers({ F1: ['TW', 'GB'], L1: ['maybe'] }, { tools: [{}, {}, {}, {}] }))
    const kinds = issues.map((i) => `${i.q_id}:${i.tool_index}:${i.issue}`)
    expect(kinds).toEqual(expect.arrayContaining(['F1:null:single_choice_only', 'L1:null:invalid_option', 'T1:0:required', 'T3:0:required', 'null:null:too_many_tools']))
  })
  test('a valid form produces no issues', () => {
    expect(validateForm(config, base())).toEqual([])
  })
})

describe('pilot ledger isolation and integrity', () => {
  const byId = new Map(TOPIC_CLAIMS_FIXTURE.map((c) => [c.claim_id, c]))
  test('every pilot entry names a current governed claim and matches its last_verified date', () => {
    for (const e of PILOT_PUBLICATION_LEDGER) {
      const c = byId.get(e.claim_id)
      expect(c).toBeDefined()
      expect(c!.superseded_by).toBeNull()
      expect(e.claim_last_verified).toBe(c!.last_verified)
      expect(isJurisdictionScoped(c!)).toBe(false)
    }
  })
  test('the pilot excludes Runway and Higgsfield, and every entry is marked as a pilot entry', () => {
    expect(PILOT_PUBLICATION_LEDGER.map((e) => e.claim_id).sort()).toEqual([PIKA_BASE, PIKA_STD, PIKA_PRO, PIKA_FANCY, KLING_BASE, KLING_MEMBER, GETTY, ARTLIST].sort())
    for (const e of PILOT_PUBLICATION_LEDGER) {
      expect(e.entry_id.startsWith('PILOT-UAT-')).toBe(true)
      expect(e.approver).toMatch(/^PILOT-UAT — .*NOT a Creator Record publication approval/)
    }
    for (const q of PILOT_REGISTRY_INPUT.questions) expect(isPilotApproval(q.approval)).toBe(true)
    for (const o of PILOT_REGISTRY_INPUT.observation_map) expect(isPilotApproval(o.approval)).toBe(true)
  })
})
