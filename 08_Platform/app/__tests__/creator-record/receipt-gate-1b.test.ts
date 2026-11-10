/**
 * CR-V2-RECEIPT-GATE-1B — targeted reliability corrections.
 *
 *   G-R1: the three SPIKE-1E preflight paths that could merge different plans
 *         (customer-typed tool names, issuer names containing plan words,
 *         bracketed plans) plus "empty after normalization → unresolved", in
 *         both the comparison and the reconciliation.
 *   G-R2: issuer recognition through the comparison's existing canonical
 *         identity resolution; the product-side factual vocabulary and its
 *         fail-closed rules; a partial vocabulary can never support absence.
 *
 * Deterministic; no model call. Vocabulary entries here are TEST DATA only.
 */

import { comparePlan, COMPARISON_RULES_VERSION, type DeclaredTool } from '@/lib/creator-record/receipt-examination/compare'
import { distinctPlanIdentities, planIdentityTokens, planTokens } from '@/lib/creator-record/receipt-examination/plan-tokens'
import {
  checkVocabularyEntry,
  PROVIDER_PLAN_VOCABULARY,
  vocabularyForTool,
  type ProviderPlanVocabularyEntry,
} from '@/lib/creator-record/receipt-examination/provider-plan-vocabulary'
import type { ExtractedField, PlanCandidate, ReceiptExtraction } from '@/lib/creator-record/receipt-examination/schema'
import { crossCheckPlan } from '@/lib/creator-record/evidence/plan-cross-check'
import { receiptPlanScope } from '@/lib/creator-record/receipt-examination/receipt-plan-scope'
import { reconcileToolEvidence, type ExaminedDocument } from '@/lib/creator-record/evidence/document-observations'
import { resolveSellerIdentity } from '@/lib/creator-record/integration/seller-identity'
import type { TextLayer } from '@/lib/creator-record/evidence/pdf-text-layer'

const P = (value: string): ExtractedField => ({ status: 'present', value, evidence: value })
const cand = (text: string): PlanCandidate => ({ text, evidence: text, context: 'charge_line' })
function ex(issuer: string, plan: string, over: Partial<ReceiptExtraction> = {}): ReceiptExtraction {
  return {
    document_type: 'receipt',
    readability: 'legible',
    issuer_name: P(issuer),
    product_or_plan_name: P(plan),
    transaction_date: P('2026-03-03'),
    service_period_start: { status: 'not_shown', value: null, evidence: null },
    service_period_end: { status: 'not_shown', value: null, evidence: null },
    plan_candidates: [cand(plan)],
    multiple_plans_shown: false,
    instruction_like_text_present: false,
    ...over,
  }
}
const decl = (tool_name: string, plan_type: string): DeclaredTool => ({ tool_name, plan_type, start_date: '2026-03-10', end_date: '2026-03-28' })
const layer = (lines: string[]): TextLayer => ({ status: 'extracted', text: lines.join('\n'), pages: 1 }) as TextLayer

const TODAY = '2026-11-10'
const SHA = 'a'.repeat(64)
const source = (supports: string[]) => ({ url: 'https://example.test/pricing', captured_at: '2026-11-10T14:04:55Z', capture_file: 'captures/test.raw', raw_sha256: SHA, text_sha256: SHA, supports })
const approved = { status: 'approved' as const, approved_by: 'Test Approver', approved_on: '2026-11-10' }
const entry = (over: Partial<ProviderPlanVocabularyEntry> = {}): ProviderPlanVocabularyEntry => ({
  tool_id: 'runway-gen3',
  plan_names: ['Free', 'Standard', 'Pro', 'Max'],
  coverage: 'complete',
  sources: [source(['Free', 'Standard', 'Pro', 'Max'])],
  owner: 'SI8 Product/Operations',
  review_by: '2027-02-10',
  approval: approved,
  ...over,
})

describe('G-R1 normalization (receipt-comparison-v3)', () => {
  test('the rules version is bumped because plan semantics changed', () => {
    expect(COMPARISON_RULES_VERSION).toBe('receipt-comparison-v3')
  })

  test('preflight path 1: customer-typed tool text is never removed from plan text', () => {
    // v2 removed "unlimited" (from the typed tool name) and merged "Pro Unlimited" with "Pro".
    expect(planTokens('Pro Unlimited', ['Runway Unlimited'])).toEqual(['pro'])
    const doc = ex('Runway AI, Inc.', 'Pro Unlimited')
    expect(comparePlan(doc, decl('Runway Unlimited', 'Pro'))).toEqual({ result: 'differs', reason: 'plan_tokens_differ' })
  })

  test('preflight path 2: an issuer name containing plan words never feeds plan tokens', () => {
    // v2 removed "pro" (from the issuer "Pro Tools Inc") and merged "Pro Studio" with "Studio".
    expect(planTokens('Pro Studio', ['Pro Tools Inc'])).toEqual(['studio'])
    expect(comparePlan(ex('Pro Tools Inc', 'Pro Studio'), decl('Pro Tools', 'Studio'))).toEqual({ result: 'differs', reason: 'plan_tokens_differ' })
    expect(comparePlan(ex('Standard Media Ltd', 'Standard'), decl('Runway', 'Pro')).result).toBe('differs')
  })

  test('preflight path 3: bracketed text is kept', () => {
    expect(planTokens('Pro (Unlimited)', [])).toEqual(['pro'])
    expect(planIdentityTokens('Pro (Unlimited)', [])).toEqual(['pro', 'unlimited'])
    expect(comparePlan(ex('Runway AI, Inc.', 'Pro (Unlimited)'), decl('Runway', 'Pro'))).toEqual({ result: 'differs', reason: 'plan_tokens_differ' })
    expect(comparePlan(ex('Runway AI, Inc.', 'Pro Plan (Monthly)'), decl('Runway', 'Pro'))).toEqual({ result: 'consistent', reason: 'plan_tokens_equal' })
  })

  test('empty after normalization is unresolved, never equal', () => {
    expect(comparePlan(ex('Runway AI, Inc.', 'Runway Subscription'), decl('Runway', 'Plan'))).toEqual({ result: 'unresolved', reason: 'plan_not_identifiable' })
    expect(comparePlan(ex('Runway AI, Inc.', 'Pro'), decl('Runway', '(Monthly)'))).toEqual({ result: 'unresolved', reason: 'plan_not_identifiable' })
  })

  test('only a LEADING run of a resolved canonical identifier is removed', () => {
    expect(planIdentityTokens('Runway Pro Plan', ['runway-gen3'])).toEqual(['pro'])
    expect(planIdentityTokens('Pro Runway', ['runway-gen3'])).toEqual(['pro', 'runway'])
    expect(comparePlan(ex('Runway AI, Inc.', 'Runway Standard Plan (Monthly)'), decl('Runway Gen-3', 'Standard')).result).toBe('consistent')
  })

  test('a leading product name is removed only when the existing alias resolution maps it to the same tool', () => {
    // "dream machine" is an existing alias of `luma`; it is removed because it resolves, not because the customer typed it.
    expect(comparePlan(ex('Luma AI, Inc.', 'Dream Machine Plus (Monthly)'), decl('Luma Dream Machine', 'Plus'))).toEqual({ result: 'consistent', reason: 'plan_tokens_equal' })
    expect(planIdentityTokens('Dream Machine Plus', ['luma'], () => null)).toEqual(['dream', 'machine', 'plus'])
    // A phrase resolving to a different tool is not removed.
    expect(planIdentityTokens('Dream Machine Plus', ['pika'], (p) => (p === 'dream machine' ? 'luma' : null))).toEqual(['dream', 'machine', 'plus'])
  })

  test('conflicting observations still conflict under the new keys', () => {
    const doc = ex('Runway AI, Inc.', 'Pro', { plan_candidates: [cand('Pro'), cand('Pro (Team trial)')] })
    expect(distinctPlanIdentities(doc, ['runway-gen3'])).toEqual(['pro', 'pro team trial'])
    expect(comparePlan(doc, decl('Runway', 'Pro'))).toEqual({ result: 'unresolved', reason: 'plan_candidates_conflict' })
  })

  test('reconciliation: the printed issuer name no longer feeds plan tokens; seller identity is unchanged', () => {
    const doc: ExaminedDocument = { document_id: 'd1', outcome: 'document_examined', extraction: ex('Pika Pro Inc', 'Pro Standard') } as unknown as ExaminedDocument
    const pikaSeller = () => ({ kind: 'canonical', tool_id: 'pika' }) as ReturnType<typeof resolveSellerIdentity>
    const r = reconcileToolEvidence({ tool_index: 0, declared_tool_id: 'pika', declared_plan: 'Standard', document: doc } as Parameters<typeof reconcileToolEvidence>[0], pikaSeller)
    expect(r.plan).toEqual({ result: 'appears_to_conflict', reason: 'different_plan_name' })
    // The reconciliation's own seller identity still refuses suffix stripping.
    expect(resolveSellerIdentity('Runway AI, Inc.')).toEqual({ kind: 'unrecognized' })
  })
})

describe('G-R2 product-side vocabulary (fail closed)', () => {
  test('ships with no approved entries until the approval authority signs off', () => {
    expect(PROVIDER_PLAN_VOCABULARY).toHaveLength(0)
    expect(vocabularyForTool('runway-gen3', TODAY)).toEqual({ status: 'unusable', reason: 'vocabulary_not_found' })
  })

  test('approved, in date, fully sourced → usable', () => {
    expect(checkVocabularyEntry(entry(), TODAY)).toEqual({ status: 'usable', tool_id: 'runway-gen3', plan_names: ['Free', 'Standard', 'Pro', 'Max'], complete: true })
  })

  test.each([
    ['proposed', entry({ approval: { status: 'proposed' } }), 'vocabulary_not_approved'],
    ['approver missing', entry({ approval: { status: 'approved', approved_by: ' ', approved_on: '2026-11-10' } }), 'vocabulary_not_approved'],
    ['overdue', entry({ review_by: '2026-11-09' }), 'vocabulary_review_overdue'],
    ['bad review date', entry({ review_by: 'soon' }), 'vocabulary_review_overdue'],
    ['no sources', entry({ sources: [] }), 'vocabulary_insufficiently_sourced'],
    ['a name no capture supports', entry({ plan_names: ['Free', 'Standard', 'Pro', 'Max', 'Unlimited'] }), 'vocabulary_insufficiently_sourced'],
    ['malformed hash', entry({ sources: [{ ...source(['Free', 'Standard', 'Pro', 'Max']), text_sha256: 'x' }] }), 'vocabulary_insufficiently_sourced'],
    ['non-https source', entry({ sources: [{ ...source(['Free', 'Standard', 'Pro', 'Max']), url: 'http://example.test' }] }), 'vocabulary_insufficiently_sourced'],
    ['empty names', entry({ plan_names: [] }), 'vocabulary_insufficiently_sourced'],
    ['no owner', entry({ owner: '' }), 'vocabulary_insufficiently_sourced'],
  ] as [string, ProviderPlanVocabularyEntry, string][])('%s → unusable', (_label: string, e: ProviderPlanVocabularyEntry, reason: string) => {
    expect(checkVocabularyEntry(e, TODAY)).toEqual({ status: 'unusable', reason })
  })

  test('duplicate entries for one tool → unusable', () => {
    expect(vocabularyForTool('runway-gen3', TODAY, [entry(), entry()])).toEqual({ status: 'unusable', reason: 'vocabulary_duplicate' })
  })
})

describe('G-R2 issuer recognition and execution', () => {
  const scope = receiptPlanScope(TODAY, [entry(), entry({ tool_id: 'higgsfield', plan_names: ['Team', 'Scale', 'Enterprise'], coverage: 'partial', sources: [source(['Team', 'Scale', 'Enterprise'])] })])

  test('a legal-entity issuer resolves through the comparison resolver (no new mapping)', () => {
    expect(scope('Runway AI, Inc.')).toEqual({ status: 'established', provider: 'runway-gen3', vocabulary: ['Free', 'Standard', 'Pro', 'Max'], complete: true })
    expect(scope('Runway')).toEqual(expect.objectContaining({ status: 'established', provider: 'runway-gen3' }))
  })

  test('no, unrecognised or vocabulary-less issuer → unavailable', () => {
    expect(scope(null)).toEqual({ status: 'unavailable', reason: 'provider_not_shown' })
    expect(scope('ResellerHub Payments Ltd')).toEqual({ status: 'unavailable', reason: 'provider_not_recognized' })
    expect(scope('Pika Labs, Inc.')).toEqual({ status: 'unavailable', reason: 'vocabulary_not_found' })
    expect(receiptPlanScope(TODAY)('Runway AI, Inc.')).toEqual({ status: 'unavailable', reason: 'vocabulary_not_found' })
  })

  test('executes on a legal-entity Runway PDF: an unreported plan name → other_plan_names_found', () => {
    const doc = ex('Runway AI, Inc.', 'Pro Plan (Monthly)')
    const cc = crossCheckPlan(doc, layer(['Runway AI, Inc.', 'Standard subscription receipt', 'Pro Plan (Monthly) $35.00']), scope('Runway AI, Inc.'))
    expect(cc).toEqual(expect.objectContaining({ status: 'other_plan_names_found', provider: 'runway-gen3', other_plan_names: [{ name: 'Standard', excerpt: 'Standard subscription receipt' }] }))
  })

  test('executes on a clean Runway PDF: nothing missing → no_other_plan_names_found', () => {
    const doc = ex('Runway AI, Inc.', 'Pro Plan (Monthly)')
    expect(crossCheckPlan(doc, layer(['Runway AI, Inc.', 'Receipt', 'Pro Plan (Monthly) $35.00']), scope('Runway AI, Inc.')).status).toBe('no_other_plan_names_found')
  })

  test('a partial vocabulary can find conflicts but never establishes absence', () => {
    const doc = ex('Higgsfield, Inc.', 'Creator')
    expect(crossCheckPlan(doc, layer(['Higgsfield, Inc.', 'Creator $49']), scope('Higgsfield, Inc.'))).toEqual(expect.objectContaining({ status: 'provider_scope_unavailable', reason: 'vocabulary_incomplete', provider: null }))
    expect(crossCheckPlan(doc, layer(['Higgsfield, Inc.', 'Creator $49', 'Upgrade to Team']), scope('Higgsfield, Inc.')).status).toBe('other_plan_names_found')
  })
})
