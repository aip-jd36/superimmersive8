/**
 * Guided Entry Foundation — definition catalogue.
 *
 * Data/config, not architecture (GE-1 Diagnostic Phase 3/14). GE-2 expands
 * this from GE-1's single test fixture to the three PM-approved initial
 * roles (Agency / Independent / In-house) — still pure data: no new type,
 * component, or orchestration path was needed to add them. Each
 * establishes ONLY a workflow_role self-description; none implies
 * authorization, ownership, clearance, commercial permission, jurisdiction,
 * contract terms, or evidence status (see each definition's own
 * `establishes` text, which is what the UI renders to the user BEFORE they
 * answer anything — GE-1 Diagnostic Phase 5's own disclosure requirement).
 *
 * Tool/jurisdiction fields are intentionally IDENTICAL across all three
 * roles (GUIDED_ENTRY_TOOL_FIELD / GUIDED_ENTRY_JURISDICTION_FIELD, shared
 * constants, not copy-pasted) — the role only changes workflow_role; what
 * CRC asks next does not depend on it, matching the approved mock (screens
 * 2-4 read identically regardless of which role card was tapped).
 *
 * Tool options are NOT a duplicated canonical list — every `value` below is
 * checked again, independently, against `CANONICAL_TOOL_IDS`
 * (lib/tool-identity/registry.ts, the authoritative registry) at validation
 * time in guided-entry-init.ts, and the GE-2 UI renders tool/jurisdiction
 * options FROM these same field.options arrays rather than maintaining any
 * separate frontend list — see components/crc/CrcEntryFlow.tsx.
 */

import type { GuidedEntryDefinition, GuidedFieldSpec } from '@/types/guided-entry'

const GUIDED_ENTRY_TOOL_FIELD: GuidedFieldSpec = {
  kind: 'tool',
  fieldId: 'tool',
  required: false,
  prompt: 'Which tool did you use to generate the AI video?',
  options: [
    { value: 'runway-gen3', label: 'Runway Gen-3' },
    { value: 'kling', label: 'Kling' },
    { value: 'google-veo', label: 'Google Veo' },
    { value: 'pika', label: 'Pika' },
    { value: 'luma', label: 'Luma' },
  ],
}

const GUIDED_ENTRY_JURISDICTION_FIELD: GuidedFieldSpec = {
  kind: 'jurisdiction',
  fieldId: 'jurisdiction',
  required: false,
  prompt: 'Which jurisdiction should we consider?',
  options: [
    { value: 'United States', label: 'United States' },
    { value: 'European Union', label: 'European Union' },
    // CRC-GE-TW-1 (2026-09-22). 'Taiwan' is the SAME canonical jurisdiction
    // string already used by the adopted, CRC-Eligible
    // CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1 TopicClaim
    // (lib/retrieval-engine/topic-claims-fixture.ts, applicability_requirements:
    // [{fact:'jurisdiction', operator:'equals', value:'Taiwan'}]) and the
    // pre-existing worked example in types/interview-engine.ts's own
    // ProjectFacts.jurisdiction doc comment ('e.g. "United States", "Taiwan"')
    // -- not a newly-invented identifier. This is the ONLY line this
    // milestone adds here; validateGuidedEntryRequest (guided-entry-init.ts)
    // already validates submitted values against this same options array
    // generically, with no jurisdiction-specific allow-list to separately
    // extend, and applyOneGuidedField's own 'jurisdiction' case already
    // accepts any string as an AssessmentJurisdictionMention value with no
    // canonical-registry check (unlike 'tool') -- so adding this one option
    // is sufficient, end to end, with zero other code change required.
    { value: 'Taiwan', label: 'Taiwan' },
  ],
}

export const GUIDED_ENTRY_DEFINITIONS: GuidedEntryDefinition[] = [
  {
    definitionId: 'agency-producing-for-client',
    version: 'v1',
    label: 'Agency',
    description: 'For a client',
    establishes:
      'Selecting this tells CRC your workflow role is "agency, producing for a client." It does NOT tell CRC anything about client authorization, ownership, clearance, commercial permission, jurisdiction, contract terms, or evidence status — you will confirm those separately, or CRC will ask if relevant.',
    fields: [
      {
        kind: 'workflow_role',
        fieldId: 'workflow_role',
        required: true,
        prompt: 'This selection itself establishes your workflow role as shown above.',
        options: [{ value: 'agency, producing for a client', label: 'Agency / producing for a client' }],
      },
      GUIDED_ENTRY_TOOL_FIELD,
      GUIDED_ENTRY_JURISDICTION_FIELD,
    ],
  },
  {
    definitionId: 'independent-own-work',
    version: 'v1',
    label: 'Independent',
    description: 'My own work',
    establishes:
      'Selecting this tells CRC your workflow role is "independent creator, my own work." It does NOT tell CRC anything about ownership, clearance, commercial permission, jurisdiction, or evidence status — you will confirm those separately, or CRC will ask if relevant.',
    fields: [
      {
        kind: 'workflow_role',
        fieldId: 'workflow_role',
        required: true,
        prompt: 'This selection itself establishes your workflow role as shown above.',
        options: [{ value: 'independent creator, my own work', label: 'Independent / my own work' }],
      },
      GUIDED_ENTRY_TOOL_FIELD,
      GUIDED_ENTRY_JURISDICTION_FIELD,
    ],
  },
  {
    definitionId: 'in-house-own-organization',
    version: 'v1',
    label: 'In-house',
    description: 'For my organization',
    establishes:
      'Selecting this tells CRC your workflow role is "in-house team, for my own organization." It does NOT tell CRC anything about employer authorization, internal approval, rights ownership, clearance, commercial permission, jurisdiction, or evidence status — you will confirm those separately, or CRC will ask if relevant.',
    fields: [
      {
        kind: 'workflow_role',
        fieldId: 'workflow_role',
        required: true,
        prompt: 'This selection itself establishes your workflow role as shown above.',
        options: [{ value: 'in-house team, for my own organization', label: 'In-house / for my organization' }],
      },
      GUIDED_ENTRY_TOOL_FIELD,
      GUIDED_ENTRY_JURISDICTION_FIELD,
    ],
  },
]

export function findGuidedEntryDefinition(definitionId: string, version: string): GuidedEntryDefinition | null {
  return GUIDED_ENTRY_DEFINITIONS.find((d) => d.definitionId === definitionId && d.version === version) ?? null
}
