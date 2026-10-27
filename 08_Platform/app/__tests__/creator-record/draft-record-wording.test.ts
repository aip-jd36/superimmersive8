/**
 * CR-V2-VERTICAL-SLICE-1 — wording lock and interpretation boundaries for the
 * draft Creator Record (PRD v0.3 §5.4).
 *
 * Scans EVERY customer-visible string of drafts rendered across a spread of
 * scenarios, plus every template, the component sources and the pilot
 * question wording. The internal trace and per-card provenance (ids only) are
 * not customer text and are excluded.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PILOT_CAVEATS, PILOT_DEPENDENCY_LABELS, PILOT_PUBLICATION_LEDGER } from '@/lib/creator-record/pilot/pilot-ledger'
import { PILOT_QUESTION_META } from '@/lib/creator-record/pilot/pilot-registry'
import { buildCreatorRecordDraft, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import type { DraftRecordView } from '@/lib/creator-record/presentation/build-draft-record'
import { NEGATION_ALLOWLIST, T } from '@/lib/creator-record/presentation/templates'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const APP = path.resolve(__dirname, '..', '..')

const BANNED: [string, RegExp][] = [
  ['clear/cleared/clearance', /\bclear(ed|ance|ing|s)?\b/i],
  ['compliant', /complian/i],
  ['certified', /certif/i],
  ['verified', /verif/i],
  ['approved (outside "approved for Creator Records")', /\bapprov/i],
  ['licensed to', /licensed to/i],
  ['permitted to', /permitted to/i],
  ['safe to', /\bsafe to\b/i],
  ['applies to you', /applies to you/i],
  ['governed by', /governed by/i],
  ['does not apply', /does not apply/i],
  ['guarantee', /guarantee/i],
  ['legally sufficient', /legally sufficient/i],
]
const DEPENDENCY_STATUS_BANNED = /\b(met|satisfied|confirmed|resolved)\b/i

function clean(text: string): string {
  let t = text
  for (const n of NEGATION_ALLOWLIST) t = t.split(n).join(' ')
  return t.split('approved for Creator Records').join(' ')
}
function violations(text: string): string[] {
  const t = clean(text)
  return BANNED.filter(([, re]) => re.test(t)).map(([name]) => `${name}: ${text}`)
}

/** Every customer-visible string in a view (trace and provenance ids excluded). */
function customerStrings(view: DraftRecordView): string[] {
  const { trace: _trace, ...rest } = view
  const out: string[] = []
  const walk = (v: unknown, key: string | null) => {
    if (key === 'provenance' || key === 'claim_id' || key === 'dependency_id' || key === 'conclusion' || key === 'id') return
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach((x) => walk(x, null))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k)
  }
  walk(rest, null)
  return out
}

const RECORD = { record_id: 'UAT-WORDING', record_version: 1, captured_at: '2026-10-26T00:00:00Z' }
const ACK = { A1: true, A2: true }
const ANS = { P1: ['Test'], P3: ['client_work', 'paid_advertising'], F1: ['US'], F2: ['EU', 'online_worldwide'], F3: ['GB'], L1: ['yes'], L3: ['no'], H1: ['edited'] }
const SCENARIOS: Record<string, CreatorRecordFormState> = {
  pika_pro: { answers: { ...ANS, M0: ['none'] }, tools: [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: ACK },
  pika_unknown_plan: { answers: { ...ANS, M0: ['not_sure'] }, tools: [{ T1: ['pika'], T3: ['not_sure'], T4: ['not_sure'] }], acknowledgements: ACK },
  pika_conflict_and_kling: {
    answers: { ...ANS, M0: ['brands', 'client_material'], M4: ['some'] },
    tools: [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }, { T1: ['pika'], T3: ['Fancy'], T4: ['May 2026'] }, { T1: ['kling'], T3: ['Pro'], T4: ['May 2026'] }],
    acknowledgements: ACK,
  },
  stock_and_music: {
    answers: { ...ANS, M0: ['music', 'stock'], M1: ['artlist'], M2: ['not_sure'], M3: ['getty'], M3D: ['yes'] },
    tools: [{ T1: ['kling'], T3: ['not_sure'], T4: ['May 2026'] }],
    acknowledgements: ACK,
  },
  unapproved_tools: { answers: { ...ANS, M0: ['none'] }, tools: [{ T1: ['runway-gen3'], T3: ['Enterprise'], T4: ['May 2026'] }, { T1: ['higgsfield'], T3: ['not_sure'], T4: ['May 2026'] }, { T1: ['other_tool'], T1X: ['Unknown Tool X'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: ACK },
}
const views = Object.fromEntries(
  Object.entries(SCENARIOS).map(([name, state]) => {
    const r = buildCreatorRecordDraft({ state, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-26', record: RECORD })
    if (!r.ok) throw new Error(`${name}: ${JSON.stringify(r.issues)}`)
    return [name, r.view]
  }),
) as Record<string, DraftRecordView>

describe('the scanner itself catches banned wording (negative controls)', () => {
  test.each([
    'This video is cleared for commercial use.',
    'Commercial clearance granted.',
    'Your subscription was verified.',
    'Approved for commercial use.',
    'You are permitted to use this in ads.',
    'This rule applies to you.',
    'The project is governed by California law.',
    'This does not apply to your project.',
    'Rights certified by SI8.',
  ])('%s', (text) => expect(violations(text).length).toBeGreaterThan(0))
  test('the allowlisted negations and provenance phrase pass', () => {
    for (const n of NEGATION_ALLOWLIST) expect(violations(n)).toEqual([])
    expect(violations('SI8 has no guidance approved for Creator Records about this yet.')).toEqual([])
  })
})

describe('rendered drafts carry no clearance, verification or assurance wording', () => {
  for (const [name, view] of Object.entries(views)) {
    test(name, () => {
      const strings = customerStrings(view)
      expect(strings.length).toBeGreaterThan(20)
      expect(strings.flatMap(violations)).toEqual([])
    })
  }

  test('dependency rows never use met / satisfied / confirmed / resolved, and are always Open and not assessed', () => {
    for (const view of Object.values(views)) {
      for (const o of view.open_items.items) {
        expect(o.status).toBe('Open')
        expect(o.sufficiency).toBe(T.open_sufficiency)
        for (const s of [o.label, o.told_us, o.documents, o.evidence, o.sufficiency, o.status]) expect(s).not.toMatch(DEPENDENCY_STATUS_BANNED)
      }
    }
  })

  test('the record never says it is a Commercial Assurance Assessment, only that it is not', () => {
    for (const view of Object.values(views)) {
      const joined = customerStrings(view).join('\n')
      const mentions = joined.split('\n').filter((l) => /Commercial Assurance/.test(l))
      for (const m of mentions) expect(m).toMatch(/not SI8’s human-reviewed Commercial Assurance Assessment|is a separate, human-reviewed service/)
    }
  })

  test('the only conclusion labels are the two fixed, bounded labels', () => {
    const labels = new Set(Object.values(views).flatMap((v) => v.guidance.cards.map((c) => c.conclusion_label)))
    for (const l of Array.from(labels)) expect(Object.values(T.conclusion_label)).toContain(l)
    expect(Object.values(T.conclusion_label).join(' ')).not.toMatch(/directly|established|applies\b|cleared|meets/i)
  })

  test('location answers never produce a statement about which laws apply', () => {
    for (const view of Object.values(views)) {
      const joined = customerStrings(view).join('\n')
      expect(joined).not.toMatch(/(laws?|rules?) of [A-Z]|is subject to|are subject to|you are not subject/)
    }
  })
})

describe('every template and pilot text passes the wording lock', () => {
  const sample = (v: unknown): string[] => {
    if (typeof v === 'string') return [v]
    if (typeof v === 'function') return [String((v as (...a: string[]) => string)('Pika', 'Pro', 'Ultra'))]
    if (Array.isArray(v)) return v.flatMap(sample)
    if (v && typeof v === 'object') return Object.values(v).flatMap(sample)
    return []
  }
  test('templates', () => expect(sample(T).flatMap(violations)).toEqual([]))
  test('pilot explanations, labels and caveats', () => {
    const texts = [...PILOT_PUBLICATION_LEDGER.flatMap((e) => [e.explanation ?? '', ...Object.values(e.evidence_notes)]), ...Object.values(PILOT_DEPENDENCY_LABELS), ...Object.values(PILOT_CAVEATS)]
    expect(texts.flatMap(violations)).toEqual([])
  })
  test('component sources add no banned wording', () => {
    for (const f of ['components/creator-record/DraftRecordView.tsx', 'components/creator-record/CreatorRecordQuestionnaire.tsx', 'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx']) {
      const src = readFileSync(path.join(APP, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      expect(violations(src)).toEqual([])
    }
  })
})

describe('pilot questions ask only factual questions', () => {
  const texts = Object.values(PILOT_QUESTION_META).flatMap((m) => [m.text, m.help ?? '', ...Object.values(m.option_labels)])
  test('no question asks the creator to judge legal adequacy, scope, validity, applicability or permission to use', () => {
    for (const t of texts) expect(t).not.toMatch(/sufficien|adequa|valid|\bcover|permitted|allowed|applies|appl(y|icable) to|legal|lawful|clearance|cleared|infring/i)
  })
  test('no question asks about stock Editorial designation, release status, separate authorization or rights-and-clearance status', () => {
    for (const t of texts) expect(t).not.toMatch(/editorial|release status|authori[sz]|rights[- ]and[- ]clearance|commercial use/i)
  })
})
