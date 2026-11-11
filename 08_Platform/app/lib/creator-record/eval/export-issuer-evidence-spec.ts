/**
 * CRV2-IA-4D3 S2b — the render specification of the issuer-evidence fixture set, derived from `issuer-evidence-fixtures.ts`.
 *
 *   npx tsx lib/creator-record/eval/export-issuer-evidence-spec.ts      (rewrites fixtures/issuer-evidence-fixtures.json)
 *
 * The TypeScript fixtures are the single source; the JSON exists only so the Python generator can render the documents. A test pins
 * the committed JSON as byte-identical to `issuerEvidenceRenderSpecJson()`, so the two cannot drift. Pure apart from the main block.
 */

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { ISSUER_EVIDENCE_FIXTURES, ISSUER_EVIDENCE_FIXTURE_SET, SYNTHETIC_FOOTER, type IssuerEvidenceDocumentFixture } from './issuer-evidence-fixtures'

export const ISSUER_EVIDENCE_SPEC_PATH = path.join(__dirname, 'fixtures', 'issuer-evidence-fixtures.json')

export interface IssuerEvidenceRenderSpec {
  spec_version: string
  fixture_set: { id: string; version: number }
  synthetic_marker: string
  documents: Array<{ id: string; template: 'lines'; content: { letterhead: { name: string; details: string[] } | null; lines: string[] } }>
}

export function issuerEvidenceRenderSpec(): IssuerEvidenceRenderSpec {
  const docs = ISSUER_EVIDENCE_FIXTURES.filter((f): f is IssuerEvidenceDocumentFixture => f.kind === 'document')
  return {
    spec_version: `issuer-evidence-fixtures-v${ISSUER_EVIDENCE_FIXTURE_SET.version}`,
    fixture_set: { id: ISSUER_EVIDENCE_FIXTURE_SET.id, version: ISSUER_EVIDENCE_FIXTURE_SET.version },
    synthetic_marker: SYNTHETIC_FOOTER,
    documents: docs.map((f) => ({ id: f.id, template: 'lines', content: { letterhead: f.letterhead ?? null, lines: [...f.lines] } })),
  }
}

export function issuerEvidenceRenderSpecJson(): string {
  return JSON.stringify(issuerEvidenceRenderSpec(), null, 2) + '\n'
}

if (require.main === module) {
  writeFileSync(ISSUER_EVIDENCE_SPEC_PATH, issuerEvidenceRenderSpecJson())
  console.log(`wrote ${ISSUER_EVIDENCE_SPEC_PATH}`)
}
