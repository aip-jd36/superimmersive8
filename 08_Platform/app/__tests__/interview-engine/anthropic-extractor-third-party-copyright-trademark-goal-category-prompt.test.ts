/**
 * GoalCategory Semantic Registration Completeness -- third_party_copyright +
 * trademark (2026-09-20).
 *
 * Historical defect this corrects: `third_party_copyright` (production-
 * represented as part of CLAIM-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001-v1) and
 * `trademark` (CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1) were both added
 * to GOAL_CATEGORIES / GOAL_CATEGORY_VALUES (mechanical, compiler-enforced
 * surfaces) but never given a corresponding `goal_category_hint` semantic
 * bullet -- the richer, model-facing prose block that actually teaches the
 * extractor what each category means and how to discriminate it from
 * neighbors. A conversational UAT scenario surfaced this: an explicit
 * "I used a clip from an existing copyrighted video I don't own" request
 * was classified `third_party_source_rights` instead, because that was the
 * only semantically-described neighboring category available to the model.
 *
 * File-scanning approach (reads the real source text), not a live model
 * call, per this repository's own established discipline (see
 * anthropic-extractor-context.test.ts's own header and the sibling
 * commercial-use prompt test this file mirrors) of never exercising a live
 * model inside a deterministic test suite. This proves the prompt TEXT
 * contains the intended guidance; it does not and cannot assert what a live
 * model would classify a given real utterance as -- that requires a real
 * eval-corpus run with model access, outside this test's scope.
 */
import * as fs from 'fs'
import * as path from 'path'

const EXTRACTOR_PATH = path.join(__dirname, '..', '..', 'lib', 'interview-engine', 'anthropic-extractor.ts')

function readExtractorSource(): string {
  return fs.readFileSync(EXTRACTOR_PATH, 'utf-8')
}

describe('third_party_copyright goal_category_hint prompt guidance', () => {
  const source = readExtractorSource()

  test('semantic bullet is present, describing third-party copyrighted material appearing in the output', () => {
    expect(source).toMatch(/"third_party_copyright":.*reproducing, or adapting someone else's pre-existing copyrighted material/)
  })

  test('bullet explicitly distinguishes third_party_copyright from third_party_source_rights', () => {
    const bulletMatch = source.match(/"third_party_copyright":[\s\S]*?(?=\n- ")/)
    expect(bulletMatch).not.toBeNull()
    const bullet = bulletMatch![0]
    expect(bullet).toContain('distinct from third_party_source_rights')
    expect(bullet).toContain('whether a license or permission from a specific source/stock provider covers the contemplated use')
  })

  test('bullet includes an example phrasing matching the semantic shape of the failed UAT scenario (Scenario 1 regression)', () => {
    expect(source).toContain('I used a clip from an existing movie I don\'t own -- what copyright issues should I think about?')
  })

  test('bullet allows both third_party_copyright and third_party_source_rights to be proposed together when a turn raises both questions', () => {
    const bulletMatch = source.match(/"third_party_copyright":[\s\S]*?(?=\n- ")/)
    expect(bulletMatch![0]).toContain('Both may be proposed for the same turn')
  })

  test('bullet contains no legal-conclusion language -- infringement, protection, ownership, authorization, license sufficiency, similarity, derivative status, fair use, or clearance are never asserted', () => {
    const bulletMatch = source.match(/"third_party_copyright":[\s\S]*?(?=\n- ")/)
    const bullet = bulletMatch![0].toLowerCase()
    const forbidden = ['infring', 'is protected', 'is not protected', 'owns the copyright', 'requires authorization', 'is not authorized', 'insufficient license', 'substantially similar', 'is a derivative work', 'fair use applies', 'fair use does not apply', 'is cleared', 'is not cleared']
    for (const phrase of forbidden) {
      expect(bullet).not.toContain(phrase)
    }
  })
})

describe('trademark goal_category_hint prompt guidance', () => {
  const source = readExtractorSource()

  test('semantic bullet is present, describing third-party brand/logo/source-identifying material appearing in the output', () => {
    expect(source).toMatch(/"trademark":.*brand name, logo, or other source-identifying material/)
  })

  test('bullet uses only the already-governed framing (matches CATEGORY_LABELS.trademark scope in rules.ts), introduces no new trademark governance', () => {
    expect(source).toContain('Can I show a real company\'s logo in this ad?')
    // Negative check: no expansion into likelihood-of-confusion multi-factor
    // doctrine, ownership, validity, or a project-specific conclusion --
    // this is intent-classification guidance only, not governed proposition
    // text (which lives in GOVERNED-CLAIMS.md / rules.ts, untouched by this
    // milestone).
    const bulletMatch = source.match(/"trademark":[\s\S]*?(?=\n- ")/)
    const bullet = bulletMatch![0].toLowerCase()
    expect(bullet).not.toContain('likelihood of confusion')
    expect(bullet).not.toContain('infring')
  })
})

describe('third_party_source_rights vs third_party_copyright discrimination (semantic intent classification)', () => {
  const source = readExtractorSource()

  test('third_party_source_rights bullet remains scoped to source/provider license-permission questions, untouched by this milestone', () => {
    expect(source).toContain('"third_party_source_rights": whether the user has sufficient rights or permission to use third-party source material')
  })

  test('the two bullets together give the model an explicit example distinguishing a license-scope question from a third-party-content-in-output question', () => {
    // third_party_source_rights side (pre-existing, untouched):
    expect(source).toContain('Can I use this Getty image in an ad?')
    // third_party_copyright side (new, this milestone):
    const bulletMatch = source.match(/"third_party_copyright":[\s\S]*?(?=\n- ")/)
    expect(bulletMatch![0]).toContain('I have a Getty license -- does it cover this?')
  })
})

describe('existing category definitions remain untouched by this milestone', () => {
  const source = readExtractorSource()

  test('commercial_use, copyright_ownership, copyrightability, likeness, unknown are unchanged', () => {
    expect(source).toContain('"copyright_ownership": who owns the copyright in the output')
    expect(source).toContain('"copyrightability": whether the output can be copyrighted at all, as a category')
    expect(source).toContain('"likeness": questions about a real person\'s face, voice, or likeness appearing in or being cloned by the output.')
    expect(source).toContain('"unknown": the goal doesn\'t clearly fit any of the above, or you\'re not confident enough to classify it.')
  })

  test('the pre-existing generic "never guess from adjacent context" guardrail is still present, unweakened', () => {
    expect(source).toContain('Never guess a specific category from adjacent context the user didn\'t actually state')
  })
})
