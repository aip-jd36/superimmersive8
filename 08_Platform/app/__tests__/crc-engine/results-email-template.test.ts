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
  goal_interpretations: [],
  closing_cta: 'ignored -- retired at the display layer',
}

const EMPTY_OUTPUT: ProjectionOutput = { opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' }

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

  test('renders "What this means for what you asked" with the goal quoted verbatim, only when goal_interpretations is non-empty (CRC Milestone 2, 2026-08-15)', () => {
    const withGoal: ProjectionOutput = {
      ...FULL_OUTPUT,
      goal_interpretations: [{ goal_text: 'Do I own the copyright for this?', summary: 'Fixed bounded summary text.', summary_blocks: ['Fixed bounded summary text.'] }],
    }
    const { html, text } = buildResultsEmailContent(withGoal, 'attr-1', 'jd@example.com')
    for (const target of [html, text]) {
      expect(target).toMatch(/what this means for what you asked/i)
      expect(target).toContain('Do I own the copyright for this?')
      expect(target).toContain('Fixed bounded summary text.')
    }
  })

  test('a relevant_applicability_unresolved interpretation (Living Knowledge governance review, 2026-08-16) renders through the email exactly like any other goal_interpretations entry -- only goal_text/summary reach the email, no status/claim_id/supporting_claim_ids leak', () => {
    const withUnresolvedApplicability: ProjectionOutput = {
      ...FULL_OUTPUT,
      goal_interpretations: [{
        goal_text: 'Is this copyrightable?',
        summary: "Prompting alone generally doesn't establish sufficient human authorship. This is relevant to whether this kind of output can be copyrighted at all, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project. A human-reviewed Commercial Assurance Assessment can address this directly.",
        summary_blocks: [
          "Prompting alone generally doesn't establish sufficient human authorship. This is relevant to whether this kind of output can be copyrighted at all, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project. A human-reviewed Commercial Assurance Assessment can address this directly.",
        ],
      }],
    }
    const { html, text } = buildResultsEmailContent(withUnresolvedApplicability, 'attr-1', 'jd@example.com')
    for (const target of [html, text]) {
      expect(target).toContain('Is this copyrightable?')
      expect(target).toContain('there isn')
      expect(target).toContain('enough project-specific information to determine')
      // Internal-only fields (never part of ProjectionGoalInterpretation's shape) must not appear.
      expect(target).not.toContain('relevant_applicability_unresolved')
      expect(target).not.toContain('goal_id')
      expect(target).not.toContain('supporting_claim_ids')
    }
  })

  test('omits the "What this means for what you asked" section entirely when goal_interpretations is empty', () => {
    const { html, text } = buildResultsEmailContent(FULL_OUTPUT, 'attr-1', 'jd@example.com')
    expect(html).not.toContain('What this means for what you asked')
    expect(text).not.toContain('WHAT THIS MEANS FOR WHAT YOU ASKED')
  })

  test('multiple goal interpretations are all rendered, none dropped', () => {
    const withTwoGoals: ProjectionOutput = {
      ...EMPTY_OUTPUT,
      goal_interpretations: [
        { goal_text: 'first goal text', summary: 'first summary text', summary_blocks: ['first summary text'] },
        { goal_text: 'second goal text', summary: 'second summary text', summary_blocks: ['second summary text'] },
      ],
    }
    const { html } = buildResultsEmailContent(withTwoGoals, 'attr-1', 'jd@example.com')
    expect(html).toContain('first goal text')
    expect(html).toContain('second goal text')
  })

  test('a non-empty goal_interpretations alone (opening_line/understood_summary/knowledge_items all empty) does not trigger the empty-state fallback', () => {
    const goalOnly: ProjectionOutput = {
      ...EMPTY_OUTPUT,
      goal_interpretations: [{ goal_text: 'a goal', summary: 'a summary', summary_blocks: ['a summary'] }],
    }
    const { html } = buildResultsEmailContent(goalOnly, 'attr-1', 'jd@example.com')
    expect(html).not.toContain('enough information shared')
    expect(html).toContain('What this means for what you asked')
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

  describe('Phase 1 -- structural block paragraphing (2026-08-23)', () => {
    test('a single-block goal interpretation renders exactly one <p> for its content, same as before this milestone', () => {
      const withGoal: ProjectionOutput = {
        ...EMPTY_OUTPUT,
        goal_interpretations: [{ goal_text: 'Can I use this commercially?', summary: 'Only one block here.', summary_blocks: ['Only one block here.'] }],
      }
      const { html, text } = buildResultsEmailContent(withGoal, 'attr-1', 'jd@example.com')
      const pTagCount = (html.match(/<p style="font-size:14px;color:#222;white-space:pre-line/g) || []).length
      expect(pTagCount).toBe(1)
      expect(html).toContain('Only one block here.')
      expect(text).toContain('Only one block here.')
    })

    test('a mixed two-block goal interpretation renders as two separate, identically-styled <p> tags, in order, with all content present', () => {
      const withMixedGoal: ProjectionOutput = {
        ...EMPTY_OUTPUT,
        goal_interpretations: [
          {
            goal_text: 'Can I use that commercially?',
            summary: 'Dependency-free block. Dependency-bearing block with hedge.',
            summary_blocks: ['Dependency-free block.', 'Dependency-bearing block with hedge.'],
          },
        ],
      }
      const { html, text } = buildResultsEmailContent(withMixedGoal, 'attr-1', 'jd@example.com')
      const pTagCount = (html.match(/<p style="font-size:14px;color:#222;white-space:pre-line/g) || []).length
      expect(pTagCount).toBe(2)
      expect(html.indexOf('Dependency-free block.')).toBeLessThan(html.indexOf('Dependency-bearing block with hedge.'))
      // Both <p> tags share the identical style attribute prefix -- no
      // asymmetric emphasis between the dependency-free and
      // dependency-bearing blocks.
      const firstStyle = html.match(/<p style="([^"]*)">Dependency-free block\./)?.[1]
      const secondStyle = html.match(/<p style="([^"]*)">Dependency-bearing block with hedge\./)?.[1]
      expect(firstStyle).toBeDefined()
      expect(secondStyle).toBeDefined()
      expect(firstStyle?.replace(/margin:[^;]+;/, '')).toBe(secondStyle?.replace(/margin:[^;]+;/, ''))
      expect(text).toContain('Dependency-free block.')
      expect(text).toContain('Dependency-bearing block with hedge.')
      // Plain-text fallback separates blocks with a blank line.
      expect(text).toContain('Dependency-free block.\n\nDependency-bearing block with hedge.')
    })

    test('no color implies risk/status -- the full email never uses red/amber/green status-coded values', () => {
      const withMixedGoal: ProjectionOutput = {
        ...FULL_OUTPUT,
        goal_interpretations: [{ goal_text: 'Q', summary: 'A. B.', summary_blocks: ['A.', 'B.'] }],
      }
      const { html } = buildResultsEmailContent(withMixedGoal, 'attr-1', 'jd@example.com')
      expect(html.toLowerCase()).not.toMatch(/color:\s*(red|green|orange|#f00\b|#0f0\b|#ff0000|#00ff00|#ffa500)/)
    })

    test('new structural headings are purely presentational -- "Your workflow" and "Current guidance" appear only as section labels, not new substantive claims', () => {
      const { html, text } = buildResultsEmailContent(FULL_OUTPUT, 'attr-1', 'jd@example.com')
      expect(html).toContain('Your workflow')
      expect(html).toContain('Current guidance')
      expect(text).toContain('YOUR WORKFLOW')
      expect(text).toContain('CURRENT GUIDANCE')
    })
  })
})
