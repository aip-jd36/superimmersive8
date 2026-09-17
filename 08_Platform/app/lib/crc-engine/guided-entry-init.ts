/**
 * Guided Entry Foundation (GE-1) — validation + the ONE allow-listed
 * translation boundary from a validated Guided Entry selection to real
 * `StructuredUnderstanding` mutations.
 *
 * ARCHITECTURE INVARIANT: every mutation this module performs goes through
 * the existing, unmodified `lib/interview-engine/mutations.ts` exports
 * (addToolMention, addAssessmentJurisdictionMention, setWorkflowRole) —
 * this module never spreads/edits a StructuredUnderstanding object
 * directly. It is glue, not a second mutation engine.
 *
 * PROVENANCE (Diagnostic Phase 4 — resolved without a schema change):
 * `source_statement` already exists on every mention/fact type and is
 * already a plain string, so no new field is needed. Guided-origin facts
 * use `buildGuidedEntrySourceStatement()` below — a fixed, structured,
 * honestly-tagged string (`[guided_entry] definition=... field=...
 * value="..."`) that a human or a downstream query can recognize as
 * UI-originated and NEVER mistake for conversational prose (real user
 * turns never begin with this literal prefix). A new `input_source`/
 * `attestation_source` enum field was considered and rejected for GE-1:
 * it would touch every mention/fact TYPE, every serialize/deserialize
 * function, and every existing mutation signature in
 * types/interview-engine.ts and serialization.ts — a wide, cross-cutting
 * change to code Free Form also depends on, not a bounded additive one.
 * The existing string field already satisfies the actual requirement
 * ("distinguishable from conversation text, without pretending the user
 * typed a sentence they didn't") — see GUIDED_ENTRY_SOURCE_PREFIX.
 *
 * CONFIDENCE: every guided-origin mutation uses `'confirmed'` — the SAME
 * confidence an equivalent, genuinely-confirmed conversational self-report
 * would carry. Guided input is never elevated above that (Phase 5's own
 * explicit requirement) and is never used to satisfy an evidence-only
 * dependency (no field kind here targets one — see
 * lib/crc-engine/dependency-askability.ts's own closed registry, untouched
 * by this module).
 */

import type { StructuredUnderstanding, ToolMention, AssessmentJurisdictionMention } from '@/types/interview-engine'
import { addToolMention, addAssessmentJurisdictionMention, setWorkflowRole } from '@/lib/interview-engine/mutations'
import { createInitialBoundaryState, type BoundaryState } from '@/lib/interview-engine/boundaries'
import { isCanonicalToolIdentity } from '@/lib/tool-identity/registry'
import { findGuidedEntryDefinition } from './guided-entry-definitions'
import type { GuidedEntryDefinition, GuidedEntrySelection, GuidedFieldKind } from '@/types/guided-entry'

/**
 * Duplicated from lib/crc-engine/run-turn.ts's own private
 * `emptyStructuredUnderstanding()`, NOT imported from
 * lib/interview-engine/eval/empty-structured-understanding.ts (production
 * code must never depend on eval-only code) and NOT imported from
 * run-turn.ts itself (that function is deliberately unexported, and this
 * module should not widen run-turn.ts's own export surface just to reach
 * it — a third small, private copy is the same "small enough to duplicate
 * rather than relocate" call run-turn.ts's own header already made once).
 * Keep in sync with run-turn.ts's copy if StructuredUnderstanding's shape
 * changes — subsystem-boundaries.test.ts-style drift protection is a
 * reasonable future addition, not required for GE-1.
 */
function emptyStructuredUnderstanding(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    distribution_territory_mentions: [],
    organization_location_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

/** Real user turns never begin with this — see module header's provenance discussion. Exported so a future query/test can detect guided-origin facts without re-deriving the format. */
export const GUIDED_ENTRY_SOURCE_PREFIX = '[guided_entry]'

export function buildGuidedEntrySourceStatement(definitionId: string, definitionVersion: string, fieldId: string, value: string): string {
  return `${GUIDED_ENTRY_SOURCE_PREFIX} definition=${definitionId}@${definitionVersion} field=${fieldId} value="${value}"`
}

/** GE-1's own turn-numbering convention (see this module's header comment block above and guided-entry-init's route.ts caller): guided facts are stamped as turn 1 — the initialization moment — and the free-text concern that follows is turn 2, the first real runTurn() call. Exported so route.ts and tests share one number, never two independently-typed literals. */
export const GUIDED_ENTRY_INIT_TURN = 1
export const GUIDED_ENTRY_FIRST_FREE_TEXT_TURN = 2

/** UUID v4-shaped strings only — this is the client-supplied idempotency key AND the session token for a guided-initialized session (see guided-entry-route-support.ts). Deliberately strict: an attacker-chosen non-UUID string must never be accepted as a session identity. */
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidGuidedEntryInitId(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_RE.test(value)
}

export interface RawGuidedFieldAnswer {
  fieldId: unknown
  value: unknown
}

export interface RawGuidedEntryInit {
  guidedEntryInitId: unknown
  definitionId: unknown
  definitionVersion: unknown
  fields: unknown
  concern: unknown
}

export type ValidateGuidedEntryResult = { ok: true; selection: GuidedEntrySelection } | { ok: false; error: string }

/**
 * The ONE fail-closed gate between untrusted client input and anything
 * this module will ever mutate. Every rejection path returns before any
 * mutation is constructed — Diagnostic Phase 6/9's own requirement
 * ("malformed Guided Entry input must never fall through and become a
 * normal free-text turn"; route.ts's caller must treat `ok: false` as
 * `invalid_request`, never silently degrade to treating `concern` as an
 * ordinary message).
 */
export function validateGuidedEntryRequest(raw: RawGuidedEntryInit): ValidateGuidedEntryResult {
  if (!isValidGuidedEntryInitId(raw.guidedEntryInitId)) {
    return { ok: false, error: 'guidedInit.guidedEntryInitId must be a UUID v4 string.' }
  }
  if (typeof raw.definitionId !== 'string' || raw.definitionId.length === 0) {
    return { ok: false, error: 'guidedInit.definitionId must be a non-empty string.' }
  }
  if (typeof raw.definitionVersion !== 'string' || raw.definitionVersion.length === 0) {
    return { ok: false, error: 'guidedInit.definitionVersion must be a non-empty string.' }
  }
  if (typeof raw.concern !== 'string' || raw.concern.trim().length === 0) {
    return { ok: false, error: 'guidedInit.concern must be a non-empty string.' }
  }
  if (!Array.isArray(raw.fields)) {
    return { ok: false, error: 'guidedInit.fields must be an array.' }
  }

  const definition = findGuidedEntryDefinition(raw.definitionId, raw.definitionVersion)
  if (!definition) {
    return { ok: false, error: `Unknown guided entry definition: ${raw.definitionId}@${raw.definitionVersion}.` }
  }

  const answers: GuidedEntrySelection['answers'] = []
  const seenFieldIds = new Set<string>()

  for (const rawField of raw.fields as unknown[]) {
    if (typeof rawField !== 'object' || rawField === null) {
      return { ok: false, error: 'Each guidedInit.fields entry must be an object.' }
    }
    const { fieldId, value } = rawField as RawGuidedFieldAnswer
    if (typeof fieldId !== 'string' || typeof value !== 'string') {
      return { ok: false, error: 'Each guidedInit.fields entry must have string fieldId and value.' }
    }
    if (seenFieldIds.has(fieldId)) {
      return { ok: false, error: `Duplicate guidedInit.fields entry for fieldId: ${fieldId}.` }
    }
    seenFieldIds.add(fieldId)

    const spec = definition.fields.find((f) => f.fieldId === fieldId)
    if (!spec) {
      return { ok: false, error: `Unknown field for this definition: ${fieldId}.` }
    }
    const option = spec.options.find((o) => o.value === value)
    if (!option) {
      return { ok: false, error: `Unknown option value for field ${fieldId}: ${value}.` }
    }
    // Server-side, independent re-validation against the authoritative
    // registry — the definition's own option list is UI content, never
    // trusted as validation on its own (Diagnostic Phase 6). A canonical
    // tool id that existed when this definition was authored but was later
    // retired from the registry fails closed here even though it's still
    // listed in guided-entry-definitions.ts.
    if (spec.kind === 'tool' && !isCanonicalToolIdentity(value)) {
      return { ok: false, error: `Field ${fieldId} value is not a current canonical tool identity: ${value}.` }
    }
    answers.push({ fieldId, kind: spec.kind, value })
  }

  const missingRequired = definition.fields.filter((f) => f.required && !seenFieldIds.has(f.fieldId))
  if (missingRequired.length > 0) {
    return { ok: false, error: `Missing required field(s): ${missingRequired.map((f) => f.fieldId).join(', ')}.` }
  }

  return {
    ok: true,
    selection: { definitionId: definition.definitionId, definitionVersion: definition.version, answers, concern: raw.concern.trim() },
  }
}

/** Deterministic per (token, fieldId) — a defensive, secondary idempotency property (see guided-entry-route-support.ts for the primary mechanism, the single atomic session-creation INSERT). Not random: a retry that reaches this function again with the same token/fieldId produces the identical id, so if it were ever re-applied to the SAME already-seeded StructuredUnderstanding, mutations.ts's own "id already exists" guard would reject the duplicate rather than silently double-adding it. */
function guidedMentionId(token: string, fieldId: string): string {
  return `ge-${token}-${fieldId}`
}

/**
 * Builds a fresh, guided-seeded StructuredUnderstanding from an already-
 * validated selection. Pure — no I/O, no session lookup, no randomness
 * beyond the caller-supplied token used for deterministic ids. Creates ZERO
 * UserGoals (Phase 7's own hard rule) — `selection.concern` is returned
 * untouched for the caller to hand to normal runTurn()/extraction, never
 * consumed here.
 */
export function applyGuidedEntrySelection(selection: GuidedEntrySelection, token: string): StructuredUnderstanding {
  let su = emptyStructuredUnderstanding()

  for (const answer of selection.answers) {
    const sourceStatement = buildGuidedEntrySourceStatement(selection.definitionId, selection.definitionVersion, answer.fieldId, answer.value)
    su = applyOneGuidedField(su, answer.kind, answer.value, token, answer.fieldId, sourceStatement)
  }

  return su
}

function applyOneGuidedField(
  su: StructuredUnderstanding,
  kind: GuidedFieldKind,
  value: string,
  token: string,
  fieldId: string,
  sourceStatement: string,
): StructuredUnderstanding {
  switch (kind) {
    case 'workflow_role':
      return setWorkflowRole(su, { state: 'confirmed', value }, GUIDED_ENTRY_INIT_TURN, sourceStatement)
    case 'tool': {
      const mention: ToolMention = {
        mention_id: guidedMentionId(token, fieldId),
        resolution: { kind: 'canonical', identifier: value },
        access_surface: { state: 'unknown' },
        plan_tier: { state: 'unknown' },
        account_status: { state: 'unknown' },
        confidence: 'confirmed',
        source_turn: GUIDED_ENTRY_INIT_TURN,
        source_statement: sourceStatement,
        superseded_by: null,
      }
      return addToolMention(su, mention)
    }
    case 'jurisdiction': {
      const mention: AssessmentJurisdictionMention = {
        mention_id: guidedMentionId(token, fieldId),
        value,
        confidence: 'confirmed',
        source_turn: GUIDED_ENTRY_INIT_TURN,
        source_statement: sourceStatement,
        superseded_by: null,
      }
      return addAssessmentJurisdictionMention(su, mention)
    }
  }
}

export function initialBoundaryStateForGuidedEntry(): BoundaryState {
  return createInitialBoundaryState()
}
