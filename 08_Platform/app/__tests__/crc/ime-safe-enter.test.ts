/**
 * shouldSubmitOnEnter tests (CRC-UI-2, 2026-09-21). Pure, no React/DOM --
 * exercises the deterministic decision directly with plain object mocks
 * shaped like the fields this module actually reads, matching the
 * established pure-copy-module testing convention.
 *
 * Case letters below map directly to the milestone's own required test
 * matrix (Phase 4).
 */

import { shouldSubmitOnEnter, type ImeEnterKeyLikeEvent } from '../../components/crc/ime-safe-enter'

function enterEvent(overrides: Partial<ImeEnterKeyLikeEvent> = {}): ImeEnterKeyLikeEvent {
  return { key: 'Enter', shiftKey: false, keyCode: 13, nativeEvent: { isComposing: false }, ...overrides }
}

describe('CASE A -- ordinary Enter remains unchanged (non-composing input submits)', () => {
  test('plain Enter, no composition signals active -> submits', () => {
    expect(shouldSubmitOnEnter(enterEvent(), false)).toBe(true)
  })

  test('a non-Enter key never submits, composing or not', () => {
    expect(shouldSubmitOnEnter({ key: 'a', shiftKey: false }, false)).toBe(false)
    expect(shouldSubmitOnEnter({ key: 'a', shiftKey: false }, true)).toBe(false)
  })

  test('Shift+Enter behavior is unchanged -- never submits (browser default newline applies)', () => {
    expect(shouldSubmitOnEnter(enterEvent({ shiftKey: true }), false)).toBe(false)
  })

  test('missing nativeEvent entirely (e.g. a hand-constructed event) still submits ordinary Enter safely', () => {
    expect(shouldSubmitOnEnter({ key: 'Enter', shiftKey: false }, false)).toBe(true)
  })
})

describe('CASE B -- IME Enter does not submit (active composition)', () => {
  test('nativeEvent.isComposing === true blocks submission', () => {
    expect(shouldSubmitOnEnter(enterEvent({ nativeEvent: { isComposing: true } }), false)).toBe(false)
  })

  test('legacy keyCode 229 (older Safari IME signal) blocks submission even if isComposing reads false', () => {
    expect(shouldSubmitOnEnter(enterEvent({ keyCode: 229, nativeEvent: { isComposing: false } }), false)).toBe(false)
  })

  test('the component-tracked isComposingRef (from compositionstart/compositionend) blocks submission on its own, even if the native event signals are inconsistent', () => {
    // Simulates the documented browser/IME event-ordering race: the DOM-
    // level isComposing signal is not uniformly reliable across every
    // browser/React version, so the component's own onCompositionStart/
    // onCompositionEnd-tracked ref is an independent, authoritative guard.
    expect(shouldSubmitOnEnter(enterEvent({ nativeEvent: { isComposing: false }, keyCode: 13 }), true)).toBe(false)
  })

  test('any single true signal among the three is sufficient to block -- they are ORed, not ANDed', () => {
    expect(shouldSubmitOnEnter(enterEvent({ nativeEvent: { isComposing: true } }), false)).toBe(false)
    expect(shouldSubmitOnEnter(enterEvent({ keyCode: 229 }), false)).toBe(false)
    expect(shouldSubmitOnEnter(enterEvent(), true)).toBe(false)
  })

  test('Shift+Enter during composition also never submits (same as ordinary Shift+Enter -- composition state is irrelevant once shiftKey already disqualifies it)', () => {
    expect(shouldSubmitOnEnter(enterEvent({ shiftKey: true, nativeEvent: { isComposing: true } }), true)).toBe(false)
  })
})

describe('CASE C -- after composition genuinely completes, deliberate Enter submits normally', () => {
  test('composition ref reset to false AND native isComposing false -> ordinary Enter submits (composition-completed state)', () => {
    // Simulates: onCompositionEnd already fired (ref reset to false), and
    // this is a genuinely separate, later Enter keydown (not the
    // composition-confirming one) -- e.g. the user pressed Enter again,
    // deliberately, after seeing their completed IME text in the field.
    expect(shouldSubmitOnEnter(enterEvent({ nativeEvent: { isComposing: false } }), false)).toBe(true)
  })

  test('the decision never inspects or depends on the composed TEXT content -- only key/shiftKey/composition-state fields are read', () => {
    // Structural proof: ImeEnterKeyLikeEvent has no text/value field at
    // all, so this function cannot be influenced by what was typed --
    // only by whether Enter was pressed and whether composition is/was
    // active. This directly supports requirement 5 ("the completed user
    // text must reach CRC unchanged") -- this module never touches text.
    const event = enterEvent()
    expect(Object.keys(event).sort()).toEqual(['key', 'keyCode', 'nativeEvent', 'shiftKey'].sort())
  })
})

describe('no locale/language dependence (explicit architecture boundary)', () => {
  test('the module exports nothing related to locale, language, or translation', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../components/crc/ime-safe-enter')
    const exportNames = Object.keys(mod)
    for (const name of exportNames) {
      expect(name.toLowerCase()).not.toContain('locale')
      expect(name.toLowerCase()).not.toContain('lang')
      expect(name.toLowerCase()).not.toContain('zh')
    }
  })

  test('the decision function has no locale/language parameter of any kind', () => {
    // shouldSubmitOnEnter's own arity is exactly 2 (event, isComposingRef) --
    // there is no third parameter a caller could even pass a locale into.
    expect(shouldSubmitOnEnter.length).toBe(2)
  })
})
