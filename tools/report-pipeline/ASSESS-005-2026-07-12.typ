// ─────────────────────────────────────────────────────────────────────────────
// SI8 Commercial Assurance Assessment Report
// Assessment ID: ASSESS-005-2026-07-12
// Content: Cloud World: Pan from Baby to Auntie Guard
// Submitter: JDC_Media
// Report date: 12 July 2026
//
// Regenerated from the orphaned pre-launch artifact ASSESS-001-2026-07-10
// (legacy submissions.assess_id field, predates the Assessment Service /
// assessments table launched 2026-07-12). ASSESS-005-2026-07-12 is the
// canonical, DB-issued assessment number for this same assessment — the
// only one the Public Assessment Record verification page resolves.
// Domain findings preserved verbatim from the original as a faithful
// self-test record (submitter = JD, testing his own pipeline). Branding
// updated Campaign Assurance -> Commercial Assurance per the Jul 12, 2026
// terminology freeze in CLAUDE.md. Section 4 uses the current canonical
// Standard Assurance Language (controlled policy text) rather than the
// earlier ad hoc draft embedded in the original PDF.
//
// Compile: typst compile ASSESS-005-2026-07-12.typ ASSESS-005-2026-07-12.pdf
// ─────────────────────────────────────────────────────────────────────────────

#import "si8-report-template.typ": *


// ═════════════════════════════════════════════════════════════════════════════
// GLOBAL PAGE SETUP (applies to all body pages)
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
        [ASSESS-005-2026-07-12],
        [12 July 2026],
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

// Heading styles
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

// Table defaults
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
  content-title: "Cloud World: Pan from Baby to Auntie Guard",
  assess-id: "ASSESS-005-2026-07-12",
  report-date: "12 July 2026",
  submitter: "JDC_Media",
  submission-id: "SUB-A6A41B32",
  outcome: "Evidence Supports Intended Commercial Use",
  confidence: "High",
)


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: COMMERCIAL ASSURANCE SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

= Section 1: Commercial Assurance Summary

_This section is designed for the commercial decision-maker: the brand legal team, executive producer, E&O underwriter, or procurement lead._

== Overall Assessment

*Outcome: Evidence Supports Intended Commercial Use*

This video passes the commercial use viability test and has the correct documentation.

== Commercial Confidence

#confidence-badge("High")
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
    ("Identity & Accountability", "Verified", "None identified"),
    ("Commercial Rights & Licensing", "Verified", "None identified"),
    ("Human Creative Contribution", "Partially Verified", "None identified"),
    ("Third-Party IP", "Verified", "None identified"),
    ("Likeness & Performer Rights", "Verified", "None identified"),
    ("Technical Provenance", "Not Provided", "None identified"),
    ("Documentation Integrity", "Verified", "None identified"),
  ))
]

== Key Findings

+ *Identity & Accountability:* Submitter identity and project accountability were adequately established through the completed CertForm submission and signed Evidence Custodian Declaration.

== Recommended Next Steps

+ *Human Contribution:* No workflow documentation beyond authorship statement — no prompt history export, no generation session screenshots, no iteration record.
+ *Technical Provenance:* Without prompt records, the creative provenance chain cannot be independently corroborated. For buyers requiring full documentation chains, this weakens the evidentiary weight of the provenance record.


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: ASSESSMENT SCOPE
// ═════════════════════════════════════════════════════════════════════════════

= Section 2: Assessment Scope

*Content assessed:*
"Cloud World: Pan from Baby to Auntie Guard" — submitted by JDC_Media. Intended use: Agency deliverable. Territory: Global.

*Evidence reviewed:*
- It's important to show the the submitter is the right person
- CertForm submission and production declarations
- Evidence Custodian Declaration
- Submitted video content (independent observation)

*Assessment conducted by:* PMF Strategy Inc. d/b/a SuperImmersive 8 ("SI8"), Taipei, Taiwan.

*Assessment date:* 12 July 2026

*Methodology:* SI8 Reviewer Workbook v0.1 #sym.bar.v SI8 Reviewer Manual v0.1


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: DOMAIN ASSESSMENT
// ═════════════════════════════════════════════════════════════════════════════

= Section 3: Domain Assessments

_Detailed control-level findings for each assessment domain. Each domain is assessed against the SI8 Reviewer Workbook Schema v0.1._

#domain-block(
  name: "A — Identity & Accountability",
  status: "Verified",
  evidence-reviewed: [It's important to show the the submitter is the right person],
  finding: [Submitter identity and project accountability were adequately established through the completed CertForm submission and signed Evidence Custodian Declaration.],
  commercial-implication: [No commercial concerns identified in this domain.],
)

#domain-block(
  name: "R — Commercial Rights & Licensing",
  status: "Verified",
  evidence-reviewed: [No fine tuned model was used],
  finding: [Evidence reviewed supports this domain. No material concerns identified during independent review.],
  commercial-implication: [No commercial concerns identified in this domain.],
)

#domain-block(
  name: "H — Human Creative Contribution",
  status: "Partially Verified",
  evidence-reviewed: [CertForm submission and attached documentation reviewed.],
  finding: [It can be beneficial to show more human creative contributions" is a recommendation, not a commercial consequence. Commercial significance should state the downstream risk: e.g., "If the authorship claim is challenged, no contemporaneous documentation exists to substantiate the level of creative direction described.],
  commercial-implication: [It can be beneficial to show more human creative contributions" is a recommendation, not a commercial consequence. Commercial significance should state the downstream risk: e.g., "If the authorship claim is challenged, no contemporaneous documentation exists to substantiate the level of creative direction described.],
)

#domain-block(
  name: "I — Third-Party IP",
  status: "Verified",
  evidence-reviewed: [CertForm submission and attached documentation reviewed.],
  finding: [Evidence reviewed supports this domain. No material concerns identified during independent review.],
  commercial-implication: [No commercial concerns identified in this domain.],
)

#domain-block(
  name: "L — Likeness & Performer Rights",
  status: "Verified",
  evidence-reviewed: [No real person resemblance observed. The baby and the auntie guard look distinct but do not resemble real persons. There are no likeness releases.],
  finding: [Evidence reviewed supports this domain. No material concerns identified during independent review.],
  commercial-implication: [No commercial concerns identified in this domain.],
)

#domain-block(
  name: "T — Technical Provenance",
  status: "Not Provided",
  evidence-reviewed: [No evidence provided by submitter for this domain.],
  finding: [Depends on region.],
  commercial-implication: [Depends on region.],
)

#domain-block(
  name: "D — Documentation Integrity",
  status: "Verified",
  evidence-reviewed: [These are consistent],
  finding: [Evidence reviewed supports this domain. No material concerns identified during independent review.],
  commercial-implication: [No commercial concerns identified in this domain.],
)


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: STANDARD ASSURANCE LANGUAGE
// ═════════════════════════════════════════════════════════════════════════════

= Section 4: Standard Assurance Language

_This is controlled policy language reproduced verbatim in every SI8 Commercial Assurance Assessment Report. It may only be revised through a formal SI8 Methodology revision — not customized per assessment or per client._

#assurance-box[
  This report is prepared by PMF Strategy Inc. d/b/a SuperImmersive 8 ("SI8") and constitutes a commercial clearance assessment based on the evidence provided by the submitting party at the time of submission.

  *This report is not legal advice.* SI8 is not a law firm and does not provide legal opinions. Nothing in this report should be construed as legal advice, a legal opinion, or a guarantee of any kind regarding the intellectual property status, copyright ownership, or legal clearance of the assessed content.

  *This assessment is evidence-based, not exhaustive.* SI8's assessment reflects the evidence reviewed. SI8 has not conducted independent title searches, chain of copyright investigations, or registrations with any government body. Findings are based on the evidence provided by the submitting party and SI8's direct review of the submitted content.

  *Incomplete submissions affect confidence.* Where evidence was not provided, SI8 has documented the gap and its potential commercial impact. Absence of identified evidence gaps does not mean absence of risk — it means the submitted evidence did not surface identifiable risks within the scope of this review.

  *This assessment reflects conditions at time of submission.* Subsequent changes to applicable law, AI tool licensing terms, platform policies, third-party rights assertions, or the content itself may affect the commercial confidence assessment. SI8 assumes no obligation to update this report following delivery.

  *Submitter responsibility.* The submitting party is responsible for the accuracy and completeness of the information provided in the submission. SI8 relies on submitter representations and does not independently verify all claims. False or materially incomplete submissions void this assessment.

  *Scope limitations apply.* This assessment covers the content and evidence as submitted. It does not cover: subsequent edits or derivative versions, distribution channels not stated in the submission, jurisdictions not identified in the submission scope, or rights not associated with the submitted content.
]


// ═════════════════════════════════════════════════════════════════════════════
// APPENDIX A: CHAIN OF TITLE
// ═════════════════════════════════════════════════════════════════════════════

= Appendix A: Chain of Title

_Chain of Title documentation for "Cloud World: Pan from Baby to Auntie Guard" as disclosed by the submitter and reviewed by SI8._

#table(
  columns: (1fr, 2fr),
  [Field], [Detail],
  [Assessment ID], [ASSESS-005-2026-07-12],
  [Content Title], [Cloud World: Pan from Baby to Auntie Guard],
  [Submitter], [JDC_Media],
  [Submission ID], [SUB-A6A41B32],
  [Review Date], [12 July 2026],
  [Outcome], [Evidence Supports Intended Commercial Use],
  [Commercial Confidence], [High],
)

_Chain of Title detail is drawn from the domain findings in Section 3 above._

#v(2em)
#align(center)[
  #set text(size: 8.5pt, fill: c-gray)
  SI8 Commercial Assurance Assessment #sym.bar.v PMF Strategy Inc. d/b/a SuperImmersive 8 #sym.bar.v superimmersive8.com \
  Assessment ID: ASSESS-005-2026-07-12 #sym.bar.v Report date: 12 July 2026 #sym.bar.v Template v1.0
]
