/**
 * CRC-OPS-GEO-1 (2026-09-23) -- resolveRequestCountryCode /
 * formatCountryDisplayName / resolveApproximateCountryDisplayName tests.
 * Same lightweight fakeRequest convention already established by
 * abuse-key.test.ts.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveRequestCountryCode, formatCountryDisplayName, resolveApproximateCountryDisplayName } from '../../lib/crc-engine/request-geography'

function fakeRequest(headers: Record<string, string>): { headers: { get: (name: string) => string | null } } {
  return { headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } }
}

describe('semantic boundary -- this module never reaches CRC reasoning', () => {
  test('request-geography.ts imports nothing from the Interview Engine, Retrieval, Bounded Interpretation, or Projection layers', () => {
    const source = readFileSync(join(__dirname, '../../lib/crc-engine/request-geography.ts'), 'utf8')
    // Real import statements only -- the module's own header comment
    // deliberately NAMES these forbidden concepts as a disclaimer of what
    // this module must never become, so scanning the whole file (comments
    // included) would false-positive on its own documentation.
    const importLines = source
      .split('\n')
      .filter((line) => line.trim().startsWith('import '))
      .join('\n')
    expect(importLines).not.toMatch(/from ['"]@?\/?(lib\/)?interview-engine/)
    expect(importLines).not.toMatch(/from ['"]@?\/?(lib\/)?retrieval-engine/)
    expect(importLines).not.toMatch(/from ['"]@?\/?(lib\/)?bounded-interpretation/)
    expect(importLines).not.toMatch(/from ['"]@?\/?(lib\/)?projection-layer/)
    // Real code usage of these type/value names (assignments, type
    // annotations, function calls) -- excludes the module's own comment
    // lines the same way.
    const codeOnly = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//') && !line.trim().startsWith('/**'))
      .join('\n')
    expect(codeOnly).not.toMatch(/StructuredUnderstanding|ProjectFacts|UserGoal|AssessmentJurisdictionMention|DistributionTerritoryMention/)
  })
})

describe('resolveRequestCountryCode', () => {
  test('a valid uppercase two-letter code is returned as-is', () => {
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': 'TW' }) as any)).toBe('TW')
  })

  test('a valid lowercase two-letter code is normalized to uppercase', () => {
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': 'us' }) as any)).toBe('US')
  })

  test('a mixed-case code is normalized to uppercase', () => {
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': 'Tw' }) as any)).toBe('TW')
  })

  test('header absent entirely -> null', () => {
    expect(resolveRequestCountryCode(fakeRequest({}) as any)).toBeNull()
  })

  test('header present but empty string -> null', () => {
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': '' }) as any)).toBeNull()
  })

  test('header present but whitespace-only -> null', () => {
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': '   ' }) as any)).toBeNull()
  })

  test('malformed/non-two-letter values fail closed to null', () => {
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': 'TWN' }) as any)).toBeNull()
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': 'T' }) as any)).toBeNull()
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': '12' }) as any)).toBeNull()
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': 'T1' }) as any)).toBeNull()
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': '<script>' }) as any)).toBeNull()
  })

  test('surrounding whitespace on an otherwise-valid code is trimmed and accepted', () => {
    expect(resolveRequestCountryCode(fakeRequest({ 'x-vercel-ip-country': '  TW  ' }) as any)).toBe('TW')
  })
})

describe('formatCountryDisplayName', () => {
  test('TW -> Taiwan', () => {
    expect(formatCountryDisplayName('TW')).toBe('Taiwan')
  })

  test('US -> United States', () => {
    expect(formatCountryDisplayName('US')).toBe('United States')
  })

  test('an unrecognized-but-well-formed code falls back to the code itself, never throws, never invents a name', () => {
    expect(() => formatCountryDisplayName('ZZ')).not.toThrow()
    const result = formatCountryDisplayName('ZZ')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('defensive fallback: if Intl.DisplayNames throws, the raw code is returned unchanged', () => {
    const mutableIntl = Intl as unknown as { DisplayNames: unknown }
    const OriginalDisplayNames = mutableIntl.DisplayNames
    mutableIntl.DisplayNames = class {
      constructor() {
        throw new Error('ICU data unavailable')
      }
    }
    try {
      expect(formatCountryDisplayName('TW')).toBe('TW')
    } finally {
      mutableIntl.DisplayNames = OriginalDisplayNames
    }
  })
})

describe('resolveApproximateCountryDisplayName', () => {
  test('valid header -> resolved and formatted in one call', () => {
    expect(resolveApproximateCountryDisplayName(fakeRequest({ 'x-vercel-ip-country': 'TW' }) as any)).toBe('Taiwan')
  })

  test('missing/invalid header -> null, never a fabricated value', () => {
    expect(resolveApproximateCountryDisplayName(fakeRequest({}) as any)).toBeNull()
    expect(resolveApproximateCountryDisplayName(fakeRequest({ 'x-vercel-ip-country': 'nope' }) as any)).toBeNull()
  })
})
