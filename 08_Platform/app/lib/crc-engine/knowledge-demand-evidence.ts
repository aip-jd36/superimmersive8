/**
 * Durable Material Demand evidence persistence (LK-DEMAND-2C, 2026-09-18).
 * Writes to crc_knowledge_demand_occurrences -- same "engine must remain
 * entirely unaware it exists" posture as turn-traces.ts/pilot-events.ts:
 * this is downstream evidence capture, never engine state, and is not
 * consumed by runTurn(), StructuredUnderstanding, Retrieval, BI,
 * Composition, or Projection.
 *
 * CORE INVARIANT (mirrors KnowledgeDemandOccurrence's own header,
 * types/interview-engine.ts): persists EVIDENCE, never a coverage
 * conclusion. Writes exactly the fields the runtime already computed --
 * no coverage/subject/onboarding column exists to populate, and this
 * module reads no GovernedSubject/KnowledgeTopic state at all.
 *
 * recordKnowledgeDemandEvidence() never throws to its caller -- same
 * fail-open, best-effort discipline as recordCrcCompletionTrace()/
 * logPilotEvent()/logAnalyticsEvent(): a transient failure to persist
 * evidence must never become a new failure mode for the turn it describes,
 * and must never change the CRC conclusion or the user-visible response.
 * Callers are responsible for calling this ONLY after the turn's own
 * authoritative session state has already been saved successfully (see
 * app/api/crc/turn/route.ts's own call site, placed alongside
 * recordCrcCompletionTrace()/logAnalyticsEvent(), after
 * saveCrcSessionProductState() has already succeeded).
 *
 * Idempotent by construction: writes via upsert with
 * onConflict: 'session_id,occurrence_id', ignoreDuplicates: true, matching
 * the crc_knowledge_demand_occurrences_session_occurrence_unique
 * constraint (migration 20260918010000). A retried request that re-runs
 * the same turn's extraction and reproduces the same candidate slot is
 * silently, safely skipped for that row -- never an error, never a
 * duplicate, and a batch with a mix of new and already-written rows still
 * persists the new ones (ignoreDuplicates skips per-row, not per-batch).
 *
 * LK-DEMAND-2C-R2 (2026-09-18): `occurrences` may now legitimately contain
 * two entries with the IDENTICAL occurrence_id in a single call -- exact
 * duplicate material_demand_mention candidates within one turn now
 * converge on the same durable identity BY CONSTRUCTION (extraction.ts's
 * own computeMaterialDemandOccurrenceId, no ordinal), rather than being
 * pre-filtered upstream. `dedupeByOccurrenceId` below collapses those to
 * one row (first occurrence wins, mirroring ON CONFLICT DO NOTHING's own
 * "first insert wins" behavior) BEFORE the write -- this is NOT a
 * read-before-write check (no query happens; it is a pure, local transform
 * of the rows already computed this call) and does not weaken
 * ignoreDuplicates, which still independently covers duplicates against
 * rows from an EARLIER, already-committed write (a genuine retry). It
 * exists purely so this module's own single-row-per-durable-observation
 * guarantee does not depend on an unverified assumption about how the
 * Supabase/PostgREST upsert path resolves multiple conflicting rows
 * within one batch -- a real operational question this environment has no
 * live database to empirically confirm.
 *
 * LK-DEMAND-2E (2026-09-18): RETURN CONTRACT. `recordKnowledgeDemandEvidence`
 * now returns the durable rows ACTUALLY NEWLY INSERTED by this call --
 * previously it returned nothing at all (Promise<void>), discarding this
 * information entirely. Adds a trailing `.select(...)` to the existing
 * upsert call; Postgres's own `INSERT ... ON CONFLICT DO NOTHING
 * RETURNING ...` semantics (which `ignoreDuplicates: true` maps to) return
 * ONLY the rows actually inserted this statement -- a row skipped because
 * it already existed (a genuine retry reproducing the same deterministic
 * occurrence_id, LK-DEMAND-2C-R1/R2's own guarantee) is silently absent
 * from the result, never included. This is a query-SHAPE change only --
 * zero schema change, and the existing idempotency/fail-open/dedup
 * discipline above is entirely unchanged.
 *
 * This return value means "newly persisted by THIS call," never "all
 * matching evidence currently in the database" -- callers (see
 * app/api/crc/turn/route.ts's own call site) use it strictly as a
 * notification-eligibility signal, never as a general evidence query.
 * Still never throws: on any failure (including the empty-input no-op)
 * this resolves to `[]`, exactly the same "nothing to notify about" shape
 * a genuine all-duplicate retry produces -- callers cannot and must not
 * distinguish "evidence failed to persist" from "everything in this batch
 * already existed" from this return value alone; both correctly result in
 * no further downstream action.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { KnowledgeDemandOccurrence } from '@/types/interview-engine'
import { getRuntimeCommit } from './runtime-metadata'

export const KNOWLEDGE_DEMAND_EVIDENCE_SCHEMA_VERSION = 1

export interface RecordKnowledgeDemandEvidenceParams {
  sessionId: string
  occurrences: readonly KnowledgeDemandOccurrence[]
}

/**
 * The minimum durable fields a caller needs to act on a newly-inserted
 * Material Demand evidence row (LK-DEMAND-2E's own notification trigger is
 * the only current consumer). Deliberately a narrow subset of the full
 * crc_knowledge_demand_occurrences row -- goal_id/qualification_state/
 * superseded_by/runtime_commit/schema_version are persisted but not
 * returned here, since nothing downstream of this return value needs them
 * yet; widen only when a real caller needs a specific additional field.
 */
export interface NewlyInsertedMaterialDemandEvidenceRow {
  id: string
  session_id: string
  occurrence_id: string
  source_turn: number
  raw_text: string
  source_statement: string
  created_at: string
}

/**
 * Collapses rows sharing the same occurrence_id to the first one seen --
 * see this module's own header (LK-DEMAND-2C-R2) for why this exists.
 * Pure, local, no DB read.
 */
function dedupeByOccurrenceId<T extends { occurrence_id: string }>(rows: readonly T[]): T[] {
  const seen = new Set<string>()
  const deduped: T[] = []
  for (const row of rows) {
    if (seen.has(row.occurrence_id)) continue
    seen.add(row.occurrence_id)
    deduped.push(row)
  }
  return deduped
}

/**
 * Writes one crc_knowledge_demand_occurrences row per DISTINCT
 * occurrence_id in `occurrences`. A no-op (zero DB calls, returns `[]`)
 * when `occurrences` is empty -- the ordinary case for most turns, which
 * express no material demand at all.
 *
 * Returns the rows ACTUALLY NEWLY INSERTED by this call -- see this
 * module's own header (LK-DEMAND-2E) for the full return contract. Never
 * throws; any failure resolves to `[]`, identical in shape to a genuine
 * all-duplicate no-op.
 */
export async function recordKnowledgeDemandEvidence(
  client: SupabaseClient,
  params: RecordKnowledgeDemandEvidenceParams,
): Promise<NewlyInsertedMaterialDemandEvidenceRow[]> {
  if (params.occurrences.length === 0) return []

  try {
    const rows = dedupeByOccurrenceId(
      params.occurrences.map((occurrence) => ({
        session_id: params.sessionId,
        occurrence_id: occurrence.occurrence_id,
        goal_id: occurrence.goal_id,
        source_turn: occurrence.source_turn,
        raw_text: occurrence.raw_text,
        source_statement: occurrence.source_statement,
        qualification_state: occurrence.qualification_state,
        superseded_by: occurrence.superseded_by,
        runtime_commit: getRuntimeCommit(),
        schema_version: KNOWLEDGE_DEMAND_EVIDENCE_SCHEMA_VERSION,
      })),
    )
    const { data, error } = await client
      .from('crc_knowledge_demand_occurrences')
      .upsert(rows, { onConflict: 'session_id,occurrence_id', ignoreDuplicates: true })
      .select('id, session_id, occurrence_id, source_turn, raw_text, source_statement, created_at')
    if (error) {
      console.error('[recordKnowledgeDemandEvidence] insert error', error)
      return []
    }
    return (data ?? []) as NewlyInsertedMaterialDemandEvidenceRow[]
  } catch (err) {
    console.error('[recordKnowledgeDemandEvidence] unexpected failure', err)
    return []
  }
}
