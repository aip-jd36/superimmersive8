/**
 * CRC-UI-2 wiring proof (2026-09-21) -- app/crc/page.tsx is a 'use client'
 * page component; this repo's Jest environment is Node-only (no jsdom/
 * React-Testing-Library, confirmed in CRC-UI-1's own diagnostic), so a
 * real component-render assertion is not available as a seam here. This
 * is therefore a deliberate, narrowly-scoped STATIC SOURCE test -- same
 * discipline as crc-decline-label-locale-independence.test.ts -- proving
 * two structural facts directly from the committed source that a
 * component-rendering test would otherwise prove: (1) the explicit Send/
 * results-email-submit buttons and both textareas' own onChange handlers
 * were not altered by this milestone (CASE D + requirement 5: completed
 * text reaches CRC unchanged), and (2) both Enter-to-submit textareas are
 * actually wired through shouldSubmitOnEnter with per-field composition
 * tracking, not merely defined-but-unused.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

function pageSource(): string {
  return readFileSync(join(__dirname, '../../app/crc/page.tsx'), 'utf8')
}

describe('CASE D -- explicit Send / results-email-submit button behavior is unchanged', () => {
  test('the main Send button still calls handleSend on click, unconditionally on composition state', () => {
    const source = pageSource()
    expect(source).toContain('<Button type="button" disabled={phase === \'sending\' || inputText.trim().length === 0} onClick={handleSend}>')
  })

  test('the results-email submit button still calls handleResultsEmailSubmit on click, unconditionally on composition state', () => {
    const source = pageSource()
    expect(source).toContain('onClick={handleResultsEmailSubmit}')
  })
})

describe('requirement 5 -- completed user text reaches CRC unchanged (onChange handlers untouched)', () => {
  test('the main reply textarea onChange still writes the raw event value verbatim to inputText', () => {
    const source = pageSource()
    expect(source).toContain('onChange={(e) => setInputText(e.target.value)}')
  })

  test('the results-email textarea onChange still writes the raw event value verbatim to resultsEmailInput', () => {
    const source = pageSource()
    expect(source).toContain('onChange={(e) => setResultsEmailInput(e.target.value)}')
  })
})

describe('both Enter-to-submit textareas are actually wired through the IME-safe guard', () => {
  test('shouldSubmitOnEnter is imported from the new pure module', () => {
    const source = pageSource()
    expect(source).toContain("import { shouldSubmitOnEnter } from '@/components/crc/ime-safe-enter'")
  })

  test('the main reply textarea keydown handler is gated by shouldSubmitOnEnter with its own composition ref, and tracks composition via onCompositionStart/onCompositionEnd', () => {
    const source = pageSource()
    expect(source).toContain('shouldSubmitOnEnter(e, isComposingReplyRef.current)')
    expect(source).toContain('isComposingReplyRef.current = true')
    expect(source).toContain('isComposingReplyRef.current = false')
  })

  test('the results-email textarea keydown handler is gated by shouldSubmitOnEnter with its OWN, separate composition ref', () => {
    const source = pageSource()
    expect(source).toContain('shouldSubmitOnEnter(e, isComposingEmailRef.current)')
    expect(source).toContain('isComposingEmailRef.current = true')
    expect(source).toContain('isComposingEmailRef.current = false')
  })

  test('the two composition refs are genuinely independent (not the same ref reused across both fields)', () => {
    const source = pageSource()
    expect(source).toContain('const isComposingReplyRef = useRef(false)')
    expect(source).toContain('const isComposingEmailRef = useRef(false)')
  })

  test('the Guided Entry concern textarea and the feedback textarea are NOT touched by this milestone -- neither had Enter-to-submit before, and neither gains a composition guard now (out of the defect class, per this milestone\'s own scope boundary)', () => {
    const entryFlowSource = readFileSync(join(__dirname, '../../components/crc/CrcEntryFlow.tsx'), 'utf8')
    expect(entryFlowSource).not.toContain('shouldSubmitOnEnter')
    expect(entryFlowSource).not.toContain('isComposing')
    const pageSrc = pageSource()
    // The feedback textarea (placeholder copy.feedbackPlaceholder) has no
    // onKeyDown at all in the original implementation and must still have
    // none now -- confirmed by locating its own placeholder prop and
    // checking no onKeyDown/onComposition* appears between it and the
    // next Textarea/closing tag.
    const feedbackTextareaIndex = pageSrc.indexOf('placeholder={copy.feedbackPlaceholder}')
    expect(feedbackTextareaIndex).toBeGreaterThan(-1)
    const feedbackBlock = pageSrc.slice(feedbackTextareaIndex, feedbackTextareaIndex + 200)
    expect(feedbackBlock).not.toContain('onKeyDown')
    expect(feedbackBlock).not.toContain('onComposition')
  })
})
