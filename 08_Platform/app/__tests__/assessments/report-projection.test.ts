/**
 * CA-RLK-2b — Bounded report projection.
 *
 * These tests pin the semantic contract of `lib/assessments/reportProjection.ts`:
 * the report may only assert propositions traceable to signed assessment state,
 * reviewer-authored text, or an actual submission artifact. No bare judgment
 * value (including `Verified`) entitles the report to say "[documentation
 * category] was reviewed", and every fail-closed path resolves to OMIT or a
 * governed neutral value — never a strengthened or invented negative fact.
 *
 * Run: npx jest __tests__/assessments/report-projection.test.ts
 */

import fs from 'fs'
import path from 'path'
import {
  projectReport,
  domainWorstJudgment,
  DOMAIN_CONTROLS,
  type ReportProjectionInput,
} from '@/lib/assessments/reportProjection'
import { ASSESSMENT_DOMAINS } from '@/types/assessment'

// ── Fixtures ────────────────────────────────────────────────────────────────

const EMPTY_SECTION_3: Record<string, any> = Object.fromEntries(
  ['A01', 'R01', 'R02', 'R03', 'R04', 'H01', 'H02', 'I01', 'I02', 'I03', 'L01', 'L02', 'L03', 'T01', 'D01', 'D02'].map(
    (id) => [id, { judgment: '', notes: '' }],
  ),
)

function s3(overrides: Record<string, any> = {}): Record<string, any> {
  const base = JSON.parse(JSON.stringify(EMPTY_SECTION_3))
  for (const [k, v] of Object.entries(overrides)) base[k] = { ...base[k], ...v }
  return base
}

/** All 16 controls set to one judgment (so a domain isn't accidentally Not Provided). */
function s3All(judgment: string, overrides: Record<string, any> = {}): Record<string, any> {
  const base: Record<string, any> = {}
  for (const id of Object.keys(EMPTY_SECTION_3)) base[id] = { judgment, notes: '' }
  for (const [k, v] of Object.entries(overrides)) base[k] = { ...base[k], ...v }
  return base
}

function makeInput(over: Partial<ReportProjectionInput> = {}): ReportProjectionInput {
  return {
    section2: {},
    section3: s3(),
    section5: { findings: [] },
    section6: { outcome: 'INSUFFICIENT_EVIDENCE' },
    section7: { evidence_reviewed: [] },
    submission: { id: 'abc', title: 'Test Content' },
    scopeDomainCodes: null,
    assessmentNumber: 'ASSESS-009-2026-09-08',
    reportDate: '8 September 2026',
    outcomeLabel: 'Insufficient Supporting Evidence',
    intendedUse: 'Agency deliverable',
    ...over,
  }
}

// Strings the projection is FORBIDDEN to ever emit (manufactured review).
const FORBIDDEN_STRINGS = [
  'CertForm submission and attached documentation reviewed.',
  'CertForm submission and production declarations',
  'Submitted video content (independent observation)',
  'Chain of Title',
]

function allStrings(obj: unknown): string[] {
  const out: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(obj)
  return out
}

// ── domainWorstJudgment ─────────────────────────────────────────────────────

describe('domainWorstJudgment', () => {
  it('T0: no accepted judgments → Not Provided (fail closed)', () => {
    expect(domainWorstJudgment('R', s3())).toBe('Not Provided')
  })
  it('T0: Not Provided dominates a Verified sibling', () => {
    expect(
      domainWorstJudgment('R', s3({ R01: { judgment: 'Verified' }, R02: { judgment: 'Not Provided' } })),
    ).toBe('Not Provided')
  })
  it('T0: all-Not-Applicable short-circuits to Not Applicable', () => {
    const all = Object.fromEntries(DOMAIN_CONTROLS['R'].map((id) => [id, { judgment: 'Not Applicable' }]))
    expect(domainWorstJudgment('R', all)).toBe('Not Applicable')
  })
  it('T0: Partially Verified outranks Verified', () => {
    expect(
      domainWorstJudgment('R', s3({ R01: { judgment: 'Verified' }, R02: { judgment: 'Partially Verified' } })),
    ).toBe('Partially Verified')
  })
})

// ── T1 / T2 — evidence-reviewed list is reviewer-authored only ───────────────

describe('evidence reviewed (Section 1 / Section 2)', () => {
  it('T1: authored list is projected verbatim + trimmed', () => {
    const p = projectReport(
      makeInput({ section7: { evidence_reviewed: ['  Kling AI Pro receipt (PDF) ', '', 'Signed custodian declaration'] } }),
    )
    expect(p.evidenceReviewedAuthored).toBe(true)
    expect(p.evidenceReviewedLines).toEqual(['Kling AI Pro receipt (PDF)', 'Signed custodian declaration'])
  })

  it('T2: empty list → fail closed (authored:false, governed fallback, no invented items)', () => {
    const p = projectReport(makeInput({ section7: { evidence_reviewed: [] } }))
    expect(p.evidenceReviewedAuthored).toBe(false)
    expect(p.evidenceReviewedLines).toEqual([])
    expect(p.evidenceReviewedFallback.toLowerCase()).toContain('was not recorded')
  })

  it('T2: whitespace-only entries do not count as authored', () => {
    const p = projectReport(makeInput({ section7: { evidence_reviewed: ['   ', '\n'] } }))
    expect(p.evidenceReviewedAuthored).toBe(false)
  })
})

// ── T3 / T4 — domains assessed is governed scope, not evidence ───────────────

describe('domains assessed', () => {
  it('T3: null scope → all seven methodology domains, with labels', () => {
    const p = projectReport(makeInput({ scopeDomainCodes: null }))
    expect(p.domainsAssessed.map((d) => d.code)).toEqual(ASSESSMENT_DOMAINS.map((d) => d.code))
    expect(p.domainsAssessed.find((d) => d.code === 'H')?.label).toBe('Human Creative Contribution')
  })
  it('T4: explicit scope subset → only those domains', () => {
    const p = projectReport(makeInput({ scopeDomainCodes: ['A', 'R'] }))
    expect(p.domainsAssessed.map((d) => d.code)).toEqual(['A', 'R'])
  })
})

// ── T5 — video independently observed comes from the signed §2 gate ─────────

describe('video independently observed', () => {
  it('T5: first_complete === true → true', () => {
    const p = projectReport(makeInput({ section2: { viewing_passes: { first_complete: true } } }))
    expect(p.videoIndependentlyObserved).toBe(true)
  })
  it('T5: missing / false → false (never assumed)', () => {
    expect(projectReport(makeInput({ section2: {} })).videoIndependentlyObserved).toBe(false)
    expect(
      projectReport(makeInput({ section2: { viewing_passes: { first_complete: false } } })).videoIndependentlyObserved,
    ).toBe(false)
  })
})

// ── T6–T9 — per-domain evidence narrative is bounded & fail-closed ──────────

describe('per-domain evidence narrative', () => {
  it('T6: finding evidence_basis is used as the domain evidence', () => {
    const p = projectReport(
      makeInput({
        section5: { findings: [{ domain: 'R', evidence_basis: 'Kling Pro receipt dated 2026-01, covering the generation window.' }] },
      }),
    )
    expect(p.perDomainEvidence['R']).toContain('Kling Pro receipt dated 2026-01')
  })

  it('T7: control notes are used when there is no finding', () => {
    const p = projectReport(
      makeInput({ section3: s3All('Verified', { R02: { judgment: 'Verified', notes: 'Reviewed the ToS commercial-use clause.' } }) }),
    )
    expect(p.perDomainEvidence['R']).toContain('Reviewed the ToS commercial-use clause.')
  })

  it('T8: all-Not-Applicable domain → governed N/A wording', () => {
    const naL = Object.fromEntries(DOMAIN_CONTROLS['L'].map((id) => [id, { judgment: 'Not Applicable' }]))
    const p = projectReport(makeInput({ section3: { ...s3(), ...naL } }))
    expect(p.perDomainEvidence['L']).toBe('Not applicable to this content.')
  })

  it('T9: Not Provided domain → governed no-evidence wording', () => {
    const p = projectReport(makeInput({ section3: s3() }))
    expect(p.perDomainEvidence['I']).toBe('No evidence was provided for this domain.')
  })

  it('T9: Verified domain with NO authored narrative → explicit "no note recorded", never manufactured review', () => {
    const p = projectReport(makeInput({ section3: s3All('Verified') }))
    const text = p.perDomainEvidence['A']
    expect(text).toBe('The reviewer recorded a domain judgment; no separate domain-level evidence note was entered.')
    expect(text).not.toContain('documentation reviewed')
    expect(text).not.toContain('CertForm')
  })
})

// ── T10–T12 — Supporting Evidence Record (Appendix A, Report Template v0.2) ──

function record(p: ReturnType<typeof projectReport>, label: string) {
  return p.supportingEvidenceRecord.find((f) => f.label === label)
}

describe('supporting evidence record', () => {
  it('T10: no AI tools declared → "None declared" + explicit N/A license status', () => {
    const p = projectReport(makeInput({ submission: { id: 'a', title: 'X', tools_used: [] } }))
    expect(record(p, 'AI tools declared')?.value).toBe('None declared')
    expect(record(p, 'Commercial license status')?.value).toBe('N/A — no AI tools declared')
  })

  it('T10: tool with receipt + R Verified → "Verified — receipt on file"; tool without receipt → "Not provided"', () => {
    const p = projectReport(
      makeInput({
        section3: s3All('Verified'),
        submission: {
          id: 'a',
          title: 'X',
          tools_used: [
            { tool_name: 'Kling', receipt_path: 'u/rec/kling.pdf' },
            { tool_name: 'Runway' },
          ],
        },
      }),
    )
    const sub = record(p, 'Commercial license status')?.sub ?? []
    expect(sub[0].value).toBe('Verified — receipt on file')
    expect(sub[1].value).toBe('Not provided')
  })

  it('T11: Human creative contribution — Verified needs an artifact; Partially is description-only', () => {
    const verified = projectReport(makeInput({ section3: s3All('Verified') }))
    expect(record(verified, 'Human creative contribution')?.sub?.[0].value).toBe(
      'Yes — corroborated by an artifact on file',
    )
    const partial = projectReport(makeInput({ section3: s3All('Partially Verified') }))
    expect(record(partial, 'Human creative contribution')?.sub?.[0].value).toBe(
      "Partial — submitter's description only, no corroborating artifact",
    )
    const missing = projectReport(makeInput({ section3: s3() }))
    expect(record(missing, 'Human creative contribution')?.sub?.[0].value).toBe('No')
  })

  it('T11: audio — licensed with no file → "No"; license_path present → "Yes"; AI-generated → "N/A"', () => {
    const licNoFile = projectReport(
      makeInput({ submission: { id: 'a', title: 'X', audio_disclosure: { source_type: 'licensed' } } }),
    )
    expect(record(licNoFile, 'Audio')?.sub?.find((x) => x.label === 'License on file')?.value).toBe('No')

    const licFile = projectReport(
      makeInput({ submission: { id: 'a', title: 'X', audio_disclosure: { source_type: 'licensed', license_path: 'u/a.pdf' } } }),
    )
    expect(record(licFile, 'Audio')?.sub?.find((x) => x.label === 'License on file')?.value).toBe('Yes')

    const ai = projectReport(
      makeInput({ submission: { id: 'a', title: 'X', audio_disclosure: { source_type: 'ai_generated' } } }),
    )
    expect(record(ai, 'Audio')?.sub?.find((x) => x.label === 'License on file')?.value).toBe('N/A')
  })

  it('T12: likeness — Not Applicable domain → N/A/N/A; release file present → "Yes"', () => {
    const naL = Object.fromEntries(DOMAIN_CONTROLS['L'].map((id) => [id, { judgment: 'Not Applicable' }]))
    const na = projectReport(makeInput({ section3: { ...s3(), ...naL } }))
    const naSub = record(na, 'Likeness / performer')?.sub ?? []
    expect(naSub.find((x) => x.label === 'Real person present')?.value).toBe('N/A')
    expect(naSub.find((x) => x.label === 'Release on file')?.value).toBe('N/A')

    const withRelease = projectReport(makeInput({ submission: { id: 'a', title: 'X', likeness_release_path: 'u/rel.pdf' } }))
    expect(
      record(withRelease, 'Likeness / performer')?.sub?.find((x) => x.label === 'Release on file')?.value,
    ).toBe('Yes')
  })

  it('T12: governed limitation language is present and unweakened', () => {
    const p = projectReport(makeInput())
    expect(p.supportingEvidenceLimitation).toContain('has not conducted')
    expect(p.supportingEvidenceLimitation).toContain('independent title searches')
    expect(p.supportingEvidenceLimitation).toContain('chain of copyright investigations')
    expect(p.supportingEvidenceLimitation).toContain('registrations with any government body')
  })

  it('T12: assessment cross-reference carries the exact ID / date / outcome passed in', () => {
    const p = projectReport(makeInput())
    const sub = record(p, 'Assessment cross-reference')?.sub ?? []
    expect(sub.find((x) => x.label === 'Assessment ID')?.value).toBe('ASSESS-009-2026-09-08')
    expect(sub.find((x) => x.label === 'Overall outcome')?.value).toBe('Insufficient Supporting Evidence')
  })
})

// ── Fail-closed: a near-empty assessment never throws, never invents ────────

describe('fail-closed behaviour', () => {
  it('minimal input does not throw and produces only governed neutral values', () => {
    const p = projectReport(makeInput({ section2: undefined, section3: {}, section5: undefined, section7: {} } as any))
    expect(p.evidenceReviewedAuthored).toBe(false)
    expect(p.videoIndependentlyObserved).toBe(false)
    expect(p.domainsAssessed).toHaveLength(7)
    expect(p.supportingEvidenceRecord.length).toBeGreaterThan(0)
  })

  it('NO projected string is one of the removed manufactured-review phrases', () => {
    const inputs = [
      makeInput({ section3: s3All('Verified') }),
      makeInput({ section3: s3All('Not Applicable') }),
      makeInput({ section3: s3() }),
      makeInput({ section7: { evidence_reviewed: [] } }),
      makeInput({ submission: { id: 'a', title: 'X', tools_used: [] } }),
    ]
    for (const input of inputs) {
      const strings = allStrings(projectReport(input))
      for (const forbidden of FORBIDDEN_STRINGS) {
        expect(strings.some((str) => str.includes(forbidden))).toBe(false)
      }
    }
  })
})

// ── Source guard: the removed drift is gone from Section7Brief.tsx ─────────

describe('Section7Brief.tsx no longer contains the drifted report constructs', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app', 'admin', 'submissions', '[id]', 'review', 'Section7Brief.tsx'),
    'utf8',
  )

  it('buildScopeBox (inferred 8-item checkmark grid) and its Section 1 subsection are deleted', () => {
    expect(src).not.toContain('function buildScopeBox')
    expect(src).not.toContain('function buildScopeSection')
    // the old inferred-grid label rendered as bold body text
    expect(src).not.toContain('*Scope of Independent Review*')
    // the Typst subsection heading it fed
    expect(src).not.toContain('== Scope of Independent Review')
    expect(src).not.toContain("anyNotMissing(['R01', 'R02'])")
  })

  it('getDomainEvidence (manufactured "documentation reviewed" fallback) is deleted', () => {
    expect(src).not.toContain('function getDomainEvidence')
    expect(src).not.toContain('CertForm submission and attached documentation reviewed')
  })

  it('Appendix A is "Supporting Evidence Record", not "Chain of Title", and the false sentence is gone', () => {
    expect(src).toContain('Appendix A: Supporting Evidence Record')
    expect(src).not.toContain('Appendix A: Chain of Title')
    expect(src).not.toContain('as disclosed by the submitter and reviewed by SI8')
  })

  it('Section 2 carries the governed v0.2 "Evidence provided" list, not a synthesised "Evidence reviewed" one', () => {
    expect(src).toContain('*Evidence provided:*')
    expect(src).toContain('*AI tools declared by submitter:*')
    expect(src).not.toContain("'CertForm submission and production declarations'")
    expect(src).not.toContain("'Submitted video content (independent observation)'")
  })

  it('the executive-summary placeholder no longer hard-codes a supportive example outcome', () => {
    expect(src).not.toContain('The evidence reviewed supports the intended commercial use of this content as an agency deliverable')
  })
})
