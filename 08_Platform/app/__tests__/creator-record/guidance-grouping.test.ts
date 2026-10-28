/**
 * CR-V2-MVP-17 — grouped guidance (`lib/creator-record/presentation/group-guidance.ts`).
 *
 * G1 unit rules · G2 invariants on every real public UAT scenario: no card
 * lost, merged or reordered within its subject; every caveat and source line
 * still shown exactly once for each card it belongs to; a caveat or source is
 * shared only when identical on every card of the group · G3 the component
 * renders the groups and adds no wording.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { groupGuidanceCards, type GroupableCard } from '@/lib/creator-record/presentation/group-guidance'
import { buildPublicUatDraft } from '@/lib/creator-record/public-uat/build-public-uat-draft'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

type Card = GroupableCard & { id: string }
const card = (id: string, subject: string, caveats: string[], source = 'S1'): Card => ({ id, subject, caveats, source })

/** What a reader sees for each card: its own caveats plus the group's, and exactly one source line. */
function visibleFor<C extends Card>(groups: ReturnType<typeof groupGuidanceCards<C>>) {
  const out = new Map<string, { caveats: string[]; sources: string[] }>()
  for (const g of groups) for (const m of g.cards) out.set(m.card.id, { caveats: [...m.own_caveats, ...g.shared_caveats], sources: [...(m.show_own_source ? [m.card.source] : []), ...(g.shared_source ? [g.shared_source] : [])] })
  return out
}

function expectFaithful<C extends Card>(cards: C[]) {
  const groups = groupGuidanceCards(cards)
  // Every card exactly once; within a subject, the original order.
  const flat = groups.flatMap((g) => g.cards.map((m) => m.card))
  expect(flat.map((c) => c.id).sort()).toEqual(cards.map((c) => c.id).sort())
  for (const g of groups) expect(g.cards.map((m) => m.card.id)).toEqual(cards.filter((c) => c.subject === g.subject).map((c) => c.id))
  // Groups in order of first appearance; one group per subject.
  expect(groups.map((g) => g.subject)).toEqual(Array.from(new Set(cards.map((c) => c.subject))))
  const seen = visibleFor(groups)
  for (const c of cards) {
    const v = seen.get(c.id)!
    expect(new Set(v.caveats)).toEqual(new Set(c.caveats))
    expect(v.sources).toEqual([c.source])
  }
  // A shared item is identical on every card of its group.
  for (const g of groups) {
    for (const cv of g.shared_caveats) expect(g.cards.every((m) => m.card.caveats.includes(cv))).toBe(true)
    if (g.shared_source !== null) expect(g.cards.every((m) => m.card.source === g.shared_source)).toBe(true)
    if (g.cards.length === 1) expect([g.shared_caveats, g.shared_source]).toEqual([[], null])
  }
  return groups
}

describe('G1 — grouping rules', () => {
  test('identical caveats and source on every card of a subject are shown once', () => {
    const g = expectFaithful([card('a', 'Pika', ['C1']), card('b', 'Pika', ['C1'])])
    expect(g).toHaveLength(1)
    expect(g[0].shared_caveats).toEqual(['C1'])
    expect(g[0].shared_source).toBe('S1')
    expect(g[0].cards.map((m) => [m.own_caveats, m.show_own_source])).toEqual([[[], false], [[], false]])
  })

  test('a caveat on only some cards stays on those cards; a differing source stays per card', () => {
    const g = expectFaithful([card('a', 'Kling', ['C1', 'C2'], 'S1'), card('b', 'Kling', ['C1'], 'S2')])
    expect(g[0].shared_caveats).toEqual(['C1'])
    expect(g[0].shared_source).toBeNull()
    expect(g[0].cards.map((m) => [m.own_caveats, m.show_own_source])).toEqual([[['C2'], true], [[], true]])
  })

  test('different subjects are never grouped together, even with identical text', () => {
    const g = expectFaithful([card('a', 'Pika', ['C1']), card('b', 'Kling', ['C1'])])
    expect(g.map((x) => [x.subject, x.shared_caveats, x.shared_source])).toEqual([['Pika', [], null], ['Kling', [], null]])
  })

  test('interleaved subjects: grouped by first appearance, order kept within each subject', () => {
    expectFaithful([card('a', 'Pika', ['C1']), card('b', 'Getty', []), card('c', 'Pika', ['C1']), card('d', 'Getty', [], 'S2')])
  })

  test('cards with no caveats, and an empty list', () => {
    expectFaithful([card('a', 'Artlist', []), card('b', 'Artlist', [])])
    expect(groupGuidanceCards([])).toEqual([])
  })
})

describe('G2 — invariants on every real public UAT scenario (synthetic fixtures)', () => {
  const ANS = { P1: ['UAT test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
  const tool = (T1: string, T3: string) => ({ T1: [T1], T3: [T3], T4: ['May 2026'] })
  const ref = (fixture_id: string, tool_index = 0) => ({ tool_index, fixture_id })
  test.each<[string, Record<string, string[]>[], { tool_index: number; fixture_id: string }[], Record<string, string[]>]>([
    ['R1 Pika / Pro + A', [tool('pika', 'Pro')], [ref('pdf-pika-pro-no-period')], {}],
    ['R2 Pika / Not sure + A', [tool('pika', 'not_sure')], [ref('pdf-pika-pro-no-period')], {}],
    ['R4 Pika / Pro + Kling / Standard', [tool('pika', 'Pro'), tool('kling', 'Standard')], [ref('pdf-pika-pro-no-period')], {}],
    ['R5 Runway / Pro + F', [tool('runway-gen3', 'Pro')], [ref('conflict-two-plan-names')], {}],
    ['E2 Kling / Standard + E', [tool('kling', 'Standard')], [ref('pdf-kling-pro-monthly')], {}],
    ['Pika + Kling + Getty stock + Artlist music', [tool('pika', 'Pro'), tool('kling', 'not_sure')], [], { M0: ['stock'], M1: ['getty'], M3: ['artlist'] }],
  ])('%s', (_n, tools, refs, extra) => {
    const r = buildPublicUatDraft({ state: { answers: { ...ANS, ...extra }, tools, acknowledgements: { A1: true, A2: true } }, refs, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-28', record: { record_id: 'UAT-G', record_version: 1, captured_at: '2026-10-28T00:00:00Z' } })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const cards = r.view.guidance.cards.map((c) => ({ ...c, id: c.claim_id }))
    const groups = expectFaithful(cards)
    // Grouping is display-only: the view itself is unchanged and still carries every card's own caveats and source.
    for (const c of r.view.guidance.cards) expect(c.caveats.length).toBeGreaterThan(0)
    expect(groups.reduce((n, g) => n + g.cards.length, 0)).toBe(r.view.guidance.cards.length)
  })
})

describe('G3 — the record view renders groups and adds no wording', () => {
  const V = readFileSync(path.join(__dirname, '..', '..', 'components', 'creator-record', 'DraftRecordView.tsx'), 'utf8')
  const guidance = V.slice(V.indexOf('<Section id="guidance"'), V.indexOf('</Section>', V.indexOf('<Section id="guidance"')))

  test('the guidance section iterates groups, not a flat card list', () => {
    expect(guidance).toMatch(/groupGuidanceCards\(view\.guidance\.cards\)/)
    expect(guidance).not.toMatch(/view\.guidance\.cards\.map/)
  })

  test('the only literal text is the existing field labels and heading prefix', () => {
    // JSX text runs: after a tag's `>` and up to the next tag or `{expression}`.
    const literals = Array.from(guidance.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*?)(?=[<{])/g)).map((m) => m[1].trim())
    expect(new Set(literals)).toEqual(new Set(['Guidance:', 'Depends on:', 'Reference:']))
    const labels = Array.from(guidance.matchAll(/label="([^"]+)"/g)).map((m) => m[1])
    expect(new Set(labels)).toEqual(new Set(['Relevance', 'Guidance', 'Based on what you told us', 'Caveat']))
  })
})
