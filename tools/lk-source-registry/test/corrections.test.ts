/**
 * Regression tests for LK-SOURCE-MONITOR-M1-CORRECTIONS-1: source identity,
 * exclusion support, lifecycle review state and the corrected pilot mapping.
 * Synthetic fixtures first; the real registry and ledger last. Offline.
 */

import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { test } from 'node:test'
import { DEFAULT_REGISTRY } from '../src/cli.ts'
import { addressesInText, loadEvidence, readLedgerSourceAddresses } from '../src/evidence.ts'
import { governedNotCovered, matrixNotMonitored, renderReport, REVIEW_NOTE } from '../src/report.ts'
import { normaliseAddress, validateRegistry } from '../src/validate.ts'
import type { Registry } from '../src/model.ts'
import { codes, evidence, exc, MANIFEST, registry, rel, REVIEW_DOC, source, statute } from './helpers.ts'

// ── Source identity ────────────────────────────────────────────────────────

test('identity: a claim that cites a different document of the same provider is rejected', () => {
  // Same tool scope, different document: the case the scope check alone let through.
  const ev = evidence()
  ev.ledger.set('CLAIM-ALPHA-PAID-001-v1', 'Adopted')
  ev.ledgerSourceAddresses.set('CLAIM-ALPHA-PAID-001-v1', ['alpha.example/paid-terms'])
  ev.runtime.push({ claim_id: 'CLAIM-ALPHA-PAID-001-v1', lifecycle: 'Adopted', crc_eligible: 'Yes', tool_scope: ['alpha'], provider_scope: null })
  const r = validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-terms', 'CLAIM-ALPHA-PAID-001-v1')] }), ev)
  assert.equal(r.verdict, 'INVALID')
  const issue = r.issues.find((i) => i.code === 'source_not_cited')
  assert.ok(issue)
  assert.match(issue.message, /alpha\.example\/paid-terms/)
  assert.equal(codes(r).includes('scope_mismatch'), false)
})

test('identity: an index page does not match a document published beneath it', () => {
  const ev = evidence()
  ev.ledger.set('CLAIM-GAMMA-REPORT-001-v1', 'Adopted')
  ev.ledgerSourceAddresses.set('CLAIM-GAMMA-REPORT-001-v1', ['law.example/gamma/report-part-2.pdf'])
  const r = validateRegistry(registry({ sources: [source(), statute()], relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('gamma-statute', 'CLAIM-GAMMA-REPORT-001-v1')] }), ev)
  assert.ok(codes(r).includes('source_not_cited'))
})

test('identity: an explicit attestation is accepted, reported as attested, and never called verified', () => {
  const ev = evidence()
  ev.ledgerSourceAddresses.set('CLAIM-ALPHA-USE-001-v1', [])
  assert.ok(codes(validateRegistry(registry(), ev)).includes('source_not_cited'))
  const reg = registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1', { source_identity: 'attested', basis_note: 'The ledger cites the document by title only.' })] })
  const result = validateRegistry(reg, ev)
  assert.equal(result.verdict, 'VALID')
  const text = renderReport(reg, ev, result)
  assert.match(text, /source identity: attested by the confirmer; not mechanically checked/)
  for (const line of text.split('\n').filter((l) => l.includes('source identity:'))) assert.doesNotMatch(line, /verified|confirmed identity|proven/i)
})

test('identity: a missing or unknown source_identity value is rejected', () => {
  assert.ok(codes(validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1', { source_identity: 'verified' as never })] }), evidence())).includes('source_identity_invalid'))
  const { source_identity: _s, ...missing } = rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1')
  assert.ok(codes(validateRegistry(registry({ relationships: [missing as never] }), evidence())).includes('relationship_malformed'))
})

test('identity: the registered final address counts when the ledger cites the redirect target', () => {
  const s = source({ canonical_url: 'https://alpha-old.example/terms', redirect_steps: ['https://alpha.example/terms'], expected_final_url: 'https://alpha.example/terms' })
  assert.equal(validateRegistry(registry({ sources: [s] }), evidence()).verdict, 'VALID')
})

test('address reading: schemes, www, case and trailing slashes are ignored; truncated addresses are not addresses', () => {
  assert.equal(normaliseAddress('https://www.Alpha.example/Terms/'), 'alpha.example/terms')
  assert.deepEqual(
    addressesInText('Terms (`alpha.example/terms`), §4.4; see https://www.Law.example/GBS/396-B. Also (law.example/gamma/...) and law.example/gamma/report.pdf, not a.b or section 4.6.'),
    ['alpha.example/terms', 'law.example/gbs/396-b', 'law.example/gamma/report.pdf'].sort(),
  )
})

test('address reading: only the claim\'s own Source references block is read', () => {
  const ledger = [
    '### CLAIM-ONE-001-v1', 'Topic: x', 'Source references:', '  - primary: Alpha Terms (`alpha.example/terms`), section 4.', '  - primary: a case with no address',
    'Source authority/type: Official', 'Source fact: >', '  A companion fetch of alpha.example/pricing confirmed tiers.', 'Lifecycle: Adopted', '',
    '### CLAIM-TWO-001-v1', 'Lifecycle: Adopted', '',
  ].join('\n')
  assert.deepEqual([...readLedgerSourceAddresses(ledger)], [['CLAIM-ONE-001-v1', ['alpha.example/terms']], ['CLAIM-TWO-001-v1', []]])
})

// ── Exclusions ─────────────────────────────────────────────────────────────

test('exclusion: an identifier absent from the ledger must be named in the source manifest or a stated evidence record', () => {
  const s = source({ evidence_manifest: MANIFEST })
  const ev = evidence({ manifests: new Map([[MANIFEST, ['CLAIM-ALPHA-USE-001-v1', 'CLAIM-ALPHA-USE-001-v2']], [REVIEW_DOC, ['CLAIM-ALPHA-USE-009-v2']]]) })
  const ok = (x: ReturnType<typeof exc>[]) => validateRegistry(registry({ sources: [s], exclusions: [exc('alpha-terms', 'CLAIM-ALPHA-USE-001-v2', { category: 'not_in_ledger' }), ...x] }), ev)
  assert.equal(ok([]).verdict, 'VALID')
  // Supported by another existing evidence record.
  assert.equal(ok([exc('alpha-terms', 'CLAIM-ALPHA-USE-009-v2', { category: 'not_in_ledger', evidence_path: REVIEW_DOC })]).verdict, 'VALID')
  // A typing error, and an identifier no record names.
  for (const bad of ['CLAIM-ALPHA-USE-001-v3', 'CLAIM-ALPHA-USE-OO1-v2', 'CLAIM-INVENTED-001-v1']) {
    const r = ok([exc('alpha-terms', bad, { category: 'not_in_ledger' })])
    assert.equal(r.verdict, 'INVALID', bad)
    assert.ok(codes(r).includes('exclusion_unsupported'), bad)
  }
  // An evidence record that does not exist, or does not name the identifier.
  assert.ok(codes(ok([exc('alpha-terms', 'CLAIM-ALPHA-USE-001-v3', { category: 'not_in_ledger', evidence_path: 'synthetic/missing.md' })])).includes('exclusion_unsupported'))
  assert.ok(codes(ok([exc('alpha-terms', 'CLAIM-ALPHA-USE-001-v3', { category: 'not_in_ledger', evidence_path: REVIEW_DOC })])).includes('exclusion_unsupported'))
})

test('exclusion: a source with no manifest cannot exclude an unknown identifier without an evidence record', () => {
  const r = validateRegistry(registry({ exclusions: [exc('alpha-terms', 'CLAIM-ALPHA-USE-001-v2', { category: 'not_in_ledger' })] }), evidence())
  assert.ok(codes(r).includes('exclusion_unsupported'))
})

test('exclusion: the category must match the ledger, so an exclusion cannot disguise an unknown or an approved claim', () => {
  // An unknown identifier presented as an ordinary exclusion.
  for (const category of ['not_a_dependency', 'depends_on_unregistered_source'] as const) {
    assert.ok(codes(validateRegistry(registry({ exclusions: [exc('alpha-terms', 'CLAIM-INVENTED-001-v1', { category })] }), evidence())).includes('claim_unknown'))
  }
  // A governed claim presented as not being one.
  assert.ok(codes(validateRegistry(registry({ exclusions: [exc('alpha-terms', 'CLAIM-BETA-USE-001-v1', { category: 'not_in_ledger' })] }), evidence())).includes('exclusion_category_mismatch'))
  assert.ok(codes(validateRegistry(registry({ exclusions: [exc('alpha-terms', 'CLAIM-BETA-USE-001-v1', { category: 'other' as never })] }), evidence())).includes('exclusion_category_invalid'))
})

test('exclusion: an uncovered dependency is shown as uncovered and never counted as coverage', () => {
  const ev = evidence()
  ev.runtime.push({ claim_id: 'CLAIM-ALPHA-USE-002-v1', lifecycle: 'Adopted', crc_eligible: 'Yes', tool_scope: ['alpha'], provider_scope: null })
  const reg = registry({ exclusions: [exc('alpha-terms', 'CLAIM-ALPHA-USE-002-v1', { category: 'depends_on_unregistered_source', reason: 'Cites the paid-service terms, which are not registered.' })] })
  const result = validateRegistry(reg, ev)
  assert.equal(result.verdict, 'VALID')
  assert.ok(governedNotCovered(reg, ev).includes('CLAIM-ALPHA-USE-002-v1'))
  const text = renderReport(reg, ev, result)
  assert.match(text, /excluded: CLAIM-ALPHA-USE-002-v1 \| UNCOVERED DEPENDENCY: .* It is not monitored \| no registered source covers this claim/)
  assert.match(text, /An exclusion or a relationship under review is not coverage/)
})

test('exclusion: an unapproved proposal is labelled as not approved in the report', () => {
  const s = source({ evidence_manifest: MANIFEST })
  const ev = evidence({ manifests: new Map([[MANIFEST, ['CLAIM-ALPHA-USE-001-v1', 'CLAIM-ALPHA-USE-001-v2']]]) })
  const reg = registry({ sources: [s], exclusions: [exc('alpha-terms', 'CLAIM-ALPHA-USE-001-v2', { category: 'not_in_ledger' })] })
  assert.match(renderReport(reg, ev, validateRegistry(reg, ev)), /excluded: CLAIM-ALPHA-USE-001-v2 \| not a governed claim: the identifier is not in the ledger and is not approved/)
})

// ── Lifecycle ──────────────────────────────────────────────────────────────

function deprecate(ev = evidence()) {
  ev.ledger.set('CLAIM-GAMMA-RULE-001-v1', 'Deprecated')
  ev.runtime[2].lifecycle = 'Deprecated'
  return ev
}
const twoSources = () => registry({ sources: [source(), statute()], relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('gamma-statute', 'CLAIM-GAMMA-RULE-001-v1')] })

test('lifecycle: Adopted to Deprecated flags the relationship for review and does not make the registry INVALID', () => {
  assert.equal(validateRegistry(twoSources(), evidence()).verdict, 'VALID')
  const r = validateRegistry(twoSources(), deprecate())
  assert.equal(r.verdict, 'REVIEW_REQUIRED')
  assert.deepEqual(codes(r), ['relationship_claim_deprecated'])
  assert.deepEqual(r.underReview, ['gamma-statute -> CLAIM-GAMMA-RULE-001-v1'])
  assert.equal(r.issues.some((i) => i.severity === 'error'), false)
})

test('lifecycle: a relationship under review is not an active mapping and is marked unusable for claim impact', () => {
  const ev = deprecate()
  ev.runtime[2].crc_eligible = 'Yes'
  const reg = twoSources()
  const result = validateRegistry(reg, ev)
  const text = renderReport(reg, ev, result)
  assert.match(text, /## Relationships requiring review \(1\)/)
  assert.ok(text.includes(REVIEW_NOTE))
  assert.match(text, /must not be used for any claim-impact conclusion/)
  // The unrelated source is still listed with its own mapping intact.
  assert.match(text.split('### alpha-terms\n')[1].split('\n### ')[0], /CLAIM-ALPHA-USE-001-v1 \| ledger lifecycle: Adopted/)
  assert.doesNotMatch(text.split('### alpha-terms\n')[1].split('\n### ')[0], /REVIEW REQUIRED/)
})

test('lifecycle: a successor that replaces a deprecated claim is uncovered until it is mapped', () => {
  const ev = deprecate()
  ev.ledger.set('CLAIM-GAMMA-RULE-001-v2', 'Adopted')
  ev.ledgerSourceAddresses.set('CLAIM-GAMMA-RULE-001-v2', ['law.example/gamma'])
  ev.runtime.push({ claim_id: 'CLAIM-GAMMA-RULE-001-v2', lifecycle: 'Adopted', crc_eligible: 'Yes', tool_scope: null, provider_scope: null })
  const reg = twoSources()
  const result = validateRegistry(reg, ev)
  assert.ok(governedNotCovered(reg, ev, result.underReview).includes('CLAIM-GAMMA-RULE-001-v2'))
  const fixed = registry({ sources: [source(), statute()], relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('gamma-statute', 'CLAIM-GAMMA-RULE-001-v2')] })
  assert.equal(validateRegistry(fixed, ev).verdict, 'VALID')
})

test('lifecycle: review outranks pending, and an error outranks both', () => {
  const pendingAndReview = registry({ sources: [source(), statute()], relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1', { confirmed_by: null, confirmed_on: null }), rel('gamma-statute', 'CLAIM-GAMMA-RULE-001-v1')] })
  assert.equal(validateRegistry(pendingAndReview, deprecate()).verdict, 'REVIEW_REQUIRED')
  const withError = registry({ sources: [source(), statute()], relationships: [rel('alpha-terms', 'CLAIM-NOT-REAL-001-v1'), rel('gamma-statute', 'CLAIM-GAMMA-RULE-001-v1')] })
  assert.equal(validateRegistry(withError, deprecate()).verdict, 'INVALID')
})

test('lifecycle: an unknown claim still fails, and ledger and fixture disagreeing still fails', () => {
  assert.ok(codes(validateRegistry(registry({ relationships: [rel('alpha-terms', 'CLAIM-NOT-REAL-001-v1')] }), evidence())).includes('claim_unknown'))
  const ev = evidence()
  ev.ledger.set('CLAIM-GAMMA-RULE-001-v1', 'Deprecated')
  const r = validateRegistry(twoSources(), ev)
  assert.equal(r.verdict, 'INVALID')
  assert.ok(codes(r).includes('lifecycle_mismatch'))
})

// ── The corrected pilot registry, against the real ledger ──────────────────

const real = JSON.parse(fs.readFileSync(DEFAULT_REGISTRY, 'utf8')) as Registry
const pairs = (list: { source_id: string; claim_ref: string }[]) => list.map((r) => `${r.source_id} -> ${r.claim_ref}`).sort()

test('pilot: the mapping holds exactly the four retained relationships', () => {
  assert.deepEqual(pairs(real.relationships), [
    'higgsfield-terms-of-use-agreement -> CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1',
    'kling-terms-of-service -> CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1',
    'ny-gbl-396-b -> CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1',
    'runway-terms-of-use -> CLAIM-RUNWAY-COMMERCIAL-USE-001-v1',
  ])
  for (const r of real.relationships) assert.equal(r.source_identity, 'address_in_ledger')
})

test('pilot: the Kling member claim is an uncovered dependency, not a mapping', () => {
  const x = real.exclusions.find((e) => e.claim_ref === 'CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1')
  assert.ok(x)
  assert.equal(x.category, 'depends_on_unregistered_source')
  assert.match(x.reason, /Terms of Paid Service/)
})

test('pilot: restoring either removed mapping is now rejected against the real ledger', async () => {
  const withMember: Registry = { ...real, exclusions: real.exclusions.filter((e) => e.claim_ref !== 'CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1'), relationships: [...real.relationships, { ...real.relationships[0], source_id: 'kling-terms-of-service', claim_ref: 'CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1' }] }
  const member = validateRegistry(withMember, await loadEvidence(withMember))
  assert.match(member.issues.find((i) => i.code === 'source_not_cited')!.message, /kling\.ai\/docs\/payment-policy/)
  for (const id of ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1']) {
    const withIndex: Registry = { ...real, relationships: [...real.relationships, { ...real.relationships[0], source_id: 'uscoai-ai-page', claim_ref: id }] }
    const r = validateRegistry(withIndex, await loadEvidence(withIndex))
    assert.match(r.issues.find((i) => i.code === 'source_not_cited')!.message, /copyright\.gov\/ai\/copyright-and-artificial-intelligence-part-2-copyrightability-report\.pdf/, id)
  }
})

test('pilot: the two index sources are watch-only and say what that does not establish', async () => {
  const ev = await loadEvidence(real)
  const text = renderReport(real, ev, validateRegistry(real, ev))
  for (const id of ['uscoai-ai-page', 'federal-register-copyright-office']) {
    assert.equal(real.relationships.some((r) => r.source_id === id), false)
    assert.match(text.split(`### ${id}\n`)[1].split('\n### ')[0], /Watch-only: .* does not detect a change inside any document it links to/)
    assert.match(real.sources.find((s) => s.source_id === id)!.notes, /does not detect a change inside any document it links to/)
  }
})

test('pilot: coverage counts follow from the fixtures', async () => {
  const ev = await loadEvidence(real)
  const result = validateRegistry(real, ev)
  assert.equal(result.verdict, 'VALID')
  assert.deepEqual(result.issues, [])
  const reachable = ev.runtime.filter((c) => c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes').map((c) => c.claim_id)
  const uncovered = governedNotCovered(real, ev, result.underReview)
  assert.equal(uncovered.length, reachable.length - real.relationships.length)
  assert.ok(uncovered.includes('CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1'))
  for (const id of ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1']) assert.ok(uncovered.includes(id), id)
  for (const r of real.relationships) assert.equal(uncovered.includes(r.claim_ref), false)
  const eligible = ev.matrix.flatMap((row) => row.claims.filter((c) => c.crc_eligible === 'Yes').map((c) => c.claim_id)).sort()
  assert.deepEqual(matrixNotMonitored(ev).map((m) => m.claim_id), eligible)
  assert.ok(path.isAbsolute(DEFAULT_REGISTRY))
})
