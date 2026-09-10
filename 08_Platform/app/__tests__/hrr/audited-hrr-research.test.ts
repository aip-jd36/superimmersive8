/**
 * CAH-4G.5 Slice 5 — HRR audit enrichment + audit-before-content.
 *
 * Two concerns:
 *   1. `projectHrrAuditRecord` — the pure sanitized audit projection.
 *   2. `runAuditedHrrResearch` — the impure orchestration boundary that
 *      guarantees NO GOVERNED HRR CONTENT IS RETURNED BEFORE THE REQUIRED
 *      AUDIT SUCCEEDS.
 *
 * Audit reuses the existing `lk_research` contract UNCHANGED (Option A):
 * `recordReviewerLkAccess({ actorUserId, submissionId })` — actor + submission
 * only. No topic, no claim ids, no mode, no BI status, no raw question, no
 * answer prose is persisted.
 */

const recordReviewerLkAccess = jest.fn()
jest.mock('@/lib/reviewer-lk/repository', () => ({
  recordReviewerLkAccess,
  // getSubmissionFactsForReviewerLk is unused here but present in the real module
  getSubmissionFactsForReviewerLk: jest.fn(),
}))

import * as fs from 'fs'
import * as path from 'path'
import {
  runAuditedHrrResearch,
  HrrAuditNotRecordedError,
  type AuditedHrrResearchInput,
} from '@/lib/hrr-audit/run-audited-hrr-research'
import { projectHrrAuditRecord, hrrGovernedResearchOccurred } from '@/lib/hrr/project-hrr-audit-record'
import { runHrrResearch, topicSelectionGateResult, type RunHrrResearchInput } from '@/lib/hrr/run-hrr-research'
import { hrrAuthorityGate } from '@/lib/reviewer-lk/hrr-authority-gate'
import type { ReviewerLkContextBundle } from '@/lib/reviewer-lk/submission-facts'
import type { PermittedResearchIntent } from '@/lib/reviewer-lk/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

// ── fixtures ──────────────────────────────────────────────────────────────

function claim(overrides: Partial<TopicClaim>): TopicClaim {
  return {
    claim_id: 'CLAIM-X-001-v1', topic: 'commercial_use', claim_character: 'established', jurisdiction: 'Global',
    lifecycle: 'Adopted', crc_eligible: 'Yes', crc_publication_scope: 'scope prose', crc_candidate_statement: 'a governed statement',
    publication_scope: 'Reviewer/Commercial Assurance', applicability_requirements: [], unresolved_project_dependencies: [],
    provider_scope: null, tool_scope: null, last_verified: '2026-09-01', superseded_by: null, ...overrides,
  }
}
function ctx(): ReviewerLkContextBundle {
  return {
    context: { resolved_tool_ids: [], resolved_asset_provider_ids: [], jurisdiction_included: [] },
    applicabilityFacts: { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
    activeToolIds: [], assetProviderIds: [],
  }
}
const OWN = claim({ claim_id: 'CLAIM-OWN-001-v1', topic: 'copyright_ownership', crc_candidate_statement: 'ownership statement' })
const COMM = claim({ claim_id: 'CLAIM-COMM-001-v1', topic: 'commercial_use', crc_candidate_statement: 'commercial statement' })
const permitted = (o: Partial<PermittedResearchIntent> = {}): PermittedResearchIntent => ({
  research_intents: [], assessment_decision_requested: false, unresolved_ambiguity: [], ...o,
})
const baseRun = (o: Partial<RunHrrResearchInput> = {}): RunHrrResearchInput => ({
  gate: topicSelectionGateResult('copyright_ownership'), reviewerContext: ctx(), topicClaims: [OWN, COMM], ...o,
})
const auditedInput = (o: Partial<AuditedHrrResearchInput> = {}): AuditedHrrResearchInput => ({
  ...baseRun(o), actorUserId: 'reviewer-9', submissionId: 'sub-1', ...o,
})

beforeEach(() => {
  jest.clearAllMocks()
  recordReviewerLkAccess.mockResolvedValue(undefined)
})

// ═════════════════════════════════════════════════════════════════════════
// projectHrrAuditRecord — pure sanitized projection
// ═════════════════════════════════════════════════════════════════════════

describe('projectHrrAuditRecord', () => {
  test('governed research occurred → record is exactly { actorUserId, submissionId }', () => {
    const result = runHrrResearch(baseRun())
    const rec = projectHrrAuditRecord({ actorUserId: 'r-1', submissionId: 's-1' }, result)
    expect(rec).toEqual({ actorUserId: 'r-1', submissionId: 's-1' })
    expect(Object.keys(rec!).sort()).toEqual(['actorUserId', 'submissionId'])
  })

  test('no governed research (pure "should I approve") → null, no audit record', () => {
    const gate = hrrAuthorityGate(permitted({ assessment_decision_requested: true, unresolved_ambiguity: ['no_governed_topic_matched'] }))
    const result = runHrrResearch(baseRun({ gate, attributedQuestion: 'Should I approve this?' }))
    expect(hrrGovernedResearchOccurred(result)).toBe(false)
    expect(projectHrrAuditRecord({ actorUserId: 'r-1', submissionId: 's-1' }, result)).toBeNull()
  })

  test('unsupported / over-general question → null', () => {
    const gate = hrrAuthorityGate(permitted({ unresolved_ambiguity: ['question_too_general'] }))
    const result = runHrrResearch(baseRun({ gate, attributedQuestion: 'help' }))
    expect(projectHrrAuditRecord({ actorUserId: 'r-1', submissionId: 's-1' }, result)).toBeNull()
  })

  test('mixed authority + surviving research clause → record present (governed research DID occur)', () => {
    const gate = hrrAuthorityGate(permitted({ research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }], assessment_decision_requested: true }))
    const result = runHrrResearch(baseRun({ gate, attributedQuestion: 'Should I approve, and what does LK say about copyright ownership?' }))
    expect(projectHrrAuditRecord({ actorUserId: 'r-1', submissionId: 's-1' }, result)).toEqual({ actorUserId: 'r-1', submissionId: 's-1' })
  })

  test('outside_current_coverage still counts as a governed research access (the selector ran, nothing surfaced)', () => {
    const result = runHrrResearch(baseRun({ gate: topicSelectionGateResult('likeness'), topicClaims: [OWN, COMM] }))
    expect(result.per_topic[0].bi_status).toBe('outside_current_coverage')
    expect(projectHrrAuditRecord({ actorUserId: 'r-1', submissionId: 's-1' }, result)).toEqual({ actorUserId: 'r-1', submissionId: 's-1' })
  })

  test('multi-topic → ONE record (one reviewer action), not one per topic', () => {
    const gate = hrrAuthorityGate(permitted({ research_intents: [
      { topic: 'commercial_use', scope: 'informational' }, { topic: 'copyright_ownership', scope: 'informational' },
    ] }))
    const result = runHrrResearch(baseRun({ gate }))
    expect(result.per_topic).toHaveLength(2)
    const rec = projectHrrAuditRecord({ actorUserId: 'r-1', submissionId: 's-1' }, result)
    expect(rec).toEqual({ actorUserId: 'r-1', submissionId: 's-1' }) // singular
  })

  test('the raw question and answer prose never reach the record — even for a false-premise question', () => {
    const gate = hrrAuthorityGate(permitted({ research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }] }))
    const premise = 'Since Veo gives us copyright ownership, is this cleared?'
    const result = runHrrResearch(baseRun({ gate, attributedQuestion: premise }))
    const rec = projectHrrAuditRecord({ actorUserId: 'r-1', submissionId: 's-1' }, result)
    expect(JSON.stringify(rec)).not.toContain('Veo')
    expect(JSON.stringify(rec)).not.toContain('cleared')
    expect(JSON.stringify(rec)).not.toContain('ownership statement')
  })
})

// ═════════════════════════════════════════════════════════════════════════
// runAuditedHrrResearch — audit-before-content
// ═════════════════════════════════════════════════════════════════════════

describe('runAuditedHrrResearch — audit-before-content', () => {
  test('audit success → answer returned, exactly one audit write, actor + submission only', async () => {
    const answer = await runAuditedHrrResearch(auditedInput())
    expect(answer.topics[0].governed_considerations[0].statement_verbatim).toBe('ownership statement')
    expect(recordReviewerLkAccess).toHaveBeenCalledTimes(1)
    expect(recordReviewerLkAccess).toHaveBeenCalledWith({ actorUserId: 'reviewer-9', submissionId: 'sub-1' })
    expect(Object.keys(recordReviewerLkAccess.mock.calls[0][0]).sort()).toEqual(['actorUserId', 'submissionId'])
  })

  test('ORDERING: audit write completes BEFORE the answer is produced to the caller', async () => {
    const order: string[] = []
    recordReviewerLkAccess.mockImplementation(async () => { order.push('audit') })
    const answer = await runAuditedHrrResearch(auditedInput())
    order.push('return')
    expect(order).toEqual(['audit', 'return'])
    expect(answer.topics).toHaveLength(1)
  })

  test('audit write throws → HrrAuditNotRecordedError, NO governed content anywhere in the error', async () => {
    recordReviewerLkAccess.mockRejectedValue(new Error('insert failed'))
    let thrown: unknown
    try {
      await runAuditedHrrResearch(auditedInput())
    } catch (e) { thrown = e }
    expect(thrown).toBeInstanceOf(HrrAuditNotRecordedError)
    const e = thrown as HrrAuditNotRecordedError
    expect(JSON.stringify({ msg: e.message, rf: e.reviewerFacingMessage })).not.toMatch(/CLAIM-|ownership statement|governed_considerations|Copyright ownership/)
    expect(e.reviewerFacingMessage).toBe('Living Knowledge research unavailable — access could not be recorded.')
  })

  test('audit rejects (timeout-style) → error, answer not returned', async () => {
    recordReviewerLkAccess.mockRejectedValue(Object.assign(new Error('statement timeout'), { code: '57014' }))
    await expect(runAuditedHrrResearch(auditedInput())).rejects.toBeInstanceOf(HrrAuditNotRecordedError)
  })

  test('no governed research ("should I approve") → NO audit write, answer (refusal) still returned', async () => {
    const gate = hrrAuthorityGate(permitted({ assessment_decision_requested: true, unresolved_ambiguity: ['no_governed_topic_matched'] }))
    const answer = await runAuditedHrrResearch(auditedInput({ gate, attributedQuestion: 'Should I approve this?' }))
    expect(recordReviewerLkAccess).not.toHaveBeenCalled()
    expect(answer.authority_note).toBe('assessment_judgment_redirected')
    expect(answer.topics).toEqual([])
  })

  test('unsupported question → NO audit write', async () => {
    const gate = hrrAuthorityGate(permitted({ unresolved_ambiguity: ['question_too_general'] }))
    await runAuditedHrrResearch(auditedInput({ gate, attributedQuestion: 'help' }))
    expect(recordReviewerLkAccess).not.toHaveBeenCalled()
  })

  test('two research actions → two append-only audit writes (no dedup on identical topic/claims)', async () => {
    await runAuditedHrrResearch(auditedInput())
    await runAuditedHrrResearch(auditedInput())
    expect(recordReviewerLkAccess).toHaveBeenCalledTimes(2)
  })

  test('pipeline never returns partial governed content on audit failure — the whole answer is withheld', async () => {
    recordReviewerLkAccess.mockRejectedValue(new Error('down'))
    const gate = hrrAuthorityGate(permitted({ research_intents: [
      { topic: 'commercial_use', scope: 'informational' }, { topic: 'copyright_ownership', scope: 'informational' },
    ] }))
    await expect(runAuditedHrrResearch(auditedInput({ gate }))).rejects.toBeInstanceOf(HrrAuditNotRecordedError)
    // caller got an exception, not a value → nothing to leak
  })

  test('mixed: governed research audited; the audit does not encode the declined assessment decision', async () => {
    const gate = hrrAuthorityGate(permitted({ research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }], assessment_decision_requested: true }))
    await runAuditedHrrResearch(auditedInput({ gate, attributedQuestion: 'Should I approve, and what does LK say?' }))
    expect(recordReviewerLkAccess).toHaveBeenCalledTimes(1)
    const arg = recordReviewerLkAccess.mock.calls[0][0]
    expect(Object.keys(arg).sort()).toEqual(['actorUserId', 'submissionId'])
    expect(JSON.stringify(arg)).not.toMatch(/approve|judgment|redirect|declin/i)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// architecture firewall — source scan
// ═════════════════════════════════════════════════════════════════════════

describe('architecture firewall', () => {
  const APP_ROOT = path.join(__dirname, '..', '..')
  const listTs = (rel: string): string[] => {
    const full = path.join(APP_ROOT, rel)
    if (!fs.existsSync(full)) return []
    const out: string[] = []
    for (const e of fs.readdirSync(full, { withFileTypes: true })) {
      const p = `${rel}/${e.name}`
      if (e.isDirectory()) out.push(...listTs(p))
      else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out.push(p)
    }
    return out
  }
  const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
  const codeOnly = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  const importLines = (rel: string) => (read(rel).match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')

  const AUDIT_FILES = listTs('lib/hrr-audit')

  test('lib/hrr-audit is exactly the orchestration boundary', () => {
    expect(AUDIT_FILES).toEqual(['lib/hrr-audit/run-audited-hrr-research.ts'])
  })

  const ORCH = 'lib/hrr-audit/run-audited-hrr-research.ts'

  test('imports only the pure HRR pipeline + the reviewer-lk audit repository', () => {
    const imp = importLines(ORCH)
    expect(imp).not.toMatch(/@\/lib\/assessments|@\/lib\/crc-engine|@\/lib\/crc-sales|@\/lib\/crc-project-context|@\/lib\/crc-assurance/)
    expect(imp).not.toMatch(/@\/lib\/reviewer-context|reviewer-crc-context|linked.*crc|crc.*transcript/i)
    expect(imp).not.toMatch(/@\/lib\/retrieval-engine\/retrieve|enumerate-eligible-claims/)
    expect(imp).not.toMatch(/@anthropic-ai\/sdk|interpret-research-intent|anthropic-structured-output-retry/)
    expect(imp).not.toMatch(/@\/lib\/bounded-interpretation\/build-bounded-interpretation/)
    expect(imp).not.toMatch(/next\/server|\.tsx['"]|react/i)
    // the only repository import is the reviewer-lk access audit
    expect(imp).toMatch(/recordReviewerLkAccess[\s\S]*@\/lib\/reviewer-lk\/repository/)
  })

  test('exactly one audit write; no other DB I/O; re-runs no classifier / BI / applicability / composition strengthening', () => {
    const code = codeOnly(ORCH)
    expect((code.match(/recordReviewerLkAccess\s*\(/g) ?? [])).toHaveLength(1)
    expect(code).not.toMatch(/\.(insert|update|upsert|delete)\s*\(|\.rpc\s*\(|\.from\s*\(\s*['"]/)
    expect(code).not.toMatch(/buildBoundedInterpretations\s*\(|evaluateApplicabilityDetailed\s*\(|selectReviewerClaims\s*\(|hrrAuthorityGate\s*\(|interpretResearchIntent\s*\(/)
    expect(code).not.toMatch(/logPilotEvent|console\.(log|info|warn|error)/)
  })

  test('the raw reviewer question / answer prose never reach the audit path (no broad object spread)', () => {
    const code = codeOnly(ORCH)
    expect(code).not.toMatch(/attributed_question|attributedQuestion|question_text|orientation|boundary_note|summary_blocks|reviewer_responsibility_note/)
    // the audit record is built by the named projection, never by spreading a result/answer
    expect(code).not.toMatch(/recordReviewerLkAccess\s*\(\s*\{\s*\.\.\./)
    expect(code).toMatch(/projectHrrAuditRecord\s*\(/)
  })

  test('writes no assessment / workbook / evidence / finding / outcome / sign-off state; creates no CRC UserGoal', () => {
    const code = codeOnly(ORCH)
    expect(code).not.toMatch(/workbook|assessment|evidence|finding|control_result|sign_?off|outcome|UserGoal|user_goals/i)
  })

  test('project-hrr-audit-record.ts stays PURE (no repository import, no write)', () => {
    const imp = importLines('lib/hrr/project-hrr-audit-record.ts')
    expect(imp).not.toMatch(/@\/lib\/reviewer-lk\/repository|@\/lib\/supabase/)
    const code = codeOnly('lib/hrr/project-hrr-audit-record.ts')
    expect(code).not.toMatch(/recordReviewerLkAccess|\.insert\s*\(|\.rpc\s*\(|await\s/)
    // it names its two fields explicitly, never spreads the result
    expect(code).not.toMatch(/\.\.\.\s*result|\.\.\.\s*identity/)
    expect(code).toMatch(/actorUserId:\s*identity\.actorUserId/)
    expect(code).toMatch(/submissionId:\s*identity\.submissionId/)
  })
})
