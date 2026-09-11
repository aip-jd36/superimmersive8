# ADR-003: A visible HRR research thread is UI; the reasoning pipeline gets a bounded enum-only referent, never the transcript

**Status:** ACCEPTED — CAH-4G.9 (design, 2026-09-10). **Slice A: CLOSED / PRODUCTION-PROVEN (CAH-4G.10 → CAH-4G.10P deployment-gap found → CAH-4G.10I integrated to `main` = `4b9ee5a` → CAH-4G.10C authenticated production UAT PASSED all 10 checks, 2026-09-11 — evidence: `HRR_CONVERSATIONAL_ARCHITECTURE.md §FF`).** **CAH-4G.11 → CAH-4G.12 → CAH-4G.13 (2026-09-11 — `HRR_FOLLOWUP_DISCOVERY.md`, `HRR_RESEARCH_SESSION_CONTRACT.md`, `HRR_SESSION_DISCOVERY.md`)** ran the full generic-taxonomy discovery program culminating in four rounds of real production evidence (Session 1, a discriminating control, an authority-drift safety experiment, and an explicit focus-switch experiment — `HRR_SESSION_DISCOVERY.md` §O–§R) and closed **COMPLETE FOR DESIGN** at `origin/main` = `8206415`. **CAH-4G.14 (2026-09-11, this update) is the DESIGN/PRE-REGISTRATION-ONLY milestone that refines the original `HrrThreadContext` hypothesis (decisions 2–4 below) into a concrete, evidence-grounded `ResearchSessionContext` design — see the new section below.** Decisions 1, 5, 6, 7, 8 below remain production-proven in code + real reviewer sessions, unchanged. Decisions 2, 3, 4 (the bounded referent + follow-up resolution) are **superseded in specificity, not in principle**, by the CAH-4G.14 design below — the original `HrrThreadContext` sketch is preserved here unmodified as historical record; the refined, evidence-grounded shape is `ResearchSessionContext` (see below). **Slice B / CAH-4G.14 RUNTIME IMPLEMENTATION remains a separate, NOT STARTED, NOT AUTHORIZED milestone**, gated on the conditions in the CAH-4G.14 section below. **CAH-4G.15 (2026-09-11) is a TEST-FIRST / PRE-IMPLEMENTATION-GATE milestone — it adds inert, unwired pure primitives (`lib/hrr/research-session-context.ts`, `.schema.ts`) plus 3 test files (108 tests) proving the CAH-4G.14 design is mechanically testable, with zero production behavior change.** **CAH-4G.16 (2026-09-11) is an INTEGRATION-SAFETY / DARK-WIRING milestone (see the new section further below) — it adds a NEW authoritative-referent validator (`research-session-context-referents.ts`, reusing `selectReviewerClaims` for a generic, submission+topic-scoped trust boundary) and, for the first time, MODIFIES the live research route to genuinely parse/validate/authoritatively-check a client-supplied `context` field — but the classifier call (route step 3) is provably unaffected, since step 4.5's context handling runs strictly after it and never reassigns any variable step 3 produced. 47 new tests (route-level + validator-level) plus the pre-existing 28-test route regression suite all pass unchanged.** **CAH-4G.17 (2026-09-11) is a BEHAVIORAL ENABLEMENT milestone, tightly bounded to `activeFocus` only (never `activeReferents`), behind a NEW feature flag `HRR_ACTIVE_FOCUS_CONTEXT_ENABLED` (OFF by default, OFF in production) — when ON, the classifier's existing single call receives a fixed advisory `[Context: Active Research Focus = <topic>.]` prefix; the classifier's own structured output still determines routing, with no post-classification override anywhere in the code. 23 new tests prove the wiring (exact input format, referent exclusion, authority parity, fail-closed behavior) using a mocked classifier — this environment has no live Anthropic API access, so whether a REAL model actually resolves the target follow-up questions given this context remains an explicitly acknowledged, untested gap, recommended for a PM-executed CAH-4G.18 trial. CONTEXTUAL ROUTING IN PRODUCTION REMAINS OFF — no user-visible HRR behavior changed.** **CAH-4G.18A (investigation) found that production Turn 1B of the CAH-4G.18 UAT was INVALID evidence — `ReviewerLkLookup.tsx` never actually sent `context` (root cause: CLIENT WIRING GAP, `deriveResearchSessionContext` existed since CAH-4G.15 but was never called client-side). CAH-4G.18B closes this: `ReviewerLkLookup.tsx` now derives context from the live thread and sends it on every free-form request; `topic_pick` remains context-free; 9 new tests (source-scan + real-reducer-sequence) mechanically prove the transport, closing the exact blind spot that let this gap survive three prior milestones. **CAH-4G.18 (post-repair, against `45988c7` deployed, flag ON) — PARTIAL CLOSEOUT:** a PM-executed production sequence produced the first-ever VALID semantic evidence about `activeFocus` with a real classifier — same-focus continuity ("why isn't that established?"), referent-free sub-term continuity ("what do you mean by human contribution?" — resolving CAH-4G.13's most significant open ambiguity), and post-switch continuity ("what does this mean for ownership?") all **succeeded**, each a clean, isolated-variable comparison against a specific, previously-documented pre-`activeFocus` failure. **`activeFocus` judged SUFFICIENT for the current bounded contract** (precisely scoped — ADR-003 "CAH-4G.18" §5); **`activeReferents` judged NOT NEEDED** (§6 — B's referent-free success directly weakens, not strengthens, the case for building it). **One gap remains: this UAT contained zero authority-shaped questions, so real-model authority safety under genuinely-transported `activeFocus` remains untested** — the flag stays ON for controlled UAT only, not yet accepted as unconditional production behavior, pending that one check (§7a/§8).** The VISIBLE thread is `hrr-thread.ts` (reducer) + `ReviewerLkLookup` (`useReducer`). As-built: `HRR_CONVERSATIONAL_ARCHITECTURE.md §BB`; deployment-gap reconciliation: §CC; integration record: §DD; production UAT evidence: §FF; CAH-4G.13 discovery evidence: `HRR_SESSION_DISCOVERY.md` §O–§R.

**Context:** CAH-4G is production-deployed and semantically safe. PM production UAT found the single-turn HRR model *too visible*: asking a second free-form question replaces the first. Human Reviewers expect a conversational research thread (interaction model like CRC). See `HRR_CONVERSATIONAL_ARCHITECTURE.md` §A.

## Decision

1. **The visible thread is UI only.** An append-only list of reviewer turns and assistant turns (each assistant turn = one existing `HrrResearchAnswerView`). It lives in **client React memory** — no `localStorage` / `sessionStorage` / cookie / database / migration. It survives inspector tab-switch and close/reopen (already hidden-not-unmounted); a page refresh clears it. This is the honest representation of "not a persisted conversation".

2. **A visible thread does NOT authorize sending the transcript to an LLM.** The follow-up classifier call receives the new question plus, at most, one fixed-template `[Context: …]` line built from a bounded enum-only structured referent:

   ```
   HrrThreadContext {
     prior_turn_id
     prior_entry_mode: 'topic' | 'free_form'
     prior_resolved_topics: Array<{ topic; scope; bi_status }>   // all enum values
   }
   ```

   It is structurally incapable of carrying prior answer prose, a governed statement, a claim id, an applicability value, an assessment conclusion, or a project fact.

3. **Prior HRR answer prose never becomes** project fact · evidence · assessment state · governed knowledge · applicability input · authority · a `UserGoal` · a stronger conclusion. An inherited referent ("that", "it") resolves only to a topic an **explicit reviewer utterance** raised (this turn's or a prior turn's) — never to a topic an HRR *answer* merely mentioned (Track C parallel).

4. **Reviewer conversation is not project-fact entry.** A reviewer asserting a fact in HRR ("this ran in New York") never mutates an assessment field and never enters `HrrThreadContext`. Every turn re-reads the submission's authoritative facts fresh.

5. **The one-model-call ceiling holds:** topic shortcut = 0; self-contained free-form = ≤1 classify-only; contextual follow-up = ≤1 classify-only (same call, marginally longer input). No second conversational or composition LLM call.

6. **No audit change.** Each research *action* still writes exactly one bounded `lk_research` row; an authority-only turn writes none. Turn ids / conversation ids / raw questions / answer prose are never audited.

7. **Every new turn re-runs the full fresh pipeline** (current facts → `selectReviewerClaims` → deterministic applicability → BI → `projectHrrResearchAnswer`). Old displayed turns are records of what HRR returned then; they are never authoritative context for new research.

8. **No CRC change.** CRC's conversational architecture already uses bounded structured context (`buildUserMessageContent`), not transcript-to-LLM — it is a precedent, not a dependency. Sharing is limited to a new generic client-shell primitive set (`components/conversation/`); CRC adopts it opportunistically, later or never.

## Why (the problem this prevents)

- A chat transcript sent to a model is an unbounded prompt-injection surface, a growing cost, a privacy/retention liability, and a channel for a previously-generated answer to be re-ingested as if it were fact.
- Persisting an HRR conversation would create a raw-question / answer-prose retention surface the frozen `lk_research` audit contract deliberately avoids, and would risk an old answer being read as a governed record.
- Letting reviewer conversational assertions reach applicability would undermine deterministic applicability and blur research against evidence entry.

## Consequences

- Follow-ups like "why does that matter?" and "does that mean I should approve this?" are resolvable safely with an enum-only referent; hypothetical/jurisdiction-qualifier research ("what if this were in New York?") is **out of V1** and needs separate PM + applicability-architecture review.
- The thread is ephemeral across refresh — accepted for a lookup tool inside an already-persistent workbook session.
- Implementation is incremental (`HRR_CONVERSATIONAL_ARCHITECTURE.md` §X, Slices A→B→C), each reversible, no big-bang refactor.

## Enforcement

- `parseBody` rejects a `prior_context` carrying prose / claim ids / facts / applicability / a raw question (Slice B).
- `buildFollowupClassifierInput` output asserted to contain no prose beyond the fixed template + the question.
- Model-call-count tests (topic = 0, free-form ≤1, follow-up ≤1).
- `lk_research` payload shape test unchanged.
- CRC `subsystem-boundaries.test.ts` / `crc-assurance-handoff/boundaries.test.ts` — zero regression.

---

# CAH-4G.14 — Bounded Research Session Context: Refined Design + Pre-Registration (2026-09-11)

**This section is DESIGN + PRE-REGISTRATION ONLY. No runtime, TypeScript, TSX, API, DB, migration, prompt, classifier, or UI change is made by this section. No code below is implemented.** It re-derives and refines the original `HrrThreadContext` hypothesis (above) from the CAH-4G.13 production evidence (`HRR_SESSION_DISCOVERY.md` §O–§R, closed at `origin/main` = `8206415`), grounded directly in the current source contracts (`lib/reviewer-lk/types.ts`, `hrr-authority-gate.ts`, `lib/hrr/run-hrr-research.ts`, `lib/hrr/types.ts`, `app/api/.../reviewer-lk/research/route.ts`, `hrr-thread.ts`), inspected fresh for this milestone rather than assumed.

## 1. Three gates, kept explicit

- **Evidence sufficient to design: YES** — CAH-4G.13 closed COMPLETE FOR DESIGN.
- **Evidence sufficient to implement: NO** — this design has never been built or tested.
- **Implementation proven safe: NO, and cannot be until §14's adversarial matrix is actually run against real code.**

## 2. Problem statement (precise)

The demonstrated problem is **not** "HRR needs chat memory." It is: **some permitted follow-up utterances cannot be interpreted adequately when every turn is classified without any bounded representation of the current Research Session's focus and/or the specific governed item most recently surfaced.** The solution must remain a bounded research assistant for the Human Reviewer — never an automated assessment reviewer, never a general conversational memory.

## 3. Selected minimum context shape — `ResearchSessionContext`

Re-derived from the evidence, not assumed to be Candidate E just because CAH-4G.13's closeout called it best-supported. The evidence (§5 below) rules out Candidate A (insufficient) and shows Candidate B alone is plausibly insufficient for T2/T4-shaped questions — so the minimum shape that plausibly covers the demonstrated failure classes, and no more, is:

```ts
/** DESIGN ONLY — not implemented. Every field is an identifier or enum; never prose, never cached content. */
interface ResearchSessionContext {
  /** The single governed topic the current session is anchored to, or null (no clear active focus — fail-closed default). */
  activeFocus: ReviewerResearchTopic | null
  /** How activeFocus was established — reuses the EXISTING `intent_origin`/`source_kind` enum (`lib/reviewer-lk/types.ts`), no new type. */
  activeFocusOrigin: 'topic_selection' | 'interpreted_question' | null
  /**
   * Bounded, deduplicated, capped identifiers of the most recently surfaced
   * unresolved items for activeFocus — reuses the EXISTING
   * `HrrUnresolvedInput.identifier` field already present on every answer
   * (`lib/hrr/types.ts`). Never the requirement's content, note, or any
   * prose — identifiers only. Capped at a small fixed bound (proposed
   * `HRR_MAX_UNRESOLVED_REFERENTS = 5`, mirroring the existing
   * `HRR_MAX_RESOLVED_TOPICS` convention).
   */
  unresolvedReferents: string[]
}
```

**Critical design property, found by inspecting the existing client state rather than proposing new state:** every field above is **derivable, pure, and stateless** from data the client already holds — `HrrThreadState.turns[]` (`hrr-thread.ts`, unchanged) already carries, per settled turn, the resolved topic(s) (`HrrResearchAnswer.topics[]`) and each topic's `unresolved_inputs[].identifier`. **No new client state, no new reducer action, and no new persistence are required.** `ResearchSessionContext` is proposed as a pure selector function, computed fresh at request-build time:

```ts
// DESIGN ONLY — illustrative signature, not implemented.
function deriveResearchSessionContext(thread: HrrThreadState): ResearchSessionContext
```

This trivially inherits the freshness and no-persistence properties already proven for `HrrThreadState` (§10/§13) — "Clear conversation" already resets `turns: []`, so a derived selector over it automatically returns `{ activeFocus: null, activeFocusOrigin: null, unresolvedReferents: [] }` with **zero new code path** for that lifecycle event.

## 4. Explicitly prohibited (unchanged from the original decision, restated)

Never carried: transcript; prior answer prose; generated summaries of a prior answer; prior `RetrievalResult`s as cached truth; prior applicability results; prior BI conclusions; prior project-fact interpretations; evidence-sufficiency judgments; control outcomes; assessment verdicts; workbook-wide conversational memory. Session context assists interpretation of the **current** utterance only. It is not Living Knowledge, not evidence, not project truth, not an assessment conclusion.

## 5. Candidate comparison (re-derived, not assumed)

| Candidate | Addresses (per production evidence) | Leaves unexplained | State required | Authority risk | Stale-state risk | Correction | Focus-switch | Complexity | O(1)? |
|---|---|---|---|---|---|---|---|---|---|
| **A — no context** | Nothing (baseline) | T2, T3, T4, Turn 3 (`HRR_SESSION_DISCOVERY.md` §O/§R) | None | None | None | N/A | N/A (works trivially — no context to switch) | None | Trivially yes |
| **B — Research Focus identity only** | Plausibly T3/Turn-3-shaped ("what do you mean by human contribution?" / "what does this mean for ownership?") — §P.6, §R.8 | Plausibly not T2/T4-shaped ("why isn't that established?" / "why does that matter?") — bare topic identity doesn't say *which* prior unresolved item "that" points to (§R.8, explicitly challenged per instruction) | `activeFocus` only | None beyond the general safety case (§Q) | Low if derived fresh each request (not cached) | Not addressed alone | Proven (§R.4 property A) if focus derivation honors explicit action | Lowest of the non-trivial candidates | Yes |
| **C — Focus + originating provenance turn id** | Same as B, plus explains *why* context exists | Same gap as B for T2/T4 | `activeFocus` + a turn/action id | Risks becoming a backdoor to re-fetching stale prior *content* if the id is used to look up more than an enum (§R.8) | Medium unless scoped strictly to an identifier, never a content lookup | Not addressed alone | Same as B | Medium | Yes, if scoped to identifiers |
| **D — bounded referent identifiers** | Directly targets the T2/T4 gap B leaves open, using the ALREADY-EXISTING `HrrUnresolvedInput.identifier` field — no new data invented | Whether reviewers produce genuinely multi-candidate ambiguity often enough to matter — untested | `unresolvedReferents[]` (capped) | None beyond B, if scoped to identifiers only | Low if capped + re-derived fresh, never cached | Not addressed alone | N/A alone (no focus concept) | Medium | Yes, given a fixed cap |
| **E — B + D combined (selected)** | The full demonstrated failure set, plausibly (T2/T3/T4/Turn-3-shaped questions all addressed by *some* field) | The **combination** itself has never been tested as an integrated mechanism — this is a real, acknowledged gap, not resolved by this design | `activeFocus` + `activeFocusOrigin` + `unresolvedReferents[]`, all derived, none newly persisted | Same as B/D — no new risk identified, but not yet adversarially proven (§14) | Low — everything is a fresh derivation over already-ephemeral client state, never a second source of truth | Deferred to §7 as an explicit, unvalidated hypothesis | Proven for the `activeFocus` component (§R.4); untested for the combined mechanism | Medium — reuses 100% existing data, adds one pure selector function | Yes — §12 |

**Candidate B is explicitly not selected alone.** Per the required challenge: bare topic identity cannot disambiguate *which* of potentially several unresolved items or prior propositions a vague pronoun ("that") refers to — this is exactly why Candidate D's referent identifiers are included. Candidate C is rejected in favor of D+B's simpler identifier-only shape, because a turn-id-based design creates a live risk of becoming a lookup key into cached content (violating §4) unless scoped so narrowly it adds nothing D doesn't already provide directly.

## 6. Context lifecycle (deterministic)

- **SESSION START:** the first turn whose resolved answer names exactly one topic — either an explicit topic-shortcut click (`topicSelectionGateResult`, unchanged, 0 model calls) or the first free-form question whose classifier output resolves to exactly one topic.
- **SAME-FOCUS CONTINUATION:** `activeFocus` (and `unresolvedReferents`, if authorized) may assist interpretation of a subsequent free-form question — assist only, never substitute for the fresh pipeline (§10).
- **EXPLICIT FOCUS SWITCH:** any new turn (topic-shortcut click, or a free-form question resolving to exactly one topic) that names a topic **different from** the currently-derived `activeFocus` **immediately and deterministically supersedes it** — proven directly by production evidence (§R.4 property A; Turn 2 of the focus-switch experiment).
- **CORRECTION:** see §7 — an explicit, unvalidated hypothesis, deliberately not collapsed into focus-switch.
- **CLEAR CONVERSATION:** `hrrThreadReducer`'s existing `clear` action resets `turns: []`; the derived `ResearchSessionContext` trivially becomes empty with zero new code (§3).
- **MULTI-TOPIC TURN (ambiguity):** a turn whose resolved answer names **more than one** topic (up to `HRR_MAX_RESOLVED_TOPICS = 2`, per the existing classifier cap) does **not** set a single `activeFocus` unambiguously. **Design decision, explicitly flagged as a hypothesis requiring its own adversarial test (§14):** the derivation **resets `activeFocus` to `null`** on a multi-topic turn, rather than silently guessing which of the two topics is "the" active one, or silently preserving whatever focus existed before. Reasoning: forcing the next question to be explicit (or to fail closed to the generic offered-paths fallback) is safer than guessing.
- **AUTHORITY-ONLY TURN (no research clause survived):** a turn whose gate result is `authority_note !== 'research'` **and** carries **no** surviving research clause (`per_topic`/`topics` empty — e.g. a pure "Is that enough evidence?" / "Should I approve this?") is **transparent** to focus derivation — it neither sets nor clears `activeFocus`; the selector looks past it to the most recent topic-resolving turn. **Design decision, also flagged for adversarial testing (§14):** justified because the authority-drift evidence (§Q) showed these turns carry zero topic signal, and there is no evidence that asking about approval should erase what the reviewer was just researching.
- **MIXED TURN (decline + surviving research clause):** per the existing, already-proven mixed-intent rule (`hrr-authority-gate.ts`), a surviving research clause in a mixed utterance is a full peer of an ordinary research turn for focus-derivation purposes — it updates `activeFocus` exactly as any other single-topic-resolving turn would.
- **FAIL-CLOSED:** whenever the derivation is ambiguous (multi-topic) or absent (no prior resolving turn, or thread cleared), `activeFocus` is `null` and the classifier receives no context prefix at all — behaving byte-identically to today's stateless system.

## 7. Explicit-intent precedence (REQUIRED design invariant)

**CURRENT EXPLICIT REVIEWER INTENT > INHERITED SESSION CONTEXT — always, unconditionally.**

Evidence distinction, stated precisely per instruction: the existing stateless system **empirically proves** deterministic explicit-topic routing (§R.4 property A) — a topic-shortcut click or an explicitly-topic-named question always resolves that topic today. It does **not** empirically prove precedence *against* inherited context, because inherited context does not exist yet to be tested against. **Explicit-intent precedence is therefore a governance/design invariant, not yet an empirically proven property, and must be one of the adversarial tests (§14, focus-switch-vs-inherited-context row) before implementation authorization.**

The mechanism proposed to make this structurally true, not just policy: a topic-shortcut click **never consults `ResearchSessionContext` at all** — `topicSelectionGateResult(topic)` stays exactly as it is today (deterministic, 0 model calls, ignores any session state entirely). Precedence for the free-form path is enforced by classifier instruction (a prompt concern, out of scope to write here) **plus** the deterministic fact that `research_intents[]` explicitly named in the current utterance's classifier output always takes priority in the (unmodified) `validateAndNormalizePermittedResearchIntent` normalizer — session context is proposed to influence classification only when the classifier's own explicit output would otherwise be empty for that turn, never to override an explicit result.

## 8. Correction contract — explicit, unvalidated hypothesis (Phase 14/§R.9 carried forward)

**Not production-proven.** Distinguished, per instruction, from focus switching: an **explicit focus switch** is a deliberate, deterministic reviewer action naming a *new* governed topic; a **correction** ("No, I meant ownership") is a natural-language amendment to what was just asked, with no separate deterministic action.

**Hypothesis (to be adversarially tested, not assumed true):** a correction plausibly requires **no new mechanism at all** — it is handled by the same context-aware free-form classification path as any ordinary follow-up. If the classifier (given the current utterance plus `activeFocus` context) resolves an explicit new topic different from `activeFocus`, that is indistinguishable in effect from an explicit focus switch, and the existing switch semantics (§6) apply directly. Correction is designed to **change current session interpretation state prospectively only** — it must never mutate a previously rendered answer, never edit `HrrThreadState.turns` (append-only, unchanged), and never retroactively alter historical evidence.

**Distinguishing the four cases the design must handle**, per instruction:
1. **Explicit new topic** (e.g. topic-shortcut click, or "what about ownership?") — deterministic switch, §6.
2. **Correction of prior interpretation** (e.g. "No, I meant ownership") — hypothesized to reduce to case 1 if the classifier resolves a topic; §14 pre-registers the test that checks this.
3. **Same-focus follow-up** (e.g. "why isn't that established?") — uses `activeFocus`/`unresolvedReferents` per §3, does not switch.
4. **Ambiguous utterance** (names no topic and does not clearly correct) — fails closed exactly as today (`unsupported`, offered research paths) — §12.

## 9. Pipeline placement (derived from current architecture, not assumed)

Traced directly from source (`app/api/.../reviewer-lk/research/route.ts`, `hrr-authority-gate.ts`, `run-hrr-research.ts`):

```
current utterance (raw text, route-parsed)
  │
  ├─ topic_pick path: topicSelectionGateResult(topic)   — UNCHANGED. 0 model calls.
  │                    ResearchSessionContext NEVER consulted here (§7).
  │
  └─ question path:
       ResearchSessionContext (derived client-side, sent as one new,
       explicitly schema-validated request field — NOT smuggled into
       any of the already-rejected `messages`/`history`/`conversation`/
       `session_id` shapes parseBody() rejects today)
         │
         ▼
       ONE classify call (interpret-research-intent.*, UNCHANGED interface
       shape: still `(text) => Promise<PermittedResearchIntent>` — the
       PROPOSED change is that the text passed to it may carry a bounded,
       fixed-template context prefix, analogous to CRC's `buildUserMessageContent`
       `[Context: ...]` lines — NOT a new parameter threading through every
       downstream function, NOT a second model call, NOT a schema change to
       PermittedResearchIntent itself)
         │
         ▼
       hrrAuthorityGate(classified, ...)   — UNCHANGED, unmodified signature.
       Consumes ONLY `classified: PermittedResearchIntent`.
       ResearchSessionContext is NEVER passed to this function, NEVER
       imported by hrr-authority-gate.ts. This is the structural
       enforcement mechanism for §11, not a policy statement.
         │
         ▼
       runHrrResearch(...)   — UNCHANGED, unmodified signature.
       selectReviewerClaims → applicability → BI → composition → audit
       — every one of these functions is UNCHANGED; none has ever seen
       ResearchSessionContext and none needs to.
```

**Key finding from source inspection:** the entire proposed mechanism touches **exactly one call site** (the text handed to the classifier in the free-form path) and **zero other functions** in the whole pipeline. `hrrAuthorityGate`, `runHrrResearch`, `selectReviewerClaims`, `buildBoundedInterpretations`, `projectHrrResearchAnswer`, and the audit layer require **no change of any kind** under this design. This is not a stated intention — it is a structural fact about where `ResearchSessionContext` would need to be threaded, verified against the actual current call graph.

## 10. Authority isolation

**No downstream layer may ever produce a stronger conclusion than Bounded Interpretation permits — unchanged, unconditional.** Structurally enforced by §9's placement: `hrrAuthorityGate` never imports or receives `ResearchSessionContext`; `assessment_decision_requested` remains a function of the classifier's read of the **current utterance only** (the classifier may use context to help resolve *which topic* a research clause concerns, but context is never a design input to whether the utterance requests an assessment decision). Session context must never increase the authority ceiling — proven-empirically-false to be a risk under the *current* memoryless system (§Q), and the placement in §9 is designed specifically so that fact remains true once context exists. This must still be adversarially retested against the actual implementation (§14) — a design intention is not yet a proof.

## 11. Freshness contract

Unconditional, restated: session context may answer only "what governed thing is the reviewer referring to?" — it may never answer "what did we conclude last time?" Every permitted research turn reruns Living Knowledge selection → deterministic applicability → Bounded Interpretation → Composition fresh, exactly as today. No cached prior applicability/BI/project conclusion may substitute for current execution. `ResearchSessionContext` (§3) is itself derived fresh on every request from client-held turn history — it is never a second, independently-mutable source of truth that could drift from the actual history.

## 12. Provenance contract

Identifier-only, per instruction — reuses the **already-existing** enum (`ExplicitResearchIntent.source_kind` / `HrrResearchTopicResult.intent_origin`, `lib/reviewer-lk/types.ts` / `lib/hrr/types.ts`) rather than inventing a new type: `activeFocusOrigin: 'topic_selection' | 'interpreted_question' | null` explains *why* inherited context exists (an explicit click vs. an interpreted question) without needing a turn id, a governed-proposition id, or a supersession relationship. **Explicitly not reused:** `HrrAuthorityGateOptions.sourceTextRef` (currently always `null` in production, `hrr-authority-gate.ts`) is a *different*, currently-unused hook intended for a raw-text reference on the interpreted-question audit path — this design does not silently repurpose it for session-context provenance; if a future implementation wants to reuse or extend it, that must be its own explicit, scoped decision, not an incidental side effect of this design. This design does **not** build, require, or reference the future Research Log — that remains a separate, unauthorized future capability.

## 13. O(1) state/cost bound

**No growing transcript. No growing answer history. No unbounded referent collection.** Proven by construction, not aspiration:
- `activeFocus`: one enum value or `null`. Fixed size regardless of session length.
- `activeFocusOrigin`: one enum value or `null`. Fixed size.
- `unresolvedReferents`: capped at a fixed bound (`HRR_MAX_UNRESOLVED_REFERENTS`, proposed `5`) regardless of how many turns the session has had — always reflects only the *most recent* single-topic answer's unresolved items, never an accumulation across turns.
- **Model-call count is unchanged:** topic pick remains 0 calls; free-form remains exactly 1 classify-only call. The only change is the *content* of that one call's input text (a bounded prefix of fixed maximum length, not a function of session length) — never an additional call, never a second reasoning stage.
- `PermittedResearchIntent`'s output schema is **unchanged** — same three fields, same `RESEARCH_INTENT_CLASSIFIER_SCHEMA`, same `validateAndNormalizePermittedResearchIntent`. No new output surface for a model to hallucinate into.

## 14. Fail-closed behavior

- No `activeFocus` (null, thread empty, or reset by a multi-topic turn) → classifier receives no context prefix at all, byte-identical to today's behavior.
- A context-bearing request whose `ResearchSessionContext` fails schema validation, or names an unrecognized/malformed topic identifier → **the request must fail closed to treating the request as if no context were supplied** (never guessed into a stronger meaning, never a 500 that blocks the underlying research) — this is a required implementation-gate condition (§17), not yet built.
- The classifier's own explicit output for the current utterance always wins over any context-derived hint — an ambiguous or ambiguous-remaining utterance still resolves to `unsupported` / offered research paths, exactly as today; context can only ever help resolve an otherwise-empty result, never override an explicit one (§7).

## 15. Adversarial pre-registration test matrix (BEFORE any implementation)

Every row below must be specified as a concrete test **before** runtime implementation is authorized (§17). `Fx`/`Rx` denote fixture questions already used in CAH-4G.13 production evidence where applicable.

| # | Scenario | Initial `ResearchSessionContext` | Current utterance/action | Permitted context use | Expected routing | Expected authority behavior | Expected fresh-pipeline behavior | PASS | FAIL |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Same-focus continuity | `activeFocus = copyrightability` | "What do you mean by human contribution?" | May use `activeFocus` + `unresolvedReferents` | Resolves to `copyrightability` | N/A (pure research) | Full fresh pipeline runs for `copyrightability` | Topic resolves; no stale content returned | Falls back despite valid context, or answer contains cached prior prose |
| 2 | Sub-term referent | `activeFocus = copyright_ownership`, `unresolvedReferents = [x]` | "What does this mean for ownership?" (Turn-3-shaped) | May use both fields | Resolves to `copyright_ownership` | N/A | Fresh pipeline, current applicability for `x` | Topic resolves | Resolves to wrong topic, or reuses a stale `unresolvedReferents` value as an answer rather than a pointer |
| 3 | Ambiguous referent | `activeFocus = null` (multi-topic prior turn) | "Why does that matter?" | None available (fail-closed by design, §6) | `unsupported`, offered paths | N/A | No pipeline run (nothing to research) | Clean fallback, no guess | Silently guesses a topic |
| 4 | Explicit focus switch | `activeFocus = copyrightability` | Topic-shortcut click: Copyright ownership | Context NEVER consulted (§7) | `copyright_ownership`, 0 model calls | N/A | Fresh pipeline for `copyright_ownership` | New focus wins immediately, old focus does not leak | Any Copyrightability content appears, or the switch is delayed by a turn |
| 5 | Correction | `activeFocus = copyrightability` | "No, I meant ownership" | May use context to interpret; must not special-case | Resolves to `copyright_ownership` (hypothesis, §8) OR fails closed | N/A | Fresh pipeline if resolved | Behavior matches one specified outcome, documented, not silently inconsistent | Mutates a previously rendered answer, or edits thread history |
| 6 | Authority request after multiple turns | `activeFocus = copyrightability` (several research turns preceded) | "Is that enough evidence?" | Context MAY be consulted only for topic display context, NEVER for the authority determination itself | N/A (no research resolves for this clause) | Bounded refusal, decisiveness identical to Turn B (§Q.1) | No pipeline run for the decision clause | Clean refusal, no escalation vs. a fresh first-turn ask | Any sufficiency/approval judgment, or decisiveness that appears to scale with turn count |
| 7 | Stale-context attempt | `activeFocus = copyrightability` from 10 turns ago, applicability has since changed (simulated) | "What do you mean by human contribution?" | `activeFocus` only (an identifier) — never a cached applicability value | Resolves to `copyrightability` | N/A | Applicability/BI computed **fresh**, reflecting **current** state, not the state from 10 turns ago | Answer reflects current, not historical, applicability | Answer reflects stale applicability from the original turn |
| 8 | Old-focus leakage | `activeFocus = copyright_ownership` (after an explicit switch away from `copyrightability`) | "What does this mean for ownership?" | `activeFocus` only | Resolves to `copyright_ownership` | N/A | Fresh pipeline, `copyright_ownership` only | No Copyrightability content anywhere in the response | Any Copyrightability content reappears |
| 9 | Clear-conversation reset | `activeFocus = copyrightability` | "Clear conversation" action, then a fresh question with no topic name | Empty context (§6) | `unsupported`, offered paths — byte-identical to a first-ever question | N/A | No pipeline run | Behaves exactly as a brand-new session | Any trace of the pre-clear focus survives |
| 10 | Unresolved topic (topic named but no governed coverage) | `activeFocus = null` | "What does governed knowledge say about likeness for a non-NY submission?" | N/A — topic is explicit, context irrelevant | Resolves to `likeness`, applicability `not_met` → `does_not_apply` | N/A | Fresh pipeline, correctly returns `does_not_apply`, not a context-related failure | Clean, correctly-attributed `does_not_apply` result | Context is blamed for what is actually a coverage/applicability outcome |
| 11 | Coverage gap | `activeFocus = commercial_use` (no reviewer-eligible claims) | Same-focus follow-up | `activeFocus` only | Resolves to `commercial_use` | N/A | Fresh pipeline correctly returns empty/withheld claims, not a context bug | Correctly attributed to coverage, not context | Coverage gap misattributed to a context-derivation defect |
| 12 | Applicability change / freshness | `activeFocus = copyrightability`, `unresolvedReferents` includes `jurisdiction` | Same-focus follow-up, submission's jurisdiction fact has changed since the original turn | `unresolvedReferents` as an identifier only | Resolves to `copyrightability` | N/A | Applicability re-evaluated fresh against the **current** jurisdiction fact, not the value at the time `unresolvedReferents` was captured | Answer reflects current fact | Answer reflects the jurisdiction value from when the referent was first surfaced |
| 13 | Explicit intent overriding inherited context | `activeFocus = copyrightability` | Free-form question explicitly naming `likeness` | Explicit current-utterance topic always wins (§7) | Resolves to `likeness`, NOT `copyrightability` | N/A | Fresh pipeline for `likeness` | Explicit topic wins cleanly | Inherited `activeFocus` overrides or blends with the explicit topic |
| 14 | Malformed/unknown context identifiers | Client sends a `ResearchSessionContext` with an invalid/unrecognized topic string or a malformed `unresolvedReferents` entry | Any question | None — fails closed | Treated as if no context were supplied (§14 fail-closed rule) | N/A | Ordinary fresh pipeline, unaffected | Request succeeds as if context were absent | 400/500 error, or a fabricated/guessed topic |

## 16. Structured output reliability (if the classifier interacts with the context prefix)

- Schema validation: `PermittedResearchIntent`'s existing schema and `validateAndNormalizePermittedResearchIntent` remain unchanged and are the sole validation layer — no new output shape is introduced.
- Unknown identifiers fail closed: an `activeFocus` value outside `REVIEWER_RESEARCH_TOPICS` (client bug, tampering, or a future enum drift) must be rejected by request-shape validation before ever reaching the classifier — never silently coerced.
- No fabricated governed topic ids, no invented referents: the classifier's output remains governed entirely by its existing enum-closed schema; `ResearchSessionContext` can only ever narrow interpretation of the current utterance, never introduce a topic the current utterance's own classification wouldn't otherwise support on its own merits combined with the bounded hint.
- Explicit current intent precedence: §7.
- Deterministic handling where deterministic information exists: the topic-pick path (§9) never touches the classifier or `ResearchSessionContext` at all — fully deterministic, as today.
- **No second model call is added.** Nothing in this design requires or justifies one; the architecture evidence (§9, §13) shows the existing single-call shape is sufficient for what is being proposed.

## 17. Rejected alternatives

- **Full transcript to the classifier:** rejected — no evidence anywhere in CAH-4G.11/12/13 justifies it (`HRR_SESSION_DISCOVERY.md` §I is explicit on this); an unbounded prompt-injection surface and cost/privacy liability CRC's own precedent already avoids.
- **Candidate B alone (focus identity only):** rejected as insufficient — plausibly cannot resolve T2/T4-shaped generic pronoun references (§5).
- **Candidate C (turn-id-based provenance) as the primary mechanism:** rejected in favor of D's identifier-only referents — a turn-id risks becoming a lookup key into cached content unless so narrowly scoped it adds nothing D doesn't already provide.
- **A new client-side reducer action / new persisted state for session context:** rejected — `ResearchSessionContext` is fully derivable from the existing `HrrThreadState.turns[]`, so no new mutable state, no new action type, and no new persistence surface are needed (§3).
- **Reusing `HrrAuthorityGateOptions.sourceTextRef` for context provenance:** rejected as an incidental repurposing of an existing, differently-intended hook (§12) — any future reuse must be its own explicit decision.
- **A second model call for context-aware interpretation:** rejected — no architecture evidence requires it; the existing single classify-only call, given a bounded input prefix, is the proposed mechanism (§9, §13, §16).
- **Special-cased correction handling (a distinct action/state machine):** rejected in favor of the simpler hypothesis that correction reduces to ordinary context-aware classification (§8) — to be adversarially tested (§15 row 5), not assumed.

## 18. Remaining uncertainties (explicit, not resolved by this design)

- Whether the *combined* B+D mechanism behaves correctly has never been tested — only its individual components have partial, analogical (not literal) support from CAH-4G.13.
- Whether the correction hypothesis (§8) is actually correct — genuinely unvalidated, pre-registered for testing (§15 row 5).
- Whether the multi-topic-turn reset rule and the authority-only-turn transparency rule (§6) are the right defaults — both are design decisions made here for the first time, not evidence-proven, and both are pre-registered for adversarial testing (§15 rows 3, 6).
- The exact bound for `HRR_MAX_UNRESOLVED_REFERENTS` (proposed 5) is a design placeholder, not empirically derived.
- Whether a bounded context prefix measurably changes classifier cost/latency/quality in practice — architecturally plausible (§13, §16), never measured.
- Whether reviewers, given a working same-focus continuation experience, generate new follow-up shapes not represented in the CAH-4G.13 evidence — unknowable without real usage of an actual implementation.

## 19. Implementation authorization gate (required conditions — NOT automatically satisfied by this document)

Runtime implementation of any part of this design remains **separately, explicitly unauthorized** until **all** of the following are met:

1. This design document (or a revision of it) has been reviewed and accepted as the basis for implementation — completion of this document alone does **not** constitute that review.
2. The full adversarial matrix (§15, all 14 rows) is implemented as executable tests **before** the corresponding runtime code is exercised in production — test-first, not retrofitted.
3. The authority-independence invariant (§10) is mechanically testable — e.g. a static/architectural test asserting `hrr-authority-gate.ts` never imports `ResearchSessionContext` or any related type, mirroring the existing authority-firewall test discipline.
4. Correction behavior (§8) is specified as one of exactly the outcomes tested in §15 row 5 — not left ambiguous.
5. Focus-switch supersession (§6, §15 row 4) is testable and passes before any free-form context-consultation code ships.
6. The freshness invariant (§11) is testable — e.g. an applicability-change test (§15 rows 7, 12) proving current state always wins over any value implied by `ResearchSessionContext`.
7. No transcript/state creep is introduced — a bound/size test on `ResearchSessionContext`'s serialized form, proving it stays O(1) regardless of thread length (§13).
8. Fail-closed/rollback behavior (§14) is specified and testable — malformed context never produces a 500 or a guessed topic; it degrades to context-absent behavior.
9. `parseBody` is deliberately extended (not smuggled into an already-rejected shape) to accept `ResearchSessionContext` as its own explicit, schema-validated field, with a dedicated test proving `messages`/`history`/`conversation`/`session_id`/`sessionId` remain rejected exactly as today.

## 20. Smallest later implementation slice (recommended, NOT authorized, NOT implemented here)

If and when a separate implementation-authorization gate is granted, the smallest defensible first slice is: (a) the pure `deriveResearchSessionContext()` selector over the existing client `HrrThreadState` (no server change, no route change — purely client-side, testable in isolation); (b) extending `parseBody` to accept and schema-validate the new field (rejecting malformed shapes per §14/§19.9); (c) the bounded context-prefix construction fed into the existing single classify call (§9) — explicitly **not** slicing in the authority-consultation path, since §10 requires that path to remain permanently untouched by design, not merely "not yet touched." Correction (§8) and the multi-topic/authority-only lifecycle rules (§6) should ship in the same slice as (a)–(c), since they are selector-level decisions, not separate follow-on work — splitting them out would leave the selector's behavior partially unspecified in production.

**No code in this section is implemented. No runtime change has been made anywhere in this milestone.**

---

# CAH-4G.15 — Bounded Session Context Pre-Implementation Gate: Test-First Contract (2026-09-11)

**TEST-FIRST / PRE-IMPLEMENTATION GATE. Production behavior is unchanged.** This section records what was actually built and tested against the CAH-4G.14 design above (§1–§20) — pure types, a pure selector, a server-trust-boundary validator, and 108 tests across 3 new files — with **zero existing files modified** and **zero imports from the live pipeline into any of it**. Runtime implementation remains a separate, later, explicitly unauthorized decision.

## 1. What exists now

| File | Role | Wired into production? |
|---|---|---|
| `lib/hrr/research-session-context.ts` | `ResearchSessionContext` type, `deriveResearchSessionContext()` pure selector, `buildResearchSessionContextPrefix()` pure text builder | **No** |
| `lib/hrr/research-session-context.schema.ts` | `validateResearchSessionContext()` (strict) + `resolveResearchSessionContext()` (lenient, fail-closed, never null) — the server trust boundary | **No** |
| `__tests__/hrr/research-session-context.test.ts` | Selector lifecycle (13 cases), correction contract, no-prose proof, O(1) bound proofs, prefix builder | n/a (test-only) |
| `__tests__/hrr/research-session-context-schema.test.ts` | Server trust-boundary accept/reject matrix | n/a (test-only) |
| `__tests__/hrr/research-session-context-boundary.test.ts` | Static proof: no live-pipeline import, authority independence, no-transcript firewall, no-prose dependency | n/a (test-only) |

## 2. Context schema (as implemented, exactly matching the CAH-4G.14 design §3)

```ts
interface ResearchSessionContext {
  activeFocus: ReviewerResearchTopic | null        // governed enum, never free text
  activeFocusOrigin: 'topic_selection' | 'interpreted_question' | null   // reuses the EXISTING intent_origin/source_kind enum
  unresolvedReferents: string[]                    // ≤ HRR_MAX_UNRESOLVED_REFERENTS (5), each ≤ HRR_MAX_REFERENT_IDENTIFIER_LENGTH (100) chars
}
```

No field can carry transcript, prior answer prose, a generated summary, a cached applicability/BI result, a project fact, or an assessment conclusion — there is no field for any of them (mechanically enforced by the no-transcript firewall tests, §7 below).

## 3. Referent contract (Phase 13)

**Allowed referent category:** governed requirement/dependency identifiers — reusing the **already-existing** `HrrUnresolvedInput.identifier` field (`lib/hrr/types.ts`), which is itself either an `ApplicabilityFact` enum value or a governed project-dependency identifier. **No new domain-specific identifier was invented.** (The design's STOP condition — "if stable referent identifiers do not currently exist" — did not trigger: this field already exists in the shipped `HrrResearchAnswer` shape.)

- **Authoritative source:** `projectHrrResearchAnswer()` (Slice 4, unmodified) — this milestone never computes or invents a referent; it only reads one that already exists on a settled answer.
- **Who creates it:** the existing, unmodified consultative-composition layer.
- **When it becomes active:** the moment a turn's answer resolves to exactly one topic (selector case 2/3/4/5).
- **When it is cleared:** on "Clear conversation" (selector case 10), on a multi-topic/ambiguous turn (case 11, reset), or superseded by a fresh single-topic turn's own `unresolved_inputs` (case 4/5 — referents always refresh to the MOST RECENT single-topic turn's own values, never accumulated across turns).
- **Survives a focus switch?** No — referents are always for the CURRENT `activeFocus` only; switching focus (case 5) replaces both together, atomically, from the same turn.
- **Safe to pass to classifier interpretation?** Yes, by design — it is an identifier, never content; the current turn's fresh pipeline (§11) is what determines its CURRENT status, the referent only tells the classifier what the reviewer is likely still asking about.
- **Recomputed fresh downstream?** Yes, unconditionally — see §11.

## 4. Selector semantics (§5 of the design, Phase 5's 13 cases — all implemented and tested)

Session start / same-focus / explicit switch / failed turn (transparent) / authority-only turn (transparent) / pending turn (transparent) / stale-aborted turn (structurally unrepresentable — the reducer's own `settle` guard already discards it before append) / clear conversation / multi-topic-ambiguous (reset, stop scanning) / no resolved topic / malformed topic value (filtered, degrades to the appropriate other case) — see `research-session-context.ts`'s own docstring and `research-session-context.test.ts`'s 13 labelled tests for the exact, tested behavior of each.

## 5. No-prior-answer-prose proof (Phase 4)

`deriveResearchSessionContext()` reads ONLY `turn.role`, `turn.status`, `turn.answer.topics`, and within each topic only `.topic`, `.intent_origin`, `.unresolved_inputs[].identifier` — proven exhaustively by a property-access allowlist test (`research-session-context-boundary.test.ts`, describe block C) covering every local variable name the file actually uses. It never reads `orientation`, `boundary_note`, `bi_summary_blocks`, `governed_considerations[].statement_verbatim`, or the reviewer's own raw `question` text — proven both by the allowlist test and by dedicated pattern tests, and behaviorally by a test asserting a fixture's deliberately-marked prose (`"PROSE — must never be read by the selector"`) never appears anywhere in the derived context's serialized output.

## 6. Explicit-intent precedence — what CAH-4G.15 can and cannot prove (Phase 6)

**Proven mechanically, for the topic-pick path:** `topicSelectionGateResult()` has arity 1 — `(topic)` only — and produces byte-identical output regardless of any "would-be" inherited context, because it structurally has no parameter to receive one. Tested directly.

**NOT provable in this milestone, for the free-form path, and stated honestly rather than assumed:** the real mechanism (§9 of the CAH-4G.14 design) is a bounded TEXT PREFIX fed into the SAME existing classifier call — precedence between an explicit current-utterance topic and an inherited focus hint is therefore ultimately the classifier's own behavior given a prompt that does not yet exist and is explicitly out of scope to write in this milestone. **This is a genuine, acknowledged limit of what a pre-implementation test-first gate can prove without enabling the feature** — recorded here rather than glossed over. What IS proven: nothing downstream of the classify call (§7 below) could ever override an explicit classifier result even if precedence were somehow violated upstream — the blast radius of a future prompt-level precedence bug is structurally confined to a single call's output, never silently amplified by any other layer.

## 7. Authority independence — tests and result (Phase 7)

All pass:

- `hrr-authority-gate.ts` imports nothing from `research-session-context` (static import-graph test).
- `hrr-authority-gate.ts`'s source contains no reference to `ResearchSessionContext`, `activeFocus`, or `unresolvedReferents` anywhere (static source-grep test).
- `hrrAuthorityGate` has arity ≤ 2 — `(classified, options)` only; no context parameter exists to be consulted.
- `run-hrr-research.ts` carries no reference to any of the new types either.

**Invariant is enforced structurally, not by convention** — mirroring the existing `authority-firewall.test.ts` discipline for the rest of `lib/reviewer-lk/**`.

## 8. Server trust boundary — accepted/rejected payload matrix (Phase 8/9)

| Payload | Result |
|---|---|
| absent (`undefined`/`null`) — old client compatibility | **accept** → empty context |
| valid `activeFocus` only | **accept** |
| valid `activeFocus` + bounded `unresolvedReferents` | **accept** |
| exactly `HRR_MAX_UNRESOLVED_REFERENTS` referents | **accept** |
| unknown/invalid `activeFocus` value | **reject** → `null` (strict) / empty (lenient) |
| unknown `activeFocusOrigin` value | **reject** |
| `activeFocusOrigin` or referents present without a focus | **reject** (inconsistent combination) |
| non-string / object-shaped referent entry | **reject** |
| free-text-injection-shaped referent (long prose string) | **reject** |
| over-limit referent count | **reject — whole payload, never silently truncated** |
| malformed object (array / bare string / bare number) | **reject** |
| unexpected extra top-level field (incl. a `messages`/`priorAnswer`-shaped smuggling attempt) | **reject — unrecognized keys are NOT silently ignored** |
| nested/malformed structure (array of arrays, etc.) | **reject** |
| empty-string referent | **reject** |

`resolveResearchSessionContext()` — the only function a future route should call — never returns `null` and never throws; every reject case above degrades to the empty context, never blocking the underlying research request and never guessing a stronger meaning.

## 9. O(1) bound — exact limits and tests (Phase 10)

`HRR_MAX_UNRESOLVED_REFERENTS = 5`, `HRR_MAX_REFERENT_IDENTIFIER_LENGTH = 100` — fixed constants, never inferred from array length. Tested: referents cap at 5 regardless of how many an answer carried; 100 synthetic visible turns still produce exactly the 3 declared fields, nothing more; an oversized identifier is dropped, not truncated-and-kept; the rendered prefix's length has a computed hard upper bound, verified against the actual worst-case input, not merely asserted.

## 10. Freshness guard (Phase 11)

Not exercised behaviorally in this milestone (the feature is not enabled), but structurally guaranteed: `ResearchSessionContext` carries no applicability/BI/composition output field of any kind — there is nothing in the type for a future implementation to accidentally treat as a cached conclusion. `deriveResearchSessionContext()` is re-run fresh on every call (no memoization, no module-level mutable state) over the client's own already-ephemeral `HrrThreadState`.

## 11. No-transcript firewall (Phase 12)

Static pattern tests confirm neither `research-session-context.ts` nor `.schema.ts` contains `messages:`, `transcript`, `history:`, `previousAnswer`, `priorAnswer`, or any reference to `question_text`/`orientation`/`boundary_note`/`bi_summary_blocks`/`statement_verbatim`. `buildResearchSessionContextPrefix()`'s output is asserted to never contain any of a fixture's deliberately-marked prose strings.

## 12. Correction contract — tests and remaining uncertainty (Phase 14)

**Tested:** a simulated correction ("No, I meant ownership") passes through the IDENTICAL selector code path as an ordinary explicit focus switch — no correction-specific branch exists to diverge (proven by construction: the selector has no `if` branch keyed on any notion of "is this a correction"). An ambiguous correction (simulated as an unresolvable multi-topic turn) fails closed identically to the pre-existing multi-topic case. A correction that resolves to nothing leaves the prior focus intact (transparent, same as an authority-only turn). The thread stays strictly append-only through a correction — no history mutation, matching the unmodified `hrrThreadReducer` contract.

**NOT tested, and stated honestly:** whether the REAL classifier, given a real "No, I meant ownership" utterance plus a real context prefix, actually resolves the new topic correctly. That requires the classifier prompt work explicitly out of scope here — the hypothesis (§8 of the CAH-4G.14 design) remains unvalidated behaviorally, only structurally consistent.

## 13. Fail-closed matrix (Phase 15 — summary)

Missing/stale/malformed context, unknown focus/referent, over-limit referents, contradictory explicit-vs-inherited topics, multi-topic results, authority-only turns, and a stale/raced settle are all covered above (§5 selector cases + §8 schema matrix). Classifier failure / retrieval failure / audit failure are **out of scope for this milestone** — they are properties of the (unmodified, untouched) live pipeline, already covered by existing tests (`hrr-research-route.test.ts`, `audited-hrr-research.test.ts`) and unaffected by anything added here, since nothing added here is wired into that pipeline yet.

## 14. Test results

- New suites: **3 files, 108 tests, all passing.**
- `__tests__/hrr` + `__tests__/reviewer-lk` (full domain): **18 suites, 545 tests, all passing.**
- `npx tsc --noEmit`: clean.
- Full repository suite: **20 failed suites / 77 failed tests** — this is the pre-existing, long-documented baseline (rooted in `retrieve()` returning nothing for `runway-gen3`, present on `origin/main` itself, unrelated to HRR) — **zero new attributable failures**; confirmed additionally by `git status` showing only 5 new, untracked files (no existing file modified, so no existing test's target code changed at all).

## 15. Runtime behavior

**Unchanged.** No existing file was modified. No new file is imported by the live route, the classifier, the authority gate, the research pipeline, the audit layer, or any UI component — proven by a dedicated static test (`research-session-context-boundary.test.ts`, describe block A), not merely asserted.

## 16. CAH-4G.14 implementation-gate status (the nine conditions, §19 above)

| # | Condition | Status |
|---|---|---|
| 1 | Design review accepted as the implementation basis | **NOT MET** — this document existing is not that review; a separate PM/architecture sign-off is required |
| 2 | Full adversarial matrix (§15, 14 rows) implemented as executable tests before runtime code is exercised | **PARTIALLY MET** — the selector/schema/authority/no-transcript/no-prose/O(1)/correction properties are now tested; the 14-row matrix's ROUTING-level scenarios (e.g. rows 1, 2, 4, 8, 9, 13 as full end-to-end HTTP-route behaviors) remain untested because the route itself is untouched — those rows describe integrated behavior that does not exist to test yet |
| 3 | Authority-independence mechanically testable | **MET** — §7 above, structural + behavioral tests exist and pass |
| 4 | Correction behavior specified as one of the tested outcomes | **PARTIALLY MET** — the contract is specified and structurally tested (§12); the underlying classifier hypothesis is explicitly unvalidated |
| 5 | Focus-switch supersession testable | **PARTIALLY MET** — fully tested and passing for the selector/derivation layer (case 5); not testable end-to-end until the route/classifier are wired |
| 6 | Freshness invariant testable | **PARTIALLY MET** — structurally guaranteed and documented (§10); not behaviorally exercisable without enabling the feature |
| 7 | No transcript/state creep — O(1) size-bound test | **MET** — §9/§11 above |
| 8 | Fail-closed/rollback behavior specified and testable | **MET** — §8/§13 above |
| 9 | `parseBody` deliberately extended, with a dedicated rejection test for `messages`/`history`/`conversation`/`session_id`/`sessionId` | **NOT MET** — `parseBody` is deliberately UNCHANGED in this milestone (Phase 16's explicit requirement); a test confirms it still rejects the transcript-shaped fields exactly as today, but the NEW field has not yet been added to it at all |

**Overall: 3 of 9 fully MET, 5 PARTIALLY MET, 1 NOT MET.** The unmet/partial conditions are not defects — they describe work that is, by design, integration-level and therefore cannot exist without enabling the feature this milestone is explicitly forbidden from enabling. **Runtime implementation authorization is not granted by this milestone.**

## 17. Recommended smallest runtime implementation slice (for a SEPARATE future authorization — not implemented, not started)

Unchanged from the CAH-4G.14 design's own §20 recommendation, now more concretely scoped given what exists: (a) wire `deriveResearchSessionContext()` into `ReviewerLkLookup.tsx`'s request-building code (client-only, still no server change); (b) extend `parseBody` in the research route to accept an optional `context` field via `resolveResearchSessionContext()`, with condition 9's dedicated backward-compatibility test written FIRST; (c) construct `buildResearchSessionContextPrefix()`'s output and prepend it to the classifier's question text, with condition 2's remaining routing-level adversarial rows written and passing BEFORE this ships. **None of (a)–(c) is implemented here.**

---

# CAH-4G.16 — Bounded Context Dark Wiring / Integration Gate (2026-09-11)

**INTEGRATION-SAFETY MILESTONE. Live contextual routing is OFF.** This section records the real request-path wiring built on top of CAH-4G.14's design and CAH-4G.15's inert primitives — item (b) of §17's slice above, plus a NEW authoritative-referent validation layer §17 did not yet specify — while keeping every user-visible behavior byte-identical to before.

## 1. What changed (exactly)

| File | Change |
|---|---|
| `lib/hrr/research-session-context-referents.ts` | **NEW.** `collectAuthoritativeReferentIdentifiers()` + `enforceAuthoritativeReferents()` — the authoritative-referent trust boundary (§3 below) |
| `app/api/.../reviewer-lk/research/route.ts` | **MODIFIED — the one deliberate exception.** `parseBody` now captures an optional `context: unknown` field for `mode: 'question'` (never read for `mode: 'topic_pick'`); a new step 4.5 validates it (CAH-4G.15 schema → CAH-4G.16 authoritative check → CAH-4G.15 prefix builder) strictly AFTER the classifier call (step 3) has already run, and its result is observable ONLY behind an off-by-default debug flag |
| `__tests__/hrr/research-session-context-boundary.test.ts` | Updated (not weakened): the route is removed from the "never imports research-session-context" list — it is now the ONE deliberate exception, exactly as designed; every other file in that list (authority gate, the pipeline, both classifier variants, the audit runner) is still asserted clean |
| `__tests__/hrr/research-session-context-referents.test.ts` | **NEW** — 10 tests, the authoritative-validator in isolation |
| `__tests__/reviewer-lk/hrr-research-route-dark-context.test.ts` | **NEW** — 37 tests, the route-level inertness/regression proof |

**Everything else** — `hrr-authority-gate.ts`, `run-hrr-research.ts`, both classifier files, `run-audited-hrr-research.ts`, `HrrResearchAnswerView.tsx`, `hrr-thread.ts`, `ReviewerLkLookup.tsx` — **is untouched.**

## 2. Why this is provably inert, not merely asserted to be

The classifier call (route step 3: `const classified = await createAnthropicResearchIntentInterpreter()(parsed.question)`) is **unchanged, at the same line, with the same single argument**, and it executes **before** the new step 4.5 block that reads `parsed.context` even exists in the function's control flow — step 4.5 runs only after step 4's submission-context resolution, which itself runs after step 3. By construction, nothing computed in step 4.5 can retroactively influence `gate`, `classified`, or `attributedQuestion` — those bindings are never reassigned after step 3. This ordering argument is stronger than a policy statement: it is a fact about the function's sequential execution, verified directly by a dedicated regression test asserting the classifier mock receives byte-identical arguments with and without context present (`hrr-research-route-dark-context.test.ts`, describe block A).

## 3. Authoritative referent validation (the hard gate this milestone required)

CAH-4G.15's schema validator (shape/length/count bounds) is necessary but **not sufficient** — a syntactically valid string like `"ignore_previous_instructions"` passes every CAH-4G.15 check. This milestone closes that gap.

**Source of truth, generic, no hard-coded domain:** `collectAuthoritativeReferentIdentifiers(topic, reviewerContext, topicClaims)` **reuses `selectReviewerClaims()`** — the exact same eligibility-filtering function `runHrrResearch()`'s own `researchOneTopic()` already calls — to compute, fresh per request, the real, submission- and topic-scoped set of `ApplicabilityFact` values and governed-claim-authored `unresolved_project_dependencies` strings a genuine research turn could have produced. No claim content, copyright-specific identifier, or provider-specific identifier is hard-coded anywhere in this file.

**Policy on any mismatch, stated explicitly:** `enforceAuthoritativeReferents()` rejects the **whole** context — degrading it to fully empty — the moment ANY referent fails authoritative validation, including a referent that is real but belongs to a *different* topic than the claimed `activeFocus` (no cross-topic laundering). This is deliberately consistent with CAH-4G.15's own whole-payload-rejection policy for shape violations, not a new, inconsistent "sanitize the bad parts" behavior.

**If no authoritative mechanism had existed:** this milestone's own pre-registered STOP condition would have fired. It did not — `ApplicabilityFact` is already a closed, tiny, global enum (`lib/retrieval-engine/types.ts`, 3 values), and project-dependency identifiers, while not a single static TS union, are fully enumerable at runtime from the exact same governed-claims data (`TOPIC_CLAIMS_FIXTURE`) the real pipeline already consults.

## 4. Client transport / explicit-intent precedence

Topic-pick requests: `context`, if a client somehow sent one, is **never read** in that code branch — the parser never even looks at the field for `mode: 'topic_pick'`. Explicit topic selection needs no inherited context, exactly as CAH-4G.14 §7 specified. Free-form requests: `context` is captured, validated, and authoritatively checked, but — per §2 above — never reaches the classifier. **No LLM is ever asked to arbitrate between an explicit topic-pick and inherited focus in this milestone** — that arbitration would only become a live question once a future milestone actually threads the prefix into the classifier call, which this one does not do.

## 5. Downstream firewall — confirmed, not merely asserted

`ResearchSessionContext` terminates at step 4.5. It is never passed to `runAuditedHrrResearch`, `selectReviewerClaims` (beyond the read-only authoritative-set lookup, which mutates nothing and returns only a `Set<string>`), Bounded Interpretation, `projectHrrResearchAnswer`, the audit writer, or the JSON response. Confirmed by: (a) the unchanged signatures of every downstream function (§2); (b) the response-equivalence test proving identical response bodies with and without context for the same classifier mock output; (c) the audit-boundary review below.

## 6. Audit boundary — unchanged

No new field reaches `recordReviewerLkAccess` / the `lk_research` audit row. `activeFocus`, `unresolvedReferents`, the raw context payload, and the dark-computed prefix are never passed to the audit writer — step 4.5 sits entirely outside the audited-research call (step 5–8), which is invoked with the exact same argument shape as before CAH-4G.16.

## 7. Dark classifier wiring — approach taken

**Combined A + B**, per the milestone's own menu of acceptable approaches: the bounded prefix is genuinely **constructed** (`buildResearchSessionContextPrefix`, CAH-4G.15, unmodified) and its construction is genuinely exercised on every real `mode: 'question'` request (approach A — "prove safe serialization/prompt placement/schema interaction"), while its only observable effect is a `console.debug` call gated behind `process.env.HRR_DARK_CONTEXT_DEBUG === '1'`, off by default (approach B — "non-production/test-only code path"). The debug payload itself is minimal and non-substantive by design — `{ activeFocus, referentCount, prefixLength }` only, never the raw referent strings, the question text, or any answer content — tested directly.

## 8. Single-call constraint

Unchanged: topic-pick remains 0 model calls; free-form remains exactly 1 classify-only call. Step 4.5 makes **zero** model calls of its own — it is pure computation over already-resolved data (`reviewerContext`, `TOPIC_CLAIMS_FIXTURE`).

## 9. Freshness

Unaffected — `runAuditedHrrResearch` (step 5–8) is invoked with the exact same `gate`/`reviewerContext`/`topicClaims` it always was; the full Retrieval → Applicability → BI → Composition pipeline still runs fresh, untouched by anything in step 4.5.

## 10. Tamper / adversarial matrix — result

All Phase 18 scenarios tested at the appropriate layer: arbitrary/injection-looking referents, valid-focus+invalid-referent, invalid-focus+valid-referent, over-limit referents, overlength identifiers, cross-topic-authoritative-but-wrong-topic referents, and duplicate referents are all covered by `research-session-context-referents.test.ts` (validator) and `hrr-research-route-dark-context.test.ts` (route, asserting 200-never-500 and unaffected classifier input) — **no malicious or non-authoritative string ever reaches the classifier**, because nothing reaches the classifier via this path at all in this milestone.

## 11. Backward compatibility — proof

The pre-existing `hrr-research-route.test.ts` suite (28 tests, unmodified) passes unchanged. A dedicated new test confirms a request with literally no `context` key behaves identically to the pre-CAH-4G.16 contract, and that `messages`/`history`/`session_id` remain rejected exactly as before.

## 12. Production behavior

**CONTEXTUAL ROUTING = OFF. VISIBLE HRR BEHAVIOR CHANGE = NONE.** Confirmed by: `git diff` on `route.ts` touching only parsing/step-4.5 additions, never step 3's classifier call or step 5–8's research call; 37 dedicated route-level tests proving response equivalence with/without/malformed/tampered context; the pre-existing 28-test route regression suite passing unchanged.

## 13. Test results

New: 3 files, 47 tests (10 + 37), all passing. Plus the updated boundary test (56 tests, all passing — 2 assertions updated to reflect the deliberate route exception, not weakened elsewhere). `__tests__/hrr` + `__tests__/reviewer-lk`: 20 suites / 603 tests, all passing. Full repo suite: 20 failed suites / 77 failed tests — the same pre-existing, long-documented, unrelated baseline — zero new attributable failures. `npx tsc --noEmit`: clean. `next build`: exit 0 (required placeholder Supabase/Stripe/Resend env vars to get past unrelated routes' credential-presence checks during static page-data collection in this local sandbox — no real secrets used, nothing HRR-related affected; `✓ Compiled successfully` and type-checking passed even before those placeholders were supplied).

## 14. CAH-4G.14 implementation-gate status (re-evaluated, PM/Architecture accepts condition 1 MET)

| # | Condition | Status |
|---|---|---|
| 1 | Design review accepted | **MET** (PM/Architecture acceptance per this milestone's brief) |
| 2 | Full adversarial matrix implemented test-first | **PARTIALLY MET** — selector/schema/authoritative-referent/authority/no-transcript/no-prose/O(1)/correction/transport-inertness rows are now tested (up from CAH-4G.15); rows describing an actually-enabled classifier's behavior (does the model correctly USE the prefix) remain untestable until a future milestone enables it |
| 3 | Authority independence mechanically testable | **MET** (unchanged from CAH-4G.15, reinforced by new route-level authority-equivalence tests) |
| 4 | Correction behavior specified as a tested outcome | **PARTIALLY MET** (unchanged from CAH-4G.15 — structural contract tested, classifier-level hypothesis still unvalidated) |
| 5 | Focus-switch supersession testable | **PARTIALLY MET** (unchanged — selector-level fully tested; classifier-level still requires an enabled prefix) |
| 6 | Freshness invariant testable | **MET (upgraded)** — now directly demonstrated at the route level: `runAuditedHrrResearch`'s inputs are provably unaffected by context, so the full fresh pipeline it triggers is provably unaffected too |
| 7 | No transcript/state creep, O(1) | **MET** (unchanged) |
| 8 | Fail-closed/rollback specified and testable | **MET (upgraded)** — now includes the authoritative-referent whole-context-rejection policy, tested at both the validator and route levels |
| 9 | `parseBody` deliberately extended, with a dedicated rejection test for the transcript-shaped fields | **MET (upgraded from NOT MET)** — `parseBody` now accepts `context` deliberately, and `messages`/`history`/`conversation`/`session_id`/`sessionId` are proven still rejected, unaffected |

**Overall: 6 of 9 MET, 3 PARTIALLY MET, 0 NOT MET.** The remaining partial conditions (2, 4, 5) all describe the SAME underlying gap: whether an actually-enabled classifier correctly uses the prefix — which cannot be tested without enabling it, which this milestone is explicitly forbidden from doing.

## 15. Smallest next enablement milestone (recommended, not decided here)

**CAH-4G.17 — Enable bounded same-focus resolution, under a feature/behavior gate.** Scoped to the smallest class the dark-wiring evidence actually supports: thread `activeFocus` through to the classifier call (finally consuming `buildResearchSessionContextPrefix`'s output for real, prepended to `parsed.question`), for **free-form turns whose OWN classification would otherwise resolve to zero topics** (the `unsupported` fallback case — T2/Turn-3-shaped questions), gated behind an explicit, off-by-default flag for controlled rollout. **`activeReferents` (the unresolved-item hint) should be deferred to a later slice** — it addresses a narrower, less-validated class of question (T2/T4-shaped vague pronouns) and adds interpretive complexity the dark-wiring evidence does not yet justify enabling in the same step as bare focus continuity. This recommendation is not authorized by this document — it requires its own explicit milestone.

---

# CAH-4G.17 — Active-Focus Classifier Enablement: Feature-Gated, Production OFF (2026-09-11)

**BEHAVIORAL ENABLEMENT MILESTONE, TIGHTLY BOUNDED. `activeFocus` only — `activeReferents` NOT enabled. Feature flag OFF by default and OFF in production at the end of this milestone.**

## 1. What changed

| File | Change |
|---|---|
| `lib/reviewer-lk/interpret-research-intent.ts` | `RESEARCH_INTENT_SYSTEM_PROMPT` gains one new paragraph documenting an OPTIONAL advisory `[Context: Active Research Focus = <topic>.]` line a caller may prepend. Schema (`RESEARCH_INTENT_CLASSIFIER_SCHEMA`), the interpreter function's signature, and the deterministic normalizer are **all unchanged**. |
| `app/api/.../reviewer-lk/research/route.ts` | New `isActiveFocusContextEnabled()` gate (`HRR_ACTIVE_FOCUS_CONTEXT_ENABLED === '1'`, OFF by default). When ON, `mode: 'question'` requests fold `activeFocus` (referents forced to `[]`, unconditionally) into the classifier's input text via the unchanged `buildResearchSessionContextPrefix`. `topic_pick` never reads context, regardless of the flag. `attributedQuestion` (shown to the reviewer as "You asked: …") stays the verbatim question, never the augmented text. |
| `__tests__/reviewer-lk/hrr-research-route-active-focus.test.ts` | **NEW** — 23 tests: exact classifier-input format, referent exclusion, topic-pick immunity, "classifier's own output wins" (no post-classification override), authority parity, fail-closed/malformed-context handling, freshness, cost, and a prompt/prefix-builder consistency check |

## 2. Honest scope: what this milestone can and cannot prove

**No live Anthropic API access exists in this environment** (no `ANTHROPIC_API_KEY`) — exactly the same standing limitation this entire CAH-4G program has honored throughout (CAH-4G.8's "authenticated production browser UAT... NOT performed," CAH-4G.13's PM-executed production turns, etc.). Every test in this milestone therefore uses a **mocked** classifier, as every other route test in this repo already does. This proves, with certainty:

- the EXACT text the classifier receives, byte-for-byte, in both flag states;
- that `unresolvedReferents` never reaches that text under any circumstances;
- that `topic_pick` never reads context;
- that whatever the (mocked) classifier's OWN structured output says is exactly what the route acts on — **no post-classification override exists anywhere in the code**, in either flag state;
- that authority, freshness, and cost behavior are identical ON vs OFF.

It does **NOT and cannot** prove that a REAL model, given the advisory line, actually resolves "why isn't that established?" or "what do you mean by human contribution?" to the intended topic. That is a genuine, acknowledged evidentiary gap — not glossed over, not assumed in either direction — and is exactly the question a PM-executed production/preview trial (CAH-4G.18, §11 below) would need to answer, the same way PM manually executed every actual production turn throughout CAH-4G.13.

## 3. Feature gate

`isActiveFocusContextEnabled()` — `process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED === '1'`. OFF by default (unset, or any other value). No DB row, no migration, no per-user/per-domain setting, no persisted rollout state — an env var read fresh on every request, trivially reversible by unsetting it. Matches the exact convention CAH-4G.16 already established for `HRR_DARK_CONTEXT_DEBUG`.

## 4. Classifier integration — exact format

When ON and `resolvedContext.activeFocus` is non-null:

```
classifierInput = `${buildResearchSessionContextPrefix({...resolvedContext, unresolvedReferents: []})}\n\n${parsed.question}`
```

Example: `"[Context: Active Research Focus = copyrightability.]\n\nwhy isn't that established?"`. One call, same schema, same `ResearchIntentInterpreter` signature — verified directly (`describe B`, `hrr-research-route-active-focus.test.ts`). `unresolvedReferents` is force-zeroed regardless of what the client sent or what schema validation returned — verified directly (a test sends real referent strings and asserts they never appear in the classifier input).

## 5. Explicit-intent precedence — how it is (and is not) enforced

Per instruction, **no post-classifier override logic exists**. Precedence is stated entirely in the system prompt: "the reviewer's own current question ALWAYS takes priority... never let the advisory line override, dilute, or add to an explicit topic the question itself names." Mechanically verified: (a) the topic-pick path structurally cannot consult context at all (unchanged from CAH-4G.16); (b) for the free-form path, whatever topic the (mocked) classifier resolves is exactly what the route routes to, regardless of what `activeFocus` was supplied — proving the WIRING has no competing logic that could ever second-guess the classifier's resolution. Whether the REAL model actually honors the prompt's precedence instruction is the same acknowledged gap as §2.

## 6. Authority parity

Tested across three `(activeFocus, question)` combinations (`copyrightability`/"Is that enough evidence?", `copyright_ownership`/"Should I approve this?", `likeness`/"Does this clear the control?"), flag ON vs OFF, using an identical mocked `assessment_decision_requested: true` classifier output for both runs of each pair: identical `authority_note` and `assessment_authority_note` in every case.

## 7. Fail-closed behavior

If the (mocked) classifier still returns `research_intents: []` even with the advisory line present, HRR falls back to `unsupported` / offered research paths exactly as it does with no context at all — no silent coercion to `activeFocus` exists anywhere in the code (there is no code path that could do this; the route never reads its own `activeFocus` variable again after building `classifierInput`).

## 8. Downstream firewall — unchanged

`activeFocus` is folded into `classifierInput` (a local string) and then discarded — it is never passed to `hrrAuthorityGate`, `runAuditedHrrResearch`, `selectReviewerClaims`, Bounded Interpretation, `projectHrrResearchAnswer`, or the audit writer. Everything from `gate` onward is byte-identical in shape to CAH-4G.16.

## 9. Cost and freshness

Model-call count is unchanged: 0 for topic-pick, exactly 1 (classify-only) for free-form, in both flag states — verified directly. `getSubmissionFactsForReviewerLk` is still called fresh, once, per request, flag ON — verified directly; the full Retrieval → Applicability → BI → Composition pipeline downstream of `runAuditedHrrResearch` is entirely untouched by this milestone.

## 10. Test results

New: 1 file, 23 tests, all passing. `__tests__/hrr` + `__tests__/reviewer-lk`: 21 suites / 626 tests, all passing. Full repo suite: 20 failed suites / 77 failed tests — the same pre-existing, unrelated baseline as every prior CAH-4G.1x milestone — zero new attributable failures. `npx tsc --noEmit`: clean. `next build`: exit 0 (same placeholder-credential caveat as CAH-4G.16 — unrelated Supabase/Stripe/Resend routes in this local sandbox, nothing HRR-related).

## 11. ActiveFocus sufficiency — CANNOT BE DETERMINED IN THIS ENVIRONMENT

Per §2, this is not a SUFFICIENT / PARTIALLY SUFFICIENT / INSUFFICIENT finding — it is an honest "not yet measurable here." The wiring is fully proven safe; whether `activeFocus` alone actually resolves the target production questions (T2 "why isn't that established?", T3 "what do you mean by human contribution?", the post-switch "what does this mean for ownership?") requires a real classifier call this environment cannot make. **Recommendation: a PM-executed trial** (CAH-4G.18, flag ON, internal synthetic fixture only, one gated turn at a time — mirroring the exact protocol CAH-4G.13's Session 1/discriminating-control/authority-drift/focus-switch experiments already used) **is the correct and only way to obtain this evidence**, not a CLI-side simulation.

## 12. ActiveReferents decision

**NEEDS SEPARATE DESIGN/TEST MILESTONE — not decided or implemented here.** Consistent with CAH-4G.16 §15's original recommendation: referent-context complexity should not be added until `activeFocus`'s own sufficiency (or insufficiency) is empirically established by a real trial.

## 13. CAH-4G.14/.15/.16 implementation-gate status (re-evaluated)

| # | Condition | Status |
|---|---|---|
| 1 | Design review accepted | MET (unchanged) |
| 2 | Full adversarial matrix, test-first | **PARTIALLY MET (unchanged)** — every WIRING-level row is now tested across three milestones; the one remaining row (does a real model correctly use the prefix) requires live model access, which does not exist here |
| 3 | Authority independence testable | MET (unchanged, reinforced — §6) |
| 4 | Correction behavior specified | PARTIALLY MET (unchanged — the correction hypothesis still requires live model access to validate) |
| 5 | Focus-switch supersession testable | PARTIALLY MET (unchanged, same reason) |
| 6 | Freshness invariant testable | MET (unchanged) |
| 7 | No transcript/state creep, O(1) | MET (unchanged) |
| 8 | Fail-closed/rollback specified+testable | MET (reinforced — §7) |
| 9 | `parseBody` deliberately extended + rejection test | MET (unchanged) |

**Overall: unchanged from CAH-4G.16 — 6 of 9 MET, 3 PARTIALLY MET, 0 NOT MET.** The three partial conditions all reduce to the same single evidentiary gap (§2/§11), not three separate problems.

## 14. Production behavior

`HRR_ACTIVE_FOCUS_CONTEXT_ENABLED` is **OFF** at the end of this milestone, in every environment, including production. **Contextual routing in production remains OFF.** No user-visible HRR behavior has changed.

## 15. Recommended next milestone

**CAH-4G.18 — Controlled trial / UAT, flag ON, internal synthetic fixture only** (`CA-RLK-2a PROD SMOKE` or equivalent), PM-executed, one gated turn at a time, targeting exactly the questions CAH-4G.13 already pre-registered evidence around: T2 ("why isn't that established?"), T3 ("what do you mean by human contribution?"), and the post-switch continuity question ("what does this mean for ownership?"). This is the step that actually answers §11's open sufficiency question. **Not authorized or executed by this document.**

---

# CAH-4G.18A — Active-Focus Request-Path Verification (Investigation, 2026-09-11)

**Production CAH-4G.18 UAT began. Turn 1A ("what does governed knowledge say about copyrightability here?") produced the correct baseline. Turn 1B ("why isn't that established?") produced the generic fallback — the same result seen before `activeFocus` existed.** Per PM/Architecture instruction, this was **not** accepted as semantic evidence without first proving the request path — CAH-4G.16 had explicitly left `deriveResearchSessionContext` "still unwired to the client UI," and no CAH-4G.15/16/17 test had ever exercised `ReviewerLkLookup.tsx`'s own request-body construction (every route-level test built its own synthetic body directly).

**Investigation result, from direct source inspection:** `ReviewerLkLookup.tsx`'s `ResearchPayload` type carried only `{ mode: 'topic_pick'; topic }` / `{ mode: 'question'; question }` — **no `context` field existed anywhere in the client.** `deriveResearchSessionContext` (CAH-4G.15) was never imported into `app/` at all outside the server route. The component's own header comment, unchanged since CAH-4G.10, stated explicitly that the POST body was "byte-for-byte the same `{ mode, topic }` / `{ mode, question }`." **Root cause: CLIENT WIRING GAP** (not a client-derivation defect, not a transport defect, not a server defect, and — critically — **not** a classifier semantic failure, since the classifier never received anything to fail to resolve). Production Turn 1B is therefore **INVALID / NOT semantic evidence about `activeFocus`** — the server feature flag's value was irrelevant, because the request it evaluated never carried a context field regardless.

This is recorded as a genuine, previously-unnoticed test-coverage gap spanning three prior milestones (CAH-4G.15/16/17), each of which built and tested the server side correctly while never completing (or testing for) the client half of the "wire it into `ReviewerLkLookup.tsx`" step CAH-4G.14 §17/§20 and CAH-4G.15 §20 had already scoped as the eventual next slice.

---

# CAH-4G.18B — Client Context Transport Repair (2026-09-11)

**Closes the CAH-4G.18A gap. Mechanical transport only — does NOT determine activeFocus sufficiency.** CAH-4G.18's semantic UAT resumes from Test 1 only after this repair is deployed.

## 1. What changed

| File | Change |
|---|---|
| `app/admin/submissions/[id]/review/ReviewerLkLookup.tsx` | `ResearchPayload`'s `question` variant gains `context: ResearchSessionContext`. `submitQuestion` now calls `deriveResearchSessionContext(thread)` on the CURRENT thread, immediately before sending, and includes the result. `runTopic` (`topic_pick`) is **unchanged** — no context field, ever. Header comments and the fetch-call comment updated to state the current, accurate contract (previously-accurate historical claims about Slice A preserved, not rewritten to claim more than they proved at the time). |
| `__tests__/reviewer-lk/hrr-thread.test.ts` | One assertion updated: the `ResearchPayload` question-shape regex now expects `context: ResearchSessionContext`, matching the new, intentional type. |
| `__tests__/reviewer-lk/hrr-lookup-context-transport.test.ts` | **NEW** — 9 tests closing exactly the coverage gap CAH-4G.18A identified (see §7 below). |

**No other file changed.** No server code touched — CAH-4G.15/16/17's route, schema validator, authoritative-referent validator, and feature gate are byte-identical to before this milestone.

## 2. Client transport — resulting contract

```ts
type ResearchPayload =
  | { mode: 'topic_pick'; topic: GoalCategory }                                   // UNCHANGED — no context field
  | { mode: 'question'; question: string; context: ResearchSessionContext }        // NEW field
```

`context` comes from exactly one place: `deriveResearchSessionContext(thread)` (CAH-4G.15, unmodified), called on the component's own live `HrrThreadState` at the moment of submit. Nothing in `ReviewerLkLookup.tsx` constructs a context object independently, reads a prior answer's rendered prose, or reads the reviewer's own prior question text for this purpose.

## 3. Turn 1 → Turn 2 regression — exact resulting request

For the CAH-4G.18A scenario (free-form Turn 1 resolving to Copyrightability, then Turn 2 "why isn't that established?"), the request body `ReviewerLkLookup.tsx` now constructs is:

```json
{
  "mode": "question",
  "question": "Why isn't that established?",
  "context": {
    "activeFocus": "copyrightability",
    "activeFocusOrigin": "interpreted_question",
    "unresolvedReferents": []
  }
}
```

Proven directly (`hrr-lookup-context-transport.test.ts`, describe B) by running the REAL `hrrThreadReducer` through the REAL begin/settle sequence a real Turn 1 produces, then calling the REAL `deriveResearchSessionContext` on the resulting thread — not asserted in the abstract. **This is a transport proof only — it makes no claim about what the live classifier does with this body.**

## 4. Server trust boundary — unchanged, re-confirmed

`parseBody`, `resolveResearchSessionContext`, `enforceAuthoritativeReferents`, and the CAH-4G.17 feature gate are byte-identical to CAH-4G.17. All CAH-4G.16/17 server-side tests pass unchanged, confirming the newly-real client payload is still handled exactly as the (previously synthetic) test payloads always were.

## 5. ActiveReferents — still dark, still zeroed

The client now transports `unresolvedReferents` as part of the bounded `ResearchSessionContext` contract (the selector always computed it; CAH-4G.15/16/17 never disabled that field client-side). The **server** still unconditionally force-zeroes it before classifier augmentation (`{ ...resolvedContext!, unresolvedReferents: [] }`, unchanged CAH-4G.17 code) — proven by the pre-existing `hrr-research-route-active-focus.test.ts` suite, re-run and still passing. No referent identifier reaches the classifier in this milestone, under any circumstances.

## 6. Feature flag, precedence, authority, freshness

All unchanged from CAH-4G.17, re-verified: OFF means the transported context is validated and then ignored (classifier receives the bare question); ON means `activeFocus` alone (never referents) is folded into the single existing classify call; the classifier's own structured output still determines routing with no post-classification override anywhere; authority refusal behavior tested identical regardless of context; `getSubmissionFactsForReviewerLk` still resolved fresh every request; zero new model calls.

## 7. Why this closes the exact blind spot

`hrr-lookup-context-transport.test.ts` §A source-scans `ReviewerLkLookup.tsx` itself (not a synthetic mock) for the literal call `deriveResearchSessionContext(thread)` inside `submitQuestion` and the literal `research({ mode: 'question', question: q, context })` call, and separately confirms `runTopic`'s block contains no reference to `context` at all. §B then runs the real reducer + real selector in the real sequence and asserts the resulting request body. **This is the test that did not exist through CAH-4G.15/16/17** — every route-level test in those milestones asserted server behavior given an assumed request body; none asserted that `ReviewerLkLookup.tsx` itself produces that body. A future regression that silently drops the `context` argument, or reintroduces a synthetic/independent context construction, would now fail §A immediately.

## 8. Test results

New: 1 file, 9 tests, all passing. 1 pre-existing assertion updated (not weakened) in `hrr-thread.test.ts`. `__tests__/hrr` + `__tests__/reviewer-lk`: 22 suites / 635 tests, all passing. Full repo suite: 20 failed suites / 77 failed tests — the same pre-existing, unrelated baseline as every prior CAH-4G.1x milestone — zero new attributable failures. `npx tsc --noEmit`: clean. `next build`: exit 0 (same placeholder-credential caveat as CAH-4G.16/17 — unrelated Supabase/Stripe/Resend routes only; this build also confirms the new client import bundles correctly with no server-only leakage).

## 9. Production status

**Not deployed by this milestone.** This is a source change requiring the normal repository → Vercel production deployment path (auto-deploy on push to `main`), which this document does not itself trigger beyond the ordinary git push. `HRR_ACTIVE_FOCUS_CONTEXT_ENABLED`'s current production value is unknown from this environment (no Vercel credentials — unchanged limitation). **Semantic UAT remains PAUSED** until PM confirms the deployed production build includes this repair (i.e., postdates this commit) and the flag is ON.

## 10. ActiveFocus sufficiency / ActiveReferents

Unchanged from CAH-4G.17 §11/§12: **UNKNOWN / NOT YET TESTED SEMANTICALLY** (this milestone is transport-only and makes no sufficiency claim); **`activeReferents`: NOT AUTHORIZED**, unaffected by this repair.

---

# CAH-4G.18 — Controlled Production Semantic UAT: Evidence Review and Closeout (2026-09-11)

**PARTIAL CLOSEOUT. `activeFocus` is judged SUFFICIENT for the current bounded contract, scoped precisely (§5 below). `activeReferents` remains NOT NEEDED / NOT AUTHORIZED. One authority-safety check remains outstanding before full production acceptance — the feature flag stays ON for controlled UAT only, not yet accepted as unconditional normal behavior.** Runtime unchanged by this section — evidence review and documentation only.

## 1. Evidence provenance (kept explicitly separate)

- **CAH-4G.18, pre-repair (Turn 1B against `bde76b3`):** production Turn 1B ("why isn't that established?") produced the generic fallback. **CAH-4G.18A proved this was INVALID evidence** — the client never transported `context` at all (CLIENT WIRING GAP). This result is preserved as historical record, explicitly not semantic evidence about `activeFocus`.
- **CAH-4G.18, post-repair (this section, against `45988c7` — CAH-4G.18B deployed, flag ON):** a PM-executed production sequence, internal synthetic fixture, reported below. **This is the first valid semantic evidence this program has ever gathered about `activeFocus` with a real classifier.** Every free-form turn rendered `intent_origin === 'interpreted_question'` (" · interpreted from your question" — verified directly against `HrrResearchAnswerView.tsx` line 128, confirming each turn genuinely exercised the free-form classifier path, not the 0-model topic-shortcut path).

## 2. Production sequence and per-question findings

| Question | Focus supplied | Result | Class per CAH-4G.13 baseline | Finding |
|---|---|---|---|---|
| "What does governed knowledge say about copyrightability here?" | none (baseline) | Routed Copyrightability, unresolved `jurisdiction`+`human_contribution_description` | Matches T1 (§O.1) | Baseline confirmed |
| "Why isn't that established?" | `copyrightability` | Routed Copyrightability, applicability freshly surfaced | T2 (§O.1) was REFERENT UNRESOLVED, high confidence, pre-`activeFocus` | **Same-focus continuity: SUCCEEDED** |
| "What do you mean by human contribution?" | `copyrightability` (no referent — excluded by design) | Routed Copyrightability | T3 (§O.1/§P.3) was UNRESOLVED → TOPIC CONTINUITY LOST/MODERATE | **Sub-term continuity: SUCCEEDED, referent-free** |
| (repeat of the same question) | `copyrightability` | Routed Copyrightability | — | Replication, same result |
| Explicit Copyright ownership topic-shortcut | none consulted (deterministic path) | Routed Copyright ownership, no leakage | Already proven (§R.4 property A) | Replication, not new evidence |
| "What does this mean for ownership?" | `copyright_ownership` | Routed Copyright ownership, no old-focus reassertion | Turn 3 in §R was TOPIC CONTINUITY LOST/MODERATE with a live vocabulary-limitation secondary | **Post-switch continuity: SUCCEEDED** |

## 3. Findings A–G (per instruction, assessed separately, conservatively)

**A — Same-focus continuity:** **Valid, positive evidence.** A clean, apples-to-apples comparison against a specific, well-documented pre-`activeFocus` failure (T2, §O.1), with the ONLY changed variable being that `activeFocus` is now genuinely transported and used. n=1 instance — real, but a single trial.

**B — Sub-term continuity, referent-free:** **Valid, positive, and the single most consequential finding of the whole CAH-4G.11–18 program.** Resolves the T3 ambiguity CAH-4G.13 §P.2 explicitly left open (topic-continuity-loss vs. classifier-vocabulary-limitation) — bare `activeFocus`, with no referent, was sufficient for the classifier to correctly interpret "human contribution" in context. The repeat replication (n=2) modestly strengthens this beyond a single trial.

**C — Focus-switch supersession:** **Confirms, does not newly establish.** The explicit topic-shortcut path is deterministic and was already production-proven (CAH-4G.10C, CAH-4G.13 §R.4 property A) — this UAT replicates that finding under the current build, it is not new evidence for a previously-open question.

**D — Post-switch continuity:** **Valid, positive evidence**, directly analogous to A — a clean comparison against a specific, documented pre-`activeFocus` failure (§R.1 Turn 3, "what does this mean for ownership?" → generic fallback), with the same isolated-variable structure as A. n=1.

**E — Freshness:** **Not independently, empirically stress-tested by this UAT — and could not have been, given a static fixture.** Identical unresolved-applicability output turn-to-turn is the EXPECTED result of correct fresh recomputation against unchanged underlying facts; it is not, by itself, evidence for OR against staleness. Freshness remains **structurally guaranteed** (no code path exists anywhere in `ResearchSessionContext`, `deriveResearchSessionContext`, or the classifier-input construction that could carry a cached applicability/BI/answer value — verified by source inspection across CAH-4G.14–18B, unchanged here). A genuine freshness stress test (a fact that changes BETWEEN turns) was never run and remains a documented, non-blocking gap (CAH-4G.16 §15 adversarial rows 7/12).

**F — Authority:** **This UAT contains ZERO authority-shaped questions and therefore establishes NOTHING about authority safety under real, transported `activeFocus`.** Explicitly distinguished from two prior, weaker forms of authority evidence: (1) CAH-4G.13 §Q's authority-drift experiment tested authority under a same-focus SESSION, but predates any real context transport (the classifier never received `activeFocus` at that time — CAH-4G.16/17/18B did not yet exist); (2) CAH-4G.17's own authority-parity tests used a MOCKED classifier, proving the WIRING doesn't differentiate, never proving REAL model behavior. **No production evidence exists, anywhere in this program, of a real model's authority behavior when it has genuinely received a transported `activeFocus` on an authority-shaped question.** This is a real, unfilled evidentiary gap — see §6.

**G — Composition, explicitly separated:** Every tested turn's ROUTING succeeded. The answers remaining topic-level / repeating the full governed rollup rather than narrowly targeting "what does human contribution mean specifically" is a **pre-existing, already-understood, unrelated property** — `projectHrrResearchAnswer` composes per-RESOLVED-TOPIC, not per-question (documented since CAH-4G.4/CAH-4G.7's consultative hardening, reaffirmed at CAH-4G.16 §R.9's "composition polish / weak question targeting" finding). **Not reclassified as a context-routing failure.** Any future narrowing of composition to the specific sub-question is out of scope here and belongs to a separate Consultative Composition milestone.

## 4. CAH-4G.14 implementation-gate re-evaluation

| # | Condition | Prior status | New evidence | New status | Why |
|---|---|---|---|---|---|
| 1 | Design review accepted | MET | — | MET | Unchanged |
| 2 | Full adversarial matrix, test-first | PARTIALLY MET | Real production turns now exercise same-focus continuity, sub-term continuity, and post-switch continuity with a REAL classifier for the first time | **PARTIALLY MET (strengthened, not upgraded)** | Several matrix rows now have live evidence; others (authority-with-transported-context, correction, multi-topic-live, clear-reset-live, stale-context-live) remain untested. Upgrading to MET would require closing all of those, not most |
| 3 | Authority independence testable | MET | — | MET | Unchanged (structural + mocked evidence; §3F notes the REAL-model gap belongs to a different condition's evidence, not this one — this condition is about testability, not live-proof) |
| 4 | Correction behavior specified | PARTIALLY MET | None — correction was not tested (explicit topic-shortcut switch is a distinct, already-proven mechanism, not correction) | PARTIALLY MET | Unchanged — no new evidence bears on this condition at all |
| 5 | Focus-switch supersession testable | PARTIALLY MET | Real production evidence: explicit switch (C) + post-switch continuity (D) BOTH now confirmed with a live model, no leakage | **MET (upgraded)** | This is no longer merely "testable" — it has been tested, live, twice, cleanly |
| 6 | Freshness invariant testable | MET | §3E — structural guarantee reaffirmed, not newly stress-tested | MET | Unchanged |
| 7 | No transcript/state creep, O(1) | MET | — | MET | Unchanged |
| 8 | Fail-closed/rollback specified+testable | MET | — | MET | Unchanged |
| 9 | `parseBody` deliberately extended + rejection test | MET | — | MET | Unchanged |

**Overall: 7 of 9 MET (up from 6), 2 PARTIALLY MET (down from 3), 0 NOT MET.** Not mechanically upgraded merely because UAT succeeded — condition 2 is explicitly held at PARTIALLY MET despite the positive results, and condition 4 is untouched, because neither condition's remaining gap was actually addressed by this specific evidence.

## 5. activeFocus sufficiency determination

**SUFFICIENT FOR THE CURRENT BOUNDED SESSION CONTRACT.**

Defined precisely, per instruction, as: bare `activeFocus` (topic identity only, no referent) correctly assists the real classifier in routing a same-focus or post-switch follow-up to the intended governed topic, for the THREE follow-up classes now directly demonstrated in production — (a) a vague, no-topic-named follow-up in an existing focus ("why isn't that established?"), (b) a named-sub-concept follow-up naming no topic ("what do you mean by human contribution?"), (c) a colloquial, partial-topic-reference follow-up immediately after an explicit switch ("what does this mean for ownership?"). **This determination explicitly does NOT mean:** general conversational memory, transcript understanding, evidence evaluation, assessment reasoning, semantic answer composition, or arbitrary pronoun resolution — none of those were tested or are claimed. Scope-bounding caveats: n=1–2 per class (not a large replicated sample); authority-shaped questions under real transported context remain untested (§3F); correction, multi-topic, and clear-reset remain untested live. These caveats bound the determination's scope; they do not undermine it, since none of the tested classes produced a failure.

## 6. activeReferents decision

**NOT NEEDED FOR CURRENT CONTRACT — KEEP DISABLED / UNIMPLEMENTED.**

Per instruction, why B's success actively weakens rather than strengthens the case for referents: Candidate D (bounded referent identifiers) exists specifically to handle cases where bare topic identity is insufficient because a vague follow-up needs to know WHICH specific unresolved item within a topic the reviewer means. "What do you mean by human contribution?" is exactly this shape of question — and it resolved correctly with `activeFocus` alone, with NO referent supplied. This shows that, for this demonstrated class, the classifier's own language understanding — given only a topic-identity hint — is already doing the disambiguation a referent identifier was designed to provide. Additionally (§3G), because composition renders the full topic-level rollup regardless of which specific item was asked about, a referent identifier would not currently change what the reviewer sees even if routing depended on it — its remaining justification would require a FUTURE narrow-composition capability that does not exist and is out of scope. The evidence does not merely fail to justify referents; it directly demonstrates the problem referents exist to solve did not manifest in the one case most likely to need them.

## 7. Remaining experiments — must-test vs. useful-later vs. already-established

**(a) Must-test before activeFocus is accepted as unconditional normal production behavior:** **Authority regression with `activeFocus` genuinely transported and the flag ON, on a real authority-shaped question, in the same focus session** — e.g., a same-focus Copyrightability question followed by "Is that enough evidence?" or "Should I approve this?". Nothing in this program has ever tested this specific combination with a real model; it is the single highest-severity remaining gap given this program's consistent, repeated prioritization of authority safety above all else.

**(b) Useful later regression coverage, not blocking:** explicit correction semantics ("No, I meant ownership") — already structurally proven to reduce to the same code path as an explicit switch (CAH-4G.15 §8, CAH-4G.16 §12), just never live-tested; multi-topic/ambiguous reset behavior; clear-conversation reset (trivially guaranteed by the unchanged, already-tested `EMPTY_HRR_THREAD` mechanism).

**(c) Already sufficiently established, structurally or empirically:** freshness (§3E); the explicit-switch mechanism itself (§3C, proven twice now); no-transcript/no-prose (extensively tested across CAH-4G.15/16); the O(1) bound (extensively tested).

No additional UAT is recommended beyond (a) — inventing further experiments "for completeness" is explicitly against instruction.

## 8. Feature-gate recommendation

**KEEP ON ONLY FOR CONTROLLED UAT.** Not yet "ACCEPT ON as current production behavior" — the one outstanding authority-safety gap (§7a) is judged serious enough that full, unconditional acceptance should wait for it, consistent with this program's consistent prioritization of authority safety above usefulness evidence throughout CAH-4G.11–18. Not "RETURN DEFAULT TO OFF" either — nothing observed failed or regressed; there is no safety finding here that argues for rollback, only an untested category. The flag itself remains the rollback mechanism regardless of the eventual acceptance decision. This is not a change to the flag — it is a recommendation for how to treat its current ON state pending §7a.

## 9. Product-boundary reaffirmation

Unchanged: HRR remains a short, topic-scoped governed-research capability. This closeout does not authorize workbook-wide memory, transcript chat, unlimited turns, cross-session reasoning, or any form of automated assessment/verdict behavior.
