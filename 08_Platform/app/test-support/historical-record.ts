/**
 * Test fixtures only (never imported by application code).
 *
 * Nothing writes schema 5 or 6 any more, but they stay readable and are refused for commercial actions and the PDF, and that
 * stays under test. This produces a record in the historical format from a freshly built one, by removing exactly what
 * schemas 7 and 8 added. `questionnaire-contract.test.ts` proves the result equals a row really prepared before schema 7 existed,
 * byte for byte, so this cannot drift from the format it stands in for.
 */
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, HISTORICAL_EXAMINATION_SCHEMA_VERSION, HISTORICAL_RECORD_BUILDER, HISTORICAL_RECORD_SCHEMA_VERSION, type CustomerRecordResult, type CustomerRecordV2 } from '@/lib/creator-record/customer-record/record'

const HISTORICAL_V6_BUILDER = { id: HISTORICAL_RECORD_BUILDER.id, version: 4 }
const HISTORICAL_V5_CONTENT = { id: 'si8/creator-record-v2-record-content', version: 2, generated_text: 'none' as const }
const HISTORICAL_V6_CONTENT = { id: 'si8/creator-record-v2-record-content', version: 3, generated_text: 'none' as const }

/** A stored row in the historical format. */
export function historicalRow<R extends { canonical: string; sha256: string; record_schema_version: number }>(row: R): R {
  const h = historicalForm({ ok: true, record: JSON.parse(row.canonical) as CustomerRecordV2, canonical: row.canonical, sha256: row.sha256 })
  return { ...row, canonical: h.canonical, sha256: h.sha256, record_schema_version: h.record.schema_version }
}

/** The schema 5 or 6 form of a schema 7 or 8 record, with its own canonical form and digest. Source text keeps its own approval details. */
export function historicalForm<R extends CustomerRecordResult>(built: R): R {
  if (!built.ok) return built
  const r = JSON.parse(built.canonical) as CustomerRecordV2
  const examination = r.schema_version === CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION
  delete r.sources.questionnaire_contract
  r.schema_version = examination ? HISTORICAL_EXAMINATION_SCHEMA_VERSION : HISTORICAL_RECORD_SCHEMA_VERSION
  r.builder = examination ? HISTORICAL_V6_BUILDER : { ...HISTORICAL_RECORD_BUILDER }
  r.content = examination ? HISTORICAL_V6_CONTENT : HISTORICAL_V5_CONTENT
  r.sources.source_text.record_schema = { ...r.sources.source_text.record_schema, version: r.schema_version }
  const canonical = canonicalJson(r)
  return { ...built, record: r, canonical, sha256: sha256Hex(canonical) }
}
