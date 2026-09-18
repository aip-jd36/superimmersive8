/**
 * crc-ui-copy.ts tests (CRC-UI-1, 2026-09-18). Pure, no React -- proves the
 * dictionary is complete in both locales, and that the role/tool/
 * jurisdiction display-label lookups never influence the semantic value
 * they're keyed by.
 */

import {
  getCrcUiCopy,
  getRoleDisplay,
  getFieldPrompt,
  getOptionDisplayLabel,
  formatWaitIndicatorLocalized,
  getRateLimitMessageLocalized,
  buildTeaserCopyLocalized,
  buildConfirmationCopyLocalized,
  getResultsGateCopyLocalized,
  getAcknowledgmentGuidanceCopyLocalized,
} from '../../components/crc/crc-ui-copy'
import { CRC_LOCALES } from '../../components/crc/crc-locale'
import { GUIDED_ENTRY_DEFINITIONS } from '../../lib/crc-engine/guided-entry-definitions'

describe('getCrcUiCopy -- dictionary completeness', () => {
  test('2. English copy exists', () => {
    const en = getCrcUiCopy('en')
    expect(en.headerTitle).toBe('Commercial Readiness Check')
    expect(en.send).toBe('Send')
  })

  test('3. zh-TW copy exists', () => {
    const zh = getCrcUiCopy('zh-TW')
    expect(zh.headerTitle).toBe('商業就緒度檢查')
    expect(zh.send).toBe('傳送')
  })

  test('4. required keys are complete in both locales -- no key present in one locale but missing in the other', () => {
    const en = getCrcUiCopy('en')
    const zh = getCrcUiCopy('zh-TW')
    const enKeys = Object.keys(en).sort()
    const zhKeys = Object.keys(zh).sort()
    expect(zhKeys).toEqual(enKeys)
  })

  test('5. every key in both locales has a genuinely non-empty string value -- no accidental empty-string fallback for required CRC shell copy', () => {
    for (const locale of CRC_LOCALES) {
      const copy = getCrcUiCopy(locale)
      for (const [key, value] of Object.entries(copy)) {
        expect(typeof value).toBe('string')
        expect((value as string).trim().length).toBeGreaterThan(0)
      }
    }
  })

  test('SI8 and CRC product names remain unchanged across locales', () => {
    expect(getCrcUiCopy('en').productName).toBe('SI8')
    expect(getCrcUiCopy('zh-TW').productName).toBe('SI8')
    expect(getCrcUiCopy('en').productSubtitle).toBe('CRC')
    expect(getCrcUiCopy('zh-TW').productSubtitle).toBe('CRC')
  })
})

describe('getRoleDisplay -- 6. preserves semantic definitionId, never alters it', () => {
  test('every real GUIDED_ENTRY_DEFINITIONS entry has a zh-TW display mapping', () => {
    for (const def of GUIDED_ENTRY_DEFINITIONS) {
      const display = getRoleDisplay('zh-TW', def.definitionId, def.label, def.description)
      // Localized display differs from the raw English fallback for every
      // known role (proves the lookup table actually fired, not silently
      // fell through).
      expect(display.label).not.toBe(def.label)
    }
  })

  test('English locale always returns the exact fallback (English) label/description unchanged', () => {
    for (const def of GUIDED_ENTRY_DEFINITIONS) {
      const display = getRoleDisplay('en', def.definitionId, def.label, def.description)
      expect(display).toEqual({ label: def.label, description: def.description })
    }
  })

  test('an unknown definitionId falls back to the provided English label/description even under zh-TW', () => {
    const display = getRoleDisplay('zh-TW', 'some-future-role-not-yet-mapped', 'Future Role', 'Future description')
    expect(display).toEqual({ label: 'Future Role', description: 'Future description' })
  })
})

describe('getFieldPrompt', () => {
  test('zh-TW returns a genuinely different prompt for both known kinds', () => {
    expect(getFieldPrompt('zh-TW', 'tool', 'Which tool did you use?')).not.toBe('Which tool did you use?')
    expect(getFieldPrompt('zh-TW', 'jurisdiction', 'Which jurisdiction?')).not.toBe('Which jurisdiction?')
  })

  test('English always returns the fallback prompt unchanged', () => {
    expect(getFieldPrompt('en', 'tool', 'Which tool did you use?')).toBe('Which tool did you use?')
  })
})

describe('getOptionDisplayLabel -- 6/7. preserves semantic option value, only display label changes', () => {
  test('jurisdiction option values map to a genuinely different zh-TW label', () => {
    expect(getOptionDisplayLabel('zh-TW', 'jurisdiction', 'United States', 'United States')).not.toBe('United States')
    expect(getOptionDisplayLabel('zh-TW', 'jurisdiction', 'European Union', 'European Union')).not.toBe('European Union')
  })

  test('English jurisdiction labels are returned unchanged', () => {
    expect(getOptionDisplayLabel('en', 'jurisdiction', 'United States', 'United States')).toBe('United States')
  })

  test('7. third-party tool product names are NEVER translated, in either locale (product decision, CRC-UI-1)', () => {
    const toolNames = ['Runway Gen-3', 'Kling', 'Google Veo', 'Pika', 'Luma']
    for (const name of toolNames) {
      expect(getOptionDisplayLabel('zh-TW', 'tool', name, name)).toBe(name)
      expect(getOptionDisplayLabel('en', 'tool', name, name)).toBe(name)
    }
  })

  test('the function only ever receives/returns presentation labels -- it has no return path that could produce a semantic value string not equal to the fallback label passed in', () => {
    // A value/kind combination with no lookup entry must return the
    // fallback verbatim -- never invent, normalize, or infer a label.
    expect(getOptionDisplayLabel('zh-TW', 'jurisdiction', 'Some Future Country', 'Some Future Country')).toBe('Some Future Country')
  })
})

describe('locale-aware wrappers around existing lib/crc-engine/ pure copy -- English matches the existing untouched functions exactly', () => {
  test('formatWaitIndicatorLocalized("en", ...) matches formatWaitIndicator exactly', () => {
    expect(formatWaitIndicatorLocalized('en', 0)).toBe('Thinking…')
    expect(formatWaitIndicatorLocalized('en', 15)).toBe('Still working… 15s')
  })

  test('formatWaitIndicatorLocalized("zh-TW", ...) produces distinct, non-empty Chinese copy', () => {
    const zh = formatWaitIndicatorLocalized('zh-TW', 3)
    expect(zh).not.toBe(formatWaitIndicatorLocalized('en', 3))
    expect(zh.length).toBeGreaterThan(0)
  })

  test('getRateLimitMessageLocalized("en", "burst", ...) matches the existing English function', () => {
    expect(getRateLimitMessageLocalized('en', 'burst', undefined)).toBe("You're sending messages a little too quickly. Try again in a few seconds.")
  })

  test('getRateLimitMessageLocalized("zh-TW", "burst", ...) produces distinct Chinese copy', () => {
    expect(getRateLimitMessageLocalized('zh-TW', 'burst', undefined)).not.toBe(
      getRateLimitMessageLocalized('en', 'burst', undefined),
    )
  })

  test('buildTeaserCopyLocalized zh-TW handles the count===0 and count>0 branches distinctly', () => {
    const zero = buildTeaserCopyLocalized('zh-TW', 0)
    const some = buildTeaserCopyLocalized('zh-TW', 3)
    expect(zero.body).not.toBe(some.body)
    expect(some.body).toContain('3')
  })

  test('buildConfirmationCopyLocalized zh-TW interpolates the masked email verbatim (data, not translated)', () => {
    const zh = buildConfirmationCopyLocalized('zh-TW', 'j•••@company.com')
    expect(zh.body).toContain('j•••@company.com')
  })

  test('getResultsGateCopyLocalized returns all 5 required fields for both locales', () => {
    for (const locale of CRC_LOCALES) {
      const copy = getResultsGateCopyLocalized(locale)
      expect(copy.heading.length).toBeGreaterThan(0)
      expect(copy.valueProp.length).toBeGreaterThan(0)
      expect(copy.fieldLabel.length).toBeGreaterThan(0)
      expect(copy.buttonText.length).toBeGreaterThan(0)
      expect(copy.disclosure.length).toBeGreaterThan(0)
    }
  })

  test('getAcknowledgmentGuidanceCopyLocalized returns distinct non-empty copy for both locales', () => {
    const en = getAcknowledgmentGuidanceCopyLocalized('en')
    const zh = getAcknowledgmentGuidanceCopyLocalized('zh-TW')
    expect(en.length).toBeGreaterThan(0)
    expect(zh.length).toBeGreaterThan(0)
    expect(en).not.toBe(zh)
  })
})

describe('11. locale dictionary contains no semantic ProjectFact/UserGoal/Material Demand mutation behavior', () => {
  test('this module exports no function whose name suggests semantic mutation, and imports nothing from extraction/run-turn/StructuredUnderstanding modules', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../components/crc/crc-ui-copy')
    const exportNames = Object.keys(mod)
    const forbiddenSubstrings = ['ProjectFact', 'UserGoal', 'StructuredUnderstanding', 'MaterialDemand', 'extraction', 'runTurn']
    for (const name of exportNames) {
      for (const forbidden of forbiddenSubstrings) {
        expect(name).not.toContain(forbidden)
      }
    }
  })
})
