'use client'

/**
 * Deterministic Traditional-Chinese conversation-language limitation
 * notice (CRC-UI-1, 2026-09-18). Shown only while locale === 'zh-TW' --
 * communicates that generated CRC conversation content remains English
 * even though the interface chrome is now localized. Deliberately no
 * dismissal state/persistence mechanism (per product decision) -- it
 * simply renders or doesn't, driven directly by the current locale.
 */

import { useCrcLocale } from './CrcLocaleProvider'

export function CrcZhLocaleNotice() {
  const { locale, copy } = useCrcLocale()
  if (locale !== 'zh-TW') return null
  return <p className="text-xs text-muted-foreground">{copy.zhConversationNotice}</p>
}
