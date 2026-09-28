/**
 * CRC → SI8 reciprocal links (2026-09-28). Source-level invariants, same
 * approach as crc-decline-label-locale-independence.test.ts (this suite runs
 * in a node environment with no component renderer):
 *
 *  - the identity mark and the results-confirmation bridge link to exactly
 *    the approved marketing-site destinations, in a new tab;
 *  - the bridge renders only in the 'results_confirmation' phase -- never
 *    the email gate, never the legacy 'complete' phase;
 *  - the existing Calendly CTA keeps its href builder, new-tab/rel
 *    attributes, and cta_click handler byte-for-byte.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '..', '..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf-8')

const identity = read('components/crc/CrcIdentityMark.tsx')
const bridge = read('components/crc/CrcAssuranceBridge.tsx')
const page = read('app/crc/page.tsx')
const layout = read('app/crc/layout.tsx')

describe('marketing-site link destinations', () => {
  test('identity mark links "SuperImmersive 8" to the marketing homepage in a new tab', () => {
    expect(identity).toContain("export const SI8_MARKETING_SITE_URL = 'https://www.superimmersive8.com/'")
    expect(identity).toContain("const BRAND_NAME = 'SuperImmersive 8'")
    expect(identity).toContain('href={SI8_MARKETING_SITE_URL}')
    expect(identity).toContain('target="_blank"')
    expect(identity).toContain('rel="noopener"')
  })

  test('assurance bridge links to the homepage Assessment section (#how) in a new tab', () => {
    expect(bridge).toContain('export const COMMERCIAL_ASSURANCE_LEARN_MORE_URL = `${SI8_MARKETING_SITE_URL}#how`')
    expect(bridge).toContain('href={COMMERCIAL_ASSURANCE_LEARN_MORE_URL}')
    expect(bridge).toContain('target="_blank"')
    expect(bridge).toContain('rel="noopener"')
  })

  test('assurance bridge is presentation-only -- no fetch/analytics of its own', () => {
    expect(bridge).not.toMatch(/fetch\(|gtag|sendBeacon/)
  })
})

describe('placement and existing Calendly CTA', () => {
  test('bridge is rendered exactly once, inside the results_confirmation block', () => {
    expect(page.match(/<CrcAssuranceBridge/g)).toHaveLength(1)
    const start = page.indexOf("{phase === 'results_confirmation' && confirmationCopy && (")
    const end = page.indexOf("{phase === 'complete' && projection && (")
    const at = page.indexOf('<CrcAssuranceBridge')
    expect(start).toBeGreaterThan(-1)
    expect(at).toBeGreaterThan(start)
    expect(at).toBeLessThan(end)
  })

  test('existing Calendly CTA is unchanged and passed in as the primary action', () => {
    expect(page).toContain(
      '<a href={buildCalendlyUrl(attributionToken)} target="_blank" rel="noopener noreferrer" onClick={handleCommercialAssuranceCtaClick}>',
    )
    expect(page).toContain("fetch('/api/crc/cta-click', { method: 'POST' })")
  })

  test('legacy complete phase still renders the original CommercialAssuranceBridge', () => {
    expect(page).toContain('<CommercialAssuranceBridge attributionToken={attributionToken} email={email} />')
  })
})

describe('/crc route metadata', () => {
  test('CRC-specific browser title', () => {
    expect(layout).toContain("title: 'Commercial Readiness Check | SuperImmersive 8'")
  })
})
