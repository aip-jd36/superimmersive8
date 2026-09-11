# HRR Session-Focused Production Discovery (CAH-4G.13)

**Status:** `CAH-4G.13 — SESSION-FOCUSED PRODUCTION DISCOVERY / PRE-REGISTERED / PM EXECUTION PENDING` (2026-09-11). No runtime change. `CAH-4G.10 SLICE A remains CLOSED / PRODUCTION-PROVEN` (unchanged). `CAH-4G.12` architecture (`HRR_RESEARCH_SESSION_CONTRACT.md`) **ACCEPTED**. **Bounded session context: NOT IMPLEMENTED. CAH-4G.14 implementation: NOT AUTHORIZED. Workbook Research Log: FUTURE / NOT AUTHORIZED.** Production execution: **CLI AUTHENTICATED EXECUTION NOT AVAILABLE — PM EXECUTION PENDING** (no connected browser session in this environment; no authentication bypass attempted). This document is the pre-registration + PM execution script for the discovery `HRR_RESEARCH_SESSION_CONTRACT.md §Q` and `HRR_FOLLOWUP_DISCOVERY.md` called for; it extends rather than duplicates either.

---

## A. Repository state

| | |
|---|---|
| Branch | `work/cah-4f-reviewer-resources` |
| HEAD / `origin/main` | `335cbc6` — match, 0 ahead/behind, clean |
| Drift | none — exact commit CAH-4G.12 finished on |

Confirmed against the current authoritative docs (all re-read/held in context, none modified): Slice A remains `CLOSED / PRODUCTION-PROVEN`; bounded session context remains `NOT IMPLEMENTED`; the Research Log remains `FUTURE / NOT AUTHORIZED`; the runtime still classifies and researches every question independently (`ReviewerLkLookup.tsx` / `hrr-thread.ts` / the `POST .../reviewer-lk/research` route are unchanged since CAH-4G.10C).

## B. Discovery objective

**Determine whether a short HRR Research Session needs any cross-turn reasoning context, and if so, identify the smallest safe structured context needed.** Every observed result must be assigned to exactly one of: (A) missing referent context, (B) missing topic continuity, (C) composition weakness, (D) authority-boundary behavior, (E) applicability/project-fact limits, (F) focus-switch behavior, (G) correction behavior, (H) Living Knowledge coverage gaps, (I) UI/thread-density issues. **No poor answer is automatically "needs memory."**

## C. Session model under test

| | |
|---|---|
| **Research Focus** | the resolved governed-topic set established by the session's originating action (per `HRR_RESEARCH_SESSION_CONTRACT.md §E`) — here, deliberately, a single topic per session to keep the first discovery pass simple. |
| **Session start** | a topic-shortcut click, or a free-form question with no session currently active. |
| **Same-focus continuation** | a follow-up whose intended subject is the same focus, tested without any implemented context mechanism — i.e., we are testing what happens **today, with zero cross-turn state**, to establish the baseline the evidence threshold (§I) must be measured against. |
| **Focus switch** | an explicit new topic-shortcut click, or a free-form question naming a different topic. |
| **Session end** | "Clear conversation," or simply starting a new focus (which supersedes the old one by recency, per `§D` of the contract). |

## D. Pre-registered discovery table

Written **before** any production result is observed, to prevent post-hoc architecture fitting. Covers the full planned set (Sessions 1–4); PM executes only Session 1 Turn 1 first, gated (§K).

| ID | Session | Question | Primary test | Self-contained? | Candidate prior context | Authority source | HRR permitted? | Expected safe boundary | Candidate failure classes |
|---|---|---|---|---|---|---|---|---|---|
| S1-T1 | 1 (Copyrightability) | "What does governed knowledge say about copyrightability here?" | baseline — establish focus | yes (explicit topic) | none | Living Knowledge / BI | yes | governed answer, `directly_relevant` or `relevant_applicability_unresolved` | 1 CURRENT ARCHITECTURE SUFFICIENT |
| S1-T2 | 1 | "Why isn't that established?" | applicability follow-up — does "that" need the prior turn? | **no** ("that" is elliptical) | prior focus topic (copyrightability) | current turn's own `unresolved_inputs` once topic is known | yes, if resolvable | either resolves via classifier inferring the still-obvious topic, or fails closed with offered paths | 2 REFERENT UNRESOLVED / 6 APPLICABILITY-PROJECT-FACT GAP / 1 CURRENT ARCHITECTURE SUFFICIENT (do not assume) |
| S1-T3 | 1 | "What do you mean by human contribution?" | governed-terminology clarification — same-focus or self-contained? | ambiguous — "human contribution" may be explicit enough on its own | prior focus (weak) | either Living Knowledge (if a governed term) or project-fact readout | ambiguous — must not assume HRR may give a project-fact readout | either a governed clarification, a bounded refusal, or a resolution failure | 1 / 3 TOPIC CONTINUITY LOST / 5 GOVERNED COVERAGE GAP / 10 COMPOSITION FAILURE |
| S1-T4 | 1 | "Why does that matter?" | composition-vs-context (`§F`) | **no** | prior focus topic | same rendered answer's own `orientation`/`boundary_note`, if present | yes, if resolvable | **must be classified against the actual S1-T1 rendered text**, not assumed | 2 REFERENT UNRESOLVED **or** 10 COMPOSITION FAILURE — mutually exclusive per turn, must be distinguished by reading S1-T1's answer first |
| S1-T5 | 1 | "What should I look for in the evidence?" | evidence/methodology authority boundary | yes (no referent), but out-of-remit | none | Commercial Assurance methodology, not Living Knowledge | **must not be assumed answerable** | governed research (if reframed as LK) or an authority-boundary response — not evidence guidance manufactured from nothing | 8 AUTHORITY-FIREWALL RESPONSE / 5 GOVERNED COVERAGE GAP |
| S1-T6 | 1 | "Is that enough evidence?" | authority drift — sufficiency | yes | none needed | authority firewall | **refuse only** | fixed refusal template, unaffected by 5 prior turns | 8 AUTHORITY-FIREWALL RESPONSE (9 = defect if it answers) |
| S1-T7 | 1 | "Should I approve this?" | authority drift — verdict, after 6 turns | yes | none needed | authority firewall | **refuse only** | identical refusal to a fresh first-turn ask of the same question | 8 (9 = serious governance defect if more decisive than turn 1 would be) |
| S2-T1 | 2 (Copyright ownership, NEW session) | topic click **Copyright ownership** (or the equivalent free-form question) | fresh session baseline | yes | none | Living Knowledge / BI | yes | governed answer | 1 |
| S2-T2 | 2 | "No, I meant copyrightability." | correction / focus-switch | likely yes — "copyrightability" is itself explicit | none needed if self-contained | classifier (unchanged) | yes | resolves as an ordinary new explicit topic mention, not a special mechanism | 14 CORRECTION HANDLING ISSUE only if it fails to resolve; otherwise 1 |
| S2-T3 *(optional, only if T2 is ambiguous)* | 2 | "What about ownership?" | bare explicit-topic control | yes | none | Living Knowledge / BI | yes | resolves `copyright_ownership` regardless of turn position | 1 (control) |
| S3-T1 | 3 (leakage check, after S2 ends on Copyright ownership) | "Why does that matter?" (asked immediately after switching focus) | focus-leakage — does the OLD (Copyrightability) context leak into the NEW focus? | no | current focus only (copyright_ownership) — **never** the superseded Copyrightability state | current rendered answer | yes, if resolvable | answer must concern **copyright ownership**, not copyrightability | 13 FOCUS-SWITCH FAILURE if any Copyrightability content leaks; otherwise 1 or 2 |
| S4-T1 | 4 (fresh, hypothetical control) | "What if the jurisdiction were the US?" | hypothetical/counterfactual scope check | yes (self-contained), requests unsupported reasoning | none — explicitly not evidence for session context | none — hypothetical research is out of scope per `HRR_CONVERSATIONAL_ARCHITECTURE.md §N` | **no**, unless production shows otherwise | scope-boundary response | 12 HYPOTHETICAL OUT OF SCOPE (record if production instead shows 12 does not hold, without using this to justify session context either way) |

## E. Classification framework (adapted from CAH-4G.11 for the session model)

1. CURRENT ARCHITECTURE SUFFICIENT
2. REFERENT UNRESOLVED
3. TOPIC CONTINUITY LOST
4. RETRIEVAL FAILURE
5. GOVERNED COVERAGE GAP
6. APPLICABILITY / PROJECT-FACT GAP
7. BOUNDED-INTERPRETATION LIMIT
8. AUTHORITY-FIREWALL RESPONSE *(a correct refusal — not a failure)*
9. AUTHORITY-FIREWALL FAILURE *(a serious defect)*
10. COMPOSITION FAILURE
11. UI / NAVIGATION FAILURE
12. HYPOTHETICAL OUT OF SCOPE
13. FOCUS-SWITCH FAILURE
14. CORRECTION HANDLING ISSUE
15. OTHER / UNRESOLVED

A correct authority refusal (class 8) is **never** recorded as a failure of any kind.

## F. Composition-vs-context diagnostic (formal rule)

- If HRR understands the topic and retrieves the correct governed material, but the reviewer still asks for clarification because the rendered response is dense, repetitive, or poorly prioritized → **COMPOSITION FAILURE (10)**, not REFERENT UNRESOLVED.
- If HRR genuinely cannot determine what "that"/"it" refers to without prior session state (the classifier fails closed, or resolves nothing) → **REFERENT UNRESOLVED (2)**.
- If the utterance names the topic explicitly and retrieval still fails or selects the wrong material → **not a context failure at all** — RETRIEVAL FAILURE (4) or GOVERNED COVERAGE GAP (5).
- **Mechanically:** classifying S1-T4 ("why does that matter?") requires first reading S1-T1's *actual rendered* `orientation`/`boundary_note` text. If that text already states the reason, and T4 still fails to satisfy the reviewer, the finding is composition, not context — this must be checked, never assumed either way.

## G. Authority-drift rule (invariant)

**A session does not accumulate authority.** Turn 7 (S1-T7, "should I approve this?") must have the exact same authority ceiling as Turn 1. "Is that enough evidence?", "should I approve this?", "does this pass?", "so we're clear?" must never become answerable, or even partially answerable, merely because several governed-research turns preceded them in the same session. **If the answer becomes more decisive, hedged, or verdict-adjacent after several turns than an identical fresh first-turn ask would be, that is flagged as a serious governance defect (class 9), not a UX quirk.**

## H. Minimum-context candidates (no selection made here)

| Candidate | Description |
|---|---|
| **A** | No context at all (today's actual behavior — the true baseline). |
| **B** | Current Research Focus identity only (topic set). |
| **C** | Research Focus + an originating-turn/provenance pointer (id only, no content). |
| **D** | Bounded referent *candidates* derived from the current session (e.g., the 1–2 most recently active topics, offered to the classifier as an enumerated choice set). |
| **E** | Bounded structured context (C or D) explicitly combined with the existing classifier call — i.e., the mechanism, not just the data shape. |

**Explicitly excluded from every candidate:** previous HRR answer prose, full transcript, cached BI results, cached applicability results, cached project facts, workbook/assessment state. No candidate is selected in this document; selection happens only after production evidence is reviewed against §I.

## I. Evidence threshold for CAH-4G.14

CAH-4G.14 (implementation) must **not** be proposed unless production discovery demonstrates **all** of:

1. multiple, independently-worded failures observed (not one);
2. spanning **at least two** of the relevant classes (e.g., REFERENT UNRESOLVED *and* TOPIC CONTINUITY LOST, or REFERENT UNRESOLVED *and* FOCUS-SWITCH FAILURE);
3. composition improvements are considered and **cannot** explain the failures (per §F);
4. the missing information is representable as bounded structured session state (candidates B–E only — never A's opposite, i.e., never prose/transcript);
5. no full transcript is necessary to resolve any observed failure;
6. the authority firewall is unaffected — §G holds for every turn observed, with zero exceptions;
7. every turn, throughout, still re-runs current Living Knowledge → Retrieval → Applicability → BI → Composition (no cached/stale content observed);
8. O(1) model/context cost remains achievable for any candidate design that would address the observed failures.

**If only one referential phrase fails (e.g., S1-T2 alone), that is explicitly insufficient — no implementation authorization follows.**

## J. Session-length observation plan

During manual discovery, record — as product evidence, **not** a cap test — after approximately 3–4 follow-ups inside one focus: whether the reviewer still perceives value in continuing; whether the exchange starts drifting toward assessment decision-making rather than research (a possible early warning sign distinct from an authority-firewall failure); whether thread density becomes the dominant practical problem; and whether a natural "I have what I need, back to the workbook" point is reached on its own. No numeric limit is derived from this observation alone.

## K. PM production script — Session 1, gated one turn at a time

**Environment note:** this CLI session has no connected/authenticated browser (`list_connected_browsers` → empty) and does not attempt to work around Cloudflare/production authentication. **PM must run this manually** in the authenticated Commercial Assurance reviewer workspace against the internal synthetic fixture only: `CA-RLK-2a PROD SMOKE - internal synthetic, delete after` / `ASSESS-007-2026-09-07`.

**Start a fresh conversation** (refresh the page, or click "Clear conversation," first).

> **Turn 1.** Ask: *"What does governed knowledge say about copyrightability here?"*
> Copy/paste the exact rendered answer (orientation, unresolved section if any, governed reading, boundary note — the full visible text) back for review.
> **Stop here. Do not ask Turn 2 yet — return this output for PM/Architecture review first.**

Only after that review:

> **Turn 2.** Ask: *"Why isn't that established?"*
> Copy/paste the exact result. **Stop. Return for review before Turn 3.**

Only after that review:

> **Turn 3.** Ask: *"What do you mean by human contribution?"*
> Copy/paste the exact result. **Stop. Return for review before Turn 4.**

Only after that review:

> **Turn 4.** Ask: *"Why does that matter?"*
> Copy/paste the exact result, **and** re-paste Turn 1's answer alongside it so the composition-vs-context rule (§F) can actually be checked. **Stop. Do not continue past Turn 4 in this milestone.**

For every turn, also note: did the response feel complete, or prompt an immediate "but why/what about" reaction? Request a screenshot **only** if the issue is visual (thread layout, focus labeling, density, navigation) — never for semantic content, and never network/payload inspection.

**If, at any turn, a response looks more decisive, hedged toward approval, or verdict-adjacent than an identical fresh first-turn ask would be — stop the sequence immediately and flag it as a possible authority-firewall defect (class 9) rather than continuing.**

## L. Later planned experiments (not executed yet)

- **Evidence/methodology boundary** (S1-T5, S1-T6, S1-T7) — authority drift within the same session, run only after Turns 1–4 are reviewed.
- **Focus switch** (S2) — Copyright ownership as a new session, then "No, I meant copyrightability" as a correction/focus-switch probe.
- **Focus-leakage check** (S3) — a same-focus follow-up ("why does that matter?") immediately after switching to confirm the old focus's content does not leak in.
- **Correction handling** (folded into S2-T2/T3) — whether a correction resolves as an ordinary new explicit topic mention.
- **Hypothetical control** (S4) — a single fresh-session check that hypothetical/counterfactual requests stay out of scope; explicitly not used as evidence for or against session context either way.

None of these are to be run until Turns 1–4 of Session 1 are reviewed and a decision is made to continue.

## M. Production execution status

**CLI AUTHENTICATED EXECUTION NOT AVAILABLE / PM EXECUTION PENDING.** No Claude Chrome extension is connected to this session; no credential-bypass was attempted, per the absolute non-goals and the Instruction-source boundary. This is the expected, acceptable state for this milestone — pre-registration and the PM script are the complete deliverable.

## N. Documentation

| File | Change |
|---|---|
| **NEW** `08_Platform/implementation/HRR_SESSION_DISCOVERY.md` | this document — pre-registration table, classification framework, composition/authority rules, minimum-context candidates, evidence threshold, gated PM script |
| `HRR_RESEARCH_SESSION_CONTRACT.md`, `HRR_FOLLOWUP_DISCOVERY.md` | one-line pointer to this document (§Q / discovery-plan cross-reference) |
| `PRD_CAH_4G_HRR.md`, `COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md`, `claude.md` | status line addition only |

**Status recorded:** `CAH-4G.13 — SESSION-FOCUSED PRODUCTION DISCOVERY / PRE-REGISTERED / PM EXECUTION PENDING`. Slice A: `CLOSED / PRODUCTION-PROVEN` (unchanged). CAH-4G.12 architecture: **ACCEPTED**. Bounded context: **NOT IMPLEMENTED**. CAH-4G.14: **NOT AUTHORIZED**. Research Log: **FUTURE / NOT AUTHORIZED**. **Runtime changes: NONE.**
