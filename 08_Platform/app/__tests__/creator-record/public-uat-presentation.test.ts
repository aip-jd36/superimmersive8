/**
 * CR-V2-MVP-17 — bounded presentation composition (PM-approved wording).
 *
 * P1 evidence-aware summary: conditions and provisional comparisons stated
 * separately, counted only from existing structured results · P2 seller-linkage
 * explanation (observed seller named, cleaned and capped; matching unchanged)
 * · P3 next steps for unresolved conditions (from the governed requirement's own
 * fact and value; never inferred from a document) · P4 the new wording keeps
 * every existing guard, applied narrowly to the new strings · P5 grouped
 * guidance places shared text directly under the group heading.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildPublicUatDraft, type PublicUatView } from '@/lib/creator-record/public-uat/build-public-uat-draft'
import { documentForFixture } from '@/lib/creator-record/public-uat/fixtures'
import { buildCreatorRecordDraft, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import { displayObservedText, MAX_OBSERVED_TEXT_CHARS } from '@/lib/creator-record/presentation/build-draft-record'
import { EDIT_ANSWERS_LABEL, NEGATION_ALLOWLIST, T } from '@/lib/creator-record/presentation/templates'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const ANS = { P1: ['UAT test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const tool = (T1: string, T3: string) => ({ T1: [T1], T3: [T3], T4: ['May 2026'] })
const ref = (fixture_id: string, tool_index = 0) => ({ tool_index, fixture_id })
const RECORD = { record_id: 'UAT-P', record_version: 1, captured_at: '2026-10-28T00:00:00Z' }

function view(tools: Record<string, string[]>[], refs: { tool_index: number; fixture_id: string }[] = []): PublicUatView {
  const r = buildPublicUatDraft({ state: { answers: ANS, tools, acknowledgements: { A1: true, A2: true } }, refs, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-28', record: RECORD })
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r.view
}
/** The public summary minus its two designation lines and the closing line. */
const body = (v: PublicUatView) => v.summary.slice(2, -1)
const conditions = (v: PublicUatView) => v.summary.find((l) => l === T.summary_conditions(0) || /unresolved for the guidance shown here/.test(l))
const documentLines = (v: PublicUatView) => v.summary.filter((l) => l === T.recon_none || l.startsWith('Provisional document comparisons') || l.startsWith('No supporting document was added'))

// ───────────────────────────────────────────── P1 summary

describe('P1 — evidence-aware summary', () => {
  test.each<[string, Record<string, string[]>[], { tool_index: number; fixture_id: string }[], number | null, string[]]>([
    ['no document', [tool('pika', 'Pro')], [], 0, [T.recon_none]],
    ['unlinked seller (Pika / Pro + A)', [tool('pika', 'Pro')], [ref('pdf-pika-pro-no-period')], 0, ['Provisional document comparisons (2 seller and plan checks): “Does not establish it” — 2. These comparisons did not change your answers. They are limited to the information shown in the documents and do not establish whether your project can be used commercially.']],
    ['apparent consistency (Pika / Pro + D)', [tool('pika', 'Pro')], [ref('shot-pika-multiple-payments')], 0, ['Provisional document comparisons (2 seller and plan checks): “Appears consistent” — 2. These comparisons did not change your answers. They are limited to the information shown in the documents and do not establish whether your project can be used commercially.']],
    ['apparent conflict (Kling / Standard + E)', [tool('kling', 'Standard')], [ref('pdf-kling-pro-monthly')], 1, ['Provisional document comparisons (2 seller and plan checks): “Appears consistent” — 1; “Appears to conflict” — 1. These comparisons did not change your answers. They are limited to the information shown in the documents and do not establish whether your project can be used commercially.']],
    ['plan not sure (Pika / Not sure + A)', [tool('pika', 'not_sure')], [ref('pdf-pika-pro-no-period')], 1, ['Provisional document comparisons (2 seller and plan checks): “Does not establish it” — 1; “Not assessed” — 1. These comparisons did not change your answers. They are limited to the information shown in the documents and do not establish whether your project can be used commercially.']],
    ['unreadable document (Pika / Pro + I)', [tool('pika', 'Pro')], [ref('unreadable-dark-image')], 0, [T.recon_summary(2, { consistent: 0, conflict: 0, not_established: 2, not_assessed: 0 })]],
    ['one of two tools without a document (R4)', [tool('pika', 'Pro'), tool('kling', 'Standard')], [ref('pdf-pika-pro-no-period')], 1, [
      'Provisional document comparisons (2 seller and plan checks): “Does not establish it” — 2. These comparisons did not change your answers. They are limited to the information shown in the documents and do not establish whether your project can be used commercially.',
      'No supporting document was added for 1 of your 2 tools. That tool has not been compared with document evidence.',
    ]],
    ['no guidance (Runway / Pro + F): no conditions line', [tool('runway-gen3', 'Pro')], [ref('conflict-two-plan-names')], null, ['Provisional document comparisons (2 seller and plan checks): “Does not establish it” — 2. These comparisons did not change your answers. They are limited to the information shown in the documents and do not establish whether your project can be used commercially.']],
  ])('%s', (_n, tools, refs, n, docLines) => {
    const v = view(tools, refs)
    expect(documentLines(v)).toEqual(docLines)
    if (n === null) {
      expect(conditions(v)).toBeUndefined()
      expect(v.summary.join(' ')).toMatch(/makes no statement about commercial use/)
    } else expect(conditions(v)).toBe(T.summary_conditions(n))
    // The conditions count is exactly the listed open items (both kinds), as before.
    if (n !== null) expect(v.open_items.not_established.length + v.open_items.items.length).toBe(n)
    // Comparison counts come only from the server's reconciliation rows (tools without a document excluded).
    const rows = v.reconciliation.items.flatMap((i) => i.rows).filter((r) => r.note !== T.recon_reason.no_document)
    if (refs.length > 0) expect(documentLines(v)[0]).toContain(`(${rows.length} seller and plan checks)`)
    // "open items" is no longer a free-standing summary count.
    expect(v.summary.join(' ')).not.toMatch(/\d+ open items?\b/)
  })

  test('documents never change the guidance, the conditions line or the declarations', () => {
    for (const [tools, refs] of [
      [[tool('pika', 'Pro')], [ref('pdf-pika-pro-no-period')]],
      [[tool('kling', 'Standard')], [ref('pdf-kling-pro-monthly')]],
      [[tool('pika', 'not_sure')], [ref('shot-pika-multiple-payments')]],
    ] as const) {
      const withDoc = view([...tools], [...refs])
      const without = view([...tools])
      expect(withDoc.guidance).toEqual(without.guidance)
      expect(withDoc.declarations).toEqual(without.declarations)
      expect(withDoc.open_items.not_established).toEqual(without.open_items.not_established)
      expect(conditions(withDoc)).toBe(conditions(without))
      expect(body(withDoc).filter((l) => !documentLines(withDoc).includes(l))).toEqual(body(without).filter((l) => !documentLines(without).includes(l)))
    }
  })

  test('zero conditions never implies usability or sufficient evidence', () => {
    expect(T.summary_conditions(0)).toBe('Based on what you told us, no further information is identified for the guidance shown here. This does not establish whether your project can be used commercially or whether your supporting evidence is sufficient.')
    expect(T.summary_conditions(2)).toBe('2 matters remain unresolved for the guidance shown here. See ‘Open items and missing evidence’ for details.')
    expect(T.summary_conditions(1)).toContain(`‘${T.section_open_items}’`)
  })
})

// ───────────────────────────────────────────── P2 seller linkage

describe('P2 — seller-linkage explanation', () => {
  test('an unrecognised seller is named; the result, the plan row and the declaration are unchanged', () => {
    const v = view([tool('pika', 'Pro')], [ref('pdf-pika-pro-no-period')])
    const [seller, plan] = v.reconciliation.items[0].rows
    expect(seller).toEqual({ label: T.recon_provider_label, value: T.recon_result.does_not_establish, note: T.recon_seller_not_linked('Pika Labs, Inc.', 'Pika') })
    expect(seller.note).toBe('The document appears to name ‘Pika Labs, Inc.’ as the seller. SI8 has not established a link between that name and Pika, the tool you identified. The plan shown in the document was therefore not compared with your declared plan. Your answers remain unchanged.')
    expect(plan).toEqual({ label: T.recon_plan_label, value: T.recon_result.does_not_establish, note: T.recon_reason.seller_not_established })
    expect(v.declarations).toEqual(view([tool('pika', 'Pro')]).declarations)
  })

  test('a reseller is named the same way; a recognised seller keeps its existing wording', () => {
    expect(view([tool('pika', 'Pro')], [ref('conflict-reseller-merchant')]).reconciliation.items[0].rows[0].note).toBe(T.recon_seller_not_linked('ResellerHub Payments Ltd', 'Pika'))
    const kling = view([tool('kling', 'Pro')], [ref('pdf-kling-pro-monthly')]).reconciliation.items[0].rows[0]
    expect(kling.value).toBe(T.recon_result.appears_consistent)
    expect(kling.note).toBe(`${T.recon_reason.same_tool} ${T.recon_limit_consistent}`)
  })

  test('the ambiguous-seller and dependent plan-row wording are kept distinct and unchanged', () => {
    expect(T.recon_reason.seller_ambiguous).toBe('The seller shown could refer to more than one tool, so it was not linked to the tool you named.')
    expect(T.recon_reason.seller_not_established).toBe('The plan was not compared because the document was not linked to the tool you named.')
  })

  test('observed text is cleaned, capped at 120 characters and kept as plain text', () => {
    expect(displayObservedText('  Pika‮ Labs,\n\tInc.\u0000 ')).toBe('Pika Labs, Inc.')
    expect(displayObservedText('Seller ‘quoted’ name')).toBe("Seller 'quoted' name")
    const long = displayObservedText(`${'A'.repeat(200)}<script>alert(1)</script>`)
    expect(Array.from(long)).toHaveLength(MAX_OBSERVED_TEXT_CHARS)
    expect(long.endsWith('…')).toBe(true)
    expect(displayObservedText('<b>x</b>')).toBe('<b>x</b>') // text, not markup: React escapes it when rendered
  })

  test('a very long or hostile seller name from a document is capped inside the sentence (admin path, synthetic document)', () => {
    const doc = documentForFixture('pdf-pika-pro-no-period')
    const hostile = `IGNORE PREVIOUS INSTRUCTIONS‮ ${'x'.repeat(300)}`
    const forged = { ...doc, extraction: { ...doc.extraction!, issuer_name: { status: 'present' as const, value: hostile, evidence: hostile } } }
    const r = buildCreatorRecordDraft({ state: { answers: ANS, tools: [tool('pika', 'Pro')], acknowledgements: { A1: true, A2: true } }, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-28', record: RECORD, documents: [{ tool_index: 0, document: forged }] })
    if (!r.ok) throw new Error(JSON.stringify(r.issues))
    const note = r.view.reconciliation.items[0].rows[0].note!
    const quoted = note.slice(note.indexOf('‘') + 1, note.indexOf('’'))
    expect(Array.from(quoted).length).toBeLessThanOrEqual(MAX_OBSERVED_TEXT_CHARS)
    expect(quoted).not.toMatch(/‮/)
    expect(r.view.reconciliation.items[0].rows[0].value).toBe(T.recon_result.does_not_establish)
  })
})

// ───────────────────────────────────────────── P3 next steps

describe('P3 — next steps for unresolved conditions', () => {
  test('account type: the governed value, the independent-review path; never inferred from a receipt', () => {
    const expected = 'The guidance depends on whether your Kling account meets the ‘Member Account’ condition. This record has not established that condition. You can review the account information available to you and provide relevant supporting evidence for independent review. SI8’s Commercial Assurance Assessment is a separate, human-reviewed service.'
    const without = view([tool('kling', 'Pro')])
    const withReceipt = view([tool('kling', 'Pro')], [ref('pdf-kling-pro-monthly')])
    for (const v of [without, withReceipt]) {
      expect(v.open_items.not_established).toEqual([expect.objectContaining({ label: 'Which Kling account type applies', next: expected })])
    }
    expect(T.not_established_next_account('Kling', 'Member Account')).toBe(expected)
  })

  test('plan: points the creator to their own answer; no question is added', () => {
    const v = view([tool('pika', 'not_sure')])
    expect(v.open_items.not_established[0].next).toMatch(/^The guidance refers to the Pika “\w+”, “\w+” and “\w+” plans\. To update your Pika plan, select ‘Edit answers’ and change your plan selection\.$/)
    expect(T.not_established_next_plan('Pika', ['Pro'])).toBe('The guidance refers to the Pika “Pro” plan. To update your Pika plan, select ‘Edit answers’ and change your plan selection.')
  })

  test('no provider-specific advice about where account status can be found', () => {
    expect(JSON.stringify(view([tool('kling', 'not_sure')]))).not.toMatch(/in your \w+ account or by asking|Membership Service.*credits/i)
  })
})

// ───────────────────────────────────────────── P4 guards on the new wording

describe('P4 — every new string passes the existing guards', () => {
  const DOC_BANNED: [string, RegExp][] = [
    ['match', /\bmatch(es|ed|ing)?\b/i], ['consistent', /\b(in)?consistent\b/i], ['confirm', /\bconfirm(s|ed|ing|ation)?\b/i], ['contradict', /contradict/i],
    ['prove', /\bprov(e|es|ed|en|ing)\b/i], ['verify', /verif/i], ['authentic', /authentic/i], ['valid', /\bvalid(ated|ates|ity)?\b/i],
    ['clear', /\bclear(ed|ance|ing|s)?\b/i], ['approved', /\bapprov/i], ['certified', /certif/i], ['compliant', /complian/i], ['licensed/permitted/safe to', /licensed to|permitted to|\bsafe to\b/i],
  ]
  /** CR-V2-MVP-18: no exception beyond the existing Option C policy — "consistent" only as the exact label "Appears consistent". */
  const strip = (t: string) => t.split('Appears consistent').join(' ')
  const all = [
    T.recon_summary(6, { consistent: 1, conflict: 2, not_established: 2, not_assessed: 1 }),
    T.recon_summary(2, { consistent: 2, conflict: 0, not_established: 0, not_assessed: 0 }),
    T.summary_tools_without_documents(1, 2), T.summary_tools_without_documents(2, 3),
    T.summary_conditions(0), T.summary_conditions(1), T.summary_conditions(3),
    T.recon_seller_not_linked('Pika Labs, Inc.', 'Pika'),
    T.not_established_next_account('Kling', 'Member Account'), T.not_established_next_plan('Pika', ['Pro', 'Standard']),
  ]

  test('document wording guard, with no exception beyond the exact reconciliation label', () => {
    const offenders = all.flatMap((t) => DOC_BANNED.filter(([, re]) => re.test(strip(t))).map(([n]) => `${n}: ${t}`))
    expect(offenders).toEqual([])
    // The exceptions are not a loophole: anything else with those words still fails.
    expect(DOC_BANNED.some(([, re]) => re.test(strip('The document is authentic.')))).toBe(true)
    expect(DOC_BANNED.some(([, re]) => re.test(strip('Your plan is consistent with the receipt.')))).toBe(true)
    expect(DOC_BANNED.some(([, re]) => re.test(strip('2 appear consistent')))).toBe(true)
  })

  test('the summary comparison line is a reconciliation template, so the existing reconciliation guard covers it', () => {
    expect(Object.keys(T)).toContain('recon_summary')
    expect(Object.keys(T)).not.toContain('summary_comparisons')
    const line = T.recon_summary(4, { consistent: 1, conflict: 1, not_established: 1, not_assessed: 1 })
    expect(line.replace(/Appears consistent/g, '')).not.toMatch(/\bconsistent\b/i)
    expect(line).not.toMatch(/authentic/i)
    // Each count sits under the exact label shown in "Your answers beside your documents".
    for (const label of Object.values(T.recon_result)) expect(line).toContain(`“${label}” — 1`)
    expect(line).toMatch(/do not establish whether your project can be used commercially\.$/)
  })

  test('record wording guard (clearance, approval, applicability) and the dependency-status words', () => {
    const BANNED = [/\bclear(ed|ance|ing|s)?\b/i, /complian/i, /certif/i, /verif/i, /\bapprov/i, /licensed to|permitted to|\bsafe to\b/i, /applies to you|governed by|does not apply/i, /\bmatch(es|ed)?\b/i, /\bconfirm/i, /contradict/i, /\bprov(e|es|ed|en)\b/i, /guarantee/i, /legally sufficient/i]
    const clean = (t: string) => NEGATION_ALLOWLIST.reduce((s, n) => s.split(n).join(' '), t)
    expect(all.flatMap((t) => BANNED.filter((re) => re.test(clean(t))).map((re) => `${re}: ${t}`))).toEqual([])
    expect(all.filter((t) => /\b(met|satisfied|confirmed|resolved)\b/i.test(t))).toEqual([])
  })

  test('Commercial Assurance is mentioned only as a separate service', () => {
    for (const t of all.filter((x) => /Commercial Assurance/.test(x))) expect(t).toMatch(/is a separate, human-reviewed service/)
  })

  test('no internal identifiers or local paths in the new public lines', () => {
    const v = view([tool('pika', 'Pro'), tool('kling', 'not_sure')], [ref('pdf-pika-pro-no-period')])
    const text = JSON.stringify([v.summary, v.reconciliation, v.open_items])
    expect(text).not.toMatch(/CLAIM-|PILOT-|fixture_id|pdf-pika|[A-Za-z]:\\\\|\/Users\/|tool_account_status|tool_plan_tier:/)
  })
})

// ───────────────────────────────────────────── P5 grouping placement

describe('P5 — shared caveats and source sit directly under the group heading', () => {
  test('in the component, shared text is rendered before the group’s cards', () => {
    const V = readFileSync(path.join(__dirname, '..', '..', 'components', 'creator-record', 'DraftRecordView.tsx'), 'utf8')
    const g = V.slice(V.indexOf('groupGuidanceCards(view.guidance.cards)'))
    const heading = g.indexOf('Guidance: {g.subject}')
    const shared = g.indexOf('g.shared_caveats.map')
    const source = g.indexOf('g.shared_source &&')
    const cards = g.indexOf('g.cards.map')
    expect(heading).toBeGreaterThan(-1)
    expect([heading < shared, shared < source, source < cards]).toEqual([true, true, true])
  })
})

// ───────────────────────────────────────────── CR-V2-MVP-20 browser-UAT copy corrections

describe('MVP-20 — copy corrections', () => {
  const read = (f: string) => readFileSync(path.join(__dirname, '..', '..', f), 'utf8')

  test('the plan instruction names the existing "Edit answers" control, never the read-only "What you told us" section', () => {
    expect(T.not_established_next_plan('Pika', ['Pro'])).toBe('The guidance refers to the Pika “Pro” plan. To update your Pika plan, select ‘Edit answers’ and change your plan selection.')
    // The label is the real button text on both clients (no new control).
    for (const f of ['app/uat/creator-record-v2/PublicUatClient.tsx', 'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx']) expect(read(f)).toContain(`>${EDIT_ANSWERS_LABEL}</button>`)
    for (const v of [view([tool('pika', 'not_sure')]), view([tool('pika', 'Pro'), tool('pika', 'Standard')])]) {
      for (const n of v.open_items.not_established) {
        expect(n.next).not.toMatch(/What you told us/)
        if (n.label.startsWith('Which Pika plan')) expect(n.next).toMatch(/select ‘Edit answers’ and change your plan selection\.$/)
      }
    }
  })

  test('"Guidance not included": no omission intro when nothing was left out', () => {
    const none = view([tool('kling', 'Pro')])
    expect(none.not_shown).toEqual({ intro: null, lines: [], empty: T.not_shown_none })
    const some = view([tool('pika', 'Pro')]) // the Fancy and Standard plan guidance is left out on a Pro answer
    expect(some.not_shown.intro).toBe(T.not_shown_intro)
    expect(some.not_shown.lines.length).toBeGreaterThan(0)
    expect(some.not_shown.empty).toBeNull()
    expect(some.not_shown.lines).not.toContain(T.not_shown_none)
    // The component shows the intro and list only when there is something to list.
    const V = read('components/creator-record/DraftRecordView.tsx')
    const section = V.slice(V.indexOf('<Section id="not-included"'), V.indexOf('</Section>', V.indexOf('<Section id="not-included"')))
    expect(section).toMatch(/\{view\.not_shown\.intro && /)
    expect(section).toMatch(/\{view\.not_shown\.lines\.length > 0 && /)
    expect(section).toMatch(/\{view\.not_shown\.empty && /)
  })

  test('which guidance is left out is unchanged: the same lines as before, only the empty case differs', () => {
    expect(view([tool('pika', 'Pro')]).not_shown.lines).toEqual([
      'Pika (AI tool): not included, because on what you told us this guidance concerns a different Pika plan (“Fancy”).',
      'Pika (AI tool): not included, because on what you told us this guidance concerns a different Pika plan (“Standard”).',
    ])
  })

  test('the summary has no nested negative, and never says SI8 checked the answers', () => {
    const v = view([tool('pika', 'Pro')])
    expect(v.summary[3]).toBe('2 pieces of guidance included. They were selected using your own answers, which SI8 has not checked.')
    expect(T.summary_counts(1, 0)).toBe('1 piece of guidance included. It was selected using your own answers, which SI8 has not checked.')
    expect(v.summary.join(' ')).not.toMatch(/None of it depends/)
    // Conditions, evidence limits and commercial-use uncertainty stay in their own lines.
    expect(v.summary).toContain(T.summary_conditions(0))
    expect(v.summary).toContain(T.recon_none)
    for (const l of v.summary) expect(l).not.toMatch(/SI8 (has )?checked|verified|confirmed/i)
    // Unchanged branches.
    expect(T.summary_counts(4, 4)).toBe('4 pieces of guidance included. 4 of 4 may be relevant only depending on information this record does not establish.')
    expect(T.summary_counts(0, 0)).toBe('0 pieces of guidance included. This record therefore makes no statement about commercial use of the tools and materials you named.')
  })
})
