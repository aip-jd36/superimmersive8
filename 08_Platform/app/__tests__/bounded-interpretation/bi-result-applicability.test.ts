/**
 * CAH-4G.3A — deterministic unresolved applicability must reach Bounded
 * Interpretation honestly.
 *
 * A retrieved governed proposition whose applicability requirements are
 * deterministically `unresolved` must be interpreted as
 * `relevant_applicability_unresolved` — NOT `directly_relevant` — even when
 * no CRC `RetrievalDiagnostic` is supplied. The governed proposition stays
 * visible and verbatim; only the closing sentence + status change. This is
 * not withholding and not a negative finding.
 *
 * These tests call `buildBoundedInterpretations` directly with `BiIntent[]` +
 * `BiResult[]` (no CRC/HRR shim) so the BI boundary itself is under test.
 */

import * as fs from 'fs'
import * as path from 'path'

import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import type { BiIntent, BiResult } from '@/lib/bounded-interpretation/types'

const intent = (over: Partial<BiIntent> = {}): BiIntent => ({
  intent_id: 'i-1',
  intent_text: 'Copyright ownership',
  category: 'copyright_ownership',
  scope: 'informational',
  ...over,
})

const result = (over: Partial<BiResult> = {}): BiResult => ({
  matched_goal_category: 'copyright_ownership',
  unresolved_project_dependencies: [],
  claim_id: 'CLAIM-A-v1',
  candidate_statement: 'Statement A.',
  match_origin: 'exact_topic',
  source_fact: { kind: 'topic' },
  ...over,
})

const US_REQ = { fact: 'jurisdiction' as const, operator: 'equals' as const, value: 'United States' }

describe('BiResult.applicability — the generic result-side unresolved signal', () => {
  test('status: established → directly_relevant (unchanged), statement quoted verbatim', () => {
    const [bi] = buildBoundedInterpretations([intent()], [result({ applicability: { status: 'established' } })])
    expect(bi.status).toBe('directly_relevant')
    expect(bi.summary_blocks.join(' ')).toContain('Statement A.')
  })

  test('applicability ABSENT → directly_relevant (CRC compatibility — a RetrievalResult carries no applicability field)', () => {
    const [bi] = buildBoundedInterpretations([intent()], [result()])
    expect(bi.status).toBe('directly_relevant')
  })

  test('status: unresolved → relevant_applicability_unresolved (NOT directly_relevant)', () => {
    const [bi] = buildBoundedInterpretations([intent()], [
      result({ applicability: { status: 'unresolved', unresolved_requirements: [US_REQ] } }),
    ])
    expect(bi.status).toBe('relevant_applicability_unresolved')
  })

  test('the governed proposition stays VISIBLE and verbatim under unresolved applicability (not withheld, Case-3B-style rendering)', () => {
    const [bi] = buildBoundedInterpretations([intent()], [
      result({ candidate_statement: 'The client owns the copyright in the output.', applicability: { status: 'unresolved', unresolved_requirements: [US_REQ] } }),
    ])
    expect(bi.summary_blocks.join(' ')).toContain('The client owns the copyright in the output.')
    expect(bi.summary_blocks.join(' ')).toMatch(/isn't enough project-specific information to determine how it applies/)
    expect(bi.supporting_claim_ids).toEqual(['CLAIM-A-v1'])
  })

  test('unresolved applicability is not a negative finding / pass-fail — no "not applicable" / "does not apply" / "failed" language', () => {
    const [bi] = buildBoundedInterpretations([intent()], [
      result({ applicability: { status: 'unresolved', unresolved_requirements: [US_REQ] } }),
    ])
    const text = bi.summary_blocks.join(' ')
    expect(text).not.toMatch(/not applicable|does not apply|doesn't apply|failed|negative finding|non-compliant/i)
  })

  test('multiple unresolved requirements on one claim → still one relevant_applicability_unresolved', () => {
    const [bi] = buildBoundedInterpretations([intent()], [
      result({ applicability: { status: 'unresolved', unresolved_requirements: [US_REQ, { fact: 'tool_plan_tier', operator: 'equals', value: 'paid', tool: 'kling' }] } }),
    ])
    expect(bi.status).toBe('relevant_applicability_unresolved')
  })
})

describe('multiple claims under one intent — mixed applicability states', () => {
  test('one established + one unresolved → relevant_applicability_unresolved; BOTH statements visible; established one keeps its plain boundary clause', () => {
    const [bi] = buildBoundedInterpretations([intent()], [
      result({ claim_id: 'CLAIM-OK-v1', candidate_statement: 'Established statement.', applicability: { status: 'established' } }),
      result({ claim_id: 'CLAIM-UNRES-v1', candidate_statement: 'Unresolved statement.', applicability: { status: 'unresolved', unresolved_requirements: [US_REQ] } }),
    ])
    expect(bi.status).toBe('relevant_applicability_unresolved')
    const text = bi.summary_blocks.join(' ')
    expect(text).toContain('Established statement.')
    expect(text).toContain('Unresolved statement.')
    // the established claim's statement is NOT swallowed by the hedge — it keeps the plain boundary clause
    expect(text).toMatch(/Established statement\.\s+This is relevant to/)
    // both claim ids are cited
    expect(bi.supporting_claim_ids.sort()).toEqual(['CLAIM-OK-v1', 'CLAIM-UNRES-v1'])
  })

  test('an unresolved claim under one intent does not affect a SEPARATE intent that is fully established', () => {
    const [ownBi, commBi] = buildBoundedInterpretations(
      [intent({ intent_id: 'own', category: 'copyright_ownership' }), intent({ intent_id: 'comm', intent_text: 'Commercial use', category: 'commercial_use' })],
      [
        result({ matched_goal_category: 'copyright_ownership', claim_id: 'CLAIM-OWN-v1', applicability: { status: 'unresolved', unresolved_requirements: [US_REQ] } }),
        result({ matched_goal_category: 'commercial_use', claim_id: 'CLAIM-COMM-v1', candidate_statement: 'Commercial statement.', applicability: { status: 'established' } }),
      ],
    )
    expect(ownBi.status).toBe('relevant_applicability_unresolved')
    expect(commBi.status).toBe('directly_relevant') // NOT contaminated
  })

  test('both project dependencies AND unresolved applicability on the same claim → one relevant_applicability_unresolved', () => {
    const [bi] = buildBoundedInterpretations([intent()], [
      result({ unresolved_project_dependencies: ['human_contribution_description'], applicability: { status: 'unresolved', unresolved_requirements: [US_REQ] } }),
    ])
    expect(bi.status).toBe('relevant_applicability_unresolved')
  })
})

describe('precedence — determination_request is still the BI semantic ceiling', () => {
  test('determination_request scope + a matching claim with unresolved applicability → determination_declined (unresolved applicability never seen)', () => {
    const [bi] = buildBoundedInterpretations([intent({ scope: 'determination_request' })], [
      result({ applicability: { status: 'unresolved', unresolved_requirements: [US_REQ] } }),
    ])
    expect(bi.status).toBe('determination_declined')
    expect(bi.supporting_claim_ids).toEqual([])
  })

  test('determination_request scope + a matching claim with established applicability → determination_declined', () => {
    const [bi] = buildBoundedInterpretations([intent({ scope: 'determination_request' })], [
      result({ applicability: { status: 'established' } }),
    ])
    expect(bi.status).toBe('determination_declined')
  })
})

describe('the correction lives AT OR BEFORE the BI boundary — no composition workaround possible', () => {
  const BI_CORE = ['build-bounded-interpretation.ts', 'rules.ts', 'types.ts']
  const dir = path.join(__dirname, '..', '..', 'lib', 'bounded-interpretation')
  const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf-8')
  const codeOnly = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

  test.each(BI_CORE)('%s imports no HRR / reviewer-lk / CRC-orchestration type; no `if (unresolved) soften` composition hack', (f) => {
    const src = read(f)
    const importLines = (src.match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')
    expect(importLines).not.toMatch(/@\/lib\/hrr|@\/lib\/reviewer-lk|@\/lib\/crc-engine|@\/lib\/crc-sales/)
    // BI decides status BEFORE emitting summary — no "post-process a directly_relevant summary if applicability unresolved"
    expect(src).not.toMatch(/soften|downgrade|weaken.*directly_relevant|if.*applicability.*directly_relevant/i)
  })

  test('BI status for an unresolved-applicability result is decided by build-bounded-interpretation.ts, not by any downstream consumer', () => {
    // the status is already `relevant_applicability_unresolved` in the BI output itself
    const [bi] = buildBoundedInterpretations([intent()], [result({ applicability: { status: 'unresolved', unresolved_requirements: [US_REQ] } })])
    expect(bi.status).toBe('relevant_applicability_unresolved')
    // a consumer receiving this cannot be "responsible for noticing" — it's already bounded
  })

  test('build-bounded-interpretation.ts never re-derives applicability (no isApplicable / evaluateApplicabilityDetailed call in code)', () => {
    const code = codeOnly('build-bounded-interpretation.ts')
    expect(code).not.toMatch(/isApplicable\s*\(|evaluateApplicabilityDetailed\s*\(/)
    // it only reads the already-computed status
    expect(code).toMatch(/applicability\?\.status === 'unresolved'/)
  })
})
