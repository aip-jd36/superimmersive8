/**
 * CR-SUM-PDF-B1 — test fixtures only. The fixed legacy cases whose customer PDF output must not change under Option R:
 *   - every scenario of the summary proofs (schema 7), rendered with the LIVE approved set v1;
 *   - schema 8 records with and without readings, responses and open conditions, rendered with the synthetic schema 8 set;
 *   - the same schema 8 records rendered with the synthetic schema 8 set PLUS the draft integrated-assessment wording (the
 *     existing integrated-assessment tests' pattern), so the integrated assessment inside guidance items is covered.
 * Records are real, locally built; nothing is approved or registered.
 */
import type { PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { templateFingerprint } from '@/lib/creator-record/customer-pdf/templates'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { preCutoverLiveSet } from './registered-template-sets'
import { CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF } from '@/lib/creator-record/governed/synthetic-test-authority'
import { DOCS, schema8Fixture } from './customer-record-schema8'
import { DRAFT_INTEGRATED_WORDING } from './integrated-assessment-draft-wording'
import { READINESS_SCENARIOS } from './readiness-scenarios'

export type LegacyTemplateSource = 'live' | 'synthetic8' | 'synthetic8_ia'
export interface LegacyCase {
  name: string
  record: { canonical: string; sha256: string; record: { schema_version: number } }
  templates: LegacyTemplateSource
}

/** The existing template set a legacy case renders with (never modified). */
export function legacyTemplateSet(c: Pick<LegacyCase, 'templates' | 'record'>): { templates: Record<string, unknown>; approval: PdfTemplateApproval } {
  // CR-V2-MVP-APPROVAL-AND-RELEASE-1: 'live' is the set that was live when the baseline was captured (v1 / v3).
  if (c.templates === 'live') return preCutoverLiveSet(c.record.record.schema_version as 7 | 8)
  if (c.templates === 'synthetic8') return { templates: EXAM_PDF.templates as Record<string, unknown>, approval: EXAM_PDF.approval as PdfTemplateApproval }
  const t = { ...JSON.parse(JSON.stringify(EXAM_PDF.templates)), integrated_assessment: JSON.parse(JSON.stringify(DRAFT_INTEGRATED_WORDING)) }
  return { templates: t, approval: { ...(EXAM_PDF.approval as PdfTemplateApproval), fingerprint: templateFingerprint(t) } }
}

export async function legacyCases(): Promise<LegacyCase[]> {
  const cases: LegacyCase[] = Object.entries(READINESS_SCENARIOS).map(([name, build]) => ({ name: `s7-${name}`, record: build(), templates: 'live' }))
  const responses: Parameters<typeof schema8Fixture>[0] = {
    responses: (envs, runs) => {
      const id = DOCS[0].document_id
      const o = envs.get(id)!.observations.find((x) => x.field === 'product_or_plan_name')!
      return [
        { target: { kind: 'observation', run_id: runs.get(id)!, observation_id: o.observation_id }, code: 'reading_incorrect' },
        { target: { kind: 'comparison', tool_index: 0, document_id: id, field: 'plan' }, code: 'other_plan_applies' },
      ]
    },
  }
  const music: Parameters<typeof schema8Fixture>[0] = { state: { answers: { P1: ['Legacy music case'], P3: ['paid_advertising'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['music'], M1: ['artlist'], H1: ['edited'] }, tools: [{ T1: ['pika'], T3: ['Standard'] }], acknowledgements: { A1: true, A2: true } } as never }
  const s8: [string, Parameters<typeof schema8Fixture>[0]][] = [
    ['default', {}],
    ['linked-docs', { docs: [{ tool_index: 0 }, { tool_index: 0 }] }],
    ['plan-not-sure', { plan: 'not_sure', docs: [{ tool_index: 0 }] }],
    ['responses', responses],
    ['music-dependency', music],
  ]
  for (const [name, o] of s8) cases.push({ name: `s8-${name}`, record: await schema8Fixture(o), templates: 'synthetic8' })
  for (const [name, o] of s8.filter(([n]) => n !== 'default')) cases.push({ name: `s8ia-${name}`, record: await schema8Fixture(o), templates: 'synthetic8_ia' })
  return cases
}
