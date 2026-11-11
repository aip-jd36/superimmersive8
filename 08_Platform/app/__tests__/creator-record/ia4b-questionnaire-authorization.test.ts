/**
 * CRV2-IA-4B — questionnaire and composition preparation, inactive.
 *
 *   - authorizations reach the guidance run only through `approvedCustomerRecordInputs` from a bundle that validates, and are
 *     bound into the questionnaire contract digest, so a caller cannot add, change or forge them;
 *   - the live governance contract, Source Text and digests are unchanged;
 *   - the copyright candidate package is unapproved, unreferenced at runtime, and cannot load;
 *   - no customer path exposes J1 or copyright guidance.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { objectiveFactAuthorizationErrors, type ObjectiveFactAuthorization } from '@/lib/creator-record/contract/objective-fact-authorization'
import { authorizePublication } from '@/lib/creator-record/contract/publication-ledger'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { isApproved } from '@/lib/creator-record/contract/types'
import { approvedCustomerRecordInputs, currentPublicationAuthority } from '@/lib/creator-record/customer-flow/approved-inputs'
import { checkQuestionnaireContract, questionnaireContract } from '@/lib/creator-record/customer-record/questionnaire-contract'
import { buildCustomerRecord } from '@/lib/creator-record/customer-record/record'
import { checkApprovedSources } from '@/lib/creator-record/customer-record/sources'
import * as candidate from '@/lib/creator-record/governed/copyright-guidance-candidate'
import type { PublicationAuthorityBundle } from '@/lib/creator-record/governed/publication-authority'
import {
  CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV,
  CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256,
  CREATOR_RECORD_SOURCE_TEXT_SHA256,
} from '@/lib/creator-record/governed/sources'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as SYN } from '@/lib/creator-record/governed/synthetic-test-authority'
import { CREATOR_RECORD_OBJECTIVE_CATALOG_IDS } from '@/lib/creator-record/integration/objectives'
import { runDeclaredGuidance } from '@/lib/creator-record/prototype/declared-guidance'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const AS_OF = '2026-11-11'
const RECORD = { record_id: 'IA4B-TEST', record_version: 1, captured_at: `${AS_OF}T00:00:00.000Z` }
const ANS = { P1: ['IA-4B test video'], P3: ['own_channels'], F1: ['TW'], F2: ['US'], F3: ['US'], L1: ['no'], M0: ['none'], H1: ['edited', 'wrote_script'] }
const tool = (t1: string, t3 = 'Standard') => ({ T1: [t1], T3: [t3], T4: ['October 2026'] })
const state = (...tools: Record<string, string[]>[]) => ({ answers: { ...ANS }, tools, acknowledgements: { A1: true, A2: true } })
const COPYRIGHT_CLAIMS = ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPY-004-v1', 'CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1', 'CLAIM-COPYRIGHT-CN-AI-ASSISTED-OUTPUT-001-v1']
const APPROVED = { status: 'approved' as const, approver: 'TEST-APPROVER', decision_date: AS_OF, review_ref: 'TEST-REVIEW' }
const OFA = (over: Partial<ObjectiveFactAuthorization> = {}): ObjectiveFactAuthorization => ({
  authorization_id: 'TEST-OFA', version: 1, objective_id: 'creator-record:copyrightability:v1', fact: 'jurisdiction',
  source: { q_id: 'J1', q_version: 1 }, semantic_review_ref: 'TEST', approval: APPROVED, ...over,
})
const NO_AUTHORITY = approvedCustomerRecordInputs(null)

describe('authorizations come only from a validated bundle', () => {
  test('the Production bundle is selected, and its sources carry no authorizations (key absent)', () => {
    expect(currentPublicationAuthority({})).toBe(GOV)
    const sources = approvedCustomerRecordInputs(GOV).sources
    expect('objective_fact_authorizations' in sources).toBe(false)
  })

  test.each([
    ['malformed', [{ ...OFA(), scope: 'all' }]],
    ['unapproved', [OFA({ approval: { ...APPROVED, status: 'pending' } })]],
    ['naming a question the bundle does not have', [OFA()]],
  ])('a bundle with a %s authorization yields no authority at all, however it was obtained', (_name, auths) => {
    const bundle = { ...GOV, objective_fact_authorizations: auths } as unknown as PublicationAuthorityBundle
    expect(approvedCustomerRecordInputs(bundle)).toEqual(NO_AUTHORITY)
  })

  test('caller-supplied authorizations added to approved sources break the approved contract digest (refused at checkout and issuance)', () => {
    const inputs = approvedCustomerRecordInputs(GOV)
    const wording = 'f'.repeat(64)
    const before = questionnaireContract(inputs.sources, wording)
    const forged = { ...inputs.sources, objective_fact_authorizations: [OFA()] }
    const after = questionnaireContract(forged, wording)
    expect(before.ok && after.ok && before.sha256 !== after.sha256).toBe(true)
    const real = checkApprovedSources(inputs.sources, inputs.source_text, TOPIC_CLAIMS_FIXTURE as never, AS_OF, { id: 'si8/creator-record-v2-record', version: 7 })
    expect(real.ok).toBe(true)
    const refused = checkApprovedSources(forged, inputs.source_text, TOPIC_CLAIMS_FIXTURE as never, AS_OF, { id: 'si8/creator-record-v2-record', version: 7 })
    expect(refused.ok).toBe(false)
    expect(checkQuestionnaireContract(forged, wording).map((r) => r.code)).toContain('questionnaire_contract_digest_mismatch')
  })

  test('the guidance run refuses caller-supplied authorizations that do not validate against the same sources', () => {
    const sources = { ...approvedCustomerRecordInputs(GOV).sources, objective_fact_authorizations: [OFA()] }
    expect(() => runDeclaredGuidance({ state: state(tool('runway-gen3')) as never, sources, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: RECORD })).toThrow(/objective-fact authorizations rejected/)
  })

  test('every authorization field is part of the contract once authorizations are present', () => {
    const base = { ...approvedCustomerRecordInputs(GOV).sources, objective_fact_authorizations: [OFA()] }
    const d = (s: typeof base) => {
      const r = questionnaireContract(s, 'f'.repeat(64))
      if (!r.ok) throw new Error(JSON.stringify(r))
      return r.sha256
    }
    const variants: Partial<ObjectiveFactAuthorization>[] = [
      { authorization_id: 'OTHER' }, { version: 2 }, { objective_id: 'creator-record:copyright_ownership:v1' },
      { source: { q_id: 'J2', q_version: 1 } }, { source: { q_id: 'J1', q_version: 2 } }, { semantic_review_ref: 'OTHER' },
      { approval: { ...APPROVED, review_ref: 'OTHER' } },
    ]
    for (const v of variants) expect(d({ ...base, objective_fact_authorizations: [OFA(v)] })).not.toBe(d(base))
  })
})

describe('approved contracts and digests are unchanged', () => {
  test('the governance questionnaire contract and Source Text match their approved digests, for record schemas 7 and 8', () => {
    const inputs = approvedCustomerRecordInputs(GOV)
    for (const [version, sourceText] of [[7, inputs.source_text], [8, inputs.source_text_examination]] as const) {
      const r = checkApprovedSources(inputs.sources, sourceText ?? null, TOPIC_CLAIMS_FIXTURE as never, AS_OF, { id: 'si8/creator-record-v2-record', version })
      expect(r.ok).toBe(true)
      const s = JSON.stringify(r)
      expect(s).toContain(CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256)
    }
    expect(CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256).toBe('b398b0136f806278311d12a00a1faed54f8a1cef455910f67359ac48130abc95')
    expect(CREATOR_RECORD_SOURCE_TEXT_SHA256).toBe('7798a482cbb31772bce7819e503e5b065ac657a8ae2537faf69e494b6efdfbd9')
    expect(JSON.stringify(checkApprovedSources(inputs.sources, inputs.source_text, TOPIC_CLAIMS_FIXTURE as never, AS_OF, { id: 'si8/creator-record-v2-record', version: 7 }))).toContain(CREATOR_RECORD_SOURCE_TEXT_SHA256)
  })

  test('the synthetic test bundle still validates and carries no authorizations or J1', () => {
    expect(SYN!.objective_fact_authorizations).toBeUndefined()
    expect(SYN!.registry_input.questions.map((q) => q.q_id)).not.toContain('J1')
  })
})

describe('no customer path exposes J1 or copyright guidance', () => {
  test('the Production questionnaire has no J1 and no guidance-place mapping', () => {
    expect(GOV.registry_input.questions.map((q) => q.q_id)).not.toContain('J1')
    expect(Object.keys(GOV.presentation)).not.toContain('J1')
    expect(GOV.registry_input.observation_map.filter((o) => (o.target as { kind: string }).kind === 'guidance_place')).toEqual([])
  })

  test.each([['Runway', 'runway-gen3'], ['Higgsfield', 'higgsfield']])('a %s record through the customer builder carries no copyright guidance and only the active objectives', (_name, id) => {
    const inputs = approvedCustomerRecordInputs(GOV)
    const r = buildCustomerRecord({ state: state(tool(id)), sources: inputs.sources, source_text: inputs.source_text, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: RECORD })
    if (!r.ok) throw new Error(JSON.stringify(r))
    const items = r.record.guidance.items.map((i) => i.claim_id)
    expect(items.filter((c) => COPYRIGHT_CLAIMS.includes(c))).toEqual([])
    const g = runDeclaredGuidance({ state: state(tool(id)) as never, sources: inputs.sources, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: RECORD })
    if (!g.ok) throw new Error('form')
    expect(g.guidance.objectives.map((o) => o.objective_id)).toEqual(['creator-record:commercial_use:v1', 'creator-record:third_party_source_rights:v1'])
    for (const t of g.guidance.objectives) expect(t.jurisdiction_basis).toEqual([])
    expect(g.guidance.facts.declaredGuidancePlaces).toEqual([])
    // F2/F3 = United States never become a place.
    expect(g.guidance.facts.applicabilityFacts.jurisdiction).toEqual({ included: [], excluded: [] })
  })
})

describe('the copyright candidate package is unapproved, unreferenced and cannot load', () => {
  test('every approval in it is pending, and isApproved refuses each', () => {
    const approvals = [candidate.CANDIDATE_J1_QUESTION.approval, ...candidate.CANDIDATE_J1_OBSERVATION_MAP.map((o) => o.approval), ...candidate.CANDIDATE_OBJECTIVE_FACT_AUTHORIZATIONS.map((a) => a.approval)]
    expect(approvals.length).toBe(5)
    for (const a of approvals) {
      expect(a.status).toBe('pending')
      expect(isApproved(a)).toBe(false)
    }
  })

  test('every candidate ledger entry is refused by publication authorization', () => {
    expect(candidate.CANDIDATE_LEDGER_ENTRIES.map((e) => e.claim_id).sort()).toEqual(COPYRIGHT_CLAIMS.filter((c) => !c.includes('-CN-')).sort())
    for (const e of candidate.CANDIDATE_LEDGER_ENTRIES) {
      const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === e.claim_id)!
      expect(e.claim_last_verified).toBe(claim.last_verified)
      expect(authorizePublication([e], claim, AS_OF)).toEqual({ authorized: false, reason: 'not_eligible' })
    }
    expect(candidate.CANDIDATE_LEDGER_ENTRIES.find((e) => e.claim_id === 'CLAIM-COPY-004-v1')!.applicability_policy).toBe('met_only')
    for (const e of candidate.CANDIDATE_LEDGER_ENTRIES.filter((x) => x.claim_id !== 'CLAIM-COPY-004-v1')) expect(e.applicability_policy).toBe('requirements_met')
  })

  test('candidate authorizations fail validation even against a registry that contains the candidate J1', () => {
    const registry_input = { questions: [candidate.CANDIDATE_J1_QUESTION], observation_map: [...candidate.CANDIDATE_J1_OBSERVATION_MAP] }
    const errors = objectiveFactAuthorizationErrors(candidate.CANDIDATE_OBJECTIVE_FACT_AUTHORIZATIONS, { objective_ids: CREATOR_RECORD_OBJECTIVE_CATALOG_IDS, registry_input })
    expect(errors.some((e) => e.includes('not approved'))).toBe(true)
    expect(errors.some((e) => e.includes('no approved guidance-place observation'))).toBe(true)
  })

  test('the question registry refuses the candidate J1 mapping today', () => {
    const r = loadQuestionRegistry({ questions: [{ ...candidate.CANDIDATE_J1_QUESTION, approval: APPROVED }], observation_map: candidate.CANDIDATE_J1_OBSERVATION_MAP.map((o) => ({ ...o, approval: APPROVED })) })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.every((e) => e.includes("target kind 'guidance_place' is not mappable"))).toBe(true)
  })

  test('J1 options, exclusivity and wording are exactly the IA-3C proposal', () => {
    expect(candidate.CANDIDATE_J1_QUESTION.options).toEqual(['us', 'tw', 'none', 'not_sure'])
    expect(candidate.CANDIDATE_J1_PRESENTATION).toMatchObject({ input: 'multi', exclusive_options: ['none'], text: 'Which places would you like general copyright guidance about?' })
    expect(candidate.CANDIDATE_J1_OBSERVATION_MAP.map((o) => [(o.applies_to as { value: string }).value, (o.target as { place: string }).place])).toEqual([['us', 'United States'], ['tw', 'Taiwan']])
  })

  test('no non-test module imports the candidate package', () => {
    const APP = path.join(__dirname, '..', '..')
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = path.join(d, f)
        if (['node_modules', '.next', '__tests__'].includes(f)) return []
        return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
      })
    const importers = [...walk(path.join(APP, 'lib')), ...walk(path.join(APP, 'app'))].filter((f) => /copyright-guidance-candidate/.test(readFileSync(f, 'utf8')) && !f.endsWith('copyright-guidance-candidate.ts'))
    expect(importers).toEqual([])
  })
})
