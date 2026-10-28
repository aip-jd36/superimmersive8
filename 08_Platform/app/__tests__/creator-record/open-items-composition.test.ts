/**
 * CR-V2-MVP-1 / CR-V2-COMP-001 — open-items reporting.
 *
 * Root cause (projection, not interpretation): composition already carries
 * Bounded Interpretation's unresolved applicability per item
 * (`applicability.material_unresolved`, conclusion
 * `relevant_applicability_unresolved`), but the view model counted only
 * evidence-dependency rows as "open items", so an unknown plan produced
 * "…; 0 open items." The correction is view-model only: unresolved
 * applicability is listed as "Information this record does not establish",
 * the summary counts both kinds and the guidance that is only conditionally
 * relevant, and a card held at "may be relevant" by its purpose (objective)
 * says why. Guidance selection, exclusions and conclusions are unchanged.
 */

import { buildCreatorRecordDraft, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { documentForFixture } from '@/lib/creator-record/public-uat/fixtures'
import { T } from '@/lib/creator-record/presentation/templates'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const ACK = { A1: true, A2: true }
const ANS = { P1: ['UAT'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const RECORD = { record_id: 'COMP-001', record_version: 1, captured_at: '2026-10-27T00:00:00Z' }
const s = (tools: Record<string, string[]>[], answers: Record<string, string[]> = {}): CreatorRecordFormState => ({ answers: { ...ANS, ...answers }, tools, acknowledgements: ACK })
const tool = (T1: string, T3: string) => ({ T1: [T1], T3: [T3], T4: ['May 2026'] })
function draft(state: CreatorRecordFormState, documents: Parameters<typeof buildCreatorRecordDraft>[0]['documents'] = []) {
  const r = buildCreatorRecordDraft({ state, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-27', record: RECORD, documents })
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r
}
const summary = (r: ReturnType<typeof draft>) => r.view.summary[1]

describe('1 — an unknown plan with conditional guidance is not presented as complete', () => {
  const r = draft(s([tool('pika', 'not_sure')]))

  test('the summary counts the conditional guidance and, separately (CR-V2-MVP-17), the one unresolved matter', () => {
    expect(summary(r)).toBe(T.summary_counts(4, 4))
    expect(summary(r)).toBe('4 pieces of guidance included. 4 of 4 may be relevant only depending on information this record does not establish.')
    expect(r.view.summary[2]).toBe(T.summary_conditions(1))
    expect(r.view.summary[2]).toBe('1 matter remains unresolved for the guidance shown here. See ‘Open items and missing evidence’ for details.')
    expect(r.view.summary.join(' ')).not.toMatch(/0 open items/)
    expect(r.view.open_items.empty).toBeNull()
  })

  test('the unresolved plan is listed as information this record does not establish, with what the creator said and the plans the guidance refers to', () => {
    expect(r.view.open_items.not_established).toEqual([
      {
        key: 'tool_plan_tier:pika',
        label: 'Which Pika plan you were on',
        told_us: T.not_established_told_plan_none,
        status: 'Open',
        for_guidance: ['Pika (AI tool)'],
        next: expect.stringMatching(/^The guidance refers to the Pika “(Fancy|Pro|Standard)”, “(Fancy|Pro|Standard)” and “(Fancy|Pro|Standard)” plans\. To update your Pika plan, select ‘Edit answers’ and change your plan selection\.$/),
      },
    ])
    for (const p of ['Fancy', 'Pro', 'Standard']) expect(r.view.open_items.not_established[0].next).toContain(`“${p}”`)
    // It is not presented as missing evidence: no evidence dependency is invented.
    expect(r.view.open_items.items).toEqual([])
    expect(r.view.independent_review.lines).toContain(T.review_not_established)
    expect(r.view.independent_review.lines).not.toContain(T.review_open_items)
  })

  test('a card held at "may be relevant" by its purpose says why; plan cards keep their own reason', () => {
    const baseline = r.view.guidance.cards.find((c) => c.claim_id === 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1')!
    expect(baseline.conclusion).toBe('relevant_applicability_unresolved')
    expect(baseline.depends_on).toEqual([T.depends_shared_purpose])
    for (const c of r.view.guidance.cards.filter((x) => x.claim_id.includes('PAID-PLAN'))) {
      expect(c.depends_on).toHaveLength(1)
      expect(c.depends_on[0]).toMatch(/You did not tell us which Pika plan you were on/)
    }
    // Every conditionally relevant card now carries at least one reason.
    for (const c of r.view.guidance.cards) if (c.conclusion === 'relevant_applicability_unresolved') expect(c.depends_on.length).toBeGreaterThan(0)
  })
})

describe('2 — a known plan with no outstanding dependency is described accurately, without implying clearance', () => {
  const r = draft(s([tool('pika', 'Pro')]))
  test('summary and open items', () => {
    expect(summary(r)).toBe('2 pieces of guidance included. They were selected using your own answers, which SI8 has not checked.')
    // CR-V2-MVP-17: zero conditions is stated without implying usability or sufficient evidence.
    expect(r.view.summary[2]).toBe(T.summary_conditions(0))
    expect(r.view.summary[2]).toMatch(/does not establish whether your project can be used commercially or whether your supporting evidence is sufficient/)
    expect(r.view.summary[3]).toBe(T.recon_none)
    expect(r.view.open_items).toEqual(expect.objectContaining({ not_established: [], items: [], empty: T.open_none }))
    expect(r.view.summary).toContain(T.summary_not_assessment)
    expect(r.view.not_done).toContain('This record is not legal advice and is not a commercial clearance decision.')
    expect(summary(r)).not.toMatch(/clear|safe|approved|complete|no risk|nothing (else|more)/i)
  })
})

describe('3 — missing service dates stay unknown; nothing about coverage is fabricated', () => {
  test('a receipt with no printed service period adds no open item and no coverage statement', () => {
    const doc = documentForFixture('pdf-pika-pro-no-period')
    const withDoc = draft(s([tool('pika', 'Pro')]), [{ tool_index: 0, document: doc }])
    const without = draft(s([tool('pika', 'Pro')]))
    // CR-V2-MVP-6: only the "Documents" line differs (it says a document was added; it never establishes the item).
    const strip = (o: typeof without.view.open_items) => ({ ...o, items: o.items.map(({ documents: _d, ...rest }) => rest) })
    expect(strip(withDoc.view.open_items)).toEqual(strip(without.view.open_items))
    // CR-V2-MVP-17: only the summary's document line differs; guidance and conditions lines are identical.
    const docLine = (l: string) => l === T.recon_none || l.startsWith('Provisional document comparisons') || l.startsWith('No supporting document was added')
    expect(withDoc.view.summary.filter((l) => !docLine(l))).toEqual(without.view.summary.filter((l) => !docLine(l)))
    expect(without.view.summary).toContain(T.recon_none)
    expect(withDoc.view.summary).not.toContain(T.recon_none)
    const rows = withDoc.view.documents.items[0].rows
    expect(rows).toContainEqual({ label: T.doc_field_label.service_period_start, value: T.doc_field_status.not_shown })
    expect(rows).toContainEqual({ label: T.doc_field_label.service_period_end, value: T.doc_field_status.not_shown })
    expect(JSON.stringify(withDoc.view)).not.toMatch(/\bcover(s|ed|age)\b|active (during|throughout)|was active/i)
  })
})

describe('4 — correcting an unknown plan updates both the guidance and the unresolved state', () => {
  test('not sure → Pro', () => {
    const before = draft(s([tool('pika', 'not_sure')]))
    const after = draft(s([tool('pika', 'Pro')]))
    expect(before.view.open_items.not_established).toHaveLength(1)
    expect(after.view.open_items.not_established).toEqual([])
    expect(after.view.guidance.cards.map((c) => c.claim_id).sort()).toEqual(['CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1', 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1'])
    expect(after.view.guidance.cards.every((c) => c.depends_on.length === 0)).toBe(true)
  })

  test('conflicting plans list both answers; an unrecognised plan name is shown as given', () => {
    const conflict = draft(s([tool('pika', 'Pro'), tool('pika', 'Standard')]))
    expect(conflict.view.open_items.not_established[0]).toEqual(expect.objectContaining({ label: 'Which Pika plan you were on', told_us: 'Pro; Standard' }))
    const unknownName = draft(s([tool('pika', 'Ultra Max')]))
    expect(unknownName.view.open_items.not_established[0].told_us).toBe('Ultra Max')
  })

  test('an account-type requirement is listed as such, as not asked in this record', () => {
    const r = draft(s([tool('pika', 'Pro'), tool('kling', 'not_sure')]))
    expect(r.view.open_items.not_established).toEqual([
      {
        key: 'tool_account_status:kling',
        label: 'Which Kling account type applies',
        told_us: T.open_told_us_none,
        status: 'Open',
        for_guidance: ['Kling (AI tool)'],
        next: T.not_established_next_account('Kling', 'Member Account'),
      },
    ])
  })

  test('evidence dependencies and unestablished information are counted together but listed separately', () => {
    const r = draft(s([tool('kling', 'not_sure')], { M0: ['music', 'stock'], M1: ['artlist'], M3: ['getty'] }))
    expect(r.view.open_items.not_established.map((n) => n.label)).toEqual(['Which Kling account type applies'])
    expect(r.view.open_items.items).toHaveLength(4)
    expect(summary(r)).toBe(T.summary_counts(4, 4))
    expect(r.view.summary[2]).toBe(T.summary_conditions(5))
    expect(r.view.independent_review.lines).toEqual(expect.arrayContaining([T.review_not_established, T.review_open_items]))
  })
})

describe('5 — guidance selection, exclusions and conclusions are unchanged (pinned from before the correction)', () => {
  const pinned: [string, CreatorRecordFormState, [string, string][]][] = [
    ['unknown plan', s([tool('pika', 'not_sure')]), [
      ['CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1', 'relevant_applicability_unresolved'],
      ['CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1', 'relevant_applicability_unresolved'],
      ['CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1', 'relevant_applicability_unresolved'],
      ['CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1', 'relevant_applicability_unresolved'],
    ]],
    ['Pika Pro', s([tool('pika', 'Pro')]), [
      ['CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1', 'relevant_on_declared_facts'],
      ['CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1', 'relevant_on_declared_facts'],
    ]],
    ['Pika + Kling', s([tool('pika', 'Pro'), tool('kling', 'not_sure')]), [
      ['CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1', 'relevant_applicability_unresolved'],
      ['CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1', 'relevant_applicability_unresolved'],
      ['CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1', 'relevant_applicability_unresolved'],
      ['CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1', 'relevant_applicability_unresolved'],
    ]],
    ['Getty + Artlist', s([tool('kling', 'not_sure')], { M0: ['music', 'stock'], M1: ['artlist'], M3: ['getty'] }), [
      ['CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1', 'relevant_applicability_unresolved'],
      ['CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1', 'relevant_applicability_unresolved'],
      ['CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1', 'relevant_applicability_unresolved'],
      ['CLAIM-STOCK-GETTY-EDITORIAL-001-v1', 'relevant_applicability_unresolved'],
    ]],
  ]
  test.each(pinned)('%s', (_n, state, expected) => {
    const r = draft(state)
    expect(r.guidance.composition.items.map((i) => [i.claim_id, i.conclusion]).sort()).toEqual(expected.sort())
    expect(r.view.guidance.cards.map((c) => [c.claim_id, c.conclusion]).sort()).toEqual(expected.sort())
  })

  test('exclusions are unchanged', () => {
    const r = draft(s([tool('pika', 'Pro')]))
    expect(r.guidance.objectives.find((o) => o.objective_id === 'creator-record:commercial_use:v1')!.excluded_not_met.sort()).toEqual([
      'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1',
      'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1',
    ])
  })
})

describe('6 — no presentation is stronger than Bounded Interpretation permits', () => {
  const states = [
    s([tool('pika', 'not_sure')]),
    s([tool('pika', 'Pro')]),
    s([tool('pika', 'Pro'), tool('kling', 'not_sure')]),
    s([tool('pika', 'Pro'), tool('pika', 'Standard')]),
    s([tool('other_tool', 'Pro')].map((t) => ({ ...t, T1X: ['X'] }))),
    s([tool('kling', 'not_sure')], { M0: ['music', 'stock'], M1: ['artlist'], M3: ['getty'] }),
  ]
  test.each(states.map((x, i) => [i, x]))('scenario %s', (_i, state) => {
    const r = draft(state as CreatorRecordFormState)
    for (const item of r.guidance.composition.items) {
      const card = r.view.guidance.cards.find((c) => c.claim_id === item.claim_id)!
      expect(card.conclusion).toBe(item.conclusion)
      expect(card.conclusion_label).toBe(T.conclusion_label[item.conclusion])
      if (item.provenance.bounded_interpretation.status !== 'directly_relevant') expect(card.conclusion).toBe('relevant_applicability_unresolved')
    }
    const anyConditional = r.view.guidance.cards.some((c) => c.conclusion === 'relevant_applicability_unresolved')
    if (anyConditional) expect(summary(r)).not.toMatch(/None of it depends/)
    const unresolvedRequirements = r.guidance.composition.items.flatMap((i) => i.applicability.material_unresolved)
    if (unresolvedRequirements.length > 0) expect(r.view.open_items.not_established.length).toBeGreaterThan(0)
    if (r.view.open_items.not_established.length + r.view.open_items.items.length > 0) expect(r.view.open_items.empty).toBeNull()
  })
})
