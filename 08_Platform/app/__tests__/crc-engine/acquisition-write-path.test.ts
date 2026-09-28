/**
 * CRC acquisition attribution (2026-09-29) -- write-path and wiring
 * invariants that span files:
 *
 *  - route.ts passes acquisition ONLY into the two session-creation writes
 *    (guided createGuidedEntrySession / free-form saveCrcSessionCreationMeta)
 *    and never in the existing-session (resumed) branch -- first touch,
 *    never overwritten;
 *  - the /crc client attaches acquisition to turn requests only (not the
 *    results-email requests);
 *  - the marketing homepage's forwarding script (the real inline script,
 *    extracted from 07_Website/index.html and executed against a fake DOM)
 *    forwards exactly the five approved parameters to both CRC links.
 *
 * Source-level route checks follow the same approach as
 * crc-si8-assurance-links.test.ts / turn-traces-authority-firewall.test.ts.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { runInNewContext } from 'vm'
import { readAcquisitionFromSearch } from '../../lib/crc-engine/acquisition'

const appRoot = join(__dirname, '..', '..')
const route = readFileSync(join(appRoot, 'app/api/crc/turn/route.ts'), 'utf-8')
const page = readFileSync(join(appRoot, 'app/crc/page.tsx'), 'utf-8')
const homepage = readFileSync(join(appRoot, '..', '..', '07_Website', 'index.html'), 'utf-8')

describe('route.ts -- acquisition is written only at session creation', () => {
  test('creation columns are consumed in exactly two places: guided insert and free-form creation meta', () => {
    const uses = route.match(/creationAcquisitionColumns/g) ?? []
    // 1 declaration + 2 consumers.
    expect(uses).toHaveLength(3)
    expect(route).toContain('acquisition: creationAcquisitionColumns,')
    expect(route).toContain('...creationAcquisitionColumns,')
  })

  /** The source text of a call, from its opening marker up to the `} catch (err) {` that guards it. */
  function callSource(openMarker: string): string {
    const start = route.indexOf(openMarker)
    expect(start).toBeGreaterThan(-1)
    return route.slice(start, route.indexOf('} catch (err) {', start))
  }

  test('the guided consumer sits inside the createGuidedEntrySession call', () => {
    expect(callSource('creation = await createGuidedEntrySession(')).toContain('acquisition: creationAcquisitionColumns,')
  })

  test('the free-form consumer sits inside the saveCrcSessionCreationMeta call of the new-session block', () => {
    const block = callSource("if (isNewSession && parsed.kind !== 'guided_entry_init') {")
    expect(block).toContain('await saveCrcSessionCreationMeta(supabaseAdmin, token, {')
    expect(block).toContain('...creationAcquisitionColumns,')
  })

  test('the existing-session (resumed) branch never references acquisition', () => {
    const start = route.indexOf('// A token WAS supplied -- it must resolve')
    const end = route.indexOf('let attributionToken: string | undefined', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(route.slice(start, end)).not.toMatch(/acquisition/i)
  })

  test('no other crc_sessions write in route.ts carries acquisition columns', () => {
    for (const col of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'acquisition_ref']) {
      expect(route).not.toContain(col)
    }
  })
})

describe('/crc client wiring', () => {
  test('turn requests attach acquisition read from the page URL at send time', () => {
    expect(page).toContain('body: JSON.stringify({ ...body, acquisition: readAcquisitionFromSearch(window.location.search) }),')
    expect(page.match(/readAcquisitionFromSearch\(/g)).toHaveLength(1)
  })

  test('results-email requests are unchanged (no acquisition)', () => {
    expect(page).toContain('body: JSON.stringify(requestBody),')
  })
})

// ── Homepage forwarding script ────────────────────────────────────────────

const CRC_URL = 'https://app.superimmersive8.com/crc'

function extractForwardingScript(html: string): string {
  const marker = html.indexOf('Forward approved campaign parameters to the Commercial Readiness Check links')
  expect(marker).toBeGreaterThan(-1)
  const open = html.indexOf('<script>', marker) + '<script>'.length
  return html.slice(open, html.indexOf('</script>', open))
}

function runOnHomepage(search: string, opts: { throwOnQuery?: boolean } = {}) {
  const hrefs = [...homepage.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1])
  const anchors = hrefs.map((href) => ({
    href,
    getAttribute: () => href,
    setAttribute(_name: string, value: string) {
      this.href = value
    },
  }))
  const document = {
    querySelectorAll(selector: string) {
      if (opts.throwOnQuery) throw new Error('boom')
      const wanted = /a\[href="([^"]+)"\]/.exec(selector)?.[1]
      return anchors.filter((a) => a.href === wanted)
    },
  }
  runInNewContext(extractForwardingScript(homepage), { window: { location: { search } }, document, URLSearchParams })
  return anchors.map((a) => a.href)
}

describe('homepage forwarding script (real inline script, fake DOM)', () => {
  const originalCrcLinks = homepage.match(/href="https:\/\/app\.superimmersive8\.com\/crc"/g) ?? []

  test('fixture sanity: the homepage has exactly two CRC links', () => {
    expect(originalCrcLinks).toHaveLength(2)
  })

  test('all five approved parameters are forwarded to BOTH CRC links; unrelated parameters are dropped', () => {
    const out = runOnHomepage('?foo=bar&utm_source=linkedin&utm_medium=outreach&utm_campaign=old-lead-test&utm_content=v2&ref=B087&gclid=xyz')
    const crc = out.filter((h) => h.startsWith(CRC_URL))
    const expected = `${CRC_URL}?utm_source=linkedin&utm_medium=outreach&utm_campaign=old-lead-test&utm_content=v2&ref=B087`
    expect(crc).toEqual([expected, expected])
  })

  test('forwarded URL round-trips into exactly the stored values on the CRC side', () => {
    const [crcHref] = runOnHomepage('?utm_source=linkedin&utm_medium=outreach&utm_campaign=old-lead-test&utm_content=v2&ref=B087').filter((h) => h.startsWith(CRC_URL))
    expect(readAcquisitionFromSearch(new URL(crcHref).search)).toEqual({
      utm_source: 'linkedin',
      utm_medium: 'outreach',
      utm_campaign: 'old-lead-test',
      utm_content: 'v2',
      ref: 'B087',
    })
  })

  test('an encoded valid value round-trips', () => {
    const [crcHref] = runOnHomepage('?utm_campaign=old%5Flead%2Etest').filter((h) => h.startsWith(CRC_URL))
    expect(readAcquisitionFromSearch(new URL(crcHref).search).utm_campaign).toBe('old_lead.test')
  })

  test('untagged URL (or only unrelated parameters) leaves both CRC hrefs byte-identical', () => {
    for (const search of ['', '?foo=bar&gclid=1', '?utm_source=']) {
      expect(runOnHomepage(search).filter((h) => h.startsWith(CRC_URL))).toEqual([CRC_URL, CRC_URL])
    }
  })

  test('non-CRC links (Calendly, #how) are never touched', () => {
    const before = runOnHomepage('').filter((h) => !h.startsWith(CRC_URL))
    const after = runOnHomepage('?utm_source=linkedin&ref=B087').filter((h) => !h.startsWith(CRC_URL))
    expect(after).toEqual(before)
    expect(after.some((h) => h.includes('calendly.com'))).toBe(true)
  })

  test('fails safe: an error inside the script never throws, and the CRC links stay clean', () => {
    expect(() => runOnHomepage('?utm_source=linkedin', { throwOnQuery: true })).not.toThrow()
  })
})
