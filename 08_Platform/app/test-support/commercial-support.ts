/**
 * Test fixtures only (never imported by application code).
 *
 * `CURRENT_ISSUANCE_SUPPORT` is empty, so nothing is commercially eligible in a shipped build. Tests of what eligibility does once
 * a schema is supported name that support here, explicitly: no application setting can do this.
 */
import type { GovernanceSnapshot } from '@/lib/creator-record/customer-record/eligibility'
import { CUSTOMER_RECORD_BUILDER, CUSTOMER_RECORD_EXAMINATION_BUILDER, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'

export const COMMERCIAL_SUPPORT_UNDER_TEST = {
  record_schemas: [{ id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION }, { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION }],
  builders: [{ id: CUSTOMER_RECORD_BUILDER.id, version: CUSTOMER_RECORD_BUILDER.version }, { id: CUSTOMER_RECORD_EXAMINATION_BUILDER.id, version: CUSTOMER_RECORD_EXAMINATION_BUILDER.version }],
}

/** The same governance state, with that support. */
export function withCommercialSupportUnderTest(s: GovernanceSnapshot): GovernanceSnapshot {
  const entry = (kind: 'record_schema' | 'builder', i: { id: string; version: number }) => ({ kind, id: i.id, version: String(i.version), lifecycle: 'approved' as const, content_sha256: null, valid_until: null, conflict: false })
  return {
    ...s,
    authorities: {
      ...s.authorities,
      record_schema: { status: 'ok', entries: COMMERCIAL_SUPPORT_UNDER_TEST.record_schemas.map((i) => entry('record_schema', i)) },
      builder: { status: 'ok', entries: COMMERCIAL_SUPPORT_UNDER_TEST.builders.map((i) => entry('builder', i)) },
    },
  }
}
