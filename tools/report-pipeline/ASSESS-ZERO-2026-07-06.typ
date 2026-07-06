// ─────────────────────────────────────────────────────────────────────────────
// SI8 Campaign Assurance Assessment Report
// Assessment ID: ASSESS-ZERO-2026-07-06
// Content: Clarity — Harborne Financial App Campaign
// Submitter: Sarah Chen, Creative Director — Meridian Creative Ltd
// Report date: 6 July 2026
//
// Compile: typst compile ASSESS-ZERO-2026-07-06.typ ASSESS-ZERO-2026-07-06.pdf
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
        [*SI8* | Campaign Assurance],
        [ASSESS-ZERO-2026-07-06],
        [6 July 2026],
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
  content-title: "Clarity — Harborne Financial App Campaign",
  assess-id: "ASSESS-ZERO-2026-07-06",
  report-date: "6 July 2026",
  submitter: "Sarah Chen, Creative Director\nMeridian Creative Ltd",
  submission-id: "SUB-ZERO-2026-07-05",
  outcome: "Evidence Supports Intended Commercial Use with Conditions",
  confidence: "High",
)


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: COMMERCIAL ASSURANCE SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

= Section 1: Commercial Assurance Summary

_This section is designed for the commercial decision-maker: the brand legal team, executive producer, E&O underwriter, or procurement lead._

== Overall Assessment

*Outcome: Evidence Supports Intended Commercial Use with Conditions*

SI8 reviewed the Campaign Assurance submission for "Clarity — Harborne Financial App Campaign" by Meridian Creative Ltd, a 30-second AI-generated social campaign produced for a UK financial services client. Commercial licensing was confirmed for all primary AI generation tools, no identifiable real persons appear in the content, and human creative direction is documented in detail. The evidence reviewed supports the intended commercial use in the United Kingdom, subject to one specific condition regarding prompt-level provenance documentation before brand legal review.

== Commercial Confidence

#confidence-badge("High")
#v(0.4em)

#table(
  columns: (auto, 1fr),
  [*High*], [Core commercial evidence verified. Identified gaps are low commercial impact or addressable.],
  [Medium], [Material evidence verified but gaps present. Deployment should proceed with awareness of documented conditions.],
  [Low], [Core commercial evidence incomplete or inconsistent. Material gaps affect the reliability of the assessment.],
)

== Evidence Coverage Overview

#evidence-table((
  ("Identity & Accountability", "Verified", "None identified"),
  ("Commercial Rights & Licensing", "Verified", "None identified"),
  ("Human Creative Contribution", "Verified", "None identified"),
  ("Third-Party IP", "Verified", "Training data liability — structural residual risk"),
  ("Likeness & Performer Rights", "Verified", "None identified"),
  ("Technical Provenance", "Partially Verified", "Medium — prompt history export absent; addressable"),
  ("Documentation Integrity", "Verified", "None identified"),
))

== Key Findings

+ *Commercial Rights — Licensing confirmed for all primary tools:* Runway Gen-3 Alpha (Standard plan) and ElevenLabs (Starter plan) were used on commercially licensed subscriptions active at the time of production. Both tools' terms of service confirm commercial output rights for the plan tiers in use.

+ *Likeness & Performer Rights — No identifiable real persons in content:* Direct review of the submitted content confirms no identifiable real persons appear in any frame. The submitter deliberately excluded human faces from all generation prompts. ElevenLabs voice synthesis used the "Rachel" proprietary model — a professionally licensed voice, not a synthetic clone of any identified individual.

+ *Human Creative Contribution — Creative direction well-documented:* The submitter authored all Runway prompts, directed 12 generation sessions across 3 days, documented selection rationale for each of the 6 clips used, and made key editorial decisions in post-production. The level of documented creative direction is strong and supports the submitter's authority to represent this content commercially.

+ *Technical Provenance — Prompt history export not provided:* The submitter did not export the Runway generation history before ending sessions. A detailed prompt summary reconstructed from project notes was provided. The summary is credible and specific, but it is the submitter's reconstruction, not platform-level documentation. In the context of financial services brand deployment with a confirmed legal review gate, this gap is addressable before launch (see Conditions below).

+ *Third-Party IP — Music licence confirmed with perpetual terms:* The Artlist Pro licence for the licensed music track is on file. The licence explicitly permits advertising use, covers UK territory, and is perpetual for productions created during the active subscription period.

== Conditions

_The following condition should be addressed before campaign launch and before submission to the Harborne Financial legal review._

*1. Export or formalise the Runway generation history for the Clarity campaign sessions.*

Before launch, retrieve the generation history from your Runway account for the sessions used to produce this campaign. If retrospective export is available in your Runway account (generation history is typically retained for active accounts), export and retain the prompt logs in your campaign file.

If retrospective export is not available: prepare a signed, dated attestation document that formally records the prompt summary provided in this submission as your accurate representation of the generation process. The attestation should include: your name, role, the project name, the date of generation, and your confirmation that the prompt summary is accurate to the best of your knowledge.

Financial services brand legal teams reviewing AI-generated advertising content frequently request prompt-level provenance records during campaign approval. Having platform-level documentation — or a formal signed attestation as an alternative — will directly support the Harborne Financial legal review and reduce the likelihood of a delay to the 14 August launch date.

== Residual Commercial Risks

- *Training data liability:* Runway's training data composition is not publicly disclosed. As with all AI-generated visual content produced with current-generation models, there is an industry-standard residual risk that training data may include copyrighted material. This risk cannot be resolved through additional submission evidence — it is a structural characteristic of the current AI content landscape. Commercial parties deploying AI-generated content should note this risk and monitor industry and regulatory developments.

- *ASA monitoring:* The UK Advertising Standards Authority has indicated it is developing guidance on AI-generated content in advertising. No specific compliance obligation for AI provenance documentation is currently in force for UK digital advertising. Brands in regulated sectors with active legal review processes should monitor ASA updates through the campaign's active deployment period.

== Recommended Next Steps

+ *Retain this report* and the supporting submission package in the Clarity campaign file. Harborne Financial's legal team and any future E&O underwriter may request evidence of pre-deployment commercial review.
+ *Address the prompt history condition* before submission to Harborne Financial's legal team. Attempt retrospective export from Runway; prepare a signed attestation if export is unavailable.
+ *Monitor ASA guidance* on AI-generated advertising content through the campaign's active deployment period.
+ *Resubmit on material change.* If the campaign content is substantially edited, if the ElevenLabs voice is replaced, or if deployment territory expands beyond the United Kingdom, a new assessment is warranted.


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: ASSESSMENT SCOPE
// ═════════════════════════════════════════════════════════════════════════════

= Section 2: Assessment Scope

*Content assessed:*
"Clarity — Harborne Financial App Campaign" — 30-second social media video (landscape 16:9 + square 1:1 versions), produced by Meridian Creative Ltd for Harborne Financial Ltd. Intended for paid placement on Instagram Reels and LinkedIn Video. Territory: United Kingdom only. Intended deployment date: 14 August 2026.

*AI tools declared by submitter:*
- Runway Gen-3 Alpha — primary video generation (12 sessions, 6 clips selected)
- ElevenLabs ("Rachel" model) — voice synthesis, commercial Starter plan
- ChatGPT-4 GPT Plus — script drafting assistance; human revision of all AI outputs
- Adobe Photoshop — title card layout; human use; AI generation features not used
- Adobe Premiere Pro — post-production assembly, grading, mixing

*Evidence provided:*
- Completed CertForm submission (11 sections, Agency/Production House mode)
- Runway subscription receipt (May 2026)
- ElevenLabs subscription receipt (March 2026)
- Artlist Pro music licence certificate
- Production workflow description (multi-stage, detailed)
- Prompt summary (scene-by-scene, with iteration rationale)
- Evidence Custodian Declaration (signed 5 July 2026)
- Direct review of submitted video content

*Scope limitations:*
Runway prompt history export was not provided by the submitter. This assessment relies on the submitter's workflow description and a reconstructed prompt summary for Domain T (Technical Provenance) evidence. This limitation is addressed in the Conditions in Section 1.


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: DOMAIN ASSESSMENT
// ═════════════════════════════════════════════════════════════════════════════

= Section 3: Domain Assessment

_Full evidence assessment by domain. Each domain follows a consistent structure: evidence status, evidence reviewed, finding, and commercial implication. This section provides the evidentiary basis for the overall assessment in Section 1._

#domain-block(
  name: "Domain A — Identity & Accountability",
  status: "Verified",
  evidence-reviewed: [CertForm submitter identity fields: Sarah Chen, Creative Director, Meridian Creative Ltd. Agency/Production House submission mode confirmed. Evidence Custodian Declaration signed by Sarah Chen, 5 July 2026.],
  finding: [The submitting party is identified as Sarah Chen, Creative Director, at Meridian Creative Ltd. An Evidence Custodian Declaration is on file, confirming the submitter's authorisation to submit this content on behalf of Meridian Creative Ltd and her responsibility for the accuracy of the evidence provided. Meridian Creative Ltd is the production party; Harborne Financial Ltd is the end client.],
  commercial-implication: [Identity and accountability are confirmed. The submission is attributed to a named party with documented authority. The agency-on-behalf-of-client structure is standard and does not raise accountability concerns.],
)

#domain-block(
  name: "Domain R — Commercial Rights & Licensing",
  status: "Verified",
  evidence-reviewed: [Runway ML Inc. receipt #RWY-2026-05-48291 (15 May 2026) — Standard plan, \$15/month, commercial output rights confirmed in Runway's published terms. ElevenLabs Inc. receipt #EL-2026-03-00714 (3 March 2026) — Starter plan, \$5/month, commercial licence stated in ElevenLabs' published terms. OpenAI GPT Plus and Adobe Creative Cloud commercial terms reviewed; commercial use of outputs confirmed for both platforms.],
  finding: [Commercial licensing was confirmed for all primary AI generation tools used in the production of this campaign. Runway Gen-3 Alpha was used on a Standard plan with a subscription receipt predating the production dates by approximately four weeks. ElevenLabs was used on a Starter plan with a subscription receipt predating the generation date by approximately three and a half months. Both tools' terms of service confirm that paid plan subscribers hold commercial output rights for generated content.],
  commercial-implication: [The commercial licensing evidence supports the submitter's authority to deploy AI-generated content from the declared tools in commercial contexts. Commercial output rights are confirmed for the plan tiers used at the time of production.],
)

#domain-block(
  name: "Domain H — Human Creative Contribution",
  status: "Verified",
  evidence-reviewed: [Production workflow description — multi-stage documentation covering script drafting, Runway generation sessions (12 sessions, 6 selected with documented rationale), ElevenLabs voice takes, and post-production editorial decisions. Prompt summary — scene-by-scene documentation of prompting strategy, iteration rationale, and selection criteria for each of the 6 clips used.],
  finding: [Human creative direction is documented in substantive detail. Sarah Chen authored all Runway prompts across 12 generation sessions spanning three days, applied specific criteria to select 6 of 12 clips, made documented decisions about camera motion, colour temperature, and content characteristics, directed ElevenLabs voice synthesis takes, and made key editorial decisions in Adobe Premiere Pro. The production workflow includes a documented prompt iteration table with stated selection rationale for each rejected and accepted clip — an above-average level of creative process documentation. The script was drafted with ChatGPT-4 assistance; the submitter confirms the final script is substantially her own writing, reviewed and approved by the client before production.],
  commercial-implication: [The documented level of human creative direction supports the submitter's authority to represent this content commercially. The evidence of directed creative process — iterative prompting with documented selection criteria, editorial decisions, post-production direction — establishes a clear creative contribution that goes beyond passive use of AI generation tools.],
)

#domain-block(
  name: "Domain I — Third-Party IP",
  status: "Verified",
  evidence-reviewed: [Direct review of submitted video content. Artlist Pro licence certificate for licensed music track. CertForm Section 10 (third-party IP disclosure). Submitter's workflow description confirming the Harborne Financial logo is a human-designed asset provided by the client.],
  finding: [Direct review of the submitted content did not identify any third-party copyrighted characters, artwork, brand elements (other than the submitter's client's own logo), or distinctive architectural works. All six visual sequences are AI-generated abstract environments, data visualisations, and environmental shots. The Harborne Financial logo appears in the title card and is the client's own asset — human-designed, used with the client's permission. The licensed music track is covered by an Artlist Pro licence explicitly permitting commercial advertising use, covering UK territory, with perpetual rights for the active subscription period. Training data: Runway's training data composition is not publicly disclosed — noted as a structural residual risk.],
  commercial-implication: [No identifiable third-party copyrighted elements were observed in this content. The music licence is confirmed, documented, and covers the intended deployment. The structural training data residual risk is present — as in all AI-generated content — and is noted in Residual Commercial Risks in Section 1.],
)

#domain-block(
  name: "Domain L — Likeness & Performer Rights",
  status: "Verified",
  evidence-reviewed: [Direct review of submitted video content. CertForm Section 11 (likeness disclosure). ElevenLabs documentation regarding the "Rachel" voice model.],
  finding: [Direct review of the submitted content confirms that no identifiable real persons appear in any frame of the campaign. The submitter deliberately excluded human faces from all Runway generation prompts. All six selected clips use abstract environments, over-shoulder framing, aerial-perspective hand shots, or back-to-camera figures. No figure is identifiable as any specific real person. The synthesised voice was produced using ElevenLabs' "Rachel" model — a proprietary, commercially licensed voice model, not a synthetic clone of any non-consenting individual's voice. UK territory only: the NY Synthetic Performer Law (S.8420-A, effective 9 June 2026) does not apply to this UK-only deployment.],
  commercial-implication: [The deliberate design decision to exclude identifiable human figures eliminates the primary likeness risk in this campaign. The ElevenLabs voice model confirmation further supports a clean likeness finding. For UK deployment, no synthetic performer disclosure obligation is currently in force.],
)

#domain-block(
  name: "Domain T — Technical Provenance",
  status: "Partially Verified",
  evidence-reviewed: [Production workflow description — detailed multi-stage workflow covering all production phases. Prompt summary — submitter-reconstructed scene-by-scene prompt documentation. Runway prompt history export: not provided. CertForm Section 5 note confirming the export was not completed before sessions ended.],
  finding: [The production workflow is documented at a level sufficient to reconstruct the generation sequence and understand the role of each tool in the production process. The workflow description and prompt summary together establish which Runway sessions produced which clips, what prompting strategy was used for each scene, and what selection criteria guided the submitter's choices. However, the Runway generation history export (platform-level documentation of the prompts as entered in Runway) was not provided. The prompt summary is a submitter-authored reconstruction from project notes, not a platform export — it does not carry the same evidential weight as platform-level documentation. No provenance metadata (C2PA/Content Credentials, on-chain registration) was present in the submitted files. This is optional and its absence is not a finding.],
  commercial-implication: [The production workflow is documented well enough to support the other domain findings. The absence of platform-level prompt documentation creates a specific gap for this deployment context: Harborne Financial's legal team, operating in a regulated sector with confirmed AI content scrutiny, is more likely than average to request prompt-level provenance records. The condition in Section 1 addresses this gap specifically.],
)

#domain-block(
  name: "Domain D — Documentation Integrity",
  status: "Verified",
  evidence-reviewed: [Cross-reference of Runway receipt date (15 May 2026) against production dates (14–16 June 2026). Cross-reference of ElevenLabs receipt date (3 March 2026) against voice generation date (17 June 2026). Cross-reference of Artlist licence date (2 January 2026) against music use date (18 June 2026). Cross-reference of declared tools against content characteristics observed in direct review. Cross-section review of CertForm for internal contradictions.],
  finding: [No material inconsistencies were identified in the submitted evidence package. All subscription receipt dates predate the relevant production activities. The declared tools and plan tiers are consistent with the quality and characteristics of the generated content. No contradictions were identified between CertForm sections. A minor observation about script approval timing (approval 16 June, Runway sessions began 14 June) is consistent with standard non-sequential video production practice and does not constitute a material inconsistency.],
  commercial-implication: [The evidence package is internally consistent. The reliability of the domain-level findings is not undermined by date misalignments, tool-to-content inconsistencies, or cross-section contradictions.],
)


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: STANDARD ASSURANCE LANGUAGE
// ═════════════════════════════════════════════════════════════════════════════

= Section 4: Standard Assurance Language — SI8 Methodology v0.2

_This is controlled policy language reproduced verbatim in every SI8 Campaign Assurance Assessment Report. It may only be revised through a formal SI8 Methodology revision — not customized per assessment or per client._

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
// APPENDIX A: SUPPORTING EVIDENCE RECORD
// ═════════════════════════════════════════════════════════════════════════════

= Appendix A: Supporting Evidence Record

_This appendix provides a structured record of the evidence submitted. It is a documentation record, not a narrative assessment. For the commercial assessment and findings, see Sections 1–3._

#block(
  fill: c-bg,
  inset: (x: 16pt, y: 14pt),
  radius: 4pt,
  width: 100%,
)[
  #field(label: "Content title", value: "Clarity — Harborne Financial App Campaign")
  #field(label: "Format", value: "Video — 30 seconds (16:9 master + 1:1 cut)")
  #field(label: "Production date", value: "June 2026 (sessions 14–18 June 2026)")
  #field(label: "Intended commercial use", value: "Paid social media advertising (Instagram Reels, LinkedIn Video)")
  #field(label: "Intended territory", value: "United Kingdom only")

  #v(6pt)
  #line(length: 100%, stroke: 0.5pt + c-border)
  #v(6pt)

  #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[AI TOOLS DECLARED]
  #v(4pt)
  #field(label: "Tool 1", value: "Runway Gen-3 Alpha — primary video generation")
  #field(label: "Tool 2", value: "ElevenLabs (\"Rachel\" model) — voice synthesis")
  #field(label: "Tool 3", value: "ChatGPT-4 GPT Plus — script drafting assistance")
  #field(label: "Tool 4", value: "Adobe Photoshop — title card layout (human use)")

  #v(6pt)
  #line(length: 100%, stroke: 0.5pt + c-border)
  #v(6pt)

  #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[COMMERCIAL LICENCE STATUS]
  #v(4pt)
  #field(label: "Runway", value: "Verified — receipt on file (May 2026, Standard plan)")
  #field(label: "ElevenLabs", value: "Verified — receipt on file (March 2026, Starter plan)")
  #field(label: "ChatGPT-4 GPT Plus", value: "Verified — commercial terms confirmed; no receipt")
  #field(label: "Adobe", value: "Verified — commercial terms confirmed; no receipt")

  #v(6pt)
  #line(length: 100%, stroke: 0.5pt + c-border)
  #v(6pt)

  #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[HUMAN CREATIVE CONTRIBUTION]
  #v(4pt)
  #field(label: "Workflow documented", value: "Yes — multi-stage workflow description on file")
  #field(label: "Summary", value: "Sarah Chen authored all prompts, directed 12 generation sessions, selected 6 clips with documented rationale, directed voice synthesis, made all post-production editorial decisions.")

  #v(6pt)
  #line(length: 100%, stroke: 0.5pt + c-border)
  #v(6pt)

  #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[AUDIO]
  #v(4pt)
  #field(label: "Source", value: "Mixed — AI synthesis (ElevenLabs) + licensed music (Artlist)")
  #field(label: "Voice licence", value: "Yes — ElevenLabs Starter plan commercial licence")
  #field(label: "Music licence", value: "Yes — Artlist Pro perpetual commercial licence")

  #v(6pt)
  #line(length: 100%, stroke: 0.5pt + c-border)
  #v(6pt)

  #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[THIRD-PARTY ASSETS]
  #v(4pt)
  #field(label: "Declared", value: "Music track (licensed, Artlist Pro); Harborne Financial logo (client asset, human-designed, permission confirmed)")
  #field(label: "Licence on file", value: "Yes — Artlist Pro licence certificate on file")

  #v(6pt)
  #line(length: 100%, stroke: 0.5pt + c-border)
  #v(6pt)

  #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[LIKENESS / PERFORMER]
  #v(4pt)
  #field(label: "Real person present", value: "No — confirmed by direct content review")
  #field(label: "AI-generated performer", value: "No faces visible; abstract figures only")
  #field(label: "Release on file", value: "N/A")

  #v(6pt)
  #line(length: 100%, stroke: 0.5pt + c-border)
  #v(6pt)

  #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[PROVENANCE METADATA]
  #v(4pt)
  #field(label: "C2PA / Content Credentials", value: "Not present")
  #field(label: "On-chain registration", value: "Not present")

  #v(6pt)
  #line(length: 100%, stroke: 0.5pt + c-border)
  #v(6pt)

  #text(weight: "bold", fill: c-gray, size: 8.5pt, tracking: 0.5pt)[ASSESSMENT CROSS-REFERENCE]
  #v(4pt)
  #field(label: "Assessment ID", value: "ASSESS-ZERO-2026-07-06")
  #field(label: "Report date", value: "6 July 2026")
  #field(label: "Template version", value: "0.2")
  #field(label: "Overall outcome", value: "Evidence Supports Intended Commercial Use with Conditions")
]

#v(2em)
#align(center)[
  #set text(size: 8.5pt, fill: c-gray)
  SI8 Campaign Assurance Assessment #sym.bar.v PMF Strategy Inc. d/b/a SuperImmersive 8 #sym.bar.v superimmersive8.com \
  Assessment ID: ASSESS-ZERO-2026-07-06 #sym.bar.v Report date: 6 July 2026 #sym.bar.v Template v0.2
]
