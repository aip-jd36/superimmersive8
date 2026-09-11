/**
 * CAH-4G.15 — STATIC ARCHITECTURE PROOF that the new, inert
 * `ResearchSessionContext` primitives change NO production behavior, and
 * mechanically enforce the CAH-4G.14 design's authority-independence and
 * no-transcript invariants (`ADR-003` §10 / §12).
 *
 * Scanned against the ACTUAL file trees — same technique as
 * `__tests__/reviewer-lk/authority-firewall.test.ts`.
 */

import * as fs from 'fs'
import * as path from 'path'

const APP_ROOT = path.join(__dirname, '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
const codeOnly = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const importLines = (rel: string) => (read(rel).match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')

const CONTEXT_FILE = 'lib/hrr/research-session-context.ts'
const SCHEMA_FILE = 'lib/hrr/research-session-context.schema.ts'
const AUTHORITY_GATE = 'lib/reviewer-lk/hrr-authority-gate.ts'
const RUN_HRR_RESEARCH = 'lib/hrr/run-hrr-research.ts'
const INTENT_CLASSIFIER = 'lib/reviewer-lk/interpret-research-intent.ts'
const INTENT_CLASSIFIER_ANTHROPIC = 'lib/reviewer-lk/interpret-research-intent.anthropic.ts'
const HRR_RESEARCH_ROUTE = 'app/api/admin/submissions/[id]/reviewer-lk/research/route.ts'
const HRR_AUDIT_RUNNER = 'lib/hrr-audit/run-audited-hrr-research.ts'
const HRR_ANSWER_VIEW = 'app/admin/submissions/[id]/review/HrrResearchAnswerView.tsx'

describe('A — NO RUNTIME BEHAVIOR CHANGE: nothing in the live pipeline imports the new context primitives yet', () => {
  test.each([AUTHORITY_GATE, RUN_HRR_RESEARCH, INTENT_CLASSIFIER, INTENT_CLASSIFIER_ANTHROPIC, HRR_RESEARCH_ROUTE, HRR_AUDIT_RUNNER])(
    '%s does not import research-session-context (inert — CAH-4G.15 makes no behavior change)',
    (rel) => {
      const imports = importLines(rel)
      expect(imports).not.toMatch(/research-session-context/)
    },
  )

  test('the live research route body-parser (parseBody) is byte-unchanged in shape — still rejects messages/history/conversation/session_id, and does not yet accept a context field', () => {
    const route = codeOnly(HRR_RESEARCH_ROUTE)
    expect(route).toMatch(/'messages' in b \|\| 'history' in b \|\| 'conversation' in b \|\| 'session_id' in b \|\| 'sessionId' in b/)
    expect(route).not.toMatch(/activeFocus|unresolvedReferents|ResearchSessionContext|resolveResearchSessionContext/)
  })
})

describe('B — AUTHORITY INDEPENDENCE: the authority gate is structurally incapable of consuming session context', () => {
  test('hrr-authority-gate.ts imports nothing from research-session-context (mechanically enforces ADR-003 §10)', () => {
    expect(importLines(AUTHORITY_GATE)).not.toMatch(/research-session-context/)
  })

  test('hrr-authority-gate.ts never references ResearchSessionContext, activeFocus, or unresolvedReferents anywhere in its source', () => {
    const src = codeOnly(AUTHORITY_GATE)
    expect(src).not.toMatch(/ResearchSessionContext|activeFocus|unresolvedReferents/)
  })

  test('hrrAuthorityGate has arity 2 — (classified, options) only; no third "context" parameter exists', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { hrrAuthorityGate } = require('@/lib/reviewer-lk/hrr-authority-gate')
    expect(hrrAuthorityGate.length).toBeLessThanOrEqual(2)
  })

  test('runHrrResearch.ts / run-hrr-research.ts never reference ResearchSessionContext', () => {
    const src = codeOnly(RUN_HRR_RESEARCH)
    expect(src).not.toMatch(/ResearchSessionContext|activeFocus|unresolvedReferents/)
  })
})

describe('C — NO-TRANSCRIPT FIREWALL: the new context files themselves cannot carry a transcript or prior answer prose', () => {
  const contextSrc = codeOnly(CONTEXT_FILE)
  const schemaSrc = codeOnly(SCHEMA_FILE)

  test.each([
    ['messages\\s*:', /messages\s*:/],
    ['transcript', /transcript/i],
    ['history\\s*:', /history\s*:/i],
    ['previousAnswer', /previousAnswer/i],
    ['priorAnswer', /priorAnswer/i],
    ['question_text field usage', /question_text/],
    ['orientation field usage', /\.orientation\b/],
    ['boundary_note field usage', /boundary_note/],
    ['bi_summary_blocks field usage', /bi_summary_blocks/],
    ['statement_verbatim field usage', /statement_verbatim/],
  ])('research-session-context.ts never references: %s', (_label, pattern) => {
    expect(contextSrc).not.toMatch(pattern)
  })

  test('research-session-context.schema.ts carries none of the prohibited field names either', () => {
    for (const pattern of [/messages\s*:/, /transcript/i, /history\s*:/i, /previousAnswer/i, /priorAnswer/i]) {
      expect(schemaSrc).not.toMatch(pattern)
    }
  })

  test('the ONLY HrrResearchAnswer field research-session-context.ts reads is `topics` (and, within it, only `.topic`, `.intent_origin`, `.unresolved_inputs[].identifier`)', () => {
    // Structured-field allowlist over EVERY local variable this file uses that
    // ever touches an answer/topic-shaped value: thread/turn/only/t/u/id.
    // Exhaustive over the file's actual variable names, not a guess.
    const propertyAccesses = contextSrc.match(/\b(?:thread|turn|only|t|u|id)\.[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []
    const allowed = new Set([
      'thread.turns',
      'turn.role',
      'turn.status',
      'turn.answer', // followed by `.topics` — matched as its own token below
      'only.topic',
      'only.intent_origin',
      'only.unresolved_inputs',
      't.topic',
      'u.identifier',
      'id.length',
    ])
    for (const access of propertyAccesses) {
      expect(allowed.has(access)).toBe(true)
    }
    // `turn.answer.topics` is the one chained access — confirm it is exactly this, nothing longer.
    const chained = contextSrc.match(/\bturn\.answer\.[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []
    expect(new Set(chained)).toEqual(new Set(['turn.answer.topics']))
  })

  test('research-session-context.ts never imports HrrResearchAnswerView, DOM/markdown/rendering utilities, or anything importing rendered prose', () => {
    const imports = importLines(CONTEXT_FILE)
    expect(imports).not.toMatch(/HrrResearchAnswerView|react-dom|markdown|dompurify/i)
  })
})

describe('D — NO PRIOR-ANSWER-PROSE DEPENDENCY: the selector never reads the reviewer\'s raw question text', () => {
  test('research-session-context.ts never imports or destructures HrrReviewerTurn\'s "question" field', () => {
    const src = codeOnly(CONTEXT_FILE)
    // It imports HrrThreadState (a type) but must never read `.question` from any turn.
    expect(src).not.toMatch(/\.question\b/)
  })
})

describe('E — the schema module is the sole server trust boundary and treats input as untrusted', () => {
  test('research-session-context.schema.ts contains a strict validator that can return null, and a lenient wrapper that cannot', () => {
    const src = codeOnly(SCHEMA_FILE)
    expect(src).toMatch(/export function validateResearchSessionContext/)
    expect(src).toMatch(/export function resolveResearchSessionContext/)
    expect(src).toMatch(/return null/) // the strict validator does reject
  })

  test('resolveResearchSessionContext never throws and never returns null (fail-closed contract, enforced structurally: it always falls back to the empty constant)', () => {
    const src = codeOnly(SCHEMA_FILE)
    expect(src).toMatch(/return validated \?\? \{ \.\.\.EMPTY_RESEARCH_SESSION_CONTEXT \}/)
  })
})

describe('F — HrrResearchAnswerView (the one shared renderer) is untouched by this milestone', () => {
  test('HrrResearchAnswerView.tsx does not import research-session-context', () => {
    expect(importLines(HRR_ANSWER_VIEW)).not.toMatch(/research-session-context/)
  })
})
