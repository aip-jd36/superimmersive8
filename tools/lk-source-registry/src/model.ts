/**
 * Living Knowledge Source Monitoring, Phase A, milestone M1: registry and
 * mapping contract (PRD_LK_SOURCE_MONITORING_v0.2.md sections 5.1, 6.1, 6.2).
 *
 * This module holds types and closed sets only. Nothing here reads or writes
 * a file, fetches a URL or calls a model.
 *
 * The registry is an index of monitored sources and of human-confirmed
 * source-to-claim relationships. It is not a claim authority: claim identity
 * and lifecycle are read from GOVERNED-CLAIMS.md and never stored here.
 */

export const SCHEMA_VERSION = 1

export const SOURCE_CLASSES = [
  'provider_terms',
  'licence_terms',
  'statute_or_regulation',
  'regulator_guidance',
  'official_feed',
] as const
export type SourceClass = (typeof SOURCE_CLASSES)[number]

export const RETRIEVAL_METHODS = ['automated_http', 'automated_api', 'human_capture'] as const
export type RetrievalMethod = (typeof RETRIEVAL_METHODS)[number]

/** SOP section 4 provenance classes. */
export const EVIDENCE_TIERS = ['A', 'B', 'C', 'D'] as const

export const SCOPE_KINDS = ['tool', 'provider', 'none'] as const
export type ScopeKind = (typeof SCOPE_KINDS)[number]

/** Source classes that describe one provider or tool and so must name it. */
export const SCOPED_SOURCE_CLASSES: readonly SourceClass[] = ['provider_terms', 'licence_terms']

export const LEDGER_LIFECYCLES = ['Adopted', 'Deprecated', 'Candidate'] as const
export type LedgerLifecycle = (typeof LEDGER_LIFECYCLES)[number]

export interface SourceScope {
  kind: ScopeKind
  /** Runtime tool or provider identifier, exactly as governed claims name it. null when kind is 'none'. */
  id: string | null
}

export interface ExtractionRule {
  id: string
  version: number
}

export interface Baseline {
  snapshot: string
  raw_sha256: string
  extracted_sha256: string
  extraction_rule_version: number
  accepted_by: string
  accepted_on: string
}

export interface SourceEntry {
  source_id: string
  name: string
  owner: string
  source_class: SourceClass
  canonical_url: string
  redirect_steps: string[]
  expected_final_url: string
  identity_markers: string[]
  retrieval_method: RetrievalMethod
  extraction_rule: ExtractionRule | null
  min_extracted_length: number | null
  version_locator: string | null
  evidence_tier: string
  applicability_scope_note: string
  cadence_class: string
  scope: SourceScope
  baseline: Baseline | null
  evidence_manifest: string | null
  notes: string
}

export interface Relationship {
  source_id: string
  claim_ref: string
  /** Repository path where the dependence is evidenced. */
  basis_path: string
  basis_note: string
  /** Named human. null means the relationship is proposed and not yet confirmed. */
  confirmed_by: string | null
  confirmed_on: string | null
}

export interface Exclusion {
  source_id: string
  claim_ref: string
  reason: string
  confirmed_by: string | null
  confirmed_on: string | null
}

export interface Registry {
  schema_version: number
  sources: SourceEntry[]
  relationships: Relationship[]
  exclusions: Exclusion[]
}

// ── Repository evidence (read-only inputs to validation) ───────────────────

export interface RuntimeClaim {
  claim_id: string
  lifecycle: string
  crc_eligible: string
  tool_scope: string[] | null
  provider_scope: string[] | null
}

export interface MatrixRowEvidence {
  identifier: string
  last_verified: string | null
  claims: { claim_id: string; crc_eligible: string }[]
}

export interface CreatorRecordEntry {
  entry_id: string
  claim_id: string
  creator_record_eligible: string
  refresh_by: string | null
}

export interface Evidence {
  /** Authoritative: claim ID to lifecycle, as written in GOVERNED-CLAIMS.md. */
  ledger: Map<string, string>
  /** Runtime mirror. Used for consistency, scope and exposure. Never an authority for identity or lifecycle. */
  runtime: RuntimeClaim[]
  matrix: MatrixRowEvidence[]
  creatorRecord: CreatorRecordEntry[]
  /** Manifest path to the claim IDs it names. null when the file does not exist. */
  manifests: Map<string, string[] | null>
  /** Repository-relative paths that exist. */
  existingPaths: Set<string>
  /** Problems found while reading the evidence itself. Any entry makes the run invalid. */
  problems: string[]
}

// ── Results ────────────────────────────────────────────────────────────────

/** 'error' fails validation. 'pending' means a named human has not yet confirmed. */
export type Severity = 'error' | 'pending'

export interface Issue {
  severity: Severity
  code: string
  where: string
  message: string
}

export type Verdict = 'VALID' | 'VALID_PENDING_CONFIRMATION' | 'INVALID'

export interface ValidationResult {
  verdict: Verdict
  issues: Issue[]
}
