# Governed Claims

**Status: ACTIVE — Phase 1 skeleton, 2026-08-16.** Canonical home for atomic governed knowledge, per SI8 Living Knowledge Expansion PRD v0.2 and the repo-grounded technical design (`08_Platform/implementation/LK_PHASE1_TECHNICAL_DESIGN.md`, `LK_PHASE1_TECHNICAL_DESIGN_v2.md`).

**This document does not replace or change the purpose of:**
- `PLATFORM-RIGHTS-MATRIX.md` — existing tool-scoped commercial-use claims stay there as legacy content, unchanged by this document; a new governed proposition may still be tool-specific and live here instead, via `tool_scope` (see below).
- `SI8-POSITIONS.md` — settled institutional stances stay there, unchanged.
- `EDGE-CASES.md` / `PENDING-QUESTIONS.md` — unchanged.

**Its role is specifically:** governed knowledge expressed as a `TopicClaim`. Most propositions to date apply regardless of which AI tool was used (Wave 1, U.S. Copyright & Human Authorship, has no Matrix row to attach to) — but a `TopicClaim` may also represent a tool-specific proposition, narrowed via `tool_scope` (see its own doc comment, `retrieval-engine/types.ts`). A tool's historical placement in `PLATFORM-RIGHTS-MATRIX.md` does not by itself determine whether a governed proposition for that tool belongs here instead — see `CRC-PUBLICATION-POLICY.md`'s tool-scoped legacy-coexistence practice for what CRC Publication Review must additionally check before granting `CRC Eligible: Yes` to such a claim.

## How to read a claim

Mirrors the CRC Claims sub-table convention already used in `PLATFORM-RIGHTS-MATRIX.md`, extended with the fields non-tool-scoped knowledge needs (jurisdiction, applicability, lifecycle, version lineage). See `LK_PHASE1_TECHNICAL_DESIGN.md` §5 for the full field-by-field rationale.

**Governance discipline (non-negotiable, per PM approval 2026-08-16):**
- Existing repo research (`01_Business/research/`, `06_Operations/legal/rights-playbook/research/`) is **candidate source material only** — never automatically governed knowledge, regardless of how many documents repeat a claim or how many LLMs agreed on it.
- `Lifecycle: Adopted` requires independent primary-source re-verification, not reuse of an unverified repo citation.
- `Publication scope: CRC eligible` is a **separate decision** from Adoption — an Adopted claim may remain reviewer/internal-only indefinitely.
- No claim may reference an `Applicability requirements` fact type outside the Phase 1 implemented set (`jurisdiction`, `tool_plan_tier`) — see `08_Platform/app/lib/retrieval-engine/types.ts`'s `APPLICABILITY_FACTS` for the enforced list. Referencing a reserved/future fact type would author a claim that can never become applicable, silently.
- `CRC Approver` must always be a real, named human. No automated "legal reviewer" role exists or is permitted.
- `Adoption Approver` (added 2026-08-16, first formal adoption decision) — the human governance approver of `Lifecycle: Adopted` itself, distinct from `CRC Approver` (which governs CRC-eligible publication specifically). Same discipline: always a real, named human, never automated. A claim can be `Adopted` with `Adoption Approver` recorded while `CRC Approver` remains `PENDING` indefinitely — this is the expected, intentional state for reviewer/internal-only knowledge, not a gap.
- **`Jurisdiction: Global`** (governance meaning fixed 2026-08-17, PM approval, following CLAIM-COPY-004's comparative-law hardening pass — see `01_Business/research/COPY-004-SOURCE-HARDENING-RESEARCH-2026.md` Part 2): means the claim states a **jurisdiction-neutral structural relationship between legal concepts** — pressure-tested across materially different legal systems (the COPY-004 pass checked United States, United Kingdom, European Union, Taiwan, and Japan) — not that its detailed substantive rule has been verified in every jurisdiction worldwide. A claim stating a specific substantive legal outcome (e.g. a copyrightability determination, an ownership rule) must be jurisdiction-scoped (as CLAIM-COPY-001/002/003 already are, to `United States (federal)`), never labeled `Global`, no matter how confident the drafter is that the outcome likely generalizes. **This strict meaning is unchanged and is not redefined by the transitional rule immediately below.**
- **Transitional jurisdiction representation for provider/platform propositions** (PM/Architecture decision, 2026-08-30, following the LK-26/LK-27 diagnostic pair): for provider/platform contractual, policy, licensing, or factual propositions, jurisdiction is conceptually **not a dimension of the claim at all** unless the proposition itself makes jurisdiction material — categorically different from `Jurisdiction: Global`'s own strict meaning immediately above. Existing historical use of `Global` for such propositions (e.g. the Stock/Music provider-contractual claims already recorded in this document) is **tolerated legacy representation**, confirmed to have zero runtime/retrieval effect (`TopicClaim.jurisdiction` is read by no production code path) — it must never be read as evidence that a provider term was legally validated worldwide, that a legal conclusion holds across jurisdictions, that provider policy equals law, or that cross-jurisdiction legal analysis was performed. Until the canonical schema supports an explicit not-applicable jurisdiction representation — a possible future model milestone, not committed to by this bullet — a **new** provider/platform proposition of this kind may use `Global` as a bounded transitional compatibility placeholder only where: jurisdiction genuinely is not a dimension of the proposition; the proposition is not itself a jurisdiction-specific legal conclusion; and the claim's own evidence-limitations/prohibited-conclusions text makes explicit that no worldwide legal conclusion is asserted. This is a transitional representation convention only, never a permanent redefinition of `Global`, and does not itself authorize Adoption, CRC eligibility, or any FGR/CPR reopening for any claim.
- **Every Formal Governance Review must be preserved as a durable, verbatim repository artifact** (process rule established 2026-08-17, governance-artifact-preservation milestone, following the discovery that Formal Governance Reviews #1–#5 existed only in session/conversation output, not as files) — before or as part of the subsequent PM governance-recording step that adopts (or declines) the reviewed candidate. The full review artifact, archived under `06_Operations/institutional-knowledge/notebook/governance-reviews/` (see that folder's own `README.md` for naming convention and verbatim discipline), is the decision-analysis record — clause-by-clause accuracy, source-tier assessment, atomicity/boundary tests, the complete reasoning a PASS/HOLD/REJECT recommendation rested on. This document remains the canonical current-state ledger and may contain only a condensed review summary (as every claim entry below already does) plus a reference to the full review artifact — it must never be the only place a review's full reasoning survives.
- **Evidence retrieval and human-assisted source capture** (process rule established 2026-08-27, Music/Audio Scenario A milestone) — when an authoritative source cannot be reliably retrieved by tooling, see `EVIDENCE-CAPTURE-SOP.md` (this folder) for the required retrieval order, human-capture provenance classification, and fail-closed handling of incomplete/contradictory supplied evidence. Domain-generic — also governs `PLATFORM-RIGHTS-MATRIX.md`, which this document does not otherwise own.
- **Every formal CRC Publication Review must be preserved as a durable, verbatim repository artifact** (process rule established 2026-08-18, extending the identical discipline above from the adoption stage to the separate CRC-publication stage — same folder, same verbatim boundary convention, distinct `CPR_NNN_<claim-id>_<review-date>.md` naming so a Formal Governance Review and a CRC Publication Review for the same claim are never confused as one artifact) — before or as part of the subsequent PM publication-recording step that sets `CRC Eligible: Yes` (or declines to). This document remains the canonical current-state ledger and may contain only a condensed publication-review summary plus a reference to the full review artifact — it must never be the only place a publication review's full reasoning survives.

## Entry template

```markdown
### CLAIM-XXX-NNN-v1
Domain:
Topic:                          <!-- must match an existing GoalCategory value -->
Subtopic:
Claim character: established     <!-- established | conditional | unsettled -->
Jurisdiction:
Context:
Claim proposition: >

Source references:
  - primary:
Source authority/type:          <!-- Primary legal/official authority | Official platform authority | Strong secondary authority | Industry evidence | SI8 operational evidence | SI8 judgment -->
Source fact: >

SI8 interpretation: >

Applicability requirements:
  - fact: jurisdiction | tool_plan_tier
    operator: equals | not_equals
    value:
Unresolved project dependencies: []   <!-- free-form identifiers (snake_case, one per distinct missing concept, e.g. human_contribution_description) naming project-specific facts CRC does not currently model that this claim's real-world application depends on, even after all Applicability requirements above are met. Informational governance metadata only -- never evaluated against any fact, never gates whether this claim reaches CRC. Empty list is the default: means this claim is fully resolvable once its formal Applicability requirements are met. Non-empty triggers relevant_applicability_unresolved (Case 3B) instead of directly_relevant once this claim is Adopted + CRC-eligible -- see lib/bounded-interpretation/types.ts. -->
Tool scope: null                 <!-- null | [<canonical tool identifiers>] (LK-7, 2026-08-29). Structurally parallel to a provider_scope field, but for AI tools rather than third-party asset providers -- NEVER the same field, never merged. Narrows an ALREADY topic-relevant claim to specific AI tools; it never creates topic relevance on its own (a tool being named does not by itself make this claim a candidate -- see TopicClaim.tool_scope's own doc comment, retrieval-engine/types.ts, for the full boundary). null is the default: means this claim is tool-independent. Non-empty means the claim only applies when the project confirms one of the listed tools. -->
Prohibited conclusions: >

Lifecycle: Candidate            <!-- Candidate | Under Review | Adopted | Deprecated -->
Adoption Approver:              <!-- required once Lifecycle: Adopted; must be a real, named human -->
Adoption Decision Date:         <!-- required once Lifecycle: Adopted -->
Publication scope: Internal/research   <!-- Internal/research | Reviewer/Commercial Assurance | CRC eligible | Public SI8 position -->
CRC Publication Scope: >

CRC Candidate Statement: >

Effective date:
Last reviewed:
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver:
CRC Decision Date:
Related: [[POS-XXX]], [[EC-XXX]], [[PQ-XXX]]
```

## Claims

**Wave 1 claims below — Lifecycle: Adopted (Adoption Approver: JD, 2026-08-16), Publication scope: Reviewer/Commercial Assurance. SI8 institutional/reviewer knowledge as of this date. None are CRC-eligible — `CRC Approver`/`CRC Decision Date` remain PENDING on all four, and CRC Topic Retrieval continues to exclude them entirely (Lifecycle: Adopted alone does not satisfy `crc_eligible: 'Yes'`, which nothing in this adoption decision changed).** Primary sources independently re-verified via live web search on 2026-08-16 (not reused from repo research without re-checking) — see each claim's Source references.

### CLAIM-COPY-001-v1
Domain: Copyright & Human Authorship
Topic: copyrightability
Subtopic: no-human-authorship-not-copyrightable
Claim character: established
Jurisdiction: United States (federal)
Context: commercial AI-generated video with no meaningful human creative contribution
Claim proposition: >
  AI-generated video content produced entirely by AI, with no meaningful human
  creative contribution, is not eligible for copyright protection under U.S. law.

Source references:
  - primary: U.S. Copyright Office, "Copyright and Artificial Intelligence, Part 2: Copyrightability" (Jan 29, 2025) — copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf
  - primary: Thaler v. Perlmutter -- procedural history, precisely stated (2026-08-16 governance review correction): U.S. District Court for D.C. (Judge Beryl Howell, 2023) ruled human authorship is a bedrock requirement and upheld USCO's refusal to register Thaler's AI-generated work; D.C. Circuit affirmed that ruling (2025); U.S. Supreme Court denied certiorari March 2, 2026, "without comment." The certiorari denial is a discretionary decision not to hear the case -- it is NOT a Supreme Court ruling on the merits and must never be described as the Supreme Court "affirming" anything. Its only legal effect is leaving the D.C. Circuit's own affirmance undisturbed as the controlling appellate holding in that circuit.
Source authority/type: Primary legal/official authority
Source fact: >
  USCO Part 2 Report (independently re-verified 2026-08-16, not reused from repo
  research without checking): "Human authorship is a bedrock requirement of
  copyrightability... works entirely generated by AI are not copyrightable. The
  outputs of generative AI can be protected by copyright only where a human
  author has determined sufficient expressive elements." Thaler v. Perlmutter:
  SCOTUS denied certiorari Mar 2, 2026 without comment, leaving the D.C.
  Circuit's human-authorship-required ruling in place as the controlling
  appellate holding -- confirmed live via web search (both this session and
  independently re-confirmed 2026-08-16 during governance review), not
  assumed from prior repo research. See Source references above for the full
  three-court procedural chain.

SI8 interpretation: >
  [Labeled per 2026-08-16 governance review: this is SI8 OPERATIONAL/BUSINESS
  JUDGMENT applying the source-derived legal rule above, NOT itself sourced
  from the USCO Report or Thaler. The Report and case establish the legal
  RULE (no-contribution AI output isn't copyrightable); the sentence below is
  SI8's own recommendation about how that rule should inform a commercial
  representation, and should not be read as if the source itself said this.]
  A commercial AI video with no confirmed human creative contribution should
  not be represented to a client, buyer, or platform as copyright-protected
  output.

Applicability requirements:
  - fact: jurisdiction
    operator: equals
    value: United States
Unresolved project dependencies: [human_contribution_description]   <!-- renamed 2026-08-19 from human_creative_contribution_level (Copyright UAT Correction Milestone, PM-approved pure naming-consistency change -- no proposition/statement/scope/lifecycle/CRC-eligibility change) -->
Prohibited conclusions: >
  Does not establish whether a SPECIFIC video has sufficient human
  contribution to qualify -- see CLAIM-COPY-003 for the fractional-authorship
  question. Does not address international/EU/other-jurisdiction status.
  Does not constitute a copyrightability determination for any individual
  work -- that remains a Commercial Assurance Assessment / legal-review
  question, never a CRC output.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-16
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-19, CRC Approver: JD (PM) -- see CRC
  Approver/CRC Decision Date below; atomic copyright publication package
  complete, recommendation A — PASS/GO AS-IS, archived at
  `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`).
  Text below is unchanged from the pre-approval draft, per governance
  instruction not to reinterpret or rewrite substantive claim text when
  changing lifecycle/publication status: CRC may state that, under current
  U.S. law, AI-generated video with no meaningful human creative contribution
  generally does not qualify for copyright protection, and that this is a
  distinct question from whether the video is safe to use commercially (see
  CLAIM-COPY-004). CRC must not state whether the user's own specific video
  qualifies.

CRC Candidate Statement: >
  Under current U.S. copyright law, AI-generated video without meaningful
  human creative contribution generally isn't eligible for copyright
  protection. This is a different question from whether you're clear to
  use the video commercially.

Effective date: 2026-08-16
Last reviewed: 2026-08-16
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-19
Related: [[POS-001]], [[EC-001]], [[PQ-004]], [[PQ-005]]

Phase 1 CRC-publication governance review (2026-08-17): PASS / GO AS-IS --
claim wording, sources, jurisdiction, applicability, and unresolved-
dependency metadata are all sound and safe for automated CRC surfacing.
CRC Eligible deliberately KEPT Pending -- not a safety/adequacy finding.
Reason: CRC can retrieve this governed principle and correctly flag it as
`relevant_applicability_unresolved`, but does not yet compose overlapping
copyrightability principles (this claim, COPY-002, COPY-003) differently
based on what the user actually described -- see the deferred "Project-
Fact-Aware Bounded Composition" capability, `PRD_LIVING_KNOWLEDGE_
SOURCE_INPUTS_v0.1.md` §27. PM decision: hold publication timing until
that capability (or an equivalent decision) is ready. COPY-004 is
unaffected and remains CRC Eligible: Yes.

**Atomic copyright publication package (2026-08-19):** following a bounded
Copyright CRC Publication-Readiness Review (2026-08-19, recommendation A —
PASS/GO AS-IS for this claim and its three sibling objects jointly) and PM
approval, this claim is now `CRC Eligible: Yes` below, published together
with CLAIM-COPY-002-v1, CLAIM-COPY-003-v1, and
REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 in a single atomic governance
decision -- not sequentially -- because the relationship has no live effect
without at least one eligible target claim, and a partial claim subset
would leave the review's own motivating acceptance-test question ("do I
own the copyright?", prompts + editing) meaningfully unanswered. The
review's own load-bearing finding, preserved here rather than solved: this
claim's `applicability_requirements` (confirmed U.S. jurisdiction) means it
will not surface at all for any conversation where jurisdiction remains
unconfirmed -- expected, correct applicability behavior, not a routing
defect, and explicitly not addressed by this publication decision.

Full CRC Publication Review artifact: `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`

### CLAIM-COPY-002-v1
Domain: Copyright & Human Authorship
Topic: copyrightability
Subtopic: prompts-alone-insufficient-for-authorship
Claim character: established
Jurisdiction: United States (federal)
Context: any AI-generated output where the human's only contribution is prompting
Claim proposition: >
  Writing prompts alone -- even detailed, iterative, or refined prompts --
  does not by itself establish sufficient human authorship for U.S. copyright
  purposes.

Source references:
  - primary: U.S. Copyright Office, "Copyright and Artificial Intelligence, Part 2: Copyrightability" (Jan 29, 2025) — copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf
  - primary: Zarya of the Dawn (U.S. Copyright Office registration decision, Feb 21, 2023) — copyright.gov/docs/zarya-of-the-dawn.pdf
Source authority/type: Primary legal/official authority
Source fact: >
  RE-VERIFIED 2026-08-16 (governance review correction): the prior version of
  this record cited a single legal-industry summary as its verification
  authority, which PM correctly flagged as insufficient for first-wave
  governance. This re-verification instead cross-triangulates VERBATIM
  quoted language across two independent, reputable secondary sources that
  each quote the primary USCO Part 2 Report directly (Copyright Alliance's
  official AI-report summary and Skadden Arps' client publication), checked
  against each other for consistency rather than relied on singly. A direct
  fetch of the primary PDF (copyright.gov/ai/...) was attempted but the PDF's
  text layer is not machine-extractable in this environment (no OCR/poppler
  available) -- this is a disclosed limitation, not a silently skipped step;
  exact USCO Report page/section numbers are NOT available from any source
  checked and are not asserted here. Quoted language, consistent across both
  secondary sources: "prompts may reflect a user's mental conception or idea,
  but they do not control the way that idea is expressed"; the Report
  "rejects the theory that using multiple, refined prompts to generate a
  desired output is sufficient to claim copyright protection ... noting that
  such theory amounts to a 'sweat of the brow' argument that does not bear on
  the key consideration of originality"; iterative prompting specifically
  "is not sufficient human authorship as it resembles a 'sweat of the brow'
  type of argument which was rejected by [the] Supreme Court" in Feist
  Publications. Even prompting workflows that partially constrain output
  (e.g. fixed seed values) were found insufficient "since there is no
  guarantee of perfect consistency." Zarya of the Dawn (primary decision
  letter attempted directly, same PDF-extraction limitation; corroborated via
  Cooley, Crowell & Moring, and Mondaq client alerts, cross-checked): USCO
  found Kashtanova to be the author of the work's text and of the selection,
  coordination, and arrangement of its elements; the individual Midjourney-
  generated images themselves were found not to be the product of human
  authorship and were excluded from the registration's scope.

SI8 interpretation: >
  A workflow whose only human involvement is writing and refining prompts,
  with no further selection, arrangement, or editing of the output, should
  not be represented as producing copyright-protected commercial output on
  that basis alone.

Applicability requirements:
  - fact: jurisdiction
    operator: equals
    value: United States
Unresolved project dependencies: [human_contribution_description]   <!-- renamed 2026-08-19 from human_creative_contribution_level (Copyright UAT Correction Milestone, PM-approved pure naming-consistency change -- no proposition/statement/scope/lifecycle/CRC-eligibility change) -->
Prohibited conclusions: >
  Does not mean NO human involvement can ever establish authorship -- see
  CLAIM-COPY-003. Does not evaluate any specific user's actual workflow;
  CRC has no way to confirm whether prompting was truly the ONLY human
  contribution in a given case, so this claim should never be presented as
  a conclusion about the user's own project without confirmed applicability
  facts about their actual process (a Commercial Assurance Assessment
  question, not a CRC one in Phase 1).

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-16
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-19, CRC Approver: JD (PM) -- see CRC
  Approver/CRC Decision Date below; atomic copyright publication package
  complete, recommendation A — PASS/GO AS-IS, archived at
  `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`).
  Text below is unchanged from the pre-approval draft, per governance
  instruction not to reinterpret or rewrite substantive claim text when
  changing lifecycle/publication status: CRC may state that, under current
  U.S. law, writing prompts alone -- even detailed or iterative ones --
  generally does not establish sufficient human authorship for copyright
  purposes. CRC must not state a conclusion about whether the user's own
  workflow, specifically, meets or fails this bar.

CRC Candidate Statement: >
  Under current U.S. copyright law, writing prompts alone -- even detailed
  or iterative ones -- generally doesn't establish sufficient human
  authorship on its own. Additional human creative involvement, such as
  selecting, arranging, or editing the output, is generally what supports
  a copyright claim.

Effective date: 2026-08-16
Last reviewed: 2026-08-16
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-19
Related: [[POS-001]], [[EC-001]], [[CLAIM-COPY-001-v1]], [[CLAIM-COPY-003-v1]]

Phase 1 CRC-publication governance review (2026-08-17): PASS / GO AS-IS.
CRC Eligible deliberately KEPT Pending for the same product-completeness
reason as CLAIM-COPY-001-v1 above -- see that claim's own Phase 1 note and
`PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27 (deferred "Project-Fact-
Aware Bounded Composition" capability). Not a safety/adequacy finding.

**Atomic copyright publication package (2026-08-19):** published together
with CLAIM-COPY-001-v1, CLAIM-COPY-003-v1, and
REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 in a single atomic governance
decision, for the same reasons recorded on CLAIM-COPY-001-v1's own entry
above -- not repeated verbatim here to avoid duplicating the same
paragraph four times; see that entry for the full rationale and the
preserved jurisdiction-applicability finding, which applies identically to
this claim.

Full CRC Publication Review artifact: `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`

### CLAIM-COPY-003-v1
Domain: Copyright & Human Authorship
Topic: copyrightability
Subtopic: fractional-authorship-selection-arrangement-editing
Claim character: established
Jurisdiction: United States (federal)
Context: AI-generated output that a human then selects, arranges, or edits
Claim proposition: >
  Human selection, arrangement, or creative editing of AI-generated material
  can independently qualify for U.S. copyright protection, even when the
  underlying AI-generated elements themselves do not.

Source references:
  - primary: U.S. Copyright Office, "Copyright and Artificial Intelligence, Part 2: Copyrightability" (Jan 29, 2025) — copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf
  - primary: Zarya of the Dawn (U.S. Copyright Office registration decision, Feb 21, 2023) — copyright.gov/docs/zarya-of-the-dawn.pdf
Source authority/type: Primary legal/official authority
Source fact: >
  RE-VERIFIED 2026-08-16 (governance review correction), same methodology and
  same disclosed PDF-extraction limitation as CLAIM-COPY-002 above (direct
  primary fetch attempted, not machine-text-extractable in this environment;
  cross-triangulated via Copyright Alliance's official AI-report summary and
  Skadden Arps' client publication, consistent with each other). Quoted
  language: "a human can select or arrange AI-generated material in a
  sufficiently creative way such that 'the resulting work as a whole
  constitutes an original work of authorship'"; examples given include "AI
  tools that permit musicians and sound engineers to modify recordings or
  tools that enable film editors to edit film" -- directly analogous to AI
  video post-production. This confirms, precisely, the four sub-points PM
  requested be reconfirmed: (1) selection/arrangement/modification of
  AI-generated material CAN independently support human-authored copyright
  protection -- confirmed by the quoted "original work of authorship"
  language above; (2) this does NOT imply arbitrary editing qualifies --
  confirmed by the express "case-by-case determination" standard quoted
  below; (3) protectability is limited to the QUALIFYING human-authored
  elements/contribution, not the whole work -- confirmed by: "if the
  human-generated work is perceptible in the AI-generated output, the human
  can claim authorship of, and copyright in, the perceptible portion of the
  work" [emphasis on "the perceptible portion," not the whole]; (4)
  application remains case-specific -- confirmed by: "[w]hether such human
  activity meets the minimum standard of originality required under
  copyright law will require a case-by-case determination." Zarya of the
  Dawn (primary letter attempted directly, same extraction limitation;
  corroborated via Cooley, Crowell & Moring, and Mondaq client alerts,
  cross-checked): the individual AI-generated images were found not
  independently copyrightable; only Kashtanova's human-authored text and her
  selection/coordination/arrangement of the images were protected -- USCO's
  own real-world application of this exact principle.

SI8 interpretation: >
  Meaningful human post-production work on AI-generated video -- editing,
  compositing, color grading, arrangement/sequencing, directorial selection
  among takes -- is a real, recognized path to copyright protection distinct
  from the underlying AI-generated footage itself, but is fact-specific and
  not automatic.

Applicability requirements:
  - fact: jurisdiction
    operator: equals
    value: United States
Unresolved project dependencies: [human_contribution_description]   <!-- renamed 2026-08-19 from human_creative_contribution_level (Copyright UAT Correction Milestone, PM-approved pure naming-consistency change -- no proposition/statement/scope/lifecycle/CRC-eligibility change) -->
Prohibited conclusions: >
  Does not establish that ANY editing automatically qualifies -- the source
  material's own "case-by-case" and "perceptible and distinguishable"
  requirements mean this is never a yes/no fact CRC can confirm on its own.
  Must not be presented as "your editing makes this copyrighted" -- only as
  "this is a recognized path, evaluated case by case."

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-16
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-19, CRC Approver: JD (PM) -- see CRC
  Approver/CRC Decision Date below; atomic copyright publication package
  complete, recommendation A — PASS/GO AS-IS, archived at
  `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`).
  Text below is unchanged from the pre-approval draft, per governance
  instruction not to reinterpret or rewrite substantive claim text when
  changing lifecycle/publication status: CRC may state that, under current
  U.S. law, human selection, arrangement, or creative editing of AI-generated
  material can independently support a copyright claim even when the
  underlying AI-generated elements do not, while being explicit that this is
  evaluated case by case and CRC cannot determine whether it applies to the
  user's own project.

CRC Candidate Statement: >
  Under current U.S. copyright law, meaningfully selecting, arranging, or
  editing AI-generated material can support a copyright claim on its own,
  separate from whether the underlying AI-generated footage itself is
  protected. Whether this applies to a specific project is evaluated case
  by case.

Effective date: 2026-08-16
Last reviewed: 2026-08-16
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-19
Related: [[CLAIM-COPY-001-v1]], [[CLAIM-COPY-002-v1]]

Phase 1 CRC-publication governance review (2026-08-17): PASS / GO AS-IS,
same product-completeness deferral as CLAIM-COPY-001-v1/CLAIM-COPY-002-v1
above -- see `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27. Closest
individual call of the three copyrightability claims reviewed in Phase 1:
this claim's own affirmative framing ("selecting, arranging, or editing...
can support a copyright claim") currently renders identically whether the
user described substantial creative editing or only trivial/technical
editing (e.g. resolution/format conversion), since CRC does not yet
evaluate `human_contribution_description` against what the user actually
described. Never produces a false or determinative statement in any tested
scenario (the "meaningfully"/"case by case" qualifiers and the standard
unresolved-applicability hedge hold in every case) -- flagged for PM
awareness, not treated as a governance blocker.

**Atomic copyright publication package (2026-08-19):** published together
with CLAIM-COPY-001-v1, CLAIM-COPY-002-v1, and
REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 in a single atomic governance
decision, for the same reasons recorded on CLAIM-COPY-001-v1's own entry
above -- see that entry for the full rationale and the preserved
jurisdiction-applicability finding, which applies identically to this
claim. The bounded Copyright CRC Publication-Readiness Review additionally
confirmed this claim's own render-identically-regardless-of-editing-degree
limitation (noted in the Phase 1 review immediately above) is safe, not a
publication blocker -- Case 3B's unconditional hedge holds in every tested
human-contribution scenario.

Full CRC Publication Review artifact: `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`

### CLAIM-COPY-004-v1
Domain: Copyright & Human Authorship
Topic: copyright_ownership
Subtopic: commercial-use-permission-distinct-from-copyright-ownership
Claim character: established
Jurisdiction: Global
Context: any AI-generated commercial video workflow

GOVERNANCE TREATMENT (2026-08-16, PM decision item 4): rewritten under OPTION
B -- this record is now framed explicitly as SI8's own educational/
analytical framework, not as a purported externally-established legal
proposition. Recommended over Option A (grounding the distinction in
authoritative sources with SI8 interpretation layered on top) because the
underlying insight -- that a platform's contractual permission and a
copyright-law status are different questions -- is a categorization/framing
observation, not a citable legal holding; forcing an external legal citation
onto it would risk exactly the "manufactured citation" failure mode the
governance discipline at the top of this document exists to prevent. The
component legal categories themselves (contract law and copyright law are
different bodies of law) are well-established and not per se contestable;
what is SI8's own synthesis is applying that basic distinction specifically
to AI video commercial workflows, and labeling it as such below is the
correct governance treatment, not a weakening of the claim.

Claim proposition: >
  SI8's OPERATING DISTINCTION, offered as educational/analytical framing --
  not itself a citable legal holding: a platform's Terms of Service
  permitting commercial USE of generated output answers a contractual
  question, which is distinct from whether that output is COPYRIGHTABLE at
  all, or who OWNS any copyright that does exist (a copyright-law question).

Source references:
  - internal: SI8's own analytical framework (explicitly NOT presented as an
    external legal holding -- see Governance Treatment above), consistent
    with the ownership-vs-clearance distinction already documented in
    01_Business/research/AI-COPYRIGHT-RESEARCH-2026.md and
    06_Operations/legal/rights-playbook/versions/v0.2.md, and directly
    evidenced by real CRC pilot conversations (a real user asked both
    "Can I use this commercially, AND do I own the copyright?" in the same
    breath -- confirmed live, this session, 2026-08-16).
  - primary (CRC-publication source-hardening, 2026-08-16/17): the claim
    proposition above is a HUMAN-GOVERNED SI8 SYNTHESIS -- not a single
    directly-sourced proposition -- built from multiple independently
    verified authoritative propositions, both U.S. and comparative. Full
    provenance chain, live-verified statutory/contractual quotations, and
    the comparative Global-scope pressure test are recorded in
    01_Business/research/COPY-004-SOURCE-HARDENING-RESEARCH-2026.md (Part
    1: U.S. -- 17 U.S.C. §§101/102/201/202/204, Runway and ElevenLabs
    Terms of Use; Part 2: comparative Global-scope hardening across the
    United States, United Kingdom, European Union, Taiwan, and Japan).
Source authority/type: SI8 educational framework (explicitly not a purported externally-established legal proposition -- see Governance Treatment above)
Source fact: >
  A platform granting a commercial-use license under its Terms of Service is
  a contractual permission from the platform. Whether U.S. copyright law
  separately recognizes any copyright in the output at all is a different
  question (see CLAIM-COPY-001/002/003, both under Topic: copyrightability).
  That contract law and copyright law are different bodies of law is a
  basic, well-established legal categorization, not itself contestable; SI8
  is not citing external authority for THIS specific synthesis (that CRC
  users routinely conflate the two in the AI-video commercial-use context)
  because that observation is SI8's own, not a legal holding anyone else has
  published.

SI8 interpretation: >
  SI8's institutional position (explicitly SI8 judgment, not a primary-source
  legal citation -- see Source authority/type above) is that this distinction
  is one of the most common and consequential points of confusion CRC should
  help clarify, precisely because it is the difference between "can I use
  this" and "do I own this."

Applicability requirements: []
Unresolved project dependencies: []
Prohibited conclusions: >
  Does not itself answer either underlying question (whether a specific tool
  permits commercial use, or whether a specific work is copyrighted/owned by
  the user) -- purely a conceptual/framing clarification. Must not be
  combined with a tool's commercial-use claim to imply a copyright
  conclusion, or vice versa.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-16
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-17, CRC Approver: JD (PM) -- see CRC
  Approver/CRC Decision Date below; source-hardening research complete, see
  Source references above). Text below is unchanged from the pre-approval
  draft, per governance instruction not to reinterpret or rewrite
  substantive claim text when changing CRC-eligibility status: CRC may state
  that a platform's commercial-use permission and copyright
  ownership/copyrightability are two separate questions, without conflating
  one for the other.

CRC Candidate Statement: >
  Whether a platform's terms allow commercial use of the output, and whether
  that output is copyrighted (and who owns it), are two separate questions
  -- a platform granting commercial-use permission doesn't by itself answer
  either.

Effective date: 2026-08-16
Last reviewed: 2026-08-16
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-17
Related: [[CLAIM-COPY-001-v1]]

**Wave 2 claim below (2026-08-17) — the first claim outside Copyright & Human Authorship, and the first in the Third-Party Source Assets / Stock Media Licensing domain. `Lifecycle: Adopted` (Adoption Approver: JD, 2026-08-17), `Publication scope: Reviewer/Commercial Assurance`. Not CRC-eligible — `CRC Approver`/`CRC Decision Date` PENDING, same as Wave 1's own COPY-001/002/003. This claim additionally has no runtime `TOPIC_CLAIMS_FIXTURE` representation at all — see its own GOVERNANCE TREATMENT note below, a distinct and stronger exclusion than the Pending gate alone provides.**

### CLAIM-STOCK-EDITORIAL-001-v1
Domain: Third-Party Source Assets / Stock Media Licensing
Topic: third_party_source_rights
Subtopic: cross-provider-editorial-license-scope
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed collectively by each cited provider's current Terms of Service/License Agreement (Getty Images, iStock, Adobe Stock, Shutterstock), not a single contract or legal jurisdiction.
Context: any AI-generated commercial video workflow that incorporates third-party stock-media source assets

GOVERNANCE TREATMENT (2026-08-17, PM adoption decision, following Formal Governance Review #1; updated 2026-08-18 following M1/M2/M3 implementation; updated again 2026-08-18 following CRC-publication approval): this was the first claim in a non-tool-scoped, non-Copyright domain (Third-Party Source Assets) and, at adoption time, had no corresponding implemented `GoalCategory` value. That gap is now closed: `third_party_source_rights` is a real, implemented `GoalCategory` (M1), `AssetProviderMention` recognition/persistence exists (M2), and this claim now has a real runtime entry in `topic-claims-fixture.ts` — `topic: 'third_party_source_rights'`, `provider_scope: null` (generic — a topic candidate regardless of which provider, if any, is named). **Following a Formal CRC-Publication Review (2026-08-18, recommendation A — PASS/GO AS-IS; full review archived at `governance-reviews/CPR_001_CLAIM-STOCK-EDITORIAL-001-v1_2026-08-18.md`) and PM approval, this claim is now `CRC Eligible: Yes` below** — the first Third-Party Source Assets claim, and the second claim overall (after `CLAIM-COPY-004-v1`), to reach CRC. `Publication scope: Reviewer/Commercial Assurance` is UNCHANGED — per the CLAIM-COPY-004 precedent, Publication scope and CRC Eligibility are independent governance dimensions; CRC eligibility does not require or imply a Publication-scope change. See `THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md` (M3 design) for the architecture that made this reachable, and the CRC Publication Review artifact above for the full publication-safety analysis.

**SUPERSEDED 2026-08-27** (Governance Correction Review, `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md`, PM: JD): the Music/Audio portability workstream's Artlist-canary pre-implementation diagnostic found `provider_scope: null` broader than this claim's own evidenced, disclosed scope (its own `Source authority/type` line already named exactly "four independently-researched providers" — Getty, iStock, Adobe Stock, Shutterstock — never an open-ended "any provider" set). Corrected via supersession, not in-place edit, per this document's own "never retroactively edit a historical decision record" discipline: this v1 record is preserved unmodified below (proposition, evidence, `Adoption Approver`/`Adoption Decision Date`, and its own original CRC-publication history all remain exactly as originally reviewed and approved) and is no longer the current governed record for this proposition — see `CLAIM-STOCK-EDITORIAL-001-v2` immediately below for the corrected, currently-governing entry. `Lifecycle` updated to `Deprecated` (not a finding that this record was ever wrong at the time it was reviewed — only that a corrected version now supersedes it) and `superseded_by` updated accordingly; no other field on this v1 entry was touched.

Claim proposition: >
  A stock-media provider's standard license for content it designates
  "Editorial" (or an equivalent editorial-use-only classification)
  authorizes use for descriptive, newsworthy, or public-interest
  purposes. Under that standard license, this does not include
  advertising, promotional, endorsement, or merchandising use. Some
  providers offer a separate, provider-specific process to authorize
  such use for a given asset -- this proposition does not itself
  confirm whether such authorization exists for any particular asset
  or project.

Source references:
  - primary (governed synthesis record): `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Part 1, 2026-08-17, and Part 2 source-gap-closure pass, 2026-08-17) -- the full proposition maps, source-tier disclosure, and governance-review analysis (Formal Governance Review #1, 2026-08-17) this claim is adopted from.
  - primary (Official platform authority, Tier 1, directly fetched): Getty Images Content License Agreement (`gettyimages.com/eula`) -- Editorial Content definition and enumerated prohibited-use clause (commercial/promotional/advertorial/endorsement/advertising/gambling/marketing), verified across 3 independent fetches; exact section numbering unstable across fetches (cite by clause text, not section number -- see research artifact Part 2 §2).
  - primary (Official platform authority, Tier 1, directly fetched): Getty Images "Rights and Clearance" (`gettyimages.com/rights-and-clearance`) -- confirms a real, named, provider-run authorization path scoped to advertising/promotional clearance.
  - primary (Official platform authority, Tier 1, directly fetched): iStock Content License Agreement (`istockphoto.com/legal/license-agreement`, "Last Updated: July 2026") -- editorial-use-only definition and near-identical enumerated prohibited-use clause; the single most consistently-verified provider across this research program (3 independent fetches, stable date).
  - secondary (Official platform authority, Tier 2, directly fetched, zh-TW rendering): Adobe Stock License Terms (`stock.adobe.com/license-terms`) -- editorial/commercial distinction, corroborated (not independently primary-re-verified) by two separate `WebSearch` passes surfacing consistent language attributed to Adobe's own help documentation. **Weaker evidence tier than Getty/iStock, disclosed explicitly, not upgraded** -- 5 total direct-fetch attempts against Adobe's own official pages across this research program (Phase 0/1A/1B combined) failed to independently reconfirm this at Tier 1.
  - secondary (Tier 1 for the definitional distinction; Official Secondary, not Verified Primary, for exact restriction wording and clearance-mechanism mechanics): Shutterstock -- the Commercial/Editorial functional definition was directly fetched from Shutterstock's own official contributor-help domain (`submit.shutterstock.com`); the exact prohibited-use enumeration and the precise mechanics of Shutterstock's "Rights and Clearance" (clearance service) vs. "Asset Assurance™" (separate indemnity layer, not itself a clearance mechanism) rest on Shutterstock's own investor-relations press release and blog, located via search, not on the customer-facing License Agreement text itself. **That primary document remains unverified: 0 of 7 attempted direct fetches succeeded across two independent research sessions (Phase 1A, Phase 1B)** -- a confirmed structural access limitation, not an oversight, disclosed here per the explicit PM instruction not to make provenance look stronger than the research established.
Source authority/type: Official platform authority (synthesized across four independently-researched providers; per-provider tier disclosed above -- Getty/iStock Tier 1, Adobe Tier 2, Shutterstock Tier 1/Official Secondary split)
Source fact: >
  All four providers researched (Getty, iStock, Adobe Stock, Shutterstock)
  independently define an "Editorial"-equivalent content classification as
  licensed for descriptive/newsworthy/public-interest use, and each
  restricts that content from a materially similar (not byte-identical)
  set of non-editorial commercial exploitation categories -- advertising,
  promotional, endorsement, advertorial, and merchandising use, named
  explicitly by Getty/iStock/Adobe; functionally equivalent via Shutterstock's
  own "cannot be used to sell, promote, or monetize" definitional framing.
  Two of the four providers (Getty, Shutterstock) additionally offer a real,
  named, provider-run process to authorize such use for a specific asset
  (Getty's "Rights and Clearance"; Shutterstock's "Rights and Clearance"
  service, distinct from its separate "Asset Assurance" indemnity product).
  No equivalent mechanism was found for iStock (a negative finding, correctly
  classified as "no evidence found," not "confirmed absent"); Adobe's own
  path, if any, appears to be customer-self-directed rather than
  provider-administered and is not independently confirmed. Full
  provider-by-provider findings, proposition maps, and source-tier
  disclosure: see Source references above.

SI8 interpretation: >
  This claim exists specifically to correct a simpler, evidence-rejected
  hypothesis this research program actively tested and disproved: that
  "Editorial content cannot be used commercially." That framing is too
  broad -- providers restrict specific categories of use (advertising,
  promotional, endorsement, merchandising), not commercial activity or
  paid/business context as such, and at least two of four providers offer
  a real path to authorize commercial use of Editorial content for a
  specific asset. A reviewer encountering a stock-media asset described as
  "Editorial" should treat this claim as a starting framework -- the
  correct question is whether the SPECIFIC use is advertising/promotional/
  endorsement/merchandising in character, and whether separate
  authorization was obtained for that specific asset -- not whether the
  project is "commercial." Provider-specific detail (which providers offer
  authorization paths, exact enumerated terms) remains separate,
  not-yet-adopted candidate knowledge (`CAND-STOCK-GETTY-EDITORIAL-001`,
  `CAND-STOCK-ISTOCK-EDITORIAL-001`, `CAND-STOCK-SHUTTERSTOCK-EDITORIAL-001`
  -- research-stage only, not governed by this entry).

Applicability requirements: []
Unresolved project dependencies: [which_provider, editorial_designation_confirmed, separate_authorization_obtained]   <!-- askability governance (2026-08-21, DAR_001, PM: JD): which_provider = resolved via existing provider extraction, no dedicated CRC question; editorial_designation_confirmed = evidence-only, no CRC question approved; separate_authorization_obtained = evidence-only, no CRC question approved. List itself UNCHANGED -- no claim proposition/lifecycle/CRC-eligibility effect. Full review: governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md -->
Prohibited conclusions: >
  Does not establish that any specific user's asset is actually
  Editorial-designated (vs. Creative/other classification) -- that is a
  fact CRC cannot verify and a reviewer must inspect directly. Does not
  establish that any specific use violates a license. Does not confirm
  the presence OR absence of separate provider authorization for any
  particular asset -- both are explicitly disclaimed by the claim's own
  text. Does not identify which specific provider's terms govern a given
  project -- see `unresolved_project_dependencies`. Does not address
  underlying model/property releases or third-party rights independently
  of license scope -- that is a related but distinct, not-yet-adopted
  proposition (`CAND-STOCK-EDITORIAL-002`, research-stage only). Is not a
  substitute for Commercial Assurance evidence review (asset record,
  license/download record, agreement version, intended final use,
  authorization proof).

Lifecycle: Deprecated
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-17
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-18, CRC Approver: JD (PM) -- see CRC
  Approver/CRC Decision Date below; Formal CRC-Publication Review #1
  complete, recommendation A — PASS/GO AS-IS, archived at
  `governance-reviews/CPR_001_CLAIM-STOCK-EDITORIAL-001-v1_2026-08-18.md`).
  Text below is unchanged from the pre-approval draft, per governance
  instruction not to reinterpret or rewrite substantive claim text when
  changing CRC-eligibility status: CRC
  may state that stock-media content a provider designates "Editorial"
  is generally licensed for descriptive/newsworthy use rather than
  advertising, promotional, endorsement, or merchandising use, and that
  some providers offer a separate authorization path CRC cannot confirm
  was used for the user's specific asset. CRC must not state whether the
  user's own specific asset is Editorial-designated, whether their use
  violates any license, or whether separate authorization exists for it.
  **Historical record — this authorization state is superseded; see
  CLAIM-STOCK-EDITORIAL-001-v2 for the currently-governing decision.**

CRC Candidate Statement: >
  A stock-media provider's standard license for content marked "Editorial"
  generally covers descriptive, newsworthy, or public-interest use -- not
  advertising, promotional, endorsement, or merchandising use. Some
  providers offer a separate process to authorize commercial use of
  Editorial content for a specific asset, though this doesn't confirm
  whether that was obtained for yours.

Effective date: 2026-08-17
Last reviewed: 2026-08-17
Version lineage: v1 (initial) — supersedes: none — superseded by: CLAIM-STOCK-EDITORIAL-001-v2
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-18
Related: none — first governed claim in the Third-Party Source Assets domain. See `01_Business/research/LIVING-KNOWLEDGE-THIRD-PARTY-STOCK-MEDIA-DOMAIN-DISCOVERY-2026.md` (Phase 0), `THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md` (Phase 0.5), and `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Phase 1A/1B) for full domain context.

Formal Governance Review #1 (2026-08-17): PASS / GO AS-IS -- claim wording
unchanged from the hardened research artifact's own recommended text.
Accuracy, atomicity (acceptably compound, mirroring CLAIM-COPY-004's own
precedent for necessary-for-truthfulness compounding), cross-provider
synthesis legitimacy, the exceptions/project-determination/CRC-Reviewer
boundaries, and per-provider source quality (Getty/iStock STRONG, Adobe/
Shutterstock QUALIFIED, none INSUFFICIENT) were each independently
reviewed. `CRC Eligible` deliberately KEPT Pending -- not a safety/adequacy
finding on the claim's content, but a product-completeness deferral: Path A
(`third_party_source_rights` explicit-question routing) remains
unimplemented, and -- specific to this claim -- its Topic field has no
runtime representation at all yet (see GOVERNANCE TREATMENT above), an
architecture gap independent of and in addition to Path A's own absence.
Neither gap is solved by this adoption decision.

Full review artifact: `governance-reviews/FGR_001_CAND-STOCK-EDITORIAL-001_2026-08-17.md`
Full CRC Publication Review artifact: `governance-reviews/CPR_001_CLAIM-STOCK-EDITORIAL-001-v1_2026-08-18.md`
Full Dependency Askability Review artifact: `governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md`

### CLAIM-STOCK-EDITORIAL-001-v2
Domain: Third-Party Source Assets / Stock Media Licensing
Topic: third_party_source_rights
Subtopic: cross-provider-editorial-license-scope
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed collectively by each cited provider's current Terms of Service/License Agreement (Getty Images, iStock, Adobe Stock, Shutterstock), not a single contract or legal jurisdiction.
Context: any AI-generated commercial video workflow that incorporates third-party stock-media source assets

GOVERNANCE TREATMENT (2026-08-27, PM correction decision, following the Governance Correction Review `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md`): supersedes `CLAIM-STOCK-EDITORIAL-001-v1` (see that entry's own now-updated `Version lineage`/`Lifecycle: Deprecated`, preserved unmodified above). Sole substantive change from v1: `provider_scope` corrected from `null` to `['getty', 'istock', 'shutterstock', 'adobe-stock']` — the exact four providers v1's own `Source authority/type` line already named as "independently-researched" (Getty/iStock Tier 1; Adobe Stock Tier 2/disclosed-weaker; Shutterstock Tier 1 for the definitional distinction/Official Secondary for exact wording, disclosed-weaker) — a narrower, evidence-accurate replacement for an unconditional "any provider" match, not an expansion. `provider_scope` here names real, individually-evidenced provider identities only; it is not a media-domain filter, and no future stock provider inherits this claim without its own governance review. Claim proposition, Source references, Source authority/type, Source fact, SI8 interpretation, Applicability requirements, Unresolved project dependencies, Prohibited conclusions, CRC Publication Scope, and CRC Candidate Statement are all copied verbatim, byte-identical to v1 — none of these were in scope for this correction and none were reinterpreted. **`CRC Eligible: Yes` below is a bounded reaffirmation, not a new substantive CRC Publication Review** — the original `CPR_001` analysis (text safety, routing correctness under the four-provider universe, Case 3B behavior) remains valid unchanged; narrowing `provider_scope` strictly reduces which conversations this claim can appear in and introduces no new overclaiming risk, per `FGR_007` §6 and `CRC-PUBLICATION-POLICY.md` Principle 1's own requirement that this be an explicit decision, not silently inherited.

Claim proposition: >
  A stock-media provider's standard license for content it designates
  "Editorial" (or an equivalent editorial-use-only classification)
  authorizes use for descriptive, newsworthy, or public-interest
  purposes. Under that standard license, this does not include
  advertising, promotional, endorsement, or merchandising use. Some
  providers offer a separate, provider-specific process to authorize
  such use for a given asset -- this proposition does not itself
  confirm whether such authorization exists for any particular asset
  or project.

Source references:
  - primary (governed synthesis record): `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Part 1, 2026-08-17, and Part 2 source-gap-closure pass, 2026-08-17) -- the full proposition maps, source-tier disclosure, and governance-review analysis (Formal Governance Review #1, 2026-08-17) this claim was originally adopted from (see v1, above, for the unmodified historical record).
  - primary (Official platform authority, Tier 1, directly fetched): Getty Images Content License Agreement (`gettyimages.com/eula`) -- Editorial Content definition and enumerated prohibited-use clause (commercial/promotional/advertorial/endorsement/advertising/gambling/marketing), verified across 3 independent fetches; exact section numbering unstable across fetches (cite by clause text, not section number -- see research artifact Part 2 §2).
  - primary (Official platform authority, Tier 1, directly fetched): Getty Images "Rights and Clearance" (`gettyimages.com/rights-and-clearance`) -- confirms a real, named, provider-run authorization path scoped to advertising/promotional clearance.
  - primary (Official platform authority, Tier 1, directly fetched): iStock Content License Agreement (`istockphoto.com/legal/license-agreement`, "Last Updated: July 2026") -- editorial-use-only definition and near-identical enumerated prohibited-use clause; the single most consistently-verified provider across this research program (3 independent fetches, stable date).
  - secondary (Official platform authority, Tier 2, directly fetched, zh-TW rendering): Adobe Stock License Terms (`stock.adobe.com/license-terms`) -- editorial/commercial distinction, corroborated (not independently primary-re-verified) by two separate `WebSearch` passes surfacing consistent language attributed to Adobe's own help documentation. **Weaker evidence tier than Getty/iStock, disclosed explicitly, not upgraded** -- 5 total direct-fetch attempts against Adobe's own official pages across this research program (Phase 0/1A/1B combined) failed to independently reconfirm this at Tier 1.
  - secondary (Tier 1 for the definitional distinction; Official Secondary, not Verified Primary, for exact restriction wording and clearance-mechanism mechanics): Shutterstock -- the Commercial/Editorial functional definition was directly fetched from Shutterstock's own official contributor-help domain (`submit.shutterstock.com`); the exact prohibited-use enumeration and the precise mechanics of Shutterstock's "Rights and Clearance" (clearance service) vs. "Asset Assurance™" (separate indemnity layer, not itself a clearance mechanism) rest on Shutterstock's own investor-relations press release and blog, located via search, not on the customer-facing License Agreement text itself. **That primary document remains unverified: 0 of 7 attempted direct fetches succeeded across two independent research sessions (Phase 1A, Phase 1B)** -- a confirmed structural access limitation, not an oversight, disclosed here per the explicit PM instruction not to make provenance look stronger than the research established.
Source authority/type: Official platform authority (synthesized across four independently-researched providers; per-provider tier disclosed above -- Getty/iStock Tier 1, Adobe Tier 2, Shutterstock Tier 1/Official Secondary split)
Source fact: >
  All four providers researched (Getty, iStock, Adobe Stock, Shutterstock)
  independently define an "Editorial"-equivalent content classification as
  licensed for descriptive/newsworthy/public-interest use, and each
  restricts that content from a materially similar (not byte-identical)
  set of non-editorial commercial exploitation categories -- advertising,
  promotional, endorsement, advertorial, and merchandising use, named
  explicitly by Getty/iStock/Adobe; functionally equivalent via Shutterstock's
  own "cannot be used to sell, promote, or monetize" definitional framing.
  Two of the four providers (Getty, Shutterstock) additionally offer a real,
  named, provider-run process to authorize such use for a specific asset
  (Getty's "Rights and Clearance"; Shutterstock's "Rights and Clearance"
  service, distinct from its separate "Asset Assurance" indemnity product).
  No equivalent mechanism was found for iStock (a negative finding, correctly
  classified as "no evidence found," not "confirmed absent"); Adobe's own
  path, if any, appears to be customer-self-directed rather than
  provider-administered and is not independently confirmed. Full
  provider-by-provider findings, proposition maps, and source-tier
  disclosure: see Source references above.

SI8 interpretation: >
  This claim exists specifically to correct a simpler, evidence-rejected
  hypothesis this research program actively tested and disproved: that
  "Editorial content cannot be used commercially." That framing is too
  broad -- providers restrict specific categories of use (advertising,
  promotional, endorsement, merchandising), not commercial activity or
  paid/business context as such, and at least two of four providers offer
  a real path to authorize commercial use of Editorial content for a
  specific asset. A reviewer encountering a stock-media asset described as
  "Editorial" should treat this claim as a starting framework -- the
  correct question is whether the SPECIFIC use is advertising/promotional/
  endorsement/merchandising in character, and whether separate
  authorization was obtained for that specific asset -- not whether the
  project is "commercial." Provider-specific detail (which providers offer
  authorization paths, exact enumerated terms) remains separate,
  not-yet-adopted candidate knowledge (`CAND-STOCK-GETTY-EDITORIAL-001`,
  `CAND-STOCK-ISTOCK-EDITORIAL-001`, `CAND-STOCK-SHUTTERSTOCK-EDITORIAL-001`
  -- research-stage only, not governed by this entry).

Applicability requirements: []
Unresolved project dependencies: [which_provider, editorial_designation_confirmed, separate_authorization_obtained]   <!-- askability governance unchanged from v1 (2026-08-21, DAR_001, PM: JD): which_provider = resolved via existing provider extraction, no dedicated CRC question; editorial_designation_confirmed = evidence-only, no CRC question approved; separate_authorization_obtained = evidence-only, no CRC question approved. Not re-reviewed by this correction -- carried forward unchanged, per FGR_007's own explicit scope boundary. -->
Prohibited conclusions: >
  Does not establish that any specific user's asset is actually
  Editorial-designated (vs. Creative/other classification) -- that is a
  fact CRC cannot verify and a reviewer must inspect directly. Does not
  establish that any specific use violates a license. Does not confirm
  the presence OR absence of separate provider authorization for any
  particular asset -- both are explicitly disclaimed by the claim's own
  text. Does not identify which specific provider's terms govern a given
  project -- see `unresolved_project_dependencies`. Does not address
  underlying model/property releases or third-party rights independently
  of license scope -- that is a related but distinct proposition
  (`CLAIM-STOCK-EDITORIAL-002-v1`/`-v2`). Is not a substitute for
  Commercial Assurance evidence review (asset record, license/download
  record, agreement version, intended final use, authorization proof).

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (bounded reaffirmation, 2026-08-27, CRC
  Approver: JD (PM) -- see CRC Approver/CRC Decision Date below; basis:
  `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md`
  §6, not a new substantive CRC Publication Review -- the original
  `CPR_001` text-safety and routing analysis remains valid unchanged and
  is not repeated here). Text below is unchanged, byte-identical to v1:
  CRC may state that stock-media content a provider designates "Editorial"
  is generally licensed for descriptive/newsworthy use rather than
  advertising, promotional, endorsement, or merchandising use, and that
  some providers offer a separate authorization path CRC cannot confirm
  was used for the user's specific asset. CRC must not state whether the
  user's own specific asset is Editorial-designated, whether their use
  violates any license, or whether separate authorization exists for it.

CRC Candidate Statement: >
  A stock-media provider's standard license for content marked "Editorial"
  generally covers descriptive, newsworthy, or public-interest use -- not
  advertising, promotional, endorsement, or merchandising use. Some
  providers offer a separate process to authorize commercial use of
  Editorial content for a specific asset, though this doesn't confirm
  whether that was obtained for yours.

Effective date: 2026-08-17
Last reviewed: 2026-08-27
Version lineage: v2 — supersedes: CLAIM-STOCK-EDITORIAL-001-v1 — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-27
Related: [[CLAIM-STOCK-EDITORIAL-001-v1]] (superseded predecessor, historical record). See also `01_Business/research/LIVING-KNOWLEDGE-THIRD-PARTY-STOCK-MEDIA-DOMAIN-DISCOVERY-2026.md` (Phase 0), `THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md` (Phase 0.5), and `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Phase 1A/1B) for full domain context.

Governance Correction Review (2026-08-27): the `provider_scope` correction was
independently re-verified per-provider before recording -- v1's own text
already named all four providers as "independently-researched," at
individually disclosed evidence tiers (Getty/iStock Tier 1, Adobe
Stock/Shutterstock disclosed-weaker) -- none excluded. Contrast
`CLAIM-STOCK-EDITORIAL-002-v1`/`-v2`, whose own evidence explicitly and
repeatedly excludes Adobe Stock -- the two claims' corrected scopes
deliberately differ, per claim-specific evidence, not a shared blanket
correction.

Full review artifact (original adoption): `governance-reviews/FGR_001_CAND-STOCK-EDITORIAL-001_2026-08-17.md`
Full review artifact (this correction): `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md`
Full CRC Publication Review artifact (original): `governance-reviews/CPR_001_CLAIM-STOCK-EDITORIAL-001-v1_2026-08-18.md`
Full CRC Publication Review artifact (bounded reaffirmation): `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md` §6
Full Dependency Askability Review artifact: `governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md`

### CLAIM-STOCK-EDITORIAL-002-v1
Domain: Third-Party Source Assets / Stock Media Licensing
Topic: third_party_source_rights
Subtopic: editorial-designation-release-relatedness
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed collectively by each cited provider's current Terms of Service/License Agreement (Getty Images, iStock, Shutterstock — the three providers this claim's evidence confirms; not independently confirmed for Adobe Stock), not a single contract or legal jurisdiction.
Context: Commercial Assurance evidence review of any AI-generated commercial video workflow that incorporates third-party stock-media source assets designated "Editorial"

GOVERNANCE TREATMENT (2026-08-17, PM adoption decision, following Formal Governance Review #2; updated 2026-08-18 following M1/M2/M3 implementation; updated again 2026-08-18 following CRC-publication approval): same runtime-representation gap as CLAIM-STOCK-EDITORIAL-001-v1 at adoption time, now closed the same way and together with it (M1 GoalCategory + M2 AssetProviderMention + M3 provider-scoped retrieval). This claim now has a real runtime entry — `topic: 'third_party_source_rights'`, `provider_scope: null` (generic). **Following a Formal CRC-Publication Review (2026-08-18, recommendation B — PASS/GO WITH BOUNDED CRC COPY ADJUSTMENT; full review archived at `governance-reviews/CPR_002_CLAIM-STOCK-EDITORIAL-002-v1_2026-08-18.md`), a bounded correction to the derived `CRC Publication Scope`/`CRC Candidate Statement` text (restoring the provider-evidence caveat already present in this claim's own Claim proposition, but previously dropped from the shorter CRC-facing statement), and PM approval, this claim is now `CRC Eligible: Yes` below** — the second Third-Party Source Assets claim, and the third claim overall (after `CLAIM-COPY-004-v1` and `CLAIM-STOCK-EDITORIAL-001-v1`), to reach CRC. The Claim proposition itself (above) is unchanged, byte-identical to the adopted draft. `Publication scope: Reviewer/Commercial Assurance` is UNCHANGED — Publication scope and CRC Eligibility remain independent governance dimensions, per the CLAIM-COPY-004/CLAIM-STOCK-EDITORIAL-001-v1 precedent.

**SUPERSEDED 2026-08-27** (Governance Correction Review, `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md`, PM: JD): identical defect and correction philosophy as `CLAIM-STOCK-EDITORIAL-001-v1` (see that entry's own SUPERSEDED note) — `provider_scope: null` broader than this claim's own evidenced, disclosed scope. **This claim's own corrected scope differs from -001's**: its proposition and Source authority/type line already, explicitly, and repeatedly exclude Adobe Stock ("has not been independently confirmed for every stock-media provider, including Adobe Stock"; "Adobe Stock explicitly excluded from the synthesis") — the correction narrows to exactly the three providers this claim's own text has always named. This v1 record is preserved unmodified below; see `CLAIM-STOCK-EDITORIAL-002-v2` immediately below for the corrected, currently-governing entry. `Lifecycle` updated to `Deprecated` and `superseded_by` updated accordingly; no other field on this v1 entry was touched.

Relationship to CLAIM-STOCK-EDITORIAL-001-v1 (governance note, not part of the governed statement itself — Formal Governance Review #2 §1's explicit instruction that internal claim IDs must not appear inside reusable governed-knowledge text): CLAIM-STOCK-EDITORIAL-001-v1 governs the standard license-scope restriction associated with Editorial content (what uses are/are not permitted). CLAIM-STOCK-EDITORIAL-002-v1 governs a distinct but commonly associated tendency — that Editorial-designated content is typically supplied without model/property releases. The relationship between the two claims is **COMPLEMENTARY**: a reviewer applying both gets a fuller picture (a use may exceed the standard license, per -001, and, separately, the content likely lacks releases that would otherwise support broader use even where license scope is satisfied, per -002) without either claim restating or depending on the other's own text. No `TopicRelationship` is created for this pairing, and none is implied by this note.

Claim proposition: >
  Stock-media content that a provider designates "Editorial" is
  typically supplied without the model or property releases that would
  otherwise support broader commercial use -- a separate consideration
  from, though often associated with, that provider's own license-scope
  restriction on such use. This has been independently confirmed for
  Getty, iStock, and Shutterstock; it has not been independently
  confirmed for every stock-media provider, including Adobe Stock.

Source references:
  - primary (governed synthesis record): `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Part 1 §20 CAND-STOCK-EDITORIAL-002, and Part 2 §4/§12 re-evaluation, both 2026-08-17) -- full proposition map and the governance-review analysis (Formal Governance Review #2, 2026-08-17) this claim is adopted from.
  - primary (Official platform authority, Tier 1, directly fetched): Getty Images "Rights and Clearance" (`gettyimages.com/rights-and-clearance`) -- "Editorial content generally has real people, in real locations doing real activities, and did not provide model releases or property releases."
  - primary (Official platform authority, Tier 1, directly fetched): Getty Images Content License Agreement (`gettyimages.com/eula`) -- Editorial content "generally is not licensed" for model/property releases, framed as a content-type characteristic distinct from license-scope restriction. **Disclosed, not smoothed over:** Getty's own two pages are not fully reconciled with each other on whether release-absence explains or merely correlates with the license-scope restriction -- exactly why this claim's own "separate... though often associated with" hedge is necessary, not decorative.
  - primary (Official platform authority, Tier 1, directly fetched): iStock Content License Agreement (`istockphoto.com/legal/license-agreement`) -- a separate warranty-disclaimer clause, textually distinct from the prohibited-use clause, stating no releases are "generally obtained" for editorial-use-only content. The structurally cleanest evidence of the four providers for treating release status and license scope as two independent provisions.
  - primary (Official platform authority, Tier 1, directly fetched): Shutterstock, official contributor-help domain (`submit.shutterstock.com`) -- Editorial content "doesn't have a model or property release on file." **A stronger evidence tier for THIS specific proposition than Shutterstock received for CLAIM-STOCK-EDITORIAL-001-v1** (STRONG here vs. QUALIFIED there) -- this proposition doesn't depend on the exact-restriction-wording or clearance-mechanism detail that kept -001's Shutterstock evidence at QUALIFIED.
  - Adobe Stock: **explicitly NOT a confirmed supporting leg of this synthesis.** Five direct-fetch attempts against Adobe's own official pages, across two independent research sessions (Phase 1A, Phase 1B), all failed (HTTP 403, timeout, or unreadable binary PDF encoding). Only Tier 3 `WebSearch` corroboration exists, consistent across two independently-timed passes but never independently primary-verified. Not upgraded to primary evidence and not incorporated into the claim's own text as a fourth confirmed provider -- the claim's own proposition explicitly names Adobe as unconfirmed rather than remaining silent about it.
Source authority/type: Official platform authority (synthesized across three independently-verified providers -- Getty, iStock, Shutterstock, each Tier 1 for this specific proposition; Adobe Stock explicitly excluded from the synthesis, disclosed above, not incorporated)
Source fact: >
  Getty, iStock, and Shutterstock each independently state, on official
  pages, that content they classify "Editorial" is typically supplied
  without model or property releases. iStock's own agreement presents
  this as a textually separate provision from its prohibited-use clause
  (the cleanest structural evidence for treating release status and
  license scope as related but distinct facts). Getty's own two official
  pages are not fully reconciled with each other on whether release
  absence explains or merely correlates with the license-scope
  restriction -- neither reading is asserted as the governed conclusion;
  the claim's own hedge ("separate... though often associated with")
  reflects this genuine, disclosed uncertainty rather than resolving it
  artificially. No equivalent official evidence was found for Adobe Stock
  despite five direct-fetch attempts across two research sessions -- a
  negative finding correctly treated as absence of evidence, not evidence
  of a contrary fact, and explicitly named as such in the claim's own
  proposition text rather than left as a silent gap.

SI8 interpretation: >
  This claim gives a Commercial Assurance reviewer a concrete reasoning
  step distinct from CLAIM-STOCK-EDITORIAL-001-v1's own: Editorial
  classification is a signal that release/rights evidence may warrant
  closer inspection, separately from whatever the applicable license-scope
  restriction requires. A reviewer encountering an Editorial-designated
  asset should treat this as prompting a check of the provider's own
  asset record for model-release status, property-release status, any
  provider release notes, the intended use, subject identity, and
  trademark/property visibility in the depicted content -- not as itself
  establishing that any specific asset lacks a release, that a release
  was legally required, or that any specific use is therefore
  impermissible. The relationship this claim states is common
  association, never causation: it does not assert that an asset is
  classified Editorial BECAUSE it lacks releases, that every Editorial
  asset lacks releases, or that obtaining a release removes the separate
  license-scope restriction governed by CLAIM-STOCK-EDITORIAL-001-v1.

Applicability requirements: []
Unresolved project dependencies: [which_provider, editorial_designation_confirmed, release_status_confirmed]   <!-- askability governance (2026-08-21, DAR_001, PM: JD): which_provider = resolved via existing provider extraction, no dedicated CRC question; editorial_designation_confirmed = evidence-only, no CRC question approved; release_status_confirmed = evidence-only, no CRC question approved. List itself UNCHANGED -- no claim proposition/lifecycle/CRC-eligibility effect. Full review: governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md -->
Prohibited conclusions: >
  Does not establish that any specific asset actually has or lacks a
  model release. Does not establish that any specific asset actually has
  or lacks a property release. Does not establish that a release is
  legally required for any specific use. Does not establish that a
  particular person or property is protected. Does not establish that a
  specific use violates any right. Does not establish that separate
  permission (e.g. a Getty Rights and Clearance-style authorization, per
  CLAIM-STOCK-EDITORIAL-001-v1's own text) cures a release-status gap --
  authorization and release status are distinct project facts, not
  substitutes for each other. Does not establish whether an asset may be
  used commercially -- that remains governed exclusively by
  CLAIM-STOCK-EDITORIAL-001-v1 and by project-specific Commercial
  Assurance review, never by this claim.

Lifecycle: Deprecated
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-17
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-18, CRC Approver: JD (PM) -- see CRC
  Approver/CRC Decision Date below; Formal CRC-Publication Review #2
  complete, recommendation B — PASS/GO WITH BOUNDED CRC COPY ADJUSTMENT,
  archived at
  `governance-reviews/CPR_002_CLAIM-STOCK-EDITORIAL-002-v1_2026-08-18.md`).
  The bounded adjustment authorized by that review and PM approval is
  applied below -- restoring the provider-evidence caveat already present
  in this claim's own Claim proposition (above), which the pre-approval
  draft of this scoping text had omitted. The Claim proposition itself is
  unchanged: CRC may state that content Getty, iStock, or Shutterstock
  designate "Editorial" is typically supplied without the model or
  property releases that would otherwise support broader commercial use,
  as a separate consideration from whether the applicable license permits
  a given use, and that this hasn't been independently confirmed for every
  stock-media provider, including Adobe Stock. CRC must not state whether
  the user's own specific asset has or lacks a release, or draw any
  conclusion from that about whether their use is permitted.
  **Historical record — this authorization state is superseded; see
  CLAIM-STOCK-EDITORIAL-002-v2 for the currently-governing decision.**

CRC Candidate Statement: >
  Content that Getty, iStock, or Shutterstock mark "Editorial" is typically
  supplied without the model or property releases that would otherwise
  support broader commercial use -- a separate question from whether the
  applicable license itself permits your intended use. This hasn't been
  independently confirmed for every stock-media provider, including Adobe
  Stock.

Effective date: 2026-08-17
Last reviewed: 2026-08-17
Version lineage: v1 (initial) — supersedes: none — superseded by: CLAIM-STOCK-EDITORIAL-002-v2
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-18
Related: [[CLAIM-STOCK-EDITORIAL-001-v1]] (complementary, not dependent -- see the Relationship note above). See also `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Phase 1A/1B) for full domain context.

Formal Governance Review #2 (2026-08-17): PASS / GO WITH MINOR WORDING
REVISION -- original research-stage wording ("Stock-media content marked
'Editorial' is typically licensed without...") was narrowed to explicitly
name the three providers this claim's evidence actually confirms (Getty,
iStock, Shutterstock) and to explicitly disclaim Adobe Stock rather than
leaving its status ambiguous by omission. Causation-vs-association,
release-category scope (deliberately kept to "model or property releases,"
not broadened to iStock's own wider trademark/trade-dress language despite
that being evidenced, since Getty/Shutterstock weren't independently
confirmed at that broader scope), the general-rule/project-specific
boundary, and the relationship to CLAIM-STOCK-EDITORIAL-001-v1 were each
independently reviewed and found sound. `CRC Eligible` deliberately KEPT
Pending -- same product-completeness deferral as CLAIM-STOCK-EDITORIAL-001
-v1: Path A remains unimplemented, and this claim's Topic field has no
runtime representation at all yet, independent of and in addition to
Path A's own absence. PM adoption decision (2026-08-17) additionally
removed a parenthetical internal claim-ID cross-reference
("(see CLAIM-STOCK-EDITORIAL-001-v1)") from the governance review's
proposed governed-statement text -- the relationship is instead recorded
in this entry's own Relationship note above, never inside the reusable
governed statement itself.

Full review artifact: `governance-reviews/FGR_002_CAND-STOCK-EDITORIAL-002_2026-08-17.md`
Full CRC Publication Review artifact: `governance-reviews/CPR_002_CLAIM-STOCK-EDITORIAL-002-v1_2026-08-18.md`
Full Dependency Askability Review artifact: `governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md`

### CLAIM-STOCK-EDITORIAL-002-v2
Domain: Third-Party Source Assets / Stock Media Licensing
Topic: third_party_source_rights
Subtopic: editorial-designation-release-relatedness
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed collectively by each cited provider's current Terms of Service/License Agreement (Getty Images, iStock, Shutterstock — the three providers this claim's evidence confirms; not independently confirmed for Adobe Stock), not a single contract or legal jurisdiction.
Context: Commercial Assurance evidence review of any AI-generated commercial video workflow that incorporates third-party stock-media source assets designated "Editorial"

GOVERNANCE TREATMENT (2026-08-27, PM correction decision, following the Governance Correction Review `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md`): supersedes `CLAIM-STOCK-EDITORIAL-002-v1` (see that entry's own now-updated `Version lineage`/`Lifecycle: Deprecated`, preserved unmodified above). Sole substantive change from v1: `provider_scope` corrected from `null` to `['getty', 'istock', 'shutterstock']` — **Adobe Stock deliberately excluded**, matching this claim's own proposition text exactly, which already stated "This has been independently confirmed for Getty, iStock, and Shutterstock; it has not been independently confirmed for every stock-media provider, including Adobe Stock." This claim's corrected scope is narrower than `CLAIM-STOCK-EDITORIAL-001-v2`'s — a deliberate, evidence-driven difference between the two claims, not a shared blanket correction (see that entry's own Governance Correction Review note). Claim proposition, Source references, Source authority/type, Source fact, SI8 interpretation, Applicability requirements, Unresolved project dependencies, Prohibited conclusions, CRC Publication Scope, and CRC Candidate Statement are all copied verbatim, byte-identical to v1. **`CRC Eligible: Yes` below is a bounded reaffirmation, not a new substantive CRC Publication Review** — the original `CPR_002` analysis remains valid unchanged; narrowing `provider_scope` strictly reduces reachability and introduces no new overclaiming risk, per `FGR_007` §6 and `CRC-PUBLICATION-POLICY.md` Principle 1.

Relationship to CLAIM-STOCK-EDITORIAL-001-v2 (governance note, not part of the governed statement itself, carried forward unchanged from v1's own identical note): CLAIM-STOCK-EDITORIAL-001-v2 governs the standard license-scope restriction associated with Editorial content (what uses are/are not permitted). CLAIM-STOCK-EDITORIAL-002-v2 governs a distinct but commonly associated tendency — that Editorial-designated content is typically supplied without model/property releases. The relationship between the two claims is **COMPLEMENTARY**: a reviewer applying both gets a fuller picture without either claim restating or depending on the other's own text. No `TopicRelationship` is created for this pairing, and none is implied by this note.

Claim proposition: >
  Stock-media content that a provider designates "Editorial" is
  typically supplied without the model or property releases that would
  otherwise support broader commercial use -- a separate consideration
  from, though often associated with, that provider's own license-scope
  restriction on such use. This has been independently confirmed for
  Getty, iStock, and Shutterstock; it has not been independently
  confirmed for every stock-media provider, including Adobe Stock.

Source references:
  - primary (governed synthesis record): `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Part 1 §20 CAND-STOCK-EDITORIAL-002, and Part 2 §4/§12 re-evaluation, both 2026-08-17) -- full proposition map and the governance-review analysis (Formal Governance Review #2, 2026-08-17) this claim was originally adopted from (see v1, above, for the unmodified historical record).
  - primary (Official platform authority, Tier 1, directly fetched): Getty Images "Rights and Clearance" (`gettyimages.com/rights-and-clearance`) -- "Editorial content generally has real people, in real locations doing real activities, and did not provide model releases or property releases."
  - primary (Official platform authority, Tier 1, directly fetched): Getty Images Content License Agreement (`gettyimages.com/eula`) -- Editorial content "generally is not licensed" for model/property releases, framed as a content-type characteristic distinct from license-scope restriction. **Disclosed, not smoothed over:** Getty's own two pages are not fully reconciled with each other on whether release-absence explains or merely correlates with the license-scope restriction -- exactly why this claim's own "separate... though often associated with" hedge is necessary, not decorative.
  - primary (Official platform authority, Tier 1, directly fetched): iStock Content License Agreement (`istockphoto.com/legal/license-agreement`) -- a separate warranty-disclaimer clause, textually distinct from the prohibited-use clause, stating no releases are "generally obtained" for editorial-use-only content. The structurally cleanest evidence of the four providers for treating release status and license scope as two independent provisions.
  - primary (Official platform authority, Tier 1, directly fetched): Shutterstock, official contributor-help domain (`submit.shutterstock.com`) -- Editorial content "doesn't have a model or property release on file." **A stronger evidence tier for THIS specific proposition than Shutterstock received for CLAIM-STOCK-EDITORIAL-001-v1/-v2** (STRONG here vs. QUALIFIED there) -- this proposition doesn't depend on the exact-restriction-wording or clearance-mechanism detail that kept -001's Shutterstock evidence at QUALIFIED.
  - Adobe Stock: **explicitly NOT a confirmed supporting leg of this synthesis.** Five direct-fetch attempts against Adobe's own official pages, across two independent research sessions (Phase 1A, Phase 1B), all failed (HTTP 403, timeout, or unreadable binary PDF encoding). Only Tier 3 `WebSearch` corroboration exists, consistent across two independently-timed passes but never independently primary-verified. Not upgraded to primary evidence and not incorporated into the claim's own text as a fourth confirmed provider -- the claim's own proposition explicitly names Adobe as unconfirmed rather than remaining silent about it. **This is exactly why this claim's corrected `provider_scope` excludes Adobe Stock while CLAIM-STOCK-EDITORIAL-001-v2's does not.**
Source authority/type: Official platform authority (synthesized across three independently-verified providers -- Getty, iStock, Shutterstock, each Tier 1 for this specific proposition; Adobe Stock explicitly excluded from the synthesis, disclosed above, not incorporated)
Source fact: >
  Getty, iStock, and Shutterstock each independently state, on official
  pages, that content they classify "Editorial" is typically supplied
  without model or property releases. iStock's own agreement presents
  this as a textually separate provision from its prohibited-use clause
  (the cleanest structural evidence for treating release status and
  license scope as related but distinct facts). Getty's own two official
  pages are not fully reconciled with each other on whether release
  absence explains or merely correlates with the license-scope
  restriction -- neither reading is asserted as the governed conclusion;
  the claim's own hedge ("separate... though often associated with")
  reflects this genuine, disclosed uncertainty rather than resolving it
  artificially. No equivalent official evidence was found for Adobe Stock
  despite five direct-fetch attempts across two research sessions -- a
  negative finding correctly treated as absence of evidence, not evidence
  of a contrary fact, and explicitly named as such in the claim's own
  proposition text rather than left as a silent gap.

SI8 interpretation: >
  This claim gives a Commercial Assurance reviewer a concrete reasoning
  step distinct from CLAIM-STOCK-EDITORIAL-001-v1/-v2's own: Editorial
  classification is a signal that release/rights evidence may warrant
  closer inspection, separately from whatever the applicable license-scope
  restriction requires. A reviewer encountering an Editorial-designated
  asset should treat this as prompting a check of the provider's own
  asset record for model-release status, property-release status, any
  provider release notes, the intended use, subject identity, and
  trademark/property visibility in the depicted content -- not as itself
  establishing that any specific asset lacks a release, that a release
  was legally required, or that any specific use is therefore
  impermissible. The relationship this claim states is common
  association, never causation: it does not assert that an asset is
  classified Editorial BECAUSE it lacks releases, that every Editorial
  asset lacks releases, or that obtaining a release removes the separate
  license-scope restriction governed by CLAIM-STOCK-EDITORIAL-001-v1/-v2.

Applicability requirements: []
Unresolved project dependencies: [which_provider, editorial_designation_confirmed, release_status_confirmed]   <!-- askability governance unchanged from v1 (2026-08-21, DAR_001, PM: JD): which_provider = resolved via existing provider extraction, no dedicated CRC question; editorial_designation_confirmed = evidence-only, no CRC question approved; release_status_confirmed = evidence-only, no CRC question approved. Not re-reviewed by this correction -- carried forward unchanged, per FGR_007's own explicit scope boundary. -->
Prohibited conclusions: >
  Does not establish that any specific asset actually has or lacks a
  model release. Does not establish that any specific asset actually has
  or lacks a property release. Does not establish that a release is
  legally required for any specific use. Does not establish that a
  particular person or property is protected. Does not establish that a
  specific use violates any right. Does not establish that separate
  permission (e.g. a Getty Rights and Clearance-style authorization, per
  CLAIM-STOCK-EDITORIAL-001-v1/-v2's own text) cures a release-status gap --
  authorization and release status are distinct project facts, not
  substitutes for each other. Does not establish whether an asset may be
  used commercially -- that remains governed exclusively by
  CLAIM-STOCK-EDITORIAL-001-v1/-v2 and by project-specific Commercial
  Assurance review, never by this claim.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (bounded reaffirmation, 2026-08-27, CRC
  Approver: JD (PM) -- see CRC Approver/CRC Decision Date below; basis:
  `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md`
  §6, not a new substantive CRC Publication Review -- the original
  `CPR_002` analysis remains valid unchanged and is not repeated here).
  Text below is unchanged, byte-identical to v1: CRC may state that
  content Getty, iStock, or Shutterstock designate "Editorial" is
  typically supplied without the model or property releases that would
  otherwise support broader commercial use, as a separate consideration
  from whether the applicable license permits a given use, and that this
  hasn't been independently confirmed for every stock-media provider,
  including Adobe Stock. CRC must not state whether the user's own
  specific asset has or lacks a release, or draw any conclusion from
  that about whether their use is permitted.

CRC Candidate Statement: >
  Content that Getty, iStock, or Shutterstock mark "Editorial" is typically
  supplied without the model or property releases that would otherwise
  support broader commercial use -- a separate question from whether the
  applicable license itself permits your intended use. This hasn't been
  independently confirmed for every stock-media provider, including Adobe
  Stock.

Effective date: 2026-08-17
Last reviewed: 2026-08-27
Version lineage: v2 — supersedes: CLAIM-STOCK-EDITORIAL-002-v1 — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-27
Related: [[CLAIM-STOCK-EDITORIAL-001-v2]] (complementary, not dependent), [[CLAIM-STOCK-EDITORIAL-002-v1]] (superseded predecessor, historical record). See also `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Phase 1A/1B) for full domain context.

Governance Correction Review (2026-08-27): the `provider_scope` correction was
independently re-verified per-provider before recording, not copied
uniformly from CLAIM-STOCK-EDITORIAL-001-v1/-v2's own correction -- this
claim's own evidence explicitly and repeatedly excludes Adobe Stock,
confirmed by its own already-CRC-published CRC Candidate Statement, which
already named only "Getty, iStock, or Shutterstock" by name before this
correction ever ran.

Full review artifact (original adoption): `governance-reviews/FGR_002_CAND-STOCK-EDITORIAL-002_2026-08-17.md`
Full review artifact (this correction): `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md`
Full CRC Publication Review artifact (original): `governance-reviews/CPR_002_CLAIM-STOCK-EDITORIAL-002-v1_2026-08-18.md`
Full CRC Publication Review artifact (bounded reaffirmation): `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md` §6
Full Dependency Askability Review artifact: `governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md`

### CLAIM-STOCK-GETTY-EDITORIAL-001-v1
Domain: Third-Party Source Assets / Stock Media Licensing
Topic: third_party_source_rights
Subtopic: getty-editorial-license-scope-and-rights-clearance
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Getty Images' current Content License Agreement / Terms of Service, not a legal jurisdiction.
Context: Commercial Assurance evidence review of any AI-generated commercial video workflow that incorporates Getty Images source assets designated "Editorial Content"

GOVERNANCE TREATMENT (2026-08-17, PM adoption decision, following Formal Governance Review #3; updated 2026-08-18 following M1/M2/M3 implementation; updated again 2026-08-18 following CRC-publication approval): same runtime-representation gap as CLAIM-STOCK-EDITORIAL-001-v1/-002-v1 at adoption time, now closed the same way and together with them (M1 GoalCategory + M2 AssetProviderMention). **This claim additionally required a provider-narrowing capability the two generic claims did not** (see the Additional future dependency note immediately below, updated in the same pass) -- that capability now exists too (M3: `provider_scope` on `TopicClaim`, a silent pre-filter in `lookupTopicClaims()`). This claim now has a real runtime entry — `topic: 'third_party_source_rights'`, `provider_scope: ['getty']` (a topic candidate ONLY when the conversation's active, canonically-resolved asset providers include `getty`). **Following a bounded CRC-Publication Review (2026-08-18, recommendation A — PASS/GO AS-IS; full review archived at `governance-reviews/CPR_003_CLAIM-STOCK-GETTY-EDITORIAL-001-v1_2026-08-18.md`) and PM approval, this claim is now `CRC Eligible: Yes` below** — the first provider-specific Third-Party Source Assets claim to reach CRC, following the two generic claims (CLAIM-STOCK-EDITORIAL-001-v1, CLAIM-STOCK-EDITORIAL-002-v1). `Publication scope: Reviewer/Commercial Assurance` is UNCHANGED (CLAIM-COPY-004 precedent: Publication scope and CRC Eligibility are independent governance dimensions) and `provider_scope: ['getty']` is UNCHANGED -- the review confirmed provider-scoped routing behaves correctly and required no adjustment.

Additional future dependency, specific to this claim (Formal Governance Review #3; RESOLVED 2026-08-18): at adoption time, this claim additionally needed a not-yet-scoped **provider-narrowing capability** to be safely CRC-reachable -- something capable of ensuring Getty-specific knowledge surfaces only when Getty is actually the relevant provider for a given conversation. That capability is now implemented (M3, per `THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md`) -- `provider_scope: ['getty']` on this claim's runtime entry, evaluated as a silent candidate pre-filter before any governance gate. This paragraph is preserved (not deleted) as the historical record of what was once a real, larger dependency than CLAIM-STOCK-EDITORIAL-001-v1/-002-v1 carried. The claim remains immediately useful to a human reviewer regardless of any of this -- reviewer access to this canonical document does not depend on CRC's own retrieval mechanism at all (`PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §9: "Reviewer access may legitimately expose knowledge that is Adopted but not CRC Eligible").

Provenance note: this claim is classified **DIRECTLY SOURCE-BACKED**, not Governed Synthesis -- unlike CLAIM-STOCK-EDITORIAL-001-v1/-002-v1 (which each combine independently-verified language across three or four providers into one cross-provider synthesis), every load-bearing proposition here derives from Getty's own two official sources with no cross-provider combination involved. One small interpretive step is disclosed, not hidden: the connection between the EULA's written-authorization clause and the separate Rights & Clearance page is a same-provider inferential link this document draws between two official Getty sources -- neither Getty page explicitly cross-references the other; this document does not claim they do.

Relationship to CLAIM-STOCK-EDITORIAL-001-v1 (governance note, not part of the governed statement itself): provider-specific concrete instance / complementary precision. CLAIM-STOCK-EDITORIAL-001-v1 states the cross-provider structural rule in generalized terms (advertising, promotional, endorsement, or merchandising use excluded, some providers offer an authorization path). This claim adds what that generalized statement deliberately omits for a single named provider: Getty's own exact seven-item enumerated list (which differs in specific wording from -001's four-item cross-provider synthesis -- notably includes "commercial," "advertorial," and "gambling/betting/gaming," and does not literally include "merchandising"), the exact named authorization documents (invoice, sales order confirmation, licensing agreement), and the name of Getty's own mechanism (Rights and Clearance). CLAIM-STOCK-EDITORIAL-001-v1 is unmodified by this adoption.

Relationship to CLAIM-STOCK-EDITORIAL-002-v1 (governance note): **COMPLEMENTARY.** This claim does not govern, restate, or imply anything about model or property release status -- that remains CLAIM-STOCK-EDITORIAL-002-v1's own, separate territory, deliberately not duplicated here even though Getty's own Rights and Clearance page touches adjacent ground (it describes obtaining IP/publicity rights more broadly than pure license authorization). CLAIM-STOCK-EDITORIAL-002-v1 is unmodified by this adoption. No `TopicRelationship` is created for either pairing.

Claim proposition: >
  Getty Images' standard license prohibits using content it marks
  "Editorial Content" for commercial, promotional, advertorial,
  endorsement, advertising, gambling/betting/gaming, or marketing
  purposes, absent express written authorization on the applicable
  invoice, sales order confirmation, or licensing agreement. Getty
  separately offers a "Rights and Clearance" function through which a
  customer may seek such authorization, including specifically for
  advertising and promotional use.

Source references:
  - primary (governed record): `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Part 1 §20 CAND-STOCK-GETTY-EDITORIAL-001, and Part 2 §14 re-confirmation, both 2026-08-17) -- full proposition map and Formal Governance Review #3 (2026-08-17) this claim is adopted from.
  - primary (Official platform authority, Tier 1, directly fetched, 3 independent fetches across this research program, substance consistent though section-number labeling was not -- cite by clause text/heading, not section number): Getty Images Content License Agreement (`gettyimages.com/eula`) -- Editorial Content definition (descriptive/newsworthy/public-interest purpose); the exact enumerated prohibited-use clause (commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, marketing); the written-authorization override clause ("unless expressly authorized on the Getty Images invoice, sales order confirmation, or licensing agreement").
  - primary (Official platform authority, Tier 1, directly fetched): Getty Images "Rights and Clearance" (`gettyimages.com/rights-and-clearance`) -- confirms a real, named, provider-run authorization function, explicitly scoped to include advertising and promotional use clearance.
Source authority/type: Official platform authority (directly source-backed -- see Provenance note above; not a cross-provider synthesis)
Source fact: >
  Getty's own Content License Agreement defines "Editorial Content" as
  primarily intended for descriptive, newsworthy, or public-interest
  purposes, and states that such content must not be used for commercial,
  promotional, advertorial, endorsement, advertising, gambling/betting/
  gaming, or marketing purposes unless expressly authorized on the
  applicable invoice, sales order confirmation, or licensing agreement.
  Getty's separate "Rights and Clearance" page describes a function
  through which a customer may be authorized to use Editorial content in
  commercial projects by obtaining additional permissions, with the
  Rights and Clearances team's stated role including advertising and
  promotional use clearance specifically. Both propositions independently
  re-verified via direct fetch across this research program (5 total
  fetches across Phase 0/1A/1B); substance consistent every time, section
  numbering not.

SI8 interpretation: >
  A reviewer evaluating a Getty-sourced Editorial asset should treat this
  claim as the concrete, provider-specific instance of
  CLAIM-STOCK-EDITORIAL-001-v1's own generalized rule: check the asset's
  actual Getty classification, then look specifically for documentary
  evidence of written authorization (an invoice, sales order confirmation,
  or licensing agreement showing an authorization clause) or evidence that
  Getty's Rights and Clearance function was engaged, before concluding the
  asset's intended use is consistent with its Getty license. This claim
  does not itself supply that evidence for any specific project -- it
  states what Getty's own terms and mechanism are, not whether they were
  satisfied here.

Applicability requirements: []
Unresolved project dependencies: [asset_confirmed_getty, editorial_designation_confirmed, separate_authorization_obtained]   <!-- askability governance (2026-08-21, DAR_001, PM: JD): asset_confirmed_getty = auto-satisfied (structurally true whenever this provider-scoped claim is reachable at all), no CRC question; editorial_designation_confirmed = evidence-only, no CRC question approved; separate_authorization_obtained = evidence-only, no CRC question approved. List itself UNCHANGED -- no claim proposition/lifecycle/CRC-eligibility effect. Full review: governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md -->
Prohibited conclusions: >
  Does not establish that any specific asset is actually Getty content.
  Does not establish that a specific asset is designated Editorial
  Content (vs. Creative or another classification). Does not establish
  that the user holds a valid Getty license for the asset. Does not
  establish that express written authorization was obtained for any
  specific asset or project. Does not establish that Getty's Rights and
  Clearance function was engaged for any specific asset. Does not
  establish that model or property releases exist for the asset -- that
  remains CLAIM-STOCK-EDITORIAL-002-v1's own, separate territory. Does
  not establish that third-party rights are cleared. Does not establish
  that a campaign is commercially or legally cleared. Is not a substitute
  for Commercial Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-17
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-18, CRC Approver: JD (PM) -- see CRC
  Approver/CRC Decision Date below; bounded CRC Publication Review complete,
  recommendation A — PASS/GO AS-IS, archived at
  `governance-reviews/CPR_003_CLAIM-STOCK-GETTY-EDITORIAL-001-v1_2026-08-18.md`).
  Text below is unchanged from the pre-approval draft, per governance
  instruction not to reinterpret or rewrite substantive claim text when
  changing CRC-eligibility status: CRC may state that Getty's standard
  Editorial-content license excludes commercial, promotional, advertorial,
  endorsement, advertising, gambling/betting/gaming, and marketing use
  absent express written authorization, and that Getty separately offers a
  Rights and Clearance function through which such authorization may be
  sought. CRC must not state whether the user's own specific Getty asset
  is Editorial-designated, whether authorization was obtained for it, or
  whether their use is therefore permitted.

CRC Candidate Statement: >
  Getty's standard Editorial Content license doesn't cover commercial,
  promotional, advertorial, endorsement, advertising, gambling/betting/
  gaming, or marketing use unless Getty has expressly authorized it in
  writing -- Getty offers a separate "Rights and Clearance" process for
  seeking that authorization, including for advertising and promotional
  use specifically.

Effective date: 2026-08-17
Last reviewed: 2026-08-17
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-18
Related: [[CLAIM-STOCK-EDITORIAL-001-v1]] (provider-specific concrete instance, complementary), [[CLAIM-STOCK-EDITORIAL-002-v1]] (complementary, does not govern release status). See also `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Phase 1A/1B) for full domain context.

Formal Governance Review #3 (2026-08-17): PASS / GO AS-IS -- claim wording
unchanged from the hardened research artifact's own recommended text. All
four load-bearing proposition-map clauses independently confirmed Tier 1
across 3-5 fetches each over the whole research program -- the
strongest-evidenced claim in the domain to date. Classified DIRECTLY
SOURCE-BACKED rather than Governed Synthesis on the merits (no
cross-provider combination occurs), not for consistency with the other
two stock claims. Atomicity found acceptably compound, mirroring
CLAIM-STOCK-EDITORIAL-001-v1's own precedent: separating the license-scope
clause from the Rights and Clearance clause would leave the license-scope
half reading as more absolute than Getty's own terms actually state.
`CRC Eligible` deliberately KEPT Pending -- not a safety/adequacy finding,
a product-completeness deferral now compounded by a second, larger gap
specific to provider-specific claims (the not-yet-scoped provider-
narrowing capability, see the Additional future dependency note above),
neither solved by this adoption decision.

Full review artifact: `governance-reviews/FGR_003_CAND-STOCK-GETTY-EDITORIAL-001_2026-08-17.md`
Full CRC Publication Review artifact: `governance-reviews/CPR_003_CLAIM-STOCK-GETTY-EDITORIAL-001-v1_2026-08-18.md`
Full Dependency Askability Review artifact: `governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md`

### CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1
Domain: Third-Party Source Assets / Stock Media Licensing
Topic: third_party_source_rights
Subtopic: shutterstock-editorial-commercial-distinction-rights-and-clearance
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Shutterstock's current Terms of Service / License Agreement (the Commercial/Editorial definitional distinction independently verified; certain mechanism details rest on Shutterstock's own public/investor disclosures rather than the license agreement text itself), not a legal jurisdiction.
Context: Commercial Assurance evidence review of any AI-generated commercial video workflow that incorporates Shutterstock source assets designated "Editorial"

GOVERNANCE TREATMENT (2026-08-17, PM adoption decision, following Formal Governance Review #4; updated 2026-08-18 following M1/M2/M3 implementation; updated again 2026-08-18 following CRC-publication approval): same runtime-representation and provider-narrowing gaps as CLAIM-STOCK-GETTY-EDITORIAL-001-v1 at adoption time, now closed the same way and together with the other stock claims (M1 GoalCategory + M2 AssetProviderMention + M3 provider-scoped retrieval). This claim now has a real runtime entry — `topic: 'third_party_source_rights'`, `provider_scope: ['shutterstock']`. **Following a bounded CRC-Publication Review (2026-08-18, recommendation A — PASS/GO AS-IS; full review archived at `governance-reviews/CPR_005_CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1_2026-08-18.md`) and PM approval, this claim is now `CRC Eligible: Yes` below** — the third and final provider-specific Third-Party Source Assets claim researched to date to reach CRC, after CLAIM-STOCK-GETTY-EDITORIAL-001-v1 and CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1. The review's own load-bearing test confirmed the claim's intentionally mixed evidence-tier disclosure (Tier 1 functional distinction, Official Secondary Rights and Clearance description) survives real pipeline execution without being flattened into Getty-level certainty, including empirical confirmation via a joint Getty+Shutterstock rendered scenario. `Publication scope: Reviewer/Commercial Assurance` is UNCHANGED (CLAIM-COPY-004 precedent: Publication scope and CRC Eligibility are independent governance dimensions) and `provider_scope: ['shutterstock']` is UNCHANGED -- the review confirmed provider-scoped routing behaves correctly and required no adjustment.

Additional future dependency, specific to this claim (same shape as CLAIM-STOCK-GETTY-EDITORIAL-001-v1's own; RESOLVED 2026-08-18): at adoption time, this claim additionally needed the same not-yet-scoped **provider-narrowing capability** identified for Getty. Formal Governance Review #4 confirmed Shutterstock introduced no new routing requirement beyond the one already identified through Getty -- confirmed again at implementation: the same M3 mechanism (`provider_scope: ['shutterstock']`) closes it, with no Shutterstock-specific engineering required. This paragraph is preserved as the historical record of that dependency. The claim remains immediately useful to a human reviewer regardless of any of this, for the same reason already recorded on the Getty claim's own entry.

Evidence-tier disclosure (Formal Governance Review #4, non-negotiable, preserved exactly, not smoothed over): this claim's propositions do NOT share one evidence tier. The Commercial/Editorial functional distinction is Tier 1, directly verified against an official Shutterstock source. The Rights and Clearance description is Official Secondary -- sourced from Shutterstock's own investor-relations press release and blog, not from Shutterstock's customer-facing License Agreement / Terms of Service, which remained inaccessible throughout this research despite eight independent access attempts across three research sessions (Phase 1A, Phase 1B, and Formal Governance Review #4's own bounded verification attempt on a previously-untried URL, also unsuccessful -- HTTP 403, the same block pattern observed on every other `www.shutterstock.com` legal/help path tried). **This claim's provenance is classified DIRECTLY SOURCE-BACKED** (no cross-provider synthesis occurs, matching CLAIM-STOCK-GETTY-EDITORIAL-001-v1's own classification basis) **rather than Governed Synthesis, but is explicitly NOT held to the same full evidentiary bar the Getty claim met** -- Getty's own four proposition-map entries were each independently Tier 1; this claim's Rights and Clearance clause is not, and is stated with wording calibrated to that weaker tier (see Claim proposition below, which explicitly states its own mechanics were not independently verified, rather than asserting them with Getty-claim-level confidence). **Taxonomy-precision anomaly, flagged not solved:** "Directly Source-Backed" does not itself distinguish an all-Tier-1 claim (Getty) from a Tier-1-plus-Official-Secondary claim (this one) -- noted here as context for a future governance-format refinement, not resolved by inventing a new provenance category for this single claim.

Asset Assurance (governance note, deliberately outside this claim's own governed proposition): Shutterstock separately offers a product publicly described as "Asset Assurance," which adds indemnification once permission or clearance for a use has already been secured elsewhere. Formal Governance Review #4 determined Asset Assurance does not itself answer what Shutterstock's Editorial license permits -- it is a downstream risk/indemnity layer, not a permission-granting mechanism -- and excluded it from this claim's own proposition, dependency list, and reviewer-evidence checklist accordingly. It is recorded here only as adjacent, non-governed context, exactly as it was in the governance review itself: Asset Assurance is a separate indemnity/risk layer and does not itself determine what Shutterstock's Editorial license permits. No separate Asset Assurance claim is created by this adoption decision.

Relationship to CLAIM-STOCK-EDITORIAL-001-v1 (governance note, not part of the governed statement itself): provider-specific concrete instance / complementary precision. This claim adds Shutterstock's own functional Commercial-vs-Editorial terminology (structurally different from Getty/iStock's enumerated-list drafting approach, which CLAIM-STOCK-EDITORIAL-001-v1's cross-provider synthesis necessarily abstracts away) and names Rights and Clearance specifically. CLAIM-STOCK-EDITORIAL-001-v1 is unmodified by this adoption.

Relationship to CLAIM-STOCK-EDITORIAL-002-v1 (governance note): **COMPLEMENTARY.** This claim does not govern, restate, or imply anything about model or property release status. CLAIM-STOCK-EDITORIAL-002-v1 is unmodified by this adoption.

Relationship to CLAIM-STOCK-GETTY-EDITORIAL-001-v1 (governance note): no direct relationship record required -- Getty remains a separate provider-specific concrete instance of CLAIM-STOCK-EDITORIAL-001-v1, evaluated and evidenced independently of Shutterstock. CLAIM-STOCK-GETTY-EDITORIAL-001-v1 is unmodified by this adoption. No `TopicRelationship` is created for any of these pairings.

Claim proposition: >
  Shutterstock distinguishes "Commercial" content (usable to
  commercialize, monetize, sell, promote, or advertise a product,
  business, or service) from "Editorial" content (which cannot be used
  for those purposes, being intended for public-interest/news use).
  Shutterstock has publicly described a "Rights and Clearance" service,
  separate from its standard licenses, through which a customer may
  seek third-party permissions for promotional use of Editorial assets.
  The exact contractual mechanics of this service have not been
  independently verified against Shutterstock's own customer-facing
  license agreement text, which was not directly accessible during this
  research.

Source references:
  - primary (governed record): `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Part 1 §20 CAND-STOCK-SHUTTERSTOCK-EDITORIAL-001, and Part 2 §7/§9/§14 re-evaluation, both 2026-08-17) -- full proposition map and Formal Governance Review #4 (2026-08-17) this claim is adopted from, including the review's own bounded fresh-verification attempt.
  - primary (Official platform authority, Tier 1, directly fetched): Shutterstock, official contributor-help domain (`submit.shutterstock.com`) -- "The simple answer to the difference between commercial and editorial content is how that content is permitted to be used." Commercial content "can be used to commercialize, monetize, sell, promote, and advertise a product, business or service." Editorial content "cannot be used to sell, promote, or monetize a business, product or service."
  - secondary (Official Secondary, NOT Verified Primary, disclosed explicitly): Shutterstock's own investor-relations press release (republished via `stocktitan.net`) and Shutterstock's own blog -- describe a "Rights and Clearance" service that "obtains third party permissions across the entire portfolio of assets for promotional use in advertisements, social campaigns, marketing materials and more," and, separately, an "Asset Assurance™" indemnity product (excluded from this claim's own proposition -- see Asset Assurance note above).
  - NOT independently verified: Shutterstock's customer-facing License Agreement / Terms of Service. `shutterstock.com/license`, `shutterstock.com/license-history`, `shutterstock.com/terms`, three `shutterstock.com/help/en/articles/...` pages, and `shutterstock.com/developers/documentation/licensing-and-downloading` were all attempted across Phase 1A, Phase 1B, and Formal Governance Review #4 -- eight distinct URLs, zero successes, uniformly HTTP 403. This is treated as a confirmed structural access limitation, not a research-effort gap, and is NOT cited as though it were verified.
Source authority/type: Official platform authority (directly source-backed for the Commercial/Editorial functional definition; Official Secondary, explicitly not upgraded to primary, for the Rights and Clearance description -- see Evidence-tier disclosure above)
Source fact: >
  Shutterstock's own official contributor-help material defines the
  Commercial/Editorial distinction functionally rather than via an
  enumerated prohibited-use list (the drafting approach Getty and iStock
  each use instead) -- content is Commercial if usable to commercialize,
  monetize, sell, promote, or advertise a product, business, or service,
  and Editorial if it cannot be used for those purposes, being intended
  for public-interest/news use. Separately, Shutterstock's own
  investor-relations and blog material describes a named "Rights and
  Clearance" service for obtaining third-party permissions for
  promotional use of Editorial assets -- this description is accepted as
  Official Secondary evidence of the service's existence and general
  purpose, not as Verified Primary evidence of its exact contractual
  mechanics, which remain unconfirmed against Shutterstock's own license
  agreement text.

SI8 interpretation: >
  A reviewer evaluating a Shutterstock-sourced Editorial asset should
  apply Shutterstock's own functional test directly -- does the proposed
  use commercialize, monetize, sell, promote, or advertise a product,
  business, or service -- rather than assuming Shutterstock's rule takes
  the same enumerated-list shape as CLAIM-STOCK-GETTY-EDITORIAL-001-v1's
  own Getty-specific rule. Where a reviewer identifies that a customer
  sought or obtained Shutterstock's Rights and Clearance service, this
  claim tells them the service's general purpose but does not itself
  confirm what documentation would prove it was successfully engaged for
  a specific asset -- that remains a Commercial Assurance evidence
  question. This claim does not address, and should not be read as
  addressing, Shutterstock's separate Asset Assurance product, which is
  indemnity/risk protection rather than a permission-granting mechanism
  (see Asset Assurance note above).

Applicability requirements: []
Unresolved project dependencies: [asset_confirmed_shutterstock, editorial_designation_confirmed, rights_and_clearance_status]   <!-- askability governance (2026-08-21, DAR_001, PM: JD): asset_confirmed_shutterstock = auto-satisfied (structurally true whenever this provider-scoped claim is reachable at all), no CRC question; editorial_designation_confirmed = evidence-only, no CRC question approved; rights_and_clearance_status = evidence-only, no CRC question approved. List itself UNCHANGED -- no claim proposition/lifecycle/CRC-eligibility effect. Full review: governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md -->
Prohibited conclusions: >
  Does not establish that any specific asset is actually from
  Shutterstock. Does not establish that Shutterstock actually designates
  a specific asset Editorial (vs. Commercial or another classification).
  Does not establish that the user holds a valid Shutterstock license,
  or which license/version governed the transaction. Does not establish
  that Rights and Clearance was actually engaged for any specific asset,
  or that permission was successfully obtained through it. Does not
  establish that model or property releases exist for the asset -- that
  remains CLAIM-STOCK-EDITORIAL-002-v1's own, separate territory. Does
  not establish that Asset Assurance applies to any specific asset --
  Asset Assurance is explicitly outside this claim's own scope. Does not
  establish that third-party rights are cleared. Does not establish that
  a specific advertisement or campaign is commercially or legally
  cleared. Is not a substitute for Commercial Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-17
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-18, CRC Approver: JD (PM) -- see CRC
  Approver/CRC Decision Date below; bounded CRC Publication Review complete,
  recommendation A — PASS/GO AS-IS, archived at
  `governance-reviews/CPR_005_CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1_2026-08-18.md`).
  Text below is unchanged from the pre-approval draft, per governance
  instruction not to reinterpret or rewrite substantive claim text when
  changing CRC-eligibility status: CRC may state that Shutterstock
  distinguishes Commercial content (usable to commercialize, monetize,
  sell, promote, or advertise) from Editorial content (which cannot be
  used for those purposes), and that Shutterstock has publicly described a
  Rights and Clearance service for seeking third-party permissions for
  promotional use of Editorial assets, whose exact mechanics CRC has not
  independently verified. CRC must not state whether the user's own
  specific Shutterstock asset is Editorial-designated, whether Rights and
  Clearance was engaged for it, or whether their use is therefore
  permitted.

CRC Candidate Statement: >
  Shutterstock treats content as Commercial if it can be used to
  commercialize, monetize, sell, promote, or advertise a product,
  business, or service, and as Editorial if it can't be used for those
  purposes. Shutterstock has publicly described a "Rights and Clearance"
  service for seeking permission to use Editorial content this way,
  though the exact details of that process haven't been independently
  confirmed.

Effective date: 2026-08-17
Last reviewed: 2026-08-17
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-18
Related: [[CLAIM-STOCK-EDITORIAL-001-v1]] (provider-specific concrete instance, complementary), [[CLAIM-STOCK-EDITORIAL-002-v1]] (complementary, does not govern release status), [[CLAIM-STOCK-GETTY-EDITORIAL-001-v1]] (sibling provider-specific claim, no direct relationship). See also `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Phase 1A/1B) for full domain context.

Formal Governance Review #4 (2026-08-17): PASS / GO WITH MATERIAL REWRITE
-- original research-stage wording asserted Asset Assurance's mechanics
alongside Rights and Clearance's; rewritten to exclude Asset Assurance
entirely (it does not answer what Shutterstock's Editorial license
permits -- it presupposes permission was already obtained elsewhere) and
to explicitly state, within the governed proposition itself rather than
only in Source references, that Rights and Clearance's exact mechanics
were not independently verified against Shutterstock's own license
agreement text. One bounded fresh-verification attempt was made during
the review (a previously-untried Shutterstock developer-documentation
URL) and failed identically to all seven prior attempts -- strengthening,
not changing, the conclusion that the primary-source gap is structural.
Provenance classified DIRECTLY SOURCE-BACKED on the same basis as
CLAIM-STOCK-GETTY-EDITORIAL-001-v1 (no cross-provider synthesis), but
explicitly NOT held to that claim's full evidentiary bar -- disclosed as
a genuine, unresolved taxonomy-precision anomaly rather than smoothed
into false symmetry. `CRC Eligible` deliberately KEPT Pending -- same
product-completeness deferral (Path A) plus the same second, larger gap
(provider narrowing) already identified for Getty; Formal Governance
Review #4 confirmed Shutterstock introduces no new routing requirement
beyond that one.

Full review artifact: `governance-reviews/FGR_004_CAND-STOCK-SHUTTERSTOCK-EDITORIAL-001_2026-08-17.md`
Full CRC Publication Review artifact: `governance-reviews/CPR_005_CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1_2026-08-18.md`
Full Dependency Askability Review artifact: `governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md`

### CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1
Domain: Third-Party Source Assets / Stock Media Licensing
Topic: third_party_source_rights
Subtopic: istock-editorial-use-only-restriction-no-evidenced-exception
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by iStock's current License Agreement / Terms of Use, not a legal jurisdiction.
Context: Commercial Assurance evidence review of any AI-generated commercial video workflow that incorporates iStock source assets designated "editorial use only"

GOVERNANCE TREATMENT (2026-08-17, PM adoption decision, following Formal Governance Review #5; updated 2026-08-18 following M1/M2/M3 implementation; updated again 2026-08-18 following CRC-publication approval): same runtime-representation and provider-narrowing gaps as CLAIM-STOCK-GETTY-EDITORIAL-001-v1 and CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 at adoption time, now closed the same way and together with the other stock claims (M1 GoalCategory + M2 AssetProviderMention + M3 provider-scoped retrieval). This claim now has a real runtime entry — `topic: 'third_party_source_rights'`, `provider_scope: ['istock']`. **Following a bounded CRC-Publication Review (2026-08-18, recommendation A — PASS/GO AS-IS; full review archived at `governance-reviews/CPR_004_CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1_2026-08-18.md`) and PM approval, this claim is now `CRC Eligible: Yes` below** — the second provider-specific Third-Party Source Assets claim to reach CRC, after CLAIM-STOCK-GETTY-EDITORIAL-001-v1. The review's own load-bearing test confirmed the claim's negative-finding framing ("no evidence found," never "confirmed absence") survives intact under real pipeline execution, including two targeted adversarial pressure-tests. `Publication scope: Reviewer/Commercial Assurance` is UNCHANGED (CLAIM-COPY-004 precedent: Publication scope and CRC Eligibility are independent governance dimensions) and `provider_scope: ['istock']` is UNCHANGED -- the review confirmed provider-scoped routing behaves correctly and required no adjustment.

Additional future dependency, specific to this claim (same shape as CLAIM-STOCK-GETTY-EDITORIAL-001-v1's and CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1's own; RESOLVED 2026-08-18): at adoption time, this claim additionally needed the same not-yet-scoped **provider-narrowing capability** identified for Getty and Shutterstock. Formal Governance Review #5 confirmed iStock introduced no new routing requirement beyond the one already identified -- confirmed again at implementation: the same M3 mechanism (`provider_scope: ['istock']`) closes it, with no iStock-specific engineering required. This paragraph is preserved as the historical record of that dependency. The claim remains immediately useful to a human reviewer regardless of any of this, for the same reason already recorded on the Getty and Shutterstock claims' own entries.

Provenance note: this claim is classified **DIRECTLY SOURCE-BACKED** -- the cleanest classification of the three provider-specific claims to date, per Formal Governance Review #5. Unlike CLAIM-STOCK-GETTY-EDITORIAL-001-v1 (needed a disclosed inferential link between two Getty pages) or CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 (needed an explicit mixed Tier-1/Official-Secondary evidence-tier disclosure), this claim asserts no exception mechanism at all, so there is no analogous inferential step or mixed-sourcing complication to reconcile. All load-bearing propositions derive from iStock's own single official source, directly and consistently fetched three times across the whole research program.

Negative-finding discipline (non-negotiable, preserved exactly as Formal Governance Review #5 approved it): the research established **NO EVIDENCE FOUND** of an iStock-run mechanism to authorize Editorial-use-only content for commercial/promotional/advertising-type use -- this is explicitly and permanently distinct from **SUPPORTED NO** ("iStock has no such mechanism"). The claim's own text uses the "negative finding, not a confirmed absence" framing precisely for this reason. This claim must never be read, cited, or paraphrased as establishing that iStock categorically lacks any clearance path -- only that none was found across two independent research passes against iStock's own primary agreement text and independent web search.

Relationship to CLAIM-STOCK-EDITORIAL-001-v1 (governance note, not part of the governed statement itself): provider-specific concrete instance / complementary precision. This claim adds iStock's own exact seven-item enumerated list (commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, merchandising -- differing from CLAIM-STOCK-GETTY-EDITORIAL-001-v1's own list by exactly one term: iStock uses "merchandising," not "marketing") and the well-hedged negative clearance-mechanism finding, neither of which CLAIM-STOCK-EDITORIAL-001-v1's generalized cross-provider synthesis states. CLAIM-STOCK-EDITORIAL-001-v1 is unmodified by this adoption.

Relationship to CLAIM-STOCK-EDITORIAL-002-v1 (governance note): **COMPLEMENTARY.** This claim's own "editorial use only" definition necessarily mentions release-lack as contractual context for what the term means under iStock's agreement -- this is definitional context, not a separately-asserted governed proposition about release status, which remains CLAIM-STOCK-EDITORIAL-002-v1's own, separate territory (see Prohibited conclusions below, added per Formal Governance Review #5's own recommendation to formalize this boundary explicitly at adoption rather than leave it implicit). CLAIM-STOCK-EDITORIAL-002-v1 is unmodified by this adoption.

Relationship to CLAIM-STOCK-GETTY-EDITORIAL-001-v1 and CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 (governance note): sibling provider-specific claims, each evaluated and evidenced independently; no direct relationship record required. Formal Governance Review #5 specifically confirmed that Getty's and iStock's near-identical enumerated-list drafting style does not weaken the case for iStock's own separate governance -- the two are separate, independently-versioned legal contracts, and Getty's real, evidenced Rights and Clearance mechanism has no iStock counterpart, a material difference a combined claim would either misrepresent or awkwardly branch around. Neither Getty's nor Shutterstock's claim is modified by this adoption. No `TopicRelationship` is created for any of these pairings.

Claim proposition: >
  iStock's standard license restricts content marked "editorial use
  only" (defined as lacking model/property releases and intended for
  descriptive/newsworthy/human-interest purposes) from commercial,
  promotional, advertorial, endorsement, advertising, gambling/betting/
  gaming, or merchandising use. No evidence was found, across two
  independent research passes, of an iStock-run mechanism to authorize
  such use for a specific asset -- this is a negative finding, not a
  confirmed absence.

Source references:
  - primary (governed record): `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Part 1 §20 CAND-STOCK-ISTOCK-EDITORIAL-001, and Part 2 §14 re-confirmation, both 2026-08-17) -- full proposition map and Formal Governance Review #5 (2026-08-17) this claim is adopted from; verbatim archive at `governance-reviews/FGR_005_CAND-STOCK-ISTOCK-EDITORIAL-001_2026-08-17.md`.
  - primary (Official platform authority, Tier 1, directly fetched, 3 independent fetches across this research program -- Phase 0, Phase 1A, Phase 1B -- consistent substance and consistent "Last Updated: July 2026" date every time, the most stable source of any provider researched in this domain): iStock Content License Agreement (`istockphoto.com/legal/license-agreement`) -- the "editorial use only" definition (descriptive/newsworthy/human-interest purpose, lacking model/property releases); the exact enumerated prohibited-use clause (commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, merchandising).
  - NOT independently verified as present: any iStock-run clearance/authorization mechanism. Checked directly against the primary agreement text (no such clause found, unlike Getty's explicit written-authorization carve-out) and via two independent `WebSearch` passes (Phase 1A, Phase 1B) targeting this specific question -- neither surfaced one. This is recorded as an absence-of-evidence finding, epistemically distinct from a sourced claim that no mechanism exists, and is never cited as though it were the latter.
Source authority/type: Official platform authority (directly source-backed; no cross-provider synthesis)
Source fact: >
  iStock's own Content License Agreement defines "editorial use only"
  content as lacking model or property releases and intended for
  descriptive, newsworthy, or human-interest purposes, and restricts
  such content from commercial, promotional, advertorial, endorsement,
  advertising, gambling/betting/gaming, or merchandising use. Unlike
  Getty's parallel clause, iStock's own agreement text contains no
  "unless expressly authorized" carve-out or reference to any separate
  authorization process. No named mechanism analogous to Getty's Rights
  and Clearance or Shutterstock's Rights and Clearance was found anywhere
  in iStock's own materials, nor via independent web search across two
  separate research passes -- a negative finding, correctly not asserted
  as a positive fact that no such mechanism exists.

SI8 interpretation: >
  A reviewer evaluating an iStock-sourced Editorial asset should apply
  iStock's own exact seven-item list directly, and should treat any
  user claim of having obtained "special permission" or "separate
  authorization" from iStock with heightened scrutiny -- unlike a Getty
  or Shutterstock asset, where a reviewer would naturally check for
  Rights and Clearance engagement as a first step, no equivalent
  provider-run channel is known to exist for iStock. This claim's
  negative finding is reviewer-protective: it exists specifically to
  prevent a reviewer from assuming iStock behaves like Getty by
  unwarranted analogy, or from accepting an unverified "iStock cleared
  this" representation at face value. This claim does not itself confirm
  or deny that some other, currently unknown authorization path might
  exist for a specific case.

Applicability requirements: []
Unresolved project dependencies: [asset_confirmed_istock, editorial_designation_confirmed]   <!-- askability governance (2026-08-21, DAR_001, PM: JD): asset_confirmed_istock = auto-satisfied (structurally true whenever this provider-scoped claim is reachable at all), no CRC question; editorial_designation_confirmed = evidence-only, no CRC question approved. List itself UNCHANGED -- no claim proposition/lifecycle/CRC-eligibility effect. Full review: governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md -->
Prohibited conclusions: >
  Does not establish that any specific asset is actually from iStock.
  Does not establish that iStock actually designates a specific asset
  "editorial use only" (vs. another classification). Does not establish
  that the user holds a valid iStock license, or which license/version
  governed the transaction. Does not establish that model or property
  releases exist for the asset -- that remains CLAIM-STOCK-EDITORIAL-002
  -v1's own, separate territory; this claim's own definitional mention of
  release-lack is contractual context for what "editorial use only"
  means under iStock's agreement, not an independent assertion about
  release status. Does not establish that no authorization or clearance
  path exists for iStock in any circumstance -- only that none was found
  across the research performed; this is a negative finding, never to be
  restated as a confirmed absence. Does not establish that a specific
  advertisement or campaign is commercially or legally cleared. Is not a
  substitute for Commercial Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-17
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-18, CRC Approver: JD (PM) -- see CRC
  Approver/CRC Decision Date below; bounded CRC Publication Review complete,
  recommendation A — PASS/GO AS-IS, archived at
  `governance-reviews/CPR_004_CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1_2026-08-18.md`).
  Text below is unchanged from the pre-approval draft, per governance
  instruction not to reinterpret or rewrite substantive claim text when
  changing CRC-eligibility status: CRC may state that iStock's standard
  license excludes commercial, promotional, advertorial, endorsement,
  advertising, gambling/betting/gaming, and merchandising use of content
  marked "editorial use only," and that no provider-run authorization
  mechanism for such use was found during CRC's underlying research --
  stated as an absence of evidence, never as a confirmed fact that none
  exists. CRC must not state whether the user's own specific iStock asset
  is Editorial-designated, or whether their use is therefore permitted.

CRC Candidate Statement: >
  iStock's standard license doesn't cover commercial, promotional,
  advertorial, endorsement, advertising, gambling/betting/gaming, or
  merchandising use of content marked "editorial use only." No
  provider-run process for authorizing that kind of use was found during
  this research -- that means none was found, not that none exists.

Effective date: 2026-08-17
Last reviewed: 2026-08-17
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-18
Related: [[CLAIM-STOCK-EDITORIAL-001-v1]] (provider-specific concrete instance, complementary), [[CLAIM-STOCK-EDITORIAL-002-v1]] (complementary, does not govern release status), [[CLAIM-STOCK-GETTY-EDITORIAL-001-v1]] (sibling provider-specific claim, no direct relationship), [[CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1]] (sibling provider-specific claim, no direct relationship). See also `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Phase 1A/1B) for full domain context.

Formal Governance Review #5 (2026-08-17): PASS / GO AS-IS -- claim wording
unchanged from the hardened research artifact's own recommended text.
Source hierarchy confirmed the strongest and most stable of any provider
in this domain (single Tier 1 source, consistent "Last Updated: July
2026" across three independent fetches). Negative-finding discipline
(NO EVIDENCE FOUND, never SUPPORTED NO) independently verified as
correctly preserved in the candidate's own text, not merely asserted.
Atomicity found acceptably compound, mirroring CLAIM-STOCK-GETTY-
EDITORIAL-001-v1's own precedent. unresolved_project_dependencies
independently re-derived (not copied from Getty or Shutterstock) --
deliberately two items only, omitting an authorization-status dependency
since none is evidenced to exist. Provenance classified DIRECTLY
SOURCE-BACKED, the cleanest of the three provider-specific claims to
date, on the merits (no cross-provider synthesis, no inferential
same-provider linkage needed, unlike Getty or Shutterstock). `CRC
Eligible` deliberately KEPT Pending -- same product-completeness
deferral (Path A) plus the same second, larger gap (provider narrowing)
already identified for Getty and Shutterstock; Formal Governance Review
#5 confirmed iStock introduces no new routing requirement beyond that
one.

Full review artifact: `governance-reviews/FGR_005_CAND-STOCK-ISTOCK-EDITORIAL-001_2026-08-17.md`
Full CRC Publication Review artifact: `governance-reviews/CPR_004_CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1_2026-08-18.md`
Full Dependency Askability Review artifact: `governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md`

**Wave 3 claims below (2026-08-27) — the first claims outside Copyright & Human Authorship and Third-Party Source Assets / Stock Media Licensing, and the first in the Third-Party Source Assets / Music Licensing domain. All ten `Lifecycle: Adopted` (Adoption Approver: JD (PM), Adoption Decision Date: 2026-08-27, following explicit human review and approval of the corrected Human Adoption Decision packet — "APPROVE ALL PROPOSED ADOPTIONS"), `Publication scope: Reviewer/Commercial Assurance`. None are CRC-eligible — `CRC Approver`/`CRC Decision Date` PENDING on all ten, same discipline as every prior wave; a separate CRC Publication Review is required per claim before any becomes `CRC Eligible: Yes`. Formal Governance Review: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md` (combined-package review, 11 candidates reviewed, 10 accepted/narrowed for Adoption as recorded below, 1 deferred without drafting — FGR_006's own "A-7b," Artlist seat/member mechanics, was never assigned a claim ID and is NOT adopted — and 1 rejected — `CLAIM-MUSIC-ACCESS-NOT-LICENSE-001-v1` (FGR_006's "G-1") is NOT adopted). Source candidate package: `MUSIC-SCENARIO-A-FGR-PACKAGE.md` (this folder). Runtime note, same shape as Wave 2's own: none of these ten claims has any `TOPIC_CLAIMS_FIXTURE` (`08_Platform/app/lib/retrieval-engine/topic-claims-fixture.ts`) representation, and every one of their `provider_scope` values (`envato-elements`, `epidemic-sound`, `artlist`) is not yet a registered `AssetProviderId` in `ASSET_PROVIDER_IDS` (`08_Platform/app/types/interview-engine.ts`, currently `getty`/`istock`/`shutterstock`/`adobe-stock` only) — confirmed directly against current code as part of this Adoption recording, not assumed from the FGR. This is Adoption as pure governance documentation, with zero runtime effect: these ten claims are governed Living Knowledge, immediately useful to a human reviewer per `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §9 (same principle already established for Getty at adoption time), but structurally unreachable by CRC Retrieval until a separate, deliberately unperformed engineering task registers the three music providers and adds fixture entries.**

### CLAIM-MUSIC-ENVATO-SYNC-001-v1
Domain: Third-Party Source Assets / Music Licensing
Topic: third_party_source_rights
Subtopic: envato-sync-license-scope-and-broadcast-standalone-exclusions
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Envato Elements' current License Terms, not a legal jurisdiction.
Context: Commercial Assurance evidence review of any commercial video workflow that incorporates a pre-existing licensed Envato Elements music track

GOVERNANCE TREATMENT (2026-08-27, PM adoption decision, following Formal Governance Review #6 — combined package, `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`): `provider_scope: ['envato-elements']` — NOT YET a valid runtime `AssetProviderId` (see Wave 3 header note above); this claim is Adopted governed knowledge but not CRC-reachable via Retrieval until `ASSET_PROVIDER_IDS` and its alias-resolution table (`extraction.ts`'s `KNOWN_ASSET_PROVIDERS`) are extended — a generic registry extension, not a music-specific one, deliberately not performed by this or any prior task in this domain. FGR_006 evidence status: SUPPORTED AS WRITTEN, independently re-fetched live (`elements.envato.com/learn/how-envato-licensing-works`) during both the FGR and this Adoption recording's own governance chain. FGR disposition: ACCEPT (no wording change).

Claim proposition: >
  Under Envato Elements' standard subscription, music items are licensed
  for use synchronized with other media (e.g. as part of a video), and
  may not be resold or redistributed as standalone audio files; the
  standard license excludes "Broadcast" use specifically.

Source references:
  - primary (Official platform authority, Class A, independently retrieved and directly fetched): Envato Elements, "How Envato Licensing Works" (`elements.envato.com/learn/how-envato-licensing-works`) — verbatim: "you can't...use music items in broadcast presentations"; "you can't...resell them as standalone audio files."
Source authority/type: Official platform authority (directly source-backed, single-provider, no cross-provider synthesis)
Source fact: >
  Envato Elements' own licensing-explainer page states that standard-
  subscription music items may not be used in broadcast presentations and
  may not be resold or redistributed as standalone audio files. Retrieved
  2026-08-27; no on-page effective/last-updated date captured.

SI8 interpretation: >
  A reviewer evaluating an Envato-sourced music track should confirm the
  intended use is synchronized with other media (not standalone
  distribution) and does not constitute "Broadcast" use under Envato's
  own terms, before treating the track as covered by a standard Envato
  Elements subscription. This claim does not itself determine whether any
  specific project's use qualifies.

Applicability requirements: []
Unresolved project dependencies: [which_music_provider]   <!-- fail-closed default: absent from dependency-askability.ts's registry (one live entry, human_contribution_description), therefore evidence-only. No Dependency Askability Review has been performed for this domain. Informational governance metadata only -- never evaluated against any fact, never gates CRC reachability. -->
Prohibited conclusions: >
  Does not establish whether a specific project's use qualifies as
  "Broadcast" under Envato's own terms. Does not establish whether a
  specific track is being used in a standalone/resale manner. Does not
  establish that the user holds a valid Envato Elements subscription for
  the track. Does not establish that third-party rights are otherwise
  cleared. Is not a substitute for Commercial Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  PENDING — not yet reviewed for CRC Publication. FGR_006 recommends CRC
  eligibility (§9), but this is a directional recommendation only, not a
  Publication-stage decision; a separate CRC Publication Review is
  required.

CRC Candidate Statement: >
  [DRAFT -- pending CRC Publication Review; not yet approved for CRC use]
  Envato's standard license ties music use to synchronization with other
  media and excludes standalone resale and broadcast use, as a general
  framing.

Effective date: 2026-08-27
Last reviewed: 2026-08-27
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING
CRC Decision Date: PENDING
Related: [[CLAIM-MUSIC-ENVATO-CANCELLATION-001-v1]] (same provider, same license, distinct fact)

Full review artifact: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`

### CLAIM-MUSIC-ENVATO-CANCELLATION-001-v1
Domain: Third-Party Source Assets / Music Licensing
Topic: third_party_source_rights
Subtopic: envato-post-cancellation-license-continuity
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Envato Elements' current License Terms, not a legal jurisdiction.
Context: Commercial Assurance evidence review of a commercial video workflow whose Envato Elements subscription has since lapsed or been cancelled

GOVERNANCE TREATMENT (2026-08-27, PM adoption decision, FGR #6): `provider_scope: ['envato-elements']`, same registry-gap note as CLAIM-MUSIC-ENVATO-SYNC-001-v1 above. **Wording corrected 2026-08-27, before this Adoption, per the FGR_006 integration review**: the proposition previously read "remains valid permanently, even if the subscription is later cancelled" — the cited evidence states indefinite continuation but never uses "permanently"; narrowed to "remains licensed even if the subscription later ends" to track the source exactly. The correction did not change evidence, provider_scope, dependencies, or FGR disposition (ACCEPT, unchanged). Adopted below in its corrected form only.

Claim proposition: >
  Per Envato Elements' own stated policy, a music license for a project
  completed and published while the subscription was active remains
  licensed even if the subscription later ends; new projects/uses after
  cancellation are not covered.

Source references:
  - primary (Official platform authority, Class A, independently retrieved and directly fetched): Envato Elements, "How Envato Licensing Works" (`elements.envato.com/learn/how-envato-licensing-works`) — verbatim: "Assets you've used in completed projects during your active subscription remain licensed even if your subscription ends"; "You won't be able to download new items or use assets in new or incomplete projects after unsubscribing, but existing work stays covered."
Source authority/type: Official platform authority (directly source-backed, single-provider)
Source fact: >
  Envato Elements' own licensing-explainer page states that assets used
  in completed, published projects remain licensed after subscription
  cancellation, while new or incomplete projects are not covered once
  unsubscribed. Retrieved and independently re-fetched twice (FGR, then
  this Adoption recording's own governance chain), substance unchanged
  both times.

SI8 interpretation: >
  A reviewer should confirm the specific project was actually completed
  and published while the Envato subscription was active before relying
  on this continuity rule — this claim states Envato's policy, not a
  determination for any specific project's timeline.

Applicability requirements: []
Unresolved project dependencies: [music_subscription_active_at_publication_confirmed]   <!-- evidence-only: account-history/documentary fact, not registered in dependency-askability.ts. No DAR performed. -->
Prohibited conclusions: >
  Does not establish that the user's specific project was actually
  completed and published while their Envato subscription was active —
  that is a documentary, project-specific fact. Does not establish that
  the user's subscription is or was ever actually active. Is not a
  substitute for Commercial Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  PENDING — not yet reviewed for CRC Publication. FGR_006 recommends CRC
  eligibility (§9); separate CRC Publication Review required.

CRC Candidate Statement: >
  [DRAFT -- pending CRC Publication Review; not yet approved for CRC use]
  Envato's stated policy is that already-completed, already-published
  work stays licensed after cancellation, while new use does not.

Effective date: 2026-08-27
Last reviewed: 2026-08-27
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING
CRC Decision Date: PENDING
Related: [[CLAIM-MUSIC-ENVATO-SYNC-001-v1]] (same provider, same license, distinct fact)

Full review artifact: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`

### CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1
Domain: Third-Party Source Assets / Music Licensing
Topic: third_party_source_rights
Subtopic: epidemic-sound-tier-advertising-paid-media-distinction
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Epidemic Sound's current Single-Track License terms, not a legal jurisdiction.
Context: Commercial Assurance evidence review of any commercial/advertising video workflow that incorporates a pre-existing licensed Epidemic Sound single-track music license

GOVERNANCE TREATMENT (2026-08-27, PM adoption decision, FGR #6): `provider_scope: ['epidemic-sound']` — same registry-gap note as the Envato claims above. Compound proposition (Private-tier restriction + Commercial-tier's narrower restriction + Commercial-tier Monetization right) found ACCEPTABLY COMPOUND by FGR_006 — splitting would leave the Private-tier restriction reading as applying regardless of tier, which is false and is the entire point the evidence establishes. Evidence independently re-verified twice: once during the original FGR-prep milestone (initial `pypdf` extraction after an automated-summarization failure), once during FGR_006 itself (fresh download + fresh extraction, tier-section boundaries confirmed directly by text search — the paid-media restriction occurs only within the Private Tier section, zero occurrences after the Commercial Tier section header). FGR disposition: ACCEPT (no wording change). **CRC-eligibility lean: DEFER TO CRC PUBLICATION REVIEW** (FGR_006 §4 — the tier-conditional compound shape needs bespoke bounded-copy drafting before plain CRC publication; this does not affect Adoption, which is a separate, prior decision).

Claim proposition: >
  Epidemic Sound's Single-Track Private Tier license excludes use in
  advertisements and other paid-media productions (including online
  pre/mid/post-roll placements); the separate Commercial Tier license
  does not carry this same exclusion (it excludes only "TV ads"/
  broadcast-type content specifically), and separately grants a right to
  monetize via third-party ads displayed on the subscriber's own
  published Productions.

Source references:
  - primary (Official platform authority, Class A, independently retrieved and directly extracted): Epidemic Sound, Single Track Licenses v8 (`epidemicsound.com/staticfiles/legacy/20/documents/SingleTrackLicensesV8.pdf`) — Private Tier verbatim: "No boosted or branded content, ads or third party exploitation. You may not use the Licensed Work(s) in advertisements or other commercial productions (including productions that are boosted or that are published within paid media space, such as, but not limited to, online pre/mid/post-rolls)..."; Commercial Tier verbatim: "No broadcast type content... feature films and TV shows or TV ads..."; Commercial Tier Monetization verbatim: "you may allow, and receive remuneration from, the display of third-party ads in connection with making available your Productions on social media or other platforms."
Source authority/type: Official platform authority (directly source-backed, single-provider)
Source fact: >
  Epidemic Sound's own Single Track Licenses v8 document contains two
  separate license-tier sections (Private, Commercial) with materially
  different advertising/paid-media rules — the paid-media exclusion is
  Private-tier-only; Commercial tier carries only a narrower TV/broadcast
  exclusion and a separate Monetization right. Independently confirmed
  via fresh document download and text extraction on two separate
  occasions (FGR-prep milestone; FGR_006 itself).

SI8 interpretation: >
  A reviewer should confirm which license tier (Private or Commercial)
  the subscriber actually holds before assessing whether a specific
  advertising/paid-media placement is covered — this claim states both
  tiers' rules, not which one applies to any specific account.

Applicability requirements: []
Unresolved project dependencies: [which_music_provider, epidemic_license_tier_confirmed]   <!-- both evidence-only: account/subscription facts, not registered in dependency-askability.ts. No DAR performed. -->
Prohibited conclusions: >
  Does not establish which tier the user's account actually holds. Does
  not establish whether a specific placement is a covered use under
  whichever tier applies. Is not a substitute for Commercial Assurance
  evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  PENDING — FGR_006 explicitly recommends DEFER TO CRC PUBLICATION REVIEW
  for this claim specifically (tier-conditional compound shape requires
  bespoke bounded-copy drafting before plain publication). Not yet
  reviewed.

CRC Candidate Statement: >
  [DRAFT -- pending CRC Publication Review; not yet approved for CRC use]
  Epidemic Sound's own license documents distinguish tiers by
  advertising/paid-media permission, with materially different rules
  between Private and Commercial tiers.

Effective date: 2026-08-27
Last reviewed: 2026-08-27
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING
CRC Decision Date: PENDING
Related: none

Full review artifact: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`

### CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1
Domain: Third-Party Source Assets / Music Licensing
Topic: third_party_source_rights
Subtopic: artlist-social-vs-pro-business-license-scope
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Artlist's current License, not a legal jurisdiction.
Context: Commercial Assurance evidence review of any commercial/client/brand video workflow that incorporates a pre-existing licensed Artlist music track

GOVERNANCE TREATMENT (2026-08-27, PM adoption decision, FGR #6): `provider_scope: ['artlist']` — same registry-gap note as above. Evidence: Class B (human-captured, full-document visual read), corroborated across both preserved Artlist sources (`evidence-captures/artlist/MANIFEST.md`). **Wording corrected 2026-08-27, before this Adoption, per the FGR_006 integration review**: the proposition previously ended "...permits broadcasting (subject to §D2 below for agency/broadcaster/large-company cases)" — "§D2" was never a valid heading anywhere in the source candidate package (the Enterprise-threshold content is section C's own A-7a, not section D). Corrected to a stable claim-ID cross-reference: "...permits broadcasting, subject to Artlist's separate Enterprise/Max Business plan requirement for agencies, broadcasters, and larger companies (see CLAIM-MUSIC-ARTLIST-ENTERPRISE-THRESHOLD-001-v1)." Does not merge this claim with CLAIM-MUSIC-ARTLIST-ENTERPRISE-THRESHOLD-001-v1 — both are separately governed, separately Adopted below. The correction did not change evidence, provider_scope, dependencies, or FGR disposition (ACCEPT, unchanged). Adopted below in its corrected form only.

Claim proposition: >
  Artlist's Social license is exclusively for personal content creators
  (hobbyists, vloggers, independent creators) and does not cover projects
  made for clients or brands, paid/promoted videos, or broadcast use; the
  Pro/Business license is for professional creators, covers client and
  brand work, paid/promoted videos, and commercials/advertisements, and
  permits broadcasting, subject to Artlist's separate Enterprise/Max
  Business plan requirement for agencies, broadcasters, and larger
  companies (see CLAIM-MUSIC-ARTLIST-ENTERPRISE-THRESHOLD-001-v1).

Source references:
  - primary (Official platform authority, Class B, human-captured full-document visual read, durably preserved): Artlist License page (`artlist.io/help-center/privacy-terms/artlist-license/`), captured `evidence-captures/artlist/artlist-formal-license_20260827T134509+0800_a18f3aa6.pdf`, SHA-256 `a18f3aa69e64557fe599d6900578e87f89861c8ddbaaa85c4333147bb9ef426b` — comparison-table and narrative sections.
  - primary (Official platform authority, Class B, human-captured, durably preserved): Artlist Help Center, "Understanding Artlist's license" (`help.artlist.io/hc/en-us/articles/29490991524253-...`), captured `evidence-captures/artlist/artlist-help-center-understanding-license_20260827T134526+0800_b4df3eaa.pdf`, SHA-256 `b4df3eaac6a1fca67f06932d4b621712c4eb2ed928f86c62aacc665487b4fa79` — "What does the Social license cover?"/"What does the Pro license cover?" sections. Corroborates Source 1.
Source authority/type: Official platform authority (two-source corroborated, single-provider)
Source fact: >
  Both Artlist sources independently state the same Social-vs-Pro/Business
  license-scope distinction: Social license restricted to personal,
  non-client, non-broadcast use; Pro/Business license covers client,
  brand, advertising, and broadcast use. Effective date 2026-02-15 stated
  on Source 1.

SI8 interpretation: >
  A reviewer should confirm which license type the subscriber actually
  holds before treating a client/brand/broadcast use as covered — this
  claim states Artlist's own two license shapes, not which one applies to
  any specific account, and does not itself resolve the separately
  governed Enterprise/Max Business threshold question (see the related
  claim).

Applicability requirements: []
Unresolved project dependencies: [which_music_provider, artlist_license_type_confirmed]   <!-- both evidence-only: account/license facts, not registered in dependency-askability.ts. No DAR performed. -->
Prohibited conclusions: >
  Does not establish which license type the user's account actually
  holds. Does not establish whether the user's specific entity type/size
  triggers the separately governed Enterprise/Max Business requirement.
  Is not a substitute for Commercial Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  PENDING — not yet reviewed for CRC Publication. FGR_006 recommends CRC
  eligibility (§9); separate CRC Publication Review required.

CRC Candidate Statement: >
  [DRAFT -- pending CRC Publication Review; not yet approved for CRC use]
  Artlist distinguishes a personal-only Social license from a Pro/Business
  license covering client, brand, and advertising use.

Effective date: 2026-02-15
Last reviewed: 2026-08-27
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING
CRC Decision Date: PENDING
Related: [[CLAIM-MUSIC-ARTLIST-ENTERPRISE-THRESHOLD-001-v1]] (Pro/Business broadcasting qualified by this separately governed threshold), [[CLAIM-MUSIC-ARTLIST-CLIENT-LICENSE-RETENTION-001-v1]], [[CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1]], [[CLAIM-MUSIC-ARTLIST-STANDALONE-EXPLOITATION-001-v1]], [[CLAIM-MUSIC-ARTLIST-AI-TRAINING-EXCLUSION-001-v1]], [[CLAIM-MUSIC-ARTLIST-PRO-ROYALTIES-001-v1]] (same provider, same license family, distinct facts)

Full review artifact: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`

### CLAIM-MUSIC-ARTLIST-CLIENT-LICENSE-RETENTION-001-v1
Domain: Third-Party Source Assets / Music Licensing
Topic: third_party_source_rights
Subtopic: artlist-client-project-license-retention
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Artlist's current License, not a legal jurisdiction.
Context: Commercial Assurance evidence review of an Artlist-scored Project delivered to a client under Artlist's Pro/Business license

GOVERNANCE TREATMENT (2026-08-27, PM adoption decision, FGR #6): `provider_scope: ['artlist']`, same registry-gap note. Evidence: Class B, single-source (formal License only — disclosed, not a defect; the Help Center source simply does not cover this specific point). FGR disposition: ACCEPT (no wording change).

Claim proposition: >
  Under Artlist's Pro/Business license, a Project incorporating a
  licensed Asset may be transferred to a client (or any other party) for
  their use, but the underlying Asset license is held by the subscriber
  only, not transferred to the client — the subscriber must ensure any
  client/collaborator complies with the license.

Source references:
  - primary (Official platform authority, Class B, human-captured, durably preserved): Artlist License page, `evidence-captures/artlist/artlist-formal-license_20260827T134509+0800_a18f3aa6.pdf`, SHA-256 `a18f3aa69e64557fe599d6900578e87f89861c8ddbaaa85c4333147bb9ef426b` — verbatim: "If you create a Project incorporating an Asset, you can transfer this Project to your clients and to anyone else, so they can use the Project (but the License is only yours)... if you collaborate with any third party in a Project or if you create a Project for your clients, you must make sure your collaborator and/or client complies with this License."
Source authority/type: Official platform authority (single-source, formal-License-only)
Source fact: >
  Artlist's formal License states that a Project may be transferred to a
  client while the underlying Asset license remains with the subscriber,
  and that the subscriber is responsible for their client/collaborator's
  compliance.

SI8 interpretation: >
  A reviewer delivering finished work to a client should note that the
  client does not thereby acquire an independent Artlist license — the
  subscriber (typically the agency/creator) remains the license holder
  and remains responsible for the client's compliant use.

Applicability requirements: []
Unresolved project dependencies: []
Prohibited conclusions: >
  Does not establish whether a specific client/collaborator is actually
  complying with the license. Is not a substitute for Commercial
  Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  PENDING — not yet reviewed for CRC Publication. FGR_006 recommends CRC
  eligibility (§9); separate CRC Publication Review required.

CRC Candidate Statement: >
  [DRAFT -- pending CRC Publication Review; not yet approved for CRC use]
  Under Artlist's Pro/Business license, delivering a finished Project to
  a client does not transfer the underlying music license to that client
  — the subscriber remains the license holder and remains responsible
  for the client's compliant use.

Effective date: 2026-02-15
Last reviewed: 2026-08-27
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING
CRC Decision Date: PENDING
Related: [[CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1]] (same provider, same license family, distinct fact)

Full review artifact: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`

### CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1
Domain: Third-Party Source Assets / Music Licensing
Topic: third_party_source_rights
Subtopic: artlist-post-cancellation-project-license-duration
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Artlist's current License, not a legal jurisdiction.
Context: Commercial Assurance evidence review of a commercial video workflow whose Artlist subscription has since lapsed or been cancelled

GOVERNANCE TREATMENT (2026-08-27, PM adoption decision, FGR #6): `provider_scope: ['artlist']`, same registry-gap note. Evidence: Class B, two-source corroborated — the strongest-evidenced Artlist claim in this domain. FGR disposition: ACCEPT (no wording change).

**CRC PUBLICATION APPROVED 2026-08-27** (later same session; PM: JD): `CPR_007` (`governance-reviews/CPR_007_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`) recommended WITHHOLD for all 10 Music Scenario A claims, but disposed A-3 specifically as "WITHHOLD — runtime prerequisite only... Substantively CONDITIONALLY READY, the strongest-evidenced candidate in the whole set" (§4) — the one real blocker being the established CPR-verification methodology's own dependency on a real runtime fixture entry, which did not yet exist for any Music claim (§3). That prerequisite was subsequently cleared in two further sessions: the Artlist A-3 Synthetic Runtime Canary (a throwaway, never-committed synthetic-eligible clone, following the CPR_001/CPR_003 precedent exactly, proved explicit-goal retrieval, Track A discovered relevance, stock-domain-bleed exclusion, evidence-only-dependency fail-closedness, and Bounded Interpretation/Projection containment all pass for A-3 under real, unmodified pipeline code), and the Artlist Provider Registration Canary Integration Review (independently re-proved, against the real committed fixture with zero Music entries, that Artlist's generic registration alone produces zero unintended claim reachability — registration and publication are empirically, not just architecturally, separate). **This approval applies to A-3 only** — the other 9 Music Scenario A claims (A1, A2, EP1, A-1, A-2, A-4, A-5, A-6, A-7a) are unaffected: still `Lifecycle: Adopted`, still `CRC Approver: PENDING`, still governed by CPR_007's own unmodified WITHHOLD disposition. `CPR_007` itself is left completely unedited by this approval, per this repository's own established convention — confirmed directly via `git log`, `FGR_007` (the stock-editorial provider-scope correction review) received zero commits after its own creation despite a full downstream human-approval-recording task; the actual decision is recorded here, in the governed claim entry itself, citing the review as basis rather than amending it.

Claim proposition: >
  A Project created and published while an Artlist subscription is
  active remains licensed (including for continued monetization)
  indefinitely, even after the subscription is cancelled; downloaded
  Assets may not be used in new projects once the subscription has
  expired.

Source references:
  - primary (Official platform authority, Class B, human-captured, durably preserved): Artlist License page, `evidence-captures/artlist/artlist-formal-license_20260827T134509+0800_a18f3aa6.pdf`, SHA-256 `a18f3aa69e64557fe599d6900578e87f89861c8ddbaaa85c4333147bb9ef426b` — verbatim: "You're covered to create and publish your Projects while your account is active. When your subscription expires, those Projects can remain published in any media, but any new projects will not be covered"; §2 heading: "Your Projects are yours to use Forever... For now and for all future time. Eternally."
  - primary (Official platform authority, Class B, human-captured, durably preserved): Artlist Help Center, `evidence-captures/artlist/artlist-help-center-understanding-license_20260827T134526+0800_b4df3eaa.pdf`, SHA-256 `b4df3eaac6a1fca67f06932d4b621712c4eb2ed928f86c62aacc665487b4fa79` — verbatim: "If a project is completed and published while your subscription is active, you maintain the right to use the assets in that published project even if you later cancel your subscription. Once your subscription expires, these assets cannot be used in new projects." Corroborates Source 1 independently.
Source authority/type: Official platform authority (two-source corroborated, single-provider)
Source fact: >
  Both Artlist sources independently and consistently state that
  already-published Projects remain licensed indefinitely after
  cancellation, while new projects are not covered post-cancellation.

SI8 interpretation: >
  A reviewer should confirm the specific project was actually completed
  and published while the Artlist subscription was active before relying
  on this continuity rule — this claim states Artlist's policy, not a
  determination for any specific project's timeline.

Applicability requirements: []
Unresolved project dependencies: [artlist_subscription_active_at_publication_confirmed]   <!-- evidence-only: account-history/documentary fact, not registered in dependency-askability.ts. No DAR performed. -->
Prohibited conclusions: >
  Does not establish that the user's specific project was actually
  completed and published while their Artlist subscription was active —
  that is a documentary, project-specific fact. Is not a substitute for
  Commercial Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-27, CRC Approver: JD (PM) -- see
  CRC Approver/CRC Decision Date below; basis: `governance-reviews/
  CPR_007_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md` §4's own A-3 disposition
  ("WITHHOLD -- runtime prerequisite only... Substantively CONDITIONALLY
  READY, the strongest-evidenced candidate in the whole set"), resolved by
  the subsequent Artlist A-3 Synthetic Runtime Canary and Artlist Provider
  Registration Canary Integration Review -- see the GOVERNANCE TREATMENT
  note above for the full evidence chain). CRC may state that Artlist's
  own stated policy is that a Project created and published while a
  subscription was active remains licensed indefinitely after
  cancellation (including for continued monetization), while new use of
  downloaded Assets after cancellation is not covered, and that this
  claim does not itself confirm whether the user's own specific project
  was actually completed and published while their subscription was
  active. CRC must not state that the user's own project IS validly
  licensed, that their subscription was active at the relevant time, or
  that their project is commercially cleared.

CRC Candidate Statement: >
  Artlist's stated policy is that already-completed, already-published
  work stays licensed after cancellation, while new use does not.

Effective date: 2026-02-15
Last reviewed: 2026-08-27
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-27
Related: [[CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1]] (same provider, same license family, distinct fact), [[CLAIM-MUSIC-ENVATO-CANCELLATION-001-v1]] (structurally analogous rule, different provider)

Full review artifact: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`
Full CRC Publication Review artifact: `governance-reviews/CPR_007_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md` (combined review of all 10 Music Scenario A claims; recommended WITHHOLD for all 10 as a package -- A-3's own disposition within it was "runtime prerequisite only," resolved as described above; CPR_007 itself is unmodified by this approval, its own top-level "PM decision: PENDING" line describes concurrence with the review's blanket 10-claim recommendation, not this claim-specific approval)

### CLAIM-MUSIC-ARTLIST-STANDALONE-EXPLOITATION-001-v1
Domain: Third-Party Source Assets / Music Licensing
Topic: third_party_source_rights
Subtopic: artlist-standalone-exploitation-restriction
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Artlist's current License, not a legal jurisdiction.
Context: Commercial Assurance evidence review of any workflow that might distribute or exploit an Artlist Asset separately from the Project it was licensed for

GOVERNANCE TREATMENT (2026-08-27, PM adoption decision, FGR #6): `provider_scope: ['artlist']`, same registry-gap note. Evidence: Class B, single-source, disclosed. Correctly kept separate from CLAIM-MUSIC-ARTLIST-AI-TRAINING-EXCLUSION-001-v1 (different restriction category — standalone distribution vs. AI-training/derivative-work input — sourced from the same source paragraph but evidencing two distinct rules). FGR disposition: ACCEPT (no wording change).

Claim proposition: >
  Artlist Assets may only be used as integrated elements within a
  broader Project, and may not be copied, distributed, sold, shared, or
  otherwise exploited as standalone content (e.g. the music track on its
  own).

Source references:
  - primary (Official platform authority, Class B, human-captured, durably preserved): Artlist License page, `evidence-captures/artlist/artlist-formal-license_20260827T134509+0800_a18f3aa6.pdf`, SHA-256 `a18f3aa69e64557fe599d6900578e87f89861c8ddbaaa85c4333147bb9ef426b` — verbatim: "Artlist Assets may only be used as integrated elements within broader Projects and may not be used, copied, distributed, performed, presented, sold, licensed, shared, or otherwise exploited as standalone content (such as music, footage, or images on their own)..."
Source authority/type: Official platform authority (single-source)
Source fact: >
  Artlist's formal License restricts Assets to integrated use within a
  Project and prohibits standalone exploitation.

SI8 interpretation: >
  A reviewer should confirm the licensed track is being used as part of
  an integrated Project, not distributed or exploited on its own — this
  claim states Artlist's own restriction, not a determination for any
  specific project's actual configuration.

Applicability requirements: []
Unresolved project dependencies: []
Prohibited conclusions: >
  Does not establish whether a specific user's specific output
  configuration constitutes "standalone" use under Artlist's own terms.
  Is not a substitute for Commercial Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  PENDING — not yet reviewed for CRC Publication. FGR_006 recommends CRC
  eligibility (§9); separate CRC Publication Review required.

CRC Candidate Statement: >
  [DRAFT -- pending CRC Publication Review; not yet approved for CRC use]
  Artlist Assets may only be used as part of an integrated Project, not
  distributed or exploited on their own.

Effective date: 2026-02-15
Last reviewed: 2026-08-27
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING
CRC Decision Date: PENDING
Related: [[CLAIM-MUSIC-ARTLIST-AI-TRAINING-EXCLUSION-001-v1]] (same source paragraph, distinct restriction category), [[CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1]] (same provider, same license family)

Full review artifact: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`

### CLAIM-MUSIC-ARTLIST-AI-TRAINING-EXCLUSION-001-v1
Domain: Third-Party Source Assets / Music Licensing
Topic: third_party_source_rights
Subtopic: artlist-ai-training-derivative-work-exclusion
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Artlist's current License, not a legal jurisdiction.
Context: Commercial Assurance evidence review of any AI-video workflow that might feed a licensed Artlist track into an AI tool as training/derivative-work input

GOVERNANCE TREATMENT (2026-08-27, PM adoption decision, FGR #6): `provider_scope: ['artlist']`, same registry-gap note. Evidence: Class B, single-source (same source paragraph as CLAIM-MUSIC-ARTLIST-STANDALONE-EXPLOITATION-001-v1, but a distinct restriction category — kept separate per FGR_006's own atomicity finding: different real-world trigger scenarios, and a meaningfully higher commercial-relevance profile for SI8's own AI-filmmaker client base specifically). Refresh class MEDIUM, flagged HIGHER-VOLATILITY than most Artlist claims ("AI-related terms are an active area providers are actively revising"). FGR disposition: ACCEPT (no wording change). **CRC-eligibility lean: DEFER TO CRC PUBLICATION REVIEW** (FGR_006 §4 — Publication Policy Principle 6, stability over novelty; Adoption is warranted now, plain publication is a separate, later question given the term's volatility).

Claim proposition: >
  Artlist Assets may not be used to create derivative works such as
  remixes or covers, or be included in datasets for machine learning, AI
  training, or the development/improvement of AI technologies.

Source references:
  - primary (Official platform authority, Class B, human-captured, durably preserved): Artlist License page, `evidence-captures/artlist/artlist-formal-license_20260827T134509+0800_a18f3aa6.pdf`, SHA-256 `a18f3aa69e64557fe599d6900578e87f89861c8ddbaaa85c4333147bb9ef426b` — same paragraph as the standalone-exploitation clause above, covering derivative-work/AI-training restrictions as a distinct sub-clause.
Source authority/type: Official platform authority (single-source)
Source fact: >
  Artlist's formal License restricts Assets from being used to create
  derivative works (remixes, covers) or from being included in
  machine-learning/AI-training datasets.
  Note: this claim is about using a licensed, pre-existing Artlist track
  as AI training/input material — it is not about Artlist's own AI
  generation tools, which are out of Scenario A's scope entirely.

SI8 interpretation: >
  A reviewer should treat any workflow step that feeds a licensed Artlist
  track into an AI model (training, fine-tuning, or derivative
  remix/cover generation) as a potential license violation under this
  clause, distinct from ordinary integrated-Project use.

Applicability requirements: []
Unresolved project dependencies: []
Prohibited conclusions: >
  Does not establish whether a specific user's specific AI workflow step
  constitutes "training" or "derivative work" under Artlist's own terms.
  Is not a substitute for Commercial Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  PENDING — FGR_006 explicitly recommends DEFER TO CRC PUBLICATION REVIEW
  for this claim specifically (AI-related term volatility). Not yet
  reviewed.

CRC Candidate Statement: >
  [DRAFT -- pending CRC Publication Review; not yet approved for CRC use]
  Artlist Assets may not be used to create derivative works or be
  included in AI-training datasets.

Effective date: 2026-02-15
Last reviewed: 2026-08-27
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING
CRC Decision Date: PENDING
Related: [[CLAIM-MUSIC-ARTLIST-STANDALONE-EXPLOITATION-001-v1]] (same source paragraph, distinct restriction category), [[CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1]] (same provider, same license family)

Full review artifact: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`

### CLAIM-MUSIC-ARTLIST-PRO-ROYALTIES-001-v1
Domain: Third-Party Source Assets / Music Licensing
Topic: third_party_source_rights
Subtopic: artlist-pro-royalty-non-coverage
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Artlist's current License, not a legal jurisdiction. (PRO/collecting-society mechanics themselves vary by country; this claim states only Artlist's own contractual position, not a specific PRO's substantive rule.)
Context: Commercial Assurance evidence review of any broadcast-bound or publicly-performed commercial video workflow incorporating a licensed Artlist track

GOVERNANCE TREATMENT (2026-08-27, PM adoption decision, FGR #6): `provider_scope: ['artlist']`, same registry-gap note. Evidence: Class B, single-source, independently re-verified via direct page re-render during FGR_006 itself (not merely re-read from the prior manifest). Unconditional on license tier (unlike CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1). FGR disposition: ACCEPT (no wording change). **CRC-eligibility lean: DEFER TO CRC PUBLICATION REVIEW** (FGR_006 §4 — technical enough that plain CRC publication risks either overclaiming "you will owe money" or dangerously underclaiming "this is Artlist's problem, not mine"; Reviewer/Commercial-Assurance-only is the safer default pending a future CPR).

Claim proposition: >
  Artlist's public-performance/broadcast permission does not itself
  cover payment of royalties to Performance Rights Organizations (PROs)
  or other collecting societies; if a Project is reproduced or used for
  broadcast/public performance, the subscriber (or their client) may
  receive requests for mechanical-reproduction and/or public-performance
  royalty payments, and is responsible for paying them (or ensuring the
  relevant broadcaster/platform does).

Source references:
  - primary (Official platform authority, Class B, human-captured, durably preserved, independently re-verified twice): Artlist License page, `evidence-captures/artlist/artlist-formal-license_20260827T134509+0800_a18f3aa6.pdf`, SHA-256 `a18f3aa69e64557fe599d6900578e87f89861c8ddbaaa85c4333147bb9ef426b` — verbatim: "However, it does not cover payment of royalties to performance rights organizations (PROs) and other collecting societies. Accordingly, if you or your client reproduces a Project, or uses a Project for broadcast or other public performance, you may receive requests for payment of mechanical reproduction and/or public performance royalties... In such cases, you are responsible for paying those amounts (or ensuring the relevant broadcaster or platform pays them) to the applicable organization."
Source authority/type: Official platform authority (single-source)
Source fact: >
  Artlist's formal License explicitly excludes PRO/collecting-society
  royalty payment from its broadcast/public-performance permission and
  allocates responsibility for such payments to the subscriber (or their
  client/broadcaster).

SI8 interpretation: >
  A reviewer assessing a broadcast-bound or publicly-performed project
  should flag potential PRO/collecting-society royalty exposure as a
  real, non-obvious cost the Artlist license itself does not cover —
  this claim states Artlist's contractual position, not whether any
  specific broadcast/performance actually triggers a real PRO claim.

Applicability requirements: []
Unresolved project dependencies: []
Prohibited conclusions: >
  Does not establish whether a specific broadcast/performance event
  actually triggers a real PRO claim, or which PRO/jurisdiction's
  collecting society would be involved. Is not a substitute for
  Commercial Assurance evidence review, and is not legal advice on PRO
  mechanics in any specific jurisdiction.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  PENDING — FGR_006 explicitly recommends DEFER TO CRC PUBLICATION REVIEW
  for this claim specifically (technical nuance risk). Not yet reviewed.

CRC Candidate Statement: >
  [DRAFT -- pending CRC Publication Review; not yet approved for CRC use]
  Artlist's broadcast/public-performance permission does not itself
  cover PRO/collecting-society royalties — the subscriber may still be
  responsible for those separately.

Effective date: 2026-02-15
Last reviewed: 2026-08-27
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING
CRC Decision Date: PENDING
Related: [[CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1]] (same provider, same license family)

Full review artifact: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`

### CLAIM-MUSIC-ARTLIST-ENTERPRISE-THRESHOLD-001-v1
Domain: Third-Party Source Assets / Music Licensing
Topic: third_party_source_rights
Subtopic: artlist-enterprise-max-business-plan-threshold
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed by Artlist's current License, not a legal jurisdiction.
Context: Commercial Assurance evidence review of any Artlist-licensed workflow where the licensee is (or may be) an agency, broadcaster, or larger company

GOVERNANCE TREATMENT (2026-08-27, PM adoption decision, FGR #6): `provider_scope: ['artlist']`, same registry-gap note. **NARROWED by FGR_006 (§4) from the original candidate package's own A-7, which bundled this threshold rule together with Artlist's seat/member mechanics (source §10).** FGR_006 split these into two distinct facts with different real-world trigger conditions and different commercial-readiness materiality — this claim retains only the threshold/coverage rule (source §11: does the licensee's entity type/size require a different plan to be validly licensed at all); the seat/member-mechanics half (how many people may share one account) was found lower-materiality to "is my use commercially licensed" and was **deliberately left DEFERRED, not drafted into any claim, and is NOT part of this Adoption**. Evidence independently re-verified twice: once during the original FGR-prep milestone, once during FGR_006 itself via a fresh page re-render and direct visual read of the committed evidence PDF (not merely re-read from the manifest). FGR disposition: ACCEPT WITH NARROWING.

Claim proposition: >
  Artlist requires a Max Business plan or a customized Enterprise
  Agreement if the licensee works for an agency, a broadcaster, or a
  company/legal entity (including an aggregated group of companies) with
  more than 50 employees; this requirement does not apply to
  subscription plans consisting solely of AI Services.

Source references:
  - primary (Official platform authority, Class B, human-captured, durably preserved, independently re-verified twice): Artlist License page, §11 ("Max Business Plan & Enterprise license"), `evidence-captures/artlist/artlist-formal-license_20260827T134509+0800_a18f3aa6.pdf`, SHA-256 `a18f3aa69e64557fe599d6900578e87f89861c8ddbaaa85c4333147bb9ef426b` — verbatim: "if you work for an agency, broadcaster, or for a company (or any other legal entity) that has more than 50 employees, you must have a Max Business plan to be covered by this License (or a customized Enterprise license). This also applies if your company is part of a group of companies that has more than 50 employees in total. This requirement does not apply to subscription plans consisting solely of AI Services."
Source authority/type: Official platform authority (single-source, specific quantified threshold)
Source fact: >
  Artlist's formal License states a specific, quantified entity-type/size
  threshold (agency, broadcaster, or >50-employee company/group) that
  requires a Max Business or Enterprise plan rather than a standard
  Pro/Business plan, with a carve-out for AI-Services-only subscriptions.

SI8 interpretation: >
  A reviewer should confirm the licensee's actual employer type and
  headcount before treating a standard Artlist Pro/Business plan as
  sufficient coverage — an agency, broadcaster, or larger company on the
  wrong plan tier risks having no valid Artlist license at all for
  commercial work. This claim does not resolve the seat/member-mechanics
  question (how many individuals may share one account), which was
  deliberately not drafted into a governed claim (see FGR_006 §4, A-7b).

Applicability requirements: []
Unresolved project dependencies: [artlist_licensee_employer_type_confirmed, artlist_licensee_employer_size_confirmed]   <!-- flagged by FGR_006 as a plausible future Dependency Askability Review candidate: unlike most other Music-domain dependencies (account/subscription-tier facts), a user's own employer type and headcount are facts a person can typically self-report reliably, structurally closer to human_contribution_description (the one live askable_in_crc entry) than to epidemic_license_tier_confirmed. This claim's Adoption does NOT perform that review or register anything in dependency-askability.ts -- both remain evidence-only under current fail-closed default (absent from the registry). DAR is a separate, later governance stage, chartered only after Adoption AND CRC eligibility both already exist, per DAR_001's own precedent. -->
Prohibited conclusions: >
  Does not establish the user's actual employer classification or size,
  or whether their actual plan matches what this threshold requires. Is
  not a substitute for Commercial Assurance evidence review.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-27
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  PENDING — not yet reviewed for CRC Publication. FGR_006 recommends CRC
  eligibility (§9) — single, plain, provider-level rule, passes the CRC
  Publication Policy's own Publication Test cleanly on FGR_006's own
  assessment — but this remains a directional recommendation only, not a
  Publication-stage decision; a separate CRC Publication Review is
  required.

CRC Candidate Statement: >
  [DRAFT -- pending CRC Publication Review; not yet approved for CRC use]
  Artlist's standard Pro/Business plans may not be sufficient for
  agencies, broadcasters, or larger companies, who may need a Max
  Business or Enterprise agreement instead.

Effective date: 2026-02-15
Last reviewed: 2026-08-27
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING
CRC Decision Date: PENDING
Related: [[CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1]] (Pro/Business broadcasting qualified by this threshold)

Formal Governance Review #6 (2026-08-27, combined package): ACCEPT WITH
NARROWING -- original candidate A-7 split into this narrowed threshold-only
claim (adopted) and undrafted seat/member-mechanics background (A-7b,
deferred, not adopted, not a claim). See full review for the split
reasoning.

Full review artifact: `governance-reviews/FGR_006_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md`

**Excluded from this Wave — not adopted, per FGR_006's own disposition, and not present anywhere above:** the undrafted Artlist seat/member-mechanics background (FGR_006's "A-7b" — DEFERRED, never assigned a claim ID, never drafted as a proposition) and `CLAIM-MUSIC-ACCESS-NOT-LICENSE-001-v1` (FGR_006's "G-1," the generic cross-provider "access ≠ specific licensed use" candidate — REJECTED by FGR_006 §5 as duplicative of boundary language every claim above already individually carries). Neither appears in this document and neither should be added without a new Formal Governance Review.

**Wave 4 claims below (2026-08-28) — the first claim in the Likeness domain, and the second genuinely non-provider-shaped Living Knowledge domain after Copyright & Human Authorship (Wave 1) — `provider_scope: null`, no AI-video or asset-provider concept anywhere in this claim.** `Lifecycle: Adopted` (Adoption Approver: JD (PM/CRC PM/Architecture), Adoption Decision Date: 2026-08-28, following `governance-reviews/FGR_008_CAND-LIKENESS-NY-CONSENT-REQUIREMENT-001_2026-08-28.md`'s recommendation, ADOPT WITH BOUNDED WORDING CORRECTION, and this task's own explicit human authorization to apply that correction and record Adoption), `Publication scope: Reviewer/Commercial Assurance`. Not CRC-eligible — `CRC Approver`/`CRC Decision Date` PENDING, same discipline as every prior wave; a separate CRC Publication Review is required, and per FGR_008 §13 this claim's own topic (`likeness`) is explicitly named in `CRC-PUBLICATION-POLICY.md` Principle 3 as a No-List-adjacent subject-matter gate — the future CPR must treat it as Principle-3-gated from the outset, not resolvable by ordinary narrow-before-withhold reasoning. Source candidate package: `LIKENESS-NY-SCENARIO-A-FGR-PACKAGE.md` (this folder). Runtime note, same shape as every prior wave's own: this claim has no `TOPIC_CLAIMS_FIXTURE` (`08_Platform/app/lib/retrieval-engine/topic-claims-fixture.ts`) representation — confirmed directly against current code as part of this Adoption recording, not assumed. This is Adoption as pure governance documentation, with zero runtime effect: this claim is governed Living Knowledge, immediately useful to a human reviewer, but structurally unreachable by CRC Retrieval until a separate, deliberately unperformed engineering task adds a fixture entry (which itself would still not make it CRC-eligible without a separate, later CRC Publication Review).

### CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1
Domain: Likeness / Right of Privacy (New York)
Topic: likeness
Subtopic: ny-consent-requirement-advertising-or-trade-use
Claim character: established
Jurisdiction: New York (state)
Context: a commercially intended AI-generated or AI-assisted video that depicts or uses the name, portrait, picture, likeness, or voice of a recognizable, living real person

GOVERNANCE TREATMENT (2026-08-28, PM adoption decision, FGR #8): `provider_scope: null` (explicit — general New York statutory knowledge, not attached to any AI-video or asset provider). **NARROWED by FGR_008 (§4) from the original candidate package's own proposition**, which additionally asserted that New York courts have construed "portrait, picture, likeness" to reach any recognizable likeness, not only an exact photograph or explicit name — a construction supported in the preparation package only by secondary commentary (Herrick, citing *Loftus v. Greenwich Lithographing Co.*, 192 A.D. 251 (1920)) whose own primary holding text was never independently obtained (`PRIMARY CASE EVIDENCE INCOMPLETE`, per `evidence-captures/ny-civil-rights-law/MANIFEST.md`). FGR_008 found the core consent/liability rule below fully, independently Class-A-supported without that sentence, and recommended narrowing rather than adopting unverified case-law characterization as though primary-verified — see `Related` below for where that removed content is preserved for a possible future sub-candidate. FGR disposition: ADOPT WITH BOUNDED WORDING CORRECTION.

Claim proposition: >
  Under New York Civil Rights Law §§ 50-51, using a living person's name,
  portrait, picture, likeness, or voice for advertising purposes or for the
  purposes of trade, within New York, without that person's prior written
  consent (or, if a minor, the consent of a parent or guardian), can expose
  the user to civil liability (an injunction, compensatory damages, and --
  if the use was knowing -- exemplary damages at the jury's discretion) and,
  under § 50 specifically, is a misdemeanor.

Source references:
  - primary (Class A, independently retrieved verbatim, direct `curl` fetch of the official page's own `nys-openleg-result-text` container, no model summarization): N.Y. Civil Rights Law § 50 (Right of privacy), `nysenate.gov/legislation/laws/CVR/50`, durably preserved at `evidence-captures/ny-civil-rights-law/ny-cvr-50_20260827T164320Z.html`, SHA-256 `587aac155cb46674b9891ab0b94b35a60662218331ccad64263f986bc8871a86`.
  - primary (Class A, same method; first fetch attempt returned an HTTP 403 Cloudflare challenge, retried successfully with a fuller browser User-Agent + Referer header): N.Y. Civil Rights Law § 51 (Action for injunction and for damages), `nysenate.gov/legislation/laws/CVR/51`, durably preserved at `evidence-captures/ny-civil-rights-law/ny-cvr-51_20260827T164320Z.html`, SHA-256 `3c8ce0d96da4d7f8eb06e45b849173e892b12134e6ac7288575ef0806562b14d`.
Source authority/type: Primary legal/official authority (state statute)
Source fact: >
  § 50: "A person, firm or corporation that uses for advertising purposes,
  or for the purposes of trade, the name, portrait, picture, likeness, or
  voice of any living person without having first obtained the written
  consent of such person, or if a minor of such minor's parent or
  guardian, is guilty of a misdemeanor." § 51 (operative clause): "Any
  person whose name, portrait, picture, likeness or voice is used within
  this state for advertising purposes or for the purposes of trade without
  the written consent first obtained as above provided may maintain an
  equitable action in the supreme court of this state against the person,
  firm or corporation so using such person's name, portrait, picture,
  likeness or voice, to prevent and restrain the use thereof; and may also
  sue and recover damages for any injuries sustained by reason of such use
  and if the defendant shall have knowingly used such person's name,
  portrait, picture, likeness or voice in such manner as is forbidden or
  declared to be unlawful by section fifty of this article, the jury, in
  its discretion, may award exemplary damages." § 51's five enumerated
  exceptions (downstream transfer to a lawful user; photography-
  establishment display; manufacturer/dealer name-with-goods; author/
  composer/artist name-with-work; sound-recording copyright licensing)
  were independently re-checked against this claim's own Context and found
  non-material / outside scope (FGR_008 §6) -- none is incorporated into
  this claim's own proposition.

SI8 interpretation: >
  A commercial AI video depicting a living person's name, portrait,
  picture, likeness, or voice should not be represented to a client,
  buyer, or platform as cleared for commercial/advertising use in New York
  absent confirmed written consent from that person -- this is a
  documentary fact CRC cannot establish from conversation alone (see
  Unresolved project dependencies below).

Applicability requirements:
  - fact: jurisdiction
    operator: equals
    value: New York
Unresolved project dependencies: [recognizable_likeness_or_voice_present, advertising_or_trade_use_confirmed, written_consent_confirmed]   <!-- recognizable_likeness_or_voice_present: whether the specific project's content actually uses the person's name/portrait/picture/likeness/voice at all -- not currently modeled anywhere in StructuredUnderstanding (confirmed across three prior architecture diagnostics); a candidate future Track A content-presence fact, plausibly askable in a future Dependency Askability Review (structurally comparable to human_contribution_description), not decided here. advertising_or_trade_use_confirmed: whether the specific use meets the statutory "advertising purposes or purposes of trade" gate -- deliberately NOT equated with the existing commercial_use/intended_use project facts (narrower, legally distinct concept, per FGR_008 §5); too interpretive for simple self-attestation without the separate, not-yet-adopted Candidate B (CAND-LIKENESS-NY-EXPRESSIVE-WORK-BOUNDARY-001, in LIKENESS-NY-SCENARIO-A-FGR-PACKAGE.md) existing first. written_consent_confirmed: evidence-only per established stock-governance precedent (release_status_confirmed/separate_authorization_obtained/rights_and_clearance_status) -- CRC must never treat a conversational assertion of permission as establishing this fact; no Likeness-specific self-attestation exception created (FGR_008 §11). -->
Prohibited conclusions: >
  Does not establish whether this specific project's depiction is legally
  "advertising purposes or purposes of trade" as opposed to an excluded
  use; whether the depicted person is actually recognizable as a matter of
  fact; whether consent was actually obtained or is sufficient; whether
  the project is commercially cleared. Is not a substitute for Commercial
  Assurance evidence review of the actual video content, its intended/
  distributed use, and any consent/release documentation.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-28
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  WITHHELD FROM CRC (2026-08-28, PM: JD -- see CRC Publication Review
  #8, CPR_008). Not for evidence quality (Class A statutory support,
  unchanged), not for dependency handling (already correctly hedged,
  matching published Stock-claim precedent), and not for runtime safety
  (independently proven safe under a Synthetic Eligibility Runtime
  Canary) -- withheld solely because CRC Publication Policy Principle 3's
  subject-matter gate applies to this claim's topic (likeness), "regardless
  of verification strength," and Principle 5's narrow-before-withhold
  default does not apply to Principle 3 concerns (per FGR_008 §13's own
  prior caution, which this CPR concurred with rather than resolved
  around). Not a permanent disposition -- future reconsideration remains
  possible, triggered only by Candidate B's own separate adoption, a
  deliberate PM-level Publication-Policy decision defining an acceptable
  bounded category of likeness-adjacent regulatory-awareness content, or
  an explicit future authorized human decision to reconsider this specific
  disposition -- never by a runtime/engineering change alone. See CPR_008
  for the complete publication-safety analysis.

CRC Candidate Statement: >
  [DRAFT -- pending CRC Publication Review; not yet approved for CRC use]
  New York has a specific statute (Civil Rights Law §§ 50-51) requiring a
  living person's prior written consent before their name, portrait,
  picture, likeness, or voice is used for advertising or trade purposes in
  the state, with civil and (for a knowing violation) even misdemeanor
  consequences.

Effective date: Not independently confirmed as a specific amendment date this session -- §§ 50-51's core operative text is long-settled (in force in materially this form for over a century per corroborating secondary commentary; see Refresh class below).
Last reviewed: 2026-08-28
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING
CRC Decision Date: PENDING
Related: none in this ledger. A related, not-yet-evidenced consideration (New York courts' construction of "portrait, picture, likeness" to reach a recognizable likeness generally, not only an exact photograph or explicit name) was deliberately removed from this claim's own proposition per FGR_008 §4/§17 and is preserved, not adopted, as a "Deferred sub-consideration" note under Candidate A in `LIKENESS-NY-SCENARIO-A-FGR-PACKAGE.md` -- promotable to its own sub-candidate only if a future task obtains *Loftus v. Greenwich Lithographing Co.*'s complete primary opinion text. A separate, not-yet-ready sibling candidate (`CAND-LIKENESS-NY-EXPRESSIVE-WORK-BOUNDARY-001`, the "advertising purposes or purposes of trade" scope-boundary proposition) remains in the same preparation package, `Lifecycle: Candidate`, `NOT READY FOR FGR` -- explicitly not reviewed, not adopted, not rejected by this Wave.

Formal Governance Review #8 (2026-08-28): ADOPT WITH BOUNDED WORDING
CORRECTION -- original candidate proposition's recognizability-construction
sentence removed (secondary-sourced only, primary case evidence
incomplete); core consent/liability rule retained unchanged, fully Class A
statutory support. `provider_scope` explicitly authored as `null` (was
implicit in the preparation package). CRC-eligibility explicitly deferred
with a Principle 3 caution for the future CPR, not resolved by this
Adoption. See full review for the complete element-by-element evidence
classification and the corrected CRC Publication Policy Principle 3
analysis.

Full review artifact: `governance-reviews/FGR_008_CAND-LIKENESS-NY-CONSENT-REQUIREMENT-001_2026-08-28.md`
Full CRC Publication Review artifact: `governance-reviews/CPR_008_CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1_2026-08-28.md`

**Excluded from this Wave — not adopted, and not present anywhere above:** `CAND-LIKENESS-NY-EXPRESSIVE-WORK-BOUNDARY-001` (the "advertising purposes or purposes of trade" scope-boundary candidate) — remains `Lifecycle: Candidate`, `NOT READY FOR FGR`, in `LIKENESS-NY-SCENARIO-A-FGR-PACKAGE.md` only, explicitly out of scope for this Wave's own reviewing task. Does not appear in this document and should not be added without its own separate Formal Governance Review.

---

**Wave 5 claim below (2026-08-30) — the first claim in the AI Video Generation Platform Rights domain, and the first `tool_scope`-narrowed claim in this document.** `Lifecycle: Adopted` (Adoption Approver: JD (PM), Adoption Decision Date: 2026-08-29 — matching the human FGR decision date recorded in `SYNTHESIA-SCENARIO-A-FGR-PACKAGE.md`'s own governance table and `governance-reviews/FGR_009_SYNTHESIA_SCENARIO_A_PACKAGE_2026-08-29.md`), `Publication scope: Reviewer/Commercial Assurance`. Not CRC-eligible — `CRC Approver`/`CRC Decision Date` PENDING, same discipline as every prior wave; a separate CRC Publication Review is required, and per `CRC-PUBLICATION-POLICY.md`'s tool-scoped legacy-coexistence practice that review must additionally check for relevant legacy `PLATFORM-RIGHTS-MATRIX.md` coverage of Synthesia before granting eligibility — none currently exists (confirmed directly as of this recording, not assumed). Source candidate package: `SYNTHESIA-SCENARIO-A-FGR-PACKAGE.md` (Candidate A). **Representation history:** the human ADOPT decision (PM: JD, 2026-08-29) preceded durable corpus representation by one day — `FGR_009`'s own second addendum found, immediately after that decision, that no `TopicClaim` field then existed to represent a tool-specific proposition (`ARCHITECTURE_BLOCKER`). That generic gap was closed by `tool_scope` (LK-7) and the canonical tool identity registry (LK-9/LK-10, `synthesia` registered 2026-08-29); a durable, machine-checkable candidate representation was committed and passed representation readiness cleanly (`08_Platform/app/lib/candidates/CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001.ts`); the transitional jurisdiction-compatibility rule immediately above (governance-discipline section) was recorded to reconcile this claim's platform-contractual jurisdiction representation with the strict `Global` definition. This entry records the human ADOPT decision durably in the authoritative corpus exactly as decided on 2026-08-29 — no new substantive governance decision is made by this recording.

### CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1
Domain: AI Video Generation Platform Rights — Synthesia
Topic: commercial_use
Subtopic: stock-avatar-paid-advertising-restriction
Claim character: established
Jurisdiction: Not a legal jurisdiction — this is a Synthesia platform contractual restriction, not a legal-jurisdiction-scoped rule. See "Transitional jurisdiction representation for provider/platform propositions" (governance-discipline section above); the underlying `TopicClaim` representation records `jurisdiction: 'Global'` as a bounded transitional compatibility value under that rule, never as a claim of worldwide legal validation.
Context: commercial AI-generated video produced with a Synthesia-provided Stock Avatar, intended for paid advertising or paid promotion.
Claim proposition: >
  Synthesia's Acceptable Use Policy prohibits incorporating a Stock Avatar in
  content for "promoted", "boosted", or "paid" advertising on any social media
  platform or similar media, and separately prohibits paid TV advertising and
  broadcasting on TV without permission, absent written express consent from
  Synthesia. Use of a Stock Avatar in content that does not constitute paid
  promotion (e.g. organic social posts, on-site training or product videos)
  is not restricted by this specific clause.

Source references:
  - primary: Synthesia Acceptable Use Policy, "Last Updated: February 23, 2024" — https://www.synthesia.io/legal/acceptable-use-policy
  - secondary/corroborating: Synthesia Help Center, "Synthesia Video Licensing" — https://help.synthesia.io/en/articles/6341928-synthesia-video-licensing
Source authority/type: Primary legal/official authority (Acceptable Use Policy); corroborated by Official platform authority (Help Center)
Source fact: >
  Acceptable Use Policy (verbatim, quote-verified against raw archived HTML —
  see evidence-captures/synthesia/MANIFEST.md): prohibits "Incorporating a
  Stock Avatar in content for 'promoted', 'boosted', or 'paid' advertising on
  any social media platform or similar media, absent written express consent
  from Synthesia." A separate enumerated list additionally prohibits paid TV
  ads and "Broadcasting TV (without permission)." Video Licensing Help Center
  article corroborates in checklist form: "❌ Paid TV ads", "❌ Use in paid
  Facebook/Instagram/YouTube/TikTok/Snapchat ads", "❌ Use in paid programmatic
  advertising", "❌ Use in any form of paid promotion", with the converse stated
  as "✅ Any use that does not include paid promo."

SI8 interpretation: >
  A client who intends to use a Synthesia Stock Avatar video in ANY paid
  advertising placement (social, TV, programmatic, or broadcast) needs either
  (a) written express consent from Synthesia specifically, or (b) a Custom
  Avatar instead (a separate, not-yet-adopted candidate proposition in the
  same source package). This is a materially different restriction shape from
  every other Matrix-governed AI video tool reviewed to date (Runway/Kling/
  Pika/Veo/Midjourney are not paid-promotion-gated; ElevenLabs is
  subscription-tier-gated, not use-type-gated) — this is SI8's own synthesis
  of what the restriction means for a commercial workflow, not itself sourced
  from Synthesia's own text.

Applicability requirements: []
Unresolved project dependencies: [synthesia_stock_avatar_used_confirmed, synthesia_written_consent_obtained]   <!-- CRC cannot structurally verify whether a project's Synthesia output actually uses a Stock (vs. Custom) Avatar, nor whether a client separately obtained Synthesia's own written consent for paid use -- both are evidence/documentary questions, not self-report-appropriate per Domain H/askability precedent -->
Tool scope: ['synthesia']       <!-- first tool-scoped entry in this document (LK-7/LK-9/LK-10); 'synthesia' registered 2026-08-29 in lib/tool-identity/registry.ts. No PLATFORM-RIGHTS-MATRIX.md coverage exists for Synthesia as of this recording -- confirmed directly -- so the LK-22 legacy-coexistence CPR practice will find no relevant Matrix proposition when that review occurs. -->
Prohibited conclusions: >
  Does not establish that a Custom Avatar is free of all restrictions in every
  respect (only that THIS specific paid-promotion clause does not apply to it
  — that is governed by a separate, not-yet-adopted candidate proposition).
  Does not establish whether a specific project's output actually used a
  Stock or Custom Avatar. Does not establish whether Synthesia has granted
  written consent for any specific paid-use case. Does not establish anything
  about a jurisdiction's own likeness/publicity/disclosure law — this is a
  platform contractual restriction only, not a legal clearance determination.
  Does not establish that non-paid use is free of every other restriction
  (e.g. a separate political/broadcast/sensitive-content restriction, also a
  distinct not-yet-adopted candidate proposition in the same source package,
  still applies regardless of paid status).

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-29
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-30, CRC Approver: JD (PM) -- see
  CRC Approver/CRC Decision Date below; CRC Publication Review #9 complete
  at governance-reviews/CPR_009_CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1
  _2026-08-30.md, initially recommending DEFER pending a targeted evidence
  refresh -- that refresh, recorded in governance-reviews/README.md's own
  2026-08-30 addendum, substantively confirmed the current Synthesia
  Acceptable Use Policy and Video Licensing Help Center evidence, resolving
  the freshness gap that caused the DEFER; see CPR_009's own updated
  wrapper metadata for the full, unedited decision sequence). CRC may state
  that Synthesia's Acceptable Use Policy restricts using a Stock Avatar in
  paid advertising or promotion -- including paid social ads, paid TV ads,
  and broadcast -- absent Synthesia's own written express consent, and that
  non-paid use (e.g. organic posts, internal/training videos) is not
  restricted by this specific clause. This is Synthesia's own provider/
  platform policy, not law. CRC must not state whether a specific project
  used a Stock or Custom Avatar, whether Synthesia has granted written
  consent for any specific case, or whether the restriction therefore
  applies to the user's own project. CRC must not represent the project as
  commercially or legally cleared, and must not treat either evidence-only
  dependency (synthesia_stock_avatar_used_confirmed,
  synthesia_written_consent_obtained) as a self-attestation question --
  both remain permanently unresolved through Bounded Interpretation's Case
  3B boundary, exactly as for every other dependency-bearing claim in this
  corpus. A human-reviewed Commercial Assurance Assessment remains the
  higher-assurance path for resolving either dependency for a specific
  project.

CRC Candidate Statement: >
  Synthesia's Acceptable Use Policy restricts using a Stock Avatar in paid
  advertising or promotion -- including paid social media ads, paid TV ads,
  and broadcast -- unless Synthesia has given written express consent; use
  that isn't paid promotion, such as organic posts or internal/training
  videos, isn't restricted by this specific clause.

Effective date: 2026-08-29 (benchmark capture date; underlying AUP itself dated 2024-02-23)
Last reviewed: 2026-08-30 (targeted evidence refresh, LK-37 -- see CRC Publication Scope above)
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-30
Related: —

Full Formal Governance Review artifact: `governance-reviews/FGR_009_SYNTHESIA_SCENARIO_A_PACKAGE_2026-08-29.md`
Candidate Representation: `08_Platform/app/lib/candidates/CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001.ts @ 681a97c4b34d8cc09f3f3bc150eb13bb1744a71f`

---

**Wave 6 claim below (2026-08-30, Trial 2 of the Living Knowledge onboarding benchmark, LK-42 protocol) — the first real `provider_scope`-narrowed claim onboarded since the original Stock domain build-out, and the first claim in this document sourced from human-verified primary-evidence findings (browser Print-to-PDF capture, automated fetch of `www.storyblocks.com` returned empty content; `help.storyblocks.com` corroboration remains available but is superseded here by direct primary-document review) rather than either automated fetch or an AI-mediated summary.** `Lifecycle: Adopted` (Adoption Approver: JD (PM), Adoption Decision Date: 2026-08-30 — see `governance-reviews/FGR_010_CAND-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001_2026-08-30.md` for the full multi-stage evidence chain and decision record), `Publication scope: Reviewer/Commercial Assurance`. Not CRC-eligible — `CRC Approver`/`CRC Decision Date` PENDING, same discipline as every prior wave; a separate CRC Publication Review is required.

### CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1
Domain: Third-Party Source Assets / Stock Media Licensing — Storyblocks
Topic: commercial_use
Subtopic: business-license-broadcast-television-ott-scope
Claim character: established
Jurisdiction: Not a legal jurisdiction — this is a Storyblocks platform contractual license-scope restriction, not a legal-jurisdiction-scoped rule. See "Transitional jurisdiction representation for provider/platform propositions" (governance-discipline section above); the underlying `TopicClaim` representation records `jurisdiction: 'Global'` as a bounded transitional compatibility value under that rule, never as a claim of worldwide legal validation.
Context: commercial use of Storyblocks-provided Stock Files (footage/audio/images) incorporated into a production intended for broadcast, television, or OTT distribution.
Claim proposition: >
  Storyblocks' Individual and Small Business License Agreements state that
  their licenses do not include the right to use Stock Files in Broadcast,
  Television, or OTT platforms unless that right is explicitly set forth in
  the subscription plan selected. Storyblocks' licensing materials identify
  its Business License as covering broadcast, TV, streaming/OTT, and
  feature-film distribution.

Source references:
  - primary: Storyblocks Individual License Agreement, human-verified "Last updated: June 18, 2026" — https://www.storyblocks.com/license/individual-license
  - primary: Storyblocks Small Business License Agreement, human-verified "Last updated: October 20, 2025" — https://www.storyblocks.com/license/small-business-license
  - secondary/corroborating: Storyblocks License Comparison page — https://www.storyblocks.com/business-solutions/license-comparison
  - secondary/corroborating: Storyblocks Help Center, "What is covered under the Business License?" and "What is the difference between the Individual and Business License?" (Official platform authority, Last-Updated 2026-03-09)
Source authority/type: Primary legal/official authority (Individual and Small Business License Agreements, human-verified by direct review of preserved captures); corroborated by Strong secondary authority (License Comparison) and Official platform authority (Help Center)
Source fact: >
  Human-verified primary-evidence findings (LK-49, against preserved, hashed
  capture artifacts — see evidence-captures/storyblocks/MANIFEST.md): the
  Individual License Agreement's own §1.2 states, in substance, that the
  license does not include the right to use Stock Files in Broadcast,
  Television, or OTT platforms unless explicitly set forth in the selected
  subscription plan; the Small Business License Agreement's own §1.2 states
  materially the same condition. The License Comparison capture corroborates,
  distinguishing Individual/Small Business/Business scope, with Business
  materials identifying broadcast/TV/streaming-OTT/feature-film distribution.
  This environment's own PDF tooling could not independently extract or
  render the captured documents (zero embedded text layer; no OCR/page-render
  capability available) — these findings are human-verified, not
  CLI-extracted, and are recorded as such rather than silently upgraded.

SI8 interpretation: >
  A client incorporating Storyblocks-provided Stock Files into a project
  intended for broadcast, television, or OTT distribution should confirm
  whether their specific Storyblocks subscription plan explicitly includes
  that scope, rather than assuming any Storyblocks subscription covers it.
  This does not establish that every non-Business Storyblocks subscription
  categorically prohibits broadcast/OTT use -- the Agreements' own language
  conditions the exclusion on what the "selected subscription plan" itself
  provides, not on tier name alone. This does not establish that holding a
  Business License clears any specific project for broadcast use -- it
  states what Storyblocks' own license materials say, not whether they were
  satisfied for any particular asset or project.

Applicability requirements: []
Unresolved project dependencies: [storyblocks_license_tier_confirmed]   <!-- CRC cannot structurally verify which Storyblocks license tier a user holds, or whether their specific selected plan includes an explicit broadcast/TV/OTT grant beyond the tier default -- an evidence/documentary question, not self-report-appropriate, per the established Stock-domain DAR_001 precedent for provider-plan-shaped dependencies. -->
Prohibited conclusions: >
  Does not establish that a specific project's Storyblocks-sourced assets are
  actually broadcast/TV/OTT-cleared. Does not establish that every
  non-Business Storyblocks subscription prohibits broadcast/OTT use in every
  case -- the exclusion is plan-contingent, not tier-name-absolute. Does not
  establish that holding a Business License by itself clears a project for
  broadcast use. Does not establish anything about a jurisdiction's own
  broadcast/media law -- this is a platform contractual license-scope
  restriction only, not a legal clearance determination. Does not establish
  that the same Storyblocks Agreement provisions govern Editorial content,
  AI/machine-learning use, releases, or any other Storyblocks license term --
  those remain separate, not-yet-reviewed propositions.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-30
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-30, CRC Approver: JD (PM) -- see
  CRC Publication Review #10, CPR_010, governance-reviews/CPR_010_CLAIM-
  STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1_2026-08-30.md). CRC may
  state that Storyblocks' Individual and Small Business License Agreements
  (captured 2026-08-30; Individual Agreement Last updated June 18, 2026,
  Small Business Agreement Last updated October 20, 2025) exclude the right
  to use Stock Files in Broadcast, Television, or OTT platforms unless that
  use is explicitly included in the user's selected subscription plan, and
  that Storyblocks' own licensing materials identify the Business License
  as covering broadcast, TV, streaming/OTT, and feature-film distribution.
  This is Storyblocks' own provider/platform licensing policy, not law. CRC
  must not state that every non-Business Storyblocks subscription
  categorically prohibits Broadcast/Television/OTT use -- the exclusion is
  plan-contingent, not tier-name-absolute. CRC must not state which
  specific Storyblocks license or plan a user actually holds, must not
  state whether a specific project's Storyblocks-sourced assets are
  actually broadcast/OTT-cleared, must not state that holding a Business
  License by itself commercially clears a project, and must not state or
  imply that all rights, releases, or authorizations necessary for the
  project have been obtained or that the project is otherwise commercially
  cleared. The evidence-only dependency (storyblocks_license_tier_confirmed)
  remains permanently unresolved through Bounded Interpretation's Case 3B
  boundary, exactly as for every other dependency-bearing claim in this
  corpus. A human-reviewed Commercial Assurance Assessment remains the
  higher-assurance path for resolving a specific project's own Storyblocks
  license status.

CRC Candidate Statement: >
  Storyblocks' Individual and Small Business License Agreements state that
  their license does not include the right to use Stock Files in
  Broadcast, Television, or OTT platforms unless that use is explicitly
  included in the subscription plan you selected. Storyblocks' own
  licensing materials identify the Business License specifically as
  covering broadcast, TV, streaming/OTT, and feature-film distribution.

Effective date: 2026-08-30 (evidence capture/review date; underlying Agreements dated 2026-06-18 (Individual) and 2025-10-20 (Small Business) per their own visible "Last updated" text)
Last reviewed: 2026-08-30 (CRC Publication Review #10, CPR_010)
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-30
Related: —

Full Formal Governance Review artifact: `governance-reviews/FGR_010_CAND-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001_2026-08-30.md`
Full CRC Publication Review artifact: `governance-reviews/CPR_010_CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1_2026-08-30.md`
Candidate Representation: `08_Platform/app/lib/candidates/CAND-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001.ts @ efee49ded250488b9819ae31ae4c4b8234ad9ae2`

### CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1
Domain: Third-Party Source Assets / Stock Media Licensing — Pond5
Topic: third_party_source_rights
Subtopic: editorial-content-commercial-use-restriction-written-consent-exception
Claim character: established
Jurisdiction: Not a legal jurisdiction — this is a Pond5 platform contractual license restriction, not a legal-jurisdiction-scoped rule. See "Transitional jurisdiction representation for provider/platform propositions" (governance-discipline section above); the underlying `TopicClaim` representation records `jurisdiction: 'Global'` as a bounded transitional compatibility value under that rule, never as a claim of worldwide legal validation.
Context: commercial use of Pond5-provided Editorial Content (footage/audio/images) incorporated into a production intended for a commercial context (advertising, promotion, endorsement, advertorial, merchandise, or other commercial Production).
Claim proposition: >
  Pond5 Content identified on its Item Page as Editorial, or for editorial
  use only, is intended for use only in connection with events or topics
  that are newsworthy or of general public interest. Absent Pond5's
  express and specific written consent, Pond5's Content License Agreement
  restricts this Editorial Content from use in merchandise, advertisement
  (other than in-context advertising of a Production in which the
  Editorial Content has been incorporated), endorsement, promotion,
  advertorial, or other commercial Production.

Source references:
  - primary (Primary legal/official authority, Class B human-verified rendered-page reading): Pond5 Content License Agreement, Section 7 "Editorial Content", visible revision "2024-01-03" — evidence-captures/pond5/content-license-agreement_20260830T203900+0800_efcac90e.pdf
  - secondary\corroborating (Official platform authority): Pond5 Help Center, "What are the licensing options on Pond5, and how do Individual, Business, and Premium licenses differ?", visible date March 19, 2026 — evidence-captures/pond5/license-options-individual-business-premium_20260830T203900+0800_ca7121b6.pdf
  - secondary\corroborating (first-party current product page): Pond5 Editorial page, captured 2026-08-30 — evidence-captures/pond5/editorial-page_20260830T203900+0800_d2217e81.pdf (corroborating context only — describes a route to contact Pond5 about clearing editorial clips for commercial use; not part of this proposition, per human FGR REVISE decision — see FGR_011)
Source authority\type: Primary legal/official authority (Content License Agreement Section 7, human-verified by direct review of preserved rendered captures); corroborated by Official platform authority (Help Center) and first-party current product material (Editorial page)
Source fact: >
  Human-verified source facts (LK-59, against preserved, hashed capture
  artifacts — see evidence-captures/pond5/MANIFEST.md): the Content
  License Agreement's own Section 7 states, in substance, that Editorial
  Content is intended only for use connected with newsworthy or
  general-public-interest events/topics, and that absent Pond5's express
  and specific written consent, such content may not be used in
  merchandise, advertisement (other than in-context), endorsement,
  promotion, advertorial, or other commercial Production. Section 7 also
  contains a separate disclaimer of responsibility for clearances/
  warranties related to personally identifiable information and
  privacy/publicity rights associated with persons appearing in the
  Content -- disclosed as evidence-limitation context below, not folded
  into this proposition. This environment's own PDF tooling could not
  independently extract or render the captured documents (zero embedded
  text layer; no OCR/page-render/metadata-extraction capability
  available) -- these findings are human-verified, not CLI-extracted, and
  are recorded as such rather than silently upgraded.

SI8 interpretation: >
  A client incorporating Pond5-provided Content into a project intended
  for a commercial context (advertising, promotion, endorsement,
  advertorial, merchandise, or other commercial Production) should
  confirm whether the specific item is Item-Page-designated Editorial,
  and if so, whether Pond5 granted express and specific written consent
  for that use, rather than assuming any Pond5-sourced Editorial content
  is commercially usable by default.
  This does not establish that a specific project's Pond5 Editorial
  assets are actually cleared for the restricted commercial uses -- it
  states what Pond5's own License Agreement says, not whether its
  conditions were satisfied for any particular asset or project. This
  does not establish that Editorial Content can never receive commercial
  authorization -- the exclusion is contingent on Pond5's own consent,
  not absolute. This does not establish that Pond5 disclaims all
  responsibility generally -- the disclosed clearance/PII disclaimer in
  Section 7 is a separate, narrower point from the commercial-use
  restriction itself.

Applicability requirements: []
Unresolved project dependencies: [editorial_designation_confirmed, separate_authorization_obtained]   <!-- CRC cannot structurally verify whether a specific Pond5 asset is Item-Page-designated Editorial, or whether Pond5 granted express and specific written consent for an otherwise-restricted commercial use -- evidence/documentary questions, not self-report-appropriate, reusing the same generic dependency identifiers already governing the structurally identical Getty/iStock/Shutterstock Editorial claims (DAR_001 precedent), not newly minted for Pond5. -->
Prohibited conclusions: >
  Does not establish that a specific project's Pond5 Content is
  Item-Page-designated Editorial. Does not establish that Pond5 granted
  express and specific written consent for any specific project. Does not
  establish that Editorial Content can never receive commercial
  authorization -- the exclusion is contingent, not absolute. Does not
  establish that contacting Pond5 constitutes authorization, that
  authorization will be granted, or that any particular asset is
  eligible. Does not establish that model/property/privacy/publicity
  releases or clearances exist for any specific asset. Does not establish
  anything about a jurisdiction's own broadcast/media/advertising law --
  this is a platform contractual license restriction only, not a legal
  clearance determination. Does not establish that the same Agreement
  provisions govern the Digital License, Individual/Business/Premium
  tier differences, indemnification, or any other Pond5 license term --
  those remain separate, not-yet-reviewed propositions.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-30
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-30, CRC Approver: JD (PM) -- see
  CRC Publication Review #11, CPR_011, governance-reviews/CPR_011_CLAIM-
  POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1_2026-08-30.md). CRC may
  state that Pond5's Content License Agreement identifies content Pond5
  marks Editorial as intended for newsworthy or general-public-interest
  use, and that -- absent Pond5's own express and specific written
  consent -- that Agreement restricts Editorial Content from use in
  merchandise, advertisement (other than in-context advertising of a
  Production in which it has been incorporated), endorsement, promotion,
  advertorial, or other commercial Production. This is Pond5's own
  provider/platform licensing policy, not law. CRC must not state whether
  the user's own specific Pond5 asset is Item-Page-designated Editorial,
  must not state whether Pond5 granted express and specific written
  consent for any specific case, must not state that every
  Editorial-designated Pond5 asset is permanently barred from commercial
  use (the exclusion is contingent on Pond5's own consent, not absolute),
  must not treat a user's statement that they contacted Pond5 as evidence
  that authorization was obtained, and must not state or imply that all
  rights, releases, or authorizations necessary for the project have been
  obtained or that the project is otherwise commercially cleared. The
  evidence-only dependencies (editorial_designation_confirmed,
  separate_authorization_obtained) remain permanently unresolved through
  Bounded Interpretation's Case 3B boundary, exactly as for every other
  dependency-bearing claim in this corpus. A human-reviewed Commercial
  Assurance Assessment remains the higher-assurance path for resolving a
  specific project's own Pond5 Editorial-content status.

CRC Candidate Statement: >
  Pond5's Content License Agreement states that content Pond5 identifies
  as Editorial is intended for newsworthy or general-public-interest use,
  and -- absent Pond5's express and specific written consent -- restricts
  that content from use in merchandise, advertising, endorsements,
  promotions, advertorials, or other commercial productions.

Effective date: 2026-08-30 (evidence capture/review date; underlying Agreement's own visible revision date: 2024-01-03 -- not silently rewritten as 2026, per LK-59's own explicit instruction)
Last reviewed: 2026-08-30 (CRC Publication Review #11, CPR_011)
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-30
Related: —

Full Formal Governance Review artifact: `governance-reviews/FGR_011_CAND-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001_2026-08-30.md`
Full CRC Publication Review artifact: `governance-reviews/CPR_011_CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1_2026-08-30.md`
Candidate Representation: `08_Platform/app/lib/candidates/CAND-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001.ts @ 8b8eef8c6401f8f84b4951db73927b59489a0ae7`

### CLAIM-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001-v1
Domain: AI Generation Feature / Platform Product Representation — Adobe Stock AI Studio
Topic: commercial_use
Subtopic: ai-studio-commercially-safe-label-vs-partner-model-caveat
Claim character: established
Jurisdiction: Not a legal jurisdiction — this is Adobe's own platform/product representation, not a legal-jurisdiction-scoped rule. See "Transitional jurisdiction representation for provider/platform propositions" (governance-discipline section above); the underlying `TopicClaim` representation records `jurisdiction: 'Global'` as a bounded transitional compatibility value under that rule, never as a claim of worldwide legal validation.
Context: a production incorporating content generated or edited using Adobe Stock's AI Studio feature, where the commercial usability of that generated output may depend on which underlying AI model (Adobe's own Firefly, or a third-party partner model) was used for the generation.
Claim proposition: >
  Adobe's official AI Studio help material states that content labeled
  "Commercially safe" in AI Studio is created using Adobe's generative AI
  Firefly model, trained on content Adobe has permission or rights to
  use, and that this content may be used in commercial projects. For
  content generated using a partner (third-party, non-Adobe) AI model in
  AI Studio, Adobe directs users to review that specific model's own
  terms of service before commercial use, and states that Adobe cannot
  verify the training data used to build a partner model or whether that
  model's output may contain third-party intellectual property.

Source references:
  - primary/affirmative (Official platform help material, Class B human copy/paste capture, directly read in full): "AI Studio：了解點數和商業用途" ("AI Studio: Learn about credits and commercial use"), helpx.adobe.com, 上次更新時間 2026年7月21日 (last updated July 21, 2026), Traditional Chinese (繁體中文) locale — capture supplied verbatim by PM directly in the LK-72 task prompt (not filed as a separate evidence-captures/ artifact; see evidence-limitation note below).
  - boundary/evidence-limitation only, NOT affirmative support for this claim (Tier 1, Official legal/contractual authority, Class A human-supplied original PDF, directly read in full): Adobe Stock Product Specific Terms, "Last updated January 16, 2026. Replaces all prior versions." Footer: Stock-Additional-Terms_en_US_20260116. Supplied 2026-08-31.
Source authority\type: Official platform help material (Tier 2, primary/affirmative support); Official legal/contractual authority (Tier 1, boundary/evidence-limitation only — does not support any clause of this claim directly)
Source fact: >
  Directly-read source facts (LK-72): the Tier 2 help page states, in
  substance, that content labeled "Commercially safe" in AI Studio is
  created using Adobe's Firefly model, trained on content Adobe has
  permission or rights to use, that this content may be used in
  commercial projects, and that Adobe provides an unspecified degree of
  IP-related assurance for such content -- this last representation is
  DELIBERATELY EXCLUDED from the governed proposition above (see
  "Revision" note below). The same page states that for partner
  (third-party) AI models used within AI Studio, Adobe directs reviewing
  that model's own terms before commercial use and states it cannot
  verify the partner model's training data or whether its output may
  contain third-party IP. The literal phrase "Commercially safe" does not
  appear anywhere in the directly-read Tier 1 Adobe Stock Product Specific
  Terms; that document instead separately defines "Indemnified Firefly
  Output" (§1.10: Output generated via Eligible Firefly Features + an
  Export Event, explicitly EXCLUDING pre-existing Stock Assets labeled
  "Generated with AI" or similar) with its own materially conditioned
  (§10.2, 8 exclusions), capped (§10.3, US$10,000 per Output) contractual
  indemnification regime (§10). No sentence in either directly-read source
  establishes that "Commercially safe" is legally equivalent to
  "Indemnified Firefly Output." Three documents incorporated by reference
  at Tier 1 §9.6/§1.8 (Firefly Product Description, Adobe Generative AI
  Product Specific Terms, Adobe Generative AI User Guidelines) have NOT
  been read and may bear on that unresolved equivalence question.
Revision: >
  The original Candidate draft (LK-72) included a clause stating "Adobe
  provides intellectual-property indemnification protection for such
  content," directly following the Tier 2 page's own "Adobe 對生成內容提供智慧財產權賠償保障"
  language. Human FGR REVISE decision (LK-73) removed this clause in
  full: carrying the Tier 2 phrase risked implying the Tier 1 contractual
  indemnification regime (§10) without evidence establishing that link.
  The contractual indemnification question is preserved as a SEPARATE,
  UNRESOLVED, NOT-YET-RESEARCHED future claim family -- see "Related"
  below -- and is NOT part of this claim's proposition.

SI8 interpretation: >
  A client incorporating content generated or edited via Adobe Stock's AI
  Studio into a commercial production may find it relevant that Adobe's
  own help material distinguishes content generated with Adobe's own
  Firefly model (described by Adobe as "Commercially safe," trained on
  Adobe-permissioned content, usable in commercial projects) from content
  generated with a partner/third-party AI model within the same feature
  (for which Adobe directs reviewing that model's own terms and states it
  cannot verify the model's training data or third-party IP content).
  This is Adobe's own attributed product representation, not an
  independent legal or contractual conclusion. It does not establish
  which AI model was used for any specific project's generation, does not
  establish that a "Commercially safe" label was actually displayed for
  any specific asset, and does not establish the precise legal scope,
  conditions, or limits of any indemnification Adobe may separately
  provide under its own Tier 1 contractual terms (a distinct, unresolved
  question).

Applicability requirements: []
Unresolved project dependencies: []   <!-- Deliberately empty, reassessed from zero at LK-73 and rationale corrected at LK-74 human FGR: the proposition presents the Adobe/Firefly and partner-model branches CONDITIONALLY and does not select either branch for the user's project, so Bounded Interpretation does not require a project-specific dependency merely to retrieve and attributively communicate it. Persistence/re-checkability of the "Commercially safe" label remains genuinely unestablished by the evidence, but this is an evidence observation only, not the architectural reason no dependency exists -- see the Candidate file's own DEPENDENCY NECESSITY comment for the full rationale, including the generic principle "dependency necessity follows Bounded Interpretation requirements, not merely evidence availability." -->
Prohibited conclusions: >
  Does not establish that any specific project's Adobe Stock / AI Studio
  output is commercially cleared, non-infringing, or legally safe to use.
  Does not establish that Adobe guarantees commercial safety in an
  unconditional or uncapped sense. Does not establish that "Commercially
  safe" is equivalent to, or triggers, the separate Tier 1 "Indemnified
  Firefly Output" contractual indemnification regime, its conditions, or
  its US$10,000 liability cap. Does not establish which AI model (Adobe
  Firefly or a partner model) was used for any specific project's
  generation. Does not establish that a "Commercially safe" designation
  was actually displayed or applies to any specific asset. Does not
  establish that reviewing a partner model's own terms itself grants or
  confirms commercial permission. Does not establish ownership, release
  status, or rights-and-clearance status for any specific asset. Does not
  establish anything about a jurisdiction's own broadcast/media/
  advertising law -- this is a platform product representation only, not
  a legal clearance determination. Does not establish suitability for
  every commercial use. Does not establish the contents of the three
  incorporated-but-unread documents (Firefly Product Description, Adobe
  Generative AI Product Specific Terms, Adobe Generative AI User
  Guidelines).

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-31
Publication scope: Reviewer/Commercial Assurance
CRC Publication Scope: >
  APPROVED FOR CRC PUBLICATION (2026-08-31, CRC Approver: JD (PM) -- see CRC
  Publication Review #12, CPR_012, governance-reviews/CPR_012_CLAIM-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001-v1_2026-08-31.md).
  CRC may state that Adobe's official AI Studio help material describes
  content labeled "Commercially safe" as generated with Adobe's own Firefly
  model, trained on content Adobe has permission or rights to use, and says
  this content may be used in commercial projects, and that for content
  generated using a partner (non-Adobe) AI model, Adobe says it cannot
  verify the training data or whether the output may contain third-party
  intellectual property, directing users to review that model's own terms
  before commercial use. This is Adobe's own product/help representation,
  not a legal or contractual conclusion. CRC must not state that
  "Commercially safe" is equivalent to, or triggers, Adobe's separate Tier
  1 "Indemnified Firefly Output" contractual indemnification regime or its
  conditions/liability cap, must not state which AI model was used for any
  specific project's generation, must not state that a "Commercially safe"
  designation was actually displayed or applies to any specific asset, must
  not state that reviewing a partner model's own terms itself grants or
  confirms commercial permission, and must not state or imply that all
  rights, releases, or authorizations necessary for the project have been
  obtained or that the project is otherwise commercially cleared. A
  human-reviewed Commercial Assurance Assessment remains the
  higher-assurance path for resolving a specific project's own Adobe Stock
  AI Studio model/label status.
CRC Candidate Statement: >
  Adobe's official AI Studio help material describes content labeled
  "Commercially safe" as generated with Adobe's own Firefly model, trained
  on content Adobe has permission or rights to use, and says this content
  may be used in commercial projects. For content generated using a
  partner (non-Adobe) AI model, Adobe says it cannot verify the training
  data or whether the output may contain third-party intellectual
  property, and directs users to review that model's own terms before
  commercial use.

Effective date: 2026-08-31 (evidence capture/review date; Source B's own visible revision date: 2026-07-21; Source A's own visible revision date: 2026-01-16 -- not silently rewritten as 2026-08-31, per the Pond5 precedent's own explicit instruction not to overwrite an underlying source's own visible date)
Last reviewed: 2026-08-31 (CRC Publication Review #12, CPR_012)
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-31
Related: A separate, unresolved, not-yet-researched future claim family may concern Adobe's Tier 1 contractual definition and conditional indemnification of "Indemnified Firefly Output" (§1.10 + §10). That family is not part of this claim, not required for this claim's Adoption or CRC publication, and not authorized for CRC by this entry.

Full Formal Governance Review artifact: `governance-reviews/FGR_012_CAND-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001_2026-08-31.md`
Full CRC Publication Review artifact: `governance-reviews/CPR_012_CLAIM-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001-v1_2026-08-31.md`
Candidate Representation: `08_Platform/app/lib/candidates/CAND-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001.ts` (UNCOMMITTED as of this record — Trial 4 (LK-70 through LK-75) has deliberately kept all governance artifacts as prospective, uncommitted local work throughout, unlike Trial 2/3's per-step commit-and-push discipline; no commit hash exists to cite here. Flagged explicitly rather than fabricated — see LK-74/LK-75 Final Reports.)
