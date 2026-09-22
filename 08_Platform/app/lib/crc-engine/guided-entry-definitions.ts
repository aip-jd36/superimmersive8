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
 *
 * CRC-GE-MULTITOOL-1 (2026-09-22). Product decision: a real AI-video
 * production can use several distinct AI tools across different production
 * functions (video generation, image generation feeding a video workflow,
 * voice/audio, music, avatars). GUIDED_ENTRY_TOOL_FIELD changed from
 * `cardinality: 'single'` to `'multiple'` and the question itself broadened
 * from "which tool generated the video" to "which AI tools did you use for
 * this production" — the field now exposes 13 of the 14 CANONICAL_TOOL_IDS
 * (every identity except 'openai-sora', a discontinued platform kept
 * canonical only for historical RecordForm/CertForm submissions — see
 * PLATFORM-RIGHTS-MATRIX.md's own "OpenAI Sora — DISCONTINUED" row). This
 * remains pure data: `cardinality` is read generically by
 * validateGuidedEntryRequest/applyGuidedEntrySelection (guided-entry-init.ts)
 * and by CrcEntryFlow.tsx's own field renderer — no field-kind-specific
 * (i.e. no `if (fieldId === 'tool')`) branching was added anywhere to
 * support this. ARCHITECTURAL CONTRACT (unchanged, restated): selecting a
 * tool here records only a ProjectFact (an ordinary ToolMention) — it never
 * implies CRC has substantive Living Knowledge for that tool, commercial
 * permission, clearance, evidence, plan/account status, claim
 * applicability, CRC eligibility of any claim, or any Bounded Interpretation
 * conclusion. Retrieval/Living Knowledge/Bounded Interpretation alone
 * determine what CRC may actually conclude about any selected tool — see
 * lib/retrieval-engine/lookup-topic-claims.ts's own toolScopeMatches, which
 * already evaluates every active tool identity generically and is
 * completely unmodified by this milestone. Seedance is explicitly NOT
 * added — not currently a canonical/onboarded identity (CRC-GE-SEEDANCE-1),
 * out of scope for this milestone.
 */

import type { GuidedEntryDefinition, GuidedFieldSpec } from '@/types/guided-entry'

const GUIDED_ENTRY_TOOL_FIELD: GuidedFieldSpec = {
  kind: 'tool',
  fieldId: 'tool',
  required: false,
  prompt: 'Which AI tools did you use for this production?',
  cardinality: 'multiple',
  options: [
    { value: 'runway-gen3', label: 'Runway Gen-3' },
    { value: 'kling', label: 'Kling' },
    { value: 'google-veo', label: 'Google Veo' },
    { value: 'pika', label: 'Pika' },
    { value: 'luma', label: 'Luma' },
    // CRC-GE-MULTITOOL-1 (2026-09-22). The following 8 identities are
    // already canonical (lib/tool-identity/registry.ts) and already carry
    // real, CRC-eligible governed claims (topic-claims-fixture.ts /
    // PLATFORM-RIGHTS-MATRIX.md) -- none is newly invented here. Under the
    // broadened "which AI tools did you use for this production" question
    // (CRC-GE-VIDEO-CATALOGUE-1's own diagnostic), image/voice/music/avatar
    // generation are all legitimate AI-production functions, not merely
    // the tool that generated the final video -- so general commercial-use
    // Living Knowledge depth is NOT a precondition for exposure here; only
    // canonical identity + genuine production relevance + safe
    // representability as an ordinary ToolMention is. 'openai-sora' is
    // deliberately excluded: its platform is discontinued (web/app
    // shutdown 2026-04-26, API discontinuation 2026-09-24) and its own
    // Matrix CRC-eligibility has never resolved past 'Pending'. 'Seedance'
    // is deliberately NOT added: it is not a canonical identity at all.
    { value: 'midjourney', label: 'Midjourney' },
    { value: 'gemini-api', label: 'Gemini API' },
    { value: 'gemini-consumer-app', label: 'Gemini Consumer App' },
    { value: 'adobe-firefly', label: 'Adobe Firefly' },
    { value: 'stability-ai', label: 'Stability AI' },
    { value: 'synthesia', label: 'Synthesia' },
    { value: 'suno', label: 'Suno' },
    { value: 'elevenlabs', label: 'ElevenLabs' },
  ],
}

const GUIDED_ENTRY_JURISDICTION_FIELD: GuidedFieldSpec = {
  kind: 'jurisdiction',
  fieldId: 'jurisdiction',
  required: false,
  prompt: 'Which jurisdiction should we consider?',
  cardinality: 'single',
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
    // CRC-GE-MULTITOOL-1 (2026-09-22): v1 -> v2. The `tool` field's
    // payload shape materially changed (a single canonical value ->
    // zero-or-more canonical values) -- exactly the trigger
    // GuidedEntryDefinition.version's own doc comment (types/guided-entry.ts)
    // documents this field for. The old 'v1' definition object is not kept
    // around as a parallel executable definition: nothing in this codebase
    // ever re-resolves a historical session's definition id/version back
    // through findGuidedEntryDefinition() after initialization -- a
    // completed session's own persisted `structured_understanding` (real
    // ToolMentions, each with a `[guided_entry] definition=...@v1 field=...`
    // source_statement) plus the stored guided_entry_definition_id/
    // guided_entry_definition_version columns already fully capture what a
    // historical v1 session meant, with no need for v1's schema to stay
    // resolvable. A stale client still requesting 'v1' now fails closed
    // with the same pre-existing "Unknown guided entry definition" error
    // an unrecognized version has always produced.
    version: 'v2',
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
        cardinality: 'single',
        options: [{ value: 'agency, producing for a client', label: 'Agency / producing for a client' }],
      },
      GUIDED_ENTRY_TOOL_FIELD,
      GUIDED_ENTRY_JURISDICTION_FIELD,
    ],
  },
  {
    definitionId: 'independent-own-work',
    version: 'v2',
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
        cardinality: 'single',
        options: [{ value: 'independent creator, my own work', label: 'Independent / my own work' }],
      },
      GUIDED_ENTRY_TOOL_FIELD,
      GUIDED_ENTRY_JURISDICTION_FIELD,
    ],
  },
  {
    definitionId: 'in-house-own-organization',
    version: 'v2',
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
        cardinality: 'single',
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
