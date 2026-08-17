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
Unresolved project dependencies: []   <!-- free-form identifiers (snake_case, one per distinct missing concept, e.g. human_creative_contribution_level) naming project-specific facts CRC does not currently model that this claim's real-world application depends on, even after all Applicability requirements above are met. Informational governance metadata only -- never evaluated against any fact, never gates whether this claim reaches CRC. Empty list is the default: means this claim is fully resolvable once its formal Applicability requirements are met. Non-empty triggers relevant_applicability_unresolved (Case 3B) instead of directly_relevant once this claim is Adopted + CRC-eligible -- see lib/bounded-interpretation/types.ts. -->
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
Unresolved project dependencies: [human_creative_contribution_level]
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
  NOT APPROVED FOR CRC PUBLICATION -- Adopted 2026-08-16 as reviewer/internal
  knowledge only; CRC eligibility is a separate, not-yet-made decision (see
  CRC Approver/CRC Decision Date below). Text below is the scoping language
  CRC MAY be authorized to state if/when CRC eligibility is separately
  approved, preserved unchanged from the pre-adoption draft per governance
  instruction not to reinterpret or rewrite substantive claim text when
  changing lifecycle/publication status: CRC may state that, under current
  U.S. law, AI-generated video with no meaningful human creative contribution
  generally does not qualify for copyright protection, and that this is a
  distinct question from whether the video is safe to use commercially (see
  CLAIM-COPY-004). CRC must not state whether the user's own specific video
  qualifies.

CRC Candidate Statement: >
  NOT APPROVED FOR CRC PUBLICATION -- same status as CRC Publication Scope
  above; text preserved unchanged, not yet authorized for CRC output: Under
  current U.S. copyright law, AI-generated video without meaningful human
  creative contribution generally isn't eligible for copyright protection.
  This is a different question from whether you're clear to use the video
  commercially.

Effective date: 2026-08-16
Last reviewed: 2026-08-16
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING -- not yet approved
CRC Decision Date: PENDING
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
Unresolved project dependencies: [human_creative_contribution_level]
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
  NOT APPROVED FOR CRC PUBLICATION -- Adopted 2026-08-16 as reviewer/internal
  knowledge only; CRC eligibility is a separate, not-yet-made decision (see
  CRC Approver/CRC Decision Date below). Text below is the scoping language
  CRC MAY be authorized to state if/when CRC eligibility is separately
  approved, preserved unchanged from the pre-adoption draft per governance
  instruction not to reinterpret or rewrite substantive claim text when
  changing lifecycle/publication status: CRC may state that, under current
  U.S. law, writing prompts alone -- even detailed or iterative ones --
  generally does not establish sufficient human authorship for copyright
  purposes. CRC must not state a conclusion about whether the user's own
  workflow, specifically, meets or fails this bar.

CRC Candidate Statement: >
  NOT APPROVED FOR CRC PUBLICATION -- same status as CRC Publication Scope
  above; text preserved unchanged, not yet authorized for CRC output: Under
  current U.S. copyright law, writing prompts alone -- even detailed or
  iterative ones -- generally doesn't establish sufficient human authorship
  on its own. Additional human creative involvement, such as selecting,
  arranging, or editing the output, is generally what supports a copyright
  claim.

Effective date: 2026-08-16
Last reviewed: 2026-08-16
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING -- not yet approved
CRC Decision Date: PENDING
Related: [[POS-001]], [[EC-001]], [[CLAIM-COPY-001-v1]], [[CLAIM-COPY-003-v1]]

Phase 1 CRC-publication governance review (2026-08-17): PASS / GO AS-IS.
CRC Eligible deliberately KEPT Pending for the same product-completeness
reason as CLAIM-COPY-001-v1 above -- see that claim's own Phase 1 note and
`PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27 (deferred "Project-Fact-
Aware Bounded Composition" capability). Not a safety/adequacy finding.

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
Unresolved project dependencies: [human_creative_contribution_level]
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
  NOT APPROVED FOR CRC PUBLICATION -- Adopted 2026-08-16 as reviewer/internal
  knowledge only; CRC eligibility is a separate, not-yet-made decision (see
  CRC Approver/CRC Decision Date below). Text below is the scoping language
  CRC MAY be authorized to state if/when CRC eligibility is separately
  approved, preserved unchanged from the pre-adoption draft per governance
  instruction not to reinterpret or rewrite substantive claim text when
  changing lifecycle/publication status: CRC may state that, under current
  U.S. law, human selection, arrangement, or creative editing of AI-generated
  material can independently support a copyright claim even when the
  underlying AI-generated elements do not, while being explicit that this is
  evaluated case by case and CRC cannot determine whether it applies to the
  user's own project.

CRC Candidate Statement: >
  NOT APPROVED FOR CRC PUBLICATION -- same status as CRC Publication Scope
  above; text preserved unchanged, not yet authorized for CRC output: Under
  current U.S. copyright law, meaningfully selecting, arranging, or editing
  AI-generated material can support a copyright claim on its own, separate
  from whether the underlying AI-generated footage itself is protected.
  Whether this applies to a specific project is evaluated case by case.

Effective date: 2026-08-16
Last reviewed: 2026-08-16
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver: PENDING -- not yet approved
CRC Decision Date: PENDING
Related: [[CLAIM-COPY-001-v1]], [[CLAIM-COPY-002-v1]]

Phase 1 CRC-publication governance review (2026-08-17): PASS / GO AS-IS,
same product-completeness deferral as CLAIM-COPY-001-v1/CLAIM-COPY-002-v1
above -- see `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27. Closest
individual call of the three copyrightability claims reviewed in Phase 1:
this claim's own affirmative framing ("selecting, arranging, or editing...
can support a copyright claim") currently renders identically whether the
user described substantial creative editing or only trivial/technical
editing (e.g. resolution/format conversion), since CRC does not yet
evaluate `human_creative_contribution_level` against what the user actually
described. Never produces a false or determinative statement in any tested
scenario (the "meaningfully"/"case by case" qualifiers and the standard
unresolved-applicability hedge hold in every case) -- flagged for PM
awareness, not treated as a governance blocker.

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
