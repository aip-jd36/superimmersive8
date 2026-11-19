/**
 * CR-DOC-READER-EXT-9R5A — the governed licence evaluation adjudication (founder decision, Option A). No network, no paid call.
 */
import { readFileSync } from 'node:fs'
import { loadLicenceSpec, runLicenceEval } from '@/lib/creator-record/eval/run-licence-eval'
import { idealOutput, scoreLicenceEval, type LicenceSpec } from '@/lib/creator-record/eval/score-licence'
import {
  applyLicenceTruthCorrections,
  LICENCE_PREREGISTERED_SPEC_PATH,
  licenceSpecSha256,
  loadLicenceTruthCorrections,
  type LicenceTruthCorrections,
} from '@/lib/creator-record/eval/licence-truth-corrections'
import type { ReceiptModelCaller } from '@/lib/creator-record/receipt-examination/examine'

const ARTLIST = 'lic-artlist-pro-pdf'
const PRINTED = 'Licensed for use in one integrated Project.'
const spec = loadLicenceSpec()
const corrections = loadLicenceTruthCorrections()
const adjudicated = applyLicenceTruthCorrections(spec, corrections, licenceSpecSha256())
const pdf = new Uint8Array(Buffer.from('%PDF-1.4\n%synthetic\n'))

/** The ideal reading of every fixture, with `edit` applied to the outputs of the fixtures it names. */
function evalWith(edit: Record<string, (out: Record<string, unknown>) => void> = {}) {
  const callerFor = (id: string): ReceiptModelCaller => async () => {
    const out = idealOutput(spec.fixtures.find((f) => f.fixture_id === id)!)
    edit[id]?.(out)
    return { id: 'mock', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 0, output_tokens: 0 }, parsed_output: out } as never
  }
  return runLicenceEval(spec, 1, callerFor, () => pdf)
}
const c1b = (s: ReturnType<typeof scoreLicenceEval>) => s.criteria.find((c) => c.id === 'C1b_inventions')!
const present = (value: string, evidence = value) => ({ status: 'present', value, evidence })
// What run #2 reported: the Artlist usage line read as a permission statement.
const RUN2 = { [ARTLIST]: (o: Record<string, unknown>) => { o.permission_statement = present(PRINTED) } }

describe('1. the adjudicated Artlist field is accepted under the adjudicated truth', () => {
  test('the run #2 reading: FAIL under the original key, PASS under the adjudicated key', async () => {
    const r = await evalWith(RUN2)
    expect(r.score.pass).toBe(false)
    expect(c1b(r.score)).toMatchObject({ pass: false, value: 1 })
    expect(c1b(r.score).detail[0]).toMatch(/^lic-artlist-pro-pdf#1\.permission_statement: INVENTED/)
    const a = scoreLicenceEval(adjudicated, r.results, r.noCall)
    expect(c1b(a)).toMatchObject({ pass: true, value: 0 })
    expect(a.pass).toBe(true)
  })
  test('the original expectation (not shown) is still accepted under the adjudicated key', async () => {
    const r = await evalWith()
    expect(scoreLicenceEval(adjudicated, r.results, r.noCall).pass).toBe(true)
    expect(r.score.pass).toBe(true)
  })
  test('the adjudicated field is not counted as an expected field (accuracy is unchanged)', async () => {
    const r = await evalWith(RUN2)
    const acc = (s: ReturnType<typeof scoreLicenceEval>) => s.criteria.find((c) => c.id === 'C1a_extraction_accuracy')!
    expect(acc(scoreLicenceEval(adjudicated, r.results, r.noCall)).value).toBe(acc(r.score).value)
  })
})

describe('2. invention detection is not weakened', () => {
  test.each<[string, Record<string, (o: Record<string, unknown>) => void>]>([
    ['another text in the adjudicated field', { [ARTLIST]: (o) => { o.permission_statement = present('Licensed for broadcast') } }],
    ['the adjudicated field plus another invented field on the same document', { [ARTLIST]: (o) => { o.permission_statement = present(PRINTED); o.content_designation = present('Pro') } }],
    ['the same reading on a different fixture', { 'lic-artlist-social-png': (o) => { o.permission_statement = present('Your license') } }],
    ['an invented field on another document (expected not shown)', { 'lic-epidemic-commercial-pdf': (o) => { o.content_designation = present('Commercial', 'Tier: Commercial') } }],
  ])('%s still fails C1b under the adjudicated key', async (_, edit) => {
    const r = await evalWith(edit)
    const a = scoreLicenceEval(adjudicated, r.results, r.noCall)
    expect(c1b(a).pass).toBe(false)
    expect(a.pass).toBe(false)
  })
})

describe('3. the original pre-registered answer key is intact', () => {
  test('the spec still expects permission_statement not shown, and applying the adjudication does not mutate it', () => {
    const before = JSON.stringify(spec)
    applyLicenceTruthCorrections(spec, corrections, licenceSpecSha256())
    expect(JSON.stringify(spec)).toBe(before)
    expect(spec.fixtures.find((f) => f.fixture_id === ARTLIST)!.truth.fields.permission_statement).toEqual({ status: 'not_shown' })
    expect(readFileSync(LICENCE_PREREGISTERED_SPEC_PATH, 'utf8')).not.toContain('optional')
  })
  test('only the one fixture field changes in the adjudicated spec', () => {
    const changed: string[] = []
    spec.fixtures.forEach((f, i) => {
      for (const [k, v] of Object.entries(f.truth.fields)) if (JSON.stringify(v) !== JSON.stringify(adjudicated.fixtures[i].truth.fields[k])) changed.push(`${f.fixture_id}.${k}`)
      if (JSON.stringify({ ...f, truth: { ...f.truth, fields: {} } }) !== JSON.stringify({ ...adjudicated.fixtures[i], truth: { ...adjudicated.fixtures[i].truth, fields: {} } })) changed.push(`${f.fixture_id}:other`)
    })
    expect(changed).toEqual([`${ARTLIST}.permission_statement`])
    expect(adjudicated.fixtures.find((f) => f.fixture_id === ARTLIST)!.truth.fields.permission_statement).toEqual({ status: 'optional', contains: 'integrated project', printed: PRINTED })
  })
})

describe('4. the original result stays historically identifiable; the record is governed', () => {
  test('the correction is versioned, pinned to the exact spec, names the founder decision and does not claim authorization', () => {
    expect(corrections).toMatchObject({ corrections_version: 'licence-truth-corrections-v1', base_spec_version: 'licence-fixtures-v1', base_spec_sha256: licenceSpecSha256() })
    expect(corrections.corrections).toHaveLength(1)
    const k = corrections.corrections[0]
    expect(k).toMatchObject({ fixture_id: ARTLIST, field: 'permission_statement', kind: 'accept_printed_text_as_present', from_status: 'not_shown', printed: PRINTED })
    expect(k.adjudicated).toMatch(/CR-DOC-READER-EXT-9R5A/)
    expect(k.rationale).toMatch(/does not establish separate authorization or commercial clearance/)
    expect(corrections.policy).toMatch(/earlier results are never rewritten/)
  })
  test('scoring under the original key is unchanged by the adjudication module (the run #2 failure reproduces exactly)', async () => {
    const r = await evalWith(RUN2)
    expect(scoreLicenceEval(spec, r.results, r.noCall)).toEqual(r.score)
    expect(r.score.criteria.filter((c) => !c.pass).map((c) => c.id)).toEqual(['C1b_inventions'])
  })
})

describe('the mechanism refuses anything outside the one adjudicated kind', () => {
  const k0 = corrections.corrections[0]
  const withK = (over: Partial<(typeof corrections.corrections)[number]>, top: Partial<LicenceTruthCorrections> = {}): LicenceTruthCorrections => ({ ...corrections, ...top, corrections: [{ ...k0, ...over }] })
  test.each<[string, LicenceTruthCorrections, RegExp]>([
    ['another spec', withK({}, { base_spec_sha256: '0'.repeat(64) }), /different fixture spec/],
    ['another spec version', withK({}, { base_spec_version: 'licence-fixtures-v2' }), /is for licence-fixtures-v2/],
    ['an unknown fixture', withK({ fixture_id: 'lic-nonexistent' }), /unknown fixture/],
    ['an unknown field', withK({ field: 'licensee_name' as never }), /unknown field/],
    ['a field whose truth is already present', withK({ fixture_id: 'perm-pond5-consent-pdf' }), /original truth is not 'not_shown'/],
    ['text not printed on the document', withK({ printed: 'Licensed for broadcast worldwide' }), /not printed on the document/],
    ['no rationale', withK({ rationale: ' ' }), /no rationale/],
    ['no adjudicator', withK({ adjudicated: '' }), /no adjudicated/],
    ['another kind', withK({ kind: 'remove_expectation' as never }), /unsupported kind/],
  ])('%s', (_, c, re) => expect(() => applyLicenceTruthCorrections(spec as LicenceSpec, c, licenceSpecSha256())).toThrow(re))
  test('a duplicated correction is refused', () => {
    expect(() => applyLicenceTruthCorrections(spec, { ...corrections, corrections: [k0, k0] }, licenceSpecSha256())).toThrow(/duplicate/)
  })
})
