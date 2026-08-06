/**
 * Mock CandidateExtractor for Phase 6a substage 1 (deterministic
 * extraction-contract tests).
 *
 * Deliberately NOT a natural-language parser: it returns whatever
 * CandidateObservation[] it was constructed with, regardless of the turn's
 * actual text. Test fixtures hand-author realistic candidates (including
 * the raw_text a disambiguation phrase needs to live in) and feed them
 * through this constant extractor to exercise the real pipeline --
 * normalizeCandidate, attestCandidate, runExtractionPipeline, mutations.ts
 * -- without needing (or pretending to have) any actual language
 * understanding. This is the concrete meaning of "the mock proves the
 * architecture and plumbing; it does not count as evidence that
 * natural-language extraction works" (Phase 6a kickoff) -- a keyword-
 * matching pseudo-NLU mock would risk implying otherwise.
 *
 * Parallel to lib/assessments/providers/mock.ts (MockProvenanceProvider):
 * same role, same reason for living in its own file separate from the real
 * pipeline logic.
 */

import type { CandidateExtractor, CandidateObservation, RawUserTurn } from './extraction'

export function constantExtractor(candidates: CandidateObservation[]): CandidateExtractor {
  return (_turn: RawUserTurn) => candidates
}
