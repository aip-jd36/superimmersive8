/**
 * CAH-4I.4D — Section3Evidence clean-state presentation regression guard.
 *
 * `Section3Evidence.tsx`'s `S2Banner` `warn` prop is computed inline in JSX
 * (e.g. `warn: !!section2.logos_observed && section2.logos_observed !== 'No'`)
 * for three fields whose real "clean" sentinel is never the literal string
 * `'No'` — `logos_observed`/`trademarks_observed` use the shared `PRESENCE`
 * enum (`'None observed'`), and `real_likeness_suspected` uses its own,
 * separately-typed enum (`'None identified'`) — confirmed by direct read of
 * `Section2Visual.tsx` across CAH-4I.4A/4B/4C. Comparing against `'No'`
 * means the condition is always true for any non-empty value, so the clean
 * state renders with the same adverse (amber) banner styling as a genuinely
 * concerning observation.
 *
 * There is no component-rendering test convention anywhere in this repo
 * (`jest.config.js` uses `testEnvironment: 'node'`; no `@testing-library/react`
 * dependency exists). Introducing one for a four-line string-literal fix
 * would be disproportionate infrastructure for the size of this bug, so this
 * test discriminates the defect directly against the component's own source
 * text instead — the smallest test that can actually fail against the
 * current implementation and pass only once every affected comparison uses
 * its field's real canonical clean value. It intentionally does not touch or
 * import runtime code; it only reads the file the same way a reviewer of
 * this diff would.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const SOURCE_PATH = join(
  __dirname,
  '../../app/admin/submissions/[id]/review/Section3Evidence.tsx',
)
const source = readFileSync(SOURCE_PATH, 'utf8')

/**
 * Finds every `warn: ... field !== 'sentinel'` comparison for a given
 * observation field and returns the literal sentinel string each one
 * compares against. A field referenced in more than one control's banner
 * (e.g. `logos_observed` appears in both I01 and I03) must return the same
 * correct sentinel at every occurrence.
 */
function warnSentinelsFor(field: string): string[] {
  const pattern = new RegExp(
    `section2\\.${field}\\s*&&\\s*section2\\.${field}\\s*!==\\s*'([^']*)'`,
    'g',
  )
  const found: string[] = []
  let m: RegExpExecArray | null
  while ((m = pattern.exec(source)) !== null) {
    found.push(m[1])
  }
  return found
}

describe('Section3Evidence — clean-observation-state warn comparisons', () => {
  it('logos_observed is compared against its real clean sentinel ("None observed"), every occurrence', () => {
    const sentinels = warnSentinelsFor('logos_observed')
    expect(sentinels.length).toBeGreaterThan(0)
    for (const s of sentinels) expect(s).toBe('None observed')
  })

  it('trademarks_observed is compared against its real clean sentinel ("None observed")', () => {
    const sentinels = warnSentinelsFor('trademarks_observed')
    expect(sentinels.length).toBeGreaterThan(0)
    for (const s of sentinels) expect(s).toBe('None observed')
  })

  it('real_likeness_suspected is compared against its OWN real clean sentinel ("None identified"), not the shared PRESENCE sentinel', () => {
    const sentinels = warnSentinelsFor('real_likeness_suspected')
    expect(sentinels.length).toBeGreaterThan(0)
    for (const s of sentinels) expect(s).toBe('None identified')
  })

  it('the literal string \'No\' is never used as a warn-comparison sentinel anywhere in this file (the proven defect, fully eliminated)', () => {
    expect(source).not.toMatch(/!==\s*'No'/)
  })

  it('regression guard: the already-correct comparisons (copyrighted_artwork, music_heard) are unchanged', () => {
    expect(warnSentinelsFor('copyrighted_artwork')).toEqual(['None observed'])
    expect(warnSentinelsFor('music_heard')).toEqual(['None'])
  })
})
