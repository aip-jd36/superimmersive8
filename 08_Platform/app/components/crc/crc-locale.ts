/**
 * CRC UI-shell locale identity + persistence (CRC-UI-1, 2026-09-18). Pure,
 * no React -- directly unit-testable, same discipline as
 * lib/crc-engine/rate-limit-copy.ts / results-gate-copy.ts.
 *
 * CORE INVARIANT: this is a browser PRESENTATION preference only. It is
 * never sent to any API route, never stored in crc_sessions, never becomes
 * a ProjectFact/UserGoal/Material Demand, and never implies a jurisdiction
 * (selecting zh-TW does NOT mean Taiwan jurisdiction -- language and
 * jurisdiction are fully independent, see guided-entry-definitions.ts's own
 * unrelated jurisdiction field). Nothing in this file reads from or writes
 * to any network request.
 *
 * Storage is dependency-injected (CrcLocaleStorage) rather than reading
 * `window.localStorage` directly, so this module stays testable in this
 * repo's existing Node-only Jest environment (no jsdom/localStorage global
 * configured -- see jest.config.js). The real browser caller
 * (CrcLocaleProvider.tsx) passes `window.localStorage`.
 */

export type CrcLocale = 'en' | 'zh-TW'

export const CRC_LOCALES: readonly CrcLocale[] = ['en', 'zh-TW']

export const DEFAULT_CRC_LOCALE: CrcLocale = 'en'

export const CRC_UI_LOCALE_STORAGE_KEY = 'crc_ui_locale'

export function isSupportedCrcLocale(value: unknown): value is CrcLocale {
  return value === 'en' || value === 'zh-TW'
}

/** Minimal Storage-shaped interface -- see module header for why this is injected rather than reading `window.localStorage` directly. */
export interface CrcLocaleStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Reads the persisted locale. Any absent, malformed, or unsupported stored
 * value fails safely to `DEFAULT_CRC_LOCALE` -- never throws, never guesses.
 * A `null`/`undefined` storage (e.g. no `window` yet, during SSR) also
 * resolves to the default rather than erroring.
 */
export function readPersistedCrcLocale(storage: CrcLocaleStorage | null | undefined): CrcLocale {
  if (!storage) return DEFAULT_CRC_LOCALE
  try {
    const raw = storage.getItem(CRC_UI_LOCALE_STORAGE_KEY)
    return isSupportedCrcLocale(raw) ? raw : DEFAULT_CRC_LOCALE
  } catch {
    return DEFAULT_CRC_LOCALE
  }
}

/**
 * Persists the locale. A storage failure (private browsing, quota, etc.)
 * is swallowed -- persistence is a convenience, never a requirement for
 * CRC to function; failing here must never break the page.
 */
export function persistCrcLocale(storage: CrcLocaleStorage | null | undefined, locale: CrcLocale): void {
  if (!storage) return
  try {
    storage.setItem(CRC_UI_LOCALE_STORAGE_KEY, locale)
  } catch {
    // fail-safe -- see module header
  }
}
