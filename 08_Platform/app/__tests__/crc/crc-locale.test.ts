/**
 * crc-locale.ts tests (CRC-UI-1, 2026-09-18). Pure, no React/DOM -- uses a
 * fake in-memory Storage-shaped object, since this repo's Jest environment
 * is Node-only (no jsdom/localStorage global -- see jest.config.js).
 */

import {
  type CrcLocale,
  type CrcLocaleStorage,
  CRC_LOCALES,
  DEFAULT_CRC_LOCALE,
  CRC_UI_LOCALE_STORAGE_KEY,
  isSupportedCrcLocale,
  readPersistedCrcLocale,
  persistCrcLocale,
} from '../../components/crc/crc-locale'

function fakeStorage(initial: Record<string, string> = {}): CrcLocaleStorage {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  }
}

describe('CrcLocale identity', () => {
  test('1. supported locales are exactly en + zh-TW', () => {
    expect(CRC_LOCALES).toEqual(['en', 'zh-TW'])
  })

  test('isSupportedCrcLocale accepts only the two supported values', () => {
    expect(isSupportedCrcLocale('en')).toBe(true)
    expect(isSupportedCrcLocale('zh-TW')).toBe(true)
    expect(isSupportedCrcLocale('zh-CN')).toBe(false)
    expect(isSupportedCrcLocale('fr')).toBe(false)
    expect(isSupportedCrcLocale(null)).toBe(false)
    expect(isSupportedCrcLocale(undefined)).toBe(false)
    expect(isSupportedCrcLocale(123)).toBe(false)
  })

  test('default locale is English', () => {
    expect(DEFAULT_CRC_LOCALE).toBe('en')
  })
})

describe('readPersistedCrcLocale', () => {
  test('no storage (null/undefined) resolves to English', () => {
    expect(readPersistedCrcLocale(null)).toBe('en')
    expect(readPersistedCrcLocale(undefined)).toBe('en')
  })

  test('empty storage resolves to English', () => {
    expect(readPersistedCrcLocale(fakeStorage())).toBe('en')
  })

  test('a validly persisted zh-TW value is read back correctly', () => {
    const storage = fakeStorage({ [CRC_UI_LOCALE_STORAGE_KEY]: 'zh-TW' })
    expect(readPersistedCrcLocale(storage)).toBe('zh-TW')
  })

  test('a validly persisted en value is read back correctly', () => {
    const storage = fakeStorage({ [CRC_UI_LOCALE_STORAGE_KEY]: 'en' })
    expect(readPersistedCrcLocale(storage)).toBe('en')
  })

  test('8. an unsupported persisted value fails safely to English', () => {
    const storage = fakeStorage({ [CRC_UI_LOCALE_STORAGE_KEY]: 'zh-CN' })
    expect(readPersistedCrcLocale(storage)).toBe('en')
  })

  test('a garbage/malformed persisted value fails safely to English', () => {
    const storage = fakeStorage({ [CRC_UI_LOCALE_STORAGE_KEY]: '<script>alert(1)</script>' })
    expect(readPersistedCrcLocale(storage)).toBe('en')
  })

  test('9. a storage that throws on read is fail-safe, not a crash', () => {
    const throwingStorage: CrcLocaleStorage = {
      getItem: () => {
        throw new Error('storage unavailable')
      },
      setItem: () => {},
    }
    expect(readPersistedCrcLocale(throwingStorage)).toBe('en')
  })
})

describe('persistCrcLocale', () => {
  test('writes the locale under the expected key', () => {
    const storage = fakeStorage()
    persistCrcLocale(storage, 'zh-TW')
    expect(storage.getItem(CRC_UI_LOCALE_STORAGE_KEY)).toBe('zh-TW')
  })

  test('no-op on null/undefined storage -- does not throw', () => {
    expect(() => persistCrcLocale(null, 'en')).not.toThrow()
    expect(() => persistCrcLocale(undefined, 'zh-TW')).not.toThrow()
  })

  test('9. a storage that throws on write is fail-safe, not a crash', () => {
    const throwingStorage: CrcLocaleStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }
    expect(() => persistCrcLocale(throwingStorage, 'en')).not.toThrow()
  })

  test('round-trip: persist then read returns the same locale', () => {
    const storage = fakeStorage()
    const locale: CrcLocale = 'zh-TW'
    persistCrcLocale(storage, locale)
    expect(readPersistedCrcLocale(storage)).toBe(locale)
  })
})
