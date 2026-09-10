/**
 * CAH-4G.6 — Reviewer Resources HRR presentation contract.
 *
 * The repo has no React render harness (testEnvironment: 'node', no jsdom, no
 * @testing-library/react). Every reviewer-surface guarantee in this project is
 * asserted by SOURCE SCAN — this file follows that convention.
 *
 * Supersedes the CAH-4F `ClaimCard` presentation contract: the topic look-up and
 * the free-form question now render the SAME `HrrResearchAnswer` through ONE
 * `<HrrResearchAnswerView>`. What is verified:
 *   - ONE shared renderer — no topic/question split, no topic-specific branch;
 *   - the Slice-4 consultative hierarchy is the render order (orientation first,
 *     unresolved before provenance, provenance progressive);
 *   - the assessment-authority boundary (Lane 1) is visually distinguishable
 *     from the governed research (Lane 2);
 *   - empty sections are omitted, never rendered as an empty heading;
 *   - no raw `ReviewerLkClaim` serialization as the primary answer;
 *   - neutral styling only (no pass/fail colour, no ✓/✗/PASS/FAIL);
 *   - reviewer-readable topic labels; the request carries the unchanged enum;
 *   - "not assessment evidence" framing present; no commercial-clearance /
 *     legal-advice language; `crc_eligible` / raw `crc_publication_scope` absent;
 *   - no "copy to evidence" / apply / accept control anywhere.
 */

import * as fs from 'fs'
import * as path from 'path'
import { REVIEWER_TOPIC_LABELS, reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
import { GOAL_CATEGORIES } from '@/types/interview-engine'

const APP_ROOT = path.join(__dirname, '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
const codeOnly = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const R = 'app/admin/submissions/[id]/review'
const LOOKUP = `${R}/ReviewerLkLookup.tsx`
const ANSWER_VIEW = `${R}/HrrResearchAnswerView.tsx`
const LK_PANEL = `${R}/ReviewerLkPanel.tsx`
const RESOURCES = `${R}/ReviewerResources.tsx`
const INSPECTOR = `${R}/ReviewerResourcesInspector.tsx`
const SHELL = `${R}/ReviewerShell.tsx`

// ── topic labels ──────────────────────────────────────────────────────────

describe('topic labels — reviewer-readable; the request carries the unchanged enum', () => {
  test('the label map covers exactly GOAL_CATEGORIES minus "unknown"', () => {
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

  test('topic chips: radiogroup of buttons, canonical enum in data-topic, label-only display, a click runs the research', () => {
    const src = codeOnly(LOOKUP)
    expect(src).toMatch(/role="radiogroup"/)
    expect(src).toMatch(/role="radio"/)
    expect(src).toMatch(/data-topic=\{t\}/)
    expect(src).toMatch(/\{reviewerTopicLabel\(t\)\}/)
    // a chip click POSTs { mode: 'topic_pick', topic: <enum t> } — no label round-trip
    expect(src).toMatch(/onResearch\(t\)/)
    expect(src).toMatch(/mode:\s*'topic_pick',\s*topic/)
    expect(src).not.toMatch(/<select\b/)
  })
})

// ── one shared renderer ───────────────────────────────────────────────────

describe('ONE shared renderer — HrrResearchAnswerView', () => {
  const lookup = codeOnly(LOOKUP)
  const view = codeOnly(ANSWER_VIEW)

  test('both entry modes render through <HrrResearchAnswerView answer={...}> — no second renderer', () => {
    expect(lookup).toMatch(/<HrrResearchAnswerView\s+answer=\{[^}]*\}/)
    expect(lookup.match(/HrrResearchAnswerView/g)?.length).toBeGreaterThanOrEqual(1)
    expect(view).toMatch(/answer:\s*HrrResearchAnswer/)
    // no topic-vs-question presentation split
    for (const s of [lookup, view]) {
      expect(s).not.toMatch(/TopicResearchResultView|QuestionResearchResultView|TopicAnswerView|QuestionAnswerView/)
    }
  })

  test('no topic-specific rendering branch — the view never switches on a topic enum value', () => {
    expect(view).not.toMatch(/topic\s*===\s*'(commercial_use|copyright_ownership|copyrightability|likeness|third_party_source_rights)'/)
    expect(view).not.toMatch(/switch\s*\(\s*[a-zA-Z.]*topic[a-zA-Z.]*\s*\)/)
  })

  test('the view is presentational only — no fetch, no db verbs, no re-interpretation, no promotion control', () => {
    expect(view).not.toMatch(/fetch\(|\.insert\s*\(|\.update\s*\(|\.rpc\s*\(/)
    expect(view).not.toMatch(/buildBoundedInterpretations|evaluateApplicabilityDetailed|selectReviewerClaims|runHrrResearch/)
    expect(view).not.toMatch(/summari[sz]e|paraphrase|rephrase|shorten/i)
    expect(view).not.toMatch(/copyToEvidence|applyToWorkbook|acceptClaim|promoteClaim|addToEvidence/i)
  })
})

// ── consultative hierarchy = render order ─────────────────────────────────

describe('render order = the Slice-4 consultative hierarchy', () => {
  const view = codeOnly(ANSWER_VIEW)
  const iOrientation = view.indexOf('topic.orientation')
  const iBiBlocks = view.indexOf('topic.bi_summary_blocks')
  const iConsiderations = view.indexOf('topic.governed_considerations')
  const iApplicability = view.indexOf('topic.applicability')
  const iUnresolved = view.indexOf('topic.unresolved_inputs')
  const iDoesNotApply = view.indexOf('topic.does_not_apply')
  const iBoundary = view.indexOf('topic.boundary_note')
  const iProvenance = view.indexOf('topic.governed_claim_refs')

  test('all hierarchy anchors are present', () => {
    for (const i of [iOrientation, iBiBlocks, iConsiderations, iApplicability, iUnresolved, iDoesNotApply, iBoundary, iProvenance]) {
      expect(i).toBeGreaterThan(-1)
    }
  })

  test('orientation is first; unresolved comes BEFORE the research boundary and BEFORE provenance', () => {
    expect(iOrientation).toBeLessThan(iBiBlocks)
    expect(iBiBlocks).toBeLessThan(iConsiderations)
    expect(iConsiderations).toBeLessThan(iApplicability)
    expect(iApplicability).toBeLessThan(iUnresolved)
    expect(iUnresolved).toBeLessThan(iBoundary)
    expect(iBoundary).toBeLessThan(iProvenance)
  })

  test('orientation is rendered prominently (font-medium / not inside a <details>)', () => {
    // the orientation paragraph carries a prominence class and is not wrapped in <details>
    const orientationBlock = view.slice(iOrientation - 200, iOrientation + 80)
    expect(orientationBlock).toMatch(/font-medium/)
    expect(orientationBlock).not.toMatch(/<summary/)
  })

  test('provenance & withheld sit behind a <details> disclosure (progressive)', () => {
    const provBlock = view.slice(iProvenance - 300)
    expect(provBlock).toMatch(/<details/)
    expect(provBlock).toMatch(/Provenance &amp; governance details|Provenance & governance details/)
    expect(provBlock).toMatch(/topic\.withheld/)
  })

  test('empty sections are omitted — every optional block is guarded by a length check', () => {
    expect(view).toMatch(/topic\.governed_considerations\.length > 0 &&/)
    expect(view).toMatch(/topic\.unresolved_inputs\.length > 0 &&/)
    expect(view).toMatch(/topic\.does_not_apply\.length > 0 &&/)
    expect(view).toMatch(/answer\.topics\.map/)
    // authority note + scope note are conditional too
    expect(view).toMatch(/answer\.assessment_authority_note &&/)
    expect(view).toMatch(/answer\.scope_note &&/)
  })
})

// ── two lanes ─────────────────────────────────────────────────────────────

describe('Lane 1 (assessment authority) is distinguishable from Lane 2 (governed research)', () => {
  const view = codeOnly(ANSWER_VIEW)

  test('the assessment-authority note renders as its own visually distinct region, before the topic blocks', () => {
    const iAuthority = view.indexOf('answer.assessment_authority_note')
    const iTopics = view.indexOf('answer.topics.map')
    expect(iAuthority).toBeGreaterThan(-1)
    expect(iAuthority).toBeLessThan(iTopics)
    const authorityBlock = view.slice(iAuthority, iTopics)
    expect(authorityBlock).toMatch(/role="note"|aria-label="Assessment authority boundary"/)
    // it is a distinct callout (its own border / background), not blended into a topic block
    expect(authorityBlock).toMatch(/border-l-2|rounded-md border/)
  })

  test('the refusal text is the answer field verbatim — the view adds no yes/no, no "although … this looks fine"', () => {
    expect(view).toMatch(/\{answer\.assessment_authority_note\}/)
    expect(view).not.toMatch(/looks fine|although|however,? (this|it)/i)
  })
})

// ── neutral styling ───────────────────────────────────────────────────────

describe('neutral styling — no pass/fail, no evidence/clearance language', () => {
  const view = read(ANSWER_VIEW)
  const lookup = read(LOOKUP)

  test('no green/red pass-fail colour tokens', () => {
    for (const src of [view, lookup]) {
      expect(src).not.toMatch(/#(dc2626|ef4444|f87171|16a34a|22c55e|15803d|4ade80|dcfce7|fee2e2)/i)
      expect(src).not.toMatch(/\b(text|bg|border)-(red|green|emerald|rose)-\d{2,3}\b/)
    }
  })

  test('no PASS/FAIL/checkmark/cross glyphs', () => {
    for (const src of [codeOnly(ANSWER_VIEW), codeOnly(LOOKUP)]) {
      expect(src).not.toMatch(/PASS|FAIL|✓|✗|✅|❌/)
    }
  })

  test('per-requirement status is rendered verbatim ({o.status}), never remapped to pass/fail words', () => {
    expect(codeOnly(ANSWER_VIEW)).toMatch(/\{o\.status\}/)
  })

  test('no "assessment evidence" / "commercial clearance" / "legal advice" claim in the surface', () => {
    for (const src of [view, lookup]) {
      expect(src).not.toMatch(/is assessment evidence|as assessment evidence|commercially cleared by|constitutes (legal|commercial) advice/i)
    }
    // the honest disclaimers ARE present
    expect(lookup).toMatch(/not assessment evidence/i)
    expect(lookup).toMatch(/[Nn]ot legal advice/)
    expect(lookup).toMatch(/not a commercial-clearance determination/i)
  })

  test('crc_eligible / raw crc_publication_scope are never rendered (the contract does not carry them)', () => {
    for (const src of [codeOnly(ANSWER_VIEW), codeOnly(LOOKUP)]) {
      expect(src).not.toMatch(/crc_eligible|crc_publication_scope|CRC channel/)
    }
  })
})

// ── inspector / framing unchanged ─────────────────────────────────────────

describe('inspector grouping + reference framing (unchanged by CAH-4G.6)', () => {
  test('ReviewerResources is a server component handing both views to the client inspector as slots', () => {
    const src = codeOnly(RESOURCES)
    expect(read(RESOURCES)).not.toMatch(/^'use client'/m)
    expect(src).toMatch(/<ReviewerResourcesInspector/)
    expect(src).toMatch(/livingKnowledge=\{<ReviewerLkPanel submissionId=\{submissionId\} \/>\}/)
    expect(src).toMatch(/linkedCrcContext=\{<ReviewerCrcContextPanel submissionId=\{submissionId\} \/>\}/)
    expect(src).not.toMatch(/fetch\(|useState|useEffect|\.insert\s*\(|\.update\s*\(|\.rpc\s*\(/)
  })

  test('the inspector only switches modes — no fetch, no write, no workbook coupling; both tabs always mounted', () => {
    const src = codeOnly(INSPECTOR)
    expect(read(INSPECTOR)).toMatch(/^'use client'/m)
    expect(src).not.toMatch(/fetch\(|\.insert\s*\(|\.update\s*\(|\.rpc\s*\(/)
    expect(src).not.toMatch(/WorkbookClient|workbook-schema|@\/lib\/assessments/)
    expect(src).toMatch(/'block' : 'hidden'/)
    expect(src).not.toMatch(/\{mode === '[a-z_]+' && /)
  })

  test('the "not assessment evidence" reference framing is present in the shell chrome and the LK view', () => {
    expect(read(SHELL)).toMatch(/not assessment evidence/i)
    expect(read(LK_PANEL)).toMatch(/REVIEWER_LK_FRAMING\.body/)
    expect(read(LOOKUP)).toMatch(/not assessment evidence/i)
  })

  test('no promotion / apply / accept / approve / clear / pass control anywhere in the reviewer surface', () => {
    for (const rel of [LOOKUP, ANSWER_VIEW, RESOURCES, INSPECTOR, LK_PANEL, SHELL]) {
      const s = codeOnly(rel)
      expect(s).not.toMatch(/>\s*(Add to evidence|Apply to finding|Use as finding|Cite in note|Accept claim|Approve claim)\s*</i)
      expect(s).not.toMatch(/copyToEvidence|applyToWorkbook|acceptClaim|promoteClaim|addToEvidence/i)
    }
  })
})

// ── governed statement is verbatim ───────────────────────────────────────

describe('the governed proposition is the verbatim statement (no paraphrase in the surface)', () => {
  test('the consideration renders statement_verbatim directly — no transform', () => {
    const src = codeOnly(ANSWER_VIEW)
    expect(src).toMatch(/\{c\.statement_verbatim\}/)
    expect(src).not.toMatch(/statement_verbatim[^}]*\.(slice|substring|toUpperCase|replace)\(/)
  })

  test('BI summary blocks are rendered verbatim (no per-block transform)', () => {
    expect(codeOnly(ANSWER_VIEW)).toMatch(/topic\.bi_summary_blocks\.map\(\(block, i\) => \(/)
  })
})
