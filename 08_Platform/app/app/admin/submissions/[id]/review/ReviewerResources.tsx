/**
 * Reviewer Resources container (CAH-4F, FR-1).
 *
 * A read-only SERVER component rendered as a SIBLING of `<WorkbookClient>` on
 * the review page — never a WorkbookClient field, prop, or child, and (being a
 * server component) structurally incapable of sharing client state with the
 * workbook.
 *
 * It is a thin layout + framing wrapper only. It:
 *   - fetches nothing of its own (each child panel owns its own access check
 *     and data path — CAH-4B for CRC context, CAH-4E for Living Knowledge);
 *   - groups the two secondary reviewer surfaces under one "Reviewer resources"
 *     heading so the product states, in the UI, that these sit BESIDE the
 *     workbook without becoming part of it;
 *   - carries the "Reference only — not assessment evidence" cue.
 *
 * Layout decision (OQ-1, resolved against source at `9fa6d1c`): the milestone's
 * preferred right-side inspector would require threading a server-rendered node
 * as a prop into the `'use client'` `WorkbookClient` (a `flex flex-col h-screen`
 * shell with its own 280px right `<aside>` tab panel) or wrapping that
 * self-scrolling shell in a new outer flex — both are Workbook layout changes
 * the milestone cautions against. This is the smallest safe fallback (PRD §8.3):
 * a grouped, collapsed-by-default, visually-secondary surface above the
 * workbook. It is a single component, so a later move into an inspector is a
 * re-home, not a re-architecture.
 *
 * No editable control. No save. No "copy to evidence" / "apply" / "accept".
 * No finding / outcome / conclusion. Nothing here writes anywhere.
 */

import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { ReviewerCrcContextPanel } from './ReviewerCrcContextPanel'
import { ReviewerLkPanel } from './ReviewerLkPanel'

export async function ReviewerResources({ submissionId }: { submissionId: string }) {
  const access = await checkReviewerContextAccess()
  if (!access.ok) return null

  return (
    <section className="max-w-2xl mx-auto px-8 pt-6" aria-label="Reviewer resources">
      <div className="mb-2">
        <h2 className="text-sm font-semibold" style={{ color: '#1c1c1e' }}>
          Reviewer resources
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: '#83837e' }}>
          Reference only — not assessment evidence. Consulting these does not create evidence, findings, a
          control result, an outcome, or any part of the assessment conclusion. The reviewer records their own
          reasoning in the workbook.
        </p>
      </div>

      {/* CAH-4E — governed SI8 Living Knowledge, reviewer research. Deliberate
          look-up only; nothing fetched on page load. */}
      <ReviewerLkPanel submissionId={submissionId} />

      {/* CAH-4B/4C — customer-provided CRC project context (renders nothing when
          no CRC conversation is linked). A separate authority from Living
          Knowledge; grouped here for placement, not merged. */}
      <ReviewerCrcContextPanel submissionId={submissionId} />
    </section>
  )
}
