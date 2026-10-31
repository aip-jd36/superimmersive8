/**
 * CR-OPTION-C-OC1B — the fingerprint of the internal draft templates (`D`) and its version check.
 *
 * The fingerprint is computed from what the templates PRINT, never from source
 * text (which differs between compilers): every string as it is, every template
 * function called with each combination of the probe values 0, 1 and 2 for its
 * parameters, so plural and zero branches are covered. The result is canonical
 * JSON, hashed with SHA-256.
 */

import { canonicalJson, sha256Hex } from '../record-core/canonical'
import { D, INTERNAL_DRAFT_TEMPLATE_FINGERPRINTS, INTERNAL_DRAFT_TEMPLATE_ID, INTERNAL_DRAFT_TEMPLATE_VERSION } from './templates'

export class InternalDraftTemplateContractError extends Error {
  constructor(reason: string) {
    super(`internal_draft_template_contract: ${reason}`)
  }
}

export interface InternalDraftTemplateContract {
  id: string
  version: number
  fingerprint: string
}

const PROBES = [0, 1, 2] as const

function tuples(arity: number): number[][] {
  let out: number[][] = [[]]
  for (let i = 0; i < arity; i++) out = out.flatMap((t) => PROBES.map((p) => [...t, p]))
  return out
}

function evaluate(value: unknown, path: string): unknown {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map((v, i) => evaluate(v, `${path}[${i}]`))
  if (typeof value === 'function') {
    const fn = value as (...args: number[]) => unknown
    return {
      template_function_arity: fn.length,
      probes: tuples(fn.length).map((args) => {
        const out = fn(...args)
        if (typeof out !== 'string') throw new InternalDraftTemplateContractError(`${path} does not return a string`)
        return [args, out]
      }),
    }
  }
  if (typeof value === 'object' && value !== null) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, evaluate(v, `${path}.${k}`)]))
  throw new InternalDraftTemplateContractError(`${path} is not a template`)
}

/** The canonical text the fingerprint is taken over (exported for review tooling and tests). */
export function templateContractText(templates: unknown = D): string {
  return canonicalJson(evaluate(templates, 'D'))
}

export function templateFingerprint(templates: unknown = D): string {
  return sha256Hex(templateContractText(templates))
}

/**
 * The contract of the running templates. Throws unless their fingerprint is the
 * one pinned for the current version: a template change requires an intentional
 * version update.
 */
export function internalDraftTemplateContract(): InternalDraftTemplateContract {
  const fingerprint = templateFingerprint(D)
  const pinned = INTERNAL_DRAFT_TEMPLATE_FINGERPRINTS[INTERNAL_DRAFT_TEMPLATE_VERSION]
  if (pinned !== fingerprint) {
    throw new InternalDraftTemplateContractError(`templates changed without a version update (version ${INTERNAL_DRAFT_TEMPLATE_VERSION} is pinned to ${pinned ?? 'nothing'}, the templates are ${fingerprint})`)
  }
  return { id: INTERNAL_DRAFT_TEMPLATE_ID, version: INTERNAL_DRAFT_TEMPLATE_VERSION, fingerprint }
}
