/**
 * Candidate-Generator Token-Budget milestone (2026-08-25). Pins the exact
 * production max_tokens ceilings for all three real-model Anthropic
 * adapters (candidate_generator, decider, extractor) via source-text
 * assertion rather than importing/exporting the private module-level
 * consts -- deliberately: this milestone is authorized to change ONLY
 * candidate_generator's own ceilings, and must not widen anthropic-
 * decision.ts's or anthropic-extractor.ts's exports (or touch those files
 * at all) merely to make their constants importable. A locked source-text
 * regex is a narrower, zero-footprint way to guard against silent drift on
 * the two files this milestone must never modify, while still directly
 * asserting the candidate-generator values this milestone DOES change.
 *
 * Not a behavioral test (no Anthropic call, no mock) -- see
 * anthropic-structured-output-retry.test.ts for the adapter-agnostic
 * retry-mechanism coverage (exactly-one-retry, retry uses the higher
 * ceiling, input/prompt/model/schema unchanged between attempts,
 * fail-closed after both attempts miss) that already covers candidate_
 * generator and decider identically and is unmodified, still passing,
 * by this milestone.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

function readAdapterSource(filename: string): string {
  return readFileSync(join(__dirname, '..', '..', 'lib', 'interview-engine', filename), 'utf-8')
}

describe('Candidate-generator token-budget correction (2026-08-25)', () => {
  const source = readAdapterSource('anthropic-candidate-question.ts')

  test('A: BASE_CANDIDATE_QUESTION_MAX_TOKENS is 3072', () => {
    expect(source).toMatch(/const BASE_CANDIDATE_QUESTION_MAX_TOKENS = 3072\b/)
  })

  test('B: RETRY_CANDIDATE_QUESTION_MAX_TOKENS is 4096', () => {
    expect(source).toMatch(/const RETRY_CANDIDATE_QUESTION_MAX_TOKENS = 4096\b/)
  })

  test('candidate_generator no longer claims to share the decider\'s sizing rationale', () => {
    expect(source).not.toMatch(/Same sizing rationale as the decider/)
  })
})

describe('Sibling adapters unchanged by the candidate-generator correction', () => {
  test('C: decider ceilings remain 1024 base / 2048 retry (anthropic-decision.ts untouched)', () => {
    const source = readAdapterSource('anthropic-decision.ts')
    expect(source).toMatch(/const BASE_DECISION_MAX_TOKENS = 1024\b/)
    expect(source).toMatch(/const RETRY_DECISION_MAX_TOKENS = 2048\b/)
  })

  test('D: extractor ceilings remain 3072 base / 4096 retry (anthropic-extractor.ts untouched)', () => {
    const source = readAdapterSource('anthropic-extractor.ts')
    expect(source).toMatch(/const BASE_EXTRACTION_MAX_TOKENS = 3072\b/)
    expect(source).toMatch(/const RETRY_EXTRACTION_MAX_TOKENS = 4096\b/)
  })
})
