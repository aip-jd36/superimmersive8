/**
 * M1 acceptance tests on synthetic fixtures (PRD AC-1 to AC-4, AC-2a, AC-6).
 * No repository evidence, no network.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateRegistry } from '../src/validate.ts'
import type { Baseline } from '../src/model.ts'
import { codes, evidence, exc, LEDGER, MANIFEST, registry, rel, source, statute } from './helpers.ts'

const HASH = 'a'.repeat(64)
const baseline = (over: Partial<Baseline> = {}): Baseline => ({ snapshot: 'snapshots/alpha/1.html', raw_sha256: HASH, extracted_sha256: HASH, extraction_rule_version: 1, accepted_by: 'Test Reviewer', accepted_on: '2026-01-20', ...over })

test('a complete, confirmed registry is VALID', () => {
  const r = validateRegistry(registry(), evidence())
  assert.deepEqual(r.issues, [])
  assert.equal(r.verdict, 'VALID')
})

// ── AC-1: malformed entries fail with a clear reason ───────────────────────

const malformed: [string, Parameters<typeof source>[0], string][] = [
  ['http scheme', { canonical_url: 'http://alpha.example/terms', expected_final_url: 'http://alpha.example/terms' }, 'url_invalid'],
  ['URL with a fragment', { canonical_url: 'https://alpha.example/terms#s4', expected_final_url: 'https://alpha.example/terms#s4' }, 'url_invalid'],
  ['missing final URL', { expected_final_url: '' }, 'final_url_missing'],
  ['final URL not reached by the registered steps', { expected_final_url: 'https://other.example/terms' }, 'redirect_chain_inconsistent'],
  ['unknown class', { source_class: 'blog_post' as never }, 'source_class_unknown'],
  ['unknown method', { retrieval_method: 'headless_browser' as never }, 'retrieval_method_unknown'],
  ['unknown evidence tier', { evidence_tier: 'Z' }, 'evidence_tier_unknown'],
  ['automated source without an extraction rule', { extraction_rule: null }, 'extraction_rule_missing'],
  ['bad source identifier', { source_id: 'Alpha Terms' }, 'source_id_invalid'],
  ['rule version not matching the baseline', { min_extracted_length: 500, extraction_rule: { id: 'html-text', version: 2 }, baseline: baseline({ extraction_rule_version: 1 }) }, 'baseline_rule_version_mismatch'],
  ['baseline with a bad hash', { min_extracted_length: 500, baseline: baseline({ raw_sha256: 'xyz' }) }, 'baseline_invalid'],
  ['baseline with no accepter', { min_extracted_length: 500, baseline: baseline({ accepted_by: '' }) }, 'baseline_invalid'],
]
for (const [name, over, code] of malformed) {
  test(`AC-1: ${name} fails with ${code}`, () => {
    const r = validateRegistry(registry({ sources: [source(over)] }), evidence())
    assert.equal(r.verdict, 'INVALID')
    assert.ok(codes(r).includes(code), `expected ${code}, got ${codes(r).join(', ')}`)
  })
}

test('AC-1: an unknown field and a missing field are both rejected', () => {
  const extra = { ...source(), follow_links: true }
  const { notes: _notes, ...missing } = source()
  assert.ok(codes(validateRegistry(registry({ sources: [extra as never] }), evidence())).includes('source_malformed'))
  assert.ok(codes(validateRegistry(registry({ sources: [missing as never] }), evidence())).includes('source_malformed'))
})

test('AC-1: duplicate source identifiers are rejected', () => {
  assert.ok(codes(validateRegistry(registry({ sources: [source(), source()] }), evidence())).includes('source_id_duplicate'))
})

test('AC-1: a registered redirect chain ending at the final URL is accepted', () => {
  const s = source({ canonical_url: 'https://alpha-old.example/terms', redirect_steps: ['https://alpha.example/terms'], expected_final_url: 'https://alpha.example/terms' })
  assert.equal(validateRegistry(registry({ sources: [s] }), evidence()).verdict, 'VALID')
})

test('an empty baseline is accepted, and so is a matching synthetic baseline', () => {
  assert.equal(validateRegistry(registry({ sources: [source({ baseline: null })] }), evidence()).verdict, 'VALID')
  assert.equal(validateRegistry(registry({ sources: [source({ min_extracted_length: 500, baseline: baseline() })] }), evidence()).verdict, 'VALID')
})

test('a human-capture source needs no extraction rule', () => {
  const s = source({ retrieval_method: 'human_capture', extraction_rule: null, evidence_tier: 'B' })
  assert.equal(validateRegistry(registry({ sources: [s] }), evidence()).verdict, 'VALID')
})

test('a registry that is not the expected shape is INVALID', () => {
  assert.equal(validateRegistry(null, evidence()).verdict, 'INVALID')
  assert.equal(validateRegistry({ schema_version: 1, sources: {} }, evidence()).verdict, 'INVALID')
  assert.ok(codes(validateRegistry(registry({ schema_version: 2 }), evidence())).includes('schema_version_unsupported'))
})

test('unreadable repository evidence makes the run INVALID', () => {
  const r = validateRegistry(registry(), evidence({ problems: ['ledger: could not be read'] }))
  assert.equal(r.verdict, 'INVALID')
  assert.ok(codes(r).includes('evidence_unreadable'))
})

// ── AC-2: every relationship names an existing governed claim, a basis, a confirmer, a date ──

test('AC-2: a claim that is not in the ledger is rejected', () => {
  const r = validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-terms', 'CLAIM-NOT-REAL-001-v1')] }), evidence())
  assert.ok(codes(r).includes('claim_unknown'))
  assert.equal(r.verdict, 'INVALID')
})

test('AC-2: a claim present only in the runtime fixture is still unknown; the ledger is the authority', () => {
  const r = validateRegistry(registry({ sources: [source({ scope: { kind: 'provider', id: 'delta-stock' }, source_class: 'licence_terms' })], relationships: [rel('alpha-terms', 'CLAIM-DELTA-STOCK-001-v1')] }), evidence())
  assert.ok(codes(r).includes('claim_unknown'))
})

test('AC-2: missing basis, unresolved basis path and unknown source are rejected', () => {
  assert.ok(codes(validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1', { basis_note: '' })] }), evidence())).includes('basis_missing'))
  assert.ok(codes(validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1', { basis_path: 'synthetic/nowhere.md' })] }), evidence())).includes('basis_missing'))
  assert.ok(codes(validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('ghost', 'CLAIM-GAMMA-RULE-001-v1')] }), evidence())).includes('source_unknown'))
})

test('AC-2: an unconfirmed relationship is pending, never VALID; a half-filled confirmation is an error', () => {
  const pending = validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1', { confirmed_by: null, confirmed_on: null })] }), evidence())
  assert.equal(pending.verdict, 'VALID_PENDING_CONFIRMATION')
  assert.deepEqual(codes(pending), ['relationship_unconfirmed'])
  for (const over of [{ confirmed_on: null }, { confirmed_by: null }, { confirmed_on: '2026-02-30' }, { confirmed_by: '  ' }]) {
    assert.ok(codes(validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1', over)] }), evidence())).includes('confirmation_invalid'))
  }
})

test('lifecycle: a Deprecated claim cannot be mapped', () => {
  const r = validateRegistry(registry({ sources: [source(), statute()], relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('gamma-statute', 'CLAIM-OLD-RULE-001-v1')] }), evidence())
  assert.ok(codes(r).includes('claim_not_adopted'))
})

test('lifecycle: ledger and runtime fixture disagreeing is an error, and the ledger value is the one reported', () => {
  const ev = evidence()
  ev.runtime[0].lifecycle = 'Deprecated'
  const r = validateRegistry(registry(), ev)
  const issue = r.issues.find((i) => i.code === 'lifecycle_mismatch')
  assert.ok(issue)
  assert.match(issue.message, /Adopted in the ledger and Deprecated in the runtime fixture/)
})

test('lifecycle: an unrecognised ledger value fails closed', () => {
  const ev = evidence()
  ev.ledger.set('CLAIM-GAMMA-RULE-001-v1', 'Adopted (provisional)')
  assert.ok(codes(validateRegistry(registry(), ev)).includes('ledger_lifecycle_unrecognised'))
})

// ── AC-2a: Matrix identifiers ──────────────────────────────────────────────

for (const id of ['mx-one', 'mx-two', 'mx-two-tiering', 'mx-two-consent', 'mx-three']) {
  test(`AC-2a: Matrix identifier "${id}" is rejected in a relationship and in an exclusion`, () => {
    const asRel = validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-terms', id)] }), evidence())
    const asExc = validateRegistry(registry({ exclusions: [exc('alpha-terms', id)] }), evidence())
    for (const r of [asRel, asExc]) {
      assert.equal(r.verdict, 'INVALID')
      const issue = r.issues.find((i) => i.code === 'matrix_identifier_not_allowed')
      assert.ok(issue)
      assert.match(issue.message, /Legacy Matrix identifier/)
    }
  })
}

test('AC-2a: any other non-governed identifier is rejected', () => {
  assert.ok(codes(validateRegistry(registry({ relationships: [rel('alpha-terms', 'some-tool')] }), evidence())).includes('claim_ref_invalid'))
})

// ── AC-3: scope cross-check ────────────────────────────────────────────────

test('AC-3: a runtime claim naming the tool that is neither mapped nor excluded is reported', () => {
  const ev = evidence()
  ev.runtime.push({ claim_id: 'CLAIM-ALPHA-USE-002-v1', lifecycle: 'Adopted', crc_eligible: 'Yes', tool_scope: ['alpha'], provider_scope: null })
  const r = validateRegistry(registry(), ev)
  const issue = r.issues.find((i) => i.code === 'scope_claim_unexplained')
  assert.ok(issue)
  assert.match(issue.message, /CLAIM-ALPHA-USE-002-v1/)
  assert.equal(validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-terms', 'CLAIM-ALPHA-USE-002-v1')] }), ev).verdict, 'VALID')
  assert.equal(validateRegistry(registry({ exclusions: [exc('alpha-terms', 'CLAIM-ALPHA-USE-002-v1')] }), ev).verdict, 'VALID')
})

test('AC-3: a claim mapped to another registered source of the same tool counts as explained', () => {
  const ev = evidence()
  ev.runtime.push({ claim_id: 'CLAIM-ALPHA-USE-002-v1', lifecycle: 'Adopted', crc_eligible: 'Yes', tool_scope: ['alpha'], provider_scope: null })
  const second = source({ source_id: 'alpha-pricing', canonical_url: 'https://alpha.example/pricing', expected_final_url: 'https://alpha.example/pricing' })
  const r = validateRegistry(registry({ sources: [source(), second], relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-pricing', 'CLAIM-ALPHA-USE-002-v1')] }), ev)
  assert.equal(r.verdict, 'VALID')
})

test('scope: a claim scoped to a different tool cannot be mapped to this source', () => {
  const r = validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-terms', 'CLAIM-BETA-USE-001-v1')] }), evidence())
  assert.ok(codes(r).includes('scope_mismatch'))
})

test('scope: an unscoped claim cannot be mapped to a tool-scoped source', () => {
  const r = validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-terms', 'CLAIM-GAMMA-RULE-001-v1')] }), evidence())
  assert.ok(codes(r).includes('scope_mismatch'))
})

test('scope: a ledger claim with no runtime representation cannot be scope-checked and fails closed', () => {
  const r = validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-terms', 'CLAIM-LEDGER-ONLY-001-v1')] }), evidence())
  assert.ok(codes(r).includes('scope_unverifiable'))
})

test('scope: a provider or licence source must name its tool or provider, and the identity must be a governed one', () => {
  assert.ok(codes(validateRegistry(registry({ sources: [source({ scope: { kind: 'none', id: null } })] }), evidence())).includes('scope_required'))
  assert.ok(codes(validateRegistry(registry({ sources: [source({ scope: { kind: 'tool', id: 'alpha.example' } })] }), evidence())).includes('scope_identity_unknown'))
  assert.ok(codes(validateRegistry(registry({ sources: [source({ scope: { kind: 'none', id: 'alpha' } })] }), evidence())).includes('scope_invalid'))
})

test('scope: provider scope is checked the same way as tool scope', () => {
  const ev = evidence()
  ev.ledger.set('CLAIM-DELTA-STOCK-001-v1', 'Adopted')
  const s = source({ source_id: 'delta-licence', source_class: 'licence_terms', scope: { kind: 'provider', id: 'delta-stock' } })
  assert.equal(validateRegistry(registry({ sources: [s], relationships: [rel('delta-licence', 'CLAIM-DELTA-STOCK-001-v1')] }), ev).verdict, 'VALID')
  assert.ok(codes(validateRegistry(registry({ sources: [s], relationships: [] }), ev)).includes('scope_claim_unexplained'))
})

// ── AC-4: manifest cross-check ─────────────────────────────────────────────

test('AC-4: every claim ID named in the manifest is mapped or excluded', () => {
  const ev = evidence({ manifests: new Map([[MANIFEST, ['CLAIM-ALPHA-USE-001-v1', 'CLAIM-ALPHA-USE-001-v2']]]) })
  const s = source({ evidence_manifest: MANIFEST })
  const unexplained = validateRegistry(registry({ sources: [s] }), ev)
  assert.match(unexplained.issues.find((i) => i.code === 'manifest_claim_unexplained')!.message, /CLAIM-ALPHA-USE-001-v2/)
  // A proposed claim that is not in the ledger can be excluded with a reason; it can never be mapped.
  assert.equal(validateRegistry(registry({ sources: [s], exclusions: [exc('alpha-terms', 'CLAIM-ALPHA-USE-001-v2', { reason: 'Proposed in a pending review; not in the ledger.' })] }), ev).verdict, 'VALID')
  assert.ok(codes(validateRegistry(registry({ sources: [s], relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v2')] }), ev)).includes('claim_unknown'))
})

test('AC-4: a manifest pointer that does not resolve is rejected', () => {
  assert.ok(codes(validateRegistry(registry({ sources: [source({ evidence_manifest: MANIFEST })] }), evidence())).includes('manifest_missing'))
  assert.ok(codes(validateRegistry(registry({ sources: [source({ evidence_manifest: MANIFEST })] }), evidence({ manifests: new Map([[MANIFEST, null]]) }))).includes('manifest_missing'))
})

test('exclusions need a reason and a confirmation, and cannot duplicate a relationship', () => {
  assert.ok(codes(validateRegistry(registry({ exclusions: [exc('alpha-terms', 'CLAIM-BETA-USE-001-v1', { reason: '' })] }), evidence())).includes('exclusion_reason_missing'))
  assert.deepEqual(codes(validateRegistry(registry({ exclusions: [exc('alpha-terms', 'CLAIM-BETA-USE-001-v1', { confirmed_by: null, confirmed_on: null })] }), evidence())), ['exclusion_unconfirmed'])
  assert.ok(codes(validateRegistry(registry({ exclusions: [exc('alpha-terms', 'CLAIM-ALPHA-USE-001-v1')] }), evidence())).includes('mapped_and_excluded'))
  assert.ok(codes(validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1')] }), evidence())).includes('relationship_duplicate'))
})

// ── AC-6: many-to-many ─────────────────────────────────────────────────────

test('AC-6: one source with several claims and one claim with two sources validate', () => {
  const ev = evidence()
  ev.runtime.push({ claim_id: 'CLAIM-ALPHA-USE-002-v1', lifecycle: 'Adopted', crc_eligible: 'Yes', tool_scope: ['alpha'], provider_scope: null })
  const reg = registry({
    sources: [source(), statute(), statute({ source_id: 'gamma-guidance', source_class: 'regulator_guidance', canonical_url: 'https://law.example/guidance', expected_final_url: 'https://law.example/guidance' })],
    relationships: [
      rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'),
      rel('alpha-terms', 'CLAIM-ALPHA-USE-002-v1'),
      rel('gamma-statute', 'CLAIM-GAMMA-RULE-001-v1'),
      rel('gamma-guidance', 'CLAIM-GAMMA-RULE-001-v1'),
    ],
  })
  assert.equal(validateRegistry(reg, ev).verdict, 'VALID')
})

test('validation does not change the registry or the evidence it is given', () => {
  const reg = registry()
  const ev = evidence()
  const before = JSON.stringify([reg, [...ev.ledger], ev.runtime, ev.matrix])
  validateRegistry(reg, ev)
  assert.equal(JSON.stringify([reg, [...ev.ledger], ev.runtime, ev.matrix]), before)
  assert.ok(LEDGER)
})
