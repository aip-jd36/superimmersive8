/**
 * GET /api/admin/submissions/[id]/reviewer-lk?topic=<GoalCategory>   (CAH-4E)
 *
 * DELIBERATE, ON-DEMAND, FAIL-CLOSED AUDITED reviewer research over governed
 * SI8 Living Knowledge. Never runs on page load; the reviewer must explicitly
 * pick a topic and initiate the lookup.
 *
 * Required sequence (CAH-4E §12 — the ordering is the contract):
 *   1. authenticate reviewer                       (checkReviewerContextAccess)
 *   2. validate the request (topic is a real GoalCategory; submission exists)
 *   3. select governed results into memory         (submission facts → selector → projection)
 *        - any selection/read error                -> 500, NO audit
 *        - unknown topic                           -> 400, NO audit
 *        - no such submission                      -> 404, NO audit
 *   4. PERSIST the durable lk_research access audit (recordReviewerLkAccess — throws on failure)
 *        - audit persistence fails -> 503, ZERO governed LK content
 *   5. ONLY THEN return the governed LK result
 *
 * No request body. `topic` is the only query parameter; `id` is the submission
 * path segment. The client supplies nothing that influences authorization or
 * which governed claims are eligible.
 *
 * Read + append-only access audit ONLY. This route imports the reviewer-context
 * auth wrapper and the reviewer-lk read/select/project/audit modules — never
 * `@/lib/assessments`, never the workbook write path, never `@/lib/crc-sales`,
 * never CRC retrieval (`@/lib/retrieval-engine/retrieve`).
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { GOAL_CATEGORIES, type GoalCategory } from '@/types/interview-engine'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { getSubmissionFactsForReviewerLk, recordReviewerLkAccess } from '@/lib/reviewer-lk/repository'
import { buildReviewerLkContext } from '@/lib/reviewer-lk/submission-facts'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import { projectReviewerLkResult } from '@/lib/reviewer-lk/project-reviewer-claims'
import type { ReviewerLkLookupResult } from '@/lib/reviewer-lk/types'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { id: string } }

/** Reviewer-selectable topics: every GoalCategory except the 'unknown' sentinel. */
const REVIEWER_TOPICS: readonly GoalCategory[] = GOAL_CATEGORIES.filter((c) => c !== 'unknown')

export async function GET(request: NextRequest, { params }: RouteContext) {
  // 1. authorize
  const access = await checkReviewerContextAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: access.status },
    )
  }

  // 2. validate the request
  const rawTopic = request.nextUrl.searchParams.get('topic')
  if (rawTopic === null || !REVIEWER_TOPICS.includes(rawTopic as GoalCategory)) {
    const body: ReviewerLkLookupResult = { ok: false, code: 'unknown_topic' }
    return NextResponse.json(body, { status: 400 })
  }
  const topic = rawTopic as GoalCategory

  // 3. select governed results into memory (no audit yet)
  let result: Extract<ReviewerLkLookupResult, { ok: true }>
  try {
    const facts = await getSubmissionFactsForReviewerLk(params.id)
    if (facts === null) {
      const body: ReviewerLkLookupResult = { ok: false, code: 'no_such_submission' }
      return NextResponse.json(body, { status: 404 })
    }
    const bundle = buildReviewerLkContext(facts)
    const selection = selectReviewerClaims({
      topic,
      topicClaims: TOPIC_CLAIMS_FIXTURE,
      assetProviderIds: bundle.assetProviderIds,
      activeToolIds: bundle.activeToolIds,
      applicabilityFacts: bundle.applicabilityFacts,
    })
    result = projectReviewerLkResult({ topic, retrievalContext: bundle.context, selection })
  } catch (err) {
    console.error('[reviewer-lk] selection failed', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // 4. audit-before-content: the durable access record MUST persist before any
  //    governed LK content is returned. Failure denies the result.
  try {
    await recordReviewerLkAccess({ actorUserId: access.userId, submissionId: params.id })
  } catch (err) {
    console.error('[reviewer-lk] audit persistence failed — denying governed LK content', err)
    return NextResponse.json(
      { error: 'Living Knowledge research unavailable — access could not be recorded.' },
      { status: 503 },
    )
  }

  // 5. only now — the governed LK result
  return NextResponse.json(result satisfies ReviewerLkLookupResult)
}
