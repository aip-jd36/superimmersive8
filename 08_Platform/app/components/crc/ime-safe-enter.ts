/**
 * IME-safe Enter-to-submit decision (CRC-UI-2, 2026-09-21). Pure, no
 * React/DOM dependency -- directly unit-testable, matching the established
 * lib/crc-engine/{rate-limit-copy,wait-indicator}.ts convention of a small
 * pure decision/helper extracted specifically so it stays testable in this
 * repo's Node-only Jest environment (no jsdom/React-Testing-Library --
 * confirmed absent in CRC-UI-1's own diagnostic).
 *
 * PRODUCTION DEFECT THIS FIXES: a Traditional Chinese UAT user's IME uses
 * Return/Enter to confirm/select composed characters. CRC's existing
 * Enter-to-submit textareas treated every Enter keydown as "submit," so a
 * composition-confirming Enter could prematurely submit an incomplete
 * response before the user finished composing. This is a GENERIC IME
 * input-safety defect (Chinese/Japanese/Korean and any other
 * composition-based input method), never a Traditional-Chinese-specific
 * feature -- this module contains no locale/language detection of any
 * kind, only composition STATE.
 *
 * DETECTION STRATEGY (deliberately layered, not a single naive check):
 *   1. `nativeEvent.isComposing` -- the standard DOM signal, true exactly
 *      when a keydown occurs during an active IME composition session.
 *   2. `keyCode === 229` -- the long-standing legacy IME signal some
 *      browsers (notably older Safari) still set on a composition-related
 *      keydown even when `isComposing` itself is inconsistently reported.
 *      Never produced by an ordinary, non-IME Enter keydown, so this check
 *      adds defense-in-depth with zero risk to normal typing.
 *   3. `isComposingRef` -- a component-owned boolean toggled by
 *      `onCompositionStart`/`onCompositionEnd`, passed in as a plain
 *      boolean (not a ref object) so this function stays pure. This
 *      guards the EVENT-ORDERING case some browser/IME combinations
 *      exhibit: a composition-confirming Enter's own keydown can, in some
 *      environments, correctly report `isComposing: true` even though the
 *      DOM-level signal alone is not uniformly reliable across every
 *      browser/React version -- see this module's own test suite for the
 *      case this specifically guards against.
 *
 * Enter is treated as IME-confirmation (never submits) if ANY of the three
 * signals indicates active/just-active composition. Shift+Enter is
 * unaffected either way -- it never submitted before this change and does
 * not submit now (the browser's own default newline-insertion behavior is
 * preserved by simply not intercepting the event).
 */

export interface ImeEnterKeyLikeEvent {
  key: string
  shiftKey: boolean
  keyCode?: number
  nativeEvent?: { isComposing?: boolean }
}

/**
 * Returns true only when this keydown should trigger CRC's existing
 * Enter-to-submit behavior. Returns false for every other key, for
 * Shift+Enter (unchanged newline-insertion behavior), and for a plain
 * Enter that occurs during (or immediately signals) active IME
 * composition. Never inspects or depends on the event's `key`/composed
 * TEXT content -- this is a pure keyboard-event/composition-state
 * decision, never a language/content decision.
 */
export function shouldSubmitOnEnter(event: ImeEnterKeyLikeEvent, isComposingRef: boolean): boolean {
  if (event.key !== 'Enter' || event.shiftKey) return false
  const isComposing = isComposingRef || event.nativeEvent?.isComposing === true || event.keyCode === 229
  return !isComposing
}
