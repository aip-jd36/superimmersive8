/**
 * Candidate Provenance Reference Primitive tests (LK-17, 2026-08-30).
 * Synthetic candidate data only -- no Synthesia, Stock, Music, Likeness, real
 * provider, or real governed claim anywhere in this file. The synthetic
 * TopicClaim used in test 11 exists only to prove composability with LK-13's
 * readiness primitive; it is never written to any production fixture.
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  buildCandidateProvenanceReference,
  formatCandidateProvenanceReference,
  type CandidateProvenanceReference,
} from '@/lib/candidate-provenance/reference'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { checkTopicClaimRepresentationReadiness } from '@/lib/representation-readiness/topic-claim-readiness'

const VALID_PATH = '06_Operations/institutional-knowledge/notebook/example-domain-review-package.candidate.ts'
const VALID_COMMIT = 'eef90900254b6a442b14fb9a92f77d798fb63657'

// ── 1-4: valid construction ──────────────────────────────────────────────────

describe('valid construction', () => {
  test('1: a valid repository-relative candidate path is accepted', () => {
    const result = buildCandidateProvenanceReference(VALID_PATH, VALID_COMMIT)
    expect(result.valid).toBe(true)
  })

  test('2: a valid git commit identity is accepted', () => {
    const result = buildCandidateProvenanceReference(VALID_PATH, VALID_COMMIT)
    expect(result.issues).toEqual([])
  })

  test('3: the result preserves the exact path, unmodified', () => {
    const result = buildCandidateProvenanceReference(VALID_PATH, VALID_COMMIT)
    expect(result.reference?.candidate_path).toBe(VALID_PATH)
  })

  test('4: the result preserves the exact commit identity, unmodified', () => {
    const result = buildCandidateProvenanceReference(VALID_PATH, VALID_COMMIT)
    expect(result.reference?.commit).toBe(VALID_COMMIT)
  })
})

// ── 5-8: rejections ──────────────────────────────────────────────────────────

describe('rejections', () => {
  test('5: an absolute POSIX path is rejected', () => {
    const result = buildCandidateProvenanceReference('/tmp/candidate.ts', VALID_COMMIT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual({ code: 'invalid_candidate_path', path: 'candidate_path', value: '/tmp/candidate.ts' })
  })

  test('6: an absolute Windows path is rejected', () => {
    const result = buildCandidateProvenanceReference('C:\\Users\\dev\\candidate.ts', VALID_COMMIT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual({ code: 'invalid_candidate_path', path: 'candidate_path', value: 'C:\\Users\\dev\\candidate.ts' })
  })

  test('6b: a UNC-style Windows path is rejected', () => {
    const result = buildCandidateProvenanceReference('\\\\server\\share\\candidate.ts', VALID_COMMIT)
    expect(result.valid).toBe(false)
    expect(result.issues[0].code).toBe('invalid_candidate_path')
  })

  test('7: an empty path is rejected', () => {
    const result = buildCandidateProvenanceReference('', VALID_COMMIT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual({ code: 'invalid_candidate_path', path: 'candidate_path', value: '' })
  })

  test('8: an empty commit is rejected', () => {
    const result = buildCandidateProvenanceReference(VALID_PATH, '')
    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual({ code: 'invalid_commit', path: 'commit', value: '' })
  })

  test('both invalid at once produces both issues, reference null', () => {
    const result = buildCandidateProvenanceReference('/tmp/x.ts', '')
    expect(result).toEqual({
      valid: false,
      issues: [
        { code: 'invalid_candidate_path', path: 'candidate_path', value: '/tmp/x.ts' },
        { code: 'invalid_commit', path: 'commit', value: '' },
      ],
      reference: null,
    })
  })
})

// ── 9: no mutation ────────────────────────────────────────────────────────

test('9: repeated construction is independent -- no shared/mutated state across calls', () => {
  const first = buildCandidateProvenanceReference(VALID_PATH, VALID_COMMIT)
  const second = buildCandidateProvenanceReference('some/other/path.ts', 'a'.repeat(40))
  expect(first.reference?.candidate_path).toBe(VALID_PATH)
  expect(second.reference?.candidate_path).toBe('some/other/path.ts')
  expect(first.reference).not.toBe(second.reference)
})

// ── 10: no governance/adoption/CRC/legal fields ─────────────────────────────

test('10: the result contains no governance/Adoption/CRC/legal field of any kind', () => {
  const result = buildCandidateProvenanceReference(VALID_PATH, VALID_COMMIT)
  expect(Object.keys(result)).toEqual(['valid', 'issues', 'reference'])
  expect(Object.keys(result.reference as CandidateProvenanceReference)).toEqual(['candidate_path', 'commit'])
  const serialized = JSON.stringify(result).toLowerCase()
  for (const forbidden of ['adopt', 'reject', 'crc', 'unsafe', 'commercial', 'legal', 'fgr', 'lifecycle']) {
    expect(serialized).not.toContain(forbidden)
  }
})

// ── format() convention ──────────────────────────────────────────────────────

test('formatCandidateProvenanceReference renders the proposed "Candidate Representation: <path> @ <commit>" convention exactly', () => {
  const result = buildCandidateProvenanceReference(VALID_PATH, VALID_COMMIT)
  expect(formatCandidateProvenanceReference(result.reference as CandidateProvenanceReference)).toBe(
    `Candidate Representation: ${VALID_PATH} @ ${VALID_COMMIT}`,
  )
})

// ── 11: composability with LK-13 readiness (no coupling) ───────────────────

describe('11: composability with representation readiness, proven without production coupling', () => {
  test('a synthetic TopicClaim independently passes representation readiness, and a provenance reference can separately be built for it', () => {
    const syntheticCandidate: TopicClaim = {
      claim_id: 'CAND-SYNTHETIC-EXAMPLE-001-v1',
      topic: 'commercial_use',
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Candidate',
      crc_eligible: 'Pending',
      crc_publication_scope: null,
      crc_candidate_statement: 'Synthetic example statement, never real governed knowledge.',
      applicability_requirements: [],
      unresolved_project_dependencies: [],
      provider_scope: null,
      tool_scope: null,
      last_verified: null,
      superseded_by: null,
    }

    const readiness = checkTopicClaimRepresentationReadiness(syntheticCandidate)
    expect(readiness).toEqual({ ready: true, issues: [] })

    const provenance = buildCandidateProvenanceReference('06_Operations/institutional-knowledge/notebook/SYNTHETIC-EXAMPLE.candidate.ts', VALID_COMMIT)
    expect(provenance.valid).toBe(true)
  })
})

// ── 12-16: static decoupling proofs (mirrors subsystem-boundaries.test.ts's own technique) ──

const REFERENCE_MODULE_PATH = path.join(__dirname, '..', '..', 'lib', 'candidate-provenance', 'reference.ts')
const READINESS_MODULE_PATH = path.join(__dirname, '..', '..', 'lib', 'representation-readiness', 'topic-claim-readiness.ts')

function sourceOf(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}

test('12: provenance construction does not invoke or import representation readiness (static source scan)', () => {
  const source = sourceOf(REFERENCE_MODULE_PATH)
  const importLines = source.match(/^import .+$/gm) ?? []
  const importText = importLines.join('\n')
  expect(importText).not.toMatch(/representation-readiness/i)
  expect(importText).not.toMatch(/checkTopicClaimRepresentationReadiness/i)
})

test('13: representation readiness does not import or create candidate provenance (static source scan)', () => {
  const source = sourceOf(READINESS_MODULE_PATH)
  const importLines = source.match(/^import .+$/gm) ?? []
  const importText = importLines.join('\n')
  expect(importText).not.toMatch(/candidate-provenance/i)
})

test('14: the provenance module imports no production fixture', () => {
  const importText = (sourceOf(REFERENCE_MODULE_PATH).match(/^import .+$/gm) ?? []).join('\n')
  expect(importText).not.toMatch(/fixture/i)
})

test('15: the provenance module imports no governance markdown location', () => {
  const importText = (sourceOf(REFERENCE_MODULE_PATH).match(/^import .+$/gm) ?? []).join('\n')
  expect(importText).not.toMatch(/GOVERNED-CLAIMS/i)
  expect(importText).not.toMatch(/PLATFORM-RIGHTS-MATRIX/i)
})

test('16: the provenance module imports no retrieval execution logic', () => {
  const importText = (sourceOf(REFERENCE_MODULE_PATH).match(/^import .+$/gm) ?? []).join('\n')
  expect(importText).not.toMatch(/retrieval-engine\/(retrieve|lookup-rows|enumerate-eligible-claims)/i)
  // The provenance module has zero imports at all today -- this also proves
  // the stronger property directly, not merely the narrower absence checks above.
  expect(sourceOf(REFERENCE_MODULE_PATH)).not.toMatch(/^import /m)
})
