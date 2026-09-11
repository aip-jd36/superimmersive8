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
// CAH-4G.16 — DARK WIRING ONLY. Everything imported below this line is used
// exclusively to VALIDATE and OBSERVE a client-supplied ResearchSessionContext
// AFTER the classifier call (step 3) has already run and returned. None of it
// is ever passed into `createAnthropicResearchIntentInterpreter()`, `gate`,
// `runAuditedHrrResearch()`, or the response body. Live routing, the
// classifier's input, and every returned answer are BYTE-IDENTICAL to the
// pre-CAH-4G.16 route — see `__tests__/reviewer-lk/hrr-research-route.test.ts`
// and `research-session-context-dark-wiring.test.ts` for the regression proof.
import { buildResearchSessionContextPrefix } from '@/lib/hrr/research-session-context'
import { resolveResearchSessionContext } from '@/lib/hrr/research-session-context.schema'
import { enforceAuthoritativeReferents } from '@/lib/hrr/research-session-context-referents'

export const dynamic = 'force-dynamic'

/** Reviewer-selectable topics: every GoalCategory except the 'unknown' sentinel. */
const REVIEWER_TOPICS = GOAL_CATEGORIES.filter((c): c is ReviewerResearchTopic => c !== 'unknown')

type ParsedBody =
  | { ok: true; mode: 'topic_pick'; topic: ReviewerResearchTopic }
  // `context` (CAH-4G.16): raw, UNVALIDATED at parse time — shape/authoritative
  // validation happens later, after submission context is resolved (step 4.5),
  // strictly AFTER the classifier call (step 3) already ran and returned.
  // `undefined` for a pre-CAH-4G.16 client — see `resolveResearchSessionContext`
  // (CAH-4G.15) for why `undefined` always means "no context supplied".
  | { ok: true; mode: 'question'; question: string; context: unknown }
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
    // CAH-4G.16: `context` is captured raw here — an unrecognized shape is
    // NEVER a 400 at this stage (fail-closed is the schema/authoritative
    // validator's job, step 4.5, not the parser's). A topic-pick request
    // never reads a `context` field at all, by design (§6/Phase 6: explicit
    // current intent needs no inherited context — the field is simply never
    // looked at for that mode, matching this parser's existing convention of
    // never rejecting fields it doesn't recognize for the wrong mode).
    return { ok: true, mode: 'question', question, context: 'context' in b ? b.context : undefined }
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

  // 4.5. CAH-4G.16 DARK CONTEXT VALIDATION — inert by construction: this block
  //      runs AFTER step 3's classifier call has already executed and `gate`
  //      is already fixed. Nothing computed here can retroactively change
  //      `gate`, `attributedQuestion`, or anything passed to
  //      `runAuditedHrrResearch` below — none of those variables are
  //      reassigned. Observable ONLY behind an explicit, off-by-default debug
  //      flag; never reaches the response body, the classifier, or the audit.
  if (parsed.mode === 'question') {
    const resolvedContext = resolveResearchSessionContext(parsed.context) // CAH-4G.15 shape/bounds — never null, never throws
    const authoritativeContext = enforceAuthoritativeReferents(resolvedContext, reviewerContext, TOPIC_CLAIMS_FIXTURE) // CAH-4G.16 — real identifiers only
    const darkContextPrefixForTesting = buildResearchSessionContextPrefix(authoritativeContext) // CAH-4G.15 — bounded, fixed-template
    if (process.env.HRR_DARK_CONTEXT_DEBUG === '1') {
      // Non-production observability only — never enabled by default, never
      // read by any code path that affects the response.
      console.debug('[reviewer-lk/research] CAH-4G.16 dark context (NOT used for routing/answer)', {
        activeFocus: authoritativeContext.activeFocus,
        referentCount: authoritativeContext.unresolvedReferents.length,
        prefixLength: darkContextPrefixForTesting?.length ?? 0,
      })
    }
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
