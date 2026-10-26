/**
 * CR-V2-VERTICAL-SLICE-1 — strict request-body parsing for the internal
 * prototype route. Accepts only the questionnaire form state; any other field
 * or shape is rejected (the route answers 400).
 */

import type { CreatorRecordFormState } from './form'

/** Upper bound on the raw body: a full questionnaire is a few KB. */
export const MAX_BODY_BYTES = 32_000
const MAX_VALUES_PER_ANSWER = 12
const MAX_TOOL_BLOCKS = 10

type ParseResult = { ok: true; state: CreatorRecordFormState } | { ok: false }

function stringArrayMap(v: unknown): Record<string, string[]> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const out: Record<string, string[]> = {}
  for (const [k, vals] of Object.entries(v as Record<string, unknown>)) {
    if (!/^[A-Z][A-Z0-9]{0,5}$/.test(k)) return null
    if (!Array.isArray(vals) || vals.length > MAX_VALUES_PER_ANSWER || !vals.every((x) => typeof x === 'string')) return null
    out[k] = vals as string[]
  }
  return out
}

/** Strict shape check. Anything unexpected → 400; no field outside the form state is accepted. */
export function parseFormState(body: unknown): ParseResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false }
  const b = body as Record<string, unknown>
  if (Object.keys(b).some((k) => !['answers', 'tools', 'acknowledgements'].includes(k))) return { ok: false }
  const answers = stringArrayMap(b.answers)
  if (!answers) return { ok: false }
  if (!Array.isArray(b.tools) || b.tools.length > MAX_TOOL_BLOCKS) return { ok: false }
  const tools: Record<string, string[]>[] = []
  for (const t of b.tools) {
    const m = stringArrayMap(t)
    if (!m) return { ok: false }
    tools.push(m)
  }
  const ack = b.acknowledgements
  if (!ack || typeof ack !== 'object' || Array.isArray(ack)) return { ok: false }
  const acknowledgements: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(ack as Record<string, unknown>)) {
    if (!/^A[0-9]$/.test(k) || typeof v !== 'boolean') return { ok: false }
    acknowledgements[k] = v
  }
  return { ok: true, state: { answers, tools, acknowledgements } }
}

