'use client'

import { useState } from 'react'
import { Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkbookData, DOMAIN_LABELS, OUTCOME_OPTIONS } from './workbook-schema'
import {
  projectReport,
  domainWorstJudgment,
  DOMAIN_CONTROLS,
  type ReportProjection,
  type EvidenceRecordField,
} from '@/lib/assessments/reportProjection'

type S7 = WorkbookData['section_7']
type S6 = WorkbookData['section_6']
type S5 = WorkbookData['section_5']
type S4 = WorkbookData['section_4']
type S3 = WorkbookData['section_3']
type S2 = WorkbookData['section_2']
type S1 = WorkbookData['section_1']

interface Props {
  data: S7
  section6: S6
  section5: S5
  section4: S4
  section3: S3
  section2: S2
  section1: S1
  /** Canonical assessment_number, if one already exists (null before first Generate). */
  assessmentNumber: string | null
  /** Called with the canonical number once ensure-assessment creates/returns it. */
  onAssessmentNumberChange: (assessmentNumber: string) => void
  submission: Record<string, any>
  onChange: (updates: Partial<S7>) => void
}

const CONTROL_LABELS_7: Record<string, string> = {
  A01: 'Identity & Accountability',
  R01: 'Tool Identification', R02: 'Commercial License',
  R03: 'Custom Model Provenance', R04: 'Output Ownership',
  H01: 'Human Contribution', H02: 'Authorship Claim',
  I01: 'Third-Party IP (Visual)', I02: 'Third-Party IP (Audio)', I03: 'Trademarks',
  L01: 'Likeness (Reviewer Observed)', L02: 'Performer Distinctness', L03: 'Likeness Releases',
  T01: 'Technical Provenance',
  D01: 'Date Consistency', D02: 'Retroactive Documentation',
}

const CONTROL_ACTIONS: Record<string, string> = {
  A01: 'Maintain clear records identifying the submitting entity and its relationship to the production.',
  R01: 'Retain AI tool subscription receipts and plan documentation covering the active generation period.',
  R02: 'Confirm and retain documentation of commercial output rights for all AI tools used in production.',
  R03: 'Provide training data provenance documentation for any custom or fine-tuned models used.',
  R04: 'Obtain explicit written confirmation of output ownership rights from the AI tool provider.',
  H01: 'Retain prompt history exports, generation session screenshots, or iteration records for future productions to support independent authorship verification.',
  H02: 'Include an explicit human authorship statement identifying the creative contributor for AI-assisted content.',
  I01: 'Conduct and retain documentation of a third-party intellectual property review for all visual elements.',
  I02: 'Confirm and retain sync and master license documentation for all audio elements before commercial deployment.',
  I03: 'Confirm that no third-party trademarks appear in the content without documented clearance.',
  L01: 'Retain release documentation for any identifiable likenesses appearing in the content.',
  L02: 'Document the basis for any AI-generated performer appearances that could constitute distinctness claims.',
  L03: 'Obtain and retain release agreements for any performer likenesses reproduced in AI-generated output.',
  T01: 'Maintain contemporaneous records of AI generation sessions — including tool logs, prompt records, or exported history — to enable independent technical provenance verification.',
  D01: 'Ensure all tool subscription and licensing records reflect the generation date range of the content.',
  D02: 'Retain all production documentation contemporaneously; retroactive documentation reduces evidentiary weight.',
}

const IMPACT_SORT: Record<string, number> = {
  'Positive — supports clearance': 0,
  'Neutral — informational': 1,
  'Low risk — noted but unlikely': 2,
  'Medium risk — relevant consideration': 3,
  'High risk — material commercial concern': 4,
}

// Escape special Typst characters in plain text strings
function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/@/g, '\\@')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
}

function outcomeLabel(value: string): string {
  return OUTCOME_OPTIONS.find(o => o.value === value)?.label ?? value
}

// `domainWorstJudgment` and `DOMAIN_CONTROLS` are the canonical versions from
// lib/assessments/reportProjection (imported above).

// ─── Domain content helpers ────────────────────────────────────────────────

function formatIntendedUse(raw: any): string {
  if (!raw) return 'Not specified'
  if (typeof raw === 'string') { try { raw = JSON.parse(raw) } catch { return raw } }
  if (typeof raw === 'object') {
    const map: Record<string, string> = {
      agency_deliverable: 'Agency deliverable',
      brand_commercial: 'Brand commercial content',
      social_media: 'Social media content',
      broadcast: 'Broadcast content',
      licensing: 'Content licensing',
    }
    const primary = map[raw.primary_use as string] || raw.primary_use || 'Not specified'
    const suitable = Array.isArray(raw.suitable_categories) && raw.suitable_categories.length > 0
      ? `; suitable for: ${raw.suitable_categories.join(', ')}` : ''
    return primary + suitable
  }
  return String(raw)
}

function getDomainFinding(letter: string, controls: string[], section3: S3, section4: S4, section5: S5): string {
  const fromFindings = section5.findings
    .filter(f => f.domain === letter).map(f => f.finding?.trim()).filter(Boolean) as string[]
  if (fromFindings.length > 0) return fromFindings.join(' ')

  const fromGaps = section4.gaps
    .filter(g => controls.includes(g.control))
    .map(g => (g.impact_description?.trim() || g.what_missing?.trim())).filter(Boolean) as string[]
  if (fromGaps.length > 0) return fromGaps.join(' ')

  const allNA = controls.every(id => (section3 as any)[id]?.judgment === 'Not Applicable')
  if (allNA) return 'Not applicable to this content.'
  const status = domainWorstJudgment(letter, section3)
  if (status === 'Verified') return 'Independent review identified no material concerns in this domain.'
  if (status === 'Partially Verified') return 'Evidence partially established. Specific gaps are documented in the Gap Log.'
  if (status === 'Not Provided') return 'No evidence was provided for this domain during the assessment period.'
  return 'See assessment workbook for detail.'
}

function getDomainImplication(letter: string, controls: string[], section3: S3, section4: S4, section5: S5): string {
  const highGaps = section4.gaps.filter(g => controls.includes(g.control) && g.commercial_impact?.startsWith('High'))
  if (highGaps.length > 0) {
    const text = highGaps.map(g => (g.impact_description?.trim() || g.what_missing?.trim())).filter(Boolean).join('. ')
    return text || 'Material evidence gap with high commercial impact — see Gap Log.'
  }

  const riskFindings = section5.findings
    .filter(f => f.domain === letter && f.commercial_impact?.includes('risk'))
    .map(f => f.finding?.trim()).filter(Boolean) as string[]
  if (riskFindings.length > 0) return riskFindings.join('. ')

  const medGaps = section4.gaps.filter(g => controls.includes(g.control) && g.commercial_impact?.startsWith('Medium'))
  if (medGaps.length > 0) {
    const text = medGaps.map(g => (g.impact_description?.trim() || g.what_missing?.trim())).filter(Boolean).join('. ')
    return text || 'Relevant consideration — review gap detail.'
  }

  const allNA = controls.every(id => (section3 as any)[id]?.judgment === 'Not Applicable')
  if (allNA) return 'Not applicable to this content.'
  const status = domainWorstJudgment(letter, section3)
  if (status === 'Verified') return 'No commercial concerns identified in this domain.'
  if (status === 'Partially Verified') return 'Low commercial impact from identified gap. Addressable with supplemental documentation.'
  if (status === 'Not Provided') return 'Commercial reliance on this domain is unverified pending evidence submission.'
  return 'See Gap Log for commercial impact detail.'
}

function buildDomainBlocks(
  section3: S3, section4: S4, section5: S5, perDomainEvidence: Record<string, string>,
): string {
  return Object.entries(DOMAIN_LABELS).map(([letter, name]) => {
    const controls = DOMAIN_CONTROLS[letter] ?? []
    const status = domainWorstJudgment(letter, section3)
    // Evidence-reviewed narrative comes from the bounded projection (reviewer-
    // authored content only; no manufactured "documentation reviewed").
    const evidence = perDomainEvidence[letter] ?? 'Not recorded.'
    const finding = getDomainFinding(letter, controls, section3, section4, section5)
    const implication = getDomainImplication(letter, controls, section3, section4, section5)
    return `#domain-block(
  name: "${esc(`${letter} — ${name}`)}",
  status: "${esc(status)}",
  evidence-reviewed: [${esc(evidence)}],
  finding: [${esc(finding)}],
  commercial-implication: [${esc(implication)}],
)`
  }).join('\n\n')
}

// CA-RLK-2b: Section 1's domain scope is carried by the governed "Evidence
// Coverage Overview" table (already rendered from `domainWorstJudgment`). The
// obsolete `buildScopeBox` — an eight-item grid inferred from control judgment
// status — is deleted: no judgment value (including `Verified`) independently
// establishes that a documentation category was reviewed.
// `projection.domainsAssessed` remains available for the governed methodology
// scope where a caller needs it explicitly.

/**
 * Section 2 "Evidence provided" (Report Template v0.2): the reviewer's authored
 * `evidence_reviewed` list, verbatim. Fail closed to governed neutral text when
 * the reviewer did not author a consolidated list — never synthesised from
 * judgment status or submission shape.
 */
function buildEvidenceList(p: ReportProjection): string {
  const lines = p.evidenceReviewedAuthored
    ? p.evidenceReviewedLines.map(e => `- ${esc(e)}`).join('\n')
    : `_${esc(p.evidenceReviewedFallback)}_`
  const observed = p.videoIndependentlyObserved
    ? '\n- Direct review of submitted video content'
    : ''
  return `${lines}${observed}`
}

/** Section 2 "AI tools declared by submitter" (Report Template v0.2). */
function buildDeclaredToolsLine(submission: Record<string, any>): string {
  const raw = submission.tools_used
  const arr = Array.isArray(raw)
    ? raw
    : (typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return [] } })() : [])
  const names = arr
    .map((t: any) => (t?.tool_name || t?.toolName || t?.tool || t?.name || '').toString().trim())
    .filter(Boolean)
  if (names.length === 0) return '_No AI tools were declared by the submitter._'
  return names.map((n: string) => `- ${esc(n)}`).join('\n')
}

/**
 * Appendix A: Supporting Evidence Record (Report Template v0.2).
 * Every label/value is passed in Typst *content* position (`[...]`) with
 * `esc()` applied — the same escaping contract the domain blocks use — never
 * as a string literal (where `esc()`'s `\[`/`\#` output would be invalid).
 */
function buildSupportingEvidenceRecord(p: ReportProjection): string {
  const renderField = (f: EvidenceRecordField): string => {
    if (f.sub && f.sub.length > 0) {
      const subLines = f.sub
        .map(sub => `  #field(label: [${esc(sub.label)}], value: [${esc(sub.value)}])`)
        .join('\n')
      return `#text(weight: "bold", fill: c-navy, size: 9.5pt)[${esc(f.label)}]
#v(2pt)
#pad(left: 12pt)[
${subLines}
]
#v(4pt)`
    }
    return `#field(label: [${esc(f.label)}], value: [${esc(f.value)}])`
  }

  const body = p.supportingEvidenceRecord.map(renderField).join('\n\n')

  return `_This appendix provides a structured record of the evidence submitted. It is a documentation record, not a narrative assessment. For the commercial assessment and findings, see Sections 1--3._

${body}

#v(0.6em)
#assurance-box[
  #text(size: 9pt)[${esc(p.supportingEvidenceLimitation)}]
]`
}

function buildTypContent(
  data: S7, section6: S6, section5: S5, section4: S4, section3: S3, section2: S2, section1: S1,
  assessmentNumber: string, submission: Record<string, any>,
): string {
  const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const submissionId = submission.id ? `SUB-${submission.id.split('-')[0].toUpperCase()}` : 'SUB-UNKNOWN'
  const title = esc(submission.title ?? 'Untitled')
  const filmmaker = esc(submission.filmmaker_name ?? 'Unknown Creator')
  const outcomeFull = outcomeLabel(section6.outcome)
  const confidence = section6.commercial_confidence || 'Moderate'

  // Domain judgment table rows
  const domainRows = Object.entries(DOMAIN_LABELS).map(([domain, name]) => {
    const judgment = domainWorstJudgment(domain, section3)
    const gaps = section5.findings
      .filter(f => f.domain === domain && f.commercial_impact?.toLowerCase().includes('risk'))
      .map(f => f.finding).join('; ')
    return `    ("${esc(name)}", "${esc(judgment)}", "${esc(gaps || 'None identified')}"),`
  }).join('\n')

  // Key findings — positive-first, domain label only as prefix (no duplication)
  const sortedFindings = [...section5.findings].sort((a, b) =>
    ((IMPACT_SORT[a.commercial_impact ?? ''] ?? 5) - (IMPACT_SORT[b.commercial_impact ?? ''] ?? 5))
  )
  const findingLines = sortedFindings.length > 0
    ? sortedFindings.map(f =>
        `+ *${esc(f.domain ? DOMAIN_LABELS[f.domain] ?? f.domain : 'General')}:* ${esc(f.finding)}\n`
      ).join('\n')
    : '+ No formal findings recorded.\n'

  const conditionsBlock = section6.outcome === 'EVIDENCE_SUPPORTS_WITH_CONDITIONS' && section6.conditions.length > 0
    ? `== Conditions\n\n${section6.conditions.map((c, i) => `*${i + 1}. ${esc(c)}*\n\nTo be addressed before commercial deployment.\n`).join('\n')}\n`
    : ''

  const residualBlock = data.residual_risks.length > 0
    ? `== Residual Commercial Risks\n\n${data.residual_risks.map(r => `- ${esc(r)}\n`).join('')}\n`
    : ''

  const nextStepsBlock = data.next_steps.length > 0
    ? `== Recommended Next Steps\n\n${data.next_steps.map((s, i) => `${i + 1}. ${esc(s)}\n`).join('')}\n`
    : ''

  const intendedUseRaw = formatIntendedUse(submission.intended_use)
  const intendedUse = esc(intendedUseRaw)
  const territory = esc(
    (submission.territory || submission.territory_preferences || '').toString().trim() || 'Not stated',
  )

  // CA-RLK-2b: the report may only assert propositions traceable to signed
  // assessment state, reviewer-authored text, or an actual submission artifact.
  // All Section-1 scope, Section-2 evidence, per-domain evidence, and Appendix A
  // content is derived through this one bounded projection (fail-closed = omit).
  const projection = projectReport({
    section2,
    section3,
    section5,
    section6,
    section7: data,
    submission,
    scopeDomainCodes: null,
    assessmentNumber,
    reportDate,
    outcomeLabel: outcomeFull,
    intendedUse: intendedUseRaw,
  })

  const evidenceList = buildEvidenceList(projection)
  const declaredTools = buildDeclaredToolsLine(submission)
  const scopeLimitations = esc((section1?.scope_limitations || '').trim()) || 'None noted.'
  const domainBlocks = buildDomainBlocks(section3, section4, section5, projection.perDomainEvidence)
  const supportingEvidenceRecord = buildSupportingEvidenceRecord(projection)

  return `// ─────────────────────────────────────────────────────────────────────────────
// SI8 Commercial Assurance Assessment Report
// Assessment ID: ${assessmentNumber}
// Content: ${submission.title ?? 'Untitled'}
// Submitter: ${submission.filmmaker_name ?? 'Unknown'}, ${submission.user?.email ?? ''}
// Report date: ${reportDate}
//
// Compile: typst compile ${assessmentNumber}.typ ${assessmentNumber}.pdf
// ─────────────────────────────────────────────────────────────────────────────

#import "si8-report-template.typ": *


// ═════════════════════════════════════════════════════════════════════════════
// GLOBAL PAGE SETUP
// ═════════════════════════════════════════════════════════════════════════════

#set page(
  paper: "a4",
  margin: (top: 3.2cm, bottom: 3.2cm, left: 2.8cm, right: 2.8cm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(size: 8pt, fill: c-gray)
      #grid(
        columns: (1fr, 1fr, 1fr),
        align: (left, center, right),
        [*SI8* | Commercial Assurance],
        [${assessmentNumber}],
        [${reportDate}],
      )
      #line(length: 100%, stroke: 0.5pt + c-border)
    ]
  },
  footer: context {
    if counter(page).get().first() > 1 [
      #line(length: 100%, stroke: 0.5pt + c-border)
      #set text(size: 8pt, fill: c-gray)
      #grid(
        columns: (1fr, auto),
        align: (left, right),
        [Confidential — For authorized recipient only],
        [Page #counter(page).display("1") of #counter(page).final().first()],
      )
    ]
  },
)

#set text(
  font: ("Calibri", "Arial", "Helvetica Neue", "Liberation Sans"),
  size: 10.5pt,
  fill: c-black,
  lang: "en",
)

#set par(
  justify: true,
  leading: 0.78em,
  spacing: 1.15em,
)

#show heading.where(level: 1): it => {
  v(1.5em)
  text(size: 14pt, weight: "bold", fill: c-navy)[#it.body]
  v(0.2em)
  line(length: 100%, stroke: 1.8pt + c-amber)
  v(0.6em)
}

#show heading.where(level: 2): it => {
  v(1.0em)
  block(
    stroke: (left: 3pt + c-amber),
    inset: (left: 10pt, top: 4pt, bottom: 4pt),
  )[
    #text(size: 11pt, weight: "bold", fill: c-black)[#it.body]
  ]
  v(0.4em)
}

#show heading.where(level: 3): it => {
  v(0.7em)
  text(size: 10.5pt, weight: "bold", fill: c-navy)[#it.body]
  v(0.3em)
}

#set table(
  fill: (_, row) => if row == 0 { c-navy } else if calc.even(row) { white } else { c-bg },
  stroke: none,
  inset: (x: 10pt, y: 7pt),
)
#show table.cell.where(y: 0): set text(fill: white, weight: "bold", size: 9.5pt)
#show table: set par(justify: false)


// ═════════════════════════════════════════════════════════════════════════════
// COVER PAGE
// ═════════════════════════════════════════════════════════════════════════════

#cover-page(
  content-title: "${title}",
  assess-id: "${assessmentNumber}",
  report-date: "${reportDate}",
  submitter: "${filmmaker}",
  submission-id: "${submissionId}",
  outcome: "${esc(outcomeFull)}",
  confidence: "${esc(confidence)}",
)


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: COMMERCIAL ASSURANCE SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

= Section 1: Commercial Assurance Summary

_This section is designed for the commercial decision-maker: the brand legal team, executive producer, E&O underwriter, or procurement lead._

== Overall Assessment

*Outcome: ${esc(outcomeFull)}*

${esc(data.executive_summary || '[Complete before delivery: Write 2-4 sentences for the client legal team. State what SI8 independently reviewed, the outcome reached, and the primary evidential basis. Describe only what the evidence shows for this assessment — this placeholder does not presume a supportive or adverse outcome.]')}

== Commercial Confidence

#confidence-badge("${esc(confidence)}")
#v(0.4em)

#table(
  columns: (auto, 1fr),
  [*High*], [Core commercial evidence verified. Identified gaps are low commercial impact or addressable.],
  [Medium], [Material evidence verified but gaps present. Deployment should proceed with awareness of documented conditions.],
  [Low], [Core commercial evidence incomplete or inconsistent. Material gaps affect the reliability of the assessment.],
)

#block(breakable: false)[
  == Evidence Coverage Overview

  #evidence-table((
${domainRows}
  ))
]

== Key Findings

${findingLines}

${conditionsBlock}${residualBlock}${nextStepsBlock}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: ASSESSMENT SCOPE
// ═════════════════════════════════════════════════════════════════════════════

= Section 2: Assessment Scope

*Content assessed:*
"${title}" — submitted by ${filmmaker}. Intended commercial use: ${intendedUse}. Intended territory: ${territory}.

*AI tools declared by submitter:*

${declaredTools}

*Evidence provided:*

${evidenceList}

*Scope limitations:*

${scopeLimitations}

*Assessment conducted by:* PMF Strategy Inc. d/b/a SuperImmersive 8 ("SI8"), Taipei, Taiwan.

*Assessment date:* ${reportDate}

*Methodology:* SI8 Reviewer Workbook v0.1 | SI8 Reviewer Manual v0.2


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: DOMAIN ASSESSMENTS
// ═════════════════════════════════════════════════════════════════════════════

= Section 3: Domain Assessments

_Detailed control-level findings for each assessment domain. Each domain is assessed against the SI8 Reviewer Workbook Schema v0.1._

${domainBlocks}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: STANDARD ASSURANCE LANGUAGE
// ═════════════════════════════════════════════════════════════════════════════

= Section 4: Standard Assurance Language

#assurance-box[
  *Scope of Assessment*

  This assessment was conducted by PMF Strategy Inc. d/b/a SuperImmersive 8 ("SI8") in accordance with the SI8 Reviewer Manual v0.2 and Reviewer Workbook Schema v0.1. The assessment covers the specific content and evidence submitted and is limited to the scope described in Section 2.

  *Nature of Opinion*

  This report constitutes an independent commercial assurance opinion. It is not legal advice and does not constitute a legal opinion on copyright, trademark, or other intellectual property rights. SI8's opinion reflects the evidence available at the time of assessment and cannot account for undisclosed production history or future third-party claims.

  *Limitations*

  SI8 relies on submitter declarations and submitted evidence. SI8 does not independently verify the completeness of production records that were not provided. Where evidence gaps are identified, they are disclosed in this Assessment and reflected in the commercial confidence rating. Buyers and underwriters should apply independent judgment to gap disclosures.

  *Use of This Report*

  This report is prepared for the use of the identified recipient. It may be shared with the recipient's legal counsel, E&O insurer, or procurement team for the purpose stated in the submission. Redistribution for other purposes requires SI8's prior written consent.
]


// ═════════════════════════════════════════════════════════════════════════════
// APPENDIX A: SUPPORTING EVIDENCE RECORD
// ═════════════════════════════════════════════════════════════════════════════

= Appendix A: Supporting Evidence Record

${supportingEvidenceRecord}


// ─────────────────────────────────────────────────────────────────────────────
// REVIEWER NOTES (INTERNAL — DELETE BEFORE DELIVERY)
// ─────────────────────────────────────────────────────────────────────────────

// Post-assessment notes: ${esc(data.post_assessment_notes || 'None')}
`
}

function Textarea({ label, value, onChange, rows = 4, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void
  rows?: number; placeholder?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        placeholder={placeholder}
        className="w-full text-sm border rounded px-3 py-2 resize-none"
        style={{ borderColor: 'rgba(0,0,0,0.15)' }} />
    </div>
  )
}

function StringList({ label, items, onChange, placeholder, hint }: {
  label: string; items: string[]
  onChange: (items: string[]) => void
  placeholder?: string; hint?: string
}) {
  const update = (i: number, v: string) => onChange(items.map((x, idx) => idx === i ? v : x))
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, ''])

  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" value={item} onChange={e => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 text-sm border rounded px-3 py-1.5"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }} />
            <button type="button" onClick={() => remove(i)}
              className="text-gray-300 hover:text-red-400 px-2">✕</button>
          </div>
        ))}
        <button type="button" onClick={add}
          className="text-sm text-gray-400 hover:text-gray-600">+ Add</button>
      </div>
    </div>
  )
}

export function Section7Brief({
  data, section6, section5, section4, section3, section2, section1,
  assessmentNumber, onAssessmentNumberChange, submission, onChange,
}: Props) {
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfGenerated, setPdfGenerated] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [seeded, setSeeded] = useState(false)

  // Get-or-create the canonical assessment_number before generating anything —
  // the number is embedded IN the document, not attached afterward. If one
  // already exists (assessmentNumber prop is set), skip the round trip.
  // Requires an outcome from Section 6 (assessments.outcome is NOT NULL);
  // the button below is already disabled until outcomeLbl is set, so this
  // should only throw if that gate is somehow bypassed.
  // CA-RLK-2a: the assessment now exists only as the product of a durable
  // reviewer sign-off (§ 6). This route is lookup-only — it verifies an
  // ACTIVE, revision-matched sign-off and returns its number.
  const ensureAssessmentNumber = async (): Promise<string> => {
    const res = await fetch(
      `/api/admin/submissions/${encodeURIComponent(submission.id)}/ensure-assessment`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      const map: Record<string, string> = {
        assessment_not_signed_off: 'Sign off the assessment in § 6 before generating the report.',
        signoff_invalidated: 'The sign-off was invalidated by a later workbook edit — re-sign in § 6.',
        workbook_changed_since_signoff: 'The workbook changed after sign-off — re-sign in § 6, then generate.',
      }
      throw new Error(map[err.error] || err.message || err.error || `HTTP ${res.status}`)
    }
    const json = await res.json()
    onAssessmentNumberChange(json.assessmentNumber)
    return json.assessmentNumber as string
  }

  const canSeed = !!(section6.basis?.trim() || section4.gaps.length > 0)

  const handleSeed = () => {
    const updates: Partial<S7> = {}

    // Executive summary from section 6 rationale
    if (!data.executive_summary.trim() && section6.basis?.trim()) {
      updates.executive_summary = section6.basis.trim()
    }

    // Residual risks from non-addressable medium/high gaps
    if (data.residual_risks.length === 0) {
      const risks = section4.gaps
        .filter(g =>
          (g.commercial_impact?.startsWith('High') || g.commercial_impact?.startsWith('Medium')) &&
          g.addressable?.startsWith('No')
        )
        .map(g => {
          const label = CONTROL_LABELS_7[g.control] || g.control
          const text = g.impact_description?.trim() || g.what_missing?.trim()
          return text ? `${label}: ${text}` : label
        })
        .filter(Boolean)
      if (risks.length > 0) updates.residual_risks = risks
    }

    // Next steps from addressable gaps — client-facing action language
    if (data.next_steps.length === 0) {
      const steps = section4.gaps
        .filter(g => g.addressable?.startsWith('Yes') || g.addressable?.startsWith('Partially'))
        .map(g => {
          if (CONTROL_ACTIONS[g.control]) return CONTROL_ACTIONS[g.control]
          const label = CONTROL_LABELS_7[g.control] || g.control
          const text = g.what_missing?.trim()
          return text ? `${label}: ${text}` : `Provide documentation for ${label}.`
        })
        .filter(Boolean)
      if (steps.length > 0) updates.next_steps = steps
    }

    if (Object.keys(updates).length > 0) {
      onChange(updates)
      setSeeded(true)
    }
  }

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true)
    setPdfError(null)
    try {
      const num = await ensureAssessmentNumber()
      const content = buildTypContent(data, section6, section5, section4, section3, section2, section1, num, submission)
      const res = await fetch(
        `/api/admin/submissions/${encodeURIComponent(submission.id)}/generate-report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ typContent: content, assessId: num }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${num}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setPdfGenerated(true)
    } catch (e: any) {
      setPdfError(e?.message || 'PDF generation failed')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDownloadTyp = async () => {
    setGenerating(true)
    setPdfError(null)
    try {
      const num = await ensureAssessmentNumber()
      const content = buildTypContent(data, section6, section5, section4, section3, section2, section1, num, submission)
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${num}.typ`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setGenerated(true)
    } catch (e: any) {
      setPdfError(e?.message || 'Failed to prepare report source')
    } finally {
      setGenerating(false)
    }
  }

  const outcomeLbl = section6.outcome ? outcomeLabel(section6.outcome) : null

  // Findings sorted positive-first for preview
  const sortedFindings = [...section5.findings].sort((a, b) => {
    const aO = IMPACT_SORT[a.commercial_impact ?? ''] ?? 5
    const bO = IMPACT_SORT[b.commercial_impact ?? ''] ?? 5
    return aO - bO
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#1a1918' }}>§ 7  Report Draft</h2>
        <p className="text-sm text-gray-500">
          Review and refine the draft content for the client report. Fields are pre-populated from previous
          sections where possible — edit as needed before generating the Typst source.
        </p>
      </div>

      {/* Outcome reminder */}
      <div className="p-3 rounded border text-sm" style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#f5f3f0' }}>
        <span className="text-gray-500 text-xs">Outcome from § 6: </span>
        <span className="font-medium">{outcomeLbl ?? 'Not yet set'}</span>
        {section6.commercial_confidence && (
          <span className="text-xs text-gray-400 ml-3">Confidence: {section6.commercial_confidence}</span>
        )}
      </div>

      {/* Seed button */}
      {canSeed && (
        <div className="p-3 rounded-lg border" style={{ borderColor: 'rgba(200,144,10,0.2)', backgroundColor: 'rgba(200,144,10,0.03)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium mb-0.5" style={{ color: '#1a1918' }}>Draft from previous sections</div>
              <div className="text-xs text-gray-500">
                Fills empty fields only — never overwrites existing content. Seeded from: § 6 assessment rationale → Executive summary · § 4 non-addressable gaps → Residual risks · § 4 addressable gaps → Next steps.
              </div>
              {seeded && <div className="text-xs text-green-600 mt-1.5">✓ Draft seeded — review and edit each field before generating.</div>}
            </div>
            <button
              type="button"
              onClick={handleSeed}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border font-medium transition-colors hover:bg-amber-50"
              style={{ borderColor: '#C8900A', color: '#C8900A' }}
            >
              <Sparkles className="w-3 h-3" />
              Seed draft
            </button>
          </div>
        </div>
      )}

      {/* Executive summary */}
      <Textarea
        label="Executive summary"
        value={data.executive_summary}
        onChange={v => onChange({ executive_summary: v })}
        rows={5}
        placeholder={`e.g. "SI8 independently reviewed the submitted video content, AI tool disclosures, and commercial licensing documentation for [Title]. The evidence reviewed supports the intended commercial use of this content as [intended use]. No material IP, likeness, or rights conflicts were identified during the review period. This assessment was conducted in accordance with the SI8 Reviewer Manual v0.2." — institutional tone, not colloquial.`}
        hint="Write for a brand GC, agency EP, or E&O underwriter. SOC 2 / Deloitte style: what was reviewed, outcome, evidential basis, commercial conclusion. Seeded from § 6 rationale — expand into client-facing language."
      />

      {/* Evidence reviewed */}
      <StringList
        label="Evidence reviewed"
        items={data.evidence_reviewed}
        onChange={v => onChange({ evidence_reviewed: v })}
        placeholder="e.g. Kling AI Pro subscription receipt (PDF, Jan 2026)"
        hint="List each piece of evidence reviewed — receipts, ToS documents, the video itself, declarations. Be specific about format, tool, and date. Always entered manually."
      />

      {/* Key findings — read-only preview from Section 5 */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>Key findings</label>
        <p className="text-xs text-gray-400 mb-2">
          Seeded from § 5. Findings appear in the report exactly as documented — positive first.
          Describe evidence, not opinions: "Commercial licensing was independently confirmed for Kling AI Pro"
          not "Commercial rights look fine." Edit finding statements in § 5 to update.
        </p>
        <div className="border rounded-lg p-3 space-y-2 text-xs"
          style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#f5f3f0' }}>
          {sortedFindings.length === 0 ? (
            <span className="text-gray-400">No findings documented in § 5.</span>
          ) : (
            sortedFindings.map((f, i) => (
              <div key={f.id} className="flex items-start gap-2">
                <span className="text-gray-400 flex-shrink-0">{i + 1}.</span>
                <div className="text-gray-700">
                  <span className="font-medium">
                    {f.domain ? (DOMAIN_LABELS[f.domain] ?? f.domain) : 'General'}
                  </span>
                  {f.finding && ` — ${f.finding}`}
                  {f.commercial_impact && (
                    <span className={`ml-2 text-[10px] ${
                      f.commercial_impact.startsWith('Positive') ? 'text-green-600'
                      : f.commercial_impact.includes('High') ? 'text-red-500'
                      : f.commercial_impact.includes('Medium') ? 'text-amber-600'
                      : 'text-gray-400'
                    }`}>
                      {f.commercial_impact.split(' — ')[0]}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div className="pt-1.5 border-t text-[10px] text-gray-400"
            style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            ← Edit in § 5 Findings to update
          </div>
        </div>
      </div>

      {/* Overall assessment statement — read-only */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>
          Overall assessment statement
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Auto-mapped from § 6 outcome. Uses standard SI8 language — not editable.
        </p>
        <div className="border rounded-lg px-3 py-2.5 text-sm font-medium"
          style={{ borderColor: 'rgba(200,144,10,0.3)', backgroundColor: 'rgba(200,144,10,0.04)', color: '#1a1918' }}>
          {outcomeLbl ?? (
            <span className="text-gray-400 font-normal">Not yet set — complete § 6 first</span>
          )}
        </div>
      </div>

      {/* Residual risks */}
      <StringList
        label="Residual risks"
        items={data.residual_risks}
        onChange={v => onChange({ residual_risks: v })}
        placeholder="e.g. Technical Provenance: SI8 could not independently verify contemporaneous prompt history — provenance relies on the submitter's description"
        hint="Distinguish evidence limitations from commercial risks. 'SI8 could not independently verify contemporaneous prompt history' explains why the client should care. Include even for EVIDENCE_SUPPORTS outcomes. Seeded from § 4 non-addressable gaps."
      />

      {/* Recommended next steps */}
      <StringList
        label="Recommended next steps"
        items={data.next_steps}
        onChange={v => onChange({ next_steps: v })}
        placeholder="e.g. Retain contemporaneous prompt history for future productions"
        hint="Specific, actionable, prioritized. Tell the client exactly what to do — not 'improve documentation' but 'retain tool subscription receipts with project files.' Seeded from § 4 addressable gaps as a starting point — rephrase into clear client actions."
      />

      {/* Post-assessment notes */}
      <Textarea
        label="Post-assessment notes (internal only)"
        value={data.post_assessment_notes}
        onChange={v => onChange({ post_assessment_notes: v })}
        rows={3}
        placeholder="What did this assessment teach SI8? What should change before the next assessment?"
        hint="Not included in the client report. Feeds the Case Library and Reviewer Manual v0.2 candidates. Reinforces P7 — Institutional Learning."
      />

      {/* Generate client report */}
      <div className="pt-4 border-t space-y-3" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div>
          <div className="text-sm font-medium mb-1" style={{ color: '#1a1918' }}>Generate client report</div>
          <p className="text-xs text-gray-500">
            Compiles the report to PDF server-side and downloads it directly.
            Review all fields above before generating.
          </p>
        </div>

        <Button
          onClick={handleGeneratePdf}
          disabled={generatingPdf}
          style={{ backgroundColor: '#C8900A', color: 'white' }}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {generatingPdf ? 'Compiling PDF…' : pdfGenerated ? 'Download PDF again' : 'Generate Client Report (PDF)'}
        </Button>

        {pdfGenerated && !pdfError && (
          <div className="text-xs text-green-600">
            ✓ {assessmentNumber ?? 'report'}.pdf downloaded.
          </div>
        )}

        {pdfError && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
            <span className="font-medium">PDF generation failed:</span> {pdfError}
            <div className="mt-1 text-gray-500">
              Download the source file below to diagnose — open in{' '}
              <a href="https://typst.app" target="_blank" rel="noreferrer" className="underline">typst.app</a>{' '}
              or run <code className="font-mono">typst compile {assessmentNumber ?? '[assessment-number]'}.typ</code> locally.
            </div>
          </div>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={handleDownloadTyp}
            disabled={generating}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            {generating ? 'Downloading…' : generated ? 'Download source again (.typ)' : 'Download source (.typ)'}
          </button>
          {generated && !pdfError && (
            <span className="text-xs text-gray-400 ml-2">
              — place in <code className="font-mono">tools/report-pipeline/</code> to compile manually
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
