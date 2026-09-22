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
 * CRC-GE-MULTITOOL-1 (2026-09-22). A field's `cardinality` (types/guided-
 * entry.ts) now determines whether its raw wire representation is the
 * original scalar `value` or a new `values` array -- validated generically
 * below by branching on `spec.cardinality`, never on `spec.kind === 'tool'`
 * specifically (a future multi-select field of any other kind would work
 * identically, with zero new code here). Selecting N canonical tools still
 * produces N ordinary ToolMentions via the same, completely unmodified
 * addToolMention() this module has always used -- see applyOneGuidedField's
 * 'tool' case below. ARCHITECTURAL CONTRACT (restated, unchanged): a
 * selected tool remains a ProjectFact only -- it never implies CRC has
 * substantive Living Knowledge for it, commercial permission, clearance,
 * evidence, plan/account status, claim applicability, CRC eligibility of
 * any claim, or any Bounded Interpretation conclusion.
 */

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
  /** Single-select fields only (cardinality: 'single'). Mutually exclusive with `values` -- both present, or neither matching the field's own declared cardinality, is rejected (see validateGuidedEntryRequest). */
  value?: unknown
  /** Multi-select fields only (cardinality: 'multiple', e.g. `tool`, CRC-GE-MULTITOOL-1). */
  values?: unknown
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
    const { fieldId, value, values } = rawField as RawGuidedFieldAnswer
    if (typeof fieldId !== 'string') {
      return { ok: false, error: 'Each guidedInit.fields entry must have a string fieldId.' }
    }
    if (seenFieldIds.has(fieldId)) {
      return { ok: false, error: `Duplicate guidedInit.fields entry for fieldId: ${fieldId}.` }
    }
    seenFieldIds.add(fieldId)

    const spec = definition.fields.find((f) => f.fieldId === fieldId)
    if (!spec) {
      return { ok: false, error: `Unknown field for this definition: ${fieldId}.` }
    }

    if (spec.cardinality === 'multiple') {
      // CRC-GE-MULTITOOL-1: a multi-select field must use "values" (an
      // array), never the scalar "value" -- a malformed mixed state is
      // rejected explicitly rather than silently coerced into a
      // one-element array, so a stale/incorrect client fails loudly.
      if (value !== undefined) {
        return { ok: false, error: `Field ${fieldId} is multi-select and must use "values", not "value".` }
      }
      if (!Array.isArray(values) || values.some((v) => typeof v !== 'string')) {
        return { ok: false, error: `Field ${fieldId} must provide "values" as an array of strings.` }
      }
      const stringValues = values as string[]
      if (stringValues.length === 0) {
        // Empty multi-selection is the same as omitting the field entirely
        // (no answer entry recorded) -- matches every existing optional
        // single-select field's own "skipped, not a placeholder"
        // convention. A required multi-select field (none exists today)
        // must reject this explicitly rather than silently pass the
        // generic end-of-function required-field check, which only sees
        // `seenFieldIds`, not whether any value was actually selected.
        if (spec.required) {
          return { ok: false, error: `Field ${fieldId} is required and must include at least one value.` }
        }
        continue
      }
      const seenValues = new Set<string>()
      for (const v of stringValues) {
        if (seenValues.has(v)) {
          return { ok: false, error: `Field ${fieldId} contains a duplicate selection: ${v}.` }
        }
        seenValues.add(v)
        const option = spec.options.find((o) => o.value === v)
        if (!option) {
          return { ok: false, error: `Unknown option value for field ${fieldId}: ${v}.` }
        }
        // Same defense-in-depth registry re-check every canonical tool
        // value has always required (Diagnostic Phase 6), now applied to
        // every value in the array, not just a single scalar. Invalid
        // selection of any one tool fails the complete initialization --
        // nothing is mutated until every value in every field passes.
        if (spec.kind === 'tool' && !isCanonicalToolIdentity(v)) {
          return { ok: false, error: `Field ${fieldId} value is not a current canonical tool identity: ${v}.` }
        }
      }
      answers.push({ fieldId, kind: spec.kind, cardinality: 'multiple', values: stringValues })
    } else {
      if (values !== undefined) {
        return { ok: false, error: `Field ${fieldId} is single-select and must use "value", not "values".` }
      }
      if (typeof value !== 'string') {
        return { ok: false, error: 'Each guidedInit.fields entry must have string fieldId and value.' }
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
      answers.push({ fieldId, kind: spec.kind, cardinality: 'single', value })
    }
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

/** Deterministic per (token, fieldId) — a defensive, secondary idempotency property (see guided-entry-route-support.ts for the primary mechanism, the single atomic session-creation INSERT). Not random: a retry that reaches this function again with the same token/fieldId produces the identical id, so if it were ever re-applied to the SAME already-seeded StructuredUnderstanding, mutations.ts's own "id already exists" guard would reject the duplicate rather than silently double-adding it. Used for every single-cardinality field (workflow_role produces no mention at all; jurisdiction is the only mention-producing single-cardinality field) — untouched by CRC-GE-MULTITOOL-1. */
function guidedMentionId(token: string, fieldId: string): string {
  return `ge-${token}-${fieldId}`
}

/**
 * CRC-GE-MULTITOOL-1 (2026-09-22). guidedMentionId(token, fieldId) alone
 * cannot safely identify N mentions produced from ONE multi-select field —
 * reusing it per selected value would collide on the second call
 * (mutations.ts's addToolMention throws on a duplicate mention_id). Keying
 * on the selected VALUE too gives exactly the properties a multi-select
 * field needs: unique per selected canonical identity (two different
 * values always differ), deterministic across retries (the same value
 * always produces the same id, preserving guidedMentionId's own
 * idempotency guarantee), and order-independent (the id depends only on
 * which value was selected, never on its position in the array) — with no
 * random UUID and no synthetic combined "multi-tool" identity encoded
 * anywhere. Canonical tool identifiers are a closed, lowercase/hyphen-only
 * slug set (CANONICAL_TOOL_IDS) with no character that could make this
 * id's own `-`-delimited shape ambiguous.
 */
function guidedMultiMentionId(token: string, fieldId: string, value: string): string {
  return `ge-${token}-${fieldId}-${value}`
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
    if (answer.cardinality === 'multiple') {
      // CRC-GE-MULTITOOL-1: N selected canonical identities -> N ordinary
      // applyOneGuidedField calls, each independently producing one
      // ordinary mention via the same unmodified mutations.ts export as
      // every single-cardinality field already uses. Order in `values`
      // carries no meaning (Phase 3's own "prefer semantic set behavior");
      // this loop's iteration order has no effect on the resulting
      // StructuredUnderstanding beyond tool_mentions array order, which no
      // downstream consumer treats as meaningful (Retrieval already
      // evaluates active tool mentions as a set, not a sequence).
      for (const value of answer.values) {
        const sourceStatement = buildGuidedEntrySourceStatement(selection.definitionId, selection.definitionVersion, answer.fieldId, value)
        su = applyOneGuidedField(su, answer.kind, value, token, answer.fieldId, sourceStatement)
      }
    } else {
      const sourceStatement = buildGuidedEntrySourceStatement(selection.definitionId, selection.definitionVersion, answer.fieldId, answer.value)
      su = applyOneGuidedField(su, answer.kind, answer.value, token, answer.fieldId, sourceStatement)
    }
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
        mention_id: guidedMultiMentionId(token, fieldId, value),
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
