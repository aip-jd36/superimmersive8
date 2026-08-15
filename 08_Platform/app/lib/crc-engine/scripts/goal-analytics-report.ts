/**
 * On-demand goal analytics report (CRC Milestone 2, User Goal + Bounded
 * Interpretation, 2026-08-15, PM revision 7).
 *
 *   npx tsx --env-file=.env.local lib/crc-engine/scripts/goal-analytics-report.ts
 *
 * PM explicitly asked, before approving any new event type + migration, to
 * "determine whether this information can cleanly be persisted or derived
 * using existing session/analytics structures" and to "choose the simplest
 * reliable architecture." The answer this script embodies: yes, entirely --
 * no new `crc_analytics_events` event type, no CHECK-constraint migration,
 * no live event stream at all.
 *
 *   - `goal_category` distribution: read directly from
 *     `crc_sessions.structured_understanding.user_goals[].category`. This
 *     field already lives inside the existing, schema-less JSONB column --
 *     see types/interview-engine.ts's UserGoal.category and
 *     serialization.ts's per-goal backfill. No new column, no new table.
 *   - `interpretation_status` distribution: NOT persisted anywhere (Bounded
 *     Interpretation is a computed value, same as ProjectionOutput itself --
 *     never written to the database). Instead, recomputed HERE, on demand,
 *     by re-running buildBoundedInterpretations() against every historical
 *     session's stored user_goals plus a FRESH retrieve() call against
 *     TODAY's MATRIX_FIXTURE. This is deliberately NOT a frozen historical
 *     replay -- it answers "how much of what people have asked for is
 *     covered as of right now," which is the more useful question for
 *     Living Knowledge research prioritization than a stale point-in-time
 *     snapshot would be, and it costs nothing to keep accurate as the
 *     Matrix grows: today's Matrix has zero copyright coverage, so every
 *     historical copyright_ownership/copyrightability goal reports
 *     outside_current_coverage; the day real coverage ships, re-running this
 *     script picks it up automatically with no data migration of past rows.
 *
 * Read-only. Never logs raw goal text (PM invariant #7) -- only the
 * `category`/`scope`/`status` labels and aggregate counts. Mirrors
 * backfill-crc-leads.ts's own script conventions (direct service-role
 * client, no framework, run manually).
 */

import { createClient } from '@supabase/supabase-js'
import { deserializeStructuredUnderstanding } from '@/lib/interview-engine/serialization'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import type { GoalCategory, GoalScope } from '@/types/interview-engine'
import type { InterpretationStatus } from '@/lib/bounded-interpretation/types'

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function tally<T extends string>(counts: Record<string, number>, key: T): void {
  counts[key] = (counts[key] ?? 0) + 1
}

async function main() {
  const { data: sessions, error } = await client.from('crc_sessions').select('id, structured_understanding').not('structured_understanding', 'is', null)

  if (error) {
    console.error('Query failed:', error)
    process.exit(1)
  }
  if (!sessions || sessions.length === 0) {
    console.log('No crc_sessions rows found. Nothing to report.')
    return
  }

  const categoryCounts: Record<GoalCategory, number> = { commercial_use: 0, copyright_ownership: 0, copyrightability: 0, likeness: 0, unknown: 0 }
  const scopeCounts: Record<GoalScope, number> = { informational: 0, determination_request: 0 }
  const statusCounts: Record<InterpretationStatus, number> = { directly_relevant: 0, outside_current_coverage: 0, determination_declined: 0 }
  let sessionsWithGoals = 0
  let totalActiveConfirmedGoals = 0

  for (const row of sessions) {
    const su = deserializeStructuredUnderstanding(JSON.stringify(row.structured_understanding))
    const activeConfirmed = su.user_goals.filter((g) => g.superseded_by === null && g.state === 'confirmed')
    if (activeConfirmed.length === 0) continue

    sessionsWithGoals += 1
    totalActiveConfirmedGoals += activeConfirmed.length
    for (const g of activeConfirmed) {
      tally(categoryCounts, g.category)
      tally(scopeCounts, g.scope)
    }

    // Recompute against TODAY's Matrix -- see module header.
    const handoff = buildRetrievalHandoff(su)
    const { results } = retrieve(handoff, MATRIX_FIXTURE)
    const interpretations = buildBoundedInterpretations(su.user_goals, results)
    for (const interp of interpretations) {
      tally(statusCounts, interp.status)
    }
  }

  console.log(`\nSessions scanned: ${sessions.length}`)
  console.log(`Sessions with >=1 active, confirmed user goal: ${sessionsWithGoals}`)
  console.log(`Total active, confirmed user goals: ${totalActiveConfirmedGoals}\n`)

  console.log('Goal category distribution:')
  for (const [k, v] of Object.entries(categoryCounts)) console.log(`  ${k}: ${v}`)

  console.log('\nGoal scope distribution:')
  for (const [k, v] of Object.entries(scopeCounts)) console.log(`  ${k}: ${v}`)

  console.log("\nInterpretation status, recomputed against TODAY's Matrix (not a historical snapshot):")
  for (const [k, v] of Object.entries(statusCounts)) console.log(`  ${k}: ${v}`)
  console.log('')
}

main()
