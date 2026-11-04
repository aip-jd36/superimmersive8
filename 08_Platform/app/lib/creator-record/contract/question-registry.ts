/**
 * CR-IMPL-1 — Creator Record Question Registry (layer Q) and Observation Map
 * (layer O), v0.3 §2.1–§2.5, §2.9.
 *
 * Product-side, separately governed metadata. It decides only:
 *   Q — whether a factual question may be shown, and when;
 *   O — whether an answer becomes a declared observation, and what it attaches to.
 * It never decides evidence requirements (E), sufficiency (S) or conclusions
 * (B), and no entry here can change them. A question exists only because an
 * approved Q entry exists; a display condition can reference earlier answers
 * only — never "dependency unresolved".
 *
 * Generic: no provider-, tool- or domain-specific branch. Entries are data,
 * and this milestone approves none (tests use synthetic entries only).
 */

import { declaredObservationId, type DeclaredObservation, type RecordContext } from './provenance'
import { DECLARABLE_APPLICABILITY_FACTS, isApproved, LOCATION_ROLES, OBSERVATION_KINDS, type GovernanceApproval, type ObservationKind, type ObservationTarget } from './types'

/** The only permitted question kinds. Questions asking the customer to judge adequacy, scope, validity, sufficiency, applicability or permission-to-use are not representable. */
export const QUESTION_KINDS = ['factual_presence', 'factual_value', 'document_existence', 'description'] as const
export type QuestionKind = (typeof QUESTION_KINDS)[number]

/** Reserved option code that never attaches to anything governed. */
export const NOT_SURE = 'not_sure'
/**
 * Reserved option code, offered only where a question defines it. The creator says the question does not apply: it is
 * neither uncertainty nor a "No". Like `not_sure`, it never attaches to anything governed.
 */
export const NOT_APPLICABLE = 'not_applicable'

export type DisplayCondition =
  | { kind: 'always' }
  | { kind: 'answer_includes'; q_id: string; any_of: string[] }
  | { kind: 'all'; conditions: DisplayCondition[] }

export interface QuestionEntry {
  q_id: string
  version: number
  question_kind: QuestionKind
  /** Reference to approved fixed wording held elsewhere; never generated. */
  wording_ref: string
  /** Closed option codes (must include `not_sure`), or free text. */
  options: string[] | 'free_text'
  display_condition: DisplayCondition
  approval: GovernanceApproval
}

export interface ObservationMapEntry {
  o_id: string
  version: number
  q_id: string
  q_version: number
  applies_to: { kind: 'option'; value: string } | { kind: 'any_answer' }
  observation_kind: Exclude<ObservationKind, 'record_only'>
  target: Exclude<ObservationTarget, { kind: 'none' }>
  value_mapping_version: string
  approval: GovernanceApproval
}

export interface RegistryInput {
  questions: QuestionEntry[]
  observation_map: ObservationMapEntry[]
  /**
   * Dependency IDs an Observation Map entry may never target (e.g. ones
   * governance treats as legal determinations). Supplied by the caller; this
   * module holds no classification of its own.
   */
  prohibited_dependency_targets?: readonly string[]
  /**
   * CR-V2-DECL-1A: reviewed question-to-dependency pairs (`declarationIntegrityRefusals`). Each records that a person checked
   * that this question version asks the same factual dimension as the dependency's governed definition.
   */
  semantic_mappings?: readonly SemanticMapping[]
}

export interface SemanticMapping {
  q_id: string
  q_version: number
  dependency_id: string
  review_ref: string
}

export interface QuestionRegistry {
  readonly questions: ReadonlyMap<string, QuestionEntry>
  readonly observation_map: readonly ObservationMapEntry[]
}

export type RegistryLoadResult = { ok: true; registry: QuestionRegistry } | { ok: false; errors: string[] }

/**
 * CR-V2-DECL-1A: the declaration integrity contracts every question bundle obeys (pilot, synthetic and governed).
 * Generic: it holds no question id, dependency id or content domain. It decides nothing about applicability, evidence
 * or conclusions.
 *
 *   SEMANTIC MAPPING. An answer may attach to a governed dependency only when a person has reviewed that the question
 *   asks about the same factual dimension as the dependency's governed definition, for this question version. Code
 *   cannot judge meaning, so a target that merely exists is never enough: each active dependency mapping needs a
 *   reviewed pair. A pair for another question version, or one that no active mapping uses, is stale. A reviewed pair
 *   only permits a declaration to be shown beside the dependency: the dependency stays open and is never resolved.
 *
 *   EXCLUSIVE OPTIONS. `exclusive_options` names closed multi-select options that cannot be selected with any other
 *   option. `not_sure` can never be one: partial uncertainty is a legitimate answer.
 *
 *   CONDITIONAL COMPLETENESS. A conditional question is shown because an earlier answer made it material, so it must be
 *   required when shown. A closed question always offers `not_sure`, and may offer `not_applicable`, so requiring an
 *   answer never forces certainty or a negative answer.
 */
export const INTEGRITY_REFUSAL_CODES = ['semantic_mapping_unreviewed', 'semantic_mapping_stale', 'exclusive_option_invalid', 'conditional_question_not_required'] as const
export type IntegrityRefusalCode = (typeof INTEGRITY_REFUSAL_CODES)[number]

export interface IntegrityRefusal {
  code: IntegrityRefusalCode
  /** The entry concerned (question, map entry or pair), never free text. */
  ref: string
}

/** The presentation metadata these contracts read. */
export interface IntegrityPresentation {
  input: string
  required: boolean
  exclusive_options?: readonly string[]
}

export function declarationIntegrityRefusals(registry: RegistryInput, presentation: Readonly<Record<string, IntegrityPresentation>>): IntegrityRefusal[] {
  const refusals: IntegrityRefusal[] = []
  const has = (id: string) => Object.prototype.hasOwnProperty.call(presentation, id)
  const pairs = registry.semantic_mappings ?? []
  const pairKey = (q_id: string, q_version: number, dependency_id: string) => `${q_id}\u0000${q_version}\u0000${dependency_id}`
  const reviewed = (ref: unknown) => typeof ref === 'string' && ref.trim() !== ''

  // Semantic mapping: only an approved map entry can attach anything, so only those need a reviewed pair.
  const active = new Set<string>()
  for (const o of registry.observation_map) {
    if (o.target.kind !== 'dependency' || !isApproved(o.approval)) continue
    const key = pairKey(o.q_id, o.q_version, o.target.dependency_id)
    active.add(key)
    if (!pairs.some((p) => pairKey(p.q_id, p.q_version, p.dependency_id) === key && reviewed(p.review_ref))) refusals.push({ code: 'semantic_mapping_unreviewed', ref: o.o_id })
  }
  for (const p of pairs) {
    if (!active.has(pairKey(p.q_id, p.q_version, p.dependency_id))) refusals.push({ code: 'semantic_mapping_stale', ref: `${p.q_id} v${p.q_version} ${p.dependency_id}` })
  }

  for (const q of registry.questions) {
    if (!isApproved(q.approval) || !has(q.q_id)) continue
    const p = presentation[q.q_id]
    const exclusive = p.exclusive_options
    if (exclusive !== undefined) {
      const usable =
        p.input === 'multi' && q.options !== 'free_text' && Array.isArray(exclusive) && exclusive.length > 0 && new Set(exclusive).size === exclusive.length &&
        exclusive.every((e) => e !== NOT_SURE && (q.options as string[]).includes(e))
      if (!usable) refusals.push({ code: 'exclusive_option_invalid', ref: q.q_id })
    }
    if (q.display_condition.kind !== 'always' && p.required !== true) refusals.push({ code: 'conditional_question_not_required', ref: q.q_id })
  }
  return refusals
}

/** Validates the whole registry. Any error rejects all of it: a caller can only ever hold a fully valid registry. */
export function loadQuestionRegistry(input: RegistryInput): RegistryLoadResult {
  const errors: string[] = []
  const questions = new Map<string, QuestionEntry>()
  for (const q of input.questions) {
    if (questions.has(q.q_id)) errors.push(`duplicate question ${q.q_id}`)
    if (!(QUESTION_KINDS as readonly string[]).includes(q.question_kind)) errors.push(`${q.q_id}: question kind '${q.question_kind}' is not permitted`)
    if (!q.wording_ref) errors.push(`${q.q_id}: missing wording_ref`)
    if (q.options !== 'free_text') {
      if (q.options.length === 0) errors.push(`${q.q_id}: no options`)
      if (!q.options.includes(NOT_SURE)) errors.push(`${q.q_id}: closed options must include '${NOT_SURE}'`)
    }
    questions.set(q.q_id, q)
  }
  for (const q of input.questions) {
    if (!conditionKindsValid(q.display_condition)) errors.push(`${q.q_id}: display condition kind is not permitted (only answer-based conditions exist)`)
    for (const ref of conditionRefs(q.display_condition)) {
      if (ref === q.q_id) errors.push(`${q.q_id}: display condition references itself`)
      else if (!questions.has(ref)) errors.push(`${q.q_id}: display condition references unknown question ${ref}`)
    }
  }

  const prohibited = new Set(input.prohibited_dependency_targets ?? [])
  const seen = new Set<string>()
  for (const o of input.observation_map) {
    if (seen.has(o.o_id)) errors.push(`duplicate observation map entry ${o.o_id}`)
    seen.add(o.o_id)
    const q = questions.get(o.q_id)
    if (!q) errors.push(`${o.o_id}: unknown question ${o.q_id}`)
    else if (q.version !== o.q_version) errors.push(`${o.o_id}: question version ${o.q_version} does not match ${o.q_id} v${q.version}`)
    if (!(OBSERVATION_KINDS as readonly string[]).includes(o.observation_kind) || (o.observation_kind as string) === 'record_only') {
      errors.push(`${o.o_id}: observation kind '${o.observation_kind}' is not mappable`)
    }
    if (o.applies_to.kind === 'option') {
      if (o.applies_to.value === NOT_SURE) errors.push(`${o.o_id}: '${NOT_SURE}' never attaches to a governed target`)
      if (o.applies_to.value === NOT_APPLICABLE) errors.push(`${o.o_id}: '${NOT_APPLICABLE}' never attaches to a governed target`)
      if (q && q.options !== 'free_text' && !q.options.includes(o.applies_to.value)) errors.push(`${o.o_id}: option '${o.applies_to.value}' is not an option of ${o.q_id}`)
    }
    errors.push(...targetErrors(o, prohibited))
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, registry: { questions, observation_map: [...input.observation_map] } }
}

function targetErrors(o: ObservationMapEntry, prohibited: Set<string>): string[] {
  const t = o.target as ObservationTarget
  switch (t.kind) {
    case 'applicability_fact':
      // Untyped input could still carry 'jurisdiction': location is never jurisdiction (v0.3 §3.4).
      return (DECLARABLE_APPLICABILITY_FACTS as readonly string[]).includes(t.fact) ? [] : [`${o.o_id}: applicability fact '${t.fact}' cannot be declared`]
    case 'dependency':
      if (!t.dependency_id) return [`${o.o_id}: empty dependency target`]
      return prohibited.has(t.dependency_id) ? [`${o.o_id}: dependency '${t.dependency_id}' may not be targeted by a declaration`] : []
    case 'location':
      return (LOCATION_ROLES as readonly string[]).includes(t.role) ? [] : [`${o.o_id}: unknown location role '${t.role}'`]
    case 'tool_identity':
    case 'asset_provider_identity':
      return []
    default:
      return [`${o.o_id}: target kind '${t.kind}' is not mappable`]
  }
}

function conditionKindsValid(c: DisplayCondition): boolean {
  if (c.kind === 'always') return true
  if (c.kind === 'answer_includes') return typeof c.q_id === 'string' && Array.isArray(c.any_of)
  if (c.kind === 'all') return Array.isArray(c.conditions) && c.conditions.every(conditionKindsValid)
  return false
}

function conditionRefs(c: DisplayCondition): string[] {
  if (c.kind === 'answer_includes') return [c.q_id]
  if (c.kind === 'all') return c.conditions.flatMap(conditionRefs)
  return []
}

/** Answers so far: question id → selected option codes (or one free-text value). */
export type Answers = Readonly<Record<string, readonly string[]>>

function conditionHolds(c: DisplayCondition, answers: Answers): boolean {
  switch (c.kind) {
    case 'always':
      return true
    case 'answer_includes':
      return (answers[c.q_id] ?? []).some((v) => c.any_of.includes(v))
    case 'all':
      return c.conditions.every((x) => conditionHolds(x, answers))
  }
}

/** Questions to show: approved entries whose condition holds on earlier answers. Pending, retired or unknown → not shown. */
export function eligibleQuestions(registry: QuestionRegistry, answers: Answers): QuestionEntry[] {
  return Array.from(registry.questions.values()).filter((q) => isApproved(q.approval) && conditionHolds(q.display_condition, answers))
}

export interface Answer {
  q_id: string
  q_version: number
  /** Repeated-block instance (e.g. tool slot); omitted for single questions. */
  instance?: string
  /** Option codes, or a single free-text value. */
  values: string[]
  verbatim: string
}

export type MapAnswerResult = { ok: true; observations: DeclaredObservation[] } | { ok: false; reason: 'question_not_active' | 'question_version_mismatch' | 'invalid_option' | 'empty_answer' }

/**
 * Turns one answer into declared observations. Each selected value maps
 * through approved Observation Map entries; a value with no approved entry
 * (and `not_sure` or `not_applicable`, always) becomes one record-only observation attached to
 * nothing governed. Answers to questions that are not currently shown are
 * refused, so nothing can be recorded against an unapproved question.
 */
export function mapAnswer(registry: QuestionRegistry, answers: Answers, ctx: RecordContext, answer: Answer): MapAnswerResult {
  const q = registry.questions.get(answer.q_id)
  if (!q || !eligibleQuestions(registry, answers).includes(q)) return { ok: false, reason: 'question_not_active' }
  if (q.version !== answer.q_version) return { ok: false, reason: 'question_version_mismatch' }
  if (answer.values.length === 0) return { ok: false, reason: 'empty_answer' }
  if (q.options !== 'free_text' && answer.values.some((v) => !(q.options as string[]).includes(v))) return { ok: false, reason: 'invalid_option' }

  const observations: DeclaredObservation[] = []
  const push = (normalized: string | null, kind: ObservationKind, target: ObservationTarget, entry: ObservationMapEntry | null) =>
    observations.push({
      observation_id: declaredObservationId(ctx, q.q_id, observations.length, answer.instance ?? null),
      source_kind: 'customer_declared',
      record_id: ctx.record_id,
      record_version: ctx.record_version,
      question: { q_id: q.q_id, q_version: q.version },
      instance: answer.instance ?? null,
      answer_verbatim: answer.verbatim,
      normalized_value: normalized,
      observation_kind: kind,
      target,
      map_entry: entry ? { o_id: entry.o_id, o_version: entry.version, value_mapping_version: entry.value_mapping_version } : null,
      captured_at: ctx.captured_at,
      supersedes: null,
    })

  const freeText = q.options === 'free_text'
  for (const value of answer.values) {
    const normalized = freeText ? null : value
    const entries =
      value === NOT_SURE || (!freeText && value === NOT_APPLICABLE)
        ? []
        : registry.observation_map.filter(
            (o) => o.q_id === q.q_id && o.q_version === q.version && isApproved(o.approval) && (o.applies_to.kind === 'any_answer' || (!freeText && o.applies_to.value === value)),
          )
    if (entries.length === 0) push(normalized, 'record_only', { kind: 'none' }, null)
    for (const e of entries) push(normalized, e.observation_kind, e.target, e)
  }
  return { ok: true, observations }
}
