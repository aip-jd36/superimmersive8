/**
 * CR-V2-1C — governed issuance eligibility of a prepared Creator Record v2.
 *
 * "Approved" sources and approvals here are SYNTHETIC TEST FIXTURES (the pilot
 * content relabelled with a synthetic approver). No real approval exists.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { governedSources, pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { AUTHORITY_KINDS, DIGESTED_KINDS, type AuthorityKind } from '@/lib/creator-record/customer-record/authority-content'
import {
  evaluateIssuanceEligibility, issuanceReferences, type AuthorityState, type GovernanceSnapshot, type IssuanceEligibility,
} from '@/lib/creator-record/customer-record/eligibility'
import { governanceSnapshotFrom, UNAVAILABLE, type CurrentGovernance } from '@/lib/creator-record/customer-record/governance-state'
import {
  buildCustomerRecord as buildCurrentRecord, verifyCustomerRecord, CUSTOMER_RECORD_BUILDER, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION,
  type CustomerRecordInput, type CustomerRecordV2 } from '@/lib/creator-record/customer-record/record'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'
import { COMMERCIAL_SUPPORT_UNDER_TEST } from '@/test-support/commercial-support'

const buildCustomerRecord = buildCurrentRecord
/** Exactly this record's schema and builder, so removing one leaves nothing of that kind. */
const DECLARATIONS_SUPPORT = { record_schemas: COMMERCIAL_SUPPORT_UNDER_TEST.record_schemas.slice(0, 1), builders: COMMERCIAL_SUPPORT_UNDER_TEST.builders.slice(0, 1) }

const RECORD = { record_id: 'PREP-CRV21CTEST', record_version: 1, captured_at: '2026-10-31T00:00:00Z' }
const AS_OF = '2026-10-31'
const ISSUE_ON = '2026-11-02'
const ANS = { P1: ['CR-V2-1C synthetic video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V

const SYNTHETIC: GovernanceApproval = { status: 'approved', approver: 'SYNTHETIC TEST APPROVER (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-REVIEW-1' }
function approvedSources(): CreatorRecordSources {
  return withQuestionnaireApproval(unapprovedSources())
}
function unapprovedSources(): CreatorRecordSources {
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
const ACKS = (s: CreatorRecordSources) => Object.fromEntries(s.acknowledgement_ids.map((id) => [id, `Synthetic acknowledgement ${id} (test fixture only).`]))
function approvalFor(s: CreatorRecordSources, over: Partial<SourceTextApproval> = {}): SourceTextApproval {
  const loaded = loadQuestionRegistry(s.registry_input)
  if (!loaded.ok) throw new Error('registry')
  return {
    source_id: SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(s, loaded.registry, ACKS(s))),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEXT-REVIEW-1', ...over,
  }
}
const state = (plan = 'Pro', tool = 'pika'): CreatorRecordFormState => ({ answers: { ...ANS }, tools: [{ T1: [tool], T3: [plan], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } })
function prepare(over: Partial<CustomerRecordInput> = {}) {
  const sources = over.sources ?? approvedSources()
  const r = buildCustomerRecord({ state: state(), sources, source_text: { approval: approvalFor(sources), acknowledgements: ACKS(sources) }, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: RECORD, ...over })
  if (!r.ok) throw new Error(JSON.stringify(r))
  return r
}
const governance = (over: Partial<CurrentGovernance> = {}): CurrentGovernance => {
  const sources = approvedSources()
  return { issuance_date: ISSUE_ON, sources, topicClaims: TOPIC_CLAIMS_FIXTURE, source_text_approvals: [approvalFor(sources)], support: DECLARATIONS_SUPPORT, authority_class: 'synthetic_test', ...over }
}
const evaluate = (g: CurrentGovernance | GovernanceSnapshot, rec = prepare()) =>
  evaluateIssuanceEligibility(rec.canonical, rec.sha256, 'authorities' in g ? g : governanceSnapshotFrom(g))
const codes = (r: IssuanceEligibility) => (r.decision === 'ineligible' ? r.reasons.map((x) => `${x.kind}:${x.code}`) : r.decision === 'indeterminate' && r.cause === 'conflict' ? r.conflicts.map((x) => `${x.kind}:${x.code}`) : [])

// ───────────────────────────────────────────── baseline

describe('approved and valid authorities', () => {
  test('a prepared record under unchanged governance is eligible, every reference checked', () => {
    const rec = prepare()
    const r = evaluate(governance(), rec)
    expect(r.decision).toBe('eligible')
    if (r.decision !== 'eligible') return
    expect(r.checked).toEqual(issuanceReferences(rec.record))
    expect(new Set(r.checked.map((x) => x.kind))).toEqual(new Set(AUTHORITY_KINDS))
  })

  test('the record carries builder provenance and a content digest for every governed entry it uses', () => {
    const { record } = prepare()
    expect(record.schema_version).toBe(CUSTOMER_RECORD_SCHEMA_VERSION)
    expect(record.builder).toEqual(CUSTOMER_RECORD_BUILDER)
    const refs = issuanceReferences(record)
    for (const k of DIGESTED_KINDS) expect(refs.some((x) => x.kind === k && /^[0-9a-f]{64}$/.test(x.content_sha256 ?? ''))).toBe(true)
    expect(record.sources.authority_digests.length).toBe(refs.filter((x) => (DIGESTED_KINDS as readonly string[]).includes(x.kind)).length)
  })

  test('a declarations-only record (explicitly approved empty ledger) has no publication or claim references and can be eligible', () => {
    const sources = { ...approvedSources(), ledger: [] }
    const rec = prepare({ sources })
    expect(issuanceReferences(rec.record).some((x) => x.kind === 'publication_entry' || x.kind === 'governed_claim')).toBe(false)
    expect(evaluate(governance({ sources, source_text_approvals: [approvalFor(sources)] }), rec).decision).toBe('eligible')
  })
})

// ───────────────────────────────────────────── the generic rules, for every kind

describe('every authority kind is checked by the same rules', () => {
  const rec = prepare()
  const refs = issuanceReferences(rec.record)
  const base = () => clone(governanceSnapshotFrom(governance()))
  const target = (kind: AuthorityKind) => refs.find((x) => x.kind === kind)!
  /** Apply `f` to the current entry for this kind's first reference. */
  function edit(kind: AuthorityKind, f: (entries: AuthorityState[], i: number) => void): GovernanceSnapshot {
    const g = base()
    const lookup = g.authorities[kind] as { status: 'ok'; entries: AuthorityState[] }
    const ref = target(kind)
    const i = lookup.entries.findIndex((e) => e.id === ref.id && e.version === ref.version)
    expect(i).toBeGreaterThanOrEqual(0)
    f(lookup.entries, i)
    return g
  }

  test.each(AUTHORITY_KINDS.flatMap((k) => (['pending', 'withdrawn', 'superseded', 'retired'] as const).map((l) => [k, l] as const)))('%s %s → ineligible', (kind, lifecycle) => {
    expect(codes(evaluate(edit(kind, (e, i) => { e[i].lifecycle = lifecycle }), rec))).toEqual([`${kind}:lifecycle_${lifecycle}`])
  })

  test.each(AUTHORITY_KINDS)('%s missing → ineligible (reference_missing)', (kind) => {
    expect(codes(evaluate(edit(kind, (e, i) => { e.splice(i, 1) }), rec))).toContain(`${kind}:reference_missing`)
  })

  test.each(AUTHORITY_KINDS)('%s now at another version → ineligible (version_not_current)', (kind) => {
    expect(codes(evaluate(edit(kind, (e, i) => { e[i].version = `${e[i].version}-next` }), rec))).toContain(`${kind}:version_not_current`)
  })

  test.each(AUTHORITY_KINDS)('%s listed twice under one version → indeterminate conflict (reference_ambiguous)', (kind) => {
    const r = evaluate(edit(kind, (e, i) => { e.push({ ...e[i] }) }), rec)
    expect([r.decision, codes(r)]).toEqual(['indeterminate', [`${kind}:reference_ambiguous`]])
  })

  test.each([...DIGESTED_KINDS, 'source_text', 'questionnaire_contract'] as AuthorityKind[])('%s with changed content under an unchanged version → indeterminate conflict', (kind) => {
    const r = evaluate(edit(kind, (e, i) => { e[i].content_sha256 = 'f'.repeat(64) }), rec)
    expect([r.decision, codes(r)]).toEqual(['indeterminate', [`${kind}:content_changed_under_version`]])
  })

  test.each(AUTHORITY_KINDS)('%s reported in conflict by governance → indeterminate conflict', (kind) => {
    const r = evaluate(edit(kind, (e, i) => { e[i].conflict = true }), rec)
    expect([r.decision, codes(r)]).toEqual(['indeterminate', [`${kind}:governance_conflict`]])
  })

  test.each(AUTHORITY_KINDS)('%s past its validity date → ineligible (validity_lapsed)', (kind) => {
    expect(codes(evaluate(edit(kind, (e, i) => { e[i].valid_until = '2026-11-01' }), rec))).toEqual([`${kind}:validity_lapsed`])
  })

  test('a definitive refusal outranks a conflict; reasons are sorted and deterministic', () => {
    const g = edit('source_text', (e, i) => { e[i].lifecycle = 'withdrawn' })
    ;(g.authorities.builder as unknown as { entries: AuthorityState[] }).entries[0].conflict = true
    ;(g.authorities.question as unknown as { entries: AuthorityState[] }).entries.forEach((e) => { e.lifecycle = 'retired' })
    const a = evaluate(g, rec)
    const b = evaluate(clone(g), rec)
    expect(a).toEqual(b)
    expect(a.decision).toBe('ineligible')
    const reasons = codes(a)
    expect(reasons).toContain('source_text:lifecycle_withdrawn')
    expect([...reasons]).toEqual([...reasons].sort())
  })
})

// ───────────────────────────────────────────── the current source formats (adapters)

describe('withdrawn, superseded, retired and pending authority in the current source formats', () => {
  const rec = prepare()
  const answeredQ = rec.record.declarations.answers[0].q_id
  const pub = rec.record.sources.publications[0]
  const claimId = rec.record.guidance.items[0].claim_id

  const withSources = (f: (s: CreatorRecordSources) => void) => {
    const s = approvedSources()
    f(s)
    return governance({ sources: s })
  }

  test('a retired or pending question blocks issuance', () => {
    for (const status of ['retired', 'pending'] as const) {
      const g = withSources((s) => { s.registry_input.questions = s.registry_input.questions.map((q) => (q.q_id === answeredQ ? { ...q, approval: { ...q.approval, status } } : q)) })
      expect(codes(evaluate(g, rec))).toEqual([`question:lifecycle_${status}`])
    }
  })

  test('changed question content under the same version is a conflict, not a silent pass', () => {
    const g = withSources((s) => { s.registry_input.questions = s.registry_input.questions.map((q) => (q.q_id === answeredQ ? { ...q, wording_ref: `${q.wording_ref}-edited` } : q)) })
    expect(codes(evaluate(g, rec))).toEqual(['question:content_changed_under_version'])
  })

  test('a question raised to a new version is no longer the one the record used', () => {
    const g = withSources((s) => {
      s.registry_input.questions = s.registry_input.questions.map((q) => (q.q_id === answeredQ ? { ...q, version: q.version + 1 } : q))
      s.registry_input.observation_map = s.registry_input.observation_map.map((o) => (o.q_id === answeredQ ? { ...o, q_version: o.q_version + 1 } : o))
    })
    expect(codes(evaluate(g, rec))).toContain('question:version_not_current')
  })

  test('a retired observation-map entry blocks issuance', () => {
    const used = rec.record.declarations.observations.find((o) => o.map_entry)!.map_entry!
    const g = withSources((s) => { s.registry_input.observation_map = s.registry_input.observation_map.map((o) => (o.o_id === used.o_id ? { ...o, approval: { ...o.approval, status: 'retired' as const } } : o)) })
    expect(codes(evaluate(g, rec))).toContain('observation_map_entry:lifecycle_retired')
  })

  test.each([
    ['withdrawn (no longer eligible)', { creator_record_eligible: 'No' as const }, 'publication_entry:lifecycle_withdrawn'],
    ['pending', { creator_record_eligible: 'Pending' as const }, 'publication_entry:lifecycle_pending'],
    ['superseded', { superseded_by: 'SYN-NEXT' }, 'publication_entry:lifecycle_superseded'],
    ['past its refresh date', { refresh_by: '2026-11-01' }, 'publication_entry:validity_lapsed'],
  ])('a ledger entry %s blocks issuance', (_, change, code) => {
    const g = withSources((s) => { s.ledger = s.ledger.map((e) => (e.entry_id === pub.entry_id ? { ...e, ...change } : e)) })
    expect(codes(evaluate(g, rec))).toContain(code)
  })

  test('a ledger explanation changed under the same entry version is a conflict', () => {
    const g = withSources((s) => { s.ledger = s.ledger.map((e) => (e.entry_id === pub.entry_id ? { ...e, explanation: 'A different, stronger explanation.' } : e)) })
    expect(codes(evaluate(g, rec))).toEqual(['publication_entry:content_changed_under_version'])
  })

  test('two current ledger entries for one claim are a governance conflict', () => {
    const g = withSources((s) => {
      const e = s.ledger.find((x) => x.entry_id === pub.entry_id)!
      s.ledger = [...s.ledger, { ...e, entry_id: 'SYN-SECOND' }]
    })
    const r = evaluate(g, rec)
    expect([r.decision, codes(r)]).toEqual(['indeterminate', ['publication_entry:governance_conflict']])
  })

  test('a governed claim re-verified, superseded or edited since preparation blocks issuance', () => {
    const reverified = TOPIC_CLAIMS_FIXTURE.map((c) => (c.claim_id === claimId ? { ...c, last_verified: '2026-11-01' } : c))
    expect(codes(evaluate(governance({ topicClaims: reverified }), rec))).toContain('governed_claim:version_not_current')
    const superseded = TOPIC_CLAIMS_FIXTURE.map((c) => (c.claim_id === claimId ? { ...c, superseded_by: `${claimId}-v2` } : c))
    expect(codes(evaluate(governance({ topicClaims: superseded }), rec))).toContain('governed_claim:lifecycle_superseded')
    const edited = TOPIC_CLAIMS_FIXTURE.map((c) => (c.claim_id === claimId ? { ...c, statement: `${(c as { statement?: string }).statement ?? ''} (edited)` } : c))
    expect(codes(evaluate(governance({ topicClaims: edited }), rec))).toEqual(['governed_claim:content_changed_under_version'])
  })

  test.each([['withdrawn'], ['superseded'], ['pending']] as const)('a %s wording approval blocks issuance', (lifecycle) => {
    const s = approvedSources()
    expect(codes(evaluate(governance({ source_text_approvals: [approvalFor(s, { lifecycle })] }), rec))).toEqual([`source_text:lifecycle_${lifecycle}`])
  })

  test('an approval that is incomplete or pilot-marked is not treated as approved', () => {
    const s = approvedSources()
    for (const over of [{ authority: '' }, { decision_date: '30/10/2026' }, { categories: ['question_wording'] }, { authority: 'PILOT-UAT — not a governance approval' }]) {
      expect(codes(evaluate(governance({ source_text_approvals: [approvalFor(s, over)] }), rec))).toEqual(['source_text:lifecycle_pending'])
    }
  })

  test('pilot sources and the real (empty) governed sources are never authority for issuance', () => {
    expect(evaluate(governance({ sources: pilotSources() }), rec).decision).toBe('ineligible')
    expect(evaluate(governance({ sources: governedSources(), source_text_approvals: [] }), rec).decision).toBe('ineligible')
  })

  test('an unsupported builder or record schema blocks issuance; a supported one grants nothing else', () => {
    const builders = [{ id: CUSTOMER_RECORD_BUILDER.id, version: 99 }]
    expect(codes(evaluate(governance({ support: { ...DECLARATIONS_SUPPORT, builders } }), rec))).toEqual(['builder:version_not_current'])
    expect(codes(evaluate(governance({ support: { ...DECLARATIONS_SUPPORT, record_schemas: [] } }), rec))).toEqual(['record_schema:reference_missing'])
    // Supported builder and schema, but withdrawn wording: still ineligible.
    expect(codes(evaluate(governance({ source_text_approvals: [approvalFor(approvedSources(), { lifecycle: 'withdrawn' })] }), rec))).toEqual(['source_text:lifecycle_withdrawn'])
  })
})

// ───────────────────────────────────────────── integrity first

describe('a malformed or corrupted prepared record is never issuable, and governance is not read', () => {
  const rec = prepare()
  const noReads = new Proxy({} as GovernanceSnapshot, { get: () => { throw new Error('governance read') } })
  const resealed = (f: (r: CustomerRecordV2) => void) => {
    const r = clone(rec.record)
    f(r)
    const c = canonicalJson(r)
    return { canonical: c, sha256: sha256Hex(c) }
  }

  test.each([
    ['tampered text', { canonical: rec.canonical.replace('CR-V2-1C synthetic video', 'CR-V2-1C synthetic videO'), sha256: rec.sha256 }, 'digest_mismatch'],
    ['a malformed digest', { canonical: rec.canonical, sha256: 'xyz' }, 'digest_malformed'],
    ['non-canonical text', (() => { const t = JSON.stringify(rec.record, null, 1); return { canonical: t, sha256: sha256Hex(t) } })(), 'not_canonical'],
    ['an older schema version', resealed((r) => { (r as { schema_version: number }).schema_version = 2 }), 'wrong_schema'],
    ['a missing authority digest', resealed((r) => { r.sources.authority_digests.pop() }), 'provenance_malformed'],
    ['an unreferenced authority digest', resealed((r) => { r.sources.authority_digests.push({ kind: 'question', id: 'ZZ9', version: '1', content_sha256: 'a'.repeat(64) }) }), 'provenance_malformed'],
    ['a malformed authority digest', resealed((r) => { r.sources.authority_digests[0].content_sha256 = 'not-a-digest' }), 'provenance_malformed'],
    ['missing builder provenance', resealed((r) => { delete (r as Partial<CustomerRecordV2>).builder }), 'provenance_malformed'],
    ['wording approved for another schema', resealed((r) => { r.sources.source_text.record_schema = { id: CUSTOMER_RECORD_SCHEMA, version: 2 } }), 'wrong_schema'],
  ])('%s → invalid_record', (_, stored, reason) => {
    expect(evaluateIssuanceEligibility(stored.canonical, stored.sha256, noReads)).toEqual({ decision: 'invalid_record', reason })
  })
})

// ───────────────────────────────────────────── temporary unavailability

describe('temporary unavailability is distinguished from definitive ineligibility', () => {
  const rec = prepare()

  test('an unreadable source is indeterminate (retry), never eligible', () => {
    const r = evaluate(governance({ sources: UNAVAILABLE }), rec)
    expect(r).toEqual({ decision: 'indeterminate', cause: 'unavailable', components: ['questionnaire_contract', 'question', 'observation_map_entry', 'publication_entry'] })
    expect(evaluate(governance({ topicClaims: UNAVAILABLE, source_text_approvals: UNAVAILABLE }), rec)).toEqual({ decision: 'indeterminate', cause: 'unavailable', components: ['source_text', 'governed_claim'] })
  })

  test('a definitive refusal stands even when another source is unreadable', () => {
    const r = evaluate(governance({ topicClaims: UNAVAILABLE, source_text_approvals: [approvalFor(approvedSources(), { lifecycle: 'withdrawn' })] }), rec)
    expect(codes(r)).toEqual(['source_text:lifecycle_withdrawn'])
  })

  test('malformed governance state is indeterminate for an operator, not a retry', () => {
    const g = governanceSnapshotFrom(governance())
    expect(evaluate({ ...g, issuance_date: '02/11/2026' }, rec)).toEqual(expect.objectContaining({ decision: 'indeterminate', cause: 'malformed_state' }))
    expect(evaluate({ ...g, authorities: { ...g.authorities, builder: { status: 'malformed' } } }, rec)).toEqual({ decision: 'indeterminate', cause: 'malformed_state', components: ['builder'] })
    const bad = clone(g)
    ;(bad.authorities.question as unknown as { entries: unknown[] }).entries[0] = { kind: 'question', id: 'P1' }
    expect(evaluate(bad, rec)).toEqual({ decision: 'indeterminate', cause: 'malformed_state', components: ['question'] })
    const { question: _omitted, ...rest } = g.authorities
    expect(evaluate({ ...g, authorities: rest }, rec)).toEqual({ decision: 'indeterminate', cause: 'malformed_state', components: ['question'] })
    const unloadable = approvedSources()
    unloadable.registry_input = { ...unloadable.registry_input, questions: [...unloadable.registry_input.questions, unloadable.registry_input.questions[0]] }
    expect(evaluate(governance({ sources: unloadable }), rec)).toEqual({ decision: 'indeterminate', cause: 'malformed_state', components: ['question', 'observation_map_entry'] })
  })
})

// ───────────────────────────────────────────── history, substitution and strengthening

describe('historical verification, no substitution, no strengthening', () => {
  test('after withdrawal the record is ineligible for issuance but still verifies', () => {
    const rec = prepare()
    expect(codes(evaluate(governance({ source_text_approvals: [approvalFor(approvedSources(), { lifecycle: 'withdrawn' })] }), rec))).toEqual(['source_text:lifecycle_withdrawn'])
    expect(verifyCustomerRecord(rec.canonical, rec.sha256)).toEqual({ ok: true, record: rec.record })
  })

  test('newer approved wording never substitutes for the withdrawn wording the record used', () => {
    const rec = prepare()
    const s = approvedSources()
    const edited = clone(s) as any
    edited.presentation.P1 = { ...edited.presentation.P1, text: 'New approved wording' }
    const v2 = approvalFor(edited, { version: 2 })
    const r = evaluate(governance({ source_text_approvals: [approvalFor(s, { lifecycle: 'superseded' }), v2] }), rec)
    expect(codes(r)).toEqual(['source_text:lifecycle_superseded'])
    expect(rec.canonical).not.toContain('New approved wording')
  })

  test('newly published guidance is not added and the record is never changed', () => {
    const rec = prepare()
    const before = rec.canonical
    const s = approvedSources()
    const extra = { ...s.ledger[0], entry_id: 'SYN-NEW-ENTRY', claim_id: 'CLAIM-NOT-IN-RECORD-001-v1' }
    const snapshot = Object.freeze(governanceSnapshotFrom(governance({ sources: { ...s, ledger: [...s.ledger, extra] } })))
    const r = evaluateIssuanceEligibility(rec.canonical, rec.sha256, snapshot)
    expect(r.decision).toBe('eligible')
    if (r.decision === 'eligible') expect(r.checked).toEqual(issuanceReferences(rec.record))
    expect(rec.canonical).toBe(before)
  })

  test('no decision carries or strengthens a commercial conclusion; the core never reads one', () => {
    const rec = prepare()
    for (const g of [governance(), governance({ sources: UNAVAILABLE }), governance({ source_text_approvals: [] })]) {
      const text = JSON.stringify(evaluate(g, rec))
      expect(text).not.toMatch(/conclusion|explanation|relevant_on_declared_facts|relevant_applicability_unresolved|cleared|certif|compliant/i)
    }
    const src = readFileSync(path.resolve(__dirname, '../../lib/creator-record/customer-record/eligibility.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(src).not.toMatch(/\.conclusion|\.explanation|guidance\.items\[\d\]\.(applicability|caveats)/)
  })

  test('the evaluation core has no branch for any particular kind', () => {
    const src = readFileSync(path.resolve(__dirname, '../../lib/creator-record/customer-record/eligibility.ts'), 'utf8')
    const core = src.slice(src.indexOf('export function evaluateIssuanceEligibility'))
    for (const kind of AUTHORITY_KINDS) expect([kind, core.includes(`'${kind}'`)]).toEqual([kind, false])
  })
})
