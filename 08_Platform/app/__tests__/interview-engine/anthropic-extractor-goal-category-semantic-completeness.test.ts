/**
 * GoalCategory Semantic Registration Completeness (2026-09-20).
 *
 * Generic invariant: every production GoalCategory available to the
 * natural-language extractor must have explicit model-facing semantic
 * grounding in the `goal_category_hint` prompt block -- not merely
 * mechanical enum membership (GOAL_CATEGORIES / GOAL_CATEGORY_VALUES, both
 * TypeScript-exhaustiveness-enforced already). This test closes the gap
 * those compiler checks cannot catch: a GoalCategory can be added to the
 * enum and still have zero semantic content in the prompt the model
 * actually reads, which is exactly what happened for `third_party_copyright`
 * and `trademark` when they were added (see the sibling
 * `anthropic-extractor-third-party-copyright-trademark-goal-category-prompt.test.ts`
 * for the historical record of that specific gap and its correction).
 *
 * Structural, not a hardcoded list: iterates the real GOAL_CATEGORIES array
 * imported from production source, so a FUTURE GoalCategory added to the
 * enum without a corresponding `"<value>":` bullet in the extractor's
 * `goal_category_hint` block fails this test automatically -- no test file
 * edit required to catch the omission next time.
 *
 * File-scanning approach (reads the real source text), not a live model
 * call, per this repository's own established discipline (see
 * anthropic-extractor-context.test.ts's own header) of never exercising a
 * live model inside a deterministic test suite.
 */
import * as fs from 'fs'
import * as path from 'path'
import { GOAL_CATEGORIES } from '../../types/interview-engine'

const EXTRACTOR_PATH = path.join(__dirname, '..', '..', 'lib', 'interview-engine', 'anthropic-extractor.ts')

function readExtractorSource(): string {
  return fs.readFileSync(EXTRACTOR_PATH, 'utf-8')
}

describe('GoalCategory semantic registration completeness', () => {
  const source = readExtractorSource()

  // 'unknown' is the deliberate catch-all/fallback category, not a real
  // information need -- it is exempted the same way the milestone's own
  // invariant scopes it ("every production GoalCategory ... describing the
  // user's information need represented by that category").
  const categoriesRequiringSemanticGrounding = GOAL_CATEGORIES.filter((c) => c !== 'unknown')

  test.each(categoriesRequiringSemanticGrounding)('GoalCategory "%s" has a goal_category_hint semantic bullet in the extractor prompt', (category) => {
    const bulletPattern = new RegExp(`- "${category}":`)
    expect(source).toMatch(bulletPattern)
  })

  test('GOAL_CATEGORIES itself still contains exactly the 8 expected values (sanity check that the array import is live, not stale)', () => {
    expect([...GOAL_CATEGORIES].sort()).toEqual(
      ['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'third_party_copyright', 'third_party_source_rights', 'trademark', 'unknown'].sort(),
    )
  })
})
