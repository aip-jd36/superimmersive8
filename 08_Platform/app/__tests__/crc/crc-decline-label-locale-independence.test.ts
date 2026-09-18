/**
 * DECLINE_LABEL locale-independence regression proof (CRC-UI-1, 2026-09-18).
 *
 * DECLINE_LABEL (app/crc/page.tsx) is ENGINE-BOUND text -- it becomes the
 * literal userText sent into runTurn() for a skip/stop action, not display
 * copy. It must NEVER read `locale`/`copy`/anything from crc-ui-copy.ts,
 * regardless of which UI language is active.
 *
 * app/crc/page.tsx is a 'use client' page component with no exported,
 * directly-callable pure function isolating this constant, and this repo's
 * Jest environment has no jsdom/React-Testing-Library (confirmed:
 * jest.config.js sets testEnvironment: 'node', @testing-library/react is
 * not installed) -- so a real component-render assertion is not available
 * as a seam here. This is therefore a deliberate, narrowly-scoped STATIC
 * SOURCE test: it reads the actual page.tsx source at test time and proves
 * the DECLINE_LABEL object literal's own source span (a) contains none of
 * the tokens that would indicate locale-dependence, and (b) still contains
 * exactly the three original, fixed English strings. This only breaks if
 * DECLINE_LABEL's own definition is edited to become locale-aware -- narrow
 * and low false-positive risk, not a brittle rendering/DOM assertion. See
 * app/crc/page.tsx's own header comment on DECLINE_LABEL for the full
 * invariant this test guards.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

function extractDeclineLabelSource(): string {
  const source = readFileSync(join(__dirname, '../../app/crc/page.tsx'), 'utf8')
  const match = source.match(/const DECLINE_LABEL = \{[\s\S]*?\} as const/)
  if (!match) {
    throw new Error('DECLINE_LABEL declaration not found in app/crc/page.tsx -- update this test if it was intentionally restructured')
  }
  return match[0]
}

describe('DECLINE_LABEL remains locale-independent (10. engine-bound text is unchanged regardless of UI locale)', () => {
  test('the DECLINE_LABEL declaration itself references no locale/copy/dictionary token', () => {
    const declSource = extractDeclineLabelSource()
    const forbiddenTokens = ['locale', 'copy.', 'copy[', 'getCrcUiCopy', 'zh-TW', 'crc-ui-copy', 'useCrcLocale']
    for (const token of forbiddenTokens) {
      expect(declSource).not.toContain(token)
    }
  })

  test('the three fixed English decline strings are present, unmodified, exactly as route.ts must also carry them', () => {
    const declSource = extractDeclineLabelSource()
    expect(declSource).toContain("skip_question: \"Let's skip this question.\"")
    expect(declSource).toContain("skip_phase: \"Let's skip this section.\"")
    expect(declSource).toContain("stop_interview: \"I'd like to stop here.\"")
  })

  test('DECLINE_LABEL is declared at module scope (outside any component function), so it cannot structurally close over a per-render locale value', () => {
    const source = readFileSync(join(__dirname, '../../app/crc/page.tsx'), 'utf8')
    const declineIndex = source.indexOf('const DECLINE_LABEL')
    const firstComponentIndex = source.indexOf('function CrcPageContent')
    expect(declineIndex).toBeGreaterThan(-1)
    expect(firstComponentIndex).toBeGreaterThan(-1)
    expect(declineIndex).toBeLessThan(firstComponentIndex)
  })
})

describe('18. visible skip/stop button labels are localizable independently from DECLINE_LABEL', () => {
  test('the copy dictionary defines its own, separate skipQuestion/skipSection/stop keys, distinct in content from DECLINE_LABEL', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCrcUiCopy } = require('../../components/crc/crc-ui-copy')
    const en = getCrcUiCopy('en')
    const zh = getCrcUiCopy('zh-TW')
    // The VISIBLE button label ("Skip question") is intentionally shorter/
    // different wording from the ENGINE-BOUND decline text ("Let's skip
    // this question.") -- proving they are genuinely separate strings, not
    // the same value read from two places.
    expect(en.skipQuestion).toBe('Skip question')
    expect(en.skipQuestion).not.toBe("Let's skip this question.")
    expect(zh.skipQuestion).not.toBe(en.skipQuestion)
  })
})
