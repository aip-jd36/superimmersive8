Title: CRC Publication Review #24 — Adobe Firefly Output Indemnification Proposition (LK-TRIAL-13)

Reviewed object:
- `adobe-firefly` (Matrix-native claim, `PLATFORM-RIGHTS-MATRIX.md`, Adobe Firefly row — not a TopicClaim, no `GOVERNED-CLAIMS.md` entry, no candidate file)

Review date: 2026-09-10

Artifact type: CRC Publication Review / Decision Analysis (publication stage). First CPR of the Adobe Firefly row. Continues LK-TRIAL-13. Conducted in normal sequence — FGR ADOPT WITH BOUNDED WORDING for this exact proposition was already persisted Matrix-natively (commit `768408d7001ad48f3b0069de477876649aa5df12`, parent `1ba6de7`), mirroring the established Matrix-native FGR-then-CPR pattern (Gemini API LK-TRIAL-9, Gemini Consumer App LK-TRIAL-11, Google Veo LK-TRIAL-12).

PM decision: **APPROVE WITH BOUNDED WORDING (JD (PM), 2026-09-10).** JD/PM concurs with the reviewing-agent's recommendation below, exactly as drafted in §7, with no paraphrase, strengthening, or broadening. `crc_eligible` is set to **Yes** on the Matrix row, using the exact §7 Candidate Statement and Publication Scope verbatim. This wrapper line update is the durable record of that human decision, per this folder's own "wrapper metadata may be updated as later events occur" allowance — the verbatim body below remains exactly as originally written and is not itself the record of the final decision.

Reviewing-agent recommendation: **CPR APPROVE WITH BOUNDED WORDING.** Exact proposed CRC Candidate Statement and CRC Publication Scope in §7 below. Rationale in §§1–6.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments belong in a new review artifact or in this wrapper's own metadata, never inserted into the verbatim body below.

Source: written directly to this file during this session's CPR milestone (LK-TRIAL-13), not reconstructed from a prior conversational report.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Adobe Firefly Output Indemnification — CRC Publication Review

## 0. Repository / governance state verified before review

`origin/main` = `1ba6de7cb4ac79ae299cd4c4640e8bf2c791bbb0` (unchanged since the FGR persistence milestone — zero mainline drift). Local `HEAD` = `768408d7001ad48f3b0069de477876649aa5df12` (the FGR-adoption commit itself, one commit ahead of `origin/main`, not pushed). Re-verified fresh: Matrix-native authority only, no competing `GOVERNED-CLAIMS.md` claim, no TopicClaim, no candidate file, `matrix-fixture.ts` unchanged (`crc_eligible: 'Pending'`, `crc_publication_scope: null`, `crc_candidate_statement: null`) — the doc and the mechanical fixture agree exactly.

## 1. The CPR question

Is SI8 willing to allow CRC to state this exact adopted Adobe Firefly indemnification proposition without a human reviewing the specific moment it is said? FGR adoption is a necessary precondition, not predetermined CPR approval — this review evaluates publication-channel safety specifically.

## 2. Publication Test — audited against ten named misinterpretation risks

Each risk was tested against the drafted wording (§7) and empirically against a real pipeline canary (§5), not asserted safe by wording alone:

| # | Risk | Addressed how |
|---|---|---|
| A | "Adobe indemnifies" → commercially cleared | Explicit final sentence: indemnification is separate from and doesn't establish commercial-use permission or clearance |
| B | indemnification exists → commercial use permitted | Same explicit separation |
| C | any Adobe/CC plan → Eligible Plan | Explicit: "Having any Adobe or Creative Cloud subscription doesn't by itself mean you're covered" — the single highest-risk, most Firefly-specific misconception, named directly |
| D | used Firefly → used an Eligible Feature/Surface | Explicit disclosure that the current eligible-feature/surface list is not independently confirmed by SI8 at all — not glossed over, not guessed |
| E | output generated → Export Event occurred | Not separately asserted or resolved; folded into the same "conditions we haven't verified for you" framing |
| F | qualifies → Adobe will defend this claim | Publication Scope explicitly prohibits stating Adobe will defend any specific claim |
| G | $10,000 cap → guaranteed coverage | Framed as "Adobe's liability is capped at," not a promised amount; Publication Scope explicitly prohibits "guaranteed payout" framing |
| H | "Input/Output are your Content" → ownership | Not asserted anywhere in the candidate statement; Publication Scope explicitly prohibits it |
| I | Adobe surface → Non-Adobe models same treatment | Explicit exclusion stated in the candidate statement itself |
| J | indemnification → no other commercial-readiness issues | Publication Scope explicitly prohibits project-clearance language; Commercial Assurance referral included |

## 3. Material-usefulness assessment

Unlike Kling's Member-status or Midjourney's revenue-threshold gates (self-assessable by the user), two of Firefly's four gates (Eligible Feature, Eligible Surface) are not resolvable even in principle from anything SI8 currently knows — this is a genuine, qualitative difference from prior tier-gated precedent, weighed seriously rather than defaulted past. The proposition remains materially useful despite this: its real value is correcting a live overclaim risk (that "Adobe verifies Firefly" broadly, the exact premise underlying SI8's own competitive positioning) by disclosing that the actual mechanism is narrow, plan-specific, and feature/surface-gated against a list SI8 has not confirmed — steering the user toward checking Adobe's own current documentation or a Commercial Assurance review rather than assuming coverage. This is corrective/expectation-setting value, not resolution value — an acceptable and precedented shape (mirrors the Gemini API/Consumer App and Google Veo non-determination propositions' own value proposition).

## 4. Dependency/evidence-only boundary

Eligible Plan status, Eligible Firefly Feature/Surface status, and Export Event occurrence remain evidence-only, unresolved facts — not converted into self-attestation questions, not given new applicability semantics, no new questioning. Confirmed unchanged from the FGR persistence milestone; this CPR does not alter that treatment.

## 5. Synthetic eligibility canary — RUN, real pipeline, isolated clone

A real `retrieve()` → `buildBoundedInterpretations()` → `assembleProjectionOutput()` pipeline was run against an isolated `structuredClone` of the `adobe-firefly` `MatrixRow`, overridden with `crc_eligible: 'Yes'` and the exact §7 wording below; the real `MATRIX_FIXTURE` import was confirmed byte-unchanged before and after (scratch test, deleted after use, never committed). Results: the claim retrieves with the exact candidate statement, resolves `directly_relevant`; zero leakage to/from Kling, Google Veo, Gemini API, and Gemini Consumer App contexts (all four tested); an adversarial regex scan covering all ten named risks (§2) plus the standard prohibited-conclusion set found zero matches in the fully rendered Projection output.

## 6. Recommendation

**CPR APPROVE WITH BOUNDED WORDING** — the §7 wording below, not a broader or unbounded restatement. The unusually dense set of unresolvable eligibility facts was weighed directly (§3) and found not to defeat usefulness, given the wording's corrective framing and explicit non-resolution of any user-specific status.

## 7. Proposed CRC Candidate Statement / CRC Publication Scope (recommendation only — not entered into `PLATFORM-RIGHTS-MATRIX.md`)

**CRC Candidate Statement:**

> Adobe offers a narrow, conditional indemnification for some Firefly output — but it only applies if you're a Creative Cloud for teams or enterprise customer on a specific paid plan (Creative Cloud Pro Plus or Creative Cloud, Edition 4) that includes this add-on, and only for output from the specific Firefly features and surfaces Adobe currently designates as eligible (that exact current list isn't something we've independently confirmed). Having any Adobe or Creative Cloud subscription doesn't by itself mean you're covered. Even when it applies, Adobe's liability is capped at US$10,000 per output or claim, subject to conditions and exclusions, and it doesn't cover output from non-Adobe/partner models used inside Adobe's tools. This indemnification is separate from — and doesn't by itself establish — whether you may use the output commercially or whether your project is otherwise cleared.

**CRC Publication Scope:**

> CRC may state that Adobe's current Generative AI Product Specific Terms include a conditional Firefly Output Indemnification mechanism, gated on Creative Cloud for teams/enterprise status plus a specific paid plan (Creative Cloud Pro Plus or Creative Cloud, Edition 4) with the indemnification add-on, applicable only to output from Adobe-designated Eligible Firefly Features on Eligible Firefly Surfaces following an Export Event, capped at US$10,000 per output or Infringement Claim, subject to stated exclusions and procedural conditions. CRC may state that this indemnification does not extend to Non-Adobe/partner models used within Adobe surfaces, to free-tier use, or to plans without the add-on, and that the exact current list of Eligible Firefly Features/Surfaces has not been independently confirmed. CRC must not state or imply that the user's own plan is an Eligible Plan, that the user's own feature/surface is an Eligible Firefly Feature/Surface, that an Export Event has occurred for the user's output, that Adobe will defend any specific claim, that US$10,000 is a guaranteed payout rather than a maximum cap, that having any Adobe or Creative Cloud subscription qualifies as an Eligible Plan, that the user owns the output, that Non-Adobe models receive the same indemnification, or that this indemnification establishes commercial-use permission, commercial clearance, or that the user's project has no other commercial-readiness issues. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project's own Adobe Firefly eligibility and commercial-readiness status.

## 8. What this review does NOT establish

Does not set `crc_eligible: Yes`. Does not constitute PM/JD concurrence. Does not authorize runtime alias/reachability remediation, a TopicClaim, a `GOVERNED-CLAIMS.md` entry, Matrix retirement, new `ApplicabilityFacts`, new askability, or any Retrieval/Bounded Interpretation/Composition architecture change. Does not evaluate or resolve any specific user's or project's actual Firefly eligibility or commercial-readiness status.

--- END VERBATIM CRC PUBLICATION REVIEW ---
