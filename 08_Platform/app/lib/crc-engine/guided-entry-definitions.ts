/**
 * Guided Entry Foundation (GE-1) — definition catalogue.
 *
 * Data/config, not architecture (Diagnostic Phase 3/14). One minimal,
 * deliberately non-legal test fixture, proving the generic field-kind
 * mapping (workflow_role + tool + jurisdiction) — NOT the production 2-3
 * role catalogue (explicitly out of scope for GE-1, see the task's own
 * PHASE 11 instruction). Adding a real role later is a data change to this
 * array, never a new type, component, or orchestration path.
 *
 * Tool options are NOT a duplicated canonical list — every `value` below is
 * checked again, independently, against `CANONICAL_TOOL_IDS`
 * (lib/tool-identity/registry.ts, the authoritative registry) at validation
 * time in guided-entry-init.ts. Listing a small, curated subset of
 * currently-canonical ids here (for THIS definition's own UI) does not
 * relieve that check — see `isCanonicalToolIdentity`'s own call site there.
 */

import type { GuidedEntryDefinition } from '@/types/guided-entry'

export const GUIDED_ENTRY_DEFINITIONS: GuidedEntryDefinition[] = [
  {
    definitionId: 'agency-producing-for-client',
    version: 'v1',
    label: 'Agency / producing for a client',
    description: 'You are producing AI video on behalf of a client, not for your own use.',
    establishes:
      'Selecting this tells CRC your workflow role is "agency, producing for a client." It does NOT tell CRC anything about client authorization, ownership, clearance, commercial permission, jurisdiction, or contract terms — you will confirm those separately, or CRC will ask if relevant.',
    fields: [
      {
        kind: 'workflow_role',
        fieldId: 'workflow_role',
        required: true,
        prompt: 'This selection itself establishes your workflow role as shown above.',
        options: [{ value: 'agency, producing for a client', label: 'Agency / producing for a client' }],
      },
      {
        kind: 'tool',
        fieldId: 'tool',
        required: false,
        prompt: 'Which AI tool did you use? (You can skip this and tell CRC in your own words instead.)',
        options: [
          { value: 'runway-gen3', label: 'Runway Gen-3' },
          { value: 'kling', label: 'Kling' },
          { value: 'google-veo', label: 'Google Veo' },
        ],
      },
      {
        kind: 'jurisdiction',
        fieldId: 'jurisdiction',
        required: false,
        prompt: 'Which jurisdiction should CRC consider? (You can skip this and tell CRC in your own words instead.)',
        options: [
          { value: 'United States', label: 'United States' },
          { value: 'European Union', label: 'European Union' },
        ],
      },
    ],
  },
]

export function findGuidedEntryDefinition(definitionId: string, version: string): GuidedEntryDefinition | null {
  return GUIDED_ENTRY_DEFINITIONS.find((d) => d.definitionId === definitionId && d.version === version) ?? null
}
