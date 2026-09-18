/**
 * Material Demand admin-notification gating (LK-DEMAND-2E, 2026-09-18).
 * The single, small orchestration seam between durable evidence
 * persistence (knowledge-demand-evidence.ts) and email composition/send
 * (lib/emails.ts) -- extracted here, rather than left inline in
 * app/api/crc/turn/route.ts, purely so the gating logic itself (notify iff
 * one or more rows were PROVEN newly inserted this call) is directly
 * testable without a whole-route integration test. This module composes
 * nothing and persists nothing of its own -- it sequences two already
 * independently-tested calls and contains no email HTML, no DB writes, no
 * governance logic.
 *
 * Deliberately NOT merged into knowledge-demand-evidence.ts (whose own
 * header scopes it to persistence only, "never engine state") and NOT
 * merged into lib/emails.ts (composition/send only) -- keeping this seam
 * as its own tiny file is what lets both of those stay single-purpose.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { KnowledgeDemandOccurrence } from '@/types/interview-engine'
import { recordKnowledgeDemandEvidence } from './knowledge-demand-evidence'
import { sendMaterialDemandAdminNotification } from '@/lib/emails'

export interface RecordAndNotifyMaterialDemandEvidenceParams {
  sessionId: string
  occurrences: readonly KnowledgeDemandOccurrence[]
}

/**
 * Persists this turn's Material Demand evidence, then attempts one
 * best-effort admin notification IFF one or more rows were newly inserted
 * by this call -- never for rows already existing (a genuine retry),
 * never when the batch was empty or persistence failed. Never throws:
 * recordKnowledgeDemandEvidence already resolves to [] fail-open, and the
 * notification attempt is additionally wrapped here as a redundant safety
 * net -- sendMaterialDemandAdminNotification already never rejects in its
 * own real implementation (its own test suite proves this), but this
 * catch exists so that guarantee is never load-bearing for CRC's own
 * correctness: even a future bug in that function's own error handling
 * could never surface here as a thrown exception into route.ts.
 */
export async function recordAndNotifyMaterialDemandEvidence(client: SupabaseClient, params: RecordAndNotifyMaterialDemandEvidenceParams): Promise<void> {
  const newlyInserted = await recordKnowledgeDemandEvidence(client, params)
  if (newlyInserted.length === 0) return
  try {
    await sendMaterialDemandAdminNotification(newlyInserted)
  } catch (err) {
    console.error('[recordAndNotifyMaterialDemandEvidence] notification attempt failed', err)
  }
}
