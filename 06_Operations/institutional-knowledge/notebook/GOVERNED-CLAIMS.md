# Governed Claims

**Status: ACTIVE — Phase 1 skeleton, 2026-08-16.** Canonical home for atomic, non-tool-scoped governed knowledge, per SI8 Living Knowledge Expansion PRD v0.2 and the repo-grounded technical design (`08_Platform/implementation/LK_PHASE1_TECHNICAL_DESIGN.md`, `LK_PHASE1_TECHNICAL_DESIGN_v2.md`).

**This document does not replace or change the purpose of:**
- `PLATFORM-RIGHTS-MATRIX.md` — tool-scoped commercial-use claims stay there, unchanged.
- `SI8-POSITIONS.md` — settled institutional stances stay there, unchanged.
- `EDGE-CASES.md` / `PENDING-QUESTIONS.md` — unchanged.

**Its role is specifically:** governed knowledge that applies regardless of which AI tool was used — Wave 1 is U.S. Copyright & Human Authorship. A claim here has no Matrix row to attach to.

## How to read a claim

Mirrors the CRC Claims sub-table convention already used in `PLATFORM-RIGHTS-MATRIX.md`, extended with the fields non-tool-scoped knowledge needs (jurisdiction, applicability, lifecycle, version lineage). See `LK_PHASE1_TECHNICAL_DESIGN.md` §5 for the full field-by-field rationale.

**Governance discipline (non-negotiable, per PM approval 2026-08-16):**
- Existing repo research (`01_Business/research/`, `06_Operations/legal/rights-playbook/research/`) is **candidate source material only** — never automatically governed knowledge, regardless of how many documents repeat a claim or how many LLMs agreed on it.
- `Lifecycle: Adopted` requires independent primary-source re-verification, not reuse of an unverified repo citation.
- `Publication scope: CRC eligible` is a **separate decision** from Adoption — an Adopted claim may remain reviewer/internal-only indefinitely.
- No claim may reference an `Applicability requirements` fact type outside the Phase 1 implemented set (`jurisdiction`, `tool_plan_tier`) — see `08_Platform/app/lib/retrieval-engine/types.ts`'s `APPLICABILITY_FACTS` for the enforced list. Referencing a reserved/future fact type would author a claim that can never become applicable, silently.
- `CRC Approver` must always be a real, named human. No automated "legal reviewer" role exists or is permitted.
- `Adoption Approver` (added 2026-08-16, first formal adoption decision) — the human governance approver of `Lifecycle: Adopted` itself, distinct from `CRC Approver` (which governs CRC-eligible publication specifically). Same discipline: always a real, named human, never automated. A claim can be `Adopted` with `Adoption Approver` recorded while `CRC Approver` remains `PENDING` indefinitely — this is the expected, intentional state for reviewer/internal-only knowledge, not a gap.
- **`Jurisdiction: Global`** (governance meaning fixed 2026-08-17, PM approval, following CLAIM-COPY-004's comparative-law hardening pass — see `01_Business/research/COPY-004-SOURCE-HARDENING-RESEARCH-2026.md` Part 2): means the claim states a **jurisdiction-neutral structural relationship between legal concepts** — pressure-tested across materially different legal systems (the COPY-004 pass checked United States, United Kingdom, European Union, Taiwan, and Japan) — not that its detailed substantive rule has been verified in every jurisdiction worldwide. A claim stating a specific substantive legal outcome (e.g. a copyrightability determination, an ownership rule) must be jurisdiction-scoped (as CLAIM-COPY-001/002/003 already are, to `United States (federal)`), never labeled `Global`, no matter how confident the drafter is that the outcome likely generalizes.
- **Every Formal Governance Review must be preserved as a durable, verbatim repository artifact** (process rule established 2026-08-17, governance-artifact-preservation milestone, following the discovery that Formal Governance Reviews #1–#5 existed only in session/conversation output, not as files) — before or as part of the subsequent PM governance-recording step that adopts (or declines) the reviewed candidate. The full review artifact, archived under `06_Operations/institutional-knowledge/notebook/governance-reviews/` (see that folder's own `README.md` for naming convention and verbatim discipline), is the decision-analysis record — clause-by-clause accuracy, source-tier assessment, atomicity/boundary tests, the complete reasoning a PASS/HOLD/REJECT recommendation rested on. This document remains the canonical current-state ledger and may contain only a condensed review summary (as every claim entry below already does) plus a reference to the full review artifact — it must never be the only place a review's full reasoning survives.
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

Lifecycle: Adopted
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

CRC Candidate Statement: >
  A stock-media provider's standard license for content marked "Editorial"
  generally covers descriptive, newsworthy, or public-interest use -- not
  advertising, promotional, endorsement, or merchandising use. Some
  providers offer a separate process to authorize commercial use of
  Editorial content for a specific asset, though this doesn't confirm
  whether that was obtained for yours.

Effective date: 2026-08-17
Last reviewed: 2026-08-17
Version lineage: v1 (initial) — supersedes: none — superseded by: none
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

### CLAIM-STOCK-EDITORIAL-002-v1
Domain: Third-Party Source Assets / Stock Media Licensing
Topic: third_party_source_rights
Subtopic: editorial-designation-release-relatedness
Claim character: established
Jurisdiction: Not a legal jurisdiction — governed collectively by each cited provider's current Terms of Service/License Agreement (Getty Images, iStock, Shutterstock — the three providers this claim's evidence confirms; not independently confirmed for Adobe Stock), not a single contract or legal jurisdiction.
Context: Commercial Assurance evidence review of any AI-generated commercial video workflow that incorporates third-party stock-media source assets designated "Editorial"

GOVERNANCE TREATMENT (2026-08-17, PM adoption decision, following Formal Governance Review #2; updated 2026-08-18 following M1/M2/M3 implementation; updated again 2026-08-18 following CRC-publication approval): same runtime-representation gap as CLAIM-STOCK-EDITORIAL-001-v1 at adoption time, now closed the same way and together with it (M1 GoalCategory + M2 AssetProviderMention + M3 provider-scoped retrieval). This claim now has a real runtime entry — `topic: 'third_party_source_rights'`, `provider_scope: null` (generic). **Following a Formal CRC-Publication Review (2026-08-18, recommendation B — PASS/GO WITH BOUNDED CRC COPY ADJUSTMENT; full review archived at `governance-reviews/CPR_002_CLAIM-STOCK-EDITORIAL-002-v1_2026-08-18.md`), a bounded correction to the derived `CRC Publication Scope`/`CRC Candidate Statement` text (restoring the provider-evidence caveat already present in this claim's own Claim proposition, but previously dropped from the shorter CRC-facing statement), and PM approval, this claim is now `CRC Eligible: Yes` below** — the second Third-Party Source Assets claim, and the third claim overall (after `CLAIM-COPY-004-v1` and `CLAIM-STOCK-EDITORIAL-001-v1`), to reach CRC. The Claim proposition itself (above) is unchanged, byte-identical to the adopted draft. `Publication scope: Reviewer/Commercial Assurance` is UNCHANGED — Publication scope and CRC Eligibility remain independent governance dimensions, per the CLAIM-COPY-004/CLAIM-STOCK-EDITORIAL-001-v1 precedent.

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

Lifecycle: Adopted
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

CRC Candidate Statement: >
  Content that Getty, iStock, or Shutterstock mark "Editorial" is typically
  supplied without the model or property releases that would otherwise
  support broader commercial use -- a separate question from whether the
  applicable license itself permits your intended use. This hasn't been
  independently confirmed for every stock-media provider, including Adobe
  Stock.

Effective date: 2026-08-17
Last reviewed: 2026-08-17
Version lineage: v1 (initial) — supersedes: none — superseded by: none
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
