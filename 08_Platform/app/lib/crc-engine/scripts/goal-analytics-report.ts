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
 *
 * Phase F extension (CRC Living Knowledge Phase 1, 2026-08-16): four
 * governed-claims coverage metrics, same zero-new-infrastructure
 * discipline as above -- `retrieve()` is now called with `su.user_goals`,
 * `TOPIC_CLAIMS_FIXTURE`, and a per-session `ApplicabilityFacts` (built
 * from `su.project_facts.jurisdiction` + `su.tool_mentions`), which also
 * fixes a pre-existing gap: without `goals` passed, Topic Retrieval was
 * never actually exercised by this script at all (`lookupTopicClaims`
 * needs the goals array to know which topics to search), so `directly_
 * relevant`/`outside_current_coverage` were already silently wrong for any
 * topic-claim-eligible goal before this change.
 *   - Governed coverage: `directly_relevant` interpretations backed by at
 *     least one topic-sourced (not tool-sourced) result -- distinguishes
 *     Living Knowledge coverage from Matrix/tool coverage.
 *   - Outside-current-coverage rate: existing statusCounts.outside_current_
 *     coverage, now expressed as a percentage of total interpretations.
 *   - Unsettled coverage: of governed matches, how many cite a
 *     `claim_character: 'unsettled'` claim (cross-referenced against
 *     TOPIC_CLAIMS_FIXTURE by claim_id -- RetrievalResult itself doesn't
 *     carry claim_character, by design; see retrieval-engine/types.ts).
 *   - Missing-jurisdiction rate: sessions with jurisdiction still
 *     unresolved, and separately, sessions where that unresolved
 *     jurisdiction specifically produced an `applicability_unmet`
 *     diagnostic for a claim that requires it -- i.e. coverage that exists
 *     today but couldn't surface because jurisdiction was never asked.
 * All four read 0 as of this Phase, correctly: every Wave 1 claim is
 * Lifecycle: Candidate / CRC-Eligible: Pending, so no governed match is
 * possible yet -- see the closing log line, printed every run as a
 * standing reminder not to mistake that zero for a bug.
 */

import { createClient } from '@supabase/supabase-js'
import { deserializeStructuredUnderstanding } from '@/lib/interview-engine/serialization'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
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

  const categoryCounts: Record<GoalCategory, number> = { commercial_use: 0, copyright_ownership: 0, copyrightability: 0, likeness: 0, third_party_source_rights: 0, unknown: 0 }
  const scopeCounts: Record<GoalScope, number> = { informational: 0, determination_request: 0 }
  const statusCounts: Record<InterpretationStatus, number> = { directly_relevant: 0, outside_current_coverage: 0, determination_declined: 0, relevant_applicability_unresolved: 0 }
  let sessionsWithGoals = 0
  let totalActiveConfirmedGoals = 0

  // Phase F (CRC Living Knowledge Phase 1, 2026-08-16) -- governed-claims
  // coverage metrics. Same "recompute against today's fixtures, never a
  // frozen historical replay" discipline as the block above; same
  // no-raw-goal-text discipline (claim_id / topic / lifecycle / jurisdiction
  // STATE labels only -- never goal.raw_text, never a session id printed
  // next to a jurisdiction value). No new event type, no migration -- every
  // number below is recomputed on demand from structured_understanding,
  // exactly like statusCounts already was.
  const topicClaimByClaimId = new Map(TOPIC_CLAIMS_FIXTURE.map((c) => [c.claim_id, c]))
  let governedCoverageCount = 0 // directly_relevant interpretations backed by >=1 topic-sourced (not tool-sourced) result
  let unsettledCoverageCount = 0 // of the above, how many cite a claim_character: 'unsettled' claim
  let sessionsWithUnresolvedJurisdiction = 0 // among sessionsWithGoals
  let sessionsWithApplicabilityUnmetDueToJurisdiction = 0 // a topic claim existed for something the user asked, but jurisdiction being unresolved is why it didn't surface

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

    const jurisdictionState = su.project_facts.jurisdiction.attestation.state
    const jurisdictionUnresolved = jurisdictionState !== 'confirmed' && jurisdictionState !== 'declined'
    if (jurisdictionUnresolved) sessionsWithUnresolvedJurisdiction += 1

    // Recompute against TODAY's Matrix + Governed Claims -- see module header.
    const handoff = buildRetrievalHandoff(su)
    const applicabilityFacts: ApplicabilityFacts = { jurisdiction: su.project_facts.jurisdiction.attestation, toolMentions: su.tool_mentions }
    const { results, diagnostics } = retrieve(handoff, MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, applicabilityFacts, [], handoff.asset_providers)
    const interpretations = buildBoundedInterpretations(su.user_goals, results)
    for (const interp of interpretations) {
      tally(statusCounts, interp.status)
    }

    const resultSourceByClaimId = new Map(results.map((r) => [r.claim_id, r.source_fact.kind]))
    for (const interp of interpretations) {
      if (interp.status !== 'directly_relevant') continue
      const topicSourcedIds = interp.supporting_claim_ids.filter((id) => resultSourceByClaimId.get(id) === 'topic')
      if (topicSourcedIds.length === 0) continue
      governedCoverageCount += 1
      if (topicSourcedIds.some((id) => topicClaimByClaimId.get(id)?.claim_character === 'unsettled')) {
        unsettledCoverageCount += 1
      }
    }

    if (jurisdictionUnresolved) {
      const blockedByJurisdiction = diagnostics.some(
        (d) => d.reason === 'applicability_unmet' && topicClaimByClaimId.get(d.identifier)?.applicability_requirements.some((r) => r.fact === 'jurisdiction'),
      )
      if (blockedByJurisdiction) sessionsWithApplicabilityUnmetDueToJurisdiction += 1
    }
  }

  console.log(`\nSessions scanned: ${sessions.length}`)
  console.log(`Sessions with >=1 active, confirmed user goal: ${sessionsWithGoals}`)
  console.log(`Total active, confirmed user goals: ${totalActiveConfirmedGoals}\n`)

  console.log('Goal category distribution:')
  for (const [k, v] of Object.entries(categoryCounts)) console.log(`  ${k}: ${v}`)

  console.log('\nGoal scope distribution:')
  for (const [k, v] of Object.entries(scopeCounts)) console.log(`  ${k}: ${v}`)

  console.log("\nInterpretation status, recomputed against TODAY's Matrix + Governed Claims (not a historical snapshot):")
  for (const [k, v] of Object.entries(statusCounts)) console.log(`  ${k}: ${v}`)

  const totalInterpretations = totalActiveConfirmedGoals // one interpretation per active, confirmed goal
  const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(1)}%`)

  console.log('\nLiving Knowledge governed-claims coverage (CRC Living Knowledge Phase 1, 2026-08-16):')
  console.log(`  Governed coverage: ${governedCoverageCount} / ${totalInterpretations} goals (${pct(governedCoverageCount, totalInterpretations)}) resolved via a non-tool-scoped governed claim`)
  console.log(`  Outside current coverage: ${statusCounts.outside_current_coverage} / ${totalInterpretations} goals (${pct(statusCounts.outside_current_coverage, totalInterpretations)})`)
  console.log(`  Unsettled coverage: ${unsettledCoverageCount} / ${governedCoverageCount} governed matches (${pct(unsettledCoverageCount, governedCoverageCount)}) cite an 'unsettled' claim_character claim`)
  console.log(`  Sessions with unresolved jurisdiction: ${sessionsWithUnresolvedJurisdiction} / ${sessionsWithGoals} (${pct(sessionsWithUnresolvedJurisdiction, sessionsWithGoals)})`)
  console.log(`  Sessions where unresolved jurisdiction specifically blocked an otherwise-applicable governed claim: ${sessionsWithApplicabilityUnmetDueToJurisdiction} / ${sessionsWithGoals} (${pct(sessionsWithApplicabilityUnmetDueToJurisdiction, sessionsWithGoals)})`)
  console.log('  (All Wave 1 claims are Lifecycle: Candidate / CRC-Eligible: Pending as of this Phase -- governed/unsettled coverage will read 0 until claims are Adopted + CRC-eligible. This is expected, not a bug; re-running this script after adoption picks up new coverage automatically, no data migration.)\n')
}

main()
