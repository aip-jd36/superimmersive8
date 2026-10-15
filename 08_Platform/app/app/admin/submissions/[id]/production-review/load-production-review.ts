/**
 * Server-side loader for the INTERNAL Product A preview (CAA-PRODUCT-A-2).
 *
 * Authorization FIRST: `requireAdmin()` redirects any non-admin before a single
 * row is read. Read-only: one SELECT of the submission columns Product A
 * consumes. No writes, no model calls, no audit/assessment/workbook access.
 */

import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { runProductionReview } from '@/lib/production-review/run-production-review'
import { projectProductionReview, type ProductionReviewPreview } from '@/lib/production-review/project-production-review'

export const PRODUCTION_REVIEW_SUBMISSION_COLUMNS =
  'id, title, tier, tools_used, territory_preferences, third_party_assets, audio_disclosure'

export interface ProductionReviewPageData {
  submission: { id: string; title: string | null; tier: string | null }
  preview: ProductionReviewPreview
}

export async function loadProductionReviewPreview(submissionId: string): Promise<ProductionReviewPageData | null> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select(PRODUCTION_REVIEW_SUBMISSION_COLUMNS)
    .eq('id', submissionId)
    .single()

  if (error || !data) return null

  const row = data as Record<string, unknown>
  const result = runProductionReview(
    {
      tools_used: row.tools_used,
      territory_preferences: row.territory_preferences,
      third_party_assets: row.third_party_assets,
      audio_disclosure: row.audio_disclosure,
    },
    TOPIC_CLAIMS_FIXTURE,
  )

  return {
    submission: {
      id: String(row.id),
      title: typeof row.title === 'string' ? row.title : null,
      tier: typeof row.tier === 'string' ? row.tier : null,
    },
    preview: projectProductionReview(result),
  }
}
