/**
 * CAA-PRODUCT-A-2 — Product A projection: wording lock and lane separation.
 */
import {
  PREVIEW_BANNER,
  PREVIEW_DISCLAIMER,
  PRODUCTION_REVIEW_TEMPLATES,
  projectProductionReview,
} from '@/lib/production-review/project-production-review'
import { runProductionReview } from '@/lib/production-review/run-production-review'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

function preview(tools: unknown, extra: Record<string, unknown> = {}) {
  return projectProductionReview(
    runProductionReview(
      { tools_used: tools, territory_preferences: 'United States', third_party_assets: null, audio_disclosure: null, ...extra },
      TOPIC_CLAIMS_FIXTURE,
    ),
  )
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out))
  return out
}

// Authored wording may never assert clearance, compliance, certification,
// entitlement or verification. "not independently checked" / "last verified"
// are the only permitted uses of related terms outside the disclaimer.
const BANNED =
  /\b(cleared|clearance|compliant|compliance|certif\w*|approved|satisf\w*|entitle\w*|guarantee\w*|valid licen[cs]e|legally|lawful)\b/i
const BANNED_VERIFIED = /\bverified\b/i
const PRODUCT_B_VOCABULARY = /Partially Verified|Not Provided|EVIDENCE_SUPPORTS|MATERIAL_RISKS|INSUFFICIENT_EVIDENCE|COMMERCIAL AUDIT PASSED/

describe('Product A templates', () => {
  const authored = collectStrings(PRODUCTION_REVIEW_TEMPLATES)

  test('authored templates contain no clearance / certification / verification language', () => {
    for (const s of authored) {
      expect(s).not.toMatch(BANNED)
      expect(s).not.toMatch(BANNED_VERIFIED)
      expect(s).not.toMatch(PRODUCT_B_VOCABULARY)
    }
  })

  test('banner and disclaimer are fixed and explicit', () => {
    expect(PREVIEW_BANNER).toBe('INTERNAL PRODUCT A PREVIEW — NOT CUSTOMER-FACING')
    const d = PREVIEW_DISCLAIMER.join(' ')
    expect(d).toMatch(/not legal advice/)
    expect(d).toMatch(/not proof of subscription/)
    expect(d).toMatch(/not proof of a license/)
    expect(d).toMatch(/does not authorize customer publication/)
  })
})

describe('projectProductionReview', () => {
  const cases: Record<string, unknown> = {
    runway: [{ tool_name: 'Runway Gen-3', plan_type: 'Pro', receipt_path: 'u/receipts/r.pdf' }],
    kling: [{ tool_name: 'Kling AI', plan_type: 'Pro' }],
    pika: [{ tool_name: 'Pika', plan_type: 'Pro' }],
    unknown: [{ tool_name: 'Sora' }, { tool_name: 'Nimbus Video X' }],
    malformed: 'not json',
  }

  test.each(Object.keys(cases))('%s: rendered output (excluding governed statements and disclaimer) passes the wording lock', (k) => {
    const p = preview(cases[k], { audio_disclosure: { source_type: 'licensed' } })
    const governed = new Set([...p.conditions, ...p.not_applying].map((c) => c.governed_statement))
    const rendered = collectStrings({ ...p, disclaimer: [], knowledge_provenance: [] }).filter((s) => !governed.has(s))
    for (const s of rendered) {
      expect(s).not.toMatch(BANNED)
      expect(s).not.toMatch(BANNED_VERIFIED)
      expect(s).not.toMatch(PRODUCT_B_VOCABULARY)
    }
    expect(p.banner).toBe(PREVIEW_BANNER)
  })

  test('Kling: applicability, fact basis, dependencies and conclusion stay in separate lanes', () => {
    const p = preview(cases.kling)
    const member = p.conditions.find((c) => c.claim_id === 'CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1')!
    expect(member.applicability).toBe('applies_if')
    expect(member.applicability_label).toBe(PRODUCTION_REVIEW_TEMPLATES.applicability.applies_if)
    expect(member.fact_basis_label).toBe(PRODUCTION_REVIEW_TEMPLATES.factBasis.customer_declared)
    expect(member.unresolved.join(' ')).toMatch(/Member Account/)
    expect(member.permitted_conclusion).toMatch(/remains unresolved/)
    expect(member.claim_version).toBe('v1')
    expect(member.last_verified).toBe('2026-09-02')
  })

  test('Runway: receipt presence is reported but never treated as evidence of entitlement', () => {
    const p = preview(cases.runway)
    expect(p.tools[0].receipt).toBe(PRODUCTION_REVIEW_TEMPLATES.receipt.presented)
    const c = p.conditions.find((x) => x.claim_id === 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1')!
    expect(c.permitted_conclusion).toMatch(/has not examined evidence/)
    expect(c.permitted_conclusion).toMatch(/does not determine that the use is permitted/)
  })

  test('Pika: plan-gated conclusion states that a declared plan is not proof', () => {
    const p = preview(cases.pika)
    const pro = p.conditions.find((x) => x.claim_id === 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1')!
    expect(pro.permitted_conclusion).toBe(PRODUCTION_REVIEW_TEMPLATES.conclusion.appliesOnDeclaredFact.replace(/\{tool\}/g, 'pika'))
    expect(p.not_applying.map((c) => c.claim_id).sort()).toEqual([
      'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1',
      'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1',
    ])
  })

  test('unknown tools: identity gap and coverage limitation, no conditions', () => {
    const p = preview(cases.unknown)
    expect(p.conditions).toEqual([])
    expect(p.tools.map((t) => t.identity)).toEqual([
      PRODUCTION_REVIEW_TEMPLATES.toolIdentity.unrecognized,
      PRODUCTION_REVIEW_TEMPLATES.toolIdentity.unrecognized,
    ])
    expect(p.coverage_limitations.join('\n')).toMatch(/Sora: tool identity could not be resolved/)
  })

  test('territory is labelled as context, never as jurisdiction', () => {
    const p = preview(cases.runway)
    expect(p.declared_distribution_territory).toBe('United States')
    expect(p.coverage_limitations).toContain(PRODUCTION_REVIEW_TEMPLATES.coverage.territory)
  })

  test('malformed input renders only the unreadable notice', () => {
    const p = preview(cases.malformed)
    expect(p.status).toBe('input_unreadable')
    expect(p.conditions).toEqual([])
    expect(p.missing_information).toEqual([PRODUCTION_REVIEW_TEMPLATES.unreadable])
  })

  test('every rendered template placeholder is filled', () => {
    for (const k of Object.keys(cases)) {
      const strings = collectStrings(preview(cases[k], { third_party_assets: { has_third_party: true, items: [{}] }, audio_disclosure: { source_type: 'licensed' } }))
      for (const s of strings) expect(s).not.toMatch(/\{[a-z_]+\}/)
    }
  })
})
