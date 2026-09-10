/**
 * Reviewer Living Knowledge authority framing (CAH-4E §9).
 *
 * NOTE (CAH-4G.7): the `projectReviewerLkResult` projection helper and the
 * `ReviewerLkLookupResult` response type were retired together with the legacy
 * `GET /api/admin/submissions/[id]/reviewer-lk?topic=` route — the converged
 * HRR path (`POST .../reviewer-lk/research` → `HrrResearchAnswer`) replaced both.
 * This module now carries only the fixed reviewer-facing framing constant,
 * which `ReviewerLkPanel` still renders above the research surface.
 *
 * Fixed, generic, not domain-specific. It states: governed institutional
 * knowledge · for the reviewer's research · not an assessment conclusion ·
 * completes no Commercial Assurance control · applicability is informational,
 * not reviewer judgment.
 */

export const REVIEWER_LK_FRAMING = {
  heading: 'Governed SI8 Living Knowledge — reviewer research',
  body:
    'This is governed SI8 institutional knowledge, provided for the reviewer’s research. ' +
    'It is not an assessment conclusion and completes no Commercial Assurance control. ' +
    'Applicability information is informational and does not substitute for reviewer judgment.',
  applicability_note:
    'Applicability is evaluated deterministically against the submission’s own facts. ' +
    '“Not established” means a required fact is unresolved or does not match — it is not a negative finding.',
} as const
