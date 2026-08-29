/**
 * Candidate Provenance Reference Primitive (LK-17, 2026-08-30).
 *
 * Answers exactly one question: given a repository-relative candidate path
 * and a git commit identity, can they be structured into a valid, minimal
 * pointer to "this exact candidate artifact at this immutable repository
 * revision"?
 *
 * ── WHAT THIS PROVES ────────────────────────────────────────────────────────
 * Which artifact, at which repository revision. Because git commit identity
 * is content-addressed and immutable (a given commit hash's content can
 * never silently change), a valid reference is a durable, inspectable
 * pointer -- the referenced content is exactly what it was when the
 * reference was constructed, forever.
 *
 * ── WHAT THIS DOES NOT PROVE (LK-16 SS 15/SS W, restated precisely) ────────
 * It does NOT prove: that representation readiness passed for the referenced
 * candidate (readiness is a separate, unrelated check -- see SS "READINESS
 * SEPARATION" below); that FGR approved it; that Adoption occurred; that
 * GOVERNED-CLAIMS.md faithfully transcribed it; semantic/proposition
 * equality of any kind; CRC publication; Commercial Assurance; or
 * commercial clearance of any kind. This module knows nothing about any of
 * those concepts and must never be extended to.
 *
 * ── READINESS SEPARATION (LK-17 SS 7) ───────────────────────────────────────
 * This module does not import, call, or know about
 * checkTopicClaimRepresentationReadiness() (lib/representation-readiness/),
 * and that module does not import this one. The intended composition is
 * conceptual only, performed by a future caller: check readiness on a
 * candidate TopicClaim; separately, if ready, construct a provenance
 * reference for the exact artifact containing that representation.
 * Provenance construction never decides readiness; readiness never creates
 * provenance.
 *
 * ── GOVERNANCE REFERENCE CONVENTION (LK-17 SS 9) ────────────────────────────
 * The smallest proposed human-readable form a future GOVERNED-CLAIMS.md
 * entry could use to point at a candidate's provenance -- mirroring this
 * repository's own existing FGR/CPR/DAR cross-reference convention
 * ("Full Formal Governance Review artifact: ..."):
 *
 *     Candidate Representation: <repository-relative-path> @ <commit>
 *
 * See formatCandidateProvenanceReference() below, which renders exactly
 * this line from a valid CandidateProvenanceReference. This module does
 * NOT parse GOVERNED-CLAIMS.md, does not write to it, and this milestone
 * does not add this line to any real file -- see LK-17's own Hard
 * Boundaries. This is documentation of a proposed convention only.
 *
 * ── SCOPE (LK-17 SS 4, SS 13) ───────────────────────────────────────────────
 * Deliberately minimal: two fields only (candidate_path, commit) -- no
 * domain, provider, Topic, FGR decision, Adoption decision, CRC status, or
 * legal/commercial metadata. No generic provenance framework, no universal
 * artifact registry, no new proposition schema. This module has, and must
 * retain, zero knowledge of GOVERNED-CLAIMS parsing, FGR/Adoption/CPR/DAR
 * semantics, fixtures, retrieval, Bounded Interpretation, Projection,
 * Composition, or Commercial Assurance.
 */

export interface CandidateProvenanceReference {
  candidate_path: string
  commit: string
}

export type CandidateProvenanceIssueCode = 'invalid_candidate_path' | 'invalid_commit'

/** Technical/provenance failure only -- never a governance, Adoption, CRC, or legal conclusion. See this module's own header. */
export interface CandidateProvenanceIssue {
  code: CandidateProvenanceIssueCode
  path: string
  value?: string
}

/** `valid` is `true` iff `issues` is empty and `reference` is non-null -- never independently settable. */
export interface CandidateProvenanceResult {
  valid: boolean
  issues: CandidateProvenanceIssue[]
  reference: CandidateProvenanceReference | null
}

/**
 * Rejects absolute paths of any kind (POSIX `/...`, Windows drive-letter
 * `C:\...` or `C:/...`, UNC `\\...`) and empty strings -- LK-17 SS 5's own
 * explicit reject list. Deliberately does NOT normalize (e.g. silently
 * convert backslashes to forward slashes): a non-canonical path is
 * rejected, never silently rewritten, matching this codebase's established
 * fail-closed, never-guess discipline. A bare backslash anywhere in the
 * path is rejected outright, since a canonical git repository-relative path
 * is always forward-slash-delimited (confirmed throughout this repository's
 * own git usage) -- backslash presence indicates either a Windows absolute
 * path or a non-canonical form, and this function does not attempt to
 * distinguish the two.
 */
function isRepositoryRelativePath(candidatePath: string): boolean {
  if (candidatePath.length === 0) return false
  if (candidatePath.startsWith('/')) return false
  if (candidatePath.startsWith('\\')) return false
  if (/^[A-Za-z]:[\\/]/.test(candidatePath)) return false
  if (candidatePath.includes('\\')) return false
  return true
}

/**
 * Constructs a CandidateProvenanceReference, or returns structured issues
 * instead of throwing -- ordinary invalid input is never an exception, per
 * this codebase's established convention (checkTopicClaimRepresentationReadiness's
 * own identical discipline). Never mutates its inputs (plain strings).
 *
 * Commit-format validation: only non-emptiness is checked. No existing
 * repository convention establishes a stricter commit-identity format
 * requirement anywhere in this codebase (confirmed: git hashes are used as
 * opaque strings throughout, never regex-validated) -- inventing a stricter
 * check here would be exactly the "unnecessarily strict regex merely for
 * testing" LK-17 SS 12 warns against, not a real requirement.
 */
export function buildCandidateProvenanceReference(candidatePath: string, commit: string): CandidateProvenanceResult {
  const issues: CandidateProvenanceIssue[] = []

  if (!isRepositoryRelativePath(candidatePath)) {
    issues.push({ code: 'invalid_candidate_path', path: 'candidate_path', value: candidatePath })
  }

  if (commit.length === 0) {
    issues.push({ code: 'invalid_commit', path: 'commit', value: commit })
  }

  if (issues.length > 0) {
    return { valid: false, issues, reference: null }
  }

  return { valid: true, issues: [], reference: { candidate_path: candidatePath, commit } }
}

/**
 * Renders the proposed human-readable governance reference convention
 * (this module's own header, LK-17 SS 9) from an already-valid reference.
 * Pure string formatting only -- never reads or writes any file.
 */
export function formatCandidateProvenanceReference(reference: CandidateProvenanceReference): string {
  return `Candidate Representation: ${reference.candidate_path} @ ${reference.commit}`
}
