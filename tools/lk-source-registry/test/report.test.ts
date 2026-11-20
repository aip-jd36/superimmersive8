/**
 * Coverage report tests on synthetic fixtures (PRD AC-5, AC-5a, AC-6) and
 * the narrow ledger and manifest readers.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { claimIdsInText, readLedgerText } from '../src/evidence.ts'
import { governedNotCovered, matrixNotMonitored, MATRIX_SECTION_NOTE, MATRIX_SECTION_TITLE, renderReport } from '../src/report.ts'
import { validateRegistry } from '../src/validate.ts'
import { evidence, exc, registry, rel, REVIEW_DOC, source, statute } from './helpers.ts'

function report(reg = registry(), ev = evidence()): string {
  return renderReport(reg, ev, validateRegistry(reg, ev))
}

test('AC-5: CRC-eligible governed claims with no registered source are listed, with the mapping limits stated', () => {
  const reg = registry()
  const ev = evidence()
  // Adopted and CRC-eligible, unmapped: listed. Pending or Deprecated: not listed.
  assert.deepEqual(governedNotCovered(reg, ev), ['CLAIM-BETA-USE-001-v1', 'CLAIM-GAMMA-RULE-001-v1'])
  const text = report(reg, ev)
  assert.match(text, /CRC-eligible governed claims with no registered source \(2\)/)
  assert.match(text, /Information, not a failure/)
  assert.match(text, /confirmed by Test Reviewer on 2026-01-15; other dependencies may exist/)
  assert.doesNotMatch(text, /mapping is complete/i)
})

test('AC-5: an unconfirmed relationship is reported as not confirmed', () => {
  const reg = registry({ relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1', { confirmed_by: null, confirmed_on: null })] })
  assert.match(report(reg), /NOT CONFIRMED by a named human; other dependencies may exist/)
  assert.match(report(reg), /Verdict: VALID_PENDING_CONFIRMATION/)
})

test('AC-5a: the Matrix section lists exactly the CRC-eligible Matrix claims', () => {
  assert.deepEqual(matrixNotMonitored(evidence()), [
    { claim_id: 'mx-one', row_id: 'mx-one', last_verified: '2026-01-01' },
    { claim_id: 'mx-two-tiering', row_id: 'mx-two', last_verified: null },
  ])
  const text = report()
  assert.match(text, new RegExp(`## ${MATRIX_SECTION_TITLE.replace(/[()]/g, '\\$&')} \\(2\\)`))
  assert.match(text, /- mx-one \| row: mx-one \| row last verified: 2026-01-01/)
  assert.match(text, /- mx-two-tiering \| row: mx-two \| row last verified: not recorded/)
  // Not CRC-eligible (No, Pending): absent.
  assert.doesNotMatch(text, /mx-two-consent/)
  assert.doesNotMatch(text, /mx-three/)
})

test('AC-5a: with no CRC-eligible Matrix claim the section is present and explicitly empty', () => {
  const ev = evidence({ matrix: [{ identifier: 'mx-three', last_verified: null, claims: [{ claim_id: 'mx-three', crc_eligible: 'Pending' }] }] })
  const text = report(registry(), ev)
  assert.match(text, /CRC-reachable, not monitored \(Legacy Matrix\) \(0\)/)
  assert.match(text, /\(none: no Legacy Matrix claim is marked CRC-eligible\)/)
})

test('AC-5a: the Matrix section makes no statement about validity', () => {
  assert.match(MATRIX_SECTION_NOTE, /makes no statement about whether any claim is valid, current or stale/)
  assert.match(MATRIX_SECTION_NOTE, /not a governance decision/)
  const section = report().split(`## ${MATRIX_SECTION_TITLE}`)[1].replace(MATRIX_SECTION_NOTE, '')
  assert.doesNotMatch(section, /\b(valid|invalid|stale|current|cleared|safe|approved|correct)\b/i)
})

test('the Matrix section is still printed when the registry is INVALID', () => {
  const reg = registry({ relationships: [rel('alpha-terms', 'mx-one')] })
  const ev = evidence()
  const result = validateRegistry(reg, ev)
  assert.equal(result.verdict, 'INVALID')
  const text = renderReport(null, ev, result)
  assert.match(text, /matrix_identifier_not_allowed/)
  assert.match(text, /- mx-one \| row: mx-one/)
  assert.doesNotMatch(text, /## Registered sources/)
})

test('AC-6: both directions of a many-to-many mapping are reported, with exposure as read', () => {
  const ev = evidence()
  ev.runtime.push({ claim_id: 'CLAIM-ALPHA-USE-002-v1', lifecycle: 'Adopted', crc_eligible: 'Pending', tool_scope: ['alpha'], provider_scope: null })
  const reg = registry({
    sources: [source(), statute(), statute({ source_id: 'gamma-guidance', source_class: 'regulator_guidance', canonical_url: 'https://law.example/guidance', expected_final_url: 'https://law.example/guidance' })],
    relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1'), rel('alpha-terms', 'CLAIM-ALPHA-USE-002-v1'), rel('gamma-statute', 'CLAIM-GAMMA-RULE-001-v1'), rel('gamma-guidance', 'CLAIM-GAMMA-RULE-001-v1')],
    exclusions: [exc('gamma-statute', 'CLAIM-NEVER-ADOPTED-001-v2', { category: 'not_in_ledger', evidence_path: REVIEW_DOC })],
  })
  ev.manifests.set(REVIEW_DOC, ['CLAIM-NEVER-ADOPTED-001-v2'])
  const text = report(reg, ev)
  const block = (id: string) => text.split(`### ${id}\n`)[1].split('\n### ')[0]
  assert.match(block('alpha-terms'), /CLAIM-ALPHA-USE-001-v1 \| ledger lifecycle: Adopted \| CRC-eligible: Yes \| Creator Record ledger entries: CR-ENTRY-1 \(eligible: Yes, refresh by: 2027-01-01\)/)
  assert.match(block('alpha-terms'), /CLAIM-ALPHA-USE-002-v1 \| ledger lifecycle: Adopted \| CRC-eligible: Pending \| Creator Record ledger entries: none/)
  assert.match(block('gamma-statute'), /CLAIM-GAMMA-RULE-001-v1/)
  assert.match(block('gamma-guidance'), /CLAIM-GAMMA-RULE-001-v1/)
  assert.match(block('gamma-statute'), /excluded: CLAIM-NEVER-ADOPTED-001-v2 \| not a governed claim: the identifier is not in the ledger and is not approved/)
  assert.match(block('alpha-terms'), /baseline: none accepted/)
})

test('a source with no relationship says so', () => {
  const reg = registry({ sources: [source(), statute()] })
  assert.match(report(reg), /Watch-only: no dependent claim is on record for this source\. Observing it does not detect a change inside any document it links to\./)
})

// ── Narrow readers ─────────────────────────────────────────────────────────

const LEDGER_TEXT = [
  '# Ledger', '', '## Entry template', '', '```', '### CLAIM-XXX-NNN-v1', 'Lifecycle: Candidate', '```', '', '## Claims', '',
  '### CLAIM-ONE-001-v1', 'Topic: x', 'Lifecycle: Adopted', 'Prose mentioning Lifecycle: Deprecated later in a sentence.', '',
  '### CLAIM-TWO-001-v1', 'Lifecycle: Deprecated  ', '',
].join('\r\n')

test('the ledger reader takes claim headings and each entry\'s own Lifecycle line, and skips the fenced template', () => {
  const problems: string[] = []
  const map = readLedgerText(LEDGER_TEXT, problems)
  assert.deepEqual([...map], [['CLAIM-ONE-001-v1', 'Adopted'], ['CLAIM-TWO-001-v1', 'Deprecated']])
  assert.deepEqual(problems, [])
})

test('the ledger reader reports what it cannot read instead of guessing', () => {
  const problems: string[] = []
  readLedgerText('### CLAIM-ONE-001-v1\nno lifecycle here\n\n### CLAIM-TWO-001-v1\nLifecycle: Adopted\n\n### CLAIM-TWO-001-v1\nLifecycle: Adopted\n', problems)
  assert.equal(problems.length, 2)
  assert.match(problems.join(' | '), /CLAIM-ONE-001-v1 has no Lifecycle line/)
  assert.match(problems.join(' | '), /CLAIM-TWO-001-v1 appears more than once/)
  const empty: string[] = []
  readLedgerText('nothing', empty)
  assert.deepEqual(empty, ['ledger: no claims found'])
})

test('claim IDs named in manifest text are found once each', () => {
  assert.deepEqual(claimIdsInText('see `CLAIM-B-001-v2` and CLAIM-A-001-v1, again CLAIM-B-001-v2; not CLAIM-C-001'), ['CLAIM-A-001-v1', 'CLAIM-B-001-v2'])
})
