/**
 * POST /api/admin/submissions/[id]/reviewer-lk/research   (CAH-4G.6)
 *
 * The ONE UI-reachable Human Reviewer Research (HRR) entry point. BOTH research
 * entry modes converge here and run the SAME downstream governed pipeline:
 *
 *   topic shortcut  → { mode: 'topic_pick', topic }  → topicSelectionGateResult(topic)   [0 model calls]
 *   free-form ask   → { mode: 'question', question } → classifier → hrrAuthorityGate     [1 classify-only model call, fails closed]
 *                                                     ↓
 *   runAuditedHrrResearch(...)  →  selectReviewerClaims → deterministic applicability →
 *     Bounded Interpretation → projectHrrResearchAnswer → REQUIRED lk_research audit →
 *     HrrResearchAnswer
 *
 * FAIL-CLOSED AUDIT-BEFORE-CONTENT (CAH-4G.5, unchanged): no governed proposition,
 * applicability, BI summary, does_not_apply content, claim reference, or answer
 * leaves the server before the `lk_research` access row is durably persisted
 * (where governed research occurred). `HrrAuditNotRecordedError` → 503, zero
 * content.
 *
 * The client supplies ONLY the research question (or a governed topic enum) plus
 * the submission path segment. It never supplies actor identity, claim ids,
 * applicability, BI status, authority state, topic classification, or assessment
 * facts. The raw question exists only for this request — it is never persisted,
 * never logged, never placed in a URL.
 *
 * This route reuses `lib/reviewer-context/auth` + `lib/reviewer-lk/*` +
 * `lib/hrr-audit/*`. It imports NO assessment mutation service, NO workbook write
 * path, NO CRC retrieval orchestrator, NO Linked CRC context. It is a research +
 * append-only audit surface only — enforced by
 * `__tests__/reviewer-lk/hrr-research-route.test.ts`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { GOAL_CATEGORIES } from '@/types/interview-engine'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { getSubmissionFactsForReviewerLk } from '@/lib/reviewer-lk/repository'
import { buildReviewerLkContext } from '@/lib/reviewer-lk/submission-facts'
import { createAnthropicResearchIntentInterpreter } from '@/lib/reviewer-lk/interpret-research-intent.anthropic'
import { hrrAuthorityGate } from '@/lib/reviewer-lk/hrr-authority-gate'
import { HRR_QUESTION_MAX_LENGTH } from '@/lib/reviewer-lk/types'
import { topicSelectionGateResult } from '@/lib/hrr/run-hrr-research'
import { runAuditedHrrResearch, HrrAuditNotRecordedError } from '@/lib/hrr-audit/run-audited-hrr-research'
import type { HrrAuthorityGateResult, ReviewerResearchTopic } from '@/lib/reviewer-lk/types'
import type { HrrResearchAnswer } from '@/lib/hrr/types'

export const dynamic = 'force-dynamic'

/** Reviewer-selectable topics: every GoalCategory except the 'unknown' sentinel. */
const REVIEWER_TOPICS = GOAL_CATEGORIES.filter((c): c is ReviewerResearchTopic => c !== 'unknown')

type ParsedBody =
  | { ok: true; mode: 'topic_pick'; topic: ReviewerResearchTopic }
  | { ok: true; mode: 'question'; question: string }
  | { ok: false; message: string }

/** Strict free-form input contract — no messages[] transcript, no history, no session id, no client authority facts. */
function parseBody(body: unknown): ParsedBody {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: 'Request body must be a JSON object.' }
  }
  const b = body as Record<string, unknown>

  // Reject any chatbot-transcript / conversation-memory shape outright.
  if ('messages' in b || 'history' in b || 'conversation' in b || 'session_id' in b || 'sessionId' in b) {
    return { ok: false, message: 'HRR does not accept conversation history.' }
  }

  if (b.mode === 'topic_pick') {
    if (typeof b.topic !== 'string' || !REVIEWER_TOPICS.includes(b.topic as ReviewerResearchTopic)) {
      return { ok: false, message: 'Unknown research topic.' }
    }
    return { ok: true, mode: 'topic_pick', topic: b.topic as ReviewerResearchTopic }
  }

  if (b.mode === 'question') {
    if (typeof b.question !== 'string') {
      return { ok: false, message: 'A research question is required.' }
    }
    const question = b.question.trim()
    if (question.length === 0) return { ok: false, message: 'Enter a research question about this submission.' }
    if (question.length > HRR_QUESTION_MAX_LENGTH) {
      return { ok: false, message: `Keep your research question under ${HRR_QUESTION_MAX_LENGTH} characters.` }
    }
    return { ok: true, mode: 'question', question }
  }

  return { ok: false, message: 'Request "mode" must be "topic_pick" or "question".' }
}

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 })

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // 1. authorize — server-resolved identity only
  const access = await checkReviewerContextAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: access.status },
    )
  }

  // 2. parse + validate input shape / length
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return badRequest('Malformed JSON request body.')
  }
  const parsed = parseBody(raw)
  if (!parsed.ok) return badRequest(parsed.message)

  // 3. resolve the permitted research intent
  let gate: HrrAuthorityGateResult
  let attributedQuestion: string | null = null
  try {
    if (parsed.mode === 'topic_pick') {
      gate = topicSelectionGateResult(parsed.topic) // deterministic — 0 model calls
    } else {
      attributedQuestion = parsed.question
      // one classify-only model call; the adapter fails closed to
      // `unsupportedResearchIntent()` on any provider error and never throws.
      const classified = await createAnthropicResearchIntentInterpreter()(parsed.question)
      gate = hrrAuthorityGate(classified, { sourceTextRef: null })
    }
  } catch (err) {
    // Only the interpreter *constructor* (missing/invalid API key) can land here.
    console.error('[reviewer-lk/research] intent resolution unavailable', err instanceof Error ? err.name : 'unknown')
    return NextResponse.json(
      { error: 'Living Knowledge research is temporarily unavailable. Try again shortly.' },
      { status: 503 },
    )
  }

  // 4. resolve submission retrieval context — in memory, no audit yet
  let reviewerContext: ReturnType<typeof buildReviewerLkContext>
  try {
    const facts = await getSubmissionFactsForReviewerLk(params.id)
    if (facts === null) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
    reviewerContext = buildReviewerLkContext(facts)
  } catch (err) {
    console.error('[reviewer-lk/research] submission context read failed', err instanceof Error ? err.name : 'unknown')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // 5-8. audited HRR research — the required audit persists BEFORE the answer
  //      is returned (CAH-4G.5). Failure → 503, zero governed content.
  try {
    const answer: HrrResearchAnswer = await runAuditedHrrResearch({
      gate,
      reviewerContext,
      topicClaims: TOPIC_CLAIMS_FIXTURE,
      attributedQuestion,
      actorUserId: access.userId,
      submissionId: params.id,
    })
    return NextResponse.json(answer)
  } catch (err) {
    if (err instanceof HrrAuditNotRecordedError) {
      console.error('[reviewer-lk/research] audit persistence failed — denying governed content')
      return NextResponse.json({ error: err.reviewerFacingMessage }, { status: 503 })
    }
    console.error('[reviewer-lk/research] research failed', err instanceof Error ? err.name : 'unknown')
    return NextResponse.json({ error: 'Living Knowledge research is unavailable right now. Try again.' }, { status: 500 })
  }
}
