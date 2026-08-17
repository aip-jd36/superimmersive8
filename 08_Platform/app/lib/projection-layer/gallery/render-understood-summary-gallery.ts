/**
 * "What we understood" summary — manual-review fixture gallery
 * (PROJECTION_LAYER_ARCHITECTURE.md §9, Prototype Beta, Slice 2). Not a
 * test, not imported by any production module, not subject to the
 * no-Retrieval-logic/no-Matrix import boundary that understood-summary.ts
 * itself must observe — this script exists purely to make the actual
 * rendered text reviewable, reusing existing Interview Engine dialogue
 * fixtures where practical (per instruction) plus a handful of synthetic
 * handoffs for edge cases those 8 fixtures don't happen to exercise (none
 * of the 8 retain a bare unresolved alias in their final handoff, since
 * the one fixture that starts with one — ambiguous_multi_surface_tool —
 * resolves it by the end; none construct a tool-level confirmed_absent/
 * declined field either).
 *
 * Run: npx tsx lib/projection-layer/gallery/render-understood-summary-gallery.ts
 * (registered as `npm run gallery:understood-summary`)
 */

import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import { buildUnderstoodFacts, renderUnderstoodSummary } from '@/lib/projection-layer/understood-summary'
import type { RetrievalHandoff } from '@/types/interview-engine'

interface GalleryCase {
  label: string
  handoff: RetrievalHandoff
}

const fromFixtures: GalleryCase[] = Object.values(DIALOGUE_FIXTURES).map((f) => ({
  label: `Interview Engine fixture: ${f.id} — ${f.description}`,
  handoff: f.retrieval_handoff ?? buildRetrievalHandoff(f.structured_understanding),
}))

const synthetic: GalleryCase[] = [
  {
    label: 'Synthetic: single sparse tool only (the architecture doc\'s own worked example)',
    handoff: {
      tools: [{ identifier: 'Kling', access_surface: 'unresolved', plan_tier: 'unknown' }],
      unresolved_aliases: [],
      asset_providers: [],
      unresolved_asset_provider_mentions: [],
      workflow_role: 'unresolved',
      intended_use: 'unclear',
      scoped_observations: [],
      certainty_state: 'gate_1_unmet',
      exclusions: [],
    },
  },
  {
    label: 'Synthetic: bare unresolved alias, no resolved tools at all',
    handoff: {
      tools: [],
      unresolved_aliases: ['Nano Banana'],
      asset_providers: [],
      unresolved_asset_provider_mentions: [],
      workflow_role: 'unresolved',
      intended_use: 'unclear',
      scoped_observations: [],
      certainty_state: 'gate_1_unmet',
      exclusions: [],
    },
  },
  {
    label: 'Synthetic: resolved tool + a separate unresolved alias in the same conversation',
    handoff: {
      tools: [{ identifier: 'kling', access_surface: 'Web app', plan_tier: 'Pro' }],
      unresolved_aliases: ['Nano Banana'],
      asset_providers: [],
      unresolved_asset_provider_mentions: [],
      workflow_role: 'Producer',
      intended_use: 'Agency deliverable',
      scoped_observations: [],
      certainty_state: 'gate_1_met',
      exclusions: [],
    },
  },
  {
    label: 'Synthetic: tool-level confirmed_absent and declined fields (reachable runtime values the type under-declares)',
    handoff: {
      tools: [{ identifier: 'elevenlabs', access_surface: 'confirmed_absent', plan_tier: 'declined' }],
      unresolved_aliases: [],
      asset_providers: [],
      unresolved_asset_provider_mentions: [],
      workflow_role: 'unresolved',
      intended_use: 'unclear',
      scoped_observations: [],
      certainty_state: 'gate_1_unmet',
      exclusions: [],
    },
  },
  {
    label: 'Synthetic: general_practice observation alongside a current-project one',
    handoff: {
      tools: [{ identifier: 'runway-gen3', access_surface: 'API', plan_tier: 'Team' }],
      unresolved_aliases: [],
      asset_providers: [],
      unresolved_asset_provider_mentions: [],
      workflow_role: 'Producer',
      intended_use: 'Paid social ad campaign',
      scoped_observations: [
        {
          observation_id: 'so-1',
          scope: 'current_project',
          workflow_stage: 'T1',
          confidence: 'confirmed',
          status: 'completed',
          note: 'Generation done entirely in Runway.',
          superseded_by: null,
          source_turn: 1,
          source_statement: 'x',
        },
        {
          observation_id: 'so-2',
          scope: 'general_practice',
          workflow_stage: null,
          confidence: 'confirmed',
          status: null,
          note: 'This creator typically has internal legal review all commercial deliverables before delivery.',
          superseded_by: null,
          source_turn: 2,
          source_statement: 'y',
        },
      ],
      certainty_state: 'gate_1_met',
      exclusions: [],
    },
  },
  {
    label: 'Synthetic: completely empty handoff',
    handoff: {
      tools: [],
      unresolved_aliases: [],
      asset_providers: [],
      unresolved_asset_provider_mentions: [],
      workflow_role: 'unresolved',
      intended_use: 'unclear',
      scoped_observations: [],
      certainty_state: 'gate_1_unmet',
      exclusions: [],
    },
  },
]

const cases: GalleryCase[] = [...fromFixtures, ...synthetic]

console.log(`\n"What we understood" summary — fixture gallery (${cases.length} cases)\n${'='.repeat(72)}\n`)

for (const [i, c] of cases.entries()) {
  const facts = buildUnderstoodFacts(c.handoff)
  const rendered = renderUnderstoodSummary(facts)
  console.log(`[${i + 1}] ${c.label}`)
  console.log(`    → ${rendered === '' ? '(empty string)' : rendered}`)
  console.log('')
}
