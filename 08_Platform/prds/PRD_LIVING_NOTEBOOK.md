# PRD: Living Notebook

**Status:** Active — v1.0 architecture frozen 2026-08-02 (see § Freeze Notice below). Schema changes from external critical review are inline in each of the four document sections below; see also § Maintenance and § What This PRD Deliberately Doesn't Add.
**Owner:** JD Chang (Standards Committee of one, per Reviewer Manual precedent)
**Date:** 2026-07-30 (revised 2026-08-01, frozen 2026-08-02)
**Related:** `06_Operations/reviewer-workbook/SI8-Reviewer-Manual-v0.2.md`, `06_Operations/DECISION-QUALITY-STANDARDS.md`, `03_Sales/ICP-DEFINITIONS.md`

---

## Freeze Notice (2026-08-02)

Living Notebook v1.0 architecture is now considered stable. Future revisions should favor improving content rather than introducing new document classes. New notebook document types require explicit architectural justification based on recurring operational need.

---

## Problem Statement

SI8's reviewer judgment currently lives in three places that don't talk to each other:

1. **The Reviewer Manual** — formal, versioned, deliberately slow-moving. Correct home for stable methodology, wrong home for a fact learned last week.
2. **Individual assessment files and Post-Assessment Reviews** — where judgment calls actually get made and recorded, but scattered one-per-assessment. A pattern that shows up in assessment #3 and again in #11 has no single place to live between those two events.
3. **JD's head / this conversation history** — where most of it actually persists today. Every new reviewer, every new AI agent session, every new hire re-derives things that were already decided, because there is no durable, low-ceremony place to check first.

The cost shows up two ways: **inconsistency** (the same edge case gets judged differently on different days because nobody remembered the earlier ruling) and **repeated research** (the same "is Runway's commercial tier actually clear on this?" question gets re-answered from scratch each time it comes up).

The Reviewer Manual already solves this for *settled, general methodology*. It does not solve it for the much larger, faster-moving layer underneath: platform-specific facts, one-off positions SI8 has taken, resolved edge cases, and questions that are open but material. That layer needs a home with less ceremony than a Manual version bump but more permanence than a chat message.

## Design Principles

- **Evidence-driven origination, not brainstorming.** Entries get added because something happened — an assessment surfaced a judgment call, a platform changed its terms, a regulator issued guidance, the same question got asked twice. Nothing goes in speculatively.
- **Markdown-first, git-native.** These are files in this repo, tracked the same way every other document here is tracked. No database, no separate app, no login. `git log` and `git blame` are the audit trail.
- **Low ceremony, high discipline.** Adding an entry should take minutes, not a review cycle. But every entry still carries a source and a date — this is a notebook with citations, not a scratchpad.
- **A companion to the Reviewer Manual, not a replacement for it.** The Manual is where a Living Notebook entry *goes* once it's proven durable and general enough to state as settled methodology. The Notebook is where it lives while it's still fresh, narrow, or unconfirmed.
- **Four documents only, for now.** Resist the urge to add a fifth category, a tagging taxonomy, or a query layer before the four-document version has actually been used through a few real assessment cycles.
- **Default State: Uncertainty** (added 2026-08-02). New information should normally enter the Living Notebook as either a Pending Question or an external observation. Promotion into an SI8 Position should be the exception rather than the default. Institutional knowledge should grow from evidence gathered through completed assessments, legal developments, platform changes, or repeated reviewer/customer questions — not from internal brainstorming alone.

## Non-Goals

Explicitly out of scope, for v1.0 and frozen as such (see § Freeze Notice):

- No database, no CMS, no structured knowledge graph, no ontology
- No automation, no AI indexing, no vector search, no ingestion pipeline (nothing auto-populates these files from Supabase, Dripify, or elsewhere)
- No search/query tooling beyond what `grep`/`Read` already provide
- No additional document categories beyond the four — expansion happens through content, not structure
- No user-facing surface — this is internal, reviewer- and agent-facing only
- No replacement of the Reviewer Manual's formal versioning discipline
- No enforcement mechanism (no CI check, no lint) — discipline is procedural, per the Update Workflow below

These belong to future versions only if real assessments justify them, and only with the kind of explicit architectural justification described in the Freeze Notice — not by default and not from anticipation of a need that hasn't materialized yet.

## Repository Structure

```
06_Operations/institutional-knowledge/
├── notebook/
│   ├── README.md                    — index, how to use, how to contribute
│   ├── PLATFORM-RIGHTS-MATRIX.md    — per-AI-tool commercial rights facts
│   ├── SI8-POSITIONS.md             — settled positions SI8 has taken
│   ├── EDGE-CASES.md                — resolved judgment calls, one per case
│   └── PENDING-QUESTIONS.md         — open questions that matter
```

This sits alongside, not inside, `06_Operations/reviewer-workbook/` — the Manual/Workbook/Reviewer-Guidance family stays exactly as it is. The Notebook is a new, adjacent shelf.

## The Four Documents

### 1. Platform Rights Matrix

**Purpose:** One row per AI tool (or per tool + plan tier, where terms differ by tier), answering "what do we currently know about this platform's commercial-use terms?"

**Schema (table columns):**

| Field | Description |
|---|---|
| Tool | Platform name (e.g. "Runway Gen-4", "Kling 2.0") |
| Plan Tier | Free / Standard / Pro / Enterprise — only if terms differ by tier |
| Source Wording / Confirmed Fact | What the primary source (platform ToS, official announcement) actually says — quote or closely paraphrase it, don't editorialize in this field |
| SI8 Interpretation | SI8's reading of what that fact means for commercial-use assessment — kept in a separate field from the fact itself, on purpose |
| Training Data Disclosure | What the platform discloses (or doesn't) about training data |
| Known Restrictions | Anything that caps or conditions commercial use |
| Last Verified | Date this row was last checked against a primary source |
| Source | Link or citation — platform ToS page, a specific assessment finding, direct platform correspondence. An internal SI8 document (e.g. `CLAUDE.md`, a marketing page) citing a fact is **not** primary-source verification of that fact — cite the internal doc as what prompted the row, but don't mark `Verified` until the primary source has actually been checked |
| Status | `Verified` / `Needs Reverification` / `Unconfirmed` |

**Update triggers:** platform changes its terms; an assessment surfaces something not yet in the matrix; a row hasn't been checked in 6+ months (mark `Needs Reverification`, don't delete).

**Discipline:** rows for tools SI8 hasn't independently verified go in as `Unconfirmed` with whatever partial information exists — a placeholder with an honest status beats silence, but must never be read as a legal opinion. This matrix is a research aid for reviewers, not a substitute for Domain R evidence review on any given submission.

**Fact vs. interpretation, split deliberately (added 2026-08-01):** the Matrix's own seed content originally blended "what the platform says" and "what SI8 thinks that means" into a single field, which made it easy to accidentally state SI8's reading as though it were the platform's own claim. Keep them apart — see `notebook/PLATFORM-RIGHTS-MATRIX.md`'s Sora and Adobe Firefly rows for a worked example of the split, including a real case where an internal-doc citation for Sora's shutdown date turned out to be imprecise once checked against OpenAI's actual Help Center article.

### 2. SI8 Positions

**Purpose:** A running list of stances SI8 has actually taken and is prepared to repeat consistently — the kind of thing that currently gets re-explained fresh in every sales call or partner conversation because it isn't written down anywhere central.

**Schema (per-entry, revised 2026-08-01):**

```
### POS-NNN — [One-line statement of the position]

**Status:** Active / Superseded (by POS-XXX) / Codified in [Reviewer Manual section, technical spec, etc.]
**Domain(s):** [which Reviewer Manual domain(s) this touches, if any — A/R/H/I/L/T/D — or "Commercial/Positioning" if not domain-specific]
**Source type:** [Primary source (statute/regulation/official platform doc) / Direct evidence (SI8's own assessment finding) / First-party account (interview/conversation) / Internal policy choice — combine if more than one applies]
**Adopted:** YYYY-MM-DD
**Last reviewed:** YYYY-MM-DD
**Source fact:** [what's externally verifiable — statute text, platform documentation, a direct quote. If not independently re-verified in this entry, say so explicitly rather than implying it has been]
**SI8 interpretation:** [SI8's reading of what that fact means — kept separate from the fact itself]
**SI8 position/policy:** [what SI8 actually says or does as a result — stated plainly enough to paste into an email]
**Related:** [[POS-XXX]], [[EC-XXX]]
```

The three-way split (fact / interpretation / policy) replaces the original single "Statement" field. It exists because the single-field version made it too easy for a policy choice (what SI8 chooses to say) to read as though it were settled external fact (what a law or platform actually requires) — see `notebook/SI8-POSITIONS.md`'s editorial note for the specific entries that motivated this change.

**When to mark `Codified in [X]`:** if the underlying rule has been formally adopted into the Reviewer Manual or a technical spec, mark the Position that way rather than leaving it as an independent, equally-weighted source of truth. The codified document is controlling; the Notebook entry preserves history and practical phrasing. If the two ever appear to disagree, fix the Notebook entry — never treat the disagreement as license to follow whichever one is more convenient.

**Required wording, verbatim (applies to both Positions and Edge Cases):** any entry whose Status includes `Codified in [X]` must include this exact sentence in its Status line: *"This entry is an index and practical summary. The cited Manual or Specification controls if the wording differs."* Not a paraphrase — the same sentence, every time. The point is a marker a future editor (human or agent) will recognize on sight and won't casually rewrite while tightening nearby prose, which is exactly how a Notebook entry could quietly start overriding the document it's supposed to defer to. This applies retroactively to any future entry that gets marked `Codified` — check the seeded `SI8-POSITIONS.md` and `EDGE-CASES.md` for the current worked examples.

**Examples of what belongs here** (illustrative, not to be taken as pre-populated content):
- SI8 does not position itself as satisfying EU AI Act Article 50 compliance directly — that's the provider's or deployer's obligation; SI8 supports the surrounding evidence trail.
- Uncorroborated self-attestation of authorship caps at a bounded confidence level regardless of how detailed the account is (Domain H).
- Issued assessments are not retroactively re-scored when methodology updates.

**Update triggers:** a position gets stated consistently across 2+ real conversations or assessments (that consistency *is* the position — write it down once it stabilizes); a Pending Question resolves; an Edge Case generalizes.

**Don't over-claim validation from one data point:** if a Position's "SI8 interpretation" includes a market or commercial thesis (not just an architectural or legal fact), and the evidence behind it is a single conversation or a single assessment, say so plainly in the entry rather than stating the thesis as though it were settled. A single positive partner conversation is a data point, not market validation.

### 3. Edge Cases

**Purpose:** One entry per resolved judgment call that isn't (yet, or ever) general enough to be a formal Position, but is specific enough that the next reviewer who hits something similar should be able to find it.

**Schema (per-entry, revised 2026-08-01):**

```
### EC-NNN — [Short scenario label]

**Domain(s):** [A/R/H/I/L/T/D]
**Source type:** [Direct evidence (SI8's own assessment) / First-party account (interview/conversation) / Third-party analysis (external expert opinion, unverified against SI8 methodology)]
**Source:** [which assessment or conversation surfaced this — link if available]
**Date:** YYYY-MM-DD
**Scenario:** [what happened, specific enough to be recognizable]
**Resolution:** [what SI8 decided, and the reasoning]
**Status:** Resolved / Open — treat as precedent / Resolved — one-off, do not generalize
**Related:** [[POS-XXX]] if this ever gets promoted
```

**Hard rule (added 2026-08-01): an entry only belongs in this file if SI8 actually made a judgment call.** Two categories that don't qualify, and where they go instead:
- An external conversation or opinion that merely *supports* an existing Position without requiring a new ruling — log it as an additional source fact under that Position instead (see [[POS-001]] in `SI8-POSITIONS.md` for a worked example: an Anchor Film conversation that independently confirmed the Domain H rule, with no SI8 judgment call involved, was moved out of Edge Cases and into POS-001's own source fact field).
- An external, unverified opinion (a panel answer, a third party's read of the law) that hasn't yet been checked against SI8's own methodology — this is a Pending Question, not a resolved Edge Case, until that check actually happens. Never mark something "Resolved — treat as precedent" on the strength of someone else's unverified answer.

**Update triggers:** every Post-Assessment Review is a candidate source — if a real judgment call got made that isn't already covered by an existing Position, it becomes an Edge Case entry as part of closing out the review.

### 4. Pending Questions

**Purpose:** Keep material open questions visible instead of letting them quietly disappear — the same discipline as the "Open Questions" classification in the Decision Quality Standards, applied specifically to reviewer/product/methodology questions rather than strategic ones.

**Scope exclusion (added 2026-08-01):** sales-campaign design, ICP targeting, pricing experiments, and general company-execution questions do **not** belong here, even when they're genuinely important — they have their own designated homes (`03_Sales/`, `01_Business/pricing/`, etc.). This file drifts from "commercial-assurance institutional judgment" into "anything JD doesn't want to forget" if that line isn't held, which defeats the point of keeping it narrow. A Standing Encore test-design question was removed from the seeded content for exactly this reason — it already had a home in `03_Sales/standing-encore/SIGNAL-TEST-LOG.md`. The test: does this question affect assessment methodology or repeatable commercial-assurance interpretation? If not, it belongs somewhere else.

**Schema (per-entry):**

```
### PQ-NNN — [The question, phrased as a question]

**Status:** Open / Promoted (to POS-XXX or EC-XXX) / Closed (why, without promotion)
**Raised:** YYYY-MM-DD, by [name or context]
**Why it matters:** [what decision or consistency this blocks while unresolved]
**Promotion path:** [what evidence would resolve this — e.g. "3 real assessments with this pattern," "platform issues updated ToS," "legal review"]
```

**Update triggers:** a reviewer or agent notices a gap the Manual/Notebook doesn't currently answer; a genuinely open strategic/methodology question surfaces in conversation and is worth tracking past that conversation.

## Ownership

JD owns promotion decisions (Pending Question → Position, Edge Case → Position), matching the existing Reviewer Manual governance model where JD is the standards committee of one. Any reviewer or AI agent working in this repo can *propose* an addition to any of the four documents — proposing means drafting the entry in the file directly (this is git-tracked; nothing is destroyed by a bad edit) and, for anything touching an active client relationship or public-facing claim, flagging it to JD before treating it as settled.

## Update Workflow

1. **During or after an assessment:** the Post-Assessment Review process (`SI8-Post-Assessment-Review-Template-v0.1.md`) already asks "what did this assessment teach us." Add a step: if the answer is a specific judgment call, draft an Edge Case entry. If it's a platform fact, update the Rights Matrix.
2. **During a sales/partner conversation:** if JD finds himself explaining the same stance for the second time, that's the trigger to write it down as a Position rather than continuing to re-derive it live.
3. **Ad hoc:** any reviewer or agent can append a Pending Question the moment a real gap is noticed — the bar for adding a *question* is much lower than the bar for adding a *position*.

## Maintenance (added 2026-08-01)

The original version of this PRD didn't specify how entries get *revisited*, only how they get added — which risks the Notebook filling up once and then quietly going stale while still looking authoritative. Two lightweight habits, deliberately not tooling:

1. **Post-assessment closeout question.** Add one required question to the existing Post-Assessment Review process: "Does this assessment change the Notebook?" with an explicit answer — `No notebook impact` / `Matrix update` / `New Edge Case` / `New Pending Question` / `Existing Position challenged`. `No impact` must be written down, not left blank — silence on this question is indistinguishable from forgetting to ask it, and the whole point is to know which one happened.
2. **Periodic skim, not a system.** Roughly monthly, a short pass over `PENDING-QUESTIONS.md` (anything whose promotion path has actually been satisfied?) and any Position/Edge Case with a `Last reviewed` date that's gotten old. This is a calendar habit for JD, the same weight as the existing weekly pipeline review already described elsewhere in this repo — not a cron job, not a dashboard, not something an agent enforces.

Both of these are process, not infrastructure — consistent with the Non-Goals above (no enforcement mechanism, no CI check). If they don't actually happen in practice, the right fix is a reminder habit, not a tool that auto-generates entries nobody asked for.

## What This PRD Deliberately Doesn't Add

An external review of the seeded content raised good points that go further than the above: a formal authority hierarchy (law > professional standard > firm methodology > engagement judgment > informal signal), consultation/dissent records for disputed calls (who was consulted, what the alternative view was, why it was rejected), and independence/conflict-of-interest tracking as its own structured system.

These are real institutional-assurance practices (the kind of thing PCAOB audit-documentation standards and AICPA quality-management guidance actually require of firms), and they're not wrong — they're just Stage 2/3 material by the Vision document's own logic (`06_Operations/institutional-knowledge/COMMERCIAL-ASSURANCE-INTELLIGENCE-VISION-v0.1.md`): nothing gets built ahead of a demonstrated need. Right now SI8 has one reviewer. A formal consultation-and-dissent log has no one to log a dissent from yet, and building it in anticipation of a second reviewer is exactly the kind of premature structure the Non-Goals section already warns against.

What *was* adopted from that feedback, because it's cheap and addresses the same underlying concern without the overhead: the Source type field on Positions and Edge Cases (a lightweight stand-in for authority level), the fact/interpretation/policy split, and the scope exclusion on Pending Questions. Revisit the heavier apparatus specifically when either trigger actually occurs: a second reviewer joins, or a real disputed judgment call happens that the current lightweight fields can't adequately capture. Don't build it before then on the strength of "this is what mature firms do" alone.

Independence/conflict-of-interest tracking specifically: not a new file yet, but logged as [[PQ-006]] in `PENDING-QUESTIONS.md` — whether SI8's existing conflict-of-interest disclosure practice (documented in `CLAUDE.md` for the Producer/independent-verifier split) needs to extend explicitly to grant-funded or referral-partner engagements. That's the right-sized version of this concern for now: a visible open question, not a governance system built ahead of the first engagement that would actually test it.

## Promotion Rules

- **Pending Question → SI8 Position:** promote when the "promotion path" stated in the entry has actually been satisfied — not before. Record what specifically resolved it, same discipline as the Hypothesis → Fact promotion protocol in the Decision Quality Standards.
- **Edge Case → SI8 Position:** promote when the same judgment call recurs (informally: twice is a coincidence, three times is a pattern) or when a single case is judged clearly general enough on its own that waiting for repetition would just mean re-litigating it next time.
- **Position → Reviewer Manual:** out of scope for this document — that promotion follows the Manual's own existing versioning process (a Position stabilizing across multiple review cycles is exactly the kind of evidence that justifies a Manual version bump).

Demotion also happens: a Position can move to `Superseded` status (never deleted — git history plus an explicit `Superseded (by POS-XXX)` marker preserves the trail) the same way the Reviewer Manual treats its own superseded versions.

## Versioning Philosophy

This is the one place the Notebook deliberately departs from the Reviewer Manual's model, and it's worth being explicit about why:

The Reviewer Manual is a **discrete-release document** — v0.1, v0.2, each one a deliberate, reviewed snapshot, changes bundled and dated together. That discipline exists because the Manual is what reviewers are graded against; retroactive drift there would be dangerous.

The Notebook is a **continuously-appended log**, closer in spirit to `DIGEST-LOG.md` or `CHANGELOG.md` elsewhere in this repo. Individual entries carry their own dates and status fields; the file's git history *is* the version history. There is no "Notebook v0.2" — there's just the Notebook, plus `git log` if anyone needs to see what it looked like on a given date. Do not import Manual-style version numbers into these four files; it would add ceremony without adding value, since the whole point is that entries can be added in minutes.

## Relationship to Existing Docs

- **Reviewer Manual v0.2** — stays the formal, slow-moving source of methodology. Notebook entries that touch a specific domain (A/R/H/I/L/T/D) should cross-reference the relevant Manual section, not duplicate it.
- **ICP-DEFINITIONS.md** — separate concern (who SI8 sells to), not folded into the Notebook. If a Notebook Position has direct sales-messaging implications, cross-reference rather than merge.
- **Decision Quality Standards** — the Notebook's Position/Edge Case/Pending Question categories are a domain-specific application of the existing five-classification framework (Fact/Hypothesis/Decision/Open Question/Principle), scoped specifically to reviewer and product judgment rather than company strategy. Use the parent framework's hygiene rules (don't silently promote, don't treat a Decision as evidence, don't remove inconvenient Open Questions) here too.
- **CLAUDE.md Key Documents table** — this PRD, the Vision document, and the notebook directory are listed there, discoverable the normal way.

## Success Criteria

This is working if, six months from now:

- A new reviewer (human or AI agent) can answer "has SI8 dealt with something like this before?" by reading four short files instead of asking JD or re-deriving it.
- The number of times JD re-explains the same stance in a sales call trends toward zero, because the stance is written down and can be pointed to or pasted.
- Post-Assessment Reviews routinely produce a Notebook entry, not just a filed document nobody revisits.
- At least one Notebook entry has actually been promoted into the Reviewer Manual, proving the pipeline from "fresh observation" to "settled methodology" works end to end.

If none of that is happening after a real stretch of use, the right response is to simplify further, not add more structure.
