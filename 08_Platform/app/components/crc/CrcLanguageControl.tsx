'use client'

/**
 * Upper-right UI-language control (CRC-UI-1, 2026-09-18). A compact,
 * two-option, keyboard-accessible toggle -- no native <select> needed for
 * exactly two options, and no new UI primitive/dependency required (plain
 * semantic <button> elements, matching the existing role-card/back-button
 * pattern already used in CrcEntryFlow.tsx).
 *
 * Selecting a language here only calls CrcLocaleProvider's setLocale --
 * pure client state + localStorage, no network request, no engine
 * involvement. See CrcLocaleProvider.tsx's own header for the full
 * invariant.
 */

import { useCrcLocale } from './CrcLocaleProvider'
import type { CrcLocale } from './crc-locale'
import { cn } from '@/lib/utils'

export function CrcLanguageControl() {
  const { locale, setLocale, copy } = useCrcLocale()

  function optionClass(target: CrcLocale) {
    return cn(
      'rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      locale === target ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
    )
  }

  return (
    <div role="group" aria-label={copy.languageControlLabel} className="inline-flex items-center gap-0.5 rounded-full border border-input bg-background p-0.5">
      <button type="button" aria-pressed={locale === 'en'} className={optionClass('en')} onClick={() => setLocale('en')}>
        {copy.languageNameEnglish}
      </button>
      <button type="button" aria-pressed={locale === 'zh-TW'} className={optionClass('zh-TW')} onClick={() => setLocale('zh-TW')}>
        {copy.languageNameTraditionalChinese}
      </button>
    </div>
  )
}
