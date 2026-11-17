/**
 * SI8-PRIVACY-CRC-1B — the CRC privacy-notice publication gate, the results-gate link and the disclosure version.
 * Nothing here publishes anything: CRC_PRIVACY_NOTICE is null, so the link is hidden and captures keep recording v1.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CRC_PRIVACY_NOTICE, CRC_PRIVACY_PATH, crcPrivacyNoticePublished, isCompleteLegalDocument } from '@/lib/legal/crc-privacy-notice'
import { legalPageContent, PRIVACY_NOTICE, LEGAL_PATHS, type ApprovedLegalDocument } from '@/lib/legal/policies'
import { currentCaptureNoticeVersion, RESULTS_GATE_NOTICE_V2 } from '@/lib/crc-engine/results-gate-notice'
import { CRC_CONFIG } from '@/lib/crc-engine/config'
import { RESULTS_GATE_COPY } from '@/lib/crc-engine/results-gate-copy'
import { getResultsGateCopyLocalized } from '@/components/crc/crc-ui-copy'
import { ResultsGatePrivacyLink } from '@/components/crc/ResultsGatePrivacyLink'
import CrcPrivacyPage, { metadata } from '@/app/crc/privacy/page'

const APP = path.join(__dirname, '..', '..')
const src = (p: string) => readFileSync(path.join(APP, p), 'utf8')

// A synthetic, obviously-not-real document used only to exercise the published branch.
const SAMPLE: ApprovedLegalDocument = {
  version: 'crc-privacy-test-1',
  effective_date: '2099-01-01',
  approval_reference: 'TEST-ONLY',
  title: 'Test notice',
  paragraphs: ['Test paragraph.'],
}

describe('publication gate', () => {
  test('no CRC notice is approved: the slot is null and nothing is published', () => {
    expect(CRC_PRIVACY_NOTICE).toBeNull()
    expect(crcPrivacyNoticePublished()).toBe(false)
  })

  test('completeness rule agrees with the Creator Record legal-page rule', () => {
    const cases: (ApprovedLegalDocument | null)[] = [
      null, SAMPLE,
      { ...SAMPLE, version: 'X' }, { ...SAMPLE, version: 'UPPER-case' }, { ...SAMPLE, effective_date: '2099-1-1' },
      { ...SAMPLE, approval_reference: '  ' }, { ...SAMPLE, title: '' }, { ...SAMPLE, paragraphs: [] }, { ...SAMPLE, paragraphs: ['ok', ' '] },
    ]
    for (const c of cases) expect(isCompleteLegalDocument(c)).toBe(legalPageContent(c).available)
  })

  test('/crc/privacy shows the fixed unavailable notice and is not indexed', () => {
    const html = renderToStaticMarkup(createElement(CrcPrivacyPage))
    expect(html).toContain('data-legal-unavailable')
    expect(html).toContain('This document is not available yet.')
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  test('the CRC notice has its own path, separate from the Creator Record notice', () => {
    expect(CRC_PRIVACY_PATH).toBe('/crc/privacy')
    expect(LEGAL_PATHS.privacy).toBe('/privacy')
  })

  test('the Creator Record Privacy Notice is unchanged', () => {
    expect(PRIVACY_NOTICE?.version).toBe('privacy-2026-11-09')
    expect(PRIVACY_NOTICE?.approval_reference).toBe('JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109')
    expect(PRIVACY_NOTICE?.paragraphs[0]).toContain("It does not cover SI8's marketing website or SI8's other services.")
  })

  test('the client-safe module imports only a type from the policy text module', () => {
    const s = src('lib/legal/crc-privacy-notice.ts')
    expect(s).toMatch(/import type \{ ApprovedLegalDocument \} from '\.\/policies'/)
    expect(s).not.toMatch(/^import \{[^}]*\} from '\.\/policies'/m)
  })
})

describe('results-gate link', () => {
  test('hidden while the notice is unpublished (EN and zh-TW)', () => {
    expect(renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'en' }))).toBe('')
    expect(renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'zh-TW' }))).toBe('')
  })

  test('once published: a link to /crc/privacy in a new tab (EN)', () => {
    const html = renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'en', doc: SAMPLE }))
    expect(html).toContain('href="/crc/privacy"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('Commercial Readiness Check Privacy Notice')
  })

  test('once published: zh-TW wording', () => {
    const html = renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'zh-TW', doc: SAMPLE }))
    expect(html).toContain('商業就緒度檢查隱私權聲明')
    expect(html).toContain('href="/crc/privacy"')
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
    expect(page).toMatch(/\{resultsGateCopy\.disclosure\}<\/p>\n\s*<ResultsGatePrivacyLink locale=\{locale\} \/>/)
  })
})

describe('disclosure version', () => {
  test('unpublished: new captures keep recording results-gate-v1', () => {
    expect(CRC_CONFIG.captureNoticeVersion).toBe('results-gate-v1')
    expect(currentCaptureNoticeVersion()).toBe('results-gate-v1')
    expect(currentCaptureNoticeVersion(null)).toBe('results-gate-v1')
  })

  test('published (link displayed): results-gate-v2', () => {
    expect(RESULTS_GATE_NOTICE_V2).toBe('results-gate-v2')
    expect(currentCaptureNoticeVersion(SAMPLE)).toBe('results-gate-v2')
  })

  test('link display and recorded version use the same check', () => {
    expect(src('components/crc/ResultsGatePrivacyLink.tsx')).toContain('crcPrivacyNoticePublished(doc)')
    expect(src('lib/crc-engine/results-gate-notice.ts')).toContain('crcPrivacyNoticePublished')
    expect(src('lib/crc-engine/results-email-delivery.ts')).toContain('capture_notice_version: currentCaptureNoticeVersion()')
  })
})
