/**
 * Results-email content renderer tests (CRC Results Gate milestone,
 * 2026-08-14). Confirms the email uses ONLY existing ProjectionOutput
 * fields + fixed product copy -- no invented content.
 */

import { buildResultsEmailContent } from '../../lib/crc-engine/results-email-template'
import type { ProjectionOutput } from '../../lib/projection-layer/types'

const FULL_OUTPUT: ProjectionOutput = {
  opening_line: 'You mentioned using Veo for a client project.',
  understood_summary: 'Here is what we understood about your workflow.',
  knowledge_items: [{ claim_id: 'c1', statement: 'Veo commercial terms depend on plan tier.', last_verified: '2026-08-01T00:00:00.000Z' }],
  closing_cta: 'ignored -- retired at the display layer',
}

const EMPTY_OUTPUT: ProjectionOutput = { opening_line: '', understood_summary: '', knowledge_items: [], closing_cta: '' }

describe('buildResultsEmailContent', () => {
  test('includes opening_line, understood_summary, and each knowledge item statement', () => {
    const { html, text } = buildResultsEmailContent(FULL_OUTPUT, 'attr-1', 'jd@example.com')
    for (const target of [html, text]) {
      expect(target).toContain('You mentioned using Veo for a client project.')
      expect(target).toContain('Here is what we understood about your workflow.')
      expect(target).toContain('Veo commercial terms depend on plan tier.')
    }
  })

  test('includes "Content last updated" for an item with last_verified', () => {
    const { html, text } = buildResultsEmailContent(FULL_OUTPUT, 'attr-1', 'jd@example.com')
    expect(html).toContain('Content last updated')
    expect(text).toContain('Content last updated')
  })

  test('empty-state fallback renders when opening_line/understood_summary/knowledge_items are all empty', () => {
    const { html, text } = buildResultsEmailContent(EMPTY_OUTPUT, 'attr-1', 'jd@example.com')
    // html-escapes apostrophes (&#39;) -- text does not, since it's not HTML.
    expect(html).toContain('enough information shared')
    expect(text).toContain("wasn't enough information shared")
  })

  test('includes the CTA link with attribution and the educational disclaimer', () => {
    const { html, text } = buildResultsEmailContent(FULL_OUTPUT, 'my-token', 'jd@example.com')
    expect(html).toContain('calendly.com/aipenguins/superimmersive8')
    expect(html).toContain('utm_content=my-token')
    expect(html).toContain('Talk with SI8 about a Commercial Assurance Assessment')
    expect(text).toContain('Talk with SI8 about a Commercial Assurance Assessment')
    expect(html).toContain('not an SI8 Commercial Assurance Assessment')
  })

  test('includes "How this understanding was built" verbatim from the bridge copy', () => {
    const { html } = buildResultsEmailContent(FULL_OUTPUT, 'attr-1', 'jd@example.com')
    expect(html).toContain('How this understanding was built')
    expect(html).toContain('independent SI8 reviewer examines evidence')
  })

  test('escapes HTML-significant characters in ProjectionOutput text', () => {
    const withMarkup: ProjectionOutput = {
      ...EMPTY_OUTPUT,
      opening_line: '<script>alert(1)</script> & "quotes"',
    }
    const { html } = buildResultsEmailContent(withMarkup, undefined, 'jd@example.com')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  test('never mentions PDF or attachments', () => {
    const { html, text } = buildResultsEmailContent(FULL_OUTPUT, 'attr-1', 'jd@example.com')
    expect(html.toLowerCase()).not.toContain('pdf')
    expect(text.toLowerCase()).not.toContain('pdf')
  })
})
