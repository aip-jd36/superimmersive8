/**
 * Synthetic fixtures for the offline tests. Nothing here is real governed
 * knowledge: every claim, tool, hash, person and path is invented for the
 * test and exists nowhere else.
 */

import type { Evidence, Exclusion, Registry, Relationship, SourceEntry } from '../src/model.ts'

export const LEDGER = 'synthetic/LEDGER.md'
export const MANIFEST = 'synthetic/alpha/MANIFEST.md'

export function source(over: Partial<SourceEntry> = {}): SourceEntry {
  return {
    source_id: 'alpha-terms',
    name: 'Alpha Terms',
    owner: 'Alpha Inc.',
    source_class: 'provider_terms',
    canonical_url: 'https://alpha.example/terms',
    redirect_steps: [],
    expected_final_url: 'https://alpha.example/terms',
    identity_markers: [],
    retrieval_method: 'automated_http',
    extraction_rule: { id: 'html-text', version: 1 },
    min_extracted_length: null,
    version_locator: null,
    evidence_tier: 'A',
    applicability_scope_note: 'Alpha self-serve plans.',
    cadence_class: 'provider_terms',
    scope: { kind: 'tool', id: 'alpha' },
    baseline: null,
    evidence_manifest: null,
    notes: '',
    ...over,
  }
}

export function statute(over: Partial<SourceEntry> = {}): SourceEntry {
  return source({ source_id: 'gamma-statute', name: 'Gamma Statute', owner: 'Gamma State', source_class: 'statute_or_regulation', canonical_url: 'https://law.example/gamma', expected_final_url: 'https://law.example/gamma', scope: { kind: 'none', id: null }, cadence_class: 'statute_or_regulation', ...over })
}

export function rel(source_id: string, claim_ref: string, over: Partial<Relationship> = {}): Relationship {
  return { source_id, claim_ref, basis_path: LEDGER, basis_note: 'Named as the primary source in the ledger entry.', confirmed_by: 'Test Reviewer', confirmed_on: '2026-01-15', ...over }
}

export function exc(source_id: string, claim_ref: string, over: Partial<Exclusion> = {}): Exclusion {
  return { source_id, claim_ref, reason: 'Named for comparison only.', confirmed_by: 'Test Reviewer', confirmed_on: '2026-01-15', ...over }
}

export function registry(over: Partial<Registry> = {}): Registry {
  return { schema_version: 1, sources: [source()], relationships: [rel('alpha-terms', 'CLAIM-ALPHA-USE-001-v1')], exclusions: [], ...over }
}

/** A small synthetic world: two tools, one statute claim, one deprecated claim, a three-row Matrix. */
export function evidence(over: Partial<Evidence> = {}): Evidence {
  return {
    ledger: new Map([
      ['CLAIM-ALPHA-USE-001-v1', 'Adopted'],
      ['CLAIM-ALPHA-USE-002-v1', 'Adopted'],
      ['CLAIM-BETA-USE-001-v1', 'Adopted'],
      ['CLAIM-GAMMA-RULE-001-v1', 'Adopted'],
      ['CLAIM-OLD-RULE-001-v1', 'Deprecated'],
      ['CLAIM-LEDGER-ONLY-001-v1', 'Adopted'],
    ]),
    runtime: [
      { claim_id: 'CLAIM-ALPHA-USE-001-v1', lifecycle: 'Adopted', crc_eligible: 'Yes', tool_scope: ['alpha'], provider_scope: null },
      { claim_id: 'CLAIM-BETA-USE-001-v1', lifecycle: 'Adopted', crc_eligible: 'Yes', tool_scope: ['beta'], provider_scope: null },
      { claim_id: 'CLAIM-GAMMA-RULE-001-v1', lifecycle: 'Adopted', crc_eligible: 'Yes', tool_scope: null, provider_scope: null },
      { claim_id: 'CLAIM-OLD-RULE-001-v1', lifecycle: 'Deprecated', crc_eligible: 'No', tool_scope: null, provider_scope: null },
      { claim_id: 'CLAIM-DELTA-STOCK-001-v1', lifecycle: 'Adopted', crc_eligible: 'Pending', tool_scope: null, provider_scope: ['delta-stock'] },
    ],
    matrix: [
      { identifier: 'mx-one', last_verified: '2026-01-01', claims: [{ claim_id: 'mx-one', crc_eligible: 'Yes' }] },
      { identifier: 'mx-two', last_verified: null, claims: [{ claim_id: 'mx-two-tiering', crc_eligible: 'Yes' }, { claim_id: 'mx-two-consent', crc_eligible: 'No' }] },
      { identifier: 'mx-three', last_verified: '2026-02-02', claims: [{ claim_id: 'mx-three', crc_eligible: 'Pending' }] },
    ],
    creatorRecord: [{ entry_id: 'CR-ENTRY-1', claim_id: 'CLAIM-ALPHA-USE-001-v1', creator_record_eligible: 'Yes', refresh_by: '2027-01-01' }],
    manifests: new Map(),
    existingPaths: new Set([LEDGER]),
    problems: [],
    ...over,
  }
}

export function codes(result: { issues: { code: string }[] }): string[] {
  return result.issues.map((i) => i.code)
}
