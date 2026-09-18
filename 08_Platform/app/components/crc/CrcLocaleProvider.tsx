'use client'

/**
 * CRC UI-shell locale Context (CRC-UI-1, 2026-09-18). Page-scoped only --
 * wraps the /crc route tree, never app/layout.tsx -- so Guided Entry,
 * setup, conversation, and Results Gate share one locale value without
 * prop drilling, while every other Creator Portal surface is entirely
 * unaffected (no global/root state is introduced).
 *
 * Locale changes here are pure client-side presentation state: no fetch()
 * call, no runTurn() invocation, no mutation of any message/session state.
 * Persistence (crc-locale.ts) and the copy dictionary (crc-ui-copy.ts) are
 * both pure and independently tested; this file's only job is to hold the
 * current value in React state, initialize it from localStorage once on
 * mount, persist changes back, and keep `document.documentElement.lang`
 * in sync (accessibility/presentation only -- never routing).
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type CrcLocale, DEFAULT_CRC_LOCALE, readPersistedCrcLocale, persistCrcLocale } from './crc-locale'
import { getCrcUiCopy, type CrcUiCopy } from './crc-ui-copy'

interface CrcLocaleContextValue {
  locale: CrcLocale
  setLocale: (locale: CrcLocale) => void
  copy: CrcUiCopy
}

const CrcLocaleContext = createContext<CrcLocaleContextValue | null>(null)

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    // Some environments (privacy mode, certain embeds) throw merely on
    // accessing window.localStorage -- fail safe to "no persistence"
    // rather than crash the page.
    return null
  }
}

export function CrcLocaleProvider({ children }: { children: ReactNode }) {
  // Starts at the fixed default on every render (server and first client
  // render must match, avoiding a hydration mismatch) -- the real
  // persisted value, if any, is applied in the effect below, after mount.
  const [locale, setLocaleState] = useState<CrcLocale>(DEFAULT_CRC_LOCALE)

  useEffect(() => {
    setLocaleState(readPersistedCrcLocale(safeLocalStorage()))
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  function setLocale(next: CrcLocale) {
    setLocaleState(next)
    persistCrcLocale(safeLocalStorage(), next)
  }

  const value: CrcLocaleContextValue = { locale, setLocale, copy: getCrcUiCopy(locale) }

  return <CrcLocaleContext.Provider value={value}>{children}</CrcLocaleContext.Provider>
}

/** Throws if used outside CrcLocaleProvider -- a missing provider is a real integration bug, not something to silently default around. */
export function useCrcLocale(): CrcLocaleContextValue {
  const ctx = useContext(CrcLocaleContext)
  if (!ctx) throw new Error('useCrcLocale must be used within a CrcLocaleProvider')
  return ctx
}
