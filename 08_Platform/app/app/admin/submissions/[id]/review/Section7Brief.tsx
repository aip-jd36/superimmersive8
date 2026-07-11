'use client'

import { useState } from 'react'
import { Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkbookData, DOMAIN_LABELS, OUTCOME_OPTIONS } from './workbook-schema'

type S7 = WorkbookData['section_7']
type S6 = WorkbookData['section_6']
type S5 = WorkbookData['section_5']
type S4 = WorkbookData['section_4']
type S3 = WorkbookData['section_3']

interface Props {
  data: S7
  section6: S6
  section5: S5
  section4: S4
  section3: S3
  assessId: string
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
}

function outcomeLabel(value: string): string {
  return OUTCOME_OPTIONS.find(o => o.value === value)?.label ?? value
}

function domainWorstJudgment(domain: string, section3: S3): string {
  const controlMap: Record<string, string[]> = {
    A: ['A01'], R: ['R01','R02','R03','R04'], H: ['H01','H02'],
    I: ['I01','I02','I03'], L: ['L01','L02','L03'], T: ['T01'], D: ['D01','D02'],
  }
  const controls = controlMap[domain] ?? []
  const judgments = controls.map(id => (section3 as any)[id]?.judgment ?? '').filter(Boolean)
  if (judgments.includes('Not Provided')) return 'Not Provided'
  if (judgments.includes('Partially Verified')) return 'Partially Verified'
  if (judgments.every(j => j === 'Not Applicable')) return 'Not Applicable'
  if (judgments.includes('Verified')) return 'Verified'
  return 'Not Provided'
}

function buildTypContent(
  data: S7, section6: S6, section5: S5, section3: S3,
  assessId: string, submission: Record<string, any>,
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
      .map(f => f.finding)
      .join('; ')
    const gapText = gaps || 'None identified'
    return `    ("${esc(name)}", "${esc(judgment)}", "${esc(gapText)}"),`
  }).join('\n')

  // Key findings list — sorted positive-first
  const sortedFindings = [...section5.findings].sort((a, b) => {
    const aO = IMPACT_SORT[a.commercial_impact ?? ''] ?? 5
    const bO = IMPACT_SORT[b.commercial_impact ?? ''] ?? 5
    return aO - bO
  })
  const findingLines = sortedFindings.length > 0
    ? sortedFindings.map(f => `+ *${esc(f.domain ? DOMAIN_LABELS[f.domain] ?? f.domain : 'General')} — ${esc(f.finding.split(':')[0] || f.finding)}:* ${esc(f.finding)}\n`).join('\n')
    : '+ No formal findings recorded.\n'

  // Conditions
  const conditionsBlock = section6.outcome === 'EVIDENCE_SUPPORTS_WITH_CONDITIONS' && section6.conditions.length > 0
    ? `== Conditions\n\n${section6.conditions.map((c, i) => `*${i + 1}. ${esc(c)}*\n\nTo be addressed before commercial deployment.\n`).join('\n')}\n`
    : ''

  // Residual risks
  const residualBlock = data.residual_risks.length > 0
    ? `== Residual Commercial Risks\n\n${data.residual_risks.map(r => `- ${esc(r)}\n`).join('')}\n`
    : ''

  // Next steps
  const nextStepsBlock = data.next_steps.length > 0
    ? `== Recommended Next Steps\n\n${data.next_steps.map((s, i) => `${i + 1}. ${esc(s)}\n`).join('')}\n`
    : ''

  // Evidence reviewed list
  const evidenceList = data.evidence_reviewed.length > 0
    ? data.evidence_reviewed.map(e => `- ${esc(e)}`).join('\n')
    : '- Submission form and attached documentation'

  return `// ─────────────────────────────────────────────────────────────────────────────
// SI8 Campaign Assurance Assessment Report
// Assessment ID: ${assessId}
// Content: ${submission.title ?? 'Untitled'}
// Submitter: ${submission.filmmaker_name ?? 'Unknown'}, ${submission.user?.email ?? ''}
// Report date: ${reportDate}
//
// Compile: typst compile ${assessId}.typ ${assessId}.pdf
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
        [*SI8* | Campaign Assurance],
        [${assessId}],
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
  assess-id: "${assessId}",
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

${esc(data.executive_summary || "[COMPLETE: Write 2–4 sentence executive summary for the client's legal team. State what was assessed, what outcome was reached, and the primary basis.]")}

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
"${title}" — submitted by ${filmmaker}. Intended use: ${esc(submission.intended_use ?? 'Not specified')}. Territory: ${esc(submission.territory_preferences ?? 'Global')}.

*Evidence reviewed:*

${evidenceList}

*Assessment conducted by:* PMF Strategy Inc. d/b/a SuperImmersive 8 ("SI8"), Taipei, Taiwan.

*Assessment date:* ${reportDate}

*Methodology:* SI8 Reviewer Workbook v0.1 | SI8 Reviewer Manual v0.1


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: DOMAIN ASSESSMENTS
// ═════════════════════════════════════════════════════════════════════════════

= Section 3: Domain Assessments

_Detailed control-level findings for each assessment domain. Each domain is assessed against the SI8 Reviewer Workbook Schema v0.1._

// [TODO: Add domain-block() calls here for each domain with findings]
// Use the domain-block() component from si8-report-template.typ
// Example:
// #domain-block(
//   name: "A — Identity & Accountability",
//   status: "Verified",
//   evidence-reviewed: [Description of evidence],
//   finding: [Finding statement],
//   commercial-implication: [Commercial implication],
// )


// ═════════════════════════════════════════════════════════════════════════════
// APPENDIX A: CHAIN OF TITLE
// ═════════════════════════════════════════════════════════════════════════════

= Appendix A: Chain of Title

_Chain of Title documentation for "${title}" as disclosed by the submitter and reviewed by SI8._

#table(
  columns: (1fr, 2fr),
  [*Field*], [*Detail*],
  [Assessment ID], [${assessId}],
  [Content Title], [${title}],
  [Submitter], [${filmmaker}],
  [Submission ID], [${submissionId}],
  [Review Date], [${reportDate}],
  [Outcome], [${esc(outcomeFull)}],
  [Commercial Confidence], [${esc(confidence)}],
)

_Chain of Title detail to be completed from Section 3 control findings._


// ═════════════════════════════════════════════════════════════════════════════
// REVIEWER NOTES (INTERNAL — DELETE BEFORE DELIVERY)
// ═════════════════════════════════════════════════════════════════════════════

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
  data, section6, section5, section4, section3, assessId, submission, onChange,
}: Props) {
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfGenerated, setPdfGenerated] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [seeded, setSeeded] = useState(false)

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

    // Next steps from addressable gaps
    if (data.next_steps.length === 0) {
      const steps = section4.gaps
        .filter(g => g.addressable?.startsWith('Yes') || g.addressable?.startsWith('Partially'))
        .map(g => {
          const label = CONTROL_LABELS_7[g.control] || g.control
          const text = g.what_missing?.trim()
          return text ? `${label}: ${text}` : label
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
      const content = buildTypContent(data, section6, section5, section3, assessId, submission)
      const res = await fetch(
        `/api/admin/submissions/${encodeURIComponent(submission.id)}/generate-report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ typContent: content, assessId }),
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
      a.download = `${assessId}.pdf`
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

  const handleDownloadTyp = () => {
    setGenerating(true)
    try {
      const content = buildTypContent(data, section6, section5, section3, assessId, submission)
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${assessId}.typ`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setGenerated(true)
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
        placeholder="2–4 sentences. Answer: What was reviewed? What outcome was reached? Why? What should the client understand? Avoid hedging — state findings confidently."
        hint="Write for the client's legal team, brand executive, or E&O underwriter. Seeded from § 6 assessment rationale — expand to add client-facing context."
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
            ✓ {assessId}.pdf downloaded.
          </div>
        )}

        {pdfError && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
            <span className="font-medium">PDF generation failed:</span> {pdfError}
            <div className="mt-1 text-gray-500">
              Download the source file below to diagnose — open in{' '}
              <a href="https://typst.app" target="_blank" rel="noreferrer" className="underline">typst.app</a>{' '}
              or run <code className="font-mono">typst compile {assessId}.typ</code> locally.
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
