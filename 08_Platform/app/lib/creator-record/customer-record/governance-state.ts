/**
 * CR-V2-1C — pure adapters from the current governance sources to the generic
 * `GovernanceSnapshot` the eligibility check reads (`./eligibility`).
 *
 * The only place that knows each source format. Mapping rules (fail closed):
 *   - only `governed` sources can be approved: pilot sources, and any entry
 *     carrying a pilot or prototype marker, map to `pending`;
 *   - question / observation-map entries: approval `approved` (with approver and
 *     date) → approved; `pending` → pending; `retired` → retired;
 *   - publication-ledger entries: `superseded_by` → superseded; eligibility `No`
 *     → withdrawn; `Pending`, or an incomplete approval → pending; validity is
 *     `refresh_by`; two current entries for one claim are a governance conflict;
 *   - governed claims: versioned by `last_verified`; `superseded_by` → superseded;
 *     never verified → pending;
 *   - Source Text Approvals: their own lifecycle; an incomplete one → pending;
 *   - record schemas and builders: the supported list, as approved identities.
 * A source the caller could not read is passed as `UNAVAILABLE` and stays
 * unavailable; one that does not load is malformed. Nothing is defaulted to
 * approved.
 */

import { loadQuestionRegistry } from '../contract/question-registry'
import { isApproved, isIsoDate, type GovernanceApproval } from '../contract/types'
import type { CreatorRecordSources } from '../prototype/build-draft'
import {
  claimContentDigest, claimRef, observationMapContentDigest, observationMapRef, publicationContentDigest, publicationRef,
  questionContentDigest, questionRef, type AuthorityKind, type PublicationAuthorityClass,
} from './authority-content'
import type { AuthorityLifecycle, AuthorityState, ExaminationMethodIdentity, GovernanceSnapshot, Lookup } from './eligibility'
import { approvalRefusals } from './questionnaire-contract'
import { SOURCE_TEXT_CATEGORIES, type SourceTextApproval } from './source-text'
import type { TopicClaims } from './sources'

export const UNAVAILABLE = Object.freeze({ unavailable: true as const })
export type Available<T> = T | typeof UNAVAILABLE

export interface Identity {
  id: string
  version: number
}

export interface IssuanceSupport {
  record_schemas: readonly Identity[]
  builders: readonly Identity[]
  /** CR-V2-MVP-M4A: the model-reading methods a schema 8 record's readings may use. Absent: none. */
  examination_methods?: readonly ExaminationMethodIdentity[]
}

/**
 * The record schemas, builders and (CR-V2-MVP-M4A) model-reading methods this build can issue. Technical identities only.
 * CR-V2-MVP-ELIGIBILITY-1: none. Schemas 5 and 6 carry no contract and are never commercially eligible; schemas 7 and 8 are
 * refused until issuance is separately authorized for them. CR-V2-MVP-M4A: no reading method either, so a schema 8 record holding
 * a model reading stays refused even once schema 8 is listed, until that exact method is separately authorized. Reading a record
 * does not depend on this list.
 */
export const CURRENT_ISSUANCE_SUPPORT: IssuanceSupport = Object.freeze({
  record_schemas: [],
  builders: [],
  examination_methods: [],
})

export interface CurrentGovernance {
  issuance_date: string
  sources: Available<CreatorRecordSources>
  topicClaims: Available<TopicClaims>
  source_text_approvals: Available<readonly SourceTextApproval[]>
  /**
   * CR-V2-MVP-PROD-PREP-1: the digest of the wording the running build would publish now. When supplied, an approval naming any
   * other digest is not current authority (read as pending); null = could not be established (every approval pending). Absent: not
   * checked (callers that only read history).
   */
  source_text_current_sha256?: string | null
  support?: IssuanceSupport
  /** The class of the bundle these sources come from, when they come from one. */
  authority_class?: PublicationAuthorityClass
}

const UNAPPROVED_MARKER = /pilot|prototype|unapproved|not a governance approval|not a creator record publication approval/i
const marked = (...xs: (string | null | undefined)[]) => xs.some((x) => typeof x === 'string' && UNAPPROVED_MARKER.test(x))
const isUnavailable = (v: unknown): v is typeof UNAVAILABLE => v === UNAVAILABLE
const ok = (entries: AuthorityState[]): Lookup => ({ status: 'ok', entries })
const state = (kind: AuthorityKind, ref: { id: string; version: string }, lifecycle: AuthorityLifecycle, content_sha256: string | null, valid_until: string | null = null, conflict = false): AuthorityState => ({ kind, ...ref, lifecycle, content_sha256, valid_until, conflict })

function approvalLifecycle(a: GovernanceApproval, governed: boolean): AuthorityLifecycle {
  if (!governed || marked(a.approver, a.review_ref)) return 'pending'
  if (a.status === 'retired') return 'retired'
  return isApproved(a) ? 'approved' : 'pending'
}

/** The one current contract approval. None means no record's contract is current; a superseded contract is simply not this one. */
function questionnaireContractLookup(sources: CreatorRecordSources): Lookup {
  const a = sources.questionnaire_approval
  if (a === null || a === undefined) return ok([])
  const refusals = approvalRefusals(a)
  if (refusals.some((r) => r.code === 'questionnaire_contract_malformed')) return { status: 'malformed' }
  const lifecycle: AuthorityLifecycle = sources.kind !== 'governed' || refusals.some((r) => r.code === 'pilot_marker') ? 'pending' : a.lifecycle
  return ok([state('questionnaire_contract', { id: a.contract_id, version: String(a.contract_version) }, lifecycle, a.contract_sha256)])
}

export function governanceSnapshotFrom(g: CurrentGovernance): GovernanceSnapshot {
  const support = g.support ?? CURRENT_ISSUANCE_SUPPORT
  const authorities: GovernanceSnapshot['authorities'] = {
    record_schema: ok(support.record_schemas.map((s) => state('record_schema', { id: s.id, version: String(s.version) }, 'approved', null))),
    builder: ok(support.builders.map((b) => state('builder', { id: b.id, version: String(b.version) }, 'approved', null))),
  }

  // ── Question Registry and Observation Map ──
  if (isUnavailable(g.sources)) {
    authorities.question = authorities.observation_map_entry = authorities.publication_entry = authorities.questionnaire_contract = { status: 'unavailable' }
  } else {
    const sources = g.sources
    const governed = sources.kind === 'governed'
    authorities.questionnaire_contract = questionnaireContractLookup(sources)
    const loaded = loadQuestionRegistry(sources.registry_input)
    if (!loaded.ok) {
      authorities.question = authorities.observation_map_entry = { status: 'malformed' }
    } else {
      authorities.question = ok(Array.from(loaded.registry.questions.values()).map((q) => state('question', questionRef(q), approvalLifecycle(q.approval, governed), questionContentDigest(q))))
      authorities.observation_map_entry = ok(loaded.registry.observation_map.map((o) => state('observation_map_entry', observationMapRef(o), approvalLifecycle(o.approval, governed), observationMapContentDigest(o))))
    }

    // ── Publication ledger ──
    const currentPerClaim = new Map<string, number>()
    for (const e of sources.ledger) if (e.superseded_by === null) currentPerClaim.set(e.claim_id, (currentPerClaim.get(e.claim_id) ?? 0) + 1)
    authorities.publication_entry = ok(
      sources.ledger.map((e) => {
        const complete = typeof e.approver === 'string' && e.approver.trim() !== '' && isIsoDate(e.decision_date) && isIsoDate(e.refresh_by)
        const lifecycle: AuthorityLifecycle =
          e.superseded_by !== null ? 'superseded'
            : !governed || marked(e.entry_id, e.approver) ? 'pending'
              : e.creator_record_eligible === 'No' ? 'withdrawn'
                : e.creator_record_eligible !== 'Yes' || !complete ? 'pending'
                  : 'approved'
        const conflict = e.superseded_by === null && (currentPerClaim.get(e.claim_id) ?? 0) > 1
        return state('publication_entry', publicationRef(e), lifecycle, publicationContentDigest(e), isIsoDate(e.refresh_by) ? e.refresh_by : null, conflict)
      }),
    )
  }

  // ── Governed claims ──
  authorities.governed_claim = isUnavailable(g.topicClaims)
    ? { status: 'unavailable' }
    : ok(g.topicClaims.map((c) => state('governed_claim', claimRef(c), c.superseded_by !== null ? 'superseded' : isIsoDate(c.last_verified) ? 'approved' : 'pending', claimContentDigest(c))))

  // ── Source Text Approvals ──
  if (isUnavailable(g.source_text_approvals)) authorities.source_text = { status: 'unavailable' }
  else {
    authorities.source_text = ok(
      g.source_text_approvals.map((a) => {
        const categoriesExact = Array.isArray(a.categories) && [...a.categories].sort().join('|') === [...SOURCE_TEXT_CATEGORIES].sort().join('|')
        const complete = typeof a.authority === 'string' && a.authority.trim() !== '' && isIsoDate(a.decision_date) && categoriesExact && !marked(a.authority, a.review_ref)
        const current = g.source_text_current_sha256 === undefined || (g.source_text_current_sha256 !== null && a.content_sha256 === g.source_text_current_sha256)
        const lifecycle: AuthorityLifecycle = a.lifecycle === 'approved' && (!complete || !current) ? 'pending' : a.lifecycle
        return state('source_text', { id: a.source_id, version: String(a.version) }, lifecycle, a.content_sha256)
      }),
    )
  }
  return { issuance_date: g.issuance_date, authorities, examination_methods: [...(support.examination_methods ?? [])], ...(g.authority_class ? { authority_class: g.authority_class } : {}) }
}
