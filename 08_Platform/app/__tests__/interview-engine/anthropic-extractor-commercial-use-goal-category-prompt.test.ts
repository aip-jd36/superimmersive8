/**
 * Generic Regulatory Commercial-Use Goal Classification Remediation
 * (2026-09-10) -- prompt-content test.
 *
 * This repository's own established discipline (see
 * anthropic-extractor-context.test.ts's own header) is to never exercise a
 * live model inside a deterministic test suite -- `SYSTEM_PROMPT` is a
 * module-private constant with no exported handle, and this project has no
 * eval-corpus infrastructure that runs inside CI. Consistent with that
 * discipline, this test does NOT (and cannot) assert what a live model
 * would classify a given goal as -- it deterministically verifies that the
 * deployed prompt TEXT itself contains the intended widened
 * `commercial_use` guidance and its anti-overclassification guardrail, by
 * reading the real source file directly (same file-scanning approach
 * topic-claims-fixture-consistency.test.ts already uses for a different
 * file). Behavioral validation of live classification requires a real
 * eval-corpus run with model access, outside this test's scope.
 */
import * as fs from 'fs'
import * as path from 'path'

const EXTRACTOR_PATH = path.join(__dirname, '..', '..', 'lib', 'interview-engine', 'anthropic-extractor.ts')

function readExtractorSource(): string {
  return fs.readFileSync(EXTRACTOR_PATH, 'utf-8')
}

describe('commercial_use goal_category_hint prompt guidance -- generic regulatory/compliance widening', () => {
  const source = readExtractorSource()

  test('widened definition is present, generically, not naming any jurisdiction or statute', () => {
    expect(source).toMatch(/"commercial_use":.*rules, restrictions, requirements, permissions, or compliance conditions/)
    expect(source).not.toMatch(/396-b|396b|New York-specific|NY-specific/)
  })

  test('positive example phrasings from the failed-UAT corpus are present in the guidance', () => {
    expect(source).toContain('Are there any rules I should know about before using this commercially?')
    expect(source).toContain('Is there anything I need to comply with before this goes to my client?')
  })

  test('anti-overclassification guardrail is present, with negative examples', () => {
    expect(source).toMatch(/must itself be about a condition on commercial use, not merely occur in a turn that also mentions something commercial/)
    expect(source).toContain('What law created the FTC?')
    expect(source).toContain('Summarize the EU AI Act')
    expect(source).toContain('Which jurisdiction is New York in?')
  })

  test('existing category definitions (copyright_ownership, copyrightability, likeness, third_party_source_rights, unknown) are untouched', () => {
    expect(source).toContain('"copyright_ownership": who owns the copyright in the output')
    expect(source).toContain('"copyrightability": whether the output can be copyrighted at all, as a category')
    expect(source).toContain('"likeness": questions about a real person\'s face, voice, or likeness appearing in or being cloned by the output.')
    expect(source).toContain('"third_party_source_rights": whether the user has sufficient rights or permission to use third-party source material')
    expect(source).toContain('"unknown": the goal doesn\'t clearly fit any of the above, or you\'re not confident enough to classify it.')
  })

  test('the pre-existing generic "never guess from adjacent context" guardrail is still present, unweakened', () => {
    expect(source).toContain('Never guess a specific category from adjacent context the user didn\'t actually state')
  })
})
