// ─────────────────────────────────────────────────────────────────────────────
// SI8 Report Production Template
// Version: 1.0 | Effective: July 2026
// Author: SI8 — PMF Strategy Inc. d/b/a SuperImmersive 8
//
// Usage:
//   #import "../si8-report-template.typ": *
//
// This file exports color constants, typography helpers, and component
// functions. It does NOT apply global styles — those are set in each
// report source file for explicit control.
// ─────────────────────────────────────────────────────────────────────────────


// ═════════════════════════════════════════════════════════════════════════════
// COLOR SYSTEM
// ═════════════════════════════════════════════════════════════════════════════

#let c-black    = rgb("#1A1918")   // SI8 near-black — primary text
#let c-amber    = rgb("#C8900A")   // SI8 amber — primary accent
#let c-navy     = rgb("#1C3557")   // SI8 navy — headings, cover, metadata
#let c-bg       = rgb("#F0EDE8")   // Warm off-white — table alt rows, info boxes
#let c-border   = rgb("#D8D4CE")   // Light border
#let c-gray     = rgb("#4A4744")   // Secondary text, labels

// Confidence badge colors
#let c-conf-high-bg  = rgb("#E8F5E9")
#let c-conf-high-fg  = rgb("#1B5E20")
#let c-conf-med-bg   = rgb("#FFF8E1")
#let c-conf-med-fg   = rgb("#7A4900")
#let c-conf-low-bg   = rgb("#FFEBEE")
#let c-conf-low-fg   = rgb("#B71C1C")

// Domain status colors
#let c-verified-fg   = rgb("#1B5E20")
#let c-partial-fg    = rgb("#7A4900")
#let c-missing-fg    = rgb("#B71C1C")
#let c-na-fg         = rgb("#4A4744")


// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT: CONFIDENCE BADGE
// ═════════════════════════════════════════════════════════════════════════════

#let confidence-badge(level) = {
  let (bg, fg, label) = if level == "High" {
    (c-conf-high-bg, c-conf-high-fg, "● HIGH")
  } else if level == "Medium" {
    (c-conf-med-bg, c-conf-med-fg, "● MEDIUM")
  } else if level == "Low" {
    (c-conf-low-bg, c-conf-low-fg, "● LOW")
  } else {
    (c-bg, c-gray, level)
  }
  box(
    fill: bg,
    radius: 3pt,
    inset: (x: 9pt, y: 5pt),
  )[
    #text(fill: fg, weight: "bold", size: 9.5pt)[#label]
  ]
}


// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT: DOMAIN STATUS LABEL
// ═════════════════════════════════════════════════════════════════════════════

#let domain-status(status) = {
  let (fg, icon) = if status == "Verified" {
    (c-verified-fg, sym.checkmark)
  } else if status == "Partially Verified" {
    (c-partial-fg, "◐")
  } else if status == "Not Provided" {
    (c-missing-fg, sym.circle)
  } else {
    (c-na-fg, "—")
  }
  text(fill: fg, weight: "bold", size: 9.5pt)[#icon #status]
}


// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT: DOMAIN ASSESSMENT BLOCK
// ═════════════════════════════════════════════════════════════════════════════

#let domain-block(
  name: "",
  status: "",
  evidence-reviewed: [],
  finding: [],
  commercial-implication: [],
) = block(
  width: 100%,
  below: 1.6em,
)[
  // Domain header bar
  #block(
    width: 100%,
    fill: c-bg,
    inset: (x: 12pt, y: 8pt),
    radius: (top: 3pt),
  )[
    #grid(
      columns: (1fr, auto),
      align: (left + horizon, right + horizon),
      text(weight: "bold", size: 11pt, fill: c-navy)[#name],
      domain-status(status),
    )
  ]

  // Domain content
  #block(
    width: 100%,
    stroke: (left: 3.5pt + c-amber, rest: 0.5pt + c-border),
    inset: 12pt,
    radius: (bottom: 3pt),
  )[
    #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[EVIDENCE REVIEWED]
    #parbreak()
    #text(size: 10pt)[#evidence-reviewed]

    #v(8pt)
    #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[FINDING]
    #parbreak()
    #text(size: 10pt)[#finding]

    #v(8pt)
    #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[COMMERCIAL IMPLICATION]
    #parbreak()
    #text(size: 10pt)[#commercial-implication]
  ]
]


// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT: COVER PAGE
// ═════════════════════════════════════════════════════════════════════════════

#let cover-page(
  content-title: "",
  assess-id: "",
  report-date: "",
  submitter: "",
  submission-id: "",
  outcome: "",
  confidence: "High",
) = page(
  paper: "a4",
  margin: (top: 3cm, bottom: 3cm, left: 3.2cm, right: 3.2cm),
  header: none,
  footer: none,
)[

  // SI8 branding
  #text(size: 30pt, weight: "bold", fill: c-amber)[SI8]
  #h(0.6em)
  #text(size: 13pt, weight: "bold", fill: c-navy)[Campaign Assurance]
  #v(0.15em)
  #text(size: 9pt, fill: c-gray)[PMF Strategy Inc. d/b/a SuperImmersive 8]

  #line(length: 100%, stroke: 2pt + c-amber)

  #v(1fr)

  // Report type label
  #text(size: 10pt, weight: "bold", fill: c-navy, tracking: 1pt)[CAMPAIGN ASSURANCE ASSESSMENT]
  #v(0.5em)

  // Content title
  #text(size: 24pt, weight: "bold", fill: c-black)[#content-title]

  #v(1.6em)

  // Metadata block
  #block(
    fill: c-bg,
    inset: (x: 16pt, y: 14pt),
    radius: 4pt,
    width: 100%,
  )[
    #set text(size: 9.5pt)
    #grid(
      columns: (110pt, 1fr),
      row-gutter: 8pt,
      text(fill: c-gray, weight: "bold", size: 8.5pt)[ASSESSMENT ID],
      assess-id,
      text(fill: c-gray, weight: "bold", size: 8.5pt)[REPORT DATE],
      report-date,
      text(fill: c-gray, weight: "bold", size: 8.5pt)[SUBMITTED BY],
      submitter,
      text(fill: c-gray, weight: "bold", size: 8.5pt)[SUBMISSION ID],
      submission-id,
    )
  ]

  #v(1.2em)

  // Outcome + confidence block
  #block(
    stroke: 1.5pt + c-navy,
    inset: (x: 16pt, y: 14pt),
    radius: 4pt,
    width: 100%,
  )[
    #text(fill: c-gray, weight: "bold", size: 8.5pt, tracking: 0.5pt)[OVERALL ASSESSMENT OUTCOME]
    #v(0.5em)
    #text(size: 14pt, weight: "bold", fill: c-navy)[#outcome]
    #v(0.8em)
    #text(fill: c-gray, weight: "bold", size: 8.5pt, tracking: 0.5pt)[COMMERCIAL CONFIDENCE]
    #h(0.6em)
    #confidence-badge(confidence)
  ]

  #v(1fr)

  // Footer line
  #line(length: 100%, stroke: 0.5pt + c-border)
  #v(0.4em)
  #set text(size: 8pt, fill: c-gray)
  Prepared by: SI8 — PMF Strategy Inc. d/b/a SuperImmersive 8 #sym.bar.v superimmersive8.com #sym.bar.v #report-date
  #linebreak()
  This report is not legal advice. See Standard Assurance Language (Section 4) for full scope limitations.
]


// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT: ASSURANCE LANGUAGE BOX
// ═════════════════════════════════════════════════════════════════════════════

#let assurance-box(content) = block(
  fill: c-bg,
  stroke: (left: 4pt + c-navy),
  inset: (x: 14pt, y: 12pt),
  radius: (right: 3pt),
  width: 100%,
  below: 1.4em,
)[
  #set text(size: 9.5pt)
  #set par(leading: 0.7em, spacing: 1.0em)
  #content
]


// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT: EVIDENCE COVERAGE TABLE
// ═════════════════════════════════════════════════════════════════════════════

// Usage:
// #evidence-table((
//   ("Domain Name", "Status", "Gap note"),
//   ...
// ))

#let evidence-table(rows) = {
  let header = (
    text(fill: white, weight: "bold", size: 9pt)[Domain],
    text(fill: white, weight: "bold", size: 9pt)[Status],
    text(fill: white, weight: "bold", size: 9pt)[Commercial Impact of Any Gap],
  )
  let data = rows.map(row => (
    text(size: 9.5pt)[#row.at(0)],
    text(size: 9.5pt)[#row.at(1)],
    text(size: 9.5pt)[#row.at(2)],
  )).flatten()

  table(
    columns: (2fr, 1.4fr, 2fr),
    fill: (_, row) => if row == 0 { c-navy } else if calc.even(row) { white } else { c-bg },
    stroke: none,
    inset: (x: 10pt, y: 7pt),
    ..header,
    ..data,
  )
}


// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT: LABEL + VALUE (for Appendix A)
// ═════════════════════════════════════════════════════════════════════════════

#let field(label: "", value: "") = {
  grid(
    columns: (160pt, 1fr),
    gutter: 4pt,
    text(fill: c-gray, weight: "bold", size: 8.5pt, tracking: 0.3pt)[#upper(label)],
    text(size: 9.5pt)[#value],
  )
  v(4pt)
}
