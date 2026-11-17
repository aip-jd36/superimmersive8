/**
 * SI8-PRIVACY-CRC-3 — the PROPOSED CRC privacy notice (English + Traditional Chinese). Not approved, not published.
 *
 * Checks: it cannot be published as it stands; nothing in the application imports it; both languages have the same structure;
 * it quotes the unchanged Commercial Assurance follow-up sentence; its retention statements describe the current practice only;
 * it makes no legal-compliance claims; and the code behaviours it describes are still true (tripwires: if one fails, the notice
 * text must be revised before release).
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { CRC_PRIVACY_NOTICE_PROPOSED as P } from '@/lib/legal/crc-privacy-notice-proposed'
import { CRC_NOTICE_LOCALES, CRC_PRIVACY_NOTICE, isCompleteCrcPrivacyNotice } from '@/lib/legal/crc-privacy-notice'
import { RESULTS_GATE_COPY } from '@/lib/crc-engine/results-gate-copy'
import { getResultsGateCopyLocalized } from '@/components/crc/crc-ui-copy'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CrcPrivacyNoticeView } from '@/components/crc/CrcPrivacyNoticeView'
import { ResultsGatePrivacyLink } from '@/components/crc/ResultsGatePrivacyLink'

const APP = path.join(__dirname, '..', '..')
const src = (p: string) => readFileSync(path.join(APP, p), 'utf8').replace(/\r\n/g, '\n')
const all = (l: 'en' | 'zh-TW') => [P.text[l].title, ...P.text[l].paragraphs].join('\n')
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const full = path.join(dir, n)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })

describe('proposed notice: cannot be published as it stands', () => {
  test('the slot is still null and the proposal lacks an effective date and approval reference', () => {
    expect(CRC_PRIVACY_NOTICE).toBeNull()
    expect(P.effective_date).toBe('')
    expect(P.approval_reference).toBe('')
    expect(isCompleteCrcPrivacyNotice(P)).toBe(false)
  })

  test('once dated and approved it would be complete in both languages', () => {
    expect(isCompleteCrcPrivacyNotice({ ...P, effective_date: '2099-01-01', approval_reference: 'TEST-ONLY' })).toBe(true)
  })

  test('nothing in the application imports it (only tests do)', () => {
    const served = ['app', 'components', 'lib'].flatMap((d) => walk(path.join(APP, d))).filter((f) => /\.(tsx?|jsx?)$/.test(f))
    const importers = served.filter((f) => /(from|import|require)\s*\(?\s*['"][^'"]*crc-privacy-notice-proposed['"]/.test(readFileSync(f, 'utf8')))
    expect(importers.map((f) => path.relative(APP, f))).toEqual([])
  })
})

describe('proposed notice: as it would render once approved (simulated approval, test only)', () => {
  const approved = { ...P, effective_date: '2099-01-01', approval_reference: 'TEST-ONLY' }

  test('each language renders its own full text, headings included, under its own lang attribute', () => {
    for (const locale of CRC_NOTICE_LOCALES) {
      const html = renderToStaticMarkup(createElement(CrcPrivacyNoticeView, { notice: approved, locale }))
      expect(html).toContain(`lang="${locale}"`)
      expect(html).toContain(P.text[locale].title)
      expect(html).toContain('data-crc-privacy-languages')
      expect(html).not.toContain('data-legal-unavailable')
      expect((html.match(/<p class="text-gray-800 mb-4 whitespace-pre-line">/g) ?? []).length).toBe(P.text[locale].paragraphs.length)
    }
  })

  test('the gate link points to the notice in the visitor language', () => {
    expect(renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'en', doc: approved }))).toContain('href="/crc/privacy"')
    expect(renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'zh-TW', doc: approved }))).toContain('href="/crc/privacy?lang=zh-TW"')
  })
})

describe('proposed notice: structure', () => {
  test('one version for both languages, in the legal-document version format', () => {
    expect(P.version).toMatch(/^[a-z0-9][a-z0-9._-]{2,31}$/)
  })

  test('both languages have the same number of paragraphs and the same numbered headings in the same positions', () => {
    const en = P.text.en.paragraphs
    const zh = P.text['zh-TW'].paragraphs
    expect(zh.length).toBe(en.length)
    const headings = (ps: readonly string[]) => ps.map((p, i) => (/^(\d+)\. /.exec(p) ? `${i}:${/^(\d+)\. /.exec(p)![1]}` : null)).filter(Boolean)
    expect(headings(zh)).toEqual(headings(en))
    expect(headings(en).map((h) => h!.split(':')[1])).toEqual(Array.from({ length: 15 }, (_, i) => String(i + 1)))
  })

  test('the operating entity and the privacy contact appear in both languages; no other address is given', () => {
    for (const l of CRC_NOTICE_LOCALES) {
      expect(all(l)).toContain('PMF Strategy Inc.')
      expect(all(l)).toContain('SuperImmersive 8')
      const emails = all(l).match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? []
      expect(new Set(emails)).toEqual(new Set(['jd@superimmersive8.com']))
      expect(emails.length).toBe(4) // follow-up opt-out, requests, other rights, contact
    }
  })

  test('product names keep their meaning: CRC and the Commercial Assurance Assessment are named consistently', () => {
    expect(all('en')).toContain('Commercial Readiness Check ("CRC")')
    expect(all('en')).toContain('CRC is not a Commercial Assurance Assessment')
    expect(all('zh-TW')).toContain('商業就緒度檢查（Commercial Readiness Check，以下稱「CRC」）')
    expect(all('zh-TW')).toContain('CRC 不是商業保證評估（Commercial Assurance Assessment）')
    expect(P.text['zh-TW'].title).toBe('商業就緒度檢查隱私權聲明')
  })
})

describe('proposed notice: the founder review shows the exact text', () => {
  test('every line of both languages appears verbatim in SI8_PRIVACY_CRC_3_FOUNDER_REVIEW.md', () => {
    const review = readFileSync(path.join(APP, '..', 'implementation', 'privacy-crc-3', 'SI8_PRIVACY_CRC_3_FOUNDER_REVIEW.md'), 'utf8').replace(/\r\n/g, '\n')
    expect(review).toContain(`version ${P.version}`)
    for (const l of CRC_NOTICE_LOCALES) {
      for (const line of [P.text[l].title, ...P.text[l].paragraphs].flatMap((x) => x.split('\n'))) expect({ l, line, found: review.includes(line) }).toEqual({ l, line, found: true })
    }
  })
})

describe('proposed notice: content honesty', () => {
  test('quotes the unchanged Commercial Assurance follow-up sentence verbatim in each language', () => {
    expect(RESULTS_GATE_COPY.disclosure).toBe('SI8 may also follow up with information relevant to Commercial Assurance.')
    expect(all('en')).toContain(`"${RESULTS_GATE_COPY.disclosure}"`)
    expect(all('zh-TW')).toContain(`「${getResultsGateCopyLocalized('zh-TW').disclosure}」`)
  })

  test('retention: states only the current practice; no planned period or clearing is mentioned', () => {
    const en = all('en')
    expect(en).toContain('CRC does not currently delete information automatically.')
    expect(en).toContain('including IP addresses recorded when a usage limit is triggered, until they are deleted')
    expect(en).toContain('We are reviewing our retention practices and may introduce additional retention limits. We will update this notice when those practices change.')
    expect(en).not.toMatch(/12 months|twelve months|30 days|thirty days|\bplan(ned)? to\b/i)
    expect(en).not.toMatch(/\b(is|are|will be) (deleted|cleared|removed) (after|within)\b/i)
    expect(en).not.toMatch(/\bautomatically (deleted|cleared|removed)\b/i)
    const zh = all('zh-TW')
    expect(zh).toContain('CRC 目前不會自動刪除資料。')
    expect(zh).toContain('包括觸發使用限制時記錄的 IP 位址')
    expect(zh).toContain('我們正在檢討資料保存做法，並可能訂定其他保存期限。相關做法變更時，我們會更新本聲明。')
    expect(zh).not.toMatch(/12 個月|30 天|計畫/)
  })

  test('requests: reviewed individually; some records may be kept, with an explanation; no promised outcome or deadline', () => {
    const en = all('en')
    expect(en).toContain('We review each request individually')
    expect(en).toContain('Some records may need to be kept')
    expect(en).toContain('If we keep any information, we will tell you what we kept and why.')
    expect(en).not.toMatch(/What we can remove depends|\bwe (may|can) refuse\b|at our discretion/i)
    expect(en).not.toMatch(/\bwithin \d+ (days|hours)\b|\bguarantee/i)
    const zh = all('zh-TW')
    expect(zh).toContain('我們會逐一審查每項要求')
    expect(zh).toContain('部分紀錄可能需要保留')
    expect(zh).toContain('若我們保留任何資料，會告知您保留了哪些資料及原因。')
  })

  test('no statement that one language takes precedence over the other', () => {
    expect(all('en')).not.toMatch(/English version applies|prevail|takes precedence/i)
    expect(all('zh-TW')).not.toMatch(/為準|優先/)
  })

  test('"We do not sell your personal information" is kept, in both languages, as the proposed founder commitment', () => {
    expect(all('en')).toContain('We do not sell your personal information.')
    expect(all('zh-TW')).toContain('我們不會出售您的個人資料。')
  })

  test('no legal-compliance claims, and no named laws', () => {
    expect(all('en')).not.toMatch(/complian|comply|GDPR|CCPA|PIPL|PDPA|lawful basis|legal basis/i)
    expect(all('zh-TW')).not.toMatch(/符合.*法|遵循|合規|個人資料保護法|個資法|GDPR/)
  })

  test('names every CRC service provider in both languages', () => {
    for (const l of CRC_NOTICE_LOCALES) for (const p of ['Anthropic', 'Supabase', 'Resend', 'Vercel', 'Google Analytics', 'Calendly']) expect(all(l)).toContain(p)
  })
})

// Tripwires: each describes a code behaviour the notice states. If one fails, revise the notice before release.
describe('proposed notice: the behaviours it describes are still true', () => {
  test('Google Analytics loads on every portal page (including /crc) with no consent step', () => {
    expect(src('app/layout.tsx')).toContain('googletagmanager.com/gtag/js')
    expect(src('lib/analytics/ga-snippet.ts')).not.toMatch(/consent/i)
    expect(all('en')).toContain('Google Analytics loads when you open CRC')
    expect(all('en')).toContain('CRC does not provide a setting to turn it off. You can block analytics or cookies through your browser settings or a browser extension.')
    expect(all('en')).not.toMatch(/opt[- ]?out|consent (setting|banner|choice)|manage (your )?(analytics|cookie) preferences/i)
    expect(all('zh-TW')).toContain('您開啟 CRC 時，Google Analytics 就會載入')
    expect(all('zh-TW')).toContain('CRC 沒有提供關閉它的設定。')
  })

  test('the crc_session cookie is httpOnly and lasts 7 days', () => {
    const route = src('app/api/crc/turn/route.ts')
    expect(route).toContain('const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7')
    expect(route).toContain('httpOnly: true')
    expect(all('en')).toContain('crc_session')
    expect(all('en')).toContain('expires after 7 days')
  })

  test('booking links can carry the email address and a reference code', () => {
    const cal = src('lib/crc-engine/calendly-attribution.ts')
    expect(cal).toContain("params.set('email', email)")
    expect(cal).toContain("params.set('utm_content', attributionToken)")
  })

  test('admin notifications carry the submitted email address, the visitor wording and the approximate country', () => {
    const emails = src('lib/emails.ts')
    expect(emails).toMatch(/interface CrcResultsEmailCapturedNotification \{[^}]*\bemail: string/)
    expect(emails).toMatch(/interface MaterialDemandObservation \{[^}]*\braw_text: string/)
    expect(emails).toMatch(/approximateCountry\?: string \| null/)
  })

  test('the raw-IP clearing is still gated off by default (the notice says nothing is deleted automatically)', () => {
    expect(readFileSync(path.join(APP, '..', '..', '.github', 'workflows', 'crc-raw-ip-retention.yml'), 'utf8')).toContain(
      'if: needs.gate.outputs.enabled == \'true\'',
    )
  })

  test('there is no automatic CRC deletion path in the application', () => {
    const files = ['app', 'lib'].flatMap((d) => walk(path.join(APP, d))).filter((f) => /\.(tsx?|jsx?)$/.test(f))
    for (const f of files) expect({ f, hit: /from\('crc_(sessions|leads)'\)[\s\S]{0,80}\.delete\(/.test(readFileSync(f, 'utf8')) }).toEqual({ f, hit: false })
  })
})
