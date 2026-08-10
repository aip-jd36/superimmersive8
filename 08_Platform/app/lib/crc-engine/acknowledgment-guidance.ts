/**
 * Presentation-only "what happens next" guidance for the CRC page (CRC
 * Limited Pilot -- pilot UX finding, 2026-08-10, not an engine correction).
 *
 * Root cause of the reported "stall": runTurn() correctly falls back to a
 * bare acknowledgment when the turn's one candidate question is suppressed
 * by Constraint A (redundant) or Constraint B (over-repetitive) -- both
 * legitimate, already-tested behavior, confirmed via multi-trial live
 * tracing against the real Anthropic adapters. The engine was never wrong;
 * the acknowledgment alone gave the user no signal about what to do next.
 * This module exists ONLY to decide when to show one static line of
 * guidance under that acknowledgment. It does not touch runTurn(),
 * completion, gates, boundaries, pending_clarification, Retrieval, or
 * Projection, and does not cause a second candidate-generation attempt.
 *
 * Shown for exactly one state: the assistant's most recent turn was an
 * acknowledgment (no question asked) AND the page is currently idle
 * (awaiting the user's next action -- i.e. not sending, not a retryable
 * error, not an unresolvable session, not loading, not already complete).
 * `phase === 'idle'` alone already rules out every excluded case in
 * CrcPage's own state machine: a real follow-up question also lands in
 * 'idle', which is exactly why `lastOutcomeWasAcknowledgment` is a
 * separate, explicit flag rather than derived from phase alone.
 */

export type CrcPagePhase = 'loading' | 'idle' | 'sending' | 'retry' | 'complete' | 'session_not_found'

export function shouldShowAcknowledgmentGuidance(phase: CrcPagePhase, lastOutcomeWasAcknowledgment: boolean): boolean {
  return phase === 'idle' && lastOutcomeWasAcknowledgment
}

/**
 * Exact copy, single source of truth for both the component and its tests.
 * Preserves the four things JD's approved copy must convey: CRC received
 * the answer (implicit -- the acknowledgment line above this one already
 * says so and is left unchanged), the user may volunteer more, the user
 * does not have to keep talking, and Stop finishes the interview using
 * what's already known -- without implying CRC is waiting on anything it
 * isn't actually requiring, and without implying completion before the
 * user acts or natural completion occurs.
 */
export const ACKNOWLEDGMENT_GUIDANCE_COPY =
  "If there's anything else about how the video was made that you'd like to mention, you can continue. Otherwise, click Stop and I'll summarize what we've learned so far."
