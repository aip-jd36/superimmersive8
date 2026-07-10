// Static guidance content per active section / domain.
// Sourced from SI8 Reviewer Manual v0.1 Part 4.
// Updates here require a code deploy — no CMS needed for Year 1.

export const GUIDANCE: Record<string, string> = {
  '1': `SECTION 1 — INTAKE & SCOPE

Confirm scope before beginning evidence review.

No List check: Review the eight No List items. If any are triggered, stop — do not proceed to assessment. Document why the submission was halted in scope_limitations.

Evidence Custodian Declaration and Indemnification: These are logged by the platform at submission time. Confirm they appear in the submission context box before checking the boxes. If the platform shows a green ✓, check the box. If either shows ✗ or ?, do not proceed — contact the creator.

Video URL: Video URL is a required field on all submissions. If no URL appears in the context box, the submission record is incomplete — note "Video URL not provided — requested from creator" in Scope Limitations. Do not check the video_accessible scope box until you have confirmed the video is watchable. Email the creator immediately; assessment is paused until the URL is received.

Scope limitations: Record anything that will affect the reliability of this assessment. Incomplete evidence, video access issues, unusual commercial context — all belong here. Be specific. "Reviewer unable to verify audio source independently" is useful. "Some limitations noted" is not.`,

  '2': `SECTION 2 — VISUAL REVIEW

Watch the video in full at least once before recording any observations. Do not consult the submitter's declarations first — your observations must be independent.

Purpose: This section is a record of what you saw, not a judgment of whether the submission is accurate. Discrepancies between your observations and the submitter's declarations belong in Section 3 notes.

Likeness observations: If you suspect a synthetic figure resembles a real identifiable person, describe the resemblance specifically. Do not write "possible likeness" — write who or what the figure resembles and why you think so.

Brand and IP elements: "Possibly" is a valid answer if you cannot clearly read a logo or identify a mark. Record what you see, not what you infer.

Freeform observations: Write what you would tell another reviewer in a handover note. What was unusual? What caught your attention? What would affect your assessment if the submitter's declarations turned out to be wrong?`,

  'A': `DOMAIN A — IDENTITY & ACCOUNTABILITY

A01 is the foundation of the assessment. If the submitting party's identity or authority is unclear, the assessment cannot proceed with confidence.

What to look for:
- Is the submitting entity named and identifiable?
- Is their relationship to the content clear (creator, agency, brand)?
- If an agency submitted on behalf of a client, is that relationship documented?
- Did the submitter sign the Evidence Custodian Declaration?

Common gap: Agency submissions where it is unclear whether the agency holds the rights or is submitting on behalf of a client. Note the ambiguity — this affects the Chain of Title.

A01 judgment guide:
- Verified: Submitting party is clearly identified, their role is documented, and the declaration is signed.
- Partially Verified: Identity is clear but role or authority is ambiguous.
- Not Provided: No identification or declaration information submitted.`,

  'R': `DOMAIN R — COMMERCIAL RIGHTS & LICENSING

This domain is the highest-stakes part of the assessment. Commercial rights gaps are the most common reason for a non-Verified outcome.

R01 — Tool identification: All tools must be named. "AI tools were used" without specifics is Not Provided. Versions matter when tool terms changed between versions.

R02 — Commercial license: Check the ToS for each named tool as of the generation date, not the current date. Terms change. If a submitter used Runway Gen-2 in early 2023, the commercial rights at that time apply — not current terms. Use SI8's tool license reference (updated monthly) or check directly.

R03 — Custom models: Fine-tuned models trained on third-party data carry significant risk. If training data is unclear or not documented, this is Not Provided regardless of how complete other evidence is.

R04 — Output rights: Who owns the AI output? Most commercial tools grant rights to the subscriber for commercial use. Confirm this is consistent with the work-for-hire arrangement if a contractor or agency produced the work.`,

  'H': `DOMAIN H — HUMAN CREATIVE CONTRIBUTION

H01 — The key question is not "did a human do something?" but "is the human contribution documented well enough to support a copyright claim if one is ever challenged?"

Level of contribution:
- Substantial: Written prompts, iterative creative direction, significant post-production editing, original script/storyboard
- Moderate: Prompt writing with limited iteration, basic editing
- Minimal: Running a model with minimal direction, accepting first output

H02 — Authorship claim assessment: If the submitter is not claiming copyright, H02 may be Not Applicable. If they are claiming copyright in human-authored elements, the documented contribution must plausibly support that claim. Note: AI-generated output alone cannot be copyrighted in most jurisdictions — the human contribution to any claimed element is what matters.`,

  'I': `DOMAIN I — THIRD-PARTY IP

Watch the content directly for I01 and I03. Declarations are not sufficient — the reviewer must form an independent opinion.

I01 — Recognizable copyrighted content: Architecture, visual art, distinctive product designs, characters, and iconic set pieces can all carry copyright. Incidental capture (a store shelf with branded products visible in background) is different from deliberate depiction. Note both but assess differently.

I02 — Audio is frequently the weakest part of AI video submissions. AI-generated music platforms (Suno, Udio, Stable Audio) have varying commercial license terms. Licensed tracks require documentation — a playlist link is not documentation.

I03 — Logos and trademarks: Even clearly AI-generated content can contain synthetic logos that resemble real marks. Note these even if you cannot confirm they are deliberate. The submitter's declaration that "no brand elements are present" should be tested against your visual observation.`,

  'L': `DOMAIN L — LIKENESS & PERFORMER RIGHTS

This is the highest-liability domain. NY Synthetic Performer Law (effective June 9, 2026) creates "actual knowledge" liability — once SI8 identifies a synthetic performer resembling a real person, that knowledge is documented.

L01 — Watch specifically for faces, voices, and distinct physical personas. Do not rely on the submitter's declaration — watch independently first, then compare to what was declared.

Judgment guide for L01:
- "None identified" requires active confirmation through watching, not absence of declaration
- "Suspected" is appropriate if you see something plausible but cannot confirm
- "Confirmed" requires you to specifically identify the person or have strong evidence

L02 — Distinctness: A synthetic face that resembles no specific person is different from a synthetic face that resembles a specific identifiable person. The former is generally safer. The latter requires the same documentation as a real person's likeness.

L03 — If real person likeness is confirmed, a talent release or right of publicity license is required. These must be provided to complete this control as Verified.`,

  'T': `DOMAIN T — TECHNICAL PROVENANCE

T01 assesses whether the production workflow is documented well enough to establish a coherent provenance record.

What good documentation looks like:
- Written workflow description (which tools, in what order, for what purpose)
- Prompt logs or prompts-in-screenshots showing the generation sessions
- Output file metadata (creation dates, file provenance)
- Export history from the AI tool (most platforms have this)

Workflow coherence: If the described workflow is inconsistent with the output (e.g., claimed Runway but video has Kling-specific artifacts), note the inconsistency. This is not automatically a disqualification, but it requires an explanation.

T01 is Not Applicable only if the submission is entirely human-produced with AI as a minor tool. For any submission where AI is the primary generation engine, workflow documentation should be present.`,

  'D': `DOMAIN D — DOCUMENTATION INTEGRITY

D01 — Check dates across all submitted documents. Subscription receipt date must predate or match generation dates. If the receipt date is after the stated generation date, this is a significant inconsistency — note it explicitly.

Version consistency: If the submitter says they used Runway Gen-3 but the receipt is for a plan that only offered Gen-2 access, that is a version inconsistency. Check what plan tiers offered what tool access at the relevant dates.

D02 — Retroactive documentation: The most common sign is inconsistent timestamp metadata on PDF files, receipts with "print" or "download" dates that postdate the submission, and workflow descriptions that read as reconstructions rather than contemporaneous records.

Being suspicious is not the same as concluding retroactive documentation. Mark "Suspected" when something is off but you cannot confirm. Mark "Confirmed" only when the evidence clearly supports it.`,

  '6': `SECTION 6 — OVERALL ASSESSMENT

Outcome selection guide:

EVIDENCE SUPPORTS: All material controls are Verified or Not Applicable. No significant gaps. Commercial confidence is High or Moderate.

EVIDENCE SUPPORTS WITH CONDITIONS: Commercial use can proceed if specific, addressable conditions are met. Use this when evidence is strong but one domain has a gap that the client can remediate. State conditions specifically — not "client should review rights" but "client must obtain a sync license for the background audio track before commercial deployment."

MATERIAL RISKS IDENTIFIED: Evidence reveals specific risks that cannot be resolved through additional documentation. Use when a gap creates an inherent commercial risk regardless of supplementation.

INSUFFICIENT EVIDENCE: Evidence is too incomplete to reach a conclusion. Use when multiple material domains are Not Provided.

UNABLE TO REACH ASSESSMENT: Exceptional circumstances only — video not accessible, fundamental scope issue. Should be rare.

Commercial confidence is independent of outcome: A conditional outcome can have HIGH commercial confidence if the conditions are well-defined and achievable. Confidence reflects the quality of evidence reviewed, not whether the outcome is favorable.`,

  '7': `SECTION 7 — REPORT BRIEF

This section feeds directly into the Typst report template. Write for the client's legal team, not for SI8 internal use.

Executive summary: 2–4 sentences. State what was assessed, what outcome was reached, and the primary basis. Avoid hedging language — state the finding confidently.

Key findings: Mix positive and negative. A finding like "AI tool commercial licenses confirmed for all four named generation tools" is as important to document as a risk finding.

Residual risks: Even for EVIDENCE_SUPPORTS outcomes, note what SI8 could not independently verify. This protects SI8 and is honest with the client.

Recommended next steps: These are for the client. Be specific and actionable. "Obtain a sync license" is actionable. "Address audio concerns" is not.

Language consistency: The overall assessment statement must use the exact SI8 outcome language from Section 6. Do not paraphrase the outcome — use the standard language.`,
}
