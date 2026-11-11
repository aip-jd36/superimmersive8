/**
 * CRV2-IA-4A — which Creator Record objective may use which applicability fact (IA-3E §5, founder direction F4).
 *
 * Declarations never become applicability facts by themselves: `jurisdiction` is not declarable by construction
 * (`DECLARABLE_APPLICABILITY_FACTS`, v0.3 §3.4). A creator's explicit choice of places for general guidance (a
 * `guidance_place` observation) reaches the shared applicability evaluator as `jurisdiction.included` ONLY for an
 * objective that an approved, versioned authorization names, and only from the exact question version it names.
 *
 * Default deny:
 *   - no authorization, or one that is not approved, means the objective receives no places at all;
 *   - a withheld place is UNKNOWN to the evaluator (unresolved), never excluded: `excluded` is always empty;
 *   - an authorization can only narrow (it selects declared places for one objective); it never adds a value, never
 *     derives one from location answers (F1–F3), and never changes how applicability is evaluated.
 *
 * There is still one evaluator: the projected facts go to the unchanged shared selector, one call per objective,
 * exactly as before. A malformed or unapproved authorization makes the whole authority bundle unusable
 * (`objectiveFactAuthorizationErrors`, checked in `selectAuthorityBundle`).
 *
 * Initially only `jurisdiction` is governed by this table. Facts it does not govern pass through unchanged.
 */

import { isApproved, isIsoDate, type GovernanceApproval } from './types'

/** Facts whose per-objective use this table governs. Only `jurisdiction`, initially. */
export const AUTHORIZABLE_APPLICABILITY_FACTS = ['jurisdiction'] as const
export type AuthorizableApplicabilityFact = (typeof AUTHORIZABLE_APPLICABILITY_FACTS)[number]

/**
 * Canonical place values a guidance-place observation may carry: exactly the strings the shared jurisdiction
 * canonicalization already treats as canonical. A closed list; anything else is dropped, never mapped or guessed.
 */
export const GUIDANCE_PLACE_VALUES = ['United States', 'Taiwan'] as const
export type GuidancePlace = (typeof GUIDANCE_PLACE_VALUES)[number]

export function isGuidancePlace(v: unknown): v is GuidancePlace {
  return typeof v === 'string' && (GUIDANCE_PLACE_VALUES as readonly string[]).includes(v)
}

export interface ObjectiveFactAuthorization {
  authorization_id: string
  version: number
  /** Exact objective identity, including its version suffix (e.g. `creator-record:copyrightability:v1`). */
  objective_id: string
  fact: AuthorizableApplicabilityFact
  /** The one question version whose guidance-place observations may supply this fact. */
  source: { q_id: string; q_version: number }
  /** The recorded semantic review that this question's answers mean what this fact means for this objective. */
  semantic_review_ref: string
  approval: GovernanceApproval
}

const AUTHORIZATION_FIELDS = ['authorization_id', 'version', 'objective_id', 'fact', 'source', 'semantic_review_ref', 'approval'] as const
const SOURCE_FIELDS = ['q_id', 'q_version'] as const
const APPROVAL_FIELDS = ['status', 'approver', 'decision_date', 'review_ref'] as const

export interface AuthorizationValidationContext {
  /** Every objective identity this build defines (active or not). */
  objective_ids: readonly string[]
  /** The bundle's own registry input, unloaded. */
  registry_input: {
    questions: readonly { q_id: string; version: number }[]
    observation_map: readonly { q_id: string; q_version: number; target: { kind: string }; approval: GovernanceApproval }[]
  }
}

type Plain = Record<string, unknown>
const isPlain = (v: unknown): v is Plain => !!v && typeof v === 'object' && !Array.isArray(v)
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const closed = (v: Plain, allowed: readonly string[]) => Object.keys(v).filter((k) => !allowed.includes(k))

/**
 * Every reason this authorization list cannot be used, or [] when it can. Any error makes the whole bundle unusable:
 * an authorization is never partially applied.
 */
export function objectiveFactAuthorizationErrors(input: unknown, ctx: AuthorizationValidationContext): string[] {
  if (input === undefined) return []
  if (!Array.isArray(input)) return ['objective_fact_authorizations: not a list']
  const errors: string[] = []
  const ids = new Set<string>()
  const triples = new Set<string>()
  input.forEach((a: unknown, i) => {
    const at = `objective_fact_authorizations[${i}]`
    if (!isPlain(a)) {
      errors.push(`${at}: not an object`)
      return
    }
    for (const k of closed(a, AUTHORIZATION_FIELDS)) errors.push(`${at}.${k}: unknown field`)
    if (!nonEmpty(a.authorization_id)) errors.push(`${at}: empty authorization_id`)
    else if (ids.has(a.authorization_id)) errors.push(`${at}: duplicate authorization_id ${a.authorization_id}`)
    else ids.add(a.authorization_id)
    if (!Number.isInteger(a.version) || (a.version as number) < 1) errors.push(`${at}: version must be a positive integer`)
    if (!nonEmpty(a.objective_id) || !ctx.objective_ids.includes(a.objective_id)) errors.push(`${at}: unknown objective ${String(a.objective_id)}`)
    if (!(AUTHORIZABLE_APPLICABILITY_FACTS as readonly unknown[]).includes(a.fact)) errors.push(`${at}: fact '${String(a.fact)}' is not authorizable`)
    if (!nonEmpty(a.semantic_review_ref)) errors.push(`${at}: missing semantic_review_ref`)

    const s = a.source
    if (!isPlain(s)) errors.push(`${at}.source: not an object`)
    else {
      for (const k of closed(s, SOURCE_FIELDS)) errors.push(`${at}.source.${k}: unknown field`)
      const q = ctx.registry_input.questions.find((x) => x.q_id === s.q_id)
      if (!q) errors.push(`${at}: unknown source question ${String(s.q_id)}`)
      else if (q.version !== s.q_version) errors.push(`${at}: source question version ${String(s.q_version)} does not match ${q.q_id} v${q.version}`)
      else if (!ctx.registry_input.observation_map.some((o) => o.q_id === s.q_id && o.q_version === s.q_version && o.target.kind === 'guidance_place' && isApproved(o.approval))) {
        errors.push(`${at}: source question ${q.q_id} v${q.version} has no approved guidance-place observation`)
      }
      const triple = `${String(a.objective_id)}|${String(a.fact)}|${String(s.q_id)}|${String(s.q_version)}`
      if (triples.has(triple)) errors.push(`${at}: duplicate authorization for ${triple}`)
      triples.add(triple)
    }

    const ap = a.approval
    if (!isPlain(ap)) errors.push(`${at}.approval: not an object`)
    else {
      for (const k of closed(ap, APPROVAL_FIELDS)) errors.push(`${at}.approval.${k}: unknown field`)
      if (!isApproved(ap as unknown as GovernanceApproval) || !isIsoDate(ap.decision_date) || !nonEmpty(ap.review_ref)) errors.push(`${at}: not approved`)
    }
  })
  return errors
}

/** The question versions whose guidance-place observations may supply `fact` to this objective. Approved entries only. */
export function authorizedFactSources(
  authorizations: readonly ObjectiveFactAuthorization[],
  objective_id: string,
  fact: AuthorizableApplicabilityFact,
): { q_id: string; q_version: number }[] {
  return authorizations
    .filter((a) => a.objective_id === objective_id && a.fact === fact && isApproved(a.approval))
    .map((a) => ({ q_id: a.source.q_id, q_version: a.source.q_version }))
}
