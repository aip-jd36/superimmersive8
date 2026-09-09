/**
 * Reviewer Living Knowledge panel (CAH-4E §14).
 *
 * A read-only SERVER component rendered as a SIBLING of `<WorkbookClient>` and
 * `<ReviewerCrcContextPanel>` on the review page — never a workbook field or
 * section, structurally incapable of sharing client state with the workbook.
 *
 * This surface is DELIBERATELY SEPARATE from the CRC context panel. The two
 * are different authorities:
 *   - CRC Context      → customer-provided, unverified context (CAH-4B/4C)
 *   - Living Knowledge → governed SI8 institutional knowledge for research (this)
 *   - Assessment       → independent Human Reviewer judgment (WorkbookClient)
 *
 * No proactive lookup on page load. The reviewer picks a topic and clicks.
 * No editable control that touches assessment state. No "copy to evidence".
 */

import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { GOAL_CATEGORIES } from '@/types/interview-engine'
import { REVIEWER_LK_FRAMING } from '@/lib/reviewer-lk/project-reviewer-claims'
import { ReviewerLkLookup } from './ReviewerLkLookup'

const REVIEWER_TOPICS = GOAL_CATEGORIES.filter((c) => c !== 'unknown')

export async function ReviewerLkPanel({ submissionId }: { submissionId: string }) {
  const access = await checkReviewerContextAccess()
  if (!access.ok) return null

  return (
    <div className="max-w-2xl mx-auto px-8 pt-6">
      <details className="rounded-lg border" style={{ borderColor: '#e0ddd2', backgroundColor: '#f7f5ef' }}>
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium" style={{ color: '#1c1c1e' }}>
          {REVIEWER_LK_FRAMING.heading}
          <span className="block mt-0.5 text-xs font-normal" style={{ color: '#83837e' }}>
            {REVIEWER_LK_FRAMING.body}
          </span>
        </summary>
        <div className="px-4 pb-4 pt-1">
          <ReviewerLkLookup submissionId={submissionId} topics={REVIEWER_TOPICS} />
        </div>
      </details>
    </div>
  )
}
