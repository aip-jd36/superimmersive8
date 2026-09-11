# HRR Topic-Scoped Research Session — Product Contract & Architecture (CAH-4G.12)

**Status:** `CAH-4G.12 — TOPIC-SCOPED HRR RESEARCH SESSION ARCHITECTURE / DESIGN` — **ACCEPTED** (2026-09-11). No runtime change. `CAH-4G.10 SLICE A remains CLOSED / PRODUCTION-PROVEN` (unchanged, not reopened). **Bounded session context: NOT IMPLEMENTED.** **Workbook Research Log: FUTURE / NOT AUTHORIZED.** **CAH-4G.13 (2026-09-11) — `HRR_SESSION_DISCOVERY.md`** is the pre-registered §Q discovery script + PM execution plan for this contract; **CAH-4G.14 (implementation) remains NOT AUTHORIZED** pending its evidence. This is the **one authoritative document** for the HRR Research Session / Research Focus product contract; `HRR_CONVERSATIONAL_ARCHITECTURE.md`, `HRR_FOLLOWUP_DISCOVERY.md`, `ADR-003`, the PRD, the Reviewer-Resources architecture doc, the architecture index, and `claude.md` each carry a one-line pointer here rather than duplicating this content.

---

## A. Repository state

| | |
|---|---|
| Branch | `work/cah-4f-reviewer-resources` |
| HEAD / `origin/main` | `56c696d` — match, 0 ahead/behind, clean |
| Drift | none — exact commit CAH-4G.11 finished on |

## B. Product-boundary decision (plain language)

**HRR helps the Human Reviewer understand governed Living Knowledge relevant to the one issue they are currently investigating.** It does not perform the review, evaluate all workbook evidence, decide sufficiency, recommend a verdict, make findings, approve/reject, commercially clear, or maintain an unlimited reasoning conversation across the whole workbook. The intended shape of use is: pick an issue → a short, focused HRR research exchange (a handful of turns) → return to the workbook → the Human Reviewer independently examines evidence and documents their own judgment → move to the next issue → a new, separate research session. The Human Reviewer stays responsible for everything HRR is not: evidence, sufficiency, methodology, findings, verdict, documentation.

## C. CAH-4G.11 reconciliation

**Retained unchanged:** the 12-class follow-up taxonomy (`HRR_FOLLOWUP_DISCOVERY.md §D`); the 13-way failure classification (§G); the authority-firewall finding that the gate is orthogonal to referent resolution (§J); the model-cost O(1)-vs-O(n) analysis (§L); the rejection of transcript-based chat; the Track-C provenance comparison (principle transfers, mechanism does not).

**Narrowed by the session/focus product boundary:**
- Class A (referential) and G (applicability follow-up) become **simpler**: inside one Research Focus there is usually exactly one candidate referent, so "that" rarely needs to be disambiguated among several active topics — it almost always means "this session's focus."
- Class B (topic-continuation) is **absorbed**: "is there anything else relevant?" is now just "more within this session's focus," answered by re-running retrieval for the same focus — no new mechanism needed beyond focus identity.
- Class L (comparative) reframes as a **focus-switch question** (§F below), not a pure referent problem.
- Class J (navigation/UI): the CAH-4G.10C density observation is not solved here, but a product design that keeps sessions short is a **self-limiting** mitigation, independent of any UI fix.

**Retired:** the framing (present in CAH-4G.11's own opening motivation, inherited from the original CAH-4G.9 task) that discovery must determine "whether HRR should support unlimited workbook-wide conversation." PM has already decided **no** — that question is closed and is not re-litigated by production evidence.

**Remaining discovery need:** CAH-4G.11's minimum-context candidate (topic identity + turn id + entry mode) is **not automatically promoted** here. It is *further refined* (§G) but whether to implement it at all still requires the narrower, session-scoped discovery in §Q — CAH-4G.11's own evidence threshold (≥2 independent taxonomy-class failures, ruled out as composition-fixable) has not yet been met with real evidence gathered under this new frame.

## D. Research Session definition

| | |
|---|---|
| **Starts** | (1) a topic-shortcut click (existing, zero-model, deterministic — already an explicit focus-establishing action); (2) a free-form question with no session currently active (existing — the classifier resolves its topic set, which becomes the focus); (3) *(not currently wired)* an explicit "research this" entry point from a specific workbook issue/control — a genuine future integration point, not equivalent to (1)/(2) today (see §E). These three are **not interchangeable**: (1) and (2) already exist and need no new mechanism; (3) requires new workbook-side wiring this milestone does not design. |
| **Anchor** | the **Research Focus** — the resolved governed topic **set** (1 to `HRR_MAX_RESOLVED_TOPICS`, currently ≤2) established by the session's *originating* explicit action. A workbook location/label may **orient** the reviewer visually (**display context**) but is never treated as a governed fact or an implicit topic hint (**reasoning authority**) — these are kept structurally separate. |
| **May continue** | a direct follow-up on the *same* focus topic(s); a clarification about governed terminology already used in a rendered answer; another explicit question that also names the same topic(s). |
| **Ends** | an explicit reviewer action to start a different focus (a different topic click, or a future explicit "Research another topic" control) — **preferred, unambiguous**; a free-form question whose resolved topic set differs from the active focus — treated as a **new** focus by default (never silently merged); "Clear conversation" (heavier: also empties visible history, unchanged from Slice A); workbook-navigation lifecycle (unchanged from Slice A — clears everything). **No bounded inactivity/timeout is invented** — there is no product evidence to justify one (Phase 5). |
| **Switch** | see §D "ends," mirrored: switching *to* a new focus is the same event as ending the old one. There is no separate "switch" mechanism beyond a new explicit or newly-resolved focus superseding the previous one. |

**A structural finding, not just a design goal:** because HRR composition is fully deterministic (no free-text generation anywhere in the pipeline — `projectHrrResearchAnswer` is a pure function of structured inputs), **the model can never itself decide to open or close a session** as a side effect of generating text. Any session boundary is, by construction, computed from (a) explicit reviewer actions and (b) the *existing*, already-audited, per-turn classifier topic resolution — never from hidden model judgment about continuity. This closes Phase 4's "no hidden LLM-controlled session boundary" requirement structurally, not just by policy.

## E. Research Focus model — workbook issue vs. LK topic vs. governed proposition

These are **four distinct things** and must not be collapsed:

| Concept | What it is | Current code-level link to HRR |
|---|---|---|
| **Workbook issue / control** | A specific control inside one of the Reviewer Manual's 7 domains (A/R/H/I/L/T/D) the Human Reviewer is currently working through. | **None today.** `ReviewerResources`/`ReviewerLkPanel` receive only `submissionId` — there is no code path passing "which control is the reviewer currently on" into HRR. |
| **Reviewer research issue** | The reviewer's own mental framing of what they're trying to understand ("is this copyrightable?"). | Expressed only through what the reviewer types or clicks — never a separate tracked entity today. |
| **Governed (LK) topic** | One of the fixed `ReviewerResearchTopic` enum values (`commercial_use`, `copyright_ownership`, `copyrightability`, `likeness`, `third_party_source_rights`). | **This is HRR's actual unit of anchoring today** — `HrrAnswerTopic.topic`, `ExplicitResearchIntent.topic`. |
| **Governed proposition** | One specific `claim_id` / `ReviewerLkClaim` surfaced within a topic. | Sub-topic granularity; several propositions can exist per topic, and a Research Focus is explicitly **not** required to equal exactly one proposition or even exactly one topic (PM's own instruction — a future issue may legitimately span multiple governed propositions, and today's classifier already supports up to `HRR_MAX_RESOLVED_TOPICS` topics per resolved intent). |

**Conclusion:** for V1, **Research Focus = the resolved governed-topic set** (the thing HRR already produces every turn) — this is the only one of the four concepts that has an existing, authoritative, code-level identity. The workbook-issue-to-topic mapping is a real, valuable *future* idea (letting a reviewer start research "from" a specific control) but does not exist today and is not designed here; until it does, "the issue the reviewer is investigating" is operationally *defined by* which topic(s) they asked about, not by which workbook control is on screen.

## F. Turn-bound analysis

PM expects short sessions (~3–4 turns), but **no hard numeric cap is recommended** in this design. Rationale: bounded-*focus* scope, not turn-*count*, is what actually provides safety —
- every turn (1st or 10th, same focus or not) re-runs the full fresh governed pipeline (§H) — a long same-focus session carries no more staleness/authority risk than a short one;
- the authority firewall's determination is per-utterance and turn-count-invariant (§I) — length cannot erode it;
- therefore a numeric cap, if ever introduced, would be a **product/UX control** (keeping the narrow rail usable, matching the intended short-session workflow) — **never** a correctness or governance mechanism, and must not be described as one. Any future cap decision belongs with composition/UX work (`§HH` density observation), not with this architecture.

## G. Bounded context contract (candidate fields, generalized from CAH-4G.11)

Whether *any* of this is ever built is still gated on §Q's evidence — this table defines what it would contain **if** authorized, refining CAH-4G.11's singular "topic identity" candidate into a **set**-aware form matching PM's explicit multi-proposition allowance:

| Candidate field | Needed? | Authority / source | Lifetime | Re-derive instead? | Risk |
|---|---|---|---|---|---|
| `originating_turn_id` | yes (minimal) | client-generated (already effectively `hrr-thread.ts`'s `seq`) | one session | n/a | none |
| `research_focus_topics: Topic[]` (bounded enum **set**, ≤ `HRR_MAX_RESOLVED_TOPICS`) | **yes — the one field genuinely necessary** | mechanically equal to the session's most recent resolved `HrrAnswerTopic[].topic` set | one session, defined by **recency only** (never accumulated across sessions) | — | low, provided it is always "most recent only" |
| `entry_mode` (`'topic'` \| `'free_form'`) | optional, minor phrasing aid | derived from how the session started | one session | could be omitted entirely | none |
| originating explicit question (prose) | **no** | reviewer-authored, but still prose | — | only the *current* turn's own text is ever sent | reopens injection/prose surface for no benefit over the topic set |
| resolved governed proposition / claim IDs | **no** | derived, volatile | — | `selectReviewerClaims` re-run fresh every turn | staleness — LK could supersede a claim between turns |
| `bi_status` / applicability state | **no** *(narrows CAH-4G.11, which still listed this)* | derived | — | BI re-run fresh every turn | staleness; also unnecessary — the classifier doesn't need it to route a referent, only the deterministic pipeline does, and that recomputes it anyway |
| unresolved requirement IDs | **no** | derived | — | recomputed from current applicability every turn | staleness |
| previous HRR answer prose | **never** | model/composition output | — | the answer is a *record*, never a fact source | conclusion-as-fact risk, injection, staleness |
| previous BI/applicability result objects | **never** | derived | — | always recomputed | could contradict newly-current governed state |
| project-fact values (jurisdiction, tools, human contribution) | **never *carried* as session context** — always **re-read** fresh from the authoritative source every turn | the submission's own record | assessment-scoped, not session-scoped | always re-read, never cached in session state | none, as long as it is re-read, not cached |
| assessment/workbook state | **never** | assessment record | — | HRR has no read or write path to it at all | would violate the authority firewall entirely |

## H. Freshness contract

**Session continuity does not mean knowledge-snapshot continuity.** For every new turn — first or Nth, same focus or not — Living Knowledge → Retrieval → Applicability → Bounded Interpretation → Composition all run from **current authoritative state**, unconditionally. A session's bounded context (if ever implemented, §G) only ever selects *which topic(s)* feed that fresh pipeline; it can never substitute for, patch, or extend the pipeline's own output. If Living Knowledge or a project fact changes between turn 1 and turn 3 of the *same* session, turn 3's answer reflects the new state honestly; turn 1's already-rendered answer remains a static historical record and is never retroactively revalidated. This requires no new mechanism — it is already true of the existing pure-pipeline architecture (`runHrrResearch` is stateless and rebuilt per call) and is stated here as an invariant any future session design must preserve.

## I. Authority firewall inside a session

The drift scenario ("what does governed knowledge say" → "why does that matter" → "what should I check" → "is the evidence enough" → "should I approve it") is analyzed turn-by-turn: `hrrAuthorityGate` fires on the **current utterance's own** `assessment_decision_requested` boolean, with no memory, no accumulation, and no way to weight "how long has this session run" or "how many governed propositions has the reviewer now seen." "Is the evidence enough?" and "should I approve it?" are both, independently, classified as decision requests today and refused today, regardless of session length. **Invariant for any future design:** the authority gate's determination must remain a function of the current utterance alone — never of session length, turn count, or accumulated topic/claim history. No composition change may let several `directly_relevant` orientations, strung together across a session, render as an implied "therefore, cleared." A session's mere *existence*, however long, cannot increase HRR's authority.

## J. Workbook handoff

**HRR research does not automatically write into the workbook.** Nothing asked or answered in HRR becomes evidence, an observation, a finding, a control result, a sufficiency judgment, an outcome, or sign-off state — this is already structurally enforced (no HRR module imports `lib/assessments`; no write verb exists anywhere in the reviewer-lk/HRR tree; enforced by `authority-firewall.test.ts`) and is unaffected by anything in this document. The intended handoff shape — *research complete → return to workbook → reviewer documents their own judgment* — is a real future UX idea (e.g., a light "Finish research" affordance that simply ends the active session cosmetically) but **no UI is designed here**, and any future "copy summary into a workbook field" affordance would require its **own**, separately deliberate authorization — this milestone does not open that door.

## K. Research history/log boundary

Conceptual boundary only — **no schema, no persistence, not authorized.** Purpose (if ever built): let a reviewer see which sessions occurred and revisit them, for continuity/accountability. Must **never**: become assessment evidence; satisfy a control; become a project fact; feed old answer prose back into new reasoning; certify that a topic was "adequately reviewed."

**The critical distinction, made explicit:**
- **REOPEN FOR REVIEW** — read-only: the reviewer can see what was asked/answered in a past session, like reading an old thread. Purely a display affordance; nothing here feeds current governed research.
- **RESUME AS ACTIVE REASONING CONTEXT** — if the reviewer asks a *new* follow-up while viewing a reopened historical session, that new turn must be treated exactly like any other live follow-up: the full fresh pipeline runs against *current* state (§H), and any bounded context reflects only the *reopened* focus's topic identity — never the old session's rendered content as fact. **These are not automatically the same operation**, and a future Research Log design must keep them explicitly distinct.

An illustrative (not prescribed) future log-entry shape: `{ research_focus_topics, started_at, turn_count, session_id }` — deliberately no claim content, no answer prose, no "reviewed adequately" field.

## L. Persistence decision (V1)

**Ephemeral remains correct.** PM has stated maximum persistent memory across the workbook is not currently required. A future bounded session-context mechanism (§G), if ever authorized, needs **no persistence beyond what Slice A already has** (client React memory) — it is a different *shape* of the same ephemeral client state (grouped by focus), not a new persistence tier. The future Research Log (§K) is an entirely **separate**, later milestone with its own deliberate persistence/schema/audit decision — it must not be bundled into any session-context change.

## M. Session UX contract (conceptual only — no visual design, no implementation)

- Existing topic shortcuts already function as explicit focus-starting actions — no new mechanism needed there.
- A free-form question's *first* turn does not strictly need an explicit focus label (the resolved topic already appears via `HrrAnswerTopic.topic_label` in the rendered answer), though a persistent "Research focus: X" caption near the composer could help orient the reviewer while a session is active — a future composition/UX question, not decided here.
- How the reviewer currently knows which focus a follow-up belongs to: today, only by reading the visible thread (Slice A has no explicit focus label at all).
- How a reviewer intentionally switches focus: a different topic-shortcut click (already works); a free-form question naming a new topic (already works); a future explicit "Research another topic" control would make this unambiguous without requiring a new topic name to be typed.
- **"Clear conversation" vs. a future "End session"/"Finish research":** these are different-weight actions. "Clear conversation" (existing) empties the entire visible thread — the heaviest reset. A hypothetical lighter "Finish research" would end only the *active reasoning boundary* while leaving the append-only visible history exactly as CAH-4G.10C proved it — genuinely different blast radii, and worth keeping conceptually distinct even before either is built further.
- How a future Research Log would change this: it could let "Clear"/navigation-away safely discard the *live* ephemeral thread without losing the *record*, because the record would live in the log rather than in client memory — but this is explicitly future and unauthorized (§K/§L).

## N. Correction / focus-switch semantics

| Utterance | Hypothesis (discovery-testable, not asserted) | Must never |
|---|---|---|
| *"No, I meant ownership."* | Most likely reduces to an **ordinary new explicit topic mention** ("ownership" → `copyright_ownership`) via the *unchanged* classifier — not a special "correction" code path. Ends the prior focus by simple recency; starts a new one. | mutate a project fact, create evidence, or silently keep the old focus's context active |
| *"Actually, I'm asking about whether it can be copyrighted."* | Likely a **rephrasing within the same focus** (names "copyrighted" → `copyrightability`) — also self-contained, no special mechanism. | same |
| *"Ignore that — let's look at likeness."* | The explicit new topic ("likeness") is sufficient on its own to establish a new focus; "ignore that" is a UX-level instruction the architecture does not need to specially parse, provided the fresh explicit mention always wins. | same |

General rule, unconditional regardless of classification outcome: **no correction or focus-switch utterance may mutate project facts, evidence, controls, findings, or workbook state** — already structurally impossible today (§J) and unaffected by any future session design. Prefer explicit reviewer actions (a topic click, an explicit "Research another topic" control, or a cleanly-resolved new topic mention) over hidden model inference; an utterance that does not resolve cleanly must fail exactly as today — offered paths, never a guess.

## O. Genericity

The Research Focus/Session concept is defined purely in terms of the existing generic `ReviewerResearchTopic` enum and governed knowledge. No copyright-, likeness-, music-, stock-, or provider-specific session logic is introduced anywhere in this design — domain differences live entirely in Living Knowledge content, never in session orchestration. This restates and reinforces an existing invariant; it does not add a new one.

## P. GRI / CRC / HRR relationship

Unchanged from CAH-4G.9/.11: **GRI** is the reusable *pattern* (intent → governed retrieval → applicability → BI → consultative composition → provenance), not a shared module. **CRC** has its own session concept (`CRCSessionState`, scoped to an entire guided interview toward a gated deliverable) — a different shape, built for a different purpose, and not touched here. **HRR**'s Research Session/Focus is an HRR-specific product concept layered on top of the same GRI pattern. If a genuinely generic "bounded focus session" primitive ever proves useful to both CRC and HRR, that is a **later, evidence-driven extraction** under the established "shared primitives + separate orchestration" principle — not proposed now. **No CRC runtime change.**

## Q. Revised production discovery plan (replaces CAH-4G.11's broader script for a future CAH-4G.13)

Narrower than CAH-4G.11 — we no longer need to test whether HRR should support unlimited workbook-wide conversation (PM has decided no); we test same-focus and focus-boundary behavior only. Fixture: `CA-RLK-2a PROD SMOKE` / `ASSESS-007-2026-09-07` only; each group starts fresh.

**A — Same-focus follow-ups:** Copyrightability → *"Why isn't that established?"* → *"What do you mean by human contribution?"* → *"Why does that matter?"* Record whether each resolves, and whether a resolved-but-unhelpful answer is a composition problem (the reason was already rendered) or a referent problem (it genuinely wasn't).

**B — Authority drift inside one session:** continue from A with *"Is that enough evidence?"* → *"Should I approve this?"* Confirm both refuse identically to a fresh, first-turn ask of the same questions (control: compare against CAH-4G.11's Q10).

**C — Explicit focus switch:** Copyrightability (a few turns) → reviewer explicitly moves to Copyright ownership (topic click or an explicit new mention). Confirm the old focus's context does not leak into the new answer.

**D — Correction / redirection:** *"…copyrightability…"* → *"No, I meant ownership."* Record whether this resolves as an ordinary new explicit topic (hypothesis in §N) or fails to resolve at all.

**E — Composition vs. context:** for every "why does that matter?"-style result in A, explicitly record whether the immediately preceding rendered answer already stated the reason (composition failure) or not (referent problem) — this is the same discipline as CAH-4G.11 §K, reapplied inside the session frame.

**F — Session length (observational, not a test of a cap):** note naturally how many turns felt useful before the reviewer would rather return to the workbook. **Do not derive a numeric cap from this alone** — it informs product/UX judgment only (§F), never a correctness threshold.

## R. Implementation options (future milestone — not authorized here)

| Option | Description |
|---|---|
| **A — Explicit session + deterministic focus** | Focus boundary is 100% explicit/deterministic (topic click, or an explicit new topic mention, or a future "Research another topic" control). Within an active focus, follow-ups are answered against the **same, still-active** focus without asking the model to resolve a pronoun at all — the system just keeps re-running the pipeline for the sticky focus. Simplest; may not gracefully handle a mixed utterance like "how is that different from commercial use" (needs both the old and a new topic at once). |
| **B — Explicit session + bounded referent resolution** | Same explicit/deterministic focus boundary as A, but the classifier is additionally given the bounded context and asked to resolve which of a small enumerated candidate set (current focus, maybe one just-mentioned alternate) a pronoun refers to. Strictly more capable (handles comparative/mixed utterances) at modestly more complexity. |
| **C — Implicit model-managed session** | The model itself infers session/focus continuity. **Rejected as a primary mechanism** — reintroduces exactly the hidden-LLM-controlled boundary Phase 4 forbids, harms provenance/auditability, and risks silently carrying stale context across what should have been a fresh focus. (A bounded referent-*resolution* call as in B remains acceptable because the *focus boundary itself* stays deterministic — the model only ever resolves a pronoun, never decides "is this a new session.") |
| **D — Transcript-based chat** | Rejected control, unchanged reasoning from CAH-4G.11: O(n) growth, provenance loss, injection surface, correction-semantics ambiguity. |

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Authority safety | ✓ (firewall untouched, §I) | ✓ | △ (harder to audit *why* a boundary was drawn) | △ |
| Provenance | ✓ | ✓ | ✗ (model-decided boundary is unauditable) | ✗ |
| Genericity | ✓ | ✓ | ✓ | ✓ |
| Correction semantics | ✓ (§N reduces most to ordinary asks) | ✓ | △ | ✗ |
| UX (handles mixed/comparative utterances) | partial | ✓ | ✓ | ✓ |
| Model calls | 0 / ≤1, unchanged | 0 / ≤1 if merged into the existing call | 0 / ≤1 if merged, but adds an implicit inference the reviewer can't see | grows with thread |
| Cost / prompt growth | O(1) | O(1) | O(1) if merged | O(n) — rejected |
| Freshness (§H) | ✓ unaffected | ✓ unaffected | ✓ unaffected (freshness isn't the objection) | ✗ (encourages treating history as fact) |
| Implementation complexity | lowest | low–medium | medium, and rejected regardless | — |

## S. Architecture recommendation

**Adopt the Research Session / Research Focus product contract now** (this document) as the frame for all future HRR conversational work — this is sound and does not need further evidence; PM has already made the underlying product-boundary decision. **Do not choose between Option A and Option B yet.** CAH-4G.11's evidence threshold (≥2 independently-worded failures across ≥2 distinct taxonomy classes, each ruled out as composition-fixable) has not been met under this narrower frame — only pre-registered hypotheses exist (§N, §Q). **Controlled production discovery under the session model (§Q) is required before selecting an implementation option**, per CAH-4G.11's own standing rule that one anecdote is never sufficient. Option C is not recommended under any evidence gathered so far. Option D remains rejected.

## T. Milestone map (smallest justified sequence — not committed numbers/titles)

1. **CAH-4G.12** (this) — Research Session / Research Focus product contract. Docs only. Done.
2. **CAH-4G.13** *(only if PM authorizes)* — controlled production discovery under the session model (§Q groups A–F), against the internal synthetic fixture. Docs/evidence only, no runtime change.
3. **CAH-4G.14** *(only if §Q's evidence clears CAH-4G.11's threshold)* — bounded session-context implementation, Option A or B per that evidence, PM-authorized, its own tightly bounded slice.
4. **CAH-4G.x** *(separate, much later, only if reviewer usage independently justifies it)* — Workbook Research Log architecture, with its own deliberate persistence/schema/audit design pass. Not assumed to follow automatically from CAH-4G.14.

No step is authorized by this document beyond step 1.
