/**
 * CR-DOC-READER-EXT-1 (A) — question-scoped Creator Record publication.
 *
 * Music claims may be published only when selected through M1 (music provider), stock claims only through M3 (stock provider).
 * Proven with the real record builder, integration and composition, and the DRAFT candidate entries made eligible under a
 * SYNTHETIC test approval (fixture only; the candidates themselves stay Pending and inactive):
 *   - a stock provider named for music (M1) never selects a stock claim; a music provider named for stock (M3) never selects a
 *     music claim; both answered → the claim is published from its own question only, citing only that declaration;
 *   - enforcement at all three points: integration (refused before Bounded Interpretation), composition and the record builder;
 *   - Runway / Higgsfield guidance and entries without `selection_questions` are unchanged;
 *   - malformed restrictions fail closed.
 */
import * as ledgerModule from '@/lib/creator-record/contract/publication-ledger'
import { authorizePublication, narrowSelectionBasis, selectionContextFor, type PublicationLedgerEntry } from '@/lib/creator-record/contract/publication-ledger'
import * as composeModule from '@/lib/creator-record/contract/compose'
import { composeGuidance, type CompositionInput } from '@/lib/creator-record/contract/compose'
import { approvedCustomerRecordInputs } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import type { SourceTextInput } from '@/lib/creator-record/customer-record/sources'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { CANDIDATE_CLAIM_IDS, CANDIDATE_DEPENDENCY_LABELS, CANDIDATE_LEDGER_ENTRIES, CR_DOC_READER_EXT_1_STATUS } from '@/lib/creator-record/governed/candidates/cr-doc-reader-ext-1'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_PUBLICATION_LEDGER } from '@/lib/creator-record/governed/sources'
import type { CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'

const AS_OF = '2026-11-18'
const ARTLIST = 'CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1'
const EPIDEMIC = 'CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1'
const STOCK = 'CLAIM-STOCK-EDITORIAL-001-v2'
const POND5 = 'CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1'
const RUNWAY = 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1'

/** The DRAFT candidates under a SYNTHETIC approval (test fixture only). */
const synthetic = (e: PublicationLedgerEntry): PublicationLedgerEntry => ({ ...e, creator_record_eligible: 'Yes', approver: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: AS_OF, refresh_by: '2027-02-18' })
const BASE = approvedCustomerRecordInputs(GOV).sources
function sourcesWith(entries: readonly PublicationLedgerEntry[]): CreatorRecordSources {
  return withQuestionnaireApproval({ ...BASE, ledger: [...BASE.ledger, ...entries], dependency_labels: { ...BASE.dependency_labels, ...CANDIDATE_DEPENDENCY_LABELS } })
}
const ACKS = (s: CreatorRecordSources): Record<string, string> => Object.fromEntries(s.acknowledgement_ids.map((id) => [id, `Synthetic acknowledgement ${id} (test fixture only).`]))
function textFor(s: CreatorRecordSources): SourceTextInput {
  const loaded = loadQuestionRegistry(s.registry_input)
  if (!loaded.ok) throw new Error('registry')
  const approval: SourceTextApproval = {
    source_id: SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(s, loaded.registry, ACKS(s))),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: AS_OF, review_ref: 'SYNTHETIC-DOC-READER-EXT-1',
  }
  return { approval, acknowledgements: ACKS(s) }
}
const SOURCES = sourcesWith(CANDIDATE_LEDGER_ENTRIES.map(synthetic))

const BASE_ANS = { P1: ['Selection isolation test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], H1: ['edited'] }
const state = (materials: Record<string, string[]>) => ({ answers: { ...BASE_ANS, ...materials }, tools: [{ T1: ['runway-gen3'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } })
const MUSIC = (provider: string) => ({ M0: ['music'], M1: [provider], M2: ['yes'] })
const STOCKS = (provider: string) => ({ M0: ['stock'], M3: [provider], M3D: ['yes'] })
const BOTH = (music: string, stock: string) => ({ M0: ['music', 'stock'], M1: [music], M2: ['yes'], M3: [stock], M3D: ['yes'] })

function build(materials: Record<string, string[]>, sources: CreatorRecordSources = SOURCES) {
  const r = buildCustomerRecord({ state: state(materials), sources, source_text: textFor(sources), topicClaims: CLAIMS, as_of: AS_OF, record: { record_id: 'PREP-doc-reader-ext-1', record_version: 1, captured_at: `${AS_OF}T00:00:00.000Z` } })
  if (!r.ok) throw new Error(JSON.stringify(r).slice(0, 600))
  return r.record
}
const claimsOf = (rec: ReturnType<typeof build>) => rec.guidance.items.map((i) => i.claim_id).sort()
const item = (rec: ReturnType<typeof build>, id: string) => rec.guidance.items.find((i) => i.claim_id === id)
const citedQuestions = (rec: ReturnType<typeof build>, id: string) =>
  item(rec, id)!.selection_basis.scopes.flatMap((s) => s.observation_ids).map((o) => (/:(M[13]):/.exec(o) ?? [])[1] ?? o).sort()

describe('candidates stay inactive', () => {
  test('DRAFT status; every candidate Pending with no approver, so the real contract refuses it', () => {
    expect(CR_DOC_READER_EXT_1_STATUS).toMatch(/NOT APPROVED, NOT ACTIVE/)
    expect(CANDIDATE_LEDGER_ENTRIES.map((e) => e.claim_id)).toEqual([...CANDIDATE_CLAIM_IDS])
    for (const e of CANDIDATE_LEDGER_ENTRIES) {
      expect(e.creator_record_eligible).toBe('Pending')
      expect(e.approver).toBeNull()
      const claim = CLAIMS.find((c) => c.claim_id === e.claim_id)!
      expect(claim.superseded_by).toBeNull()
      expect(e.claim_last_verified).toBe(claim.last_verified)
      expect(authorizePublication(CANDIDATE_LEDGER_ENTRIES, claim, AS_OF, { question_ids: ['M1', 'M3'] })).toEqual({ authorized: false, reason: 'not_eligible' })
    }
  })
  test('the live ledger carries no candidate and no question-scoped entry', () => {
    const ids = CREATOR_RECORD_PUBLICATION_LEDGER.map((e) => e.claim_id)
    for (const c of CANDIDATE_CLAIM_IDS) expect(ids).not.toContain(c)
    expect(CREATOR_RECORD_PUBLICATION_LEDGER.every((e) => e.selection_questions === undefined)).toBe(true)
  })
  test('evidence notes never say a dependency is satisfied or that a document is sufficient', () => {
    for (const e of CANDIDATE_LEDGER_ENTRIES) for (const n of Object.values(e.evidence_notes)) {
      expect(n).toMatch(/SI8 did not check it/)
      expect(n).toMatch(/It does not confirm/)
      expect(n).not.toMatch(/\b(satisfied|sufficient|verified|confirms that|proves|cleared|clearance)\b/i)
    }
  })
})

describe('authorizePublication: question-scoped entries', () => {
  const claim = CLAIMS.find((c) => c.claim_id === STOCK)!
  const ledger = [synthetic(CANDIDATE_LEDGER_ENTRIES.find((e) => e.claim_id === STOCK)!)]
  test('refused without a selection context, or when no cited question is allowed', () => {
    expect(authorizePublication(ledger, claim, AS_OF)).toEqual({ authorized: false, reason: 'selection_question_not_authorized' })
    expect(authorizePublication(ledger, claim, AS_OF, { question_ids: ['M1'] })).toEqual({ authorized: false, reason: 'selection_question_not_authorized' })
    expect(authorizePublication(ledger, claim, AS_OF, { question_ids: [] })).toEqual({ authorized: false, reason: 'selection_question_not_authorized' })
  })
  test('authorized when a cited declaration answers an allowed question', () => {
    expect(authorizePublication(ledger, claim, AS_OF, { question_ids: ['M3'] }).authorized).toBe(true)
    expect(authorizePublication(ledger, claim, AS_OF, { question_ids: ['M1', 'M3'] }).authorized).toBe(true)
  })
  test('a malformed restriction fails closed', () => {
    for (const bad of [[], [''], [3]] as unknown as string[][]) {
      expect(authorizePublication([{ ...ledger[0], selection_questions: bad }], claim, AS_OF, { question_ids: ['M3'] })).toEqual({ authorized: false, reason: 'selection_question_not_authorized' })
    }
  })
  test('earlier refusals keep their reasons (the question check runs last)', () => {
    expect(authorizePublication([{ ...ledger[0], creator_record_eligible: 'Pending' }], claim, AS_OF)).toEqual({ authorized: false, reason: 'not_eligible' })
    expect(authorizePublication([{ ...ledger[0], refresh_by: '2026-01-01' }], claim, AS_OF)).toEqual({ authorized: false, reason: 'refresh_lapsed' })
  })
  test('entries without selection_questions are unchanged (Runway)', () => {
    const runway = CLAIMS.find((c) => c.claim_id === RUNWAY)!
    const a = authorizePublication(CREATOR_RECORD_PUBLICATION_LEDGER, runway, '2026-11-11')
    expect(a.authorized).toBe(true)
    expect(authorizePublication(CREATOR_RECORD_PUBLICATION_LEDGER, runway, '2026-11-11', { question_ids: [] })).toEqual(a)
  })
  test('selectionContextFor and narrowSelectionBasis: unresolvable observations contribute nothing; identity without a restriction', () => {
    const basis = { scopes: [{ scope: 'asset_provider' as const, matched_ids: ['getty'], observation_ids: ['o-m1', 'o-m3', 'o-unknown'] }] }
    const q = (o: string) => ({ 'o-m1': 'M1', 'o-m3': 'M3' } as Record<string, string>)[o]
    expect(selectionContextFor(basis, q)).toEqual({ question_ids: ['M1', 'M3'] })
    expect(narrowSelectionBasis(ledger[0], basis, q, () => 'getty')).toEqual({ scopes: [{ scope: 'asset_provider', matched_ids: ['getty'], observation_ids: ['o-m3'] }] })
    expect(narrowSelectionBasis(ledger[0], { scopes: [{ ...basis.scopes[0], observation_ids: ['o-m1'] }] }, q, () => 'getty')).toBeNull()
    const runwayEntry = CREATOR_RECORD_PUBLICATION_LEDGER.find((e) => e.claim_id === RUNWAY)!
    expect(narrowSelectionBasis(runwayEntry, basis, q, () => 'getty')).toBe(basis)
  })
})

describe('music versus stock selection isolation (real record builder, synthetic approval)', () => {
  test('stock provider named for music (M1): no stock claim; music provider named for stock (M3): no music claim', () => {
    for (const p of ['getty', 'istock', 'shutterstock', 'adobe-stock', 'pond5']) {
      const ids = claimsOf(build(MUSIC(p)))
      expect(ids).not.toContain(STOCK)
      expect(ids).not.toContain(POND5)
    }
    for (const p of ['artlist', 'epidemic-sound']) {
      const ids = claimsOf(build(STOCKS(p)))
      expect(ids).not.toContain(ARTLIST)
      expect(ids).not.toContain(EPIDEMIC)
    }
  })
  test('each claim is published from its own question, conclusion capped by its open dependencies', () => {
    for (const [ans, id] of [[MUSIC('artlist'), ARTLIST], [MUSIC('epidemic-sound'), EPIDEMIC], [STOCKS('getty'), STOCK], [STOCKS('pond5'), POND5]] as const) {
      const rec = build(ans)
      expect(claimsOf(rec)).toContain(id)
      expect(item(rec, id)!.conclusion).toBe('relevant_applicability_unresolved')
    }
  })
  test('both M1 and M3 answered with the same provider: published once, citing only the allowed question', () => {
    const rec = build(BOTH('getty', 'getty'))
    expect(claimsOf(rec).filter((c) => c === STOCK)).toHaveLength(1)
    expect(citedQuestions(rec, STOCK)).toEqual(['M3'])
    const rec2 = build(BOTH('artlist', 'artlist'))
    expect(citedQuestions(rec2, ARTLIST)).toEqual(['M1'])
  })
  test('both answered with different providers: each claim from its own question only', () => {
    const rec = build(BOTH('artlist', 'getty'))
    expect(claimsOf(rec)).toEqual(expect.arrayContaining([ARTLIST, STOCK]))
    expect(citedQuestions(rec, ARTLIST)).toEqual(['M1'])
    expect(citedQuestions(rec, STOCK)).toEqual(['M3'])
  })
  test('Runway guidance is identical with and without the candidate entries', () => {
    const withCandidates = build(MUSIC('artlist'))
    const without = build(MUSIC('artlist'), sourcesWith([]))
    expect(item(withCandidates, RUNWAY)).toEqual(item(without, RUNWAY))
    expect(claimsOf(without)).not.toContain(ARTLIST)
  })
})

describe('enforcement at all three points', () => {
  afterEach(() => jest.restoreAllMocks())

  test('integration: refused before Bounded Interpretation, with the reason recorded', () => {
    const spy = jest.spyOn(composeModule, 'composeGuidance')
    build(MUSIC('getty'))
    const input = spy.mock.calls[0][0] as CompositionInput
    const fedIds = input.evaluations.flatMap((e) => e.fed_claims.map((s) => s.claim.claim_id))
    expect(fedIds).not.toContain(STOCK)
  })

  test('composition: a selection basis citing only a disallowed question is omitted', () => {
    const spy = jest.spyOn(composeModule, 'composeGuidance')
    build(STOCKS('getty'))
    const input = spy.mock.calls[0][0] as CompositionInput
    spy.mockRestore()
    const m3 = input.observations.find((o) => o.question.q_id === 'M3' && o.target.kind === 'asset_provider_identity')!
    // Re-label the stock declaration as if it answered M1, keeping everything else exactly as the real run produced it.
    const tampered: CompositionInput = { ...input, observations: input.observations.map((o) => (o.observation_id === m3.observation_id ? { ...o, question: { ...o.question, q_id: 'M1' } } : o)) }
    const omitted = composeGuidance(tampered).omissions.filter((x) => x.claim_id === STOCK).map((x) => x.reason)
    expect(omitted).toContain('selection_question_not_authorized')
    expect(composeGuidance(input).items.map((i) => i.claim_id)).toContain(STOCK)
  })

  test('record builder: refuses a question-scoped item whose basis still cites a disallowed question', () => {
    jest.spyOn(ledgerModule, 'narrowSelectionBasis').mockImplementation((_e, b) => b)
    expect(() => build(BOTH('getty', 'getty'))).toThrow(/outside its selection questions/)
  })
})
