/**
 * CR-V2-1C — what a prepared record relied on, and the content digest of each.
 *
 * The question registry, observation map, publication ledger and governed
 * claims are versioned by LABEL only (an integer version, or a claim's
 * `last_verified` date). None of those source contracts guarantees that an
 * entry's content stays the same under its version. So a version label is
 * never taken as proof of content: at preparation the record stores the
 * SHA-256 of each referenced entry's CONTENT, and at issuance the current
 * entry must have the same digest under the same version.
 *
 * Content excludes only the fields that are lifecycle or validity state, which
 * legitimately change without a new version and are checked separately:
 *   - question / observation-map entry: `approval` (pending, approved, retired);
 *   - publication-ledger entry: `superseded_by`, `creator_record_eligible`
 *     (withdrawal), `refresh_by` (validity);
 *   - governed claim: `superseded_by`.
 * The wording set is already content-addressed (CR-V2-1A); record schema and
 * builder are code identities with no content.
 *
 * This is the one place that knows each source format. The eligibility core
 * (`./eligibility`) is generic.
 */

import type { ClaimDescriptor, PublicationLedgerEntry } from '../contract/publication-ledger'
import type { ObservationMapEntry, QuestionEntry } from '../contract/question-registry'
import type { BuildDraftInput } from '../prototype/build-draft'
import { canonicalJson, sha256Hex } from '../record-core/canonical'

export const AUTHORITY_KINDS = ['source_text', 'question', 'observation_map_entry', 'publication_entry', 'governed_claim', 'record_schema', 'builder'] as const
export type AuthorityKind = (typeof AUTHORITY_KINDS)[number]

/** Kinds whose content is digested into the record. */
export const DIGESTED_KINDS = ['question', 'observation_map_entry', 'publication_entry', 'governed_claim'] as const satisfies readonly AuthorityKind[]
export type DigestedKind = (typeof DIGESTED_KINDS)[number]

type GovernedClaim = BuildDraftInput['topicClaims'][number] & ClaimDescriptor

/** Plain data only (drops `undefined`), then canonical JSON and SHA-256. */
const digestOf = (value: unknown): string => sha256Hex(canonicalJson(JSON.parse(JSON.stringify(value))))

const without = <T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> => {
  const out = { ...value }
  for (const k of keys) delete out[k]
  return out
}

export const questionContentDigest = (q: QuestionEntry): string => digestOf(without(q, ['approval']))
export const observationMapContentDigest = (o: ObservationMapEntry): string => digestOf(without(o, ['approval']))
export const publicationContentDigest = (e: PublicationLedgerEntry): string => digestOf(without(e, ['superseded_by', 'creator_record_eligible', 'refresh_by']))
export const claimContentDigest = (c: GovernedClaim): string => digestOf(without(c, ['superseded_by']))

/** The identity under which each kind is versioned, as strings. */
export const questionRef = (q: Pick<QuestionEntry, 'q_id' | 'version'>) => ({ id: q.q_id, version: String(q.version) })
export const observationMapRef = (o: Pick<ObservationMapEntry, 'o_id' | 'version'>) => ({ id: o.o_id, version: String(o.version) })
export const publicationRef = (e: Pick<PublicationLedgerEntry, 'entry_id' | 'version'>) => ({ id: e.entry_id, version: String(e.version) })
export const claimRef = (c: { claim_id: string; last_verified: string | null }) => ({ id: c.claim_id, version: String(c.last_verified) })
