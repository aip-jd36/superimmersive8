/**
 * CR-V2-1 — the Creator Record v2 customer record builder.
 *
 * "Approved" sources in this file are SYNTHETIC TEST FIXTURES: the pilot
 * registry and ledger relabelled with a synthetic approver. No real governance
 * approval exists; the real governed sources are empty and must be refused.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import type { ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { buildReplayTable, type ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { buildCreatorRecordDraft, governedSources, pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { T } from '@/lib/creator-record/presentation/templates'
import { D } from '@/lib/creator-record/internal-draft/templates'
import { buildInternalDraftSnapshot } from '@/lib/creator-record/internal-draft/snapshot'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import {
  buildCustomerRecord, customerRecordDigestMatches, CustomerRecordInvariantError, verifyCustomerRecord,
  CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, type CustomerRecordInput, type CustomerRecordResult, type CustomerRecordV2,
} from '@/lib/creator-record/customer-record/record'
import type { SourceRefusalCode, SourceTextInput } from '@/lib/creator-record/customer-record/sources'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const RECORD = { record_id: 'PREP-CRV21TEST', record_version: 1, captured_at: '2026-10-31T00:00:00Z' }
const AS_OF = '2026-10-31'
const ANS = { P1: ['CR-V2-1 synthetic video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V

const SYNTHETIC: GovernanceApproval = { status: 'approved', approver: 'SYNTHETIC TEST APPROVER (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-REVIEW-1' }

/** Synthetic "approved governed" sources: the pilot content, relabelled. Test fixture only. */
function approvedSources(): CreatorRecordSources {
  const p = pilotSources()
  return {
    ...p,
    kind: 'governed',
    registry_input: {
      ...p.registry_input,
      questions: p.registry_input.questions.map((q) => ({ ...q, approval: q.approval.status === 'approved' ? SYNTHETIC : q.approval })),
      observation_map: p.registry_input.observation_map.map((o) => ({ ...o, approval: o.approval.status === 'approved' ? SYNTHETIC : o.approval })),
    },
    ledger: p.ledger.map((e) => ({ ...e, entry_id: e.entry_id.replace(/^PILOT-UAT-/, 'SYN-'), approver: SYNTHETIC.approver })),
    versions: { registry: 'SYNTHETIC-REGISTRY-1', ledger: 'SYNTHETIC-LEDGER-1' },
  }
}

const state = (plan = 'Pro', tool = 'pika'): CreatorRecordFormState => ({ answers: { ...ANS }, tools: [{ T1: [tool], T3: [plan], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } })
/** Synthetic acknowledgement wording (test fixture only). */
const ACKS = (s: CreatorRecordSources): Record<string, string> => Object.fromEntries(s.acknowledgement_ids.map((id) => [id, `Synthetic acknowledgement ${id} (test fixture only).`]))
/** A synthetic Source Text Approval for exactly the given wording. Test fixture only. */
function approvalFor(s: CreatorRecordSources, acks: Record<string, string> = ACKS(s), over: Partial<SourceTextApproval> = {}): SourceTextApproval {
  const loaded = loadQuestionRegistry(s.registry_input)
  if (!loaded.ok) throw new Error('registry')
  return {
    source_id: SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(s, loaded.registry, acks)),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEXT-REVIEW-1', ...over,
  }
}
const textFor = (s: CreatorRecordSources): SourceTextInput | null => (loadQuestionRegistry(s.registry_input).ok ? { approval: approvalFor(s), acknowledgements: ACKS(s) } : null)
/** By default the synthetic approval follows the sources given; tests of stale approvals pass `source_text` explicitly. */
const input = (over: Partial<CustomerRecordInput> = {}): CustomerRecordInput => {
  const sources = over.sources ?? approvedSources()
  return { state: state(), sources, source_text: textFor(sources), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: RECORD, ...over }
}
function built(r: CustomerRecordResult): { record: CustomerRecordV2; canonical: string; sha256: string } {
  if (!r.ok) throw new Error(JSON.stringify(r))
  return r
}
const refusalCodes = (r: CustomerRecordResult): SourceRefusalCode[] => {
  if (r.ok || r.stage !== 'sources') throw new Error(`expected a sources refusal, got ${JSON.stringify(r).slice(0, 300)}`)
  return Array.from(new Set(r.refusals.map((x) => x.code))).sort()
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
async function toolDoc(fixtureId: string): Promise<ToolDocument> {
  const bytes = new Uint8Array([...PNG, ...Buffer.from(`synthetic:${fixtureId}`)])
  const fixture = REPLAY_FIXTURES.find((f) => f.fixture_id === fixtureId)!
  const table = buildReplayTable([{ ...fixture, sha256: createHash('sha256').update(bytes).digest('hex') } as ReplayFixture])
  return { tool_index: 0, document: await examineUpload(bytes, `${fixtureId}.png`, { mode: 'fixture_replay', replayTable: table }) }
}

// ───────────────────────────────────────────── governance

describe('only approved governed sources are accepted', () => {
  test('the real governed sources (nothing approved yet) are refused, with every reason', () => {
    const r = buildCustomerRecord(input({ sources: governedSources(), source_text: null }))
    expect(refusalCodes(r)).toEqual(['ledger_version_missing', 'no_approved_questions', 'registry_version_missing', 'source_text_missing'])
  })

  test('pilot sources are refused', () => {
    const codes = refusalCodes(buildCustomerRecord(input({ sources: pilotSources() })))
    expect(codes).toContain('not_governed_sources')
    expect(codes).toContain('pilot_marker')
  })

  test('pilot content relabelled "governed" but still carrying pilot approvals is refused', () => {
    const p = pilotSources()
    const codes = refusalCodes(buildCustomerRecord(input({ sources: { ...p, kind: 'governed', versions: { registry: 'R-1', ledger: 'L-1' } } })))
    expect(codes).toEqual(['pilot_marker'])
  })

  test.each([
    ['', 'registry_version_missing'],
    ['none approved', 'registry_version_missing'],
    ['R-1 (internal, unapproved)', 'registry_version_missing'],
    ['PILOT-UAT-REGISTRY-1', 'pilot_marker'],
  ])('registry version %j is refused (%s); no version is invented', (version, code) => {
    const s = approvedSources()
    expect(refusalCodes(buildCustomerRecord(input({ sources: { ...s, versions: { ...s.versions, registry: version } } })))).toEqual([code])
  })

  test('the ledger needs an approved version', () => {
    const s = approvedSources()
    expect(refusalCodes(buildCustomerRecord(input({ sources: { ...s, versions: { ...s.versions, ledger: 'none approved' } } })))).toEqual(['ledger_version_missing'])
  })

  test('approved questions need approved wording; wording needs an approved question; options need labels', () => {
    const s = approvedSources()
    const first = s.registry_input.questions.find((q) => q.approval.status === 'approved' && q.options !== 'free_text')!
    const option = (first.options as string[])[0]
    const presentation = clone(s.presentation) as Record<string, any>
    delete presentation.P1
    presentation[first.q_id].option_labels = { ...presentation[first.q_id].option_labels }
    delete presentation[first.q_id].option_labels[option]
    presentation.ZZ9 = { ...presentation[first.q_id], q_id: 'ZZ9' }
    const r = buildCustomerRecord(input({ sources: { ...s, presentation } }))
    expect(refusalCodes(r)).toEqual(['option_label_missing', 'presentation_without_approved_question', 'question_presentation_missing'])
    if (!r.ok && r.stage === 'sources') {
      expect(r.refusals).toEqual(expect.arrayContaining([{ code: 'question_presentation_missing', ref: 'P1' }, { code: 'option_label_missing', ref: `${first.q_id}.${option}` }, { code: 'presentation_without_approved_question', ref: 'ZZ9' }]))
    }
  })

  test('a registry that approves no question is refused', () => {
    const s = approvedSources()
    const registry_input = { ...s.registry_input, questions: s.registry_input.questions.map((q) => ({ ...q, approval: { ...q.approval, status: 'pending' as const } })) }
    const codes = refusalCodes(buildCustomerRecord(input({ sources: { ...s, registry_input, presentation: {} } })))
    expect(codes).toEqual(['no_approved_questions'])
  })

  test('incomplete, duplicated, stale, lapsed or unknown ledger entries, and caveats without text, are refused', () => {
    const s = approvedSources()
    const yes = s.ledger.filter((e) => e.creator_record_eligible === 'Yes')
    expect(yes.length).toBeGreaterThanOrEqual(4)
    const [a, b, c, d] = yes
    const ledger = [
      ...s.ledger.filter((e) => ![a, b, c, d].includes(e)),
      { ...a, explanation: '' },
      { ...b, claim_last_verified: '2001-01-01' },
      { ...c, claim_id: 'CLAIM-DOES-NOT-EXIST-001-v1' },
      { ...d, required_caveats: [...d.required_caveats, 'caveat-without-text'] },
      { ...d, entry_id: 'SYN-DUPLICATE' },
    ]
    const codes = refusalCodes(buildCustomerRecord(input({ sources: { ...s, ledger } })))
    expect(codes).toEqual(['caveat_text_missing', 'ledger_claim_reverified', 'ledger_claim_unknown', 'ledger_entry_duplicate', 'ledger_entry_incomplete'])
  })

  test('a lapsed refresh date is refused', () => {
    const s = approvedSources()
    const ledger = s.ledger.map((e, i) => (i === 0 ? { ...e, refresh_by: '2026-10-30' } : e))
    expect(s.ledger[0].creator_record_eligible).toBe('Yes')
    expect(refusalCodes(buildCustomerRecord(input({ sources: { ...s, ledger } })))).toEqual(['ledger_refresh_lapsed'])
  })

  test('an explicitly approved, empty ledger gives a declarations-only record (no guidance)', () => {
    const { record } = built(buildCustomerRecord(input({ sources: { ...approvedSources(), ledger: [] } })))
    expect(record.guidance.items).toEqual([])
    expect(record.declarations.answers.length).toBeGreaterThan(0)
    expect(record.sources.publications).toEqual([])
  })
})

// ───────────────────────────────────────────── the record

describe('the record', () => {
  test('is built from approved sources and carries their provenance, apart from each other', () => {
    const { record } = built(buildCustomerRecord(input()))
    expect(record.schema).toBe(CUSTOMER_RECORD_SCHEMA)
    expect(record.status).toBe('prepared_not_issued')
    expect(record.content).toEqual({ id: 'si8/creator-record-v2-record-content', version: 1, generated_text: 'none' })
    expect(record.sources).toEqual(expect.objectContaining({
      kind: 'governed', registry_version: 'SYNTHETIC-REGISTRY-1', ledger_version: 'SYNTHETIC-LEDGER-1', guidance_as_of: AS_OF,
      source_text: {
        source_id: SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: approvalFor(approvedSources()).content_sha256, categories: [...SOURCE_TEXT_CATEGORIES].sort(),
        record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION }, authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEXT-REVIEW-1',
      },
    }))
    expect(record.sources.questions.map((q) => q.q_id)).toEqual(Array.from(new Set(record.declarations.answers.map((a) => a.q_id))))
    expect(record.sources.questions.every((q) => q.approver === SYNTHETIC.approver)).toBe(true)
    expect(record.guidance.items.length).toBeGreaterThan(0)
    expect(record.sources.publications.map((p) => p.claim_id)).toEqual(record.guidance.items.map((i) => i.claim_id))
  })

  test('is deterministic, and its digest is the SHA-256 of its canonical form', () => {
    const a = built(buildCustomerRecord(input()))
    const b = built(buildCustomerRecord(input()))
    expect(b.canonical).toBe(a.canonical)
    expect(b.sha256).toBe(a.sha256)
    expect(a.sha256).toBe(sha256Hex(a.canonical))
    expect(a.canonical).toBe(canonicalJson(a.record))
  })

  test('does not depend on the key order of the submitted state', () => {
    const s = state()
    const reordered = { acknowledgements: { A2: true, A1: true }, tools: [{ T4: ['May 2026'], T3: ['Pro'], T1: ['pika'] }], answers: Object.fromEntries(Object.entries(s.answers).reverse()) }
    expect(built(buildCustomerRecord(input({ state: reordered }))).sha256).toBe(built(buildCustomerRecord(input())).sha256)
  })

  test('the reference, version, capture time, guidance date and every answer are part of the hash', () => {
    const base = built(buildCustomerRecord(input())).sha256
    const variants = [
      input({ record: { ...RECORD, record_id: 'PREP-OTHER' } }),
      input({ record: { ...RECORD, record_version: 2 } }),
      input({ record: { ...RECORD, captured_at: '2026-10-31T00:00:01Z' } }),
      input({ as_of: '2026-11-01' }),
      input({ state: { ...state(), answers: { ...ANS, P1: ['A different title'] } } }),
    ]
    const hashes = variants.map((v) => built(buildCustomerRecord(v)).sha256)
    expect(new Set([base, ...hashes]).size).toBe(hashes.length + 1)
  })

  test('declarations are exactly the recorded observations, with approved wording, verbatim answers and approved labels', () => {
    const s = approvedSources()
    const { record } = built(buildCustomerRecord(input()))
    const byKey = new Map<string, { verbatim: Set<string>; codes: Set<string | null> }>()
    for (const o of record.declarations.observations) {
      const k = `${o.question.q_id}|${o.instance ?? ''}`
      const g = byKey.get(k) ?? { verbatim: new Set<string>(), codes: new Set<string | null>() }
      g.verbatim.add(o.answer_verbatim)
      g.codes.add(o.normalized_value)
      byKey.set(k, g)
    }
    expect(record.declarations.answers.length).toBe(byKey.size)
    for (const a of record.declarations.answers) {
      const k = `${a.q_id}|${a.tool_index === null ? '' : `tool-${a.tool_index + 1}`}`
      const g = byKey.get(k)!
      expect(g.verbatim).toEqual(new Set([a.answer_verbatim]))
      if (a.values.every((v) => v.kind === 'option')) expect(g.codes).toEqual(new Set(a.values.map((v) => v.value)))
      expect(a.question).toBe(s.presentation[a.q_id].text)
      for (const v of a.values) if (v.kind === 'option') expect(v.label).toBe(s.presentation[a.q_id].option_labels[v.value])
      const submitted = a.tool_index === null ? (ANS as Record<string, string[]>)[a.q_id] : (state().tools[a.tool_index] as Record<string, string[]>)[a.q_id]
      expect(a.values.map((v) => v.value)).toEqual(submitted)
    }
    expect(record.declarations.acknowledgements).toEqual(s.acknowledgement_ids.map((id) => ({ id, text: ACKS(s)[id] })).sort((a, b) => a.id.localeCompare(b.id)))
  })

  test('form problems are reported, nothing is built', () => {
    const r = buildCustomerRecord(input({ state: { ...state(), answers: { ...ANS, P1: [] } } }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.stage).toBe('form')
  })

  test.each([
    ['not an object', 'state', null],
    ['answers not lists', 'state', { answers: { P1: 'x' }, tools: [], acknowledgements: {} }],
    ['an unknown key', 'state', { ...state(), extra: true }],
    ['an issued record id', 'record.record_id_is_issued_id', undefined],
    ['a bad capture time', 'record.captured_at', undefined],
    ['a bad guidance date', 'as_of', undefined],
  ])('malformed input (%s) is refused before any source is read', (label, issue, badState) => {
    const over: Partial<CustomerRecordInput> =
      issue === 'record.record_id_is_issued_id' ? { record: { ...RECORD, record_id: 'CR-2026-3F2A9C10' } }
        : issue === 'record.captured_at' ? { record: { ...RECORD, captured_at: '31/10/2026' } }
          : issue === 'as_of' ? { as_of: '2026-10-31T00:00:00Z' }
            : { state: badState }
    const r = buildCustomerRecord(input({ ...over, sources: governedSources() }))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect([label, r.stage]).toEqual([label, 'input'])
      if (r.stage === 'input') expect(r.issues).toContain(issue)
    }
  })
})

// ───────────────────────────────────────────── documents and comparisons (Option C)

describe('documents are not provided and comparisons are disabled', () => {
  test('documents are not accepted as input', () => {
    const r = buildCustomerRecord(input({ state: { ...state(), documents: [] } }))
    expect(r.ok).toBe(false)
    if (!r.ok && r.stage === 'input') expect(r.issues).toContain('state.documents_not_accepted')
  })

  test('every declared tool is recorded as not provided; the comparison policy is disabled', () => {
    const two = { ...state(), tools: [state().tools[0], { T1: ['kling'], T3: ['Standard'], T4: ['May 2026'] }] }
    const { record, canonical } = built(buildCustomerRecord(input({ state: two })))
    expect(record.documents).toEqual({ status: 'not_provided', tools: [{ tool_index: 0, status: 'not_provided' }, { tool_index: 1, status: 'not_provided' }] })
    expect(record.comparison).toEqual({ policy: 'disabled' })
    expect(canonical).not.toMatch(/appears_consistent|appears_to_conflict|reconciliation|cross_check|document_observations/)
  })

  test.each([['shot-pika-multiple-payments'], ['pdf-kling-pro-monthly']])('guidance is the same as the prototype gives with a document (%s): documents cannot influence it', async (fixture) => {
    const { record } = built(buildCustomerRecord(input()))
    const draft = buildCreatorRecordDraft({ state: state(), sources: approvedSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: RECORD, documents: [await toolDoc(fixture)] })
    if (!draft.ok) throw new Error('draft failed')
    expect(record.guidance.items.map((i) => [i.claim_id, i.conclusion, i.explanation])).toEqual(draft.guidance.composition.items.map((i) => [i.claim_id, i.conclusion, i.explanation]))
    // The draft did read the document (display only); the guidance above is still identical.
    expect(draft.view.trace.document_observations.length).toBeGreaterThan(0)
  })
})

// ───────────────────────────────────────────── grounding and interpretation

describe('no generated prose, and never a stronger conclusion than permitted', () => {
  test('every text field is the creator\'s answer or approved source text, verbatim; no template sentence appears', () => {
    const s = approvedSources()
    const { record, canonical } = built(buildCustomerRecord(input({ state: { ...state(), tools: [state().tools[0], { T1: ['kling'], T3: ['Standard'], T4: ['May 2026'] }] } })))
    const ledgerText = new Set(s.ledger.flatMap((e) => [e.explanation, ...Object.values(e.evidence_notes)]))
    for (const it of record.guidance.items) {
      expect(ledgerText.has(it.explanation)).toBe(true)
      for (const c of it.caveats) expect(c.text).toBe(s.caveats[c.caveat_id])
      for (const row of it.dependency_rows) {
        expect(row.label).toBe(s.dependency_labels[row.dependency_id])
        if (row.evidence_note !== null) expect(ledgerText.has(row.evidence_note)).toBe(true)
      }
    }
    const templates = [...JSON.stringify(T).match(/"([^"\\]|\\.){16,}"/g) ?? [], ...JSON.stringify(D).match(/"([^"\\]|\\.){16,}"/g) ?? []].map((q) => JSON.parse(q) as string)
      // Template sentences only: codes and keys are not prose.
      .filter((t) => t.includes(' '))
    expect(templates.length).toBeGreaterThan(50)
    const own = new Set([...Object.values(s.presentation).flatMap((p) => [p.text, ...Object.values(p.option_labels)]), ...ledgerText, ...Object.values(s.caveats), ...Object.values(s.dependency_labels)])
    for (const t of templates) if (!own.has(t)) expect([t, canonical.includes(t)]).toEqual([t, false])
  })

  // Tamper with the guidance pipeline's output; the record must refuse it.
  function withGuidance(mutate: (r: any) => void): () => CustomerRecordResult {
    let build!: typeof buildCustomerRecord
    jest.isolateModules(() => {
      const actual = jest.requireActual('@/lib/creator-record/integration/run-creator-record-guidance')
      jest.doMock('@/lib/creator-record/integration/run-creator-record-guidance', () => ({
        ...actual,
        runCreatorRecordGuidance: (i: unknown) => {
          const r = actual.runCreatorRecordGuidance(i)
          mutate(r)
          return r
        },
      }))
      build = require('@/lib/creator-record/customer-record/record').buildCustomerRecord
    })
    return () => build(input({ state: state('Standard') }))
  }

  test('control: the untampered pipeline builds, with both conclusion strengths available in these cases', () => {
    const conclusions = new Set<string>()
    for (const s of [state('Pro'), state('Standard'), state('not_sure')]) for (const i of built(buildCustomerRecord(input({ state: s }))).record.guidance.items) conclusions.add(i.conclusion)
    expect(conclusions).toEqual(new Set(['relevant_on_declared_facts', 'relevant_applicability_unresolved']))
    expect(() => withGuidance(() => undefined)()).not.toThrow()
  })

  test.each([
    ['a conclusion stronger than BI and applicability permit', (r: any) => { for (const i of r.composition.items) { i.conclusion = 'relevant_on_declared_facts'; i.applicability.status = 'unresolved' } }],
    ['a conclusion BI does not permit at all', (r: any) => { for (const i of r.composition.items) i.provenance.bounded_interpretation.status = 'outside_current_coverage' }],
    ['an unsupported conclusion value', (r: any) => { r.composition.items[0].conclusion = 'cleared_for_commercial_use' }],
    ['an explanation that is not the approved ledger text', (r: any) => { r.composition.items[0].explanation = 'This video is safe for commercial use.' }],
    ['caveats that are not the approved ledger caveats', (r: any) => { r.composition.items[0].required_caveats = [] }],
    ['an unknown field on a guidance item', (r: any) => { r.composition.items[0].commercial_clearance = true }],
    ['a dependency row without an approved label', (r: any) => { r.composition.items[0].dependency_rows.push({ dependency_id: 'x', label: null, declarations: [], evidence_note: null, evidence_requirement: 'not_defined_by_governance', treated_as: 'evidence_required', sufficiency: 'not_assessed', status: 'open' }) }],
    ['guidance for an unknown claim', (r: any) => { r.composition.items[0].claim_id = 'CLAIM-UNKNOWN-001-v1' }],
    ['mismatched publication provenance', (r: any) => { r.composition.items[0].provenance.publication.version = 99 }],
    ['a ledger entry without a governed claim', (r: any) => { r.governance_gaps.push({ kind: 'ledger_entry_without_governed_claim', entry_id: 'x', claim_id: 'y' }) }],
  ])('%s: refused, nothing is built', (_, mutate) => {
    const build = withGuidance((r) => {
      expect(r.composition.items.length).toBeGreaterThan(0)
      mutate(r)
    })
    // Matched by message: jest.isolateModules loads a second copy of the error class.
    expect(build).toThrow(/^creator_record_v2_record_invariant: /)
  })
})

// ───────────────────────────────────────────── verification

describe('verification', () => {
  test('a stored record verifies only with its exact canonical text and digest', () => {
    const { record, canonical, sha256 } = built(buildCustomerRecord(input()))
    expect(verifyCustomerRecord(canonical, sha256)).toEqual({ ok: true, record })
    expect(customerRecordDigestMatches(record, sha256)).toBe(true)

    const tampered = canonical.replace('CR-V2-1 synthetic video', 'CR-V2-1 synthetic videO')
    expect(verifyCustomerRecord(tampered, sha256)).toEqual({ ok: false, reason: 'digest_mismatch' })
    const spaced = JSON.stringify(JSON.parse(canonical), null, 1)
    expect(verifyCustomerRecord(spaced, sha256Hex(spaced))).toEqual({ ok: false, reason: 'not_canonical' })
    expect(verifyCustomerRecord(canonical, sha256.toUpperCase())).toEqual({ ok: false, reason: 'digest_malformed' })
    expect(verifyCustomerRecord('not json', sha256Hex('not json'))).toEqual({ ok: false, reason: 'not_json' })
    const changed = clone(record)
    changed.guidance.items = []
    expect(customerRecordDigestMatches(changed, sha256)).toBe(false)
  })

  test('an internal draft snapshot is not a customer record', () => {
    const draft = buildInternalDraftSnapshot({ state: state(), sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: { ...RECORD, record_id: 'PROTOTYPE-X' } })
    if (!draft.ok) throw new Error('draft failed')
    expect(verifyCustomerRecord(draft.canonical, draft.sha256)).toEqual({ ok: false, reason: 'wrong_schema' })
  })
})

// ───────────────────────────────────────────── independence

describe('independence', () => {
  const APP_ROOT = path.resolve(__dirname, '..', '..')
  const ROOT = path.join(APP_ROOT, 'lib', 'creator-record', 'customer-record')
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      if (n === 'node_modules' || n === '.next') return []
      const p = path.join(dir, n)
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : []
    })
  const importsOf = (f: string) => Array.from(readFileSync(f, 'utf8').matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)).map((m) => m[1])

  test('imports only the reused contract, form, guidance and record-core modules: no database, payment, Storage, email, PDF, pilot, evidence or draft', () => {
    const targets = new Set(walk(ROOT).flatMap((f) => importsOf(f).map((i) => (i.startsWith('.') ? path.relative(path.join(APP_ROOT, 'lib', 'creator-record'), path.resolve(path.dirname(f), i)).split(path.sep).join('/') : i))))
    expect(Array.from(targets).sort()).toEqual([
      'contract/compose', 'contract/provenance', 'contract/publication-ledger', 'contract/question-registry', 'contract/types',
      // CR-V2-1C: the authority digests and the eligibility check are part of the module.
      'customer-record/authority-content', 'customer-record/eligibility', 'customer-record/record',
      'customer-record/source-text', 'customer-record/sources', 'prototype/build-draft', 'prototype/declared-guidance', 'prototype/form', 'prototype/parse-form-state',
      'record-core/canonical', 'record-core/projection',
    ])
    // prototype/build-draft (which holds the pilot data) is reached for types only.
    for (const f of walk(ROOT)) expect(readFileSync(f, 'utf8')).not.toMatch(/^import\s(?!type\s)[^\n]*from\s+['"]\.\.\/prototype\/build-draft['"]/m)
  })

  test('the shared declaration/guidance module loads no pilot data', () => {
    const src = readFileSync(path.join(APP_ROOT, 'lib', 'creator-record', 'prototype', 'declared-guidance.ts'), 'utf8')
    const runtime = src.split('\n').filter((l) => /^import\s(?!type\s)/.test(l))
    expect(runtime.length).toBeGreaterThan(0)
    expect(runtime.some((l) => /pilot|build-draft/.test(l))).toBe(false)
  })

  test('only the prepare flow imports it; no payment or issuance integration', () => {
    const files = [...walk(path.join(APP_ROOT, 'app')), ...walk(path.join(APP_ROOT, 'components')), ...walk(path.join(APP_ROOT, 'lib'))].filter((f) => !f.startsWith(ROOT))
    const rel = (f: string) => path.relative(APP_ROOT, f).split(path.sep).join('/')
    const importers = files.filter((f) => importsOf(f).some((i) => i.includes('customer-record'))).map(rel).sort()
    // CR-V2-2B: the customer PDF document model (itself unreachable from the app).
    // CR-V2-MVP-M2: the invited prepare/review flow, and a type-only import of the Source Text Approval shape by the governed sources.
    // CR-V2-MVP-M3: the governance snapshot (approved inputs) and the purchase / issuance rules.
    expect(importers).toEqual([
      'app/creator-record/page.tsx',
      'lib/creator-record/customer-flow/approved-inputs.ts',
      'lib/creator-record/customer-flow/purchase.ts',
      'lib/creator-record/customer-flow/service.ts',
      'lib/creator-record/customer-pdf/document-model.ts',
      'lib/creator-record/governed/sources.ts',
    ])
    // CR-V2-MVP-M3: payment, checkout, webhook, admin and artifact-issuance code reach the v2 flow ONLY through these
    // exact files (checkout preconditions, the registered v2 renderer). Exact list, including dynamic imports.
    const issuance = files.map(rel).filter((f) => /^lib\/(payments|creator-record-artifacts)\/|^app\/api\/(webhooks|checkout|admin)\//.test(f))
    expect(issuance.length).toBeGreaterThan(0)
    const reach = (f: string) => Array.from(new Set(readFileSync(path.join(APP_ROOT, f), 'utf8').match(/@\/lib\/(creator-record\/customer-[a-z-]+\/[a-z-]+|creator-record-flow\/[a-z-]+)/g) ?? [])).sort()
    expect(issuance.filter((f) => reach(f).length > 0).map((f) => [f, reach(f)])).toEqual([
      ['app/api/checkout/create-session/route.ts', ['@/lib/creator-record-flow/http', '@/lib/creator-record-flow/production', '@/lib/creator-record-flow/wording', '@/lib/creator-record/customer-flow/purchase']],
      ['lib/creator-record-artifacts/renderers.ts', ['@/lib/creator-record-flow/production']],
    ])
  })
})

// ───────────────────────────────────────────── CR-V2-1A: the Source Text Approval contract

describe('Source Text Approval: approval is bound to exact, immutable wording', () => {
  const base = approvedSources()
  const stale = (): SourceTextInput => ({ approval: approvalFor(base), acknowledgements: ACKS(base) })
  const withText = (sources: CreatorRecordSources, source_text: SourceTextInput | null) => buildCustomerRecord(input({ sources, source_text }))

  test.each([
    ['question wording', (s: any) => { s.presentation.P1 = { ...s.presentation.P1, text: `${s.presentation.P1.text} (edited)` } }],
    ['question help', (s: any) => { s.presentation.P1 = { ...s.presentation.P1, help: 'New help text.' } }],
    ['an option label', (s: any) => { s.presentation.P3 = { ...s.presentation.P3, option_labels: { ...s.presentation.P3.option_labels, own_channels: 'Own channels (edited)' } } }],
    ['a dependency label', (s: any) => { const k = Object.keys(s.dependency_labels)[0]; s.dependency_labels = { ...s.dependency_labels, [k]: 'Edited label' } }],
    ['a caveat', (s: any) => { const k = Object.keys(s.caveats)[0]; s.caveats = { ...s.caveats, [k]: 'Edited caveat.' } }],
    ['an added caveat', (s: any) => { s.caveats = { ...s.caveats, 'new-caveat': 'A caveat nobody approved.' } }],
  ])('changing %s without a new approval is refused', (_, mutate) => {
    const s = clone(base)
    mutate(s)
    expect(refusalCodes(withText(s, stale()))).toEqual(['source_text_digest_mismatch'])
  })

  test('changing acknowledgement wording without a new approval is refused', () => {
    const acks = { ...ACKS(base), [base.acknowledgement_ids[0]]: 'I agree to something else.' }
    expect(refusalCodes(withText(base, { approval: approvalFor(base), acknowledgements: acks }))).toEqual(['source_text_digest_mismatch'])
  })

  test('the same or a new version over different content does not match; a new approval of the new content does', () => {
    const s = clone(base) as any
    s.presentation.P1 = { ...s.presentation.P1, text: 'What is the title of this project?' }
    expect(refusalCodes(withText(s, stale()))).toEqual(['source_text_digest_mismatch'])
    expect(refusalCodes(withText(s, { approval: { ...approvalFor(base), version: 2 }, acknowledgements: ACKS(base) }))).toEqual(['source_text_digest_mismatch'])
    const { record } = built(withText(s, { approval: approvalFor(s, ACKS(s), { version: 2 }), acknowledgements: ACKS(s) }))
    expect(record.sources.source_text.version).toBe(2)
    expect(record.declarations.answers.find((a) => a.q_id === 'P1')!.question).toBe('What is the title of this project?')
  })

  test.each([
    [{ version: 0 }, 'source_text_identity_invalid'],
    [{ version: 1.5 }, 'source_text_identity_invalid'],
    [{ source_id: 'si8/something-else' }, 'source_text_identity_invalid'],
    [{ lifecycle: 'pending' }, 'source_text_not_approved'],
    [{ lifecycle: 'withdrawn' }, 'source_text_withdrawn'],
    [{ lifecycle: 'superseded' }, 'source_text_superseded'],
    [{ authority: '' }, 'source_text_not_approved'],
    [{ decision_date: '30/10/2026' }, 'source_text_not_approved'],
    [{ authority: 'PILOT-UAT — not a governance approval' }, 'pilot_marker'],
    [{ record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: 1 } }, 'source_text_schema_mismatch'],
    [{ record_schema: { id: 'si8-internal-draft/creator-record-v2-snapshot', version: CUSTOMER_RECORD_SCHEMA_VERSION } }, 'source_text_schema_mismatch'],
    [{ categories: SOURCE_TEXT_CATEGORIES.filter((c) => c !== 'caveat_wording') }, 'source_text_categories_invalid'],
  ] as [Partial<SourceTextApproval>, SourceRefusalCode][])('approval %j is refused (%s)', (over, code) => {
    expect(refusalCodes(withText(base, { approval: approvalFor(base, ACKS(base), over), acknowledgements: ACKS(base) }))).toEqual([code])
  })

  test('a missing approval is refused', () => {
    expect(refusalCodes(withText(base, { approval: null, acknowledgements: ACKS(base) }))).toEqual(['source_text_missing'])
  })

  test('every acknowledgement needs approved wording, and no wording may be orphaned', () => {
    expect(base.acknowledgement_ids.length).toBeGreaterThan(0)
    const [first] = base.acknowledgement_ids
    const missing = Object.fromEntries(Object.entries(ACKS(base)).filter(([k]) => k !== first))
    expect(refusalCodes(withText(base, { approval: approvalFor(base, missing), acknowledgements: missing }))).toEqual(['acknowledgement_text_missing'])
    const blank = { ...ACKS(base), [first]: '   ' }
    expect(refusalCodes(withText(base, { approval: approvalFor(base, blank), acknowledgements: blank }))).toEqual(['acknowledgement_text_missing'])
    const orphan = { ...ACKS(base), A9: 'An acknowledgement the questionnaire does not show.' }
    expect(refusalCodes(withText(base, { approval: approvalFor(base, orphan), acknowledgements: orphan }))).toEqual(['acknowledgement_text_orphan'])
  })

  test('an accepted acknowledgement the questionnaire does not define is refused', () => {
    const r = buildCustomerRecord(input({ state: { ...state(), acknowledgements: { A1: true, A2: true, A7: true } } }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect([r.stage, r.stage === 'input' ? r.issues : null]).toEqual(['input', ['state.acknowledgements.A7']])
  })

  test('the record carries each acknowledgement with its exact approved wording, and the digest of the approved wording', () => {
    const { record } = built(buildCustomerRecord(input()))
    for (const a of record.declarations.acknowledgements) expect(a.text).toBe(ACKS(base)[a.id])
    expect(record.declarations.acknowledgements.map((a) => a.id).sort()).toEqual([...base.acknowledgement_ids].sort())
    expect(record.sources.source_text.content_sha256).toBe(approvalFor(base).content_sha256)
  })

  test('wording approval cannot carry explanations or conclusions: there is no such category, and extra content cannot match', () => {
    const loaded = loadQuestionRegistry(base.registry_input)
    if (!loaded.ok) throw new Error('registry')
    const content = sourceTextContent(base, loaded.registry, ACKS(base))
    const widened = { ...content, explanations: { 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1': 'Cleared for commercial use.' }, conclusion_labels: { relevant_applicability_unresolved: 'Cleared' } }
    const approval = approvalFor(base, ACKS(base), { content_sha256: sourceTextDigest(widened as typeof content), categories: [...SOURCE_TEXT_CATEGORIES, 'guidance_explanations', 'conclusion_labels'] })
    expect(refusalCodes(withText(base, { approval, acknowledgements: ACKS(base) }))).toEqual(['source_text_categories_invalid', 'source_text_digest_mismatch'])
  })

  test('approved wording that asserts a stronger conclusion changes no conclusion, explanation or eligibility', () => {
    const control = built(buildCustomerRecord(input({ state: state('not_sure') }))).record
    expect(control.guidance.items.some((i) => i.conclusion === 'relevant_applicability_unresolved')).toBe(true)
    const s = clone(base)
    s.caveats = Object.fromEntries(Object.keys(s.caveats).map((k) => [k, 'Your use is cleared and fully licensed for commercial use.']))
    s.dependency_labels = Object.fromEntries(Object.keys(s.dependency_labels).map((k) => [k, 'Confirmed: no further evidence needed']))
    const { record } = built(buildCustomerRecord(input({ sources: s, state: state('not_sure') })))
    const strip = (r: CustomerRecordV2) => r.guidance.items.map((i) => [i.claim_id, i.conclusion, i.explanation, i.applicability, i.provenance])
    expect(strip(record)).toEqual(strip(control))
    expect(record.sources.publications).toEqual(control.sources.publications)
  })

  test('historical integrity is verified from the record and digest alone, whatever the approval state is now', () => {
    const { canonical, sha256, record } = built(buildCustomerRecord(input()))
    // The same wording can no longer prepare a record once its approval is withdrawn ...
    expect(refusalCodes(withText(base, { approval: approvalFor(base, ACKS(base), { lifecycle: 'withdrawn' }), acknowledgements: ACKS(base) }))).toEqual(['source_text_withdrawn'])
    // ... but the record prepared earlier still verifies: verification takes no approval input.
    expect(verifyCustomerRecord.length).toBe(2)
    expect(verifyCustomerRecord(canonical, sha256)).toEqual({ ok: true, record })
  })
})
