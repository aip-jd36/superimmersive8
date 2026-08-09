/**
 * Mock CandidateQuestionGenerator for Phase 6b deterministic-contract tests.
 * Parallel to mock-extractor.ts's constantExtractor -- same role, same
 * reasoning: returns whatever it was constructed with, ignoring input
 * entirely. Proves plumbing, not language understanding or question quality.
 */

import type { CandidateQuestionGenerator, CandidateQuestionGeneratorInput, CandidateQuestionProposal } from './candidate-question'

export function constantCandidateQuestionGenerator(
  proposal: CandidateQuestionProposal | null,
): CandidateQuestionGenerator {
  return async (_input: CandidateQuestionGeneratorInput) => proposal
}
