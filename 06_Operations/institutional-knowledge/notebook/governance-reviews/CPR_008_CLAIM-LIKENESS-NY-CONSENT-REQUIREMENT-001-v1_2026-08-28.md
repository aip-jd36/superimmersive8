Title: CRC Publication Review #8 — Likeness / New York, Candidate A

Reviewed object:
- CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1

Review date: 2026-08-28

Artifact type: CRC Publication Review / Decision Analysis (publication stage — asks whether this already-Adopted claim may additionally become `CRC Eligible: Yes`; distinct from Formal Governance Review #8, which reviewed this same object for Adoption only — see `FGR_008_CAND-LIKENESS-NY-CONSENT-REQUIREMENT-001_2026-08-28.md`). First CRC Publication Review of the Likeness/New York domain, and the first CPR conducted following a dedicated Synthetic Eligibility Runtime Canary (throwaway, never-committed synthetic-eligible clone run against real, unmocked `retrieve()`/`buildBoundedInterpretations()`/`assembleProjectionOutput()`) verifying runtime-safety evidence independently of the publication question itself, per `CRC-PUBLICATION-POLICY.md` Principle 1's "never inferred from Status/runtime-safety" discipline.

PM decision: **WITHHOLD FROM CRC — CONCURRED (PM: JD, Decision Date: 2026-08-28).** CRC PM / Architecture explicitly reviewed and approved this review's own recommendation (WITHHOLD FROM CRC) in a separate, later, explicitly authorized governance-recording task. `CRC Eligible` remains `Pending` in `GOVERNED-CLAIMS.md` — per the established `CPR_007` precedent for a WITHHOLD disposition, `CRC Approver`/`CRC Decision Date` on the governed claim entry itself remain `PENDING` (those fields' established meaning, per `CLAIM-COPY-004-v1`'s own precedent, is specifically "who/when approved this claim FOR CRC" — not "who/when decided the CRC disposition in general"); the WITHHOLD decision and its date/approver are instead recorded inline in the claim's own `CRC Publication Scope` field, citing this review as basis, exactly mirroring how `CPR_007`'s own WITHHOLD disposition for the 9 non-approved Music claims was recorded.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY. Future amendments (including any later reconsideration decision) should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: reconstructed verbatim from this session's own conversation transcript (the immediately preceding turn's own CRC Publication Review Final Report) — not from memory, not from the condensed summary in `GOVERNED-CLAIMS.md`, not from `FGR_008`. Mirrors `CPR_002`'s own established reconstruction precedent for a review conducted conversationally before being durably archived.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Likeness Candidate A — CRC Publication Review Final Report

## A. Governed claim reviewed
`CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1` and its `FGR_008` record, both re-read directly (not paraphrased from memory) for this review. Proposition: NY Civil Rights Law §§50–51 — using a living person's name/portrait/picture/likeness/voice for advertising or trade purposes in NY without prior written consent creates civil liability and (§50) is a misdemeanor. Evidence tier: 100% Class A (direct statutory text) for every retained element after FGR_008's own bounded wording correction. Jurisdiction: New York only, no generalization. `provider_scope: null`. Applicability: `jurisdiction equals New York` only. Dependencies: all three, unchanged. Evidence limitations and Prohibited Conclusions text already correctly disclaim legal-recognizability-as-fact, advertising/trade characterization, consent sufficiency, and clearance status. CRC candidate statement is the corrected, narrowed FGR_008 §17 wording — DRAFT, unpublished. No strengthening applied here.

## B. Evidence authority
Per the task's own framing and this repo's established discipline: Adoption is not CRC Eligibility, and the synthetic runtime canary is not publication authority either — both are engineering evidence *inputs* to this governance decision, never substitutes for it.

## C. Principle-3 policy
Read directly, verbatim, from `CRC-PUBLICATION-POLICY.md`: **"Subject sensitivity outweighs confidence in the fact. A well-verified fact touching SI8's No List boundaries — likeness, voice cloning, deepfakes, political persuasion — gets more scrutiny, not less, regardless of verification strength. This is a gate, not a scope to narrow around."** Principle 5's explicit exception: **"this hierarchy does not apply to Principle 3 concerns. A sensitivity gate isn't resolved by finding a narrower phrasing; it's resolved by withholding or escalating to human review."** Narrow-before-withhold is expressly excluded as a resolution mechanism here — confirmed, not applied as a substitute anywhere in this review.

## D. Runtime-safety evidence
Accepted as engineering fact, used only to answer "if authorized, can CRC stay bounded" (E–L below) — never as evidence that authorization itself is warranted, per the task's own explicit instruction.

## E. Applicability boundary
`jurisdiction equals New York`, independently proven safe and non-inferential (no US⇒NY hierarchy, no location-based inference) in the prior synthetic canary. Not a publication concern in itself.

## F. Dependency review
All three (`recognizable_likeness_or_voice_present`, `advertising_or_trade_use_confirmed`, `written_consent_confirmed`) remain unresolved, permanently, under current governance and runtime. Individually assessed in G–I.

## G. Recognizability dependency assessment
The dependency's *name* still says "recognizable," inherited from the pre-FGR_008 candidate wording; its *governed definition* is an existence question ("whether the specific project's content actually uses the person's name/portrait/picture/likeness/voice at all"), consistent with the now-narrowed proposition. **Classification: harmless naming hygiene, not a publication blocker.** The CRC candidate statement itself never uses "recognizable" (FGR_008 already stripped that construction). Worth a future, separate, non-substantive governance rename — **not performed here**, per the Hard Stop against silent rewriting during CPR.

## H. Advertising/trade dependency assessment
Permanently unresolved absent Candidate B (`CAND-LIKENESS-NY-EXPRESSIVE-WORK-BOUNDARY-001`), which remains `Lifecycle: Candidate`, `NOT READY FOR FGR`. Not substituted with `commercial_use`/`intended_use` anywhere. **On its own, this does not disqualify publication** — it mirrors the already-published Stock claims' own permanently-unresolved dependencies (`which_provider`, `editorial_designation_confirmed`, etc.), which CRC already hedges identically via the same Case 3B mechanism. It does mean any future-approved presentation of this claim would hedge *forever*, not just "for now" — a real characteristic to disclose honestly (J), not a separate gate.

## I. Written-consent dependency assessment
Evidence-only, non-askable, confirmed unchanged (FGR_008 §11). Same reasoning as H: matches existing published-claim precedent (`release_status_confirmed` etc.), not independently disqualifying, not converted to self-attestation anywhere.

**Net finding across F–I: every ordinary Publication Policy signal (evidence quality, dependency handling, applicability safety) is fine, and would not block publication under the ordinary Principles. The only operative blocker is Principle 3 itself.**

## J. Educational value
Honestly positive, not manufactured as weak to justify withholding: the underlying fact is genuinely useful awareness (many users won't know NY has this specific statute); CRC can and does clearly hedge what's unresolved (proven, D); CRC avoids implying legal applicability (proven); CRC explicitly distinguishes itself from Commercial Assurance (proven, routing language present in the actual composed output). The permanently-unresolved advertising/trade characterization (H) does not make the output "too indeterminate to be useful" — it makes it maximally modest, which is the same shape every other dependency-bearing published claim already takes.

## K. Prohibited conclusions
Verified against the governed text directly: does not, and — per the proven hedge shape — structurally cannot, ever conclude that NY law definitely governs, that the depicted person is legally recognizable, that the use is for advertising/trade, that consent is absent or sufficient, that §§50–51 is violated, that liability exists, or that the project is commercially cleared/not cleared. Confirmed unchanged from FGR_008.

## L. Commercial Assurance boundary
A human CA reviewer would need to verify, none of which CRC ever attempts: (1) whether the actual footage depicts/uses the person's protected attribute(s), by direct review — CRC only has self-report; (2) whether the specific use context legally meets "advertising purposes or purposes of trade" — a legal characterization; (3) whether actual written consent documentation exists, is authentic, and covers this use — documentary review; (4) the statute's "within New York" territorial-use condition as applied to this specific project; (5) an overall risk synthesis. CRC is not asked to, and does not, perform any of these.

## M. Publication disposition
**WITHHOLD FROM CRC.**

Not for evidence quality (Class A), not for dependency handling (already correctly hedged, matches published precedent), not for runtime safety (independently proven). Solely because Principle 3 is a categorical subject-matter gate — "regardless of verification strength" — and this claim's own governance record (FGR_008 §13) already anticipated and explicitly warned against resolving it on exactly the "it's now well-evidenced/safe, so publish" reasoning this review was tempted toward: *"a future reviewer should not attempt to publish a softened version of the recognizability-adjacent content on narrow-before-withhold reasoning."* The direct, on-point precedent already in this system — the only other likeness-topic claim (ElevenLabs) — was itself withheld under this same Principle. I'm recording this as my reasoned recommendation for JD's ratification, following this repo's own established two-step governance pattern (mirroring FGR_008's own "recommend, then separately record" discipline) — not as a self-certified final human sign-off.

## N. Permitted scope / withholding rationale
No permitted scope — full withhold, not a narrowed partial publication (Principle 5's carve-out explicitly forbids that resolution path here). Rationale: stated in M. **Future reconsideration is not foreclosed** — Principle 3 is a heightened-scrutiny gate, not a permanent ban. What would legitimately trigger reconsideration: (1) Candidate B being separately adopted, closing the advertising/trade gap materially and giving a future CPR a stronger factual position to weigh; (2) a deliberate, PM-level Publication-Policy decision (not a per-claim FGR workaround) to define a bounded category of general likeness-adjacent regulatory-awareness content CRC may carry; (3) an explicit, separate business decision by JD to accept this specific risk for this specific claim, made knowingly at the Principle-3 level. No runtime/dependency/questioning/Track-A change would ever be a legitimate trigger — Principle 3 isn't resolved by better engineering.

## O. Required governance updates
None performed here (Hard Stop). If this recommendation is ratified, the only required update to `GOVERNED-CLAIMS.md` is recording the withhold disposition and reviewer/date under `CRC Eligible`/`CRC Approver`/`CRC Decision Date` (currently all PENDING) — a small, later, explicitly-authorized recording task, not implemented in this review.

## P. Fixture-parity note
Not part of this decision (per §14's own instruction). Separately recorded from the prior canary: Pending fixture entries are structurally excluded from CRC output, mirroring Pending is consistent with established fixture precedent, and mirroring alone does not exercise downstream runtime (that requires the synthetic-override technique already demonstrated). This withhold disposition doesn't change that assessment either way.

## Q. Generic dependency-evaluation note
Recorded again, not solved: no mechanism today maps structured project state (e.g. `content_presence_mentions`) to per-claim dependency `met`/`not_met`/`unresolved` status, for any governed claim. Not load-bearing for this decision — the runtime already safely handles the fully-unresolved case, which is exactly the state a WITHHOLD leaves things in. Not implemented here.

## R. Remaining risks
1. This withhold recommendation still needs JD's explicit ratification/recording (O) — not yet a completed governance act.
2. If Candidate B is later adopted, this claim should be reconsidered, not left withheld by default inertia.
3. The dependency-name hygiene item (G) should get a small future correction, independent of and not blocking this decision.

## S. Recommended next milestone
None required to close this specific decision — it's closed as WITHHOLD, pending JD's ratification. If SI8 wants to pursue reconsideration later, the smallest legitimate next step would be progressing Candidate B (`CAND-LIKENESS-NY-EXPRESSIVE-WORK-BOUNDARY-001`) toward its own FGR — a separate governance track, not commissioned by this review.

## T. APPROVE / WITHHOLD / ESCALATE

**WITHHOLD FROM CRC.**

--- END VERBATIM CRC PUBLICATION REVIEW ---
