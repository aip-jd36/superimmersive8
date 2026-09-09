/**
 * Reviewer Living Knowledge view (CAH-4E; CAH-4F.1: moved into the inspector's
 * "Living Knowledge" tab — the outer <details> disclosure is gone, the tab IS
 * the disclosure).
 *
 * A read-only SERVER component. Rendered as the `livingKnowledge` slot of
 * `ReviewerResourcesInspector`, which sits in `ReviewerShell`'s inspector
 * region — a peer of, never a child of, `WorkbookClient`. It keeps its own
 * access check, its own data path (`GET /reviewer-lk`), and its own
 * `lk_research` audit, all independent of the CRC context view beside it.
 *
 * This surface is DELIBERATELY SEPARATE from the CRC context view. The two are
 * different authorities:
 *   - CRC Context      → customer-provided, unverified context (CAH-4B/4C)
 *   - Living Knowledge → governed SI8 institutional knowledge for research (this)
 *   - Assessment       → independent Human Reviewer judgment (WorkbookClient)
 *
 * No proactive look-up on inspector open or tab switch. The reviewer picks a
 * topic and clicks. No editable control that touches assessment state. No
 * "copy to evidence".
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
    <div>
      <div
        className="mb-4 rounded-md border px-3 py-2 text-xs"
        style={{ borderColor: '#d9e2ef', backgroundColor: '#eef2f8', color: '#3a4a63' }}
      >
        {REVIEWER_LK_FRAMING.body}
      </div>
      <ReviewerLkLookup submissionId={submissionId} topics={REVIEWER_TOPICS} />
    </div>
  )
}
