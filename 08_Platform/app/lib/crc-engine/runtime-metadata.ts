/**
 * Runtime/version metadata (CRC Identity + Abuse Prevention + Analytics
 * milestone, design report §7). Captured once, at session creation.
 *
 * Deliberately NOT five separate Interview Engine / Retrieval / Projection
 * / Discovery Catalog / Platform Rights Matrix version strings -- all of
 * those ship together, in one commit, as one deployable unit; hand-
 * maintaining five version numbers across them would be exactly the kind
 * of manual-discipline risk the Reviewer Manual's own "Version Bump
 * Requirement" governance rule exists to guard against elsewhere in this
 * project. A single git commit SHA already tells you precisely what every
 * one of those subsystems' code did for a given session -- check out that
 * commit and read it.
 *
 * model_config captures the one thing commit SHA can't: the actual model
 * identifiers used, since each is independently overridable via env var
 * (INTERVIEW_EXTRACTOR_MODEL etc.) without any code deploy at all.
 */

export interface CrcModelConfig {
  extractor: string
  generator: string
  decider: string
  /** Index signature so this satisfies a plain JSONB Record<string, unknown> payload at the call site without a cast. */
  [key: string]: string
}

const DEFAULT_MODEL = 'claude-sonnet-5'

export function getRuntimeCommit(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  return sha ? sha.slice(0, 12) : 'local-dev'
}

/**
 * Mirrors each adapter's own env-var-then-default resolution exactly
 * (anthropic-extractor.ts / anthropic-candidate-question.ts /
 * anthropic-decision.ts) -- this does not call into those adapters, it
 * duplicates their env-var names deliberately: this module runs at
 * session-creation time in route.ts, before any adapter is constructed,
 * purely to record what WILL be used, not to alter what IS used.
 */
export function getModelConfig(): CrcModelConfig {
  return {
    extractor: process.env.INTERVIEW_EXTRACTOR_MODEL ?? DEFAULT_MODEL,
    generator: process.env.INTERVIEW_CANDIDATE_QUESTION_MODEL ?? DEFAULT_MODEL,
    decider: process.env.INTERVIEW_CONSTRAINT_A_MODEL ?? DEFAULT_MODEL,
  }
}
