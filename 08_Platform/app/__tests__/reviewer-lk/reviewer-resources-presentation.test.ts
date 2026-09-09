/**
 * CAH-4F / CAH-4F.1 — Reviewer Resources presentation contract.
 *
 * The repo has no React render harness (no @testing-library/react, no jsdom).
 * Every reviewer-surface guarantee in this project is asserted by SOURCE SCAN
 * (see `authority-firewall.test.ts` and `reviewer-shell.test.ts`) — this file
 * follows that convention, plus one real data-path check that both applicability
 * states are reachable from the live fixtures.
 *
 * Verifies (CAH-4F semantic work, carried unchanged into the CAH-4F.1 inspector):
 *   - reviewer-readable topic labels; API value unchanged;
 *   - result order: proposition → Applicability → Context → limitations → provenance;
 *   - explicit "Applicability" heading; neutral (non pass/fail) styling;
 *   - "Context used for this look-up" wording;
 *   - raw `crc_publication_scope` prose absent; `crc_eligible` absent;
 *   - "not assessment evidence" framing present;
 *   - no promotion control / button.
 */

import * as fs from 'fs'
import * as path from 'path'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { REVIEWER_TOPIC_LABELS, reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
import { GOAL_CATEGORIES } from '@/types/interview-engine'

const APP_ROOT = path.join(__dirname, '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
const codeOnly = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const LOOKUP = 'app/admin/submissions/[id]/review/ReviewerLkLookup.tsx'
const LK_PANEL = 'app/admin/submissions/[id]/review/ReviewerLkPanel.tsx'
const RESOURCES = 'app/admin/submissions/[id]/review/ReviewerResources.tsx'
const INSPECTOR = 'app/admin/submissions/[id]/review/ReviewerResourcesInspector.tsx'
const SHELL = 'app/admin/submissions/[id]/review/ReviewerShell.tsx'

describe('FR-2 — reviewer-readable topic labels; API value is the unchanged enum', () => {
  test('the label map covers exactly the reviewer topics (GOAL_CATEGORIES minus "unknown")', () => {
    expect(Object.keys(REVIEWER_TOPIC_LABELS).sort()).toEqual(
      GOAL_CATEGORIES.filter((c) => c !== 'unknown').sort(),
    )
  })

  test('every label is plain English — no snake_case, not the raw enum', () => {
    for (const [enumValue, label] of Object.entries(REVIEWER_TOPIC_LABELS)) {
      expect(label).not.toMatch(/_/)
      expect(label).not.toEqual(enumValue)
      expect(label.length).toBeGreaterThan(0)
    }
  })

  test('reviewerTopicLabel never throws / never blanks on an unmapped value', () => {
    expect(reviewerTopicLabel('some_future_topic')).toBe('Some future topic')
    expect(reviewerTopicLabel('commercial_use')).toBe('Commercial use')
  })

  test('CAH-4F.1: topic chips carry the canonical enum in data-topic and render the label only', () => {
    const src = codeOnly(LOOKUP)
    // the fetch URL still carries the raw enum topic
    expect(src).toMatch(/topic=\$\{encodeURIComponent\(topic\)\}/)
    // the chip control is a radiogroup of buttons (not <select>), each carrying
    // the canonical value in data-topic and displaying only the reviewer label
    expect(src).toMatch(/role="radiogroup"/)
    expect(src).toMatch(/role="radio"/)
    expect(src).toMatch(/data-topic=\{t\}/)
    expect(src).toMatch(/\{reviewerTopicLabel\(t\)\}/)
    // onChange receives the enum value `t` itself (no label round-trip)
    expect(src).toMatch(/onClick=\{\(\) => onChange\(t\)\}/)
    // no free-text input
    expect(src).not.toMatch(/<textarea|<input\b/)
  })
})

describe('FR-3 — result order: proposition → Applicability → Context → limitations → provenance', () => {
  const src = codeOnly(LOOKUP)
  const iProposition = src.indexOf('claim.statement ?')
  const iApplicability = src.indexOf('Applicability')
  const iContext = src.indexOf('Context used for this look-up')
  const iLimitations = src.indexOf('Evidence limitations / unresolved requirements')
  const iProvenance = src.indexOf('Provenance and governance details')

  test('all five sections are present', () => {
    for (const i of [iProposition, iApplicability, iContext, iLimitations, iProvenance]) {
      expect(i).toBeGreaterThan(-1)
    }
  })

  test('they appear in the required order', () => {
    expect(iProposition).toBeLessThan(iApplicability)
    expect(iApplicability).toBeLessThan(iContext)
    expect(iContext).toBeLessThan(iLimitations)
    expect(iLimitations).toBeLessThan(iProvenance)
  })

  test('governance/provenance metadata sits behind a disclosure, after the proposition', () => {
    const provBlock = src.slice(iProvenance)
    expect(provBlock).toMatch(/claim\.claim_id/)
    expect(provBlock).toMatch(/claim\.publication_scope/)
    expect(provBlock).toMatch(/governed_claims_reference/)
    // the provenance block is inside a <Disclosure> (which renders <details>)
    expect(src.slice(0, iProvenance)).toMatch(/function Disclosure[\s\S]*<details/)
  })
})

describe('FR-4 — Applicability: explicit heading, neutral styling, verbatim status', () => {
  const src = read(LOOKUP)

  test('there is an explicit "Applicability" heading element', () => {
    expect(src).toMatch(/<h4[^>]*>\s*Applicability\s*<\/h4>/)
  })

  test('states are the neutral pair "Established" / "Not established"', () => {
    expect(src).toMatch(/Established/)
    expect(src).toMatch(/Not established/)
  })

  test('"Not established" is explicitly framed as NOT a negative finding (SR-2)', () => {
    expect(src).toMatch(/not a\s+negative finding/i)
  })

  test('no green/red pass-fail colour tokens anywhere in the reviewer lookup', () => {
    expect(src).not.toMatch(/#(dc2626|ef4444|f87171|16a34a|22c55e|15803d|4ade80|dcfce7|fee2e2)/i)
    expect(src).not.toMatch(/\b(text|bg|border)-(red|green|emerald|rose)-\d{2,3}\b/)
    expect(src).not.toMatch(/color:\s*['"]?(red|green)['"]?/i)
  })

  test('per-requirement status is rendered verbatim ({o.status}), never remapped to pass/fail words', () => {
    const src2 = codeOnly(LOOKUP)
    expect(src2).toMatch(/\{o\.status\}/)
    expect(src2).not.toMatch(/PASS|FAIL|✓|✗|✅|❌/)
  })
})

describe('FR-5 / SR-3 — context block wording', () => {
  const src = read(LOOKUP)

  test('the context block is titled "Context used for this look-up"', () => {
    expect(src).toMatch(/Context used for this look-up/)
  })

  test('the old broad "Retrieval context (submission facts — not evidence)" wording is gone', () => {
    expect(src).not.toMatch(/Retrieval context \(submission facts/)
  })

  test('the context is explicitly labelled not-evidence', () => {
    expect(src).toMatch(/not assessment evidence/i)
  })

  test('it names the resolved tools + jurisdiction actually used', () => {
    expect(src).toMatch(/Resolved tools/)
    expect(src).toMatch(/Jurisdiction/)
    const code = codeOnly(LOOKUP)
    expect(code).toMatch(/retrieval_context\.resolved_tool_ids/)
    expect(code).toMatch(/retrieval_context\.jurisdiction_included/)
  })
})

describe('FR-6 / FR-7 / SR-4 / SR-5 — CRC-channel governance metadata is not reviewer authority text', () => {
  const src = codeOnly(LOOKUP)

  test('raw crc_publication_scope prose is not rendered at all', () => {
    expect(src).not.toMatch(/crc_publication_scope/)
    expect(read(LOOKUP)).not.toMatch(/Scope of the statement:/)
  })

  test('crc_eligible / "CRC channel" is not shown', () => {
    expect(src).not.toMatch(/crc_eligible/)
    expect(read(LOOKUP)).not.toMatch(/CRC channel/)
  })

  test('the structured publication_scope tag IS still available (behind provenance disclosure)', () => {
    expect(src).toMatch(/claim\.publication_scope/)
  })
})

describe('FR-1 / FR-8 — inspector: grouping only, no promotion control', () => {
  test('ReviewerResources is a server component that hands both views to the client inspector as slots', () => {
    const src = codeOnly(RESOURCES)
    expect(read(RESOURCES)).not.toMatch(/^'use client'/m)
    expect(src).toMatch(/<ReviewerResourcesInspector/)
    expect(src).toMatch(/livingKnowledge=\{<ReviewerLkPanel submissionId=\{submissionId\} \/>\}/)
    expect(src).toMatch(/linkedCrcContext=\{<ReviewerCrcContextPanel submissionId=\{submissionId\} \/>\}/)
    expect(src).not.toMatch(/fetch\(|useState|useEffect|\.insert\s*\(|\.update\s*\(|\.rpc\s*\(/)
  })

  test('the inspector only switches modes — no fetch, no write, no workbook coupling', () => {
    const src = codeOnly(INSPECTOR)
    expect(read(INSPECTOR)).toMatch(/^'use client'/m)
    expect(src).not.toMatch(/fetch\(|\.insert\s*\(|\.update\s*\(|\.rpc\s*\(/)
    expect(src).not.toMatch(/WorkbookClient|workbook-schema|@\/lib\/assessments/)
    // both slots are ALWAYS rendered (visibility toggled by class, never
    // conditionally mounted) so a completed look-up survives a tab switch
    expect(src).toMatch(/\{livingKnowledge\}/)
    expect(src).toMatch(/\{linkedCrcContext\}/)
    expect(src).toMatch(/'block' : 'hidden'/)
    expect(src).not.toMatch(/\{mode === '[a-z_]+' && /)
  })

  test('the "not assessment evidence" reference framing is present in the shell chrome and the LK view', () => {
    expect(read(SHELL)).toMatch(/not assessment evidence/i)
    expect(read(LK_PANEL)).toMatch(/REVIEWER_LK_FRAMING\.body/)
    expect(read(LOOKUP)).toMatch(/not assessment evidence/i)
  })

  test('no promotion / apply / accept / approve / clear / pass control anywhere in the reviewer surface', () => {
    for (const rel of [LOOKUP, RESOURCES, INSPECTOR, LK_PANEL, SHELL]) {
      const s = codeOnly(rel)
      expect(s).not.toMatch(/>\s*(Add to evidence|Apply to finding|Use as finding|Cite in note|Accept claim|Approve claim)\s*</i)
      expect(s).not.toMatch(/copyToEvidence|applyToWorkbook|acceptClaim|promoteClaim|addToEvidence/i)
    }
  })
})

describe('SR-1 — proposition is the verbatim governed statement (no paraphrase in the surface)', () => {
  test('the card renders claim.statement directly — no transform', () => {
    const src = codeOnly(LOOKUP)
    expect(src).toMatch(/\{claim\.statement\}/)
    expect(src).not.toMatch(/summari[sz]e|paraphrase|rephrase|shorten/i)
  })
})

describe('data path — both applicability states are reachable from the live fixtures (one Established, one Not established)', () => {
  const NO_FACTS = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

  test('copyright_ownership yields an Established claim (no requirements → vacuously applicable)', () => {
    const sel = selectReviewerClaims({
      topic: 'copyright_ownership',
      topicClaims: TOPIC_CLAIMS_FIXTURE,
      assetProviderIds: [],
      activeToolIds: [],
      applicabilityFacts: NO_FACTS,
    })
    expect(sel.claims.filter((c) => c.applicability_established).length).toBeGreaterThanOrEqual(1)
  })

  test('copyrightability yields a Not-established claim with an unresolved requirement (not withheld, not a finding)', () => {
    const sel = selectReviewerClaims({
      topic: 'copyrightability',
      topicClaims: TOPIC_CLAIMS_FIXTURE,
      assetProviderIds: [],
      activeToolIds: [],
      applicabilityFacts: NO_FACTS,
    })
    const notEstablished = sel.claims.filter((c) => !c.applicability_established)
    expect(notEstablished.length).toBeGreaterThanOrEqual(1)
    for (const c of notEstablished) {
      for (const o of c.applicability_outcomes) {
        expect(['met', 'unresolved', 'not_met']).toContain(o.status)
      }
    }
  })
})
