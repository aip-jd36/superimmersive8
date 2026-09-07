/**
 * Assessment sign-off — pure logic (CA-RLK-2a).
 *
 * No I/O. Every function here is deterministic and unit-testable without a
 * database. The durable sign-off act itself is the Postgres RPC
 * `sign_off_assessment` (migration 20260907000000); this module owns the
 * decision-completeness validation, the methodology→domain-scope map, the
 * canonical outcome derivation, and the list of assessment columns that a
 * generic update must never touch.
 *
 * What this module deliberately does NOT do:
 *   - decide authorization (the route does; V1 = users.is_admin);
 *   - talk to Supabase;
 *   - generate timestamps or actor identity (server/DB owns those);
 *   - add any methodology rule that is not already an authoritative machine
 *     gate in workbook-schema.ts `computeGates` / the Reviewer Manual.
 */

import { ASSESSMENT_OUTCOMES, type AssessmentOutcome } from '@/types/assessment'

// ── Sign-off status ──────────────────────────────────────────────────────────

export const SIGNOFF_STATUSES = ['active', 'invalidated'] as const
export type SignoffStatus = (typeof SIGNOFF_STATUSES)[number]

// ── Methodology → complete domain set (CA-RLK-2a §7 / §13) ───────────────────
//
// The public "Assessment Scope" is the COMPLETE domain set for the assessment's
// methodology version — never derived from Not-Applicable control judgments
// (N/A is control-level applicability; the domain is still assessed). The set
// can legitimately differ across methodology versions (Reviewer Manual v0.2
// Part 7: "SI8 decides to expand what it evaluates" → new domain). Both v0.1
// and v0.2 use the same seven domains (verified against Manual Part 2 + the
// v0.1→v0.2 Version History — the v0.2 changes were Domain H evidence
// corroboration + the Version Bump Requirement, not a domain-set change).

export const METHODOLOGY_DOMAIN_CODES: Record<string, readonly string[]> = {
  'SI8 Reviewer Manual v0.1': ['A', 'R', 'H', 'I', 'L', 'T', 'D'],
  'SI8 Reviewer Manual v0.2': ['A', 'R', 'H', 'I', 'L', 'T', 'D'],
}

/**
 * The domain-code list to snapshot for a given methodology version.
 * Returns null for an unrecognised version — a NEW sign-off must FAIL CLOSED
 * rather than silently snapshot "the current domains" for an unknown methodology.
 */
export function domainCodesForMethodology(methodologyVersion: string): readonly string[] | null {
  return METHODOLOGY_DOMAIN_CODES[methodologyVersion] ?? null
}

// Public label per code — used by the Verification Page to render a stored
// scope_domain_codes array. An unrecognised code renders as itself (never
// invents a new domain name).
export const DOMAIN_CODE_LABELS: Record<string, string> = {
  A: 'Identity & Accountability',
  R: 'Commercial Rights & Licensing',
  H: 'Human Creative Contribution',
  I: 'Third-Party IP',
  L: 'Likeness & Performer Rights',
  T: 'Technical Provenance',
  D: 'Documentation Integrity',
}

// ── Locked assessment columns (CA-RLK-2a §28) ───────────────────────────────
//
// Once written by a valid sign-off, these are only ever changed by the
// dedicated sign-off / re-sign RPC. `repository.updateAssessment` rejects any
// update whose keys intersect this set — there is exactly one write path.

export const LOCKED_ASSESSMENT_FIELDS: readonly string[] = [
  'signed_off_by',
  'signed_off_at',
  'signoff_status',
  'signoff_invalidated_at',
  'signoff_invalidated_by',
  'signed_workbook_revision',
  'methodology_version',
  'reviewer_organization',
  'assessment_date',
  'asset_title',
  'asset_media_type',
  'asset_runtime',
  'scope_domain_codes',
  'assessment_number',
  'submission_id',
  'verification_url',
]

// ── Canonical outcome derivation ────────────────────────────────────────────

/**
 * The outcome is owned by the canonical workbook (§6), never a client body
 * field. Returns null when Section 6 has no valid outcome yet.
 */
export function deriveOutcomeFromWorkbook(workbook: unknown): AssessmentOutcome | null {
  const s6 = (workbook as any)?.section_6
  const raw = s6?.outcome
  return ASSESSMENT_OUTCOMES.includes(raw as AssessmentOutcome) ? (raw as AssessmentOutcome) : null
}

// ── Server-side decision-completeness validation (CA-RLK-2a §16) ─────────────
//
// Mirrors the EXISTING authoritative gates: workbook-schema.ts `computeGates`
// (section 1 scope checks, section 2 observation, all 16 section-3 control
// judgments, ≥1 section-5 finding, section 6 outcome + commercial confidence),
// plus the two gates the Section 6 UI already enforces client-side (basis > 20
// chars; conditions required for EVIDENCE_SUPPORTS_WITH_CONDITIONS), plus the
// platform record of the two declarations (§1 guidance: the reviewer confirms
// what the platform logged at submission time).
//
// NOT enforced here (deferred to methodology follow-up, CA-RLK-2a §42):
//   - the Domain-H positive-outcome gate (Manual v0.2 — reviewer guidance,
//     not a machine gate in computeGates);
//   - a stronger commercial_confidence_basis requirement for non-High
//     confidence.

const CONTROLS = [
  'A01', 'R01', 'R02', 'R03', 'R04', 'H01', 'H02', 'I01',
  'I02', 'I03', 'L01', 'L02', 'L03', 'T01', 'D01', 'D02',
] as const

const JUDGMENTS = ['Verified', 'Partially Verified', 'Not Provided', 'Not Applicable'] as const
const CONFIDENCE = ['High', 'Moderate', 'Low'] as const

export interface WorkbookValidationResult {
  ok: boolean
  reasons: string[]
  outcome: AssessmentOutcome | null
}

export function validateWorkbookForSignoff(
  workbook: unknown,
  submission: { custodian_declaration?: unknown; indemnification_confirmed?: unknown; tier?: unknown },
): WorkbookValidationResult {
  const reasons: string[] = []
  const wb = (workbook ?? {}) as any
  const s1 = wb.section_1 ?? {}
  const s2 = wb.section_2 ?? {}
  const s3 = wb.section_3 ?? {}
  const s5 = wb.section_5 ?? {}
  const s6 = wb.section_6 ?? {}

  // Section 1 — all five scope checks true (the reviewer's confirmation)
  const scopeChecks = s1.scope_checks ?? {}
  const requiredChecks = [
    'no_list_reviewed',
    'custodian_declaration',
    'indemnification_confirmed',
    'video_accessible',
    'certified_tier',
  ]
  for (const k of requiredChecks) {
    if (scopeChecks[k] !== true) reasons.push(`section_1.scope_checks.${k} not confirmed`)
  }

  // Section 1 — platform record of the two declarations (guidance §1)
  if (submission.custodian_declaration !== true) reasons.push('submission Evidence Custodian Declaration not on record')
  if (submission.indemnification_confirmed !== true) reasons.push('submission Indemnification warranty not on record')

  // Section 2 — first viewing pass + observation minimum
  if (s2.viewing_passes?.first_complete !== true) reasons.push('section_2 first viewing pass not complete')
  if (typeof s2.freeform_observations !== 'string' || s2.freeform_observations.trim().length < 20) {
    reasons.push('section_2 freeform observations below 20 characters')
  }

  // Section 3 — every control has an accepted judgment
  for (const id of CONTROLS) {
    const j = s3?.[id]?.judgment
    if (!JUDGMENTS.includes(j)) reasons.push(`section_3.${id} has no accepted judgment`)
  }

  // Section 5 — at least one non-empty finding
  const findings = Array.isArray(s5.findings) ? s5.findings : []
  if (findings.filter((f: any) => typeof f?.finding === 'string' && f.finding.trim().length > 0).length < 1) {
    reasons.push('section_5 has no finding')
  }

  // Section 6 — outcome, commercial confidence, basis, conditions
  const outcome = deriveOutcomeFromWorkbook(wb)
  if (!outcome) reasons.push('section_6 outcome not set to a valid value')
  if (!CONFIDENCE.includes(s6.commercial_confidence)) reasons.push('section_6 commercial confidence not set')
  if (typeof s6.basis !== 'string' || s6.basis.trim().length <= 20) {
    reasons.push('section_6 rationale (basis) must be more than 20 characters')
  }
  if (outcome === 'EVIDENCE_SUPPORTS_WITH_CONDITIONS') {
    const conds = Array.isArray(s6.conditions) ? s6.conditions : []
    if (conds.filter((c: any) => typeof c === 'string' && c.trim().length > 0).length < 1) {
      reasons.push('EVIDENCE_SUPPORTS_WITH_CONDITIONS requires at least one condition')
    }
  }

  return { ok: reasons.length === 0, reasons, outcome }
}
