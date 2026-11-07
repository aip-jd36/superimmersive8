/**
 * CR-V2-1C — governed issuance eligibility for an already-prepared Creator
 * Record v2.
 *
 * Three separate operations:
 *   - preparation (`buildCustomerRecord`): may a record be built from these sources now?
 *   - historical verification (`verifyCustomerRecord`): is a stored record exactly
 *     what was prepared? From the record and its digest alone;
 *   - issuance eligibility (here): may this prepared record be issued NOW, under the
 *     authoritative governance state supplied by the caller?
 *
 * Policy (PM, CR-V2-1C): withdrawn, superseded, retired or pending authority
 * blocks issuance. There are no transition exceptions and no grandfathering.
 * Nothing is substituted: the record is issued exactly as prepared or not at
 * all, and this module never modifies, rebuilds or re-interprets it. It reads
 * no conclusion and can only refuse, never strengthen. Builder and schema
 * identities are technical provenance: they can only make a record ineligible.
 *
 * Generic: every reference is checked by the same rules, whatever its kind.
 * Source formats are mapped to `AuthorityState` by `./governance-state`.
 *
 * CR-V2-MVP-ELIGIBILITY-1: commercial eligibility also needs the exact questionnaire contract the record embeds to be the
 * current approved one. Superseded and withdrawn contracts refuse new commercial actions: a conservative MVP policy, not a
 * decision about records already issued. A record with no contract (schema 5, 6) and a synthetic record are refused whatever
 * the governance state says; both stay readable (`verifyCustomerRecord` is unaffected).
 *
 * CR-V2-MVP-M4A: an examination-bearing record (schema 8) also needs every document reading it carries to be commercially
 * authorized. A model reading (a customer live examination) is eligible only when its exact method — provider, model and reading
 * profile — is on the support list the caller supplies (`examination_methods`; empty in a shipped build). A recorded-replay reading
 * only ever reads a known synthetic test document, so it is refused like a synthetic record. Both are refusals read from the record
 * itself: no governance action can widen them. Nothing here reads, compares or judges what a document shows.
 *
 * Pure: no I/O and no clock (the issuance date is supplied).
 */

import { isIsoDate } from '../contract/types'
import { AUTHORITY_KINDS, DIGESTED_KINDS, isSyntheticAuthorityText, type AuthorityKind, type PublicationAuthorityClass } from './authority-content'
import { QUESTIONNAIRE_CONTRACT_ID } from './questionnaire-contract'
import { verifyCustomerRecord, type CustomerRecordV2 } from './record'

export interface AuthorityRef {
  kind: AuthorityKind
  id: string
  version: string
  /** Content digest recorded at preparation; null for kinds with no content (schema, builder). */
  content_sha256: string | null
}

export const AUTHORITY_LIFECYCLES = ['approved', 'pending', 'withdrawn', 'superseded', 'retired'] as const
export type AuthorityLifecycle = (typeof AUTHORITY_LIFECYCLES)[number]

/** The current authoritative state of one governed entry. */
export interface AuthorityState {
  kind: AuthorityKind
  id: string
  version: string
  lifecycle: AuthorityLifecycle
  /** Digest of the entry's current content; null when the kind has none. */
  content_sha256: string | null
  /** Last date on which the entry is valid (e.g. a ledger refresh date); null = no limit. */
  valid_until: string | null
  /** Governance itself reports an inconsistency for this entry (e.g. two current entries for one claim). */
  conflict: boolean
}

/** One authority kind as the caller could read it. Unavailability and malformation are explicit. */
export type Lookup =
  | { status: 'ok'; entries: readonly AuthorityState[] }
  | { status: 'unavailable' }
  | { status: 'malformed' }

/**
 * CR-V2-MVP-M4A: the identity of a document-reading method, exactly as a stored model reading records it (its envelope's executor
 * and profile). Technical provenance only: being listed authorizes the method commercially, it says nothing about any reading.
 */
export interface ExaminationMethodIdentity {
  origin: 'live_model'
  provider: string
  model: string
  profile: { id: string; version: number; schema: string; prompt: string }
}

export interface GovernanceSnapshot {
  issuance_date: string
  authorities: Partial<Record<AuthorityKind, Lookup>>
  /** The class of the bundle this state comes from. Only 'synthetic_test', which Production can never select, admits a synthetic record. */
  authority_class?: PublicationAuthorityClass
  /** CR-V2-MVP-M4A: the model-reading methods this build may sell and issue. Absent or empty: none. */
  examination_methods?: readonly ExaminationMethodIdentity[]
}

export const INELIGIBILITY_CODES = [
  'reference_missing', 'version_not_current', 'lifecycle_pending', 'lifecycle_withdrawn', 'lifecycle_superseded', 'lifecycle_retired', 'validity_lapsed', 'contract_not_recorded', 'synthetic_record',
  // CR-V2-MVP-M4A: a model reading whose method is not commercially supported; a recorded-replay (synthetic) reading.
  'examination_method_not_supported', 'synthetic_examination',
] as const
export type IneligibilityCode = (typeof INELIGIBILITY_CODES)[number]
export const CONFLICT_CODES = ['reference_ambiguous', 'content_changed_under_version', 'governance_conflict'] as const
export type ConflictCode = (typeof CONFLICT_CODES)[number]

/** The governed kinds, and (CR-V2-MVP-M4A) the reading method of a document examination. */
export type FindingKind = AuthorityKind | 'examination_method'

export interface Finding<C extends string> {
  code: C
  kind: FindingKind
  id: string
  version: string
}

export type InvalidRecordReason = 'digest_malformed' | 'digest_mismatch' | 'not_json' | 'not_canonical' | 'wrong_schema' | 'provenance_malformed'

export type IssuanceEligibility =
  /** Every reference is approved, current, unchanged and in date. */
  | { decision: 'eligible'; checked: AuthorityRef[] }
  /** Definitive governance refusal. Not retried automatically; only a governance action can change it. */
  | { decision: 'ineligible'; reasons: Finding<IneligibilityCode>[] }
  /** The record is not intact or not a prepared record. Never issuable; an integrity incident. */
  | { decision: 'invalid_record'; reason: InvalidRecordReason }
  /**
   * Could not decide; fails closed. `unavailable` is temporary (retry); `conflict` and
   * `malformed_state` are governance or input defects (operator review).
   */
  | { decision: 'indeterminate'; cause: 'conflict'; conflicts: Finding<ConflictCode>[] }
  | { decision: 'indeterminate'; cause: 'malformed_state' | 'unavailable'; components: AuthorityKind[] }

export class IssuanceReferenceError extends Error {
  constructor(reason: string) {
    super(`creator_record_v2_issuance_references: ${reason}`)
  }
}

const HEX64 = /^[0-9a-f]{64}$/
const byKey = (r: { kind: string; id: string; version: string }) => `${r.kind}\u0000${r.id}\u0000${r.version}`
const sorted = <T extends { kind: string; id: string; version: string; code?: string }>(xs: T[]): T[] =>
  [...xs].sort((a, b) => {
    const ka = `${byKey(a)}\u0000${a.code ?? ''}`
    const kb = `${byKey(b)}\u0000${b.code ?? ''}`
    return ka < kb ? -1 : ka > kb ? 1 : 0
  })

/**
 * Every governance reference the prepared record relies on, from the record
 * alone. Throws `IssuanceReferenceError` when the record's provenance is
 * incomplete or inconsistent (a referenced entry without a recorded content
 * digest, or a recorded digest for nothing the record references).
 */
export function issuanceReferences(record: CustomerRecordV2): AuthorityRef[] {
  const s = record.sources
  const wanted: { kind: AuthorityKind; id: string; version: string }[] = []
  for (const q of s.questions) wanted.push({ kind: 'question', id: q.q_id, version: String(q.version) })
  for (const o of record.declarations.observations) if (o.map_entry) wanted.push({ kind: 'observation_map_entry', id: o.map_entry.o_id, version: String(o.map_entry.o_version) })
  for (const p of s.publications) wanted.push({ kind: 'publication_entry', id: p.entry_id, version: String(p.version) })
  for (const i of record.guidance.items) wanted.push({ kind: 'governed_claim', id: i.provenance.claim.claim_id, version: String(i.provenance.claim.last_verified) })

  const digests = new Map<string, string>()
  for (const d of s.authority_digests ?? []) {
    if (!(DIGESTED_KINDS as readonly string[]).includes(d.kind) || typeof d.id !== 'string' || typeof d.version !== 'string' || !HEX64.test(d.content_sha256)) throw new IssuanceReferenceError('malformed authority digest')
    if (digests.has(byKey(d))) throw new IssuanceReferenceError(`duplicate authority digest ${d.kind} ${d.id}`)
    digests.set(byKey(d), d.content_sha256)
  }
  const refs = new Map<string, AuthorityRef>()
  for (const w of wanted) {
    const digest = digests.get(byKey(w))
    if (!digest) throw new IssuanceReferenceError(`no content digest for ${w.kind} ${w.id} v${w.version}`)
    refs.set(byKey(w), { ...w, content_sha256: digest })
  }
  if (digests.size !== refs.size) throw new IssuanceReferenceError('a recorded digest is not referenced by the record')

  const st = s.source_text
  if (!st || typeof st.source_id !== 'string' || !Number.isInteger(st.version) || !HEX64.test(st.content_sha256)) throw new IssuanceReferenceError('malformed source text provenance')
  if (!st.record_schema || st.record_schema.id !== record.schema || st.record_schema.version !== record.schema_version) throw new IssuanceReferenceError('source text approved for another record schema')
  refs.set('source_text', { kind: 'source_text', id: st.source_id, version: String(st.version), content_sha256: st.content_sha256 })
  if (!record.builder || typeof record.builder.id !== 'string' || !Number.isInteger(record.builder.version)) throw new IssuanceReferenceError('malformed builder provenance')
  const contract = s.questionnaire_contract
  if (contract) refs.set('questionnaire_contract', { kind: 'questionnaire_contract', id: contract.contract_id, version: String(contract.contract_version), content_sha256: contract.contract_sha256 })
  refs.set('builder', { kind: 'builder', id: record.builder.id, version: String(record.builder.version), content_sha256: null })
  refs.set('record_schema', { kind: 'record_schema', id: record.schema, version: String(record.schema_version), content_sha256: null })
  return sorted(Array.from(refs.values()))
}

/** Why this record can never be sold or issued under this state, from the record itself. A governance action cannot change it. */
function commercialExclusions(record: CustomerRecordV2, state: GovernanceSnapshot | null | undefined): Finding<IneligibilityCode>[] {
  const out: Finding<IneligibilityCode>[] = []
  const s = record.sources
  const c = s.questionnaire_contract
  if (!c) out.push({ code: 'contract_not_recorded', kind: 'questionnaire_contract', id: QUESTIONNAIRE_CONTRACT_ID, version: 'none' })
  // Governance mode refuses a bundle whose approval text looks like this, so a record built from real approvals cannot match.
  const synthetic = [s.source_text.authority, s.source_text.review_ref, c?.authority, c?.review_ref, s.registry_version, s.ledger_version].some(isSyntheticAuthorityText)
  if (synthetic && state?.authority_class !== 'synthetic_test') out.push({ code: 'synthetic_record', kind: 'source_text', id: s.source_text.source_id, version: String(s.source_text.version) })
  out.push(...examinationExclusions(record, state))
  return out
}

/** The shape of a stored model reading this check reads. The record was verified first, so every projection already parsed strictly. */
interface StoredLiveReading {
  execution_boundary: 'customer_live_examination'
  envelope: { execution_origin: string; executor: { provider: string; model: string }; profile: { id: string; version: number; schema: string; prompt: string } }
}
const isLiveReading = (e: unknown): e is StoredLiveReading => !!e && typeof e === 'object' && (e as { execution_boundary?: unknown }).execution_boundary === 'customer_live_examination'

const sameMethod = (a: ExaminationMethodIdentity, b: ExaminationMethodIdentity) =>
  a.origin === b.origin && a.provider === b.provider && a.model === b.model &&
  a.profile.id === b.profile.id && a.profile.version === b.profile.version && a.profile.schema === b.profile.schema && a.profile.prompt === b.profile.prompt

/** The reading method of a stored model reading, from the record alone. */
export function examinationMethodOf(reading: StoredLiveReading): ExaminationMethodIdentity {
  const e = reading.envelope
  return { origin: 'live_model', provider: e.executor.provider, model: e.executor.model, profile: { id: e.profile.id, version: e.profile.version, schema: e.profile.schema, prompt: e.profile.prompt } }
}

/**
 * CR-V2-MVP-M4A: every document reading the record carries must be commercially authorized. A model reading needs its exact method on
 * `state.examination_methods`; any other reading is a recorded replay of a known synthetic test document, admitted only by the
 * synthetic test class (which Production never selects). Fail closed: an unreadable state supports nothing.
 */
function examinationExclusions(record: CustomerRecordV2, state: GovernanceSnapshot | null | undefined): Finding<IneligibilityCode>[] {
  const out: Finding<IneligibilityCode>[] = []
  const supported = state && typeof state === 'object' && Array.isArray(state.examination_methods) ? state.examination_methods : []
  for (const d of record.documents.items) {
    const e: unknown = d.examination
    if (!e || typeof e !== 'object') continue
    if (isLiveReading(e)) {
      const m = examinationMethodOf(e)
      if (e.envelope.execution_origin !== 'live_model' || !supported.some((x) => sameMethod(x, m)))
        out.push({ code: 'examination_method_not_supported', kind: 'examination_method', id: `${m.provider}/${m.model}`, version: `${m.profile.id}@${m.profile.version}/${m.profile.schema}/${m.profile.prompt}` })
    } else if (state?.authority_class !== 'synthetic_test') {
      out.push({ code: 'synthetic_examination', kind: 'examination_method', id: 'fixture_replay', version: d.document_id })
    }
  }
  return out
}

function wellFormed(e: unknown, kind: AuthorityKind): e is AuthorityState {
  if (!e || typeof e !== 'object') return false
  const a = e as Record<string, unknown>
  return (
    a.kind === kind && typeof a.id === 'string' && typeof a.version === 'string' &&
    (AUTHORITY_LIFECYCLES as readonly unknown[]).includes(a.lifecycle) &&
    (a.content_sha256 === null || (typeof a.content_sha256 === 'string' && HEX64.test(a.content_sha256))) &&
    (a.valid_until === null || isIsoDate(a.valid_until)) &&
    typeof a.conflict === 'boolean'
  )
}

/**
 * May this prepared record be issued now? Integrity first (`verifyCustomerRecord`),
 * then every reference against the supplied governance state.
 *
 * Precedence: invalid_record > ineligible > indeterminate (conflict > malformed_state
 * > unavailable) > eligible. A definitive refusal stands even when another
 * component could not be read; nothing unread is ever treated as approved.
 */
export function evaluateIssuanceEligibility(canonical: string, sha256: string, state: GovernanceSnapshot): IssuanceEligibility {
  const verified = verifyCustomerRecord(canonical, sha256)
  if (!verified.ok) return { decision: 'invalid_record', reason: verified.reason }
  let refs: AuthorityRef[]
  try {
    refs = issuanceReferences(verified.record)
  } catch (err) {
    if (err instanceof IssuanceReferenceError) return { decision: 'invalid_record', reason: 'provenance_malformed' }
    throw err
  }

  const excluded = commercialExclusions(verified.record, state)
  if (excluded.length > 0) return { decision: 'ineligible', reasons: sorted(excluded) }

  const issuance = state && typeof state === 'object' ? state.issuance_date : undefined
  if (!isIsoDate(issuance) || !state.authorities || typeof state.authorities !== 'object') return { decision: 'indeterminate', cause: 'malformed_state', components: [...AUTHORITY_KINDS] }

  const ineligible: Finding<IneligibilityCode>[] = []
  const conflicts: Finding<ConflictCode>[] = []
  const malformed = new Set<AuthorityKind>()
  const unavailable = new Set<AuthorityKind>()

  for (const ref of refs) {
    const at = { kind: ref.kind, id: ref.id, version: ref.version }
    const lookup = state.authorities[ref.kind]
    if (!lookup || lookup.status === 'malformed') {
      malformed.add(ref.kind)
      continue
    }
    if (lookup.status === 'unavailable') {
      unavailable.add(ref.kind)
      continue
    }
    if (lookup.status !== 'ok' || !Array.isArray(lookup.entries) || !lookup.entries.every((e) => wellFormed(e, ref.kind))) {
      malformed.add(ref.kind)
      continue
    }
    const sameId = lookup.entries.filter((e) => e.id === ref.id)
    const matches = sameId.filter((e) => e.version === ref.version)
    if (matches.length === 0) {
      ineligible.push({ code: sameId.length > 0 ? 'version_not_current' : 'reference_missing', ...at })
      continue
    }
    if (matches.length > 1) {
      conflicts.push({ code: 'reference_ambiguous', ...at })
      continue
    }
    const current = matches[0]
    if (current.conflict) conflicts.push({ code: 'governance_conflict', ...at })
    if (ref.content_sha256 !== null && current.content_sha256 !== ref.content_sha256) conflicts.push({ code: 'content_changed_under_version', ...at })
    if (current.lifecycle !== 'approved') ineligible.push({ code: `lifecycle_${current.lifecycle}` as IneligibilityCode, ...at })
    if (current.valid_until !== null && current.valid_until < issuance) ineligible.push({ code: 'validity_lapsed', ...at })
  }

  if (ineligible.length > 0) return { decision: 'ineligible', reasons: sorted(ineligible) }
  if (conflicts.length > 0) return { decision: 'indeterminate', cause: 'conflict', conflicts: sorted(conflicts) }
  if (malformed.size > 0) return { decision: 'indeterminate', cause: 'malformed_state', components: AUTHORITY_KINDS.filter((k) => malformed.has(k)) }
  if (unavailable.size > 0) return { decision: 'indeterminate', cause: 'unavailable', components: AUTHORITY_KINDS.filter((k) => unavailable.has(k)) }
  return { decision: 'eligible', checked: refs }
}
