/**
 * SI8-PRIVACY-CRC-1B / CRC-3 — the CRC privacy-notice publication gate (English + Traditional Chinese), the /crc/privacy
 * language selection, the results-gate link and the disclosure version.
 * Nothing here publishes anything: CRC_PRIVACY_NOTICE is null, so the link is hidden and captures keep recording v1.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CRC_NOTICE_LOCALES, CRC_PRIVACY_NOTICE, CRC_PRIVACY_PATH, crcPrivacyNoticeHref, crcPrivacyNoticeIn, crcPrivacyNoticePublished,
  isCompleteCrcPrivacyNotice, isCompleteLegalDocument, parseCrcNoticeLocale, type CrcPrivacyNotice,
} from '@/lib/legal/crc-privacy-notice'
import { CRC_LOCALES } from '@/components/crc/crc-locale'
import { CrcPrivacyNoticeView } from '@/components/crc/CrcPrivacyNoticeView'
import { legalPageContent, PRIVACY_NOTICE, LEGAL_PATHS, type ApprovedLegalDocument } from '@/lib/legal/policies'
import { resultsGateDisclosure, RESULTS_GATE_NOTICE_V2 } from '@/lib/crc-engine/results-gate-disclosure'
import { CRC_CONFIG } from '@/lib/crc-engine/config'
import { RESULTS_GATE_COPY } from '@/lib/crc-engine/results-gate-copy'
import { getResultsGateCopyLocalized } from '@/components/crc/crc-ui-copy'
import { ResultsGatePrivacyLink } from '@/components/crc/ResultsGatePrivacyLink'
import CrcPrivacyPage, { metadata } from '@/app/crc/privacy/page'

const APP = path.join(__dirname, '..', '..')
const src = (p: string) => readFileSync(path.join(APP, p), 'utf8')

// Synthetic, obviously-not-real documents used only to exercise the published branch.
const SAMPLE_DOC: ApprovedLegalDocument = {
  version: 'crc-privacy-test-1',
  effective_date: '2099-01-01',
  approval_reference: 'TEST-ONLY',
  title: 'Test notice',
  paragraphs: ['Test paragraph.'],
}
const SAMPLE: CrcPrivacyNotice = {
  version: 'crc-privacy-test-1',
  effective_date: '2099-01-01',
  approval_reference: 'TEST-ONLY',
  text: {
    en: { title: 'Test notice', paragraphs: ['Test paragraph EN.', 'Second EN.'] },
    'zh-TW': { title: '測試聲明', paragraphs: ['測試段落。', '第二段。'] },
  },
}

describe('publication gate', () => {
  test('the approved notice is published with effective date 2026-11-17', () => {
    expect(CRC_PRIVACY_NOTICE?.effective_date).toBe('2026-11-17')
    expect(crcPrivacyNoticePublished()).toBe(true)
  })

  test('removing or breaking the effective date unpublishes it (fail closed)', () => {
    for (const effective_date of ['', 'TBD', '2026-11-1']) expect(crcPrivacyNoticePublished({ ...CRC_PRIVACY_NOTICE!, effective_date })).toBe(false)
  })

  test('completeness rule agrees with the Creator Record legal-page rule', () => {
    const cases: (ApprovedLegalDocument | null)[] = [
      null, SAMPLE_DOC,
      { ...SAMPLE_DOC, version: 'X' }, { ...SAMPLE_DOC, version: 'UPPER-case' }, { ...SAMPLE_DOC, effective_date: '2099-1-1' },
      { ...SAMPLE_DOC, approval_reference: '  ' }, { ...SAMPLE_DOC, title: '' }, { ...SAMPLE_DOC, paragraphs: [] },
      { ...SAMPLE_DOC, paragraphs: ['ok', ' '] },
    ]
    for (const c of cases) expect(isCompleteLegalDocument(c)).toBe(legalPageContent(c).available)
  })

  test('a notice is published only when complete in BOTH languages, with matching paragraph counts (fail closed)', () => {
    expect(isCompleteCrcPrivacyNotice(SAMPLE)).toBe(true)
    const cases: unknown[] = [
      { ...SAMPLE, text: { en: SAMPLE.text.en } },
      { ...SAMPLE, text: { ...SAMPLE.text, 'zh-TW': { title: '', paragraphs: ['x', 'y'] } } },
      { ...SAMPLE, text: { ...SAMPLE.text, 'zh-TW': { title: '測試', paragraphs: ['只有一段'] } } },
      { ...SAMPLE, approval_reference: '' },
      { ...SAMPLE, effective_date: '' },
      { ...SAMPLE, version: 'Bad Version' },
    ]
    for (const c of cases) expect(crcPrivacyNoticePublished(c as CrcPrivacyNotice)).toBe(false)
  })

  test('each language view agrees with the shared legal-page rule', () => {
    for (const l of CRC_NOTICE_LOCALES) {
      const doc = crcPrivacyNoticeIn(SAMPLE, l)
      expect(legalPageContent(doc).available).toBe(true)
      expect(doc).toEqual({ version: SAMPLE.version, effective_date: SAMPLE.effective_date, approval_reference: SAMPLE.approval_reference, ...SAMPLE.text[l] })
    }
  })

  test('/crc/privacy shows the published notice in the requested language, with the selector, and is indexable', () => {
    for (const [searchParams, lang, title] of [
      [undefined, 'en', 'Commercial Readiness Check Privacy Notice'],
      [{}, 'en', 'Commercial Readiness Check Privacy Notice'],
      [{ lang: 'en' }, 'en', 'Commercial Readiness Check Privacy Notice'],
      [{ lang: 'zh-TW' }, 'zh-TW', '商業就緒度檢查隱私權聲明'],
      [{ lang: 'fr' }, 'en', 'Commercial Readiness Check Privacy Notice'],
    ] as const) {
      const html = renderToStaticMarkup(createElement(CrcPrivacyPage, { searchParams }))
      expect(html).toMatch(new RegExp(`<main[^>]*lang="${lang}"`))
      expect(html).toContain(`>${title}</h1>`)
      expect(html).toContain('data-crc-privacy-languages')
      expect(html).not.toContain('data-legal-unavailable')
    }
    expect(metadata.robots).toBeUndefined()
    expect(metadata.alternates).toEqual({ languages: { en: '/crc/privacy', 'zh-TW': '/crc/privacy?lang=zh-TW' } })
  })

  test('the CRC notice has its own path, separate from the Creator Record notice', () => {
    expect(CRC_PRIVACY_PATH).toBe('/crc/privacy')
    expect(LEGAL_PATHS.privacy).toBe('/privacy')
  })

  test('the Creator Record Privacy Notice is its own document (its current version: CR-DOC-READER-EXT-8D)', () => {
    expect(PRIVACY_NOTICE?.version).toBe('privacy-2026-11-19')
    expect(PRIVACY_NOTICE?.approval_reference).toBe('JD-CR-DOC-READER-EXT-8C-20261119 privacy')
    expect(PRIVACY_NOTICE?.paragraphs[0]).toContain("It does not cover SI8's marketing website or SI8's other services.")
  })

  test('the client-safe module imports only a type from the policy text module', () => {
    const s = src('lib/legal/crc-privacy-notice.ts')
    expect(s).toMatch(/import type \{ ApprovedLegalDocument \} from '\.\/policies'/)
    expect(s).not.toMatch(/^import \{[^}]*\} from '\.\/policies'/m)
  })
})

describe('/crc/privacy language selection (published branch, synthetic notice)', () => {
  test('notice languages are exactly the CRC UI languages', () => {
    expect([...CRC_NOTICE_LOCALES]).toEqual([...CRC_LOCALES])
  })

  test('?lang= selects zh-TW only on an exact match; everything else is English', () => {
    expect(parseCrcNoticeLocale('zh-TW')).toBe('zh-TW')
    expect(parseCrcNoticeLocale(['zh-TW', 'en'])).toBe('zh-TW')
    for (const v of [undefined, '', 'en', 'zh-tw', 'zh', 'ZH-TW', ' zh-TW', 'fr', 42, null, ['fr']]) expect(parseCrcNoticeLocale(v)).toBe('en')
    expect(crcPrivacyNoticeHref('en')).toBe('/crc/privacy')
    expect(crcPrivacyNoticeHref('zh-TW')).toBe('/crc/privacy?lang=zh-TW')
  })

  test('English: English text under lang="en"; the selector marks English current and links to both languages', () => {
    const html = renderToStaticMarkup(createElement(CrcPrivacyNoticeView, { notice: SAMPLE, locale: 'en' }))
    expect(html).toMatch(/<main[^>]*lang="en"/)
    expect(html).toContain('>Test notice</h1>')
    expect(html).toContain('Version crc-privacy-test-1 · Effective 2099-01-01')
    expect(html).not.toContain('測試段落')
    expect(html).toContain('<nav aria-label="Language / 語言"')
    expect(html).toMatch(/<a href="\/crc\/privacy" hrefLang="en" lang="en" aria-current="page"[^>]*>English<\/a>/)
    expect(html).toMatch(/<a href="\/crc\/privacy\?lang=zh-TW" hrefLang="zh-TW" lang="zh-TW" class="[^"]*">繁體中文<\/a>/)
    expect(html).not.toContain('TEST-ONLY')
  })

  test('Traditional Chinese: Chinese text under lang="zh-TW", localized meta line, Chinese marked current', () => {
    const html = renderToStaticMarkup(createElement(CrcPrivacyNoticeView, { notice: SAMPLE, locale: 'zh-TW' }))
    expect(html).toMatch(/<main[^>]*lang="zh-TW"/)
    expect(html).toContain('測試聲明')
    expect(html).toContain('版本 crc-privacy-test-1 · 生效日期 2099-01-01')
    expect(html).not.toContain('Test paragraph EN.')
    expect(html).toMatch(/hrefLang="zh-TW" lang="zh-TW" aria-current="page"/)
  })

  test('an incomplete notice renders none of its text and no selector, in either language', () => {
    for (const locale of CRC_NOTICE_LOCALES) {
      const html = renderToStaticMarkup(createElement(CrcPrivacyNoticeView, { notice: { ...SAMPLE, approval_reference: '' }, locale }))
      expect(html).toContain('data-legal-unavailable')
      expect(html).not.toMatch(/Test paragraph|測試段落|data-crc-privacy-languages/)
    }
  })
})

describe('results-gate link', () => {
  test('shown now that the notice is published, in the visitor language (EN and zh-TW)', () => {
    const en = renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'en' }))
    expect(en).toContain('href="/crc/privacy"')
    expect(en).toContain('Commercial Readiness Check Privacy Notice')
    const zh = renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'zh-TW' }))
    expect(zh).toContain('href="/crc/privacy?lang=zh-TW"')
    expect(zh).toContain('商業就緒度檢查隱私權聲明')
  })

  test('hidden for an unpublished notice (EN and zh-TW)', () => {
    expect(renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'en', doc: null }))).toBe('')
    expect(renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'zh-TW', doc: null }))).toBe('')
  })

  test('once published: a link to /crc/privacy in a new tab (EN)', () => {
    const html = renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'en', doc: SAMPLE }))
    expect(html).toContain('href="/crc/privacy"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('Commercial Readiness Check Privacy Notice')
    expect(html).toContain('hrefLang="en"')
  })

  test('hidden for a notice missing a language, even with everything else approved', () => {
    const onlyEn = { ...SAMPLE, text: { en: SAMPLE.text.en } } as unknown as CrcPrivacyNotice
    expect(renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'en', doc: onlyEn }))).toBe('')
  })

  test('once published: zh-TW wording', () => {
    const html = renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'zh-TW', doc: SAMPLE }))
    expect(html).toContain('商業就緒度檢查隱私權聲明')
    expect(html).toContain('href="/crc/privacy?lang=zh-TW"')
    expect(html).toContain('hrefLang="zh-TW"')
  })

  test('the Commercial Assurance follow-up sentence and the rest of the gate copy are unchanged, EN and zh-TW', () => {
    expect(RESULTS_GATE_COPY).toEqual({
      heading: 'Where should we send your results?',
      valueProp: "Enter an email you can access and we'll send you your complete Commercial Readiness Check.",
      fieldLabel: 'Email address',
      buttonText: 'Email my results',
      disclosure: 'SI8 may also follow up with information relevant to Commercial Assurance.',
    })
    expect(getResultsGateCopyLocalized('en')).toBe(RESULTS_GATE_COPY)
    expect(getResultsGateCopyLocalized('zh-TW').disclosure).toBe('SI8 也可能會就商業保證評估（Commercial Assurance）相關資訊與您聯繫。')
  })

  test('the gate renders the link right after the follow-up sentence', () => {
    const page = src('app/crc/page.tsx').replace(/\r\n/g, '\n')
    expect(page).toMatch(/\{resultsGateCopy\.disclosure\}<\/p>\n\s*\{gateDisclosure\.showPrivacyLink && <ResultsGatePrivacyLink locale=\{locale\} \/>\}/)
  })
})

describe('disclosure version (provenance: __tests__/crc-engine/results-gate-disclosure-provenance.test.ts)', () => {
  test('published (current state): the gate renders the link and reports results-gate-v2', () => {
    expect(resultsGateDisclosure()).toEqual({ showPrivacyLink: true, version: 'results-gate-v2' })
  })

  test('unpublished: the gate renders no link and reports results-gate-v1', () => {
    expect(CRC_CONFIG.captureNoticeVersion).toBe('results-gate-v1')
    expect(resultsGateDisclosure(null)).toEqual({ showPrivacyLink: false, version: 'results-gate-v1' })
    expect(resultsGateDisclosure({ ...CRC_PRIVACY_NOTICE!, effective_date: '' })).toEqual({ showPrivacyLink: false, version: 'results-gate-v1' })
  })

  test('published: the gate renders the link and reports results-gate-v2', () => {
    expect(RESULTS_GATE_NOTICE_V2).toBe('results-gate-v2')
    expect(resultsGateDisclosure(SAMPLE)).toEqual({ showPrivacyLink: true, version: 'results-gate-v2' })
  })

  test('a notice missing a language is not published: no link, and the gate still reports results-gate-v1', () => {
    const onlyEn = { ...SAMPLE, text: { en: SAMPLE.text.en } } as unknown as CrcPrivacyNotice
    expect(resultsGateDisclosure(onlyEn)).toEqual({ showPrivacyLink: false, version: 'results-gate-v1' })
    expect(resultsGateDisclosure({ ...SAMPLE, approval_reference: '' })).toEqual({ showPrivacyLink: false, version: 'results-gate-v1' })
  })

  test('the link component re-checks publication itself', () => {
    expect(src('components/crc/ResultsGatePrivacyLink.tsx')).toContain('if (!crcPrivacyNoticePublished(doc)) return null')
  })
})

// SI8-PRIVACY-CRC-1C — publication safety: nothing unapproved can reach a visitor.
describe('publication safety', () => {
  const DRAFT_REL = path.join('..', 'implementation', 'privacy-crc-1b', 'CRC_PRIVACY_NOTICE_DRAFT.md')
  const draft = src(DRAFT_REL).replace(/\r\n/g, '\n')
  const { readdirSync, statSync } = jest.requireActual('fs') as typeof import('fs')
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const full = path.join(dir, n)
      return statSync(full).isDirectory() ? walk(full) : [full]
    })
  const served = ['app', 'components', 'lib', 'public'].flatMap((d) => walk(path.join(APP, d)))

  test('the effective date in source is exactly the authorized publication date', () => {
    expect(src('lib/legal/crc-privacy-notice.ts').replace(/\r\n/g, '\n')).toMatch(/export const CRC_PRIVACY_NOTICE_EFFECTIVE_DATE: string = '2026-11-17'\n/)
  })

  test('the draft sits outside the application and is never imported or copied into served code', () => {
    expect(path.resolve(APP, DRAFT_REL).startsWith(APP + path.sep)).toBe(false)
    expect(draft).toContain('**Status: DRAFT — NOT APPROVED — NOT FOR PUBLICATION.**')
    const marker = 'This notice explains how SI8 handles personal information in the Commercial Readiness Check'
    for (const f of served) {
      if (!/\.(tsx?|jsx?|mdx?|json|html|txt)$/.test(f)) continue
      const text = readFileSync(f, 'utf8')
      expect({ f, hit: text.includes(marker) || /CRC_PRIVACY_NOTICE_DRAFT\.md['"`]/.test(text) }).toEqual({ f, hit: false })
    }
    expect(served.some((f) => f.startsWith(path.join(APP, 'public')) && /crc/i.test(path.basename(f)) && /privacy/i.test(path.basename(f)))).toBe(false)
  })

  test('/crc/privacy renders no 1B draft content: no unresolved markers, no draft-only wording', () => {
    for (const searchParams of [{}, { lang: 'zh-TW' }]) {
      const html = renderToStaticMarkup(createElement(CrcPrivacyPage, { searchParams }))
      expect(html).not.toMatch(/UNRESOLVED|DRAFT|NOT FOR PUBLICATION|30 days|12 months|30 天|12 個月/)
      expect(html).not.toContain('This notice explains how SI8 handles personal information in the Commercial Readiness Check')
    }
  })

  test('the draft never states the 30-day cleanup as active: every mention is inside an UNRESOLVED marker', () => {
    expect(draft).toMatch(/30 days/)
    const outsideMarkers = draft.replace(/\[UNRESOLVED[^\]]*\]/g, '')
    expect(outsideMarkers).not.toMatch(/30[- ]day|30 days|thirty days/i)
    expect(draft).toMatch(/\[UNRESOLVED: state "cleared after 30 days" only once the 30-day\s+clearing is running in Production/)
  })
})
