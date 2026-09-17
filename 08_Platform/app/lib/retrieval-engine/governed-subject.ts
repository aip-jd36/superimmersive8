/**
 * Structural validation/integrity helpers for the Governed Subject
 * foundation (LK-DEMAND-2B2, 2026-09-17; corrected by LK-DEMAND-2B2-R1,
 * same date -- see `GOVERNED_SUBJECT_TYPES`'s own header, types.ts, for
 * exactly what was corrected and why). See `GovernedSubject`'s own
 * header (types.ts) for the full architecture rationale.
 *
 * STANDALONE AND UNWIRED, DELIBERATELY: neither function here is called
 * from any existing claim-loading, fixture-consistency, or Retrieval path
 * in this milestone. This is a pure, ready-to-use helper layer that can
 * become authoritative (e.g. wired into a future fixture-consistency test,
 * the same way `topic-claims-fixture-consistency.test.ts` guards
 * TOPIC_CLAIMS_FIXTURE today) once real `GovernedSubject` records and
 * real `TopicClaim.subject_ids` associations exist -- introducing that
 * wiring now, against an empty registry, would have nothing real to
 * validate and risks changing existing claim-loading behavior for no
 * benefit, which this milestone explicitly does not do.
 *
 * No LLM call, no fuzzy matching -- plain, deterministic structural checks
 * only, mirroring this codebase's own established "return a list of
 * violation strings, empty means valid" pattern already used elsewhere for
 * structural governance checks (e.g. `validateApplicabilityAnyOf`,
 * lookup-topic-claims.ts).
 */

import type { TopicClaim } from './types'
import { GOVERNED_SUBJECT_TYPES } from './types'

/**
 * The shape a `validateGovernedSubjects` caller actually has in hand --
 * deliberately NOT `GovernedSubject` itself (types.ts). With
 * `GOVERNED_SUBJECT_TYPES` empty today, `GovernedSubject.subject_type` is
 * `never` (see that type's own header), making a real `GovernedSubject`
 * object impossible to construct in production code by design -- exactly
 * the intended "governed subjects = ZERO" state, enforced by the compiler.
 * A structural validator, however, exists precisely to check UNTRUSTED/
 * not-yet-proven data (the realistic shape something read from a future
 * source would have BEFORE validation narrows it) -- so it must accept a
 * more permissive candidate shape with a plain `string` `subject_type`,
 * mirroring this codebase's own established `ParsedCandidate` (wire/
 * untrusted) -> `CandidateObservation` -> attested-state staging pattern
 * elsewhere (extraction.ts). A value that actually satisfies `GovernedSubject`
 * always satisfies `GovernedSubjectCandidate` too (`never` is assignable to
 * `string`), so this is a strict widening, never a parallel/competing type.
 */
export interface GovernedSubjectCandidate {
  subject_id: string
  subject_type: string
  canonical_name: string
  superseded_by: string | null
}

/**
 * Validates a collection of governed-subject candidates for internal
 * structural integrity. Does NOT validate `TopicClaim.subject_ids`
 * references against this collection (see `validateTopicClaimSubjectIds`
 * below for that, and its own header for why cross-referential validation
 * is deliberately out of scope for this milestone).
 *
 * `governedTypes` defaults to the real, production `GOVERNED_SUBJECT_TYPES`
 * (empty today -- see that constant's own header) but is an explicit,
 * injectable parameter specifically so tests can exercise "does a governed
 * type pass / does an ungoverned type fail" validation logic against a
 * TEST-LOCAL governed-type list, without ever adding a synthetic type to
 * the production constant (LK-DEMAND-2B2-R1's own corrective requirement:
 * "a synthetic test fixture must not dictate production ontology"). Real,
 * production callers never pass this parameter and always get the true,
 * currently-empty governed set.
 *
 * Checks:
 *   - `subject_id` non-empty (after trim);
 *   - `canonical_name` non-empty (after trim);
 *   - `subject_type` is a member of `governedTypes` (a real runtime check,
 *     not merely relying on TypeScript's static narrowing -- this
 *     codebase's own established discipline for JSONB/deserialized
 *     governed data, mirroring e.g. `CrcEligible`/`Lifecycle` runtime
 *     re-validation elsewhere). With the real, empty production set, EVERY
 *     candidate's `subject_type` fails this check -- the correct, fully
 *     closed-world behavior until governance adds a member.
 *   - no two ACTIVE (`superseded_by === null`) entries share the same
 *     `subject_id` (a superseded entry may legitimately share an id lineage
 *     with its own replacement, mirroring `UserGoal`/`TopicClaim`'s own
 *     supersede-and-mark discipline -- only ACTIVE duplication is invalid);
 *   - a non-null `superseded_by` must reference a `subject_id` that
 *     actually exists elsewhere in the SAME collection (supersession
 *     target validity, mirroring the same discipline `mutations.ts`'s
 *     `supersedeUserGoal`/`supersedeToolMention` enforce at write time for
 *     runtime structured facts).
 */
export function validateGovernedSubjects(subjects: readonly GovernedSubjectCandidate[], governedTypes: readonly string[] = GOVERNED_SUBJECT_TYPES): string[] {
  const violations: string[] = []
  const knownIds = new Set(subjects.map((s) => s.subject_id))
  const activeIdCounts = new Map<string, number>()

  for (const subject of subjects) {
    if (subject.subject_id.trim() === '') {
      violations.push('GovernedSubject has an empty subject_id')
    }
    if (subject.canonical_name.trim() === '') {
      violations.push(`GovernedSubject "${subject.subject_id}" has an empty canonical_name`)
    }
    if (!governedTypes.includes(subject.subject_type)) {
      violations.push(`GovernedSubject "${subject.subject_id}" has an ungoverned subject_type: "${subject.subject_type}"`)
    }
    if (subject.superseded_by !== null && !knownIds.has(subject.superseded_by)) {
      violations.push(`GovernedSubject "${subject.subject_id}" is superseded_by an unknown subject_id: "${subject.superseded_by}"`)
    }
    if (subject.superseded_by === null) {
      activeIdCounts.set(subject.subject_id, (activeIdCounts.get(subject.subject_id) ?? 0) + 1)
    }
  }

  for (const [id, count] of activeIdCounts) {
    if (count > 1) violations.push(`GovernedSubject id "${id}" has more than one ACTIVE (non-superseded) entry`)
  }

  return violations
}

/**
 * Validates ONE `TopicClaim`'s own `subject_ids` field in isolation --
 * never against a `GovernedSubject` collection (see this module's own
 * header for why that referential check is deliberately deferred). Checks
 * only:
 *   - no empty-string entries;
 *   - no duplicate entries within the SAME claim's own array.
 *
 * A claim with `subject_ids` absent/undefined is always valid -- absence
 * carries no governance meaning in either direction (see
 * `TopicClaim.subject_ids`'s own doc comment, types.ts).
 */
export function validateTopicClaimSubjectIds(claim: Pick<TopicClaim, 'subject_ids'>): string[] {
  if (!claim.subject_ids) return []
  const violations: string[] = []
  const seen = new Set<string>()
  for (const id of claim.subject_ids) {
    if (id.trim() === '') {
      violations.push('TopicClaim.subject_ids contains an empty subject_id')
      continue
    }
    if (seen.has(id)) violations.push(`TopicClaim.subject_ids contains a duplicate subject_id: "${id}"`)
    seen.add(id)
  }
  return violations
}
