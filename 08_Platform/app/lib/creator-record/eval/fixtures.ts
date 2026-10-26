/**
 * PRODUCT-A-MVP-SPIKE-1A — loads `fixtures/receipt-fixtures.json` and
 * resolves its inheritance shorthands (`truth_from`, `truth_overrides`,
 * `scenarios_from`, `truth: "non_billing"`) into one flat, scorable record
 * per synthetic document. Pure apart from the explicit file-reading helpers.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { ComparisonResult, DeclaredTool, ToolComparison } from '../receipt-examination/compare'
import type { DocumentType, ExtractedFieldName, FieldStatus, Readability } from '../receipt-examination/schema'
import { EXTRACTED_FIELD_NAMES } from '../receipt-examination/schema'

export const FIXTURES_DIR = path.join(__dirname, 'fixtures')
export const SPEC_PATH = path.join(FIXTURES_DIR, 'receipt-fixtures.json')
export const DEFAULT_GENERATED_DIR = path.join(FIXTURES_DIR, 'generated')
/** Frozen earlier spec versions and the per-document hashes they were evaluated with. */
export const FIXTURE_HISTORY_DIR = path.join(FIXTURES_DIR, 'history')

export const FIXTURE_CATEGORIES = [
  'clean_pdf',
  'screenshot',
  'photo',
  'missing_fields',
  'conflicting',
  'unreadable',
  'non_receipt',
  'prompt_injection',
] as const
export type FixtureCategory = (typeof FIXTURE_CATEGORIES)[number]

export interface TruthField {
  status: FieldStatus
  value: string | null
}

export interface TruthExtraction {
  document_type: DocumentType
  readability: Readability
  issuer_name: TruthField
  product_or_plan_name: TruthField
  transaction_date: TruthField
  service_period_start: TruthField
  service_period_end: TruthField
  /** null = not scored for this document. */
  multiple_plans_shown: boolean | null
  /** null = not scored for this document. */
  instruction_like_text_present: boolean | null
}

export interface FixtureScenario {
  id: string
  declared: DeclaredTool
  expected: Record<keyof ToolComparison, ComparisonResult>
}

export type InjectionTargets = Partial<Record<ExtractedFieldName | 'document_type', string>>

export interface ResolvedFixture {
  id: string
  category: FixtureCategory
  truth: TruthExtraction
  /** False for non-billing and illegible documents: field values are not scored. */
  score_fields: boolean
  document_type_accept: DocumentType[]
  readability_accept: Readability[]
  /** Fields where a 'not present' answer is acceptable even though the truth is present. */
  abstention_ok_fields: ExtractedFieldName[]
  value_accept: Partial<Record<ExtractedFieldName, string[]>>
  injection_targets: InjectionTargets
  scenarios: FixtureScenario[]
  /**
   * Every plan-name observation printed on the document (v2 ground truth).
   * Explicit in the spec where a document names a plan more than once;
   * otherwise derived from the truth plan value ([] when no plan is printed).
   */
  plan_names_shown: string[]
}

export interface FixtureSpec {
  spec_version: string
  synthetic_marker: string
  first_paid_subset: string[]
  documents: RawFixtureDoc[]
}

interface RawFixtureDoc {
  id: string
  category: FixtureCategory
  truth?: TruthExtraction | 'non_billing'
  truth_from?: string
  truth_overrides?: Partial<TruthExtraction>
  scenarios?: FixtureScenario[]
  scenarios_from?: string
  score_fields?: boolean
  document_type_accept?: DocumentType[]
  readability_accept?: Readability[]
  accept_abstention?: boolean
  abstention_accept_fields?: ExtractedFieldName[]
  value_accept?: Partial<Record<ExtractedFieldName, string[]>>
  injection_targets?: InjectionTargets
  plan_names_shown?: string[]
}

const NOT_SHOWN: TruthField = { status: 'not_shown', value: null }

export const NON_BILLING_TRUTH: TruthExtraction = {
  document_type: 'not_a_billing_document',
  readability: 'legible',
  issuer_name: NOT_SHOWN,
  product_or_plan_name: NOT_SHOWN,
  transaction_date: NOT_SHOWN,
  service_period_start: NOT_SHOWN,
  service_period_end: NOT_SHOWN,
  multiple_plans_shown: null,
  instruction_like_text_present: false,
}

function resolveTruth(doc: RawFixtureDoc, byId: Map<string, RawFixtureDoc>, seen: Set<string>): { truth: TruthExtraction; nonBilling: boolean } {
  if (seen.has(doc.id)) throw new Error(`fixture truth cycle at ${doc.id}`)
  seen.add(doc.id)
  let base: { truth: TruthExtraction; nonBilling: boolean }
  if (doc.truth === 'non_billing') base = { truth: NON_BILLING_TRUTH, nonBilling: true }
  else if (doc.truth) base = { truth: doc.truth, nonBilling: false }
  else if (doc.truth_from) {
    const parent = byId.get(doc.truth_from)
    if (!parent) throw new Error(`${doc.id}: unknown truth_from ${doc.truth_from}`)
    base = resolveTruth(parent, byId, seen)
  } else throw new Error(`${doc.id}: no truth`)
  return { truth: { ...base.truth, ...(doc.truth_overrides ?? {}) }, nonBilling: base.nonBilling }
}

function resolveScenarios(doc: RawFixtureDoc, byId: Map<string, RawFixtureDoc>): FixtureScenario[] {
  if (doc.scenarios) return doc.scenarios
  if (doc.scenarios_from) {
    const parent = byId.get(doc.scenarios_from)
    if (!parent) throw new Error(`${doc.id}: unknown scenarios_from ${doc.scenarios_from}`)
    return resolveScenarios(parent, byId)
  }
  throw new Error(`${doc.id}: no scenarios`)
}

export function resolveFixtures(spec: FixtureSpec): ResolvedFixture[] {
  const byId = new Map(spec.documents.map((d) => [d.id, d]))
  if (byId.size !== spec.documents.length) throw new Error('duplicate fixture id')
  return spec.documents.map((doc) => {
    const { truth, nonBilling } = resolveTruth(doc, byId, new Set())
    const abstention_ok_fields = doc.accept_abstention ? [...EXTRACTED_FIELD_NAMES] : doc.abstention_accept_fields ?? []
    return {
      id: doc.id,
      category: doc.category,
      truth,
      score_fields: doc.score_fields ?? !nonBilling,
      document_type_accept: doc.document_type_accept ?? [truth.document_type],
      readability_accept: doc.readability_accept ?? [truth.readability],
      abstention_ok_fields,
      value_accept: doc.value_accept ?? {},
      injection_targets: doc.injection_targets ?? {},
      scenarios: resolveScenarios(doc, byId),
      plan_names_shown:
        doc.plan_names_shown ??
        (truth.product_or_plan_name.status === 'present' && truth.product_or_plan_name.value ? [truth.product_or_plan_name.value] : []),
    }
  })
}

export function loadFixtureSpec(specPath = SPEC_PATH): FixtureSpec {
  return JSON.parse(readFileSync(specPath, 'utf8')) as FixtureSpec
}

export function specSha256(specPath = SPEC_PATH): string {
  return createHash('sha256').update(readFileSync(specPath)).digest('hex')
}

export interface ManifestEntry {
  id: string
  file: string
  media_type: string
  bytes: number
  sha256: string
  width: number | null
  height: number | null
  document_text: string
}

export interface FixtureManifest {
  generator_version: string
  spec_version: string
  spec_sha256: string
  pymupdf_version: string
  pillow_version: string
  documents: ManifestEntry[]
}

export function loadManifest(generatedDir = DEFAULT_GENERATED_DIR): FixtureManifest | null {
  const p = path.join(generatedDir, 'manifest.json')
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, 'utf8')) as FixtureManifest
}

/** Reads a generated fixture and confirms it still matches its manifest hash. */
export function readFixtureBytes(generatedDir: string, entry: ManifestEntry): Uint8Array {
  const bytes = readFileSync(path.join(generatedDir, entry.file))
  const sha = createHash('sha256').update(bytes).digest('hex')
  if (sha !== entry.sha256) throw new Error(`fixture ${entry.id} does not match its manifest hash`)
  return new Uint8Array(bytes)
}

export function selectFixtures(all: ResolvedFixture[], spec: FixtureSpec, subset: string): ResolvedFixture[] {
  if (subset === 'all') return all
  const ids = subset === 'first-paid' ? spec.first_paid_subset : subset.split(',').map((s) => s.trim()).filter(Boolean)
  const byId = new Map(all.map((f) => [f.id, f]))
  return ids.map((id) => {
    const f = byId.get(id)
    if (!f) throw new Error(`unknown fixture id in subset: ${id}`)
    return f
  })
}
