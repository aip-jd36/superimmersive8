/**
 * Reviewer observation reconciliation registry (CAH-4I.4E).
 *
 * Enforces, structurally only, that a Human Reviewer has explicitly
 * accounted for every non-clean Section-2 audiovisual observation before
 * signoff -- never that the accounting is correct, persuasive, or reaches
 * any particular conclusion. Full governance/design record:
 * 08_Platform/implementation/COMMERCIAL_ASSURANCE_FACT_DEMAND_ARCHITECTURE.md
 * §25-28 (CAH-4I.4 - 4I.4C).
 *
 * Pure. No I/O, no database, no mutation. Mirrors signoff.ts's own
 * discipline (workbook: unknown, duck-typed access) so this module never
 * depends on the route-owned WorkbookData type.
 *
 * HARD INVARIANT: every check here inspects only (a) whether a Section-2
 * observation field is in a "non-clean" state and (b) whether a specific,
 * already-existing reviewer-authored field is a non-empty string. Nothing
 * here reads a `judgment` value, inspects text content beyond trimmed
 * non-emptiness, or can influence what conclusion a control reaches. See
 * findUnreconciledObservations's own tests for the authority-firewall
 * proof.
 *
 * Vocabularies are NOT uniform across observation fields (CAH-4I.4C's own
 * corrected finding) -- logos_observed/trademarks_observed/
 * copyrighted_artwork/landmarks_observed share the `PRESENCE` enum's clean
 * sentinel ('None observed'); real_likeness_suspected has its own,
 * separately-typed enum whose clean sentinel is 'None identified'; and
 * music_heard has a four-value enum where 'Generic / royalty-free' is ALSO
 * a clean state, not just 'None' -- never assume one universal clean-state
 * check across all fields.
 *
 * Scope decision, recorded rather than silently omitted: real_likeness_suspected
 * maps only to L01 (`likeness_found` or `notes`), not additionally to L02.
 * L02's own accounting field (`performers_present`) is a boolean whose
 * default (`false`) is structurally indistinguishable from "the reviewer
 * explicitly recorded no performers present" -- enforcing it as a required
 * gate would require inventing a new touched/untouched tri-state, which
 * this design deliberately does not do (no new reviewer-entered state).
 * L01's own fields are plain strings with a clean empty/non-empty
 * distinction and are used as the sole required target.
 *
 * unexpected_content and landmarks_observed have no linked control (a
 * genuine architecture finding, not an oversight) and are routed to the
 * existing Section-5 Findings Log instead -- requiring at least one
 * finding with both a non-empty `domain` and non-empty `finding` text,
 * which is one step stronger than signoff.ts's own pre-existing
 * "at least one non-empty finding anywhere" check.
 */

export interface ReconciliationIssue {
  /** Human-readable, conclusion-free description of what remains unaccounted for. */
  message: string
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** Fields sharing the `PRESENCE`-style shape, each with its own real clean sentinel. */
const PRESENCE_STYLE_CLEAN_SENTINEL: Record<string, string> = {
  logos_observed: 'None observed',
  trademarks_observed: 'None observed',
  copyrighted_artwork: 'None observed',
  landmarks_observed: 'None observed',
  real_likeness_suspected: 'None identified',
}

function isPresenceStyleTriggered(value: unknown, field: keyof typeof PRESENCE_STYLE_CLEAN_SENTINEL): boolean {
  return typeof value === 'string' && value !== '' && value !== PRESENCE_STYLE_CLEAN_SENTINEL[field]
}

/** music_heard's own four-value vocabulary -- 'Generic / royalty-free' is a clean state too, not just 'None'. */
function isMusicTriggered(value: unknown): boolean {
  return value === 'Identifiable track' || value === 'Possibly identifiable'
}

/** Section 5's Findings Log, used as the fallback reconciliation surface for observations with no linked control. */
function hasQualifyingFinding(section5: unknown): boolean {
  const findings = Array.isArray((section5 as any)?.findings) ? (section5 as any).findings : []
  return findings.some((f: any) => isNonEmptyString(f?.finding) && isNonEmptyString(f?.domain))
}

/**
 * Evaluate every governed observation -> reconciliation requirement against
 * the CURRENT workbook state (not historical -- a corrected, now-clean
 * observation is not flagged; a newly-triggered one is). Returns one issue
 * per unmet requirement. A single accounting field shared by more than one
 * observation (I03's `trademark_elements`, shared by logos_observed and
 * trademarks_observed) produces at most one issue even if both trigger.
 */
export function findUnreconciledObservations(workbook: unknown): ReconciliationIssue[] {
  const wb = (workbook ?? {}) as any
  const s2 = wb.section_2 ?? {}
  const s3 = wb.section_3 ?? {}
  const s5 = wb.section_5 ?? {}

  const issues: ReconciliationIssue[] = []

  // logos_observed + trademarks_observed -> I03.trademark_elements (shared target)
  const logoOrTrademarkTriggered =
    isPresenceStyleTriggered(s2.logos_observed, 'logos_observed') ||
    isPresenceStyleTriggered(s2.trademarks_observed, 'trademarks_observed')
  if (logoOrTrademarkTriggered && !isNonEmptyString(s3?.I03?.trademark_elements)) {
    issues.push({
      message: "Account for the observed logo/trademark element in Control I03's notes before signoff.",
    })
  }

  // copyrighted_artwork -> I01.elements_identified
  if (
    isPresenceStyleTriggered(s2.copyrighted_artwork, 'copyrighted_artwork') &&
    !isNonEmptyString(s3?.I01?.elements_identified)
  ) {
    issues.push({
      message: "Account for the observed copyrighted artwork/set design in Control I01's notes before signoff.",
    })
  }

  // real_likeness_suspected -> L01 (likeness_found or notes) -- see header for why L02 is out of scope
  if (
    isPresenceStyleTriggered(s2.real_likeness_suspected, 'real_likeness_suspected') &&
    !isNonEmptyString(s3?.L01?.likeness_found) &&
    !isNonEmptyString(s3?.L01?.notes)
  ) {
    issues.push({
      message: 'Account for the observed likeness resemblance in Control L01 before signoff.',
    })
  }

  // music_heard -> I02 (audio_source or notes)
  if (
    isMusicTriggered(s2.music_heard) &&
    !isNonEmptyString(s3?.I02?.audio_source) &&
    !isNonEmptyString(s3?.I02?.notes)
  ) {
    issues.push({
      message: 'Account for the observed music/audio concern in Control I02 before signoff.',
    })
  }

  // landmarks_observed -> Section 5 fallback (no linked control exists)
  if (isPresenceStyleTriggered(s2.landmarks_observed, 'landmarks_observed') && !hasQualifyingFinding(s5)) {
    issues.push({
      message: 'Account for the observed landmark/location in a Section 5 finding before signoff.',
    })
  }

  // unexpected_content -> Section 5 fallback (no linked control exists)
  if (s2.unexpected_content === true && !hasQualifyingFinding(s5)) {
    issues.push({
      message: 'Account for the unexpected content observation in a Section 5 finding before signoff.',
    })
  }

  return issues
}
