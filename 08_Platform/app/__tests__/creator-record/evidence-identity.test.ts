/**
 * CR-V2-EVIDENCE-SLICE-1 — governed selection: tool and asset-provider
 * dropdowns backed by the canonical identity registries, partial plan
 * suggestions, unlisted and unsupported answers, and corrections.
 */

import { CANONICAL_TOOL_IDS } from '@/lib/tool-identity/registry'
import { ASSET_PROVIDER_IDS } from '@/types/interview-engine'
import {
  ASSET_PROVIDER_DISPLAY_LABELS,
  ASSET_PROVIDER_OPTION_CODES,
  OTHER_PROVIDER,
  OTHER_TOOL,
  TOOL_DISPLAY_LABELS,
  TOOL_OPTION_CODES,
} from '@/lib/creator-record/identity/selectable-identities'
import { planSuggestionsByTool } from '@/lib/creator-record/integration/plan-suggestions'
import { PILOT_PUBLICATION_LEDGER } from '@/lib/creator-record/pilot/pilot-ledger'
import { PILOT_QUESTION_META, PILOT_REGISTRY_INPUT } from '@/lib/creator-record/pilot/pilot-registry'
import { buildCreatorRecordDraft, loadFormConfig, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import { formToObservations, type CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { T } from '@/lib/creator-record/presentation/templates'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const RECORD = { record_id: 'UAT-IDENTITY', record_version: 1, captured_at: '2026-10-27T00:00:00Z' }
const ACK = { A1: true, A2: true }
const ANS = { P1: ['Identity test'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const state = (over: Partial<CreatorRecordFormState> = {}): CreatorRecordFormState => ({ answers: { ...ANS }, tools: [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: ACK, ...over })
const run = (s: CreatorRecordFormState) => buildCreatorRecordDraft({ state: s, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-27', record: RECORD })
const ok = (s: CreatorRecordFormState) => {
  const r = run(s)
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r
}
const question = (id: string) => PILOT_REGISTRY_INPUT.questions.find((q) => q.q_id === id)!

describe('dropdown identities come from the canonical registries only', () => {
  test('T1 offers exactly every registered tool identity, then "not listed" and "not sure"', () => {
    expect([...TOOL_OPTION_CODES].sort()).toEqual([...CANONICAL_TOOL_IDS, OTHER_TOOL, 'not_sure'].sort())
    expect(question('T1').options).toEqual([...TOOL_OPTION_CODES])
    expect(PILOT_QUESTION_META.T1.input).toBe('select')
    expect(TOOL_OPTION_CODES.slice(-2)).toEqual([OTHER_TOOL, 'not_sure'])
  })

  test('M1 and M3 offer exactly every registered asset provider, then "not listed" and "not sure"', () => {
    expect([...ASSET_PROVIDER_OPTION_CODES].sort()).toEqual([...ASSET_PROVIDER_IDS, OTHER_PROVIDER, 'not_sure'].sort())
    for (const id of ['M1', 'M3']) {
      expect(question(id).options).toEqual([...ASSET_PROVIDER_OPTION_CODES])
      expect(PILOT_QUESTION_META[id].input).toBe('select')
    }
  })

  test('every identity has a display label; labels are presentation only (no alias, no id reuse)', () => {
    for (const id of CANONICAL_TOOL_IDS) expect(TOOL_DISPLAY_LABELS[id].trim().length).toBeGreaterThan(2)
    for (const id of ASSET_PROVIDER_IDS) expect(ASSET_PROVIDER_DISPLAY_LABELS[id].trim().length).toBeGreaterThan(2)
    const labels = [...Object.values(TOOL_DISPLAY_LABELS), ...Object.values(ASSET_PROVIDER_DISPLAY_LABELS)]
    expect(new Set(labels).size).toBe(labels.length)
  })

  test('selectable identities are not derived from the pilot ledger: tools without any pilot entry are offered', () => {
    const ledgerTools = new Set(PILOT_PUBLICATION_LEDGER.map((e) => e.claim_id.split('-')[1].toLowerCase()))
    expect(ledgerTools.has('runway')).toBe(false)
    expect(TOOL_OPTION_CODES).toContain('runway-gen3')
    expect(TOOL_OPTION_CODES).toContain('higgsfield')
    expect(TOOL_OPTION_CODES).toContain('suno')
  })

  test('the ambiguous Gemini identity is offered as its two distinct registered identities, never a generic one', () => {
    expect(TOOL_OPTION_CODES).toContain('gemini-api')
    expect(TOOL_OPTION_CODES).toContain('gemini-consumer-app')
    expect(TOOL_OPTION_CODES).not.toContain('gemini')
    expect(TOOL_DISPLAY_LABELS['gemini-api']).not.toBe(TOOL_DISPLAY_LABELS['gemini-consumer-app'])
  })

  test('only a registered identity option attaches to an identity; "not listed" and "not sure" are record-only', () => {
    const config = loadFormConfig(pilotSources())
    for (const code of [OTHER_TOOL, 'not_sure']) {
      const s = state({ tools: [{ T1: [code], ...(code === OTHER_TOOL ? { T1X: ['Some Tool'] } : {}), T3: ['not_sure'], T4: ['May 2026'] }] })
      const { observations } = formToObservations(config, s, RECORD)
      expect(observations.filter((o) => o.target.kind === 'tool_identity')).toEqual([])
    }
    const { observations } = formToObservations(config, state(), RECORD)
    const id = observations.filter((o) => o.target.kind === 'tool_identity')
    expect(id).toHaveLength(1)
    expect(id[0]).toEqual(expect.objectContaining({ normalized_value: 'pika', answer_verbatim: 'Pika', source_kind: 'customer_declared' }))
  })
})

describe('server-side validation of identities', () => {
  test.each([['Pika'], ['pika labs'], ['gemini'], ['runway'], ['<script>']])('a non-canonical T1 value (%s) is refused, never mapped', (value) => {
    const r = run(state({ tools: [{ T1: [value], T3: ['Pro'], T4: ['May 2026'] }] }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues).toContainEqual({ q_id: 'T1', tool_index: 0, issue: 'invalid_option' })
  })

  test('a non-canonical asset provider is refused', () => {
    const r = run(state({ answers: { ...ANS, M0: ['music'], M1: ['Artlist Music'] } }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues).toContainEqual({ q_id: 'M1', tool_index: null, issue: 'invalid_option' })
  })

  test('"not listed" requires the typed name, which is kept exactly as typed and recognized as nothing', () => {
    const missing = run(state({ tools: [{ T1: [OTHER_TOOL], T3: ['Pro'], T4: ['May 2026'] }] }))
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.issues).toContainEqual({ q_id: 'T1X', tool_index: 0, issue: 'required' })
    const r = ok(state({ tools: [{ T1: [OTHER_TOOL], T1X: ['  Vidmagic 9000 '], T3: ['Pro'], T4: ['May 2026'] }] }))
    expect(r.view.guidance.cards).toEqual([])
    expect(r.view.not_shown.lines).toContain(T.not_shown_unrecognized('Vidmagic 9000'))
    expect(r.guidance.facts.activeToolIds).toEqual([])
  })

  test('a typed name that happens to be a known alias is still NOT resolved (no silent mapping)', () => {
    const r = ok(state({ tools: [{ T1: [OTHER_TOOL], T1X: ['Pika'], T3: ['Pro'], T4: ['May 2026'] }] }))
    expect(r.guidance.facts.activeToolIds).toEqual([])
    expect(r.view.guidance.cards).toEqual([])
  })

  test('an unlisted music or stock service keeps its typed name and gets no guidance', () => {
    const r = ok(state({ answers: { ...ANS, M0: ['music'], M1: [OTHER_PROVIDER], M1X: ['Tunes4U'] } }))
    expect(r.guidance.facts.assetProviderIds).toEqual([])
    expect(r.view.not_shown.lines).toContain(T.not_shown_unrecognized('Tunes4U'))
    const rows = r.view.declarations.groups.find((g) => g.id === 'materials')!.rows
    expect(rows.find((x) => x.value === 'Tunes4U')?.note).toBe(T.provider_not_recognized)
  })

  test('a typed name for an unlisted service is discarded once a listed one is chosen', () => {
    const r = ok(state({ answers: { ...ANS, M0: ['music'], M1: ['artlist'], M1X: ['Tunes4U'] } }))
    expect(r.view.trace.discarded_answers).toContainEqual({ q_id: 'M1X', tool_index: null })
    expect(JSON.stringify(r.view.declarations)).not.toContain('Tunes4U')
    expect(r.guidance.facts.assetProviderIds).toEqual(['artlist'])
  })
})

describe('plan suggestions are partial and governed; unsupported plans stay unsupported', () => {
  const suggestions = planSuggestionsByTool(TOPIC_CLAIMS_FIXTURE)

  test('Pika suggestions are exactly the governed plan values; tools without governed plan values get none', () => {
    expect(suggestions.pika).toEqual(['Fancy', 'Pro', 'Standard'])
    expect(suggestions.kling).toBeUndefined()
    expect(PILOT_QUESTION_META.T3.input).toBe('plan')
    expect(PILOT_QUESTION_META.T3.help).toMatch(/may not include yours/)
  })

  test('a suggestion is submitted as plain text and behaves exactly like the same plan typed', () => {
    const picked = ok(state())
    const typed = ok(state({ tools: [{ T1: ['pika'], T3: ['  pro '], T4: ['May 2026'] }] }))
    expect(picked.view.guidance.cards.map((c) => c.claim_id)).toEqual(typed.view.guidance.cards.map((c) => c.claim_id))
  })

  test('"Another plan" with an unsupported name, and "Not sure", never select plan guidance', () => {
    for (const plan of ['Basic (free)', 'not_sure']) {
      const r = ok(state({ tools: [{ T1: ['pika'], T3: [plan], T4: ['May 2026'] }] }))
      expect(r.guidance.facts.provenance.plans.every((p) => !p.passed_to_applicability)).toBe(true)
      expect(r.view.guidance.cards.every((c) => c.conclusion === 'relevant_applicability_unresolved')).toBe(true)
    }
  })
})

describe('corrections leave no stale facts', () => {
  test('changing the tool to "not listed" removes the earlier identity and all its guidance', () => {
    const before = ok(state())
    expect(before.guidance.facts.activeToolIds).toEqual(['pika'])
    const after = ok(state({ tools: [{ T1: [OTHER_TOOL], T1X: ['Other Tool'], T3: ['not_sure'], T4: ['May 2026'] }] }))
    expect(after.guidance.facts.activeToolIds).toEqual([])
    expect(after.view.guidance.cards).toEqual([])
  })

  test('changing the plan replaces the plan guidance (no earlier plan card survives)', () => {
    const pro = ok(state())
    const std = ok(state({ tools: [{ T1: ['pika'], T3: ['Standard'], T4: ['May 2026'] }] }))
    expect(pro.view.guidance.cards.map((c) => c.claim_id)).toContain('CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1')
    expect(std.view.guidance.cards.map((c) => c.claim_id)).not.toContain('CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1')
  })

  test('a typed tool name left behind after choosing a listed tool is discarded and reported', () => {
    const r = ok(state({ tools: [{ T1: ['pika'], T1X: ['Old Name'], T3: ['Pro'], T4: ['May 2026'] }] }))
    expect(r.view.trace.discarded_answers).toContainEqual({ q_id: 'T1X', tool_index: 0 })
    expect(JSON.stringify(r.view.declarations)).not.toContain('Old Name')
  })
})
