/**
 * CR-V2-PROD-UAT-B — operator-only logic for a controlled synthetic examination UAT (migration 20261105000000).
 *
 * Used ONLY by the operator CLI scripts/creator-record-v2-uat/examination-uat.ts (test-enforced). No route, page, job
 * or customer flow imports it. Pure: every effect goes through injected ports.
 *
 * What it can do, and what it cannot:
 *   - verify the target with LAYERED OPERATOR SAFEGUARDS (not authentication of the database's identity): the
 *     configured Supabase URL against the operator's expected ref, against the URL the live Production app embeds
 *     (production) or does not embed (staging), against the service key's own ref claim when the key carries one,
 *     and the grant's single-use code, which only the database where the grant was created can answer;
 *   - seed exactly one committed synthetic fixture as an `operator_synthetic_seed` document under the grant (the
 *     database binds the grant to it, once). Every stage is reported; nothing is ever deleted or overwritten
 *     (no delete, no remove, no upsert exists in these ports): a partial seed is CONTAINED and reported, the grant
 *     stays bound to that document, and the operator revokes it;
 *   - run the existing replay-only examination adapter once (no retry), and read the history back with the strict
 *     reader, expecting the operator-UAT boundary, this grant and this project.
 *   It cannot create, extend, widen or revoke a grant (the database grants the service role nothing on grants; the
 *   only grant access is the status function), cannot reach a model (replay executor only), and passes no authority:
 *   the database decides everything.
 *
 * The activity budget is an EXAMINATION-ADAPTER limit (examination-purpose access events under the grant), not a
 * limit on Supabase Storage access in general.
 */

import { randomBytes } from 'node:crypto'
import { sha256Bytes, validateEvidenceBytes } from '@/lib/creator-record/evidence-intake/contract'
import type { ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { PRODUCTION_SUPABASE_PROJECT_REF, supabaseProjectRef } from '@/lib/creator-record/governed/publication-authority'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import {
  examineAndRecord,
  readExaminationHistory,
  type ExaminationAdapterDeps,
  type ExaminationHistory,
  type ExaminationStoragePorts,
  type ExamineAndRecordResult,
} from '@/lib/creator-record/examination/persistence'

export const UAT_STATUS_FUNCTION = 'creator_record_v2_examination_uat_status'
export const PRODUCTION_APP_PAGE = 'https://app.superimmersive8.com/auth/login'
export const PRODUCTION_APP_ORIGIN = 'https://app.superimmersive8.com'

// ── Single-use binding code ───────────────────────────────────────────────────────────────────────────

/** A fresh code for one grant. The operator keeps `nonce` in the shell; only `sha256` goes into the grant SQL. */
export function newBindingNonce(random: (n: number) => Uint8Array = (n) => new Uint8Array(randomBytes(n))): { nonce: string; sha256: string } {
  const nonce = Buffer.from(random(32)).toString('hex')
  return { nonce, sha256: sha256Bytes(new TextEncoder().encode(nonce)) }
}

// ── Target verification (layered operator safeguards) ───────────────────────────────────────────────

export type UatTarget = 'production' | 'staging'
export interface TargetCheck { name: string; ok: boolean; detail: string }
export interface TargetVerification { ok: boolean; ref: string | null; checks: TargetCheck[] }

/** The `ref` claim of a legacy Supabase JWT key, never verifying or printing the key. 'unverifiable' for other formats. */
export function serviceKeyRef(key: string | undefined): string | 'unverifiable' {
  if (typeof key !== 'string') return 'unverifiable'
  const parts = key.split('.')
  if (parts.length !== 3) return 'unverifiable'
  try {
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as { ref?: unknown }
    return typeof payload.ref === 'string' ? payload.ref : 'unverifiable'
  } catch {
    return 'unverifiable'
  }
}

/** Every distinct Supabase project URL embedded in the live app's page scripts. */
export async function embeddedSupabaseUrls(fetchText: (url: string) => Promise<string>): Promise<string[]> {
  const html = await fetchText(PRODUCTION_APP_PAGE)
  const scripts = [...new Set(html.match(/\/_next\/static\/[^"'\s]+\.js/g) ?? [])]
  const found = new Set<string>()
  for (const s of scripts) for (const u of (await fetchText(PRODUCTION_APP_ORIGIN + s)).match(/https:\/\/[a-z0-9]{20}\.supabase\.co/g) ?? []) found.add(u)
  return [...found].sort()
}

export async function verifyTarget(
  input: { target: UatTarget; expectRef: string; supabaseUrl: string | undefined; serviceKey: string | undefined },
  deps: { fetchText: (url: string) => Promise<string> },
): Promise<TargetVerification> {
  const checks: TargetCheck[] = []
  const check = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail })
  const ref = supabaseProjectRef(input.supabaseUrl)
  const usable = ref !== null && ref !== 'local'
  check('configured project', usable && ref === input.expectRef, `configured ${usable ? ref : 'unidentified'}; operator expects ${input.expectRef}`)
  if (input.target === 'production') check('production ref', input.expectRef === PRODUCTION_SUPABASE_PROJECT_REF, 'the expected ref must be the Production project ref')
  else check('not production', input.expectRef !== PRODUCTION_SUPABASE_PROJECT_REF, 'a staging target can never be the Production project ref')
  let embedded: string[] = []
  try {
    embedded = await embeddedSupabaseUrls(deps.fetchText)
  } catch {
    embedded = []
  }
  const live = embedded.length === 1 ? supabaseProjectRef(embedded[0]) : null
  if (input.target === 'production') check('live app binding', live !== null && live === ref, embedded.length === 1 ? `the live app uses ${live}` : `the live app embeds ${embedded.length} Supabase URLs (exactly one required)`)
  else check('live app separation', embedded.length === 1 && live !== ref, embedded.length === 1 ? `the live app uses ${live}; the target must differ` : `the live app embeds ${embedded.length} Supabase URLs (exactly one required)`)
  const keyRef = serviceKeyRef(input.serviceKey)
  check('service key project', keyRef === 'unverifiable' || keyRef === ref, keyRef === 'unverifiable' ? 'not verifiable for this key format (layer not available)' : `the key belongs to ${keyRef}`)
  return { ok: checks.every((c) => c.ok), ref: usable ? ref : null, checks }
}

// ── Grant (read only, by single-use code) ───────────────────────────────────────────────────────────

export interface UatGrantStatus {
  grant_id: string
  test_user_id: string
  document_sha256: string
  bound_document_id: string | null
  supabase_project_ref: string
  created_at: string
  expires_at: string
  active: boolean
  revoked: boolean
  read_events_used: number
  max_read_events: number
  new_runs_used: number
  max_new_runs: number
  /**
   * CR-V2-EXAM-INTEGRATION-X1 (20261106000000). Absent before that migration (every grant was then operator-seeded).
   * This operator script acts only on operator_seed grants; a customer_path_uat grant is never seeded or examined here.
   */
  grant_kind?: 'operator_seed' | 'customer_path_uat'
}

/** True for an operator-seeded grant (the only kind this script seeds or examines). */
export const isOperatorSeedGrant = (grant: UatGrantStatus) => (grant.grant_kind ?? 'operator_seed') === 'operator_seed'

export type GrantResolution = { ok: true; grant: UatGrantStatus } | { ok: false; reason: 'no_grant_for_code' | 'ambiguous' | 'project_mismatch' | 'status_unavailable' }

/** The grant the code names, in the database the script reaches, for the verified project. */
export async function resolveGrant(status: (nonce: string) => Promise<UatGrantStatus[]>, nonce: string, ref: string): Promise<GrantResolution> {
  let rows: UatGrantStatus[]
  try {
    rows = await status(nonce)
  } catch {
    return { ok: false, reason: 'status_unavailable' }
  }
  if (rows.length === 0) return { ok: false, reason: 'no_grant_for_code' }
  if (rows.length !== 1) return { ok: false, reason: 'ambiguous' }
  if (rows[0].supabase_project_ref !== ref) return { ok: false, reason: 'project_mismatch' }
  return { ok: true, grant: rows[0] }
}

// ── Seeding exactly one synthetic document ──────────────────────────────────────────────────────────

export interface SeedRow {
  id: string
  user_id: string
  sha256: string
  media_type: string
  byte_size: number
  file_name: string
  storage_path: string
  consent_version: null
  origin: 'operator_synthetic_seed'
  seed_grant_id: string
  state: 'pending'
}

export interface SeedPorts {
  /** Inserts the pending row; `refused` = the database refused it (nothing was written). Throws when the outcome is unknown. */
  insertPending(row: SeedRow): Promise<{ ok: true } | { ok: false; refused: string }>
  /** Uploads without overwriting. Throws on failure. */
  putObject(path: string, bytes: Uint8Array, mediaType: string): Promise<void>
  /** The stored object, or null when absent. Throws on failure. */
  getObject(path: string): Promise<Uint8Array | null>
  /** pending → stored for this row; false when no pending row matched. Throws on failure. */
  markStored(id: string, userId: string, at: Date): Promise<boolean>
}

/** Stages after which a document row exists: the grant is bound to it and can never be re-bound. */
export type ContainedSeedStage = 'insert_outcome_unknown' | 'pending_without_object' | 'object_unverified' | 'not_marked_stored'
export type SeedOutcome =
  | { stage: 'refused_before_write'; reason: string }
  | { stage: ContainedSeedStage; document_id: string; detail: string; grant_bound: true; automatic_cleanup: false; next: string }
  | { stage: 'stored'; document_id: string; fixture_id: string; sha256: string }

const CONTAINED_NEXT = 'No automatic cleanup was attempted and none will be. Revoke the grant (revoke_grant.sql); it can never be re-bound. Inspect with the `status` command and decide any cleanup separately.'

/**
 * Seeds the grant's one committed fixture. `opts.fixtures` defaults to the committed fixture table (the CLI never
 * overrides it); tests pass stand-ins because the generated fixture files are git-ignored.
 */
export async function seedSyntheticDocument(
  ports: SeedPorts,
  grant: UatGrantStatus,
  bytes: Uint8Array,
  opts: { newId: () => string; now: () => Date; fixtures?: readonly ReplayFixture[] },
): Promise<SeedOutcome> {
  const refuse = (reason: string): SeedOutcome => ({ stage: 'refused_before_write', reason })
  if (!isOperatorSeedGrant(grant)) return refuse('not_an_operator_seed_grant')
  if (!grant.active) return refuse('grant_not_active')
  if (grant.bound_document_id !== null) return refuse('grant_already_bound')
  const v = validateEvidenceBytes(bytes)
  if (!v.ok) return refuse(`bytes_invalid:${v.code}`)
  if (v.sha256 !== grant.document_sha256) return refuse('not_the_granted_fixture')
  const fixture = (opts.fixtures ?? REPLAY_FIXTURES).find((f) => f.sha256 === v.sha256)
  if (!fixture || fixture.media_type !== v.media_type || (fixture.bytes !== undefined && fixture.bytes !== v.byte_size)) return refuse('not_a_committed_fixture')

  const id = opts.newId()
  const extension = v.media_type === 'application/pdf' ? '.pdf' : v.media_type === 'image/png' ? '.png' : '.jpg'
  const row: SeedRow = {
    id,
    user_id: grant.test_user_id,
    sha256: v.sha256,
    media_type: v.media_type,
    byte_size: v.byte_size,
    file_name: `${fixture.fixture_id}${extension}`,
    storage_path: `${grant.test_user_id}/${id}`,
    consent_version: null,
    origin: 'operator_synthetic_seed',
    seed_grant_id: grant.grant_id,
    state: 'pending',
  }
  const contained = (stage: ContainedSeedStage, detail: string): SeedOutcome => ({ stage, document_id: id, detail, grant_bound: true, automatic_cleanup: false, next: CONTAINED_NEXT })

  let inserted: { ok: true } | { ok: false; refused: string }
  try {
    inserted = await ports.insertPending(row)
  } catch {
    return contained('insert_outcome_unknown', 'the insert did not report an outcome: the row may or may not exist (if it does, the grant is bound to it)')
  }
  if (!inserted.ok) return refuse(`database_refused:${inserted.refused}`)
  try {
    await ports.putObject(row.storage_path, bytes, row.media_type)
  } catch {
    return contained('pending_without_object', 'the pending row exists; the upload failed or its outcome is unknown')
  }
  let stored: Uint8Array | null
  try {
    stored = await ports.getObject(row.storage_path)
  } catch {
    return contained('object_unverified', 'the object could not be read back')
  }
  if (!stored || sha256Bytes(stored) !== row.sha256 || stored.length !== row.byte_size) return contained('object_unverified', stored ? 'the object read back does not match the fixture' : 'the object is absent')
  let marked: boolean
  try {
    marked = await ports.markStored(id, row.user_id, opts.now())
  } catch {
    return contained('not_marked_stored', 'marking the row stored failed or its outcome is unknown')
  }
  if (!marked) return contained('not_marked_stored', 'no pending row matched')
  return { stage: 'stored', document_id: id, fixture_id: fixture.fixture_id, sha256: row.sha256 }
}

// ── Examination (once, replay only) and strict read-back ─────────────────────────────────────────────

export type UatExamination = ExamineAndRecordResult | { kind: 'not_attempted'; reason: 'not_an_operator_seed_grant' | 'grant_not_active' | 'grant_not_bound' }

/** One examination of the grant's document through the existing adapter. Never retried here. */
export async function examineGrantDocument(deps: ExaminationAdapterDeps, grant: UatGrantStatus): Promise<UatExamination> {
  if (!isOperatorSeedGrant(grant)) return { kind: 'not_attempted', reason: 'not_an_operator_seed_grant' }
  if (!grant.active) return { kind: 'not_attempted', reason: 'grant_not_active' }
  if (grant.bound_document_id === null) return { kind: 'not_attempted', reason: 'grant_not_bound' }
  return examineAndRecord(deps, {
    actor_user_id: grant.test_user_id,
    document_id: grant.bound_document_id,
    profile: { id: RECEIPT_PROFILE.ref.id, version: RECEIPT_PROFILE.ref.version },
  })
}

/** The grant document's runs, each re-verified and required to carry the operator-UAT boundary, this grant and project. */
export async function readGrantHistory(storage: Pick<ExaminationStoragePorts, 'listRuns'>, grant: UatGrantStatus): Promise<ExaminationHistory | { kind: 'not_bound' }> {
  if (grant.bound_document_id === null) return { kind: 'not_bound' }
  return readExaminationHistory(storage, grant.test_user_id, grant.bound_document_id, {
    boundary: 'operator_synthetic_uat',
    uat_grant_id: grant.grant_id,
    project_ref: grant.supabase_project_ref,
  })
}
