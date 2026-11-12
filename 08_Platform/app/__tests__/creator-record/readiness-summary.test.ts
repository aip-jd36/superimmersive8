/**
 * CR-STAGE1-IMPL-1 — the inert consultative summary and the staged (inactive) Artlist publication proposal.
 *
 * Records are real: built by the real record builder from synthetic test sources (`test-support/customer-record-schema8`).
 * The summary templates below are SYNTHETIC TEST placeholders under a synthetic approval: no approved summary wording
 * exists. No database, Storage, model or network.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { authorizePublication, type PublicationLedgerEntry } from '@/lib/creator-record/contract/publication-ledger'
import { violatesCustomerWordingLock } from '@/lib/creator-record/contract/wording-lock'
import { approvedCustomerRecordInputs, approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerRecord, CUSTOMER_RECORD_SCHEMA, type CustomerRecordV2 } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_PUBLICATION_LEDGER } from '@/lib/creator-record/governed/sources'
import { historicalForm } from '@/test-support/historical-record'
import { pilotSources } from '@/lib/creator-record/prototype/build-draft'
import { runDeclaredGuidance } from '@/lib/creator-record/prototype/declared-guidance'
import {
  buildReadinessSummary, isTopicQualified, isUnspecifiedCondition, readinessTemplatesFingerprint, ReadinessSummaryRefusal, READINESS_SUMMARY_METHOD,
  type ReadinessSummary, type ReadinessSummaryApproval, type ReadinessSummaryTemplates,
} from '@/lib/creator-record/readiness-summary/summary'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { schema8Fixture, type Schema8Fixture } from '@/test-support/customer-record-schema8'

const PROPOSAL = JSON.parse(readFileSync(join(__dirname, '../../lib/creator-record/governed/proposals/CR-V2-LEDGER-4-artlist-standalone.proposal.json'), 'utf8')) as {
  proposal: { governed_claim: { claim_id: string; proposition: string; source_verbatim: string; provider_scope: string[] } }
  entry: PublicationLedgerEntry
}
const ARTLIST_ID = 'CLAIM-MUSIC-ARTLIST-STANDALONE-EXPLOITATION-001-v1'

// CR-SUM-1b: the approved PDF `topic_level` text (schema 8 template set), reused verbatim.
const APPROVED_GUIDANCE = (approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).templates as { sections: { guidance: { topic_level: string; unspecified_condition: string } } }).sections.guidance
const APPROVED_TOPIC_LEVEL = APPROVED_GUIDANCE.topic_level
// CR-SUM-1c: the approved PDF `unspecified_condition` text, reused verbatim.
const APPROVED_UNSPECIFIED = APPROVED_GUIDANCE.unspecified_condition

// ── synthetic summary templates (TEST ONLY) under a synthetic approval of exactly these templates ──
const TEMPLATES: ReadinessSummaryTemplates = {
  template_id: 'si8/creator-record-v2-readiness-summary-templates-SYNTHETIC-TEST',
  version: 1,
  conclusion_labels: { relevant_on_declared_facts: '[TEST ONLY] conclusion: on declared facts', relevant_applicability_unresolved: '[TEST ONLY] conclusion: depends on something not established' },
  topic_labels: { commercial_use: '[TEST ONLY] topic: commercial use', third_party_source_rights: '[TEST ONLY] topic: material from other sources' },
  topic_framing: { commercial_use: '[TEST ONLY] framing: commercial use', third_party_source_rights: '[TEST ONLY] framing: material from other sources' },
  selected_because_label: '[TEST ONLY] selected because you told us',
  based_on_label: '[TEST ONLY] based on what you told us',
  subject_questions: ['T1', 'T1X', 'M1', 'M1X', 'M3', 'M3X'],
  topic_qualified_note: APPROVED_TOPIC_LEVEL,
  unspecified_condition_note: APPROVED_UNSPECIFIED,
}
const approvalOf = (t: ReadinessSummaryTemplates): ReadinessSummaryApproval => ({
  template_id: t.template_id, version: t.version, fingerprint: readinessTemplatesFingerprint(t), lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY', decision_date: '2026-11-12',
})
const APPROVAL = approvalOf(TEMPLATES)
const summarize = (f: { canonical: string; sha256: string }, t = TEMPLATES, a: ReadinessSummaryApproval | null = APPROVAL) => buildReadinessSummary({ canonical: f.canonical, sha256: f.sha256, templates: t, approval: a })
const refusal = (fn: () => unknown): string => {
  try {
    fn()
    return 'built'
  } catch (e) {
    if (e instanceof ReadinessSummaryRefusal) return e.code
    throw e
  }
}
/** Mutate a record and re-hash it, so the verifier passes and only the summary's own checks can refuse it. */
function forge(f: { canonical: string }, mutate: (r: any) => void): { canonical: string; sha256: string } {
  const r = JSON.parse(f.canonical)
  mutate(r)
  const canonical = canonicalJson(r)
  return { canonical, sha256: sha256Hex(canonical) }
}
const strings = (v: unknown, path = '', out: { path: string; key: string; value: string }[] = []) => {
  if (typeof v === 'string') out.push({ path, key: path.split('.').pop() ?? '', value: v })
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}.${i}`, out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, path ? `${path}.${k}` : k, out)
  return out
}
const ack = { A1: true, A2: true }
const base = { P1: ['Summary test video'], P3: ['paid_advertising'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'] }

let DEFAULT: Schema8Fixture // pika Standard: two commercial-use items selected by the same tool answer
let MIXED: Schema8Fixture // pika Standard + runway (no synthetic guidance) + Artlist music (third-party item with an open dependency)
let OPEN: Schema8Fixture // pika "Not sure" plan: an unresolved applicability fact and not-sure answers
beforeAll(async () => {
  DEFAULT = await schema8Fixture()
  MIXED = await schema8Fixture({ state: { answers: { ...base, M0: ['music'], M1: ['artlist'], H1: ['edited'] }, tools: [{ T1: ['pika'], T3: ['Standard'] }, { T1: ['runway-gen3'], T3: ['Pro'] }], acknowledgements: ack } as never })
  OPEN = await schema8Fixture({ plan: 'not_sure' })
})

describe('determinism and identity', () => {
  test('identical versioned input gives byte-identical output', () => {
    for (const f of [DEFAULT, MIXED, OPEN]) expect(canonicalJson(summarize(f))).toBe(canonicalJson(summarize(f)))
  })
  test('the output is bound to the exact record version, method and templates', () => {
    const s = summarize(MIXED)
    expect(s.method).toEqual(READINESS_SUMMARY_METHOD)
    expect(s.identity).toEqual({ record_ref: MIXED.record.record.record_ref, record_version: MIXED.record.record.record_version, snapshot_sha256: MIXED.sha256, schema_version: 8, ledger_version: MIXED.record.sources.ledger_version })
    expect(s.templates).toEqual({ template_id: TEMPLATES.template_id, version: 1, fingerprint: APPROVAL.fingerprint })
  })
})

describe('the Bounded Interpretation boundary (structural)', () => {
  test('considerations are exactly the record items: none added, dropped or merged', () => {
    for (const f of [DEFAULT, MIXED, OPEN]) {
      const s = summarize(f)
      const ids = s.groups.flatMap((g) => g.considerations.map((c) => c.claim_id))
      expect([...ids].sort()).toEqual(f.record.guidance.items.map((i) => i.claim_id).sort())
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
  test('each conclusion is the record’s own code, through the approved label only, and never stronger than BI', () => {
    for (const f of [DEFAULT, MIXED, OPEN]) {
      const s = summarize(f)
      for (const c of s.groups.flatMap((g) => g.considerations)) {
        const item = f.record.guidance.items.find((i) => i.claim_id === c.claim_id)!
        expect(c.conclusion).toEqual({ code: item.conclusion, label: TEMPLATES.conclusion_labels[item.conclusion] })
        if (item.provenance.bounded_interpretation.status === 'relevant_applicability_unresolved') expect(c.conclusion.code).toBe('relevant_applicability_unresolved')
        expect(c.explanation).toBe(item.explanation)
        expect(c.explanation).not.toContain(c.conclusion.label)
      }
    }
  })
  test('a record whose conclusion is stronger than its BI status is refused', () => {
    const item = OPEN.record.guidance.items.findIndex((i) => i.provenance.bounded_interpretation.status === 'relevant_applicability_unresolved')
    expect(item).toBeGreaterThanOrEqual(0)
    const f = forge(OPEN, (r) => {
      r.guidance.items[item].conclusion = 'relevant_on_declared_facts'
      r.guidance.items[item].applicability = { status: 'met', material_unresolved: [] }
      r.guidance.items[item].dependency_rows = []
    })
    expect(refusal(() => summarize(f))).toBe('stronger_than_bi')
  })
  test('BI that permits nothing, a foreign BI goal, or open items with a firm conclusion are refused', () => {
    expect(refusal(() => summarize(forge(DEFAULT, (r) => { r.guidance.items[0].provenance.bounded_interpretation.status = 'outside_current_coverage' })))).toBe('bi_permits_nothing')
    expect(refusal(() => summarize(forge(DEFAULT, (r) => { r.guidance.items[0].provenance.bounded_interpretation.goal_id = 'creator-record:third_party_source_rights:v1' })))).toBe('interpretation_objective_mismatch')
    const i = MIXED.record.guidance.items.findIndex((x) => x.dependency_rows.length > 0)
    expect(i).toBeGreaterThanOrEqual(0)
    expect(refusal(() => summarize(forge(MIXED, (r) => {
      r.guidance.items[i].conclusion = 'relevant_on_declared_facts'
      r.guidance.items[i].provenance.bounded_interpretation.status = 'directly_relevant'
    })))).toBe('conclusion_inconsistent_with_open_items')
  })
  test('an unknown conclusion code, an unlabelled dependency or an empty explanation is refused', () => {
    expect(refusal(() => summarize(forge(DEFAULT, (r) => { r.guidance.items[0].conclusion = 'cleared' })))).toBe('unknown_conclusion')
    const i = MIXED.record.guidance.items.findIndex((x) => x.dependency_rows.length > 0)
    expect(refusal(() => summarize(forge(MIXED, (r) => { r.guidance.items[i].dependency_rows[0].label = null })))).toBe('unlabelled_dependency')
    expect(refusal(() => summarize(forge(DEFAULT, (r) => { r.guidance.items[0].explanation = '  ' })))).toBe('empty_explanation')
  })
  test('every rendered string is grounded: verbatim record text, an approved template string, or a closed code/identifier', () => {
    const CODE_KEYS = new Set(['code', 'topic', 'kind', 'id', 'fact', 'tool', 'standing', 'evidence', 'status', 'reason', 'sufficiency', 'dependency_id', 'q_id', 'observation_id', 'claim_id', 'entry_id', 'document_id', 'record_ref', 'snapshot_sha256', 'template_id', 'fingerprint'])
    for (const f of [DEFAULT, MIXED, OPEN]) {
      const s = summarize(f)
      const recordStrings = new Set(strings(f.record).map((x) => x.value))
      const templateStrings = new Set(strings(TEMPLATES).map((x) => x.value))
      for (const x of strings(s)) {
        if (CODE_KEYS.has(x.key)) {
          expect([x.path, /^[A-Za-z0-9_:./-]+$/.test(x.value)]).toEqual([x.path, true])
          continue
        }
        expect([x.path, recordStrings.has(x.value) || templateStrings.has(x.value)]).toEqual([x.path, true])
      }
    }
  })
  test('no UserGoal, interpretation prose or invented fact: no such field exists, and every declaration is the recorded answer', () => {
    for (const f of [DEFAULT, MIXED, OPEN]) {
      const s = summarize(f)
      expect(JSON.stringify(s)).not.toMatch(/"(user_goal|goals?|intent|summary_blocks|interpretation_text|advice|verdict|score)"/)
      const decls = [...s.groups.flatMap((g) => [g.subject, ...g.considerations.flatMap((c) => c.selected_because.declarations)]), ...s.uncovered_subjects].filter(Boolean)
      for (const d of decls) {
        const a = f.record.declarations.answers.find((x) => x.q_id === d!.q_id && x.tool_index === d!.tool_index)!
        expect({ question: d!.question, answer: d!.answer }).toEqual({ question: a.question, answer: a.answer_verbatim })
        expect(f.record.declarations.observations.some((o) => o.observation_id === d!.observation_id)).toBe(true)
      }
    }
  })
})

describe('provider selection, ordering and grouping', () => {
  test('repeated services are grouped without merging their claims', () => {
    const s = summarize(DEFAULT)
    expect(s.groups).toHaveLength(1)
    expect(s.groups[0].subject).toMatchObject({ q_id: 'T1', tool_index: 0 })
    expect(s.groups[0].considerations).toHaveLength(DEFAULT.record.guidance.items.length)
    expect(DEFAULT.record.guidance.items.length).toBeGreaterThan(1)
  })
  test('subjects follow questionnaire order; a provider subject is the declared provider answer; uncovered subjects are listed', () => {
    const s = summarize(MIXED)
    const positions = s.groups.map((g) => MIXED.record.declarations.answers.findIndex((a) => a.q_id === g.subject!.q_id && a.tool_index === g.subject!.tool_index))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(s.groups.map((g) => g.subject!.q_id)).toEqual(['T1', 'M1'])
    const music = MIXED.record.declarations.answers.find((a) => a.q_id === 'M1')!
    expect(s.groups[1].subject!.answer).toBe(music.answer_verbatim)
    expect(s.groups[1].considerations.every((c) => c.topic === 'third_party_source_rights')).toBe(true)
    expect(s.uncovered_subjects.map((u) => [u.q_id, u.tool_index])).toEqual([['T1', 1]])
    expect(s.topics.map((t) => t.topic)).toEqual(['commercial_use', 'third_party_source_rights'])
    expect(s.topics.every((t) => t.framing === TEMPLATES.topic_framing[t.topic])).toBe(true)
  })
  test('ordering follows questionnaire position, not the record’s item order', () => {
    const flipped = forge(MIXED, (r) => { r.guidance.items.reverse() })
    const a = summarize(MIXED).groups.map((g) => g.subject!.observation_id)
    const b = summarize(flipped).groups.map((g) => g.subject!.observation_id)
    expect(b).toEqual(a)
  })
  test('open items: dependency rows, unresolved applicability and not-sure answers come from the record only', () => {
    const m = summarize(MIXED)
    expect(m.open_items.dependencies.map((d) => d.dependency_id)).toEqual(MIXED.record.guidance.items.flatMap((i) => i.dependency_rows.map((d) => d.dependency_id)))
    const o = summarize(OPEN)
    expect(o.open_items.unresolved_applicability.length).toBeGreaterThan(0)
    expect(o.open_items.not_sure.map((x) => x.q_id)).toContain('T3')
  })
})

describe('provenance, correction and templates fail closed', () => {
  test('a selecting observation that does not resolve exactly is refused', () => {
    expect(refusal(() => summarize(forge(DEFAULT, (r) => { r.guidance.items[0].selection_basis.scopes[0].observation_ids = ['PREP-X:v2:T1:tool-1:0'] })))).toBe('selection_provenance_broken')
    expect(refusal(() => summarize(forge(DEFAULT, (r) => {
      const id = r.guidance.items[0].selection_basis.scopes[0].observation_ids[0]
      r.declarations.observations.find((o: any) => o.observation_id === id).answer_verbatim = 'something else'
    })))).toBe('selection_provenance_broken')
    expect(refusal(() => summarize(DEFAULT, { ...TEMPLATES, subject_questions: ['M1'] }, approvalOf({ ...TEMPLATES, subject_questions: ['M1'] })))).toBe('subject_question_not_approved')
  })
  test('a record that does not verify, or unapproved / mismatched / incomplete templates, are refused', () => {
    expect(refusal(() => summarize({ canonical: DEFAULT.canonical, sha256: 'a'.repeat(64) }))).toBe('record_not_verified')
    expect(refusal(() => summarize(DEFAULT, TEMPLATES, null))).toBe('templates_not_approved')
    expect(refusal(() => summarize(DEFAULT, { ...TEMPLATES, selected_because_label: 'changed' }, APPROVAL))).toBe('templates_fingerprint_mismatch')
    const noFraming = { ...TEMPLATES, topic_framing: { commercial_use: TEMPLATES.topic_framing.commercial_use } }
    expect(refusal(() => summarize(MIXED, noFraming, approvalOf(noFraming)))).toBe('unlabelled_topic')
  })
  test('a correction is a new version: its summary is recomputed and the earlier one is unchanged', () => {
    const before = canonicalJson(summarize(DEFAULT))
    const corrected = summarize(OPEN)
    expect(corrected.identity.snapshot_sha256).toBe(OPEN.sha256)
    expect(corrected.identity.snapshot_sha256).not.toBe(DEFAULT.sha256)
    expect(summarize(DEFAULT).open_items.not_sure).toEqual([])
    expect(corrected.open_items.not_sure.length).toBeGreaterThan(0)
    expect(canonicalJson(summarize(DEFAULT))).toBe(before)
  })
})

describe('unauthorized knowledge cannot enter', () => {
  test('an item whose publication the record does not carry is refused', () => {
    expect(refusal(() => summarize(forge(DEFAULT, (r) => { r.sources.publications = r.sources.publications.slice(1) })))).toBe('publication_not_in_record')
    expect(refusal(() => summarize(forge(DEFAULT, (r) => { r.guidance.items[0].provenance.publication.version = 99 })))).toBe('publication_not_in_record')
  })
})

describe('D10: no document reading enters the summary', () => {
  test('integrated assessment appears as codes and document ids only; no reading value or excerpt is carried', () => {
    for (const f of [DEFAULT, MIXED, OPEN]) {
      const s = summarize(f)
      expect(JSON.stringify(s)).not.toMatch(/"(value|excerpt|observed|run_id|plan_name|issuer|comparison|matches|consistent)"/)
      const declared = new Set([...strings(f.record.declarations).map((x) => x.value), ...strings(f.record.guidance).map((x) => x.value), ...strings(TEMPLATES).map((x) => x.value)])
      const readings = new Set<string>()
      for (const d of f.record.documents.items) {
        if (d.examination === 'not_examined') continue
        for (const o of (d.examination as any).envelope.observations) for (const t of [o.value, o.excerpt]) if (typeof t === 'string') readings.add(t)
      }
      expect(readings.size).toBeGreaterThan(0)
      for (const x of strings(s)) if (readings.has(x.value)) expect([x.path, declared.has(x.value)]).toEqual([x.path, true])
    }
  })
})

describe('Artlist standalone: staged, inactive publication proposal', () => {
  const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ARTLIST_ID)!
  test('the proposal preserves the governed claim exactly and is asset-neutral by its source', () => {
    expect(claim).toBeDefined()
    expect(PROPOSAL.entry.claim_id).toBe(ARTLIST_ID)
    expect(PROPOSAL.entry.claim_last_verified).toBe(claim.last_verified)
    expect(claim.provider_scope).toEqual(['artlist'])
    expect(PROPOSAL.proposal.governed_claim.provider_scope).toEqual(['artlist'])
    expect(claim.applicability_requirements).toEqual([])
    expect(claim.unresolved_project_dependencies).toEqual([])
    expect(claim.tool_scope ?? null).toBeNull()
    expect(claim.superseded_by ?? null).toBeNull()
    expect(PROPOSAL.proposal.governed_claim.source_verbatim).toContain('music, footage, or images')
    expect(violatesCustomerWordingLock(PROPOSAL.entry.explanation!)).toBe(false)
    // CR-SUM-1b: source-faithful examples ("such as"), never the exhaustive-sounding "whether".
    expect(PROPOSAL.entry.explanation).toContain('such as music, footage or images')
    expect(PROPOSAL.entry.explanation).not.toContain('whether music')
  })
  test('it is not approved: Pending, no approver, no dates — and the ledger contract refuses it', () => {
    expect(PROPOSAL.entry).toMatchObject({ creator_record_eligible: 'Pending', approver: null, decision_date: null, refresh_by: null })
    expect(authorizePublication([PROPOSAL.entry], claim, '2026-11-12')).toEqual({ authorized: false, reason: 'not_eligible' })
  })
  test('it is not in the live ledger: the live ledger authorizes no Artlist claim', () => {
    expect(CREATOR_RECORD_PUBLICATION_LEDGER.some((e) => e.claim_id.includes('ARTLIST'))).toBe(false)
    for (const c of TOPIC_CLAIMS_FIXTURE.filter((x) => (x.provider_scope ?? []).includes('artlist'))) expect(authorizePublication(CREATOR_RECORD_PUBLICATION_LEDGER, c, '2026-11-12')).toEqual({ authorized: false, reason: 'no_ledger_entry' })
  })
  test('only __tests__ reads the proposals folder, and no application code imports the summary module', () => {
    const root = join(__dirname, '../..')
    const files: string[] = []
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        if (['node_modules', '.next', '__tests__', '.git'].includes(n)) continue
        const p = join(d, n)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(ts|tsx|js|mjs)$/.test(n)) files.push(p)
      }
    }
    for (const d of ['app', 'lib', 'components', 'scripts']) {
      try { walk(join(root, d)) } catch { /* folder absent */ }
    }
    const self = join(root, 'lib/creator-record/readiness-summary/summary.ts')
    // CR-SUM-PDF-B1 (Option R): the only application importer is the customer document model, behind the optional template
    // block that no approved template set carries. Nothing imports the proposals folder.
    const importers = files.filter((p) => p !== self && /from ['"][^'"]*(readiness-summary|governed\/proposals)/.test(readFileSync(p, 'utf8'))).map((p) => relative(root, p).split(sep).join('/'))
    expect(importers).toEqual(['lib/creator-record/customer-pdf/document-model.ts'])
    expect(files.filter((p) => /governed\/proposals/.test(readFileSync(p, 'utf8')))).toEqual([])
  })

  // Pilot sources (synthetic questionnaire with M1 and M3) — the real, unchanged guidance pipeline.
  const RECORD = { record_id: 'PROTOTYPE-STAGE1', record_version: 1, captured_at: '2026-11-12T00:00:00Z' }
  const ANS = { P1: ['Stage 1 selection'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], H1: ['edited'] }
  const run = (answers: Record<string, string[]>, ledger: readonly PublicationLedgerEntry[]) => {
    const r = runDeclaredGuidance({ state: { answers: { ...ANS, ...answers }, tools: [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } } as never, sources: { ...pilotSources(), ledger }, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-12', record: RECORD })
    if (!r.ok) throw new Error(JSON.stringify(r.issues))
    return r.guidance.composition.items.map((i) => i.claim_id)
  }
  const APPROVED_COPY: PublicationLedgerEntry = { ...PROPOSAL.entry, creator_record_eligible: 'Yes', approver: 'SYNTHETIC TEST APPROVER', decision_date: '2026-11-12', refresh_by: '2027-02-12' }
  test('if it were approved, it would be selected for Artlist named as music (M1) and as stock (M3)', () => {
    expect(run({ M0: ['music'], M1: ['artlist'], M2: ['yes'] }, [APPROVED_COPY])).toContain(ARTLIST_ID)
    expect(run({ M0: ['stock'], M3: ['artlist'], M3D: ['yes'] }, [APPROVED_COPY])).toContain(ARTLIST_ID)
    expect(run({ M0: ['none'] }, [APPROVED_COPY])).not.toContain(ARTLIST_ID)
  })
  test('as proposed (Pending) or with the live ledger, it is never selected', () => {
    for (const ledger of [[PROPOSAL.entry], CREATOR_RECORD_PUBLICATION_LEDGER]) {
      expect(run({ M0: ['music'], M1: ['artlist'], M2: ['yes'] }, ledger)).not.toContain(ARTLIST_ID)
      expect(run({ M0: ['stock'], M3: ['artlist'], M3D: ['yes'] }, ledger)).not.toContain(ARTLIST_ID)
    }
  })
})

describe('CR-SUM-1b: considerations capped at the topic level', () => {
  test('the note is the approved PDF topic-level text, exactly', () => {
    expect(APPROVED_TOPIC_LEVEL).toBe('Other information in this record means this subject is shown as not established, even though this item’s own conditions are based on what you told us.')
    expect(TEMPLATES.topic_qualified_note).toBe(APPROVED_TOPIC_LEVEL)
  })
  test('it appears exactly on the items the PDF rule selects, and never changes a conclusion', () => {
    const s = summarize(OPEN)
    const all = s.groups.flatMap((g) => g.considerations)
    const qualified = all.filter((c) => c.topic_qualified !== null)
    expect(qualified.length).toBeGreaterThan(0)
    for (const c of all) {
      const item = OPEN.record.guidance.items.find((i) => i.claim_id === c.claim_id)!
      expect(c.topic_qualified !== null).toBe(isTopicQualified(item))
      expect(c.conclusion.code).toBe(item.conclusion)
      if (c.topic_qualified !== null) {
        expect(c.topic_qualified).toBe(APPROVED_TOPIC_LEVEL)
        expect(item.applicability.status).toBe('met')
        expect(c.depends_on).toEqual([])
      }
    }
    // The item with its own unresolved condition is shown with that condition, not with the topic-level note.
    const own = all.find((c) => c.depends_on.length > 0)!
    expect(own).toBeDefined()
    expect(own.topic_qualified).toBeNull()
    expect(s.open_items.topic_qualified.map((x) => x.consideration)).toEqual(qualified.map((c) => c.index))
  })
  test('it does not appear when nothing caps the item', () => {
    for (const f of [DEFAULT, MIXED]) {
      const s = summarize(f)
      for (const c of s.groups.flatMap((g) => g.considerations)) {
        const item = f.record.guidance.items.find((i) => i.claim_id === c.claim_id)!
        expect(c.topic_qualified !== null).toBe(isTopicQualified(item))
      }
    }
    expect(summarize(DEFAULT).open_items.topic_qualified).toEqual([])
  })
  test('a weaker conclusion without an objective-level cap gets no topic-level note (it is not justified)', () => {
    const f = forge(DEFAULT, (r) => {
      r.guidance.items[0].conclusion = 'relevant_applicability_unresolved'
      r.guidance.items[0].provenance.bounded_interpretation.status = 'directly_relevant'
    })
    const c = summarize(f).groups.flatMap((g) => g.considerations).find((x) => x.claim_id === DEFAULT.record.guidance.items[0].claim_id)!
    expect(c.conclusion.code).toBe('relevant_applicability_unresolved')
    expect(c.topic_qualified).toBeNull()
    // CR-SUM-1c: with no reason the record can show, the approved "does not identify" text explains it instead.
    expect(c.unspecified_condition).toBe(APPROVED_UNSPECIFIED)
  })
  test('templates without the note are incomplete', () => {
    const t = { ...TEMPLATES, topic_qualified_note: '' }
    expect(refusal(() => summarize(DEFAULT, t, approvalOf(t)))).toBe('templates_incomplete')
  })
})

describe('schema compatibility', () => {
  // A real schema 7 record from the LIVE approved sources and wording (Runway, Higgsfield), built locally; no database.
  const live7 = () => {
    const i = approvedCustomerRecordInputs(GOV as never)
    const r = buildCustomerRecord({
      state: { answers: { P1: ['Schema 7 summary check'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['runway-gen3'], T3: ['Pro'], T4: ['May 2026'] }, { T1: ['higgsfield'], T3: ['not_sure'], T4: ['not_sure'] }], acknowledgements: { A1: true, A2: true } } as never,
      sources: i.sources as never, source_text: i.source_text as never, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-12',
      record: { record_id: 'PREP-SUM1B-LIVE7', record_version: 1, captured_at: '2026-11-12T00:00:00Z' },
    })
    if (!r.ok) throw new Error(JSON.stringify(r).slice(0, 400))
    return r
  }
  test('a schema 7 record from the live sources: questionnaire order, no documents, not-sure answers, no topic-level notes', () => {
    const r = live7()
    expect(r.record.schema_version).toBe(7)
    // The record lists Higgsfield first; the summary follows the questionnaire (Runway is tool 1).
    expect(r.record.guidance.items.map((i) => i.claim_id)).toEqual(['CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1', 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1'])
    const s = summarize(r)
    expect(s.identity.schema_version).toBe(7)
    expect(s.groups.map((g) => [g.subject!.q_id, g.subject!.tool_index])).toEqual([['T1', 0], ['T1', 1]])
    expect(s.groups.map((g) => g.considerations.map((c) => c.claim_id))).toEqual([['CLAIM-RUNWAY-COMMERCIAL-USE-001-v1'], ['CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1']])
    for (const c of s.groups.flatMap((g) => g.considerations)) {
      expect(c.documents).toEqual([])
      expect(c.topic_qualified).toBeNull()
      expect(c.explanation).toBe(r.record.guidance.items.find((i) => i.claim_id === c.claim_id)!.explanation)
    }
    expect(s.open_items.not_sure.map((x) => [x.q_id, x.tool_index])).toEqual([['T3', 1], ['T4', 1]])
    expect(s.uncovered_subjects).toEqual([])
    expect(canonicalJson(summarize(r))).toBe(canonicalJson(s))
  })
  test('schema 7: publication, BI and provenance boundaries are enforced exactly as on schema 8', () => {
    const r = live7()
    expect(refusal(() => summarize(forge(r, (x) => { x.sources.publications = [] })))).toBe('publication_not_in_record')
    expect(refusal(() => summarize(forge(r, (x) => { x.guidance.items[0].provenance.bounded_interpretation.status = 'determination_declined' })))).toBe('bi_permits_nothing')
    expect(refusal(() => summarize(forge(r, (x) => { x.guidance.items[0].selection_basis.scopes[0].observation_ids = ['nope'] })))).toBe('selection_provenance_broken')
    expect(refusal(() => summarize(forge(r, (x) => { x.guidance.items[0].conclusion = 'directly_relevant' })))).toBe('unknown_conclusion')
  })
  test('historical schemas 5 and 6 are refused, whatever they contain', () => {
    const r = live7()
    const v5 = historicalForm(r)
    expect(v5.ok && v5.record.schema_version).toBe(5)
    expect(refusal(() => summarize(v5 as { canonical: string; sha256: string }))).toBe('record_schema_unsupported')
    const v6 = historicalForm({ ok: true, record: MIXED.record as CustomerRecordV2, canonical: MIXED.canonical, sha256: MIXED.sha256 })
    expect(v6.ok && v6.record.schema_version).toBe(6)
    expect(refusal(() => summarize(v6 as { canonical: string; sha256: string }))).toBe('record_schema_unsupported')
  })
})

describe('CR-SUM-1c: an unresolved condition the record does not identify', () => {
  const all = (s: ReadinessSummary) => s.groups.flatMap((g) => g.considerations)
  test('the note is the approved PDF unspecified-condition text, exactly', () => {
    expect(APPROVED_UNSPECIFIED).toBe('A condition this record does not identify.')
    expect(TEMPLATES.unspecified_condition_note).toBe(APPROVED_UNSPECIFIED)
  })
  test('own applicability unresolved with no listed fact: the note appears, nothing is named, the conclusion is unchanged', () => {
    const id = DEFAULT.record.guidance.items[0].claim_id
    const f = forge(DEFAULT, (r) => {
      r.guidance.items[0].conclusion = 'relevant_applicability_unresolved'
      r.guidance.items[0].applicability = { status: 'unresolved', material_unresolved: [] }
      r.guidance.items[0].provenance.bounded_interpretation.status = 'relevant_applicability_unresolved'
    })
    const s = summarize(f)
    const c = all(s).find((x) => x.claim_id === id)!
    expect(c.conclusion.code).toBe('relevant_applicability_unresolved')
    expect(c.unspecified_condition).toBe(APPROVED_UNSPECIFIED)
    expect(c.topic_qualified).toBeNull()
    expect(c.depends_on).toEqual([])
    expect(s.open_items.unspecified).toEqual([{ consideration: c.index }])
    expect(s.open_items.unresolved_applicability).toEqual([])
    expect(s.open_items.dependencies).toEqual([])
    // Unrelated items stay without the note.
    for (const o of all(s).filter((x) => x.claim_id !== id)) expect(o.unspecified_condition).toBeNull()
  })
  test('it never appears where the record shows a reason: a listed fact, an own dependency, or a topic-level cap', () => {
    for (const f of [DEFAULT, MIXED, OPEN]) {
      const s = summarize(f)
      for (const c of all(s)) {
        const item = f.record.guidance.items.find((i) => i.claim_id === c.claim_id)!
        expect(c.unspecified_condition !== null).toBe(isUnspecifiedCondition(item))
        if (c.depends_on.length > 0 || c.topic_qualified !== null || c.conclusion.code === 'relevant_on_declared_facts') expect(c.unspecified_condition).toBeNull()
      }
      expect(s.open_items.unspecified).toEqual([])
    }
  })
  test('the rule matches the PDF rule on every item shape, including firm conclusions', () => {
    const shapes: Parameters<typeof isUnspecifiedCondition>[0][] = []
    const base = DEFAULT.record.guidance.items[0]
    for (const conclusion of ['relevant_on_declared_facts', 'relevant_applicability_unresolved'] as const)
      for (const status of ['met', 'unresolved'] as const)
        for (const facts of [[], [{ fact: 'tool_plan_tier', operator: 'equals', value: 'pro' }]])
          for (const deps of [[], base.dependency_rows.length ? base.dependency_rows : [{ dependency_id: 'd', label: 'l' }]])
            for (const bi of ['directly_relevant', 'relevant_applicability_unresolved'] as const)
              shapes.push({ conclusion, applicability: { status, material_unresolved: facts as never }, dependency_rows: deps as never, provenance: { ...base.provenance, bounded_interpretation: { ...base.provenance.bounded_interpretation, status: bi } } })
    for (const i of shapes) {
      // The customer PDF's own definition (document-model.ts `unspecified`), restated here independently.
      const topicLevel = i.conclusion === 'relevant_applicability_unresolved' && i.applicability.status === 'met' && i.dependency_rows.length === 0 && i.provenance.bounded_interpretation.citation === 'supporting' && i.provenance.bounded_interpretation.status === 'relevant_applicability_unresolved'
      const ownUnlisted = i.applicability.status === 'unresolved' && i.applicability.material_unresolved.length === 0
      const shownReason = i.applicability.material_unresolved.length > 0 || i.dependency_rows.length > 0 || topicLevel
      expect(isUnspecifiedCondition(i)).toBe(i.conclusion === 'relevant_applicability_unresolved' && (ownUnlisted || !shownReason))
      expect(isTopicQualified(i)).toBe(topicLevel)
    }
  })
  test('wording: missing, unapproved or changed text is refused', () => {
    const missing = { ...TEMPLATES, unspecified_condition_note: '' }
    expect(refusal(() => summarize(DEFAULT, missing, approvalOf(missing)))).toBe('templates_incomplete')
    // Changed wording under the approval of the original wording: the fingerprint no longer matches.
    expect(refusal(() => summarize(DEFAULT, { ...TEMPLATES, unspecified_condition_note: 'A condition exists.' }, APPROVAL))).toBe('templates_fingerprint_mismatch')
    expect(refusal(() => summarize(DEFAULT, TEMPLATES, null))).toBe('templates_not_approved')
  })
  test('schema 7: the same rule and wording; provenance still enforced', async () => {
    const i = approvedCustomerRecordInputs(GOV as never)
    const r = buildCustomerRecord({
      state: { answers: { P1: ['Schema 7 unspecified check'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['runway-gen3'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } } as never,
      sources: i.sources as never, source_text: i.source_text as never, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-12',
      record: { record_id: 'PREP-SUM1C-LIVE7', record_version: 1, captured_at: '2026-11-12T00:00:00Z' },
    })
    if (!r.ok) throw new Error('fixture')
    expect(r.record.schema_version).toBe(7)
    expect(summarize(r).open_items.unspecified).toEqual([])
    const f = forge(r, (x) => {
      x.guidance.items[0].conclusion = 'relevant_applicability_unresolved'
      x.guidance.items[0].applicability = { status: 'unresolved', material_unresolved: [] }
    })
    const c = summarize(f).groups[0].considerations[0]
    expect(c.unspecified_condition).toBe(APPROVED_UNSPECIFIED)
    expect(c.documents).toEqual([])
    expect(refusal(() => summarize(forge(f, (x) => { x.guidance.items[0].selection_basis.scopes[0].observation_ids = ['nope'] })))).toBe('selection_provenance_broken')
  })
  test('D10 and correction semantics: the note carries no reading, and each version is summarised on its own', () => {
    const f = forge(MIXED, (r) => {
      const k = r.guidance.items.findIndex((x: { dependency_rows: unknown[] }) => x.dependency_rows.length === 0)
      r.guidance.items[k].conclusion = 'relevant_applicability_unresolved'
      r.guidance.items[k].applicability = { status: 'unresolved', material_unresolved: [] }
    })
    const s = summarize(f)
    expect(s.open_items.unspecified.length).toBe(1)
    expect(JSON.stringify(s)).not.toMatch(/"(value|excerpt|observed|run_id)"/)
    expect(summarize(MIXED).open_items.unspecified).toEqual([])
    expect(s.identity.snapshot_sha256).toBe(f.sha256)
    expect(s.identity.snapshot_sha256).not.toBe(MIXED.sha256)
  })
})
