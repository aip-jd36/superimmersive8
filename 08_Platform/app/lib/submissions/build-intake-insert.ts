/**
 * Submission intake allowlist (CAA-SECURITY-3A).
 *
 * `/api/submissions/create` inserts with the service role, so it — not RLS —
 * decides which columns a creator may set. This module turns an untrusted
 * request body into the exact row to insert:
 *
 *   - only the intake fields RecordForm (/record) and CertForm (/certify)
 *     legitimately send are kept;
 *   - identity (`user_id`) and workflow state (`status`, `payment_status`) are
 *     always set server-side, whatever the client sent;
 *   - every other key (reviewer, payment, report, assessment, admin, unknown)
 *     is discarded and reported by NAME only, never by value.
 *
 * PURE. No I/O.
 */

/** Intake fields a creator may supply. Mirrors the two intake forms exactly. */
export const SUBMISSION_INTAKE_FIELDS = [
  'filmmaker_name',
  'filmmaker_location',
  'filmmaker_contact',
  'filmmaker_portfolio_links',
  'title',
  'runtime',
  'genre',
  'logline',
  'intended_use',
  'tools_used',
  'authorship_statement',
  'likeness_confirmation',
  'likeness_release_path',
  'ip_confirmation',
  'ip_license_path',
  'fair_use_argument',
  'fair_use_doc_path',
  'audio_disclosure',
  'modification_authorized',
  'modification_scope',
  'territory_preferences',
  'supporting_materials',
  'tier',
  'submission_mode',
  'campaign_context',
  'third_party_assets',
  'post_gen_editing',
  'scene_attribution',
  'ai_percentage',
  'production_evidence_paths',
  'client_name',
  'content_integrity_accepted',
  'scope_acknowledged',
  'custodian_declaration',
  'indemnification_confirmed',
  'video_url',
] as const

/** Keys the forms send today that the server overrides rather than trusts. Discarded silently. */
const SERVER_CONTROLLED_FIELDS = new Set(['user_id', 'status', 'payment_status'])

/** Tier values the intake forms send. Price and review path depend on tier, so it is a closed set. */
export const SUBMISSION_TIERS = ['creator_record', 'certified', 'si8_certified'] as const
export const SUBMISSION_MODES = ['creator', 'agency'] as const

export const INITIAL_SUBMISSION_STATUS = 'pending'
export const INITIAL_PAYMENT_STATUS = 'unpaid'

export type IntakeInsertResult =
  | { ok: true; row: Record<string, unknown>; discarded_fields: string[] }
  | { ok: false; reason: string }

const INTAKE = new Set<string>(SUBMISSION_INTAKE_FIELDS)

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isPrimitive(v: unknown): boolean {
  return v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
}

export function buildIntakeInsert(submissionData: unknown, userId: string): IntakeInsertResult {
  if (!isPlainObject(submissionData)) return { ok: false, reason: 'submissionData must be an object' }

  const row: Record<string, unknown> = {}
  const discarded: string[] = []

  for (const [key, value] of Object.entries(submissionData)) {
    if (!INTAKE.has(key)) {
      if (!SERVER_CONTROLLED_FIELDS.has(key)) discarded.push(key)
      continue
    }
    // The forms JSON-encode every structured field, so each value is a primitive.
    if (!isPrimitive(value)) return { ok: false, reason: `invalid value for ${key}` }
    row[key] = value
  }

  if (typeof row.title !== 'string' || row.title.trim() === '') return { ok: false, reason: 'title is required' }
  if ('tier' in row && !(SUBMISSION_TIERS as readonly unknown[]).includes(row.tier)) return { ok: false, reason: 'invalid tier' }
  if ('submission_mode' in row && !(SUBMISSION_MODES as readonly unknown[]).includes(row.submission_mode)) {
    return { ok: false, reason: 'invalid submission_mode' }
  }

  row.user_id = userId
  row.status = INITIAL_SUBMISSION_STATUS
  row.payment_status = INITIAL_PAYMENT_STATUS

  return { ok: true, row, discarded_fields: discarded.sort() }
}
