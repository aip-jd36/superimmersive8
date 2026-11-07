/**
 * CR-V2-EXAM-INTEGRATION-X0 — the examination-bearing parts of a Creator Record (record schema v6).
 *
 * Pure. Three parts, each kept SEPARATE from the creator's declarations (which alone drive guidance):
 *   1. EXAMINATIONS: per inventoried document, `not_examined` or one bounded projection of a persisted,
 *      integrity-checked run (`../examination/projection`). Observations stay verbatim and `not_verified`.
 *   2. COMPARISONS: derived here, never supplied. For each tool block's examined document, THIS version's declaration beside
 *      the examination it would be read against. CR-V2-DOC-LIVE-1A: no consistency determination is made, in either direction
 *      (`COMPARISON_WITHHELD`). Records made earlier keep the results they hold.
 *   3. CREATOR RESPONSES: closed codes only (no free text), each attributed to the creator and to THIS version,
 *      each targeting an observation or comparison that exists in this record. Responses never alter an
 *      observation, a comparison or a declaration. They never carry forward: the builder reads no earlier
 *      version. `carryForwardCandidates` only LISTS earlier responses whose target is unchanged, so a future
 *      interface can ask the creator to re-affirm each one explicitly.
 */

import { parseExaminationProjection, type ExaminationProjection, type ExaminationRunReference } from '../examination/projection'
import { COMPARISON_WITHHELD, HISTORICAL_COMPARISON_METHOD, PERSISTED_COMPARISON_METHOD } from '../evidence/persisted-comparison'
import type { FieldReconciliation } from '../evidence/document-observations'
import { canonicalJson } from '../record-core/canonical'

export const CREATOR_RESPONSE_CODES = ['reading_incorrect', 'wrong_document', 'other_plan_applies', 'not_relevant'] as const
export type CreatorResponseCode = (typeof CREATOR_RESPONSE_CODES)[number]
export const COMPARISON_FIELDS = ['provider', 'plan'] as const
export type ComparisonField = (typeof COMPARISON_FIELDS)[number]
export const MAX_CREATOR_RESPONSES = 64

export type CreatorResponseTarget =
  | { kind: 'observation'; run_id: string; observation_id: string }
  | { kind: 'comparison'; tool_index: number; document_id: string; field: ComparisonField }

export interface CreatorResponseInput {
  target: CreatorResponseTarget
  code: CreatorResponseCode
}

export interface CreatorResponse extends CreatorResponseInput {
  responded_by: 'creator'
  /** The record version the creator gave this response in. Never another version. */
  given_in_version: number
}

/** A persisted run's projection for one inventoried document, made by the caller with `projectVerifiedRun`. */
export interface CustomerRecordExaminationInput {
  document_id: string
  projection: ExaminationProjection
}

export interface CustomerComparison {
  tool_index: number
  document_id: string
  run_id: string
  /** Exactly the declaration compared (the creator's own answer, resolved by the existing tool identity). */
  declared: { tool_id: string | null; plan: string | null }
  provider: FieldReconciliation
  plan: FieldReconciliation
  verification: 'not_verified'
}

export interface ExaminedInventoryItem {
  document_id: string
  sha256: string
  media_type: string
  byte_size: number
  file_name: string
  tool_index: number | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const sortKey = (t: CreatorResponseTarget) => (t.kind === 'observation' ? `o\u0000${t.run_id}\u0000${t.observation_id}` : `c\u0000${String(t.tool_index).padStart(6, '0')}\u0000${t.document_id}\u0000${t.field}`)
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Attach each projection to its inventoried document, strictly: a known document, at most one projection each,
 * a projection that re-verifies and describes exactly that document (id, SHA-256, type and size). Issues name
 * the failing entry; nothing is repaired.
 */
export function attachExaminations(items: readonly ExaminedInventoryItem[], examinations: readonly CustomerRecordExaminationInput[]): { ok: true; byDocument: Map<string, ExaminationProjection> } | { ok: false; issues: string[] } {
  const issues: string[] = []
  const byDocument = new Map<string, ExaminationProjection>()
  if (!Array.isArray(examinations)) return { ok: false, issues: ['examinations'] }
  examinations.forEach((x, i) => {
    const keys = x && typeof x === 'object' ? Object.keys(x).sort().join(',') : ''
    const doc = keys === 'document_id,projection' ? items.find((d) => d.document_id === x.document_id) : undefined
    const p = doc ? parseExaminationProjection(x.projection) : null
    const e = p?.envelope.document
    if (!doc || !p || !e || byDocument.has(doc.document_id) || e.document_id !== doc.document_id || e.sha256 !== doc.sha256 || e.media_type !== doc.media_type || e.byte_size !== doc.byte_size) {
      issues.push(`examinations[${i}]`)
      return
    }
    byDocument.set(doc.document_id, p)
  })
  return issues.length > 0 ? { ok: false, issues } : { ok: true, byDocument }
}

/** Comparisons for this version: every tool block's examined document, against this version's declaration. */
export function deriveComparisons(
  items: readonly ExaminedInventoryItem[],
  byDocument: ReadonlyMap<string, ExaminationProjection>,
  declaredFor: (toolIndex: number) => { tool_id: string | null; plan: string | null },
): CustomerComparison[] {
  return items
    .filter((d) => d.tool_index !== null && byDocument.has(d.document_id))
    .map((d) => {
      const p = byDocument.get(d.document_id)!
      const declared = declaredFor(d.tool_index as number)
      return { tool_index: d.tool_index as number, document_id: d.document_id, run_id: p.run_id, declared: { tool_id: declared.tool_id, plan: declared.plan }, provider: { ...COMPARISON_WITHHELD }, plan: { ...COMPARISON_WITHHELD }, verification: 'not_verified' as const }
    })
}

/** Strict: closed codes, closed target shapes, every target present in THIS record, no duplicate target. */
export function recordResponses(
  responses: readonly CreatorResponseInput[],
  byDocument: ReadonlyMap<string, ExaminationProjection>,
  comparisons: readonly CustomerComparison[],
  version: number,
): { ok: true; responses: CreatorResponse[] } | { ok: false; issues: string[] } {
  if (!Array.isArray(responses) || responses.length > MAX_CREATOR_RESPONSES) return { ok: false, issues: ['responses'] }
  const observations = new Set<string>()
  for (const p of byDocument.values()) for (const o of p.envelope.observations) observations.add(`${p.run_id}\u0000${o.observation_id}`)
  const comparable = new Set(comparisons.flatMap((c) => COMPARISON_FIELDS.map((f) => `${c.tool_index}\u0000${c.document_id}\u0000${f}`)))
  const issues: string[] = []
  const seen = new Set<string>()
  const out: CreatorResponse[] = []
  responses.forEach((r, i) => {
    const t = r && typeof r === 'object' ? (r as CreatorResponseInput).target : null
    const keysOk = r && typeof r === 'object' && Object.keys(r).sort().join(',') === 'code,target'
    const codeOk = keysOk && (CREATOR_RESPONSE_CODES as readonly string[]).includes(r.code)
    let target: CreatorResponseTarget | null = null
    if (t && typeof t === 'object' && t.kind === 'observation' && Object.keys(t).sort().join(',') === 'kind,observation_id,run_id' && typeof t.run_id === 'string' && UUID.test(t.run_id) && typeof t.observation_id === 'string' && observations.has(`${t.run_id}\u0000${t.observation_id}`)) {
      target = { kind: 'observation', run_id: t.run_id, observation_id: t.observation_id }
    } else if (t && typeof t === 'object' && t.kind === 'comparison' && Object.keys(t).sort().join(',') === 'document_id,field,kind,tool_index' && Number.isInteger(t.tool_index) && typeof t.document_id === 'string' && (COMPARISON_FIELDS as readonly string[]).includes(t.field) && comparable.has(`${t.tool_index}\u0000${t.document_id}\u0000${t.field}`)) {
      target = { kind: 'comparison', tool_index: t.tool_index, document_id: t.document_id, field: t.field }
    }
    if (!codeOk || !target || seen.has(sortKey(target))) {
      issues.push(`responses[${i}]`)
      return
    }
    seen.add(sortKey(target))
    out.push({ target, code: r.code, responded_by: 'creator', given_in_version: version })
  })
  if (issues.length > 0) return { ok: false, issues }
  return { ok: true, responses: out.sort((a, b) => cmp(sortKey(a.target), sortKey(b.target))) }
}

/** The run references a record carries for re-checking at payment and issuance. */
export function examinationRunReferences(items: readonly { document_id: string; examination: unknown }[]): ExaminationRunReference[] {
  return items
    .filter((d) => d.examination !== null && typeof d.examination === 'object')
    .map((d) => {
      const p = d.examination as ExaminationProjection
      return { run_id: p.run_id, document_id: d.document_id, envelope_sha256: p.envelope_sha256 }
    })
}

/** Minimal views of the two record parts the carry-forward rule reads. */
interface ResponseBearing {
  documents: { items: { document_id: string; examination: unknown }[] }
  comparison: { policy: string; items?: CustomerComparison[] }
  creator_responses?: { items: CreatorResponse[] }
}

/**
 * Earlier responses whose target is UNCHANGED in `next` (same run and observation; or the same comparison: same
 * run, same declaration compared, same results). A LIST for explicit re-affirmation only: never applied by the
 * builder, and a changed declaration drops every response to the comparison it changed.
 */
export function carryForwardCandidates(previous: ResponseBearing, next: ResponseBearing): CreatorResponseInput[] {
  const prior = previous.creator_responses?.items ?? []
  const nextRuns = new Map<string, Set<string>>()
  for (const d of next.documents.items) {
    const p = d.examination && typeof d.examination === 'object' ? (d.examination as ExaminationProjection) : null
    if (p) nextRuns.set(p.run_id, new Set(p.envelope.observations.map((o) => o.observation_id)))
  }
  const sameComparison = (a: CustomerComparison, b: CustomerComparison) => canonicalJson(a) === canonicalJson(b)
  const prevComparisons = previous.comparison.items ?? []
  const nextComparisons = next.comparison.items ?? []
  return prior
    .filter((r) => {
      const t = r.target
      if (t.kind === 'observation') return nextRuns.get(t.run_id)?.has(t.observation_id) === true
      const find = (list: CustomerComparison[]) => list.find((c) => c.tool_index === t.tool_index && c.document_id === t.document_id)
      const a = find(prevComparisons)
      const b = find(nextComparisons)
      return !!a && !!b && sameComparison(a, b)
    })
    .map((r) => ({ target: r.target, code: r.code }))
}

export { PERSISTED_COMPARISON_METHOD }

const RESULTS = ['appears_consistent', 'appears_to_conflict', 'does_not_establish', 'not_assessed']
const exactKeys = (o: unknown, keys: string) => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).sort().join(',') === keys
const fieldOk = (f: unknown) => exactKeys(f, 'reason,result') && RESULTS.includes((f as FieldReconciliation).result) && typeof (f as FieldReconciliation).reason === 'string'

/**
 * Strict check of a stored v6 record's examination parts (used by `verifyCustomerRecord`): every projection
 * re-verifies and describes its document; every comparison is closed-shape, `not_verified` and refers to that
 * document's run; every response is closed-code, of THIS version and targets something in this record.
 */
export function examinationSectionsValid(record: {
  record: { record_version: number }
  documents: { policy: string; items: (ExaminedInventoryItem & { examination: unknown })[] }
  comparison: { policy: string; method?: unknown; items?: unknown }
  creator_responses?: { policy: string; items: unknown }
}): boolean {
  const d = record.documents
  if (!d || d.policy !== 'inventory_with_examination' || !Array.isArray(d.items)) return false
  const examinations: CustomerRecordExaminationInput[] = []
  for (const item of d.items) {
    if (item.examination === 'not_examined') continue
    examinations.push({ document_id: item.document_id, projection: item.examination as ExaminationProjection })
  }
  const attached = attachExaminations(d.items, examinations)
  if (!attached.ok) return false
  const c = record.comparison
  const method = canonicalJson(c?.method ?? null)
  const withheld = method === canonicalJson(PERSISTED_COMPARISON_METHOD)
  if (!c || c.policy !== 'derived_per_version' || !(withheld || method === canonicalJson(HISTORICAL_COMPARISON_METHOD)) || !Array.isArray(c.items)) return false
  const comparisons = c.items as CustomerComparison[]
  // Only a record under the earlier method can hold a determination.
  if (withheld && comparisons.some((x) => canonicalJson(x?.provider ?? null) !== canonicalJson(COMPARISON_WITHHELD) || canonicalJson(x?.plan ?? null) !== canonicalJson(COMPARISON_WITHHELD))) return false
  for (const x of comparisons) {
    if (!exactKeys(x, 'declared,document_id,plan,provider,run_id,tool_index,verification') || x.verification !== 'not_verified' || !fieldOk(x.provider) || !fieldOk(x.plan)) return false
    if (!exactKeys(x.declared, 'plan,tool_id') || !(x.declared.plan === null || typeof x.declared.plan === 'string') || !(x.declared.tool_id === null || typeof x.declared.tool_id === 'string')) return false
    const doc = d.items.find((i) => i.document_id === x.document_id)
    if (!doc || doc.tool_index !== x.tool_index || attached.byDocument.get(x.document_id)?.run_id !== x.run_id) return false
  }
  const r = record.creator_responses
  if (!r || r.policy !== 'closed_codes_this_version_only' || !Array.isArray(r.items)) return false
  const stored = r.items as CreatorResponse[]
  if (stored.some((x) => !exactKeys(x, 'code,given_in_version,responded_by,target') || x.responded_by !== 'creator' || x.given_in_version !== record.record.record_version)) return false
  const again = recordResponses(stored.map((x) => ({ target: x.target, code: x.code })), attached.byDocument, comparisons, record.record.record_version)
  return again.ok && canonicalJson(again.responses) === canonicalJson(stored)
}
