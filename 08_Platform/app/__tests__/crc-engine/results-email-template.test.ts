/**
 * Results-email content renderer tests (CRC Results Gate milestone,
 * 2026-08-14). Confirms the email uses ONLY existing ProjectionOutput
 * fields + fixed product copy -- no invented content.
 */

import { buildResultsEmailContent } from '../../lib/crc-engine/results-email-template'
import type { ProjectionOutput } from '../../lib/projection-layer/types'
import { buildConsultativeAnswerPlan } from '../../lib/crc-engine/consultative-answer-plan'
import { buildBoundedInterpretations } from '../../lib/bounded-interpretation/build-bounded-interpretation'
import { assembleProjectionOutput } from '../../lib/projection-layer/assemble-projection-output'
import { retrieve } from '../../lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '../../lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '../../lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '../../lib/retrieval-engine/topic-relationships-fixture'
import { buildRetrievalHandoff } from '../../lib/interview-engine/handoff'
import { deriveAssessmentJurisdictionFacts } from '../../lib/crc-engine/assessment-jurisdiction-scope'
import { deriveDiscoveredTopicOccurrences } from '../../lib/crc-engine/discovered-relevance'
import type { ApplicabilityFacts } from '../../lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, StructuredUnderstanding, ToolMention, UserGoal } from '../../types/interview-engine'

const FULL_OUTPUT: ProjectionOutput = {
  opening_line: 'You mentioned using Veo for a client project.',
  understood_summary: 'Here is what we understood about your workflow.',
  knowledge_items: [{ claim_id: 'c1', matrix_identifier: 'veo', statement: 'Veo commercial terms depend on plan tier.', last_verified: '2026-08-01T00:00:00.000Z' }],
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

  describe('CC-3B / CC-3B.1 -- deterministic consultative surface realization', () => {
    const h = (o: Partial<RetrievalHandoff> = {}): RetrievalHandoff => ({
      tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [],
      workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [], certainty_state: 'gate_1_unmet', exclusions: [], ...o,
    })
    const tool = (identifier: string) => ({ identifier, access_surface: 'unresolved' as const, plan_tier: 'unknown' as const })
    const g = (goal_id: string, raw_text: string, category: UserGoal['category']): UserGoal =>
      ({ goal_id, raw_text, category, state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: raw_text })
    const tmn = (identifier: string): ToolMention => ({
      mention_id: `m-${identifier}`, resolution: { kind: 'canonical', identifier },
      access_surface: { state: 'unknown' }, plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' },
      confidence: 'confirmed', source_turn: 1, source_statement: identifier, superseded_by: null,
    })
    const facts = (tms: ToolMention[] = []): ApplicabilityFacts => ({ jurisdiction: { included: [], excluded: [] }, toolMentions: tms })

    function pipeline(handoff: RetrievalHandoff, goals: UserGoal[], applic: ApplicabilityFacts, opts: { topicClaims?: unknown[]; relationships?: unknown[]; discovered?: unknown[] } = {}) {
      const out = retrieve(
        handoff, MATRIX_FIXTURE, goals,
        (opts.topicClaims ?? []) as never,
        applic,
        (opts.relationships ?? []) as never,
        handoff.asset_providers,
        (opts.discovered ?? []) as never,
      )
      const interps = buildBoundedInterpretations(goals, out.results, out.diagnostics)
      const { output } = assembleProjectionOutput(handoff, out.results, interps)
      const plan = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)
      return { output, plan, results: out.results }
    }

    test('CASE 1 (Runway, one goal): governed guidance appears exactly ONCE, under "What this means", not also under "Current guidance"', () => {
      const { output, plan } = pipeline(h({ tools: [tool('runway-gen3')] }), [g('g1', 'Can I use it commercially?', 'commercial_use')], facts())
      const stmt = output.knowledge_items[0].statement
      const withoutPlan = buildResultsEmailContent(output, 'attr-1', 'jd@example.com')
      const withPlan = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', plan)

      // before CC-3B: the statement appears twice (Current guidance + What this means)
      expect(withoutPlan.text.split(stmt.slice(0, 40)).length - 1).toBe(2)
      // after CC-3B: exactly once
      expect(withPlan.text.split(stmt.slice(0, 40)).length - 1).toBe(1)
      // it survives, inside the goal section (plain-text is unescaped)
      expect(withPlan.html).toContain('What this means for what you asked')
      expect(withPlan.text).toContain(stmt)
      // "Current guidance" heading is gone (nothing left to render there)
      expect(withPlan.html).not.toContain('Current guidance')
      expect(withPlan.text).not.toContain('CURRENT GUIDANCE')
    })

    test('CASE 2 (Suno + Kling, unresolved applicability): Suno/Kling guidance rendered once; no blocker/material/prevents/clears language; boundary preserved', () => {
      const { output, plan } = pipeline(
        h({ tools: [tool('suno'), tool('kling')] }),
        [g('g1', 'Can I use it commercially?', 'commercial_use')],
        facts([tmn('suno'), tmn('kling')]),
      )
      const { html, text } = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', plan)

      // the Suno conditional text appears once, inside the goal section
      const sunoFragment = 'Pro or Premier paid-tier subscription term'
      expect(text.split(sunoFragment).length - 1).toBe(1)
      // the "additional governed guidance" hedge (from BI) is still present -- CC-3B does not remove it
      expect(text).toMatch(/additional governed guidance/i)
      // no materiality / blocker language introduced anywhere
      expect(text.toLowerCase()).not.toMatch(/\b(blocker|the material issue|prevents commercial use|you're cleared|this is resolved|will clear this)\b/)
      // CRC boundary + CA CTA preserved exactly, once, at the end
      expect(html).toContain('not an SI8 Commercial Assurance Assessment')
      expect(html).toContain('Talk with SI8 about a Commercial Assurance Assessment')
      expect((html.match(/not an SI8 Commercial Assurance Assessment/g) || []).length).toBe(1)
    })

    test('CASE 3 (explicit + discovered, REAL pipeline: Kling + iStock): each governed occurrence renders exactly once; discovered stock guidance is NOT duplicated', () => {
      const su: StructuredUnderstanding = {
        project_facts: {
          intended_use: { attestation: { state: 'confirmed', value: 'client ad' }, source_turn: 1, source_statement: 'x' },
          workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
          jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
          human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        },
        tool_mentions: [tmn('kling')],
        scoped_observations: [],
        user_goals: [g('g1', 'Can I use it commercially?', 'commercial_use')],
        asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' }, confidence: 'confirmed', source_turn: 1, source_statement: 'iStock footage', superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } }],
        assessment_jurisdiction_mentions: [], content_presence_mentions: [],
        current_phase: 3, gate_1_state: 'met', gate_2_state: 'stable', completion_reason: null, opt_out_scope: null,
      }
      const handoff = buildRetrievalHandoff(su)
      const applic = { jurisdiction: deriveAssessmentJurisdictionFacts(su), toolMentions: su.tool_mentions }
      const discovered = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
      const { output, plan, results } = pipeline(handoff, su.user_goals, applic, { topicClaims: TOPIC_CLAIMS_FIXTURE as unknown[], relationships: TOPIC_RELATIONSHIPS_FIXTURE as unknown[], discovered: discovered as unknown[] })

      // sanity: discovered stock claims were produced and folded into the goal summary
      const discoveredIds = results.filter((r) => r.match_origin === 'discovered_topic').map((r) => r.claim_id)
      expect(discoveredIds.length).toBeGreaterThan(0)

      const { html, text } = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', plan)

      // each governed statement appears exactly once, all inside "What this means"
      for (const item of output.knowledge_items) {
        const frag = item.statement.slice(0, 45)
        expect(text.split(frag).length - 1).toBe(1)
      }
      // every discovered claim's prose sits inside the goal section, NOT a second "Also relevant" block
      expect(html).toContain('What this means for what you asked')
      expect(html).not.toContain('Also relevant to your workflow')
      expect(text).not.toContain('ALSO RELEVANT')
      // no fabricated goal for the discovered topic
      expect(plan.explicit_sections.map((s) => s.category)).toEqual(['commercial_use'])
      // Track C provenance is retained in the plan
      expect(plan.discovered_context.map((d) => d.claim_ref.claim_id).sort()).toEqual([...discoveredIds].sort())
    })

    test('CASE 4 (no goal / outside coverage): with an empty plan, output is byte-identical to the no-plan render (fail closed to existing behavior)', () => {
      const { output, plan } = pipeline(h({ tools: [tool('runway-gen3')] }), [], facts())
      expect(plan.explicit_sections).toEqual([])
      const withPlan = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', plan)
      const withoutPlan = buildResultsEmailContent(output, 'attr-1', 'jd@example.com')
      expect(withPlan).toEqual(withoutPlan)
    })

    test('CASE 5 (correction/supersession): a post-correction output/plan referencing only Kling renders no Suno content', () => {
      const ref = { claim_id: 'kling-commercial-use-baseline', matrix_identifier: 'kling', match_origin: 'exact_topic' as const, matched_goal_category: 'commercial_use' as const, relationship_id: null, last_verified: null }
      const output: ProjectionOutput = {
        opening_line: 'x', understood_summary: 'x',
        knowledge_items: [{ claim_id: 'kling-commercial-use-baseline', matrix_identifier: 'kling', statement: 'Kling governed statement.', last_verified: null }],
        goal_interpretations: [{ goal_text: 'Can I use it commercially?', summary: 'Kling governed statement. Boundary.', summary_blocks: ['Kling governed statement. Boundary.'] }],
        closing_cta: '',
      }
      const plan = {
        explicit_sections: [{
          goal_text: 'Can I use it commercially?', category: 'commercial_use' as const, bi_status: 'directly_relevant' as const, disposition: 'governed_guidance_available' as const,
          supported_claim_refs: [ref], summary_claim_refs: [ref],
          unresolved_items: [], missing_evidence: [], boundary_ref: 'tool_source' as const, bi_summary_blocks: ['x'],
        }],
        discovered_context: [], render_once_markers: [], commercial_assurance_refs: [],
      }
      const { html, text } = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', plan)
      expect(html.toLowerCase()).not.toContain('suno')
      expect(text.toLowerCase()).not.toContain('suno')
    })

    test('no-plan call is byte-for-byte identical to the pre-CC-3B renderer for every existing scenario', () => {
      const scenarios: ProjectionOutput[] = [
        FULL_OUTPUT,
        EMPTY_OUTPUT,
        { ...FULL_OUTPUT, goal_interpretations: [{ goal_text: 'Q', summary: 'A.', summary_blocks: ['A.'] }] },
        { ...EMPTY_OUTPUT, goal_interpretations: [{ goal_text: 'Q', summary: 'A. B.', summary_blocks: ['A.', 'B.'] }] },
      ]
      for (const s of scenarios) {
        expect(buildResultsEmailContent(s, 'attr-1', 'jd@example.com', undefined)).toEqual(buildResultsEmailContent(s, 'attr-1', 'jd@example.com'))
      }
    })

    test('deterministic -- same output+plan renders identically across calls', () => {
      const { output, plan } = pipeline(h({ tools: [tool('suno'), tool('kling')] }), [g('g1', 'commercial?', 'commercial_use')], facts([tmn('suno'), tmn('kling')]))
      expect(buildResultsEmailContent(output, 'a', 'e@x.com', plan)).toEqual(buildResultsEmailContent(output, 'a', 'e@x.com', plan))
    })
  })
})
