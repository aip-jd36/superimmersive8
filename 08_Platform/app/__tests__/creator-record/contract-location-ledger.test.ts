/**
 * CR-IMPL-1 / CR-IMPL-1b — location facts (provenance only; no selection,
 * no region inference, never applicability) and separate Creator Record
 * publication authorization (default ineligible). Synthetic only.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { declaredApplicabilityInputs, locationObservations, normalizeLocationCode } from '@/lib/creator-record/contract/location'
import type { DeclaredObservation, RecordContext } from '@/lib/creator-record/contract/provenance'
import { authorizePublication, isJurisdictionScoped, PUBLICATION_REFUSAL_REASONS } from '@/lib/creator-record/contract/publication-ledger'
import { loadQuestionRegistry, mapAnswer } from '@/lib/creator-record/contract/question-registry'
import { SYN_VOCABULARY, synClaim, synLedgerEntry, synRegistryInput } from '@/lib/creator-record/contract/testing/synthetic-fixtures'

const CONTRACT = path.join(__dirname, '..', '..', 'lib', 'creator-record', 'contract')
const codeOnly = (file: string) => readFileSync(path.join(CONTRACT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const CTX: RecordContext = { record_id: 'SYN-REC-2', record_version: 1, captured_at: '2026-10-25T00:00:00Z' }
const reg = (() => {
  const r = loadQuestionRegistry(synRegistryInput())
  if (!r.ok) throw new Error(r.errors.join('; '))
  return r.registry
})()
const declare = (q_id: string, values: string[], verbatim = values.join(', ')): DeclaredObservation[] => {
  const r = mapAnswer(reg, {}, CTX, { q_id, q_version: 1, values, verbatim })
  if (!r.ok) throw new Error(r.reason)
  return r.observations
}

describe('location facts are literal declarations with provenance', () => {
  test.each([
    ['AA', { kind: 'country', code: 'AA' }],
    ['BB-01', { kind: 'subdivision', code: 'BB-01' }],
    ['SYN-GROUP', { kind: 'declared_region', code: 'SYN-GROUP' }],
    ['online_worldwide', { kind: 'online_worldwide' }],
    ['not_sure', { kind: 'not_sure' }],
    ['other', { kind: 'other', text: 'other' }],
    ['lowercase-junk', { kind: 'other', text: 'lowercase-junk' }],
  ])('%s', (code, expected) => {
    expect(normalizeLocationCode(code, code, SYN_VOCABULARY)).toEqual(expected)
  })

  test('location observations keep role, originating observation id and vocabulary version', () => {
    const obs = [...declare('SYN-BASED', ['BB-01']), ...declare('SYN-SHOWN', ['AA', 'online_worldwide'])]
    expect(locationObservations(obs, SYN_VOCABULARY)).toEqual([
      { observation_id: 'SYN-REC-2:v1:SYN-BASED:0', role: 'creator_base', value: { kind: 'subdivision', code: 'BB-01' }, vocabulary_version: 'SYN-LOC-1' },
      { observation_id: 'SYN-REC-2:v1:SYN-SHOWN:0', role: 'distribution_market', value: { kind: 'country', code: 'AA' }, vocabulary_version: 'SYN-LOC-1' },
      { observation_id: 'SYN-REC-2:v1:SYN-SHOWN:1', role: 'distribution_market', value: { kind: 'online_worldwide' }, vocabulary_version: 'SYN-LOC-1' },
    ])
  })

  test('the vocabulary holds no membership: a region is never expanded into countries, nor a country into a region', () => {
    expect(Object.keys(SYN_VOCABULARY).sort()).toEqual(['region_codes', 'version'])
    const [region] = locationObservations(declare('SYN-SHOWN', ['SYN-GROUP']), SYN_VOCABULARY)
    expect(region.value).toEqual({ kind: 'declared_region', code: 'SYN-GROUP' })
    const [country] = locationObservations(declare('SYN-SHOWN', ['AA']), SYN_VOCABULARY)
    expect(country.value).toEqual({ kind: 'country', code: 'AA' })
  })

  test('the location-selection authority is gone: no trigger, relevance or membership code in the contract', () => {
    const mod = require('@/lib/creator-record/contract/location') as Record<string, unknown>
    expect(Object.keys(mod).filter((k) => /trigger|relevance|select|member|group|jurisdiction/i.test(k))).toEqual([])
    for (const f of ['location.ts', 'publication-ledger.ts', 'compose.ts']) expect(codeOnly(f)).not.toMatch(/selection_triggers|geographic_relevance_scope|triggerMatches|selectRelevance/)
  })
})

describe('location never becomes applicability', () => {
  test('declared applicability inputs contain the plan declaration and no location', () => {
    const obs = [...declare('SYN-BASED', ['US-CA']), ...declare('SYN-SHOWN', ['US']), ...declare('SYN-TOOL-PLAN', ['syn_paid'])]
    expect(declaredApplicabilityInputs(obs)).toEqual([{ fact: 'tool_plan_tier', tool: 'syn-tool', instance: null, value: 'syn_paid', observation_id: 'SYN-REC-2:v1:SYN-TOOL-PLAN:0' }])
  })

  test('a jurisdiction target smuggled in through untyped data throws', () => {
    const [plan] = declare('SYN-TOOL-PLAN', ['syn_paid'])
    const bad = { ...plan, target: { kind: 'applicability_fact', fact: 'jurisdiction' } } as unknown as DeclaredObservation
    expect(() => declaredApplicabilityInputs([bad])).toThrow(/cannot come from a declaration/)
  })
})

describe('publication authorization defaults to ineligible', () => {
  const claim = synClaim({ claim_id: 'CLAIM-SYN-A-v1' })
  const ok = synLedgerEntry({ claim_id: 'CLAIM-SYN-A-v1' })
  const AS_OF = '2026-10-25'

  test('an approved, current entry authorizes', () => {
    expect(authorizePublication([ok], claim, AS_OF)).toEqual({ authorized: true, entry: ok })
  })

  test.each([
    ['no entry', [], claim, 'no_ledger_entry'],
    ['an entry for another claim version', [{ ...ok, claim_id: 'CLAIM-SYN-A-v2' }], claim, 'no_ledger_entry'],
    ['two current entries', [ok, { ...ok, entry_id: 'X' }], claim, 'multiple_current_entries'],
    ['only a superseded entry', [{ ...ok, superseded_by: 'SYN-LEDGER-NEXT' }], claim, 'no_ledger_entry'],
    ['eligible = Pending', [{ ...ok, creator_record_eligible: 'Pending' as const }], claim, 'not_eligible'],
    ['eligible = No', [{ ...ok, creator_record_eligible: 'No' as const }], claim, 'not_eligible'],
    ['no approver', [{ ...ok, approver: null }], claim, 'missing_approval'],
    ['no decision date', [{ ...ok, decision_date: null }], claim, 'missing_approval'],
    ['no explanation', [{ ...ok, explanation: null }], claim, 'missing_explanation'],
    ['blank explanation', [{ ...ok, explanation: '  ' }], claim, 'missing_explanation'],
    ['no applicability policy', [{ ...ok, applicability_policy: null }], claim, 'missing_applicability_policy'],
    ['no refresh date', [{ ...ok, refresh_by: null }], claim, 'missing_refresh_by'],
    ['a lapsed refresh date', [{ ...ok, refresh_by: '2026-10-24' }], claim, 'refresh_lapsed'],
    ['a superseded claim', [ok], { ...claim, superseded_by: 'CLAIM-SYN-A-v2' }, 'claim_superseded'],
    ['an unverified claim', [ok], { ...claim, last_verified: null }, 'claim_not_verified'],
    ['a claim re-verified since approval', [ok], { ...claim, last_verified: '2026-10-20' }, 'claim_reverified_since_approval'],
  ] as const)('%s → %s', (_name, ledger, c, reason) => {
    expect(authorizePublication(ledger as never, c, AS_OF)).toEqual({ authorized: false, reason })
  })

  test('jurisdiction-scoped claims are never authorized in this milestone, even with a complete entry', () => {
    const j = synClaim({ claim_id: 'CLAIM-SYN-A-v1', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'SYN-PLACE' }] })
    expect(isJurisdictionScoped(j)).toBe(true)
    expect(authorizePublication([ok], j, AS_OF)).toEqual({ authorized: false, reason: 'jurisdiction_scoped_guidance_disabled' })
    const anyOf = synClaim({ claim_id: 'CLAIM-SYN-A-v1', applicability_any_of: [[{ fact: 'jurisdiction', operator: 'equals', value: 'SYN-PLACE' }]] })
    expect(authorizePublication([ok], anyOf, AS_OF)).toEqual({ authorized: false, reason: 'jurisdiction_scoped_guidance_disabled' })
  })

  test('the refusal vocabulary no longer has a selection-trigger reason', () => {
    expect(PUBLICATION_REFUSAL_REASONS).not.toContain('missing_selection_triggers' as never)
  })

  test('CRC or reviewer eligibility fields are not read (they cannot authorize)', () => {
    expect(codeOnly('publication-ledger.ts')).not.toMatch(/crc_eligible|publication_scope|crc_publication_scope|REVIEWER_ELIGIBLE|lifecycle/)
  })

  test('a malformed as_of throws instead of guessing the date', () => {
    expect(() => authorizePublication([ok], claim, '25/10/2026')).toThrow(/as_of/)
  })
})
