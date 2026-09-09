/**
 * ReviewerResources — CAH-4F (container) / CAH-4F.1 (moved into the inspector).
 *
 * A read-only SERVER component. It is the access gate + slot provider for the
 * Reviewer Resources inspector:
 *   - runs the single `checkReviewerContextAccess()` check (defence in depth —
 *     `page.tsx` also checks before choosing to render this at all);
 *   - server-renders the two resource views and hands them to the CLIENT
 *     `ReviewerResourcesInspector` as opaque `React.ReactNode` slots.
 *
 * It fetches no data of its own. Each resource view keeps its own independent
 * access check, data path, and audit:
 *   - `ReviewerLkPanel`         → CAH-4E governed Living Knowledge look-up
 *                                 (`lk_research` audit, on the explicit action only);
 *   - `ReviewerCrcContextPanel` → CAH-4B/4C customer CRC project context
 *                                 (`transcript` audit, on the explicit action only).
 *
 * Grouping the two under one inspector is placement only — it does NOT merge
 * the three authority surfaces (Assessment Workbook / Reviewer Living Knowledge
 * / Linked CRC Context). See `ADR-001`.
 *
 * No editable control. No save. No "copy to evidence" / "apply" / "accept".
 * Nothing here writes anywhere.
 */

import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { ReviewerResourcesInspector } from './ReviewerResourcesInspector'
import { ReviewerCrcContextPanel } from './ReviewerCrcContextPanel'
import { ReviewerLkPanel } from './ReviewerLkPanel'

export async function ReviewerResources({ submissionId }: { submissionId: string }) {
  const access = await checkReviewerContextAccess()
  if (!access.ok) return null

  return (
    <ReviewerResourcesInspector
      livingKnowledge={<ReviewerLkPanel submissionId={submissionId} />}
      linkedCrcContext={<ReviewerCrcContextPanel submissionId={submissionId} />}
    />
  )
}
