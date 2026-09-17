/**
 * Guided Entry Foundation (GE-1) — domain types.
 *
 * These types describe USER INPUT (a role/scenario selection, explicit
 * structured field answers, a free-text concern) and the CONFIG that
 * describes what a Guided Entry definition is allowed to ask for. They are
 * deliberately NOT Living Knowledge, NOT StructuredUnderstanding, NOT a
 * UserGoal, and NOT a Bounded Interpretation — a `GuidedEntryDefinition` is
 * data about a form, never a governed proposition and never a legal
 * conclusion. See `lib/crc-engine/guided-entry-init.ts` for the module that
 * turns a validated selection into real `StructuredUnderstanding` mutations
 * via the existing, unmodified `lib/interview-engine/mutations.ts` boundary
 * — nothing here mutates anything.
 *
 * `GuidedFieldKind` is deliberately closed and small (GE-1 proves the
 * architecture with three field kinds — see the diagnostic's Phase 5/6
 * recommendation: workflow role, canonical tool, assessment jurisdiction).
 * Adding a new field kind later is a data change to a definition plus one
 * new case in `guided-entry-init.ts`'s allow-listed mapping — never a new
 * orchestration path, never a per-role component.
 */

/** Closed, small on purpose (see module header). Each kind maps to exactly one existing StructuredUnderstanding mutation target — see guided-entry-init.ts. */
export const GUIDED_FIELD_KINDS = ['workflow_role', 'tool', 'jurisdiction'] as const
export type GuidedFieldKind = (typeof GUIDED_FIELD_KINDS)[number]

/**
 * One field a `GuidedEntryDefinition` asks for. `options` is required for
 * every current field kind (all three are closed-choice, not free text —
 * GE-1 deliberately does not support a free-text structured field; the
 * ONE free-text input Guided Entry accepts is the user's own concern,
 * handled entirely separately, never through this field mechanism — see
 * Phase 7 / guided-entry-init.ts's own header).
 *
 * `value` on an option is the value actually stored — for `workflow_role`
 * this is the literal ProjectFacts string; for `tool` this MUST be a real
 * `CanonicalToolId` (validated server-side against the authoritative
 * registry, never trusted from the client — see guided-entry-init.ts); for
 * `jurisdiction` this is the literal AssessmentJurisdictionMention value
 * string (mirrors how a user's own conversational statement would be
 * captured — no canonicalization registry exists for jurisdiction values
 * today, so none is invented here).
 */
export interface GuidedFieldOption {
  value: string
  /** What the user sees on the control. Never legal/governed prose — just the option label. */
  label: string
}

export interface GuidedFieldSpec {
  kind: GuidedFieldKind
  /** Unique within a definition. Distinct from `kind` so a definition could (in a later milestone) ask for two fields of a kind that supports it — GE-1's own fixture does not need this, but the shape doesn't foreclose it. */
  fieldId: string
  required: boolean
  /** Rendered directly next to the field — see Phase 5's own disclosure requirement: what this field establishes must be visible to the user before they answer it, never hidden in a bundled card assertion. */
  prompt: string
  options: GuidedFieldOption[]
}

/**
 * A definition describes a form, never a conclusion. `establishes` is the
 * user-visible, plain-language explanation of what selecting this
 * definition's fields will and will not tell CRC — the mechanism Phase 5
 * requires so a role card can never silently imply something the user
 * didn't see. This module intentionally has no field for jurisdiction/
 * rights/authorization/evidence status at the DEFINITION level — those
 * only ever arrive as explicit `GuidedFieldSpec` entries the user
 * individually answers, never as a hidden property of the role itself.
 */
export interface GuidedEntryDefinition {
  definitionId: string
  /** Independent of definitionId — the same definitionId can have multiple versions over its lifetime; a persisted `GuidedEntrySelection` records BOTH so a historical session remains interpretable even after the definition catalogue changes (Diagnostic Phase 3/10). */
  version: string
  /** User-facing label, e.g. "Agency / producing for a client." Not legal/governed prose. */
  label: string
  /** Plain-language description of what this role concept means, shown before any field. */
  description: string
  /** Plain-language statement of what this definition establishes and does NOT establish — see module header / Phase 5. */
  establishes: string
  fields: GuidedFieldSpec[]
}

/**
 * The validated, server-trusted shape produced after checking a raw client
 * request against a `GuidedEntryDefinition` (see guided-entry-init.ts's
 * `validateGuidedEntryRequest`). Never constructed directly from
 * unvalidated client input — this type is the OUTPUT of validation, not a
 * request DTO.
 */
export interface GuidedEntrySelection {
  definitionId: string
  definitionVersion: string
  /** One entry per field the user actually answered — a required field the user skipped is absent, never a placeholder value (skip is a legitimate answer for a non-required field only; see guided-entry-init.ts). */
  answers: { fieldId: string; kind: GuidedFieldKind; value: string }[]
  /** The user's own free-text concern — untouched, handed to normal extraction exactly as any conversational turn's text would be (Phase 7). Never parsed, classified, or mapped to a goal category here. */
  concern: string
}
