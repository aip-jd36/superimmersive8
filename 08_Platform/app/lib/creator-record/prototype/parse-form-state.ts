/**
 * CR-V2-VERTICAL-SLICE-1 — strict request-body parsing for the internal
 * prototype route. Accepts only the questionnaire form state and (since
 * CR-V2-EVIDENCE-SLICE-1) the display-only documents returned by the examine
 * route; any other field or shape is rejected (the route answers 400).
 * CR-V2-MVP-6: a document carries no review, adoption or reconciliation: those
 * fields are rejected like any other unexpected field.
 *
 * Documents come back from the browser because nothing is stored server-side.
 * They are re-validated strictly here (including the extraction schema) and
 * can only ever be DISPLAYED: they never reach the guidance pipeline.
 */

import { MAX_DOCUMENTS_PER_TOOL, parseExaminedDocument, type ToolDocument } from '../evidence/document-observations'
import type { CreatorRecordFormState } from './form'

/** Upper bound on the raw body: a full questionnaire is a few KB; three documents add under 10 KB. */
export const MAX_BODY_BYTES = 32_000
const MAX_VALUES_PER_ANSWER = 12
const MAX_TOOL_BLOCKS = 10
const MAX_DOCUMENTS = 3

type ParseResult = { ok: true; state: CreatorRecordFormState; documents: ToolDocument[] } | { ok: false }

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

function parseDocuments(v: unknown, toolCount: number): ToolDocument[] | null {
  if (v === undefined) return []
  if (!Array.isArray(v) || v.length > MAX_DOCUMENTS) return null
  const out: ToolDocument[] = []
  for (const item of v) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const o = item as Record<string, unknown>
    if (Object.keys(o).length !== 2 || !('tool_index' in o) || !('document' in o)) return null
    const tool_index = o.tool_index
    if (typeof tool_index !== 'number' || !Number.isInteger(tool_index) || tool_index < 0 || tool_index >= toolCount) return null
    const document = parseExaminedDocument(o.document)
    if (!document) return null
    if (out.filter((d) => d.tool_index === tool_index).length >= MAX_DOCUMENTS_PER_TOOL) return null
    out.push({ tool_index, document })
  }
  return out
}

/** Strict shape check. Anything unexpected → 400; no field outside the form state and documents is accepted. */
export function parseFormState(body: unknown): ParseResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false }
  const b = body as Record<string, unknown>
  if (Object.keys(b).some((k) => !['answers', 'tools', 'acknowledgements', 'documents'].includes(k))) return { ok: false }
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
  const documents = parseDocuments(b.documents, tools.length)
  if (!documents) return { ok: false }
  return { ok: true, state: { answers, tools, acknowledgements }, documents }
}
