Title: Formal Governance Review #24 — Taiwan Trademark Act, Article 68 Items 1–3 (Registered-Mark Infringement)

Reviewed object:
- `CAND-TRADEMARK-TW-ART68-INFRINGEMENT-001` — first Taiwan Trademark Living Knowledge candidate. Arises from a prior pre-FGR governance resolution (not re-litigated here except where independently re-tested) and a subsequent primary evidence capture milestone (`evidence-captures/taiwan-trademark/MANIFEST.md`, two local unpushed commits `0657bac`/`5344309`). This review treats both prior milestones' conclusions as engineering evidence and hypothesis only, and independently re-derives every governance decision from the captured primary evidence and current production source — including overturning one pre-FGR finding (zero dependencies) on independent re-derivation.

Review date: 2026-09-23

Artifact type: Formal Governance Review (adoption stage) — the second Taiwan-jurisdiction FGR in this corpus (after `FGR_023`, Taiwan Copyright), and the second Trademark-domain FGR (after `FGR_021`, U.S. Lanham Act). Reviews the candidate on its own primary evidence and on independent re-derivation of proposition scope, dependency, applicability, and architecture questions.

--- BEGIN VERBATIM FORMAL GOVERNANCE REVIEW ---

# Taiwan Trademark Act, Article 68 Items 1–3 — Formal Governance Review

## 1. Authoritative source fidelity

Independently re-verified against the actual captured HTML files, not accepted on the manifest's own say-so: read `moj-trademark-act-current_20260923T073620Z_fc7518e5.html`, `moj-trademark-act-oldlaw-arts68-70-95-97_20260923T073622Z_57f094ba.html`, and `moj-trademark-act-history_20260923T073623Z_efe93aab.html` directly. Confirmed the manifest's quoted Traditional Chinese text for Art. 2, Art. 5, Art. 35, Art. 36, Art. 68 (both old-law and current-promulgated), Art. 70, and the effective-status banner / history entries 16–17 is present verbatim in the raw HTML as quoted. No instance of the manifest paraphrasing the statute more strongly than its actual wording was found.

**Disposition: PASS.**

## 2. Current/effective-law finding — independently re-confirmed

Re-derived directly from the primary sources, not merely cited: the text **actually in force today** for Art. 68 is the **pre-2022-amendment (old-law) text** — chapeau "未經商標權人同意，為行銷目的而有下列情形之一，為侵害商標權" — because the 2022-05-04 promulgated amendment to Arts. 68/70/95–97 has **no Executive Yuan effective-date order** (history entry 16 has none; contrast entry 17, which does). The May 2024 Executive Yuan order (院臺經字第1131006860號, effective 2024-05-01) applies to the **separate** 2023-05-24 amendment's own article list (Arts. 6, 12, 13, 19, 30, 36, 75, 94, 99, 104, 106, 107, 98-1, 109-1) — Art. 68 does not appear in that list. This governance review therefore anchors the candidate proposition to the **currently-effective old-law text**, not the promulgated-but-not-yet-effective 2022 text. Items 1–3 themselves are byte-identical across both versions (Finding I) — only the chapeau's marketing-purpose qualifier placement and the (not-yet-effective) labels/tags/packaging second paragraph differ.

**Disposition: PASS — currently-effective old-law text is the controlling anchor.**

## 3. Article 68 items 1–3 — reviewed independently, not flattened

Read each item's exact conditions directly from both captured texts (byte-identical across old-law and current-promulgated):

- **Item 1** — "於同一商品或服務，使用相同於註冊商標之商標者" (use of a mark identical to the registered mark, on identical goods/services) — **carries no confusion clause of any kind**. This is a strict, identity-based rule: no "有致相關消費者混淆誤認之虞" language appears anywhere in item 1's own text. Confirmed by direct textual comparison against items 2 and 3, both of which do carry that clause.
- **Item 2** — "於類似之商品或服務，使用相同於註冊商標之商標，有致相關消費者混淆誤認之虞者" (identical mark, similar goods/services, **plus** a likelihood-of-confusion requirement).
- **Item 3** — "於同一或類似之商品或服務，使用近似於註冊商標之商標，有致相關消費者混淆誤認之虞者" (similar mark, identical-or-similar goods/services, **plus** a likelihood-of-confusion requirement).

**This review rejects any single-sentence "confusion rule applies uniformly" formulation.** Item 1 is materially, structurally different from items 2–3: it is a strict identity/identity test with no confusion element, while items 2–3 both require an additional likelihood-of-confusion finding. The governed proposition (§9 below) preserves this distinction explicitly, mirroring the statute's own three-item structure rather than compressing it.

**Disposition: PASS — material differences among items 1–3 preserved, not flattened.**

## 4. Trademark-use condition

Independently re-read Art. 5 and the currently-effective Art. 68 chapeau together. Art. 5 defines "use of a trademark" as, **for a marketing purpose** ("為行銷之目的"), one of four enumerated acts, done in a way sufficient for relevant consumers to recognize it as a trademark. The currently-effective Art. 68 chapeau independently carries its own marketing-purpose qualifier ("為行銷目的而") governing items 1–3 directly — confirmed by Finding I: this qualifier is present in the old-law (effective) chapeau and is **removed from items 1–3's governing chapeau** in the not-yet-effective 2022 text (relocated to qualify only the new labels/tags/packaging paragraph instead). Because this review anchors to the currently-effective text (§2), the marketing-purpose condition is a real, currently-operative element of items 1–3, not merely inferred from Art. 5 by analogy.

**The proposition must not imply visible-mark = trademark-use = infringement.** The narrowest accurate formulation states items 1–3 apply only where the mark is used for a marketing purpose (consistent with Art. 5's own definition and the currently-effective Art. 68 chapeau), not merely where a mark happens to appear on screen or in frame.

**Disposition: PASS — marketing-purpose condition preserved as a real, currently-effective element, not an inferred analogy.**

## 5. Registration scope

Art. 2 establishes that trademark rights are acquired only through registration ("應依本法申請註冊"). Art. 35/Art. 68 both presuppose a "registered trademark" (註冊商標) as their subject. **Decision: registration scope constrains the proposition's own wording (items 1–3 apply to a mark that has been registered under Taiwan law) rather than becoming a runtime project dependency.** This candidate does not, and must not, ask or assume that any specific mark depicted in a project is in fact registered, valid, or owned by any specific party — that is exactly the kind of project-specific finding this candidate is structurally barred from making (§17). The proposition states the legal predicate conditionally ("for a registered trademark"), never as an assertion about the user's own project.

**Disposition: PASS — registration scope encoded in proposition wording only; no project-specific registration-status dependency or finding.**

## 6. Article 36 limitations/exceptions

Read Art. 36's four items plus its own exhaustion clause directly. **Decision: the proposition states that limitations/exceptions exist and identifies their general categories** (good-faith nominative/descriptive use; referential fair use subject to its own internal confusion carve-back; functional necessity; prior good-faith use; exhaustion of rights) **without resolving whether any category applies to a specific project.** This mirrors the sibling `CLAIM-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001-v1` claim's own treatment of 17 U.S.C. §§107–122 ("subject to statutory limitations and exceptions," named as a category, not adjudicated). No dependency is created for Art. 36 — an exception's applicability is not a fact CRC could either self-attest or usefully hedge on a per-project basis without itself performing the legal analysis Art. 36 requires; it is recorded as a boundary/limitation only, consistent with instruction not to add a dependency "merely because an exception might matter."

**Disposition: PASS — Art. 36 categories named as a boundary; no project-specific exception determination; no dependency created.**

## 7. Article 70 boundary

Confirmed directly from the captured Art. 70 text: it protects only **well-known** (著名) registered marks against **dilution** (blurring/tarnishment of distinctiveness or reputation), and requires the actor's **actual knowledge** ("明知") of the mark's fame — an element wholly absent from Art. 68 items 1–3, which apply to any registered mark (famous or not) and carry no knowledge requirement. Art. 70 is also itself subject to the same pending, not-yet-effective 2022 amendment as Art. 68 (history entry 16 covers both together) — its own currently-effective text was not separately extracted or compared in this review, consistent with the evidence manifest's own boundary-only scope. **Art. 70 is confirmed structurally separate and is not merged into this candidate.** A future well-known-mark/dilution candidate is recorded as future scope only, not developed here.

**Disposition: PASS — Art. 70 confirmed materially separate; recorded as future scope only.**

## 8. Fair Trade Act / other regimes

No Fair Trade Act provision (e.g., Art. 22 unfair competition, Art. 30 registration-refusal grounds), criminal liability provision, or remedies provision was investigated or incorporated. Nothing in the captured evidence indicates that any of these regimes is necessary to state items 1–3's own civil infringement-defining conditions accurately — Art. 68 items 1–3 are self-contained statutory infringement definitions that do not depend on Fair Trade Act coverage, criminal-liability elements, or remedy provisions to be correctly stated. These are recorded as explicitly excluded future scope, not incorporated by omission.

**Disposition: PASS — no other regime required for accuracy; excluded regimes recorded explicitly.**

## 9. Draft atomic proposition

**Proposed governed proposition (draft, not yet PM-approved wording):**

"Under Taiwan Trademark Act Article 2 (trademark rights are acquired through registration) and Article 68 as currently in force (the pre-2022-amendment text; a 2022 amendment to Article 68 has been promulgated but its effective date has not yet been fixed by the Executive Yuan — see Evidence Limitations), using, without the trademark owner's consent and for a marketing purpose, a mark identical or similar to another party's registered trademark can create civil trademark-infringement liability under any of the following, which are not equivalent to one another: (1) using a mark identical to the registered mark on identical goods or services is infringement, with no separate likelihood-of-confusion requirement stated in the statute; (2) using a mark identical to the registered mark on similar goods or services is infringement where there is a likelihood of causing relevant consumers to be confused or mistaken; and (3) using a mark similar to the registered mark on identical or similar goods or services is infringement where there is a likelihood of causing relevant consumers to be confused or mistaken. These acts are subject to statutory limitations and exceptions under Article 36 (including good-faith nominative/descriptive use, referential fair use, functional necessity, prior good-faith use, and exhaustion of rights), and are a structurally separate legal question from Article 70's own well-known-mark dilution provisions, which require the actor's actual knowledge of the mark's fame and are not addressed here."

This wording: preserves registered-mark scope as a conditional predicate (§5); preserves the trademark-use/marketing-purpose requirement (§4); preserves item 1's distinct non-confusion structure against items 2–3's shared confusion requirement (§3); names Art. 36's exception categories without resolving them (§6); excludes Art. 70 explicitly (§7); contains no U.S.-specific "affiliation," "sponsorship," or "approval" language (Taiwan's own statute uses only "混淆誤認之虞" — likelihood of confusion/mistake — with no affiliation/sponsorship/approval concept anywhere in items 1–3 or their supporting Art. 35 structure).

**Disposition: PASS — draft proposition accurate to captured primary evidence, no overreach, no improperly imported U.S. doctrine.**

## 10. Dependency challenge — independent re-derivation, correcting the pre-FGR zero-dependency finding

The pre-FGR findings this milestone was handed asserted **zero dependencies**. This review independently re-challenges that premise rather than inheriting it, per this candidate's own instructions and per this corpus's own recent precedent (`FGR_023` §5 similarly corrected a mistaken zero-dependency premise in its own originating brief for the sibling Taiwan Copyright candidate).

Re-confirmed directly against current source (`build-bounded-interpretation.ts` lines 78–80, 111–113; independently re-read, not cited from a prior report): `hasGovernedProjectDependencies(match) = match.unresolved_project_dependencies.length > 0` is a **pure, static array-length check**. No code path anywhere in `build-bounded-interpretation.ts` or `assemble-result.ts` clears an entry from `unresolved_project_dependencies` based on `ProjectFacts` state at runtime — confirmed identical to this corpus's own prior independent findings for the U.S. Lanham dependency (`CPR_027`) and the Taiwan Copyright dependency (`FGR_023` §5): **non-empty `unresolved_project_dependencies` is a permanent, claim-level classification, never a per-session resolvable state**, for any dependency in this corpus.

Given this, the real question is not "will this ever resolve" (it never will, for any claim) but whether representing each of the following as an unresolved dependency is an **honest, evidence-grounded characterization** of what items 1–3 actually require to apply to a specific project, versus an unjustified addition:

- **Mark identity/similarity** — whether the specific mark at issue is, as a matter of fact, identical or similar to a specific registered mark. This is a Type C, evidence-only, legal/factual characterization — never a raw self-attestable fact, structurally identical in kind to the sibling `CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1`'s own `confusion_as_to_affiliation_or_sponsorship` dependency. All three items require this comparison in some form (identical/identical for item 1; identical mark/similar goods for item 2; similar mark/identical-or-similar goods for item 3).
- **Goods/services identity/similarity** — the same kind of comparison, applied to goods/services rather than marks. Bundled with mark identity/similarity into one dependency string below, mirroring the U.S. Lanham precedent's own choice to collapse a statute's own multi-part disjunctive test into one dependency string reflecting the statute's actual structure, rather than fragmenting arbitrarily.
- **Consumer confusion** — whether a likelihood of confusion exists. **Materially different from the above**: this element is present **only** in items 2 and 3, and is **absent from item 1** (§3). Representing it as a single dependency that applies uniformly across the whole claim would not misstate item 1's own rule (the proposition text itself already states item 1 has no confusion requirement), but including it as a listed dependency is justified because the claim as a whole — covering items 2–3 — genuinely turns on this unresolved, evidence-only fact for those items.
- **Registration status** — already addressed in §5: constrained into the proposition's own wording, not represented as a dependency. Re-tested here independently: does treating registration status as a dependency create any reachable project-state distinction beyond what the proposition's own conditional wording ("for a registered trademark") already achieves? **No** — a dependency would only ever permanently gate the claim to Case 3B exactly as the two dependencies below already do; adding a third, redundant dependency for the same permanently-unresolved-in-substance reason would not change rendering behavior and would blur the distinction between "the legal predicate this rule presupposes" (registration) and "the evidence-only comparative facts this rule turns on once its predicate is met" (mark/goods identity, confusion). Registration status is more naturally, and more accurately, a **conditional scope-limiter on the proposition itself**, not a comparative fact requiring evidence-only hedging.

**Decision: TWO dependencies**, correcting the pre-FGR zero-dependency finding:
1. `mark_and_goods_identity_or_similarity` — covers the identity/similarity comparison common to all three items.
2. `consumer_confusion_likelihood` — covers the likelihood-of-confusion element present only in items 2–3.

This is not adopted merely to mirror the U.S. Lanham precedent reflexively — it is independently re-derived from Taiwan's own evidence (the statute's own item-level structure, confirmed in §3) and from the same reasoning already validated twice this month in this corpus (Trademark US, Taiwan Copyright): these dependencies are retained **not** because Composition would otherwise fabricate an infringement/confusion conclusion (the fixed, domain-blind Bounded Interpretation/Composition templates already structurally prevent that regardless of dependency count, confirmed in §11) but for **Reviewer/HRR aggregate-signal honesty and CRC disclosure specificity** — declining to represent them would create an unexplained asymmetry with the structurally analogous, already-adopted U.S. Lanham claim, for no principled reason grounded in the evidence.

**Disposition: D2 — TWO DEPENDENCIES APPROVED (`mark_and_goods_identity_or_similarity`, `consumer_confusion_likelihood`); corrects the pre-FGR zero-dependency finding with independently re-derived reasoning.**

## 11. Bounded Interpretation ceiling

Because §10 establishes non-empty `unresolved_project_dependencies`, `hasGovernedProjectDependencies` evaluates true for this claim **unconditionally** (confirmed by direct code trace, not inferred from the status label). This claim will therefore always render via `relevant_applicability_unresolved` (Case 3B) once the Taiwan jurisdiction applicability gate is satisfied — never `directly_relevant`. Independently traced `rules.ts`'s Case 3B template and the shared `RELATED_TOPIC_BOUNDARY_CLAUSE`/`BRIDGE_SENTENCE` fixed copy: the rendering quotes the governed proposition verbatim, adds the fixed "not enough project-specific information to determine how it applies to your specific project" hedge, and the unconditional Commercial Assurance bridge sentence. No code path in `build-bounded-interpretation.ts` or `rules.ts` permits this rendering, at Case 3B or (hypothetically) at `directly_relevant`, to state or imply any project-specific trademark conclusion — the fixed BI/Composition boundary structurally prevents this regardless of ceiling status, confirmed by direct template trace rather than inferred from the "relevant" framing alone.

**Disposition: PASS — Case 3B (`relevant_applicability_unresolved`) confirmed as the permanent BI ceiling; the fixed template boundary independently confirmed to prevent project-specific conclusions at any ceiling status.**

## 12. Askability

Confirmed directly against `dependency-askability.ts`'s registry (lines 75–115, independently re-read): the registry's default is fail-closed — `isAskableInCrc()` returns true only for an exact-match registered entry, and absence from the registry means CRC must never proactively ask about that dependency. The registry's one real entry today is `human_contribution_description`. Neither `mark_and_goods_identity_or_similarity` nor `consumer_confusion_likelihood` is proposed for registration, and neither should be: asking a user to self-determine mark similarity, goods/services similarity, or consumer confusion would require the user to perform exactly the legal/factual judgment this candidate is structurally barred from delegating to self-attestation. No `dependency-askability.ts` entry is needed or proposed for either dependency.

**Disposition: EVIDENCE-ONLY APPROVED FOR BOTH DEPENDENCIES — fail-closed by registry absence, no askability entry proposed.**

## 13. Explicit vs. discovered

Independently tested whether any existing structured `ProjectFact` supports generic discovered relevance for this candidate: none does. No `TopicRelationship`, `ContentPresenceCategory`, fabricated `UserGoal`, logo/brand detector, or trademark-specific orchestration is proposed or required. This candidate is reached exclusively via the existing, unmodified exact-topic `lookupTopicClaims` path under the already-registered `trademark` `GoalCategory` (confirmed live in `types/interview-engine.ts`'s `GOAL_CATEGORIES` array, added by the U.S. Lanham milestone) — identical in shape and mechanism to the already-adopted `CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1`. Explicit-goal-only, matching this candidate's own pre-FGR framing.

**Disposition: EXPLICIT ONLY APPROVED.**

## 14. Applicability

`applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'Taiwan' }]` — structurally identical in shape to `CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1`'s own already-adopted Taiwan gate and to `CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1`'s own United States gate (confirmed by direct inspection of `topic-claims-fixture.ts`'s live entries for both). Re-read `AssessmentJurisdictionMention`'s own doc comment directly (`types/interview-engine.ts`) — confirmed it represents only "the jurisdiction the user asked CRC to consider," never a territorial-attachment, court-jurisdiction, distribution-territory, governing-law, or mark-registration-territory finding. No additional applicability requirement is necessary or proposed — nothing in the captured evidence imposes any further statutory precondition (e.g., domicile, distribution territory) on items 1–3's own application. This candidate is explicit-goal-only (§13), so it carries no Article-50/NY-style unrestricted-reach exposure to solve.

**Disposition: APPLICABILITY APPROVED — `jurisdiction equals Taiwan`, request-scope gate only, no additional requirement needed.**

## 15. Provider/tool scope

The proposition concerns Taiwan trademark infringement generally — it does not depend on, name, or presuppose any specific AI generation tool or provider. Whether a mark was produced by manual design or AI generation is immaterial to items 1–3's own statutory test (identity/similarity of mark and goods, plus confusion where required) — the statute is technology-neutral on its face and this review found no basis in the captured evidence to narrow scope by provider or tool. `provider_scope: null`, `tool_scope: null` — matching the existing U.S. Trademark and Taiwan Copyright claims' own generic (non-provider-scoped) shape.

**Disposition: PASS.**

## 16. Client-provided assets

Confirmed: nothing in this candidate's proposition, dependencies, or applicability treats a client's supply of a logo, brand artwork, packaging, or campaign asset as itself establishing ownership, registration, authorization, license sufficiency, or trademark clearance. No self-attestation question is proposed for any of these evidence-only facts — consistent with existing stock-governance discipline in this corpus (client-supplied material is never treated as self-proving its own rights status).

**Disposition: PASS.**

## 17. Prohibited project-specific conclusions

This candidate explicitly prohibits CRC from stating or implying, for a specific project: that a particular mark is registered; that registration is valid; that a particular person or entity owns the mark; that particular content constitutes statutory trademark use (Art. 5); that marks are legally identical or similar; that goods/services are legally identical or similar; that consumer confusion is or is not likely; that any Art. 36 limitation applies or does not apply; that authorization or consent is sufficient; that infringement occurred; that infringement did not occur; that Taiwan law definitively governs the project (including merely because the user selected Taiwan as the assessment jurisdiction); or that the project is commercially cleared, legally compliant, or ready for commercial use. Independently re-tested each against the draft proposition (§9) and the fixed BI/Composition templates (§11) — no combination produces any of these conclusions.

**Disposition: PASS — full prohibited-conclusions list confirmed and structurally enforced.**

## 18. Commercial Assurance boundary

Derived specifically from this candidate's own elements (not copied from the U.S. Lanham or stock-media checklists): a higher-assurance human review of a real Taiwan trademark infringement/clearance question, arising from this candidate specifically, would potentially need to verify — not all of which will always be required, depending on the fact pattern — the actual mark/content used in the project; the Taiwan trademark registration record for the mark potentially at issue (registration status, registrant, registration date, designated goods/services); the actual goods/services the project's use implicates; ownership/rightsholder evidence for the registered mark; the specific manner and context of use (whether it constitutes trademark use "for a marketing purpose" under Art. 5); comparative similarity assessment of marks and of goods/services under whichever of items 1–3 is potentially implicated; a likelihood-of-consumer-confusion assessment where items 2 or 3 are potentially implicated; whether any Art. 36 limitation or exception (nominative/descriptive fair use, referential fair use, functional necessity, prior good-faith use, exhaustion) applies; and whether the trademark owner's consent or authorization exists. Re-read `guidance.ts`'s current Domain I text directly (unchanged since this corpus's most recent independent verification this same week) — confirmed strictly observational, not an adjudication of legal infringement; this candidate does not convert any Reviewer Workbook control into an LK dependency.

**Disposition: PASS.**

## 19. Multi-jurisdiction architecture

Re-inspected current code directly (not cited from prior discovery/pre-FGR reports): `GoalCategory`/`KnowledgeTopic` (`types/interview-engine.ts` line 826) already includes `trademark` as a real category, added by the U.S. Lanham milestone and already reused, unmodified, for this Taiwan candidate. `topic-claims-fixture.ts`'s live `CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1` entry (lines 1541–1617) confirms the exact shape a second `trademark`-topic, Taiwan-jurisdiction entry would take: same `topic: 'trademark'`, a distinct `jurisdiction` value (`'Taiwan'` vs. `'United States (federal)'`), a distinct `applicability_requirements` value, and independently-scoped `unresolved_project_dependencies` — no jurisdiction-specific runtime branch, no new `ProjectFact`, no new `GoalCategory`, no new `KnowledgeTopic`, no special questioning, Retrieval, BI, or Composition code required. This candidate's jurisdiction-specific proposition semantics (item 1's distinct non-confusion structure, the marketing-purpose condition, Art. 36 categories) are preserved in the proposition's own wording rather than normalized to match the U.S. Lanham claim's confusion-only phrasing — confirming the corpus's own established principle that shared `GoalCategory`/generic architecture does not require flattening jurisdiction-specific legal content.

**Disposition: PASS — representable alongside `CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1` using existing generic architecture; zero new architecture required; jurisdiction-specific semantics preserved.**

## 20. Refresh governance

Recorded as triggers only — no refresh machinery, schedule, or stale-state field is created or proposed, consistent with this corpus's existing checksum-comparison refresh-readiness baseline (already satisfied by the evidence manifest):

- The 2022 amendment to Art. 68 enters into force (an Executive Yuan effective-date order is issued) — this is a **GOVERNED PROPOSITION CHANGED** event, not merely a source change: the chapeau's marketing-purpose qualifier would relocate away from items 1–3, and a new labels/tags/packaging second paragraph would become active law, requiring a new or revised candidate.
- Art. 68 is amended again by any future legislative action.
- Art. 5's trademark-use definition materially changes.
- Any Art. 36 limitation/exception category materially changes (note: the 2023 amendment's own article list includes Art. 36, per history entry 17 — this review did not investigate which specific paragraph was touched, per the evidence manifest's own disclosed limitation, and treats the currently-effective Art. 36 text as accurate as captured).
- A superseding authoritative interpretation (e.g., a TIPO letter or judicial precedent addressing items 1–3 specifically) materially changes the proposition.

**Disposition: PASS — refresh triggers recorded; no machinery built or proposed.**

## 21. Historical evidence byte-integrity debt — recorded, not remediated

The evidence-capture milestone that produced this candidate's own evidence base found and fixed a `core.autocrlf=true` byte-normalization issue for this Taiwan Trademark capture specifically (via scoped `.gitattributes`, independently verified — commit `5344309`). This review records, per its own explicit instruction, that `TW-COPY-1` (the Taiwan Copyright evidence capture underlying `FGR_023`/`CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1`) **may** contain historical evidence affected by the same class of issue. This is explicitly **out of scope for this FGR** — no `TW-COPY-1` file was inspected, modified, or re-verified by this review, and no repository-wide remediation was performed or scoped. Recorded here only as historical evidence-integrity debt for a future, separate, explicitly-authorized task.

**Disposition: PASS — debt recorded; no remediation attempted; `TW-COPY-1` untouched.**

## 22. Adversarial review

| Attack | Finding |
|---|---|
| Source fidelity / manifest fabrication | Not found — quoted Chinese text and checksummed files independently re-read and confirmed present in the raw HTML (§1) |
| Governing text confusion (2022 promulgated text treated as effective) | Specifically checked and rejected — this review anchors to the currently-effective old-law text, independently re-confirmed from the statute's own live effective-status banner and history table (§2) |
| Items 1–3 flattened into one confusion rule | Not found — item 1's distinct non-confusion structure is preserved throughout the proposition, dependency, and adversarial analysis (§3, §9, §10) |
| Visible-mark-equals-infringement overreach | Not found — the marketing-purpose/trademark-use condition (Art. 5, currently-effective Art. 68 chapeau) is preserved as a real element (§4) |
| Registration status smuggled in as a project-specific finding | Not found — registration constrained to conditional proposition wording only, independently re-tested and rejected as a dependency for a reasoned, recorded reason (§5, §10) |
| Art. 36 exceptions turned into project-specific adjudication | Not found — categories named, no per-project resolution, no dependency created (§6) |
| Art. 70 merged into this candidate | Not found — confirmed structurally separate (different subject matter: fame/dilution; different scienter: actual knowledge); excluded (§7) |
| Zero-dependency default accepted merely because it matched the pre-FGR brief | Not found — the pre-FGR zero-dependency premise was independently re-challenged and overturned with recorded reasoning (§10), mirroring `FGR_023`'s own precedent of correcting a mistaken zero-dependency premise |
| Dependencies retained merely to mirror the U.S. Lanham precedent reflexively | Specifically checked — rejected as insufficient alone; independently re-derived from Taiwan's own item-level statutory structure (§10) |
| Dependencies misconceived as a Composition-safety requirement | Specifically checked — not found; the fixed, domain-blind templates already structurally prevent overstatement regardless of dependency count (§11), and §10 does not claim otherwise |
| `directly_relevant` reachable or misread as a project-specific determination | Specifically checked — not reachable given D2 (§10/§11); Case 3B's fixed template cannot be strengthened by any downstream layer |
| US-specific "affiliation/sponsorship/approval" language imported without support | Not found — the proposition uses only Taiwan's own "混淆誤認之虞" (likelihood of confusion/mistake) concept; no affiliation/sponsorship/approval language appears anywhere in items 1–3 or Art. 35's supporting structure (§9) |
| Fair Trade Act / criminal liability / remedies folded in | Not found — explicitly excluded as future/out-of-scope regimes (§8) |
| New GoalCategory/KnowledgeTopic/ProjectFact/Track A invented | Not found — reuses the existing `trademark` category and the existing exact-topic path unmodified (§13, §19) |
| Self-attestation risk / new askable question invented | Not found — neither dependency is registered askable; fail-closed by registry absence (§12) |
| Commercial Assurance overstatement | Not found — Domain I re-verified strictly observational (§18) |
| Legal-advice implication | Not found anywhere in the proposition, evidence limitations, or BI ceiling |

**No unresolved substantive defect found.**

## 23. Final disposition

**ADOPT.** Every review point (1–9, 11–20) passes on this review's own independent re-derivation from the captured primary evidence and current production source. §10 (dependency semantic) — the point most analogous to where this corpus's own recent history (`FGR_023`) found and corrected an error — surfaced and corrected a genuine defect in the pre-FGR briefing's own premise (zero dependencies), independently re-deriving a two-dependency model (`mark_and_goods_identity_or_similarity`, `consumer_confusion_likelihood`) directly from Article 68's own item-level statutory structure rather than accepting the pre-FGR finding or reflexively copying the sibling U.S. Lanham claim's single-dependency shape.

**Proposed candidate contract for PM Adoption review:**

- **Proposed candidate ID:** `CAND-TRADEMARK-TW-ART68-INFRINGEMENT-001` (subject to confirmation and final claim-ID assignment at Adoption — no durable `CLAIM-...-v1` ID is assigned by this review).
- **Proposition (draft, not yet PM-approved wording):** see §9 above, verbatim.
- **GoalCategory / KnowledgeTopic:** reuse existing `trademark` (no new category, no new topic).
- **Jurisdiction:** Taiwan.
- **Applicability:** `[{ fact: 'jurisdiction', operator: 'equals', value: 'Taiwan' }]` — request-scope gate only.
- **provider_scope / tool_scope:** `null` / `null`.
- **Dependencies:** `['mark_and_goods_identity_or_similarity', 'consumer_confusion_likelihood']` — both newly proposed, both evidence-only, neither registered askable.
- **Askability:** no registry entry for either dependency — fail-closed by absence.
- **Reachability:** explicit-goal-only; no Track A, no `ContentPresenceCategory`, no `TopicRelationship`.
- **BI ceiling:** Case 3B (`relevant_applicability_unresolved`) always; never `directly_relevant`.
- **Evidence basis:** `06_Operations/institutional-knowledge/notebook/evidence-captures/taiwan-trademark/` — `moj-trademark-act-current_20260923T073620Z_fc7518e5.html`, `moj-trademark-act-oldlaw-arts68-70-95-97_20260923T073622Z_57f094ba.html`, `moj-trademark-act-history_20260923T073623Z_efe93aab.html`, per `MANIFEST.md`.
- **Explicitly excluded from this candidate:** Art. 70 well-known-mark dilution material (recorded as a future governance candidate note only); the not-yet-effective 2022 Art. 68 amendment text (watchlist/refresh-trigger only, per §20); Fair Trade Act, criminal liability, and remedies provisions (excluded regimes, §8).

**This FGR's ADOPT recommendation does NOT itself constitute PM Adoption.** Entry into `GOVERNED-CLAIMS.md`, `Lifecycle: Adopted` becoming actual, `CRC Eligible` status, CRC Publication Review, and production representation each remain separate, later, explicitly-authorized steps. This review changes no field in `GOVERNED-CLAIMS.md` and creates no production representation.

--- END VERBATIM FORMAL GOVERNANCE REVIEW ---
