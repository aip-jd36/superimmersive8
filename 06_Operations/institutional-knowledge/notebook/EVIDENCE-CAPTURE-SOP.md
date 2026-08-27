# Living Knowledge — Evidence Retrieval & Human-Assisted Source Capture SOP

**Status:** ACTIVE — process documentation, not itself governed knowledge.
**Added:** 2026-08-27, during the Music/Audio Scenario A primary-evidence-resolution milestone.
**Scope:** Domain-generic. Applies to **both** `GOVERNED-CLAIMS.md` (non-tool-scoped Topic claims) and `PLATFORM-RIGHTS-MATRIX.md` (tool-scoped claims) — this document exists precisely because neither of those two documents' own governance-discipline sections can own a cross-cutting process rule (`GOVERNED-CLAIMS.md`'s own header is explicit that it "does not replace or change the purpose of... `PLATFORM-RIGHTS-MATRIX.md`"). Also applies to any future non-tool-scoped or tool-scoped domain — nothing here is music-, Kling-, Envato-, or Artlist-specific.
**Why this document, not a bullet added to an existing one:** the underlying gap was already independently identified twice — once as a schema-field candidate in `MATRIX-LEARNINGS.md` ("Verification modality"/"Verification Method" — see that file's "Fields that were missing" section, Runway and Kling/Pika entries) and once as lived, undocumented practice (the Kling row in `PLATFORM-RIGHTS-MATRIX.md`, where JD manually captured the ToS via browser Print→PDF after automated fetch was blocked, and the Source field records this ad hoc but correctly). This document formalizes the **process**, not a schema change — no field was added to either document's schema by this milestone; that remains a separate, deferred "freeze decision" per `MATRIX-LEARNINGS.md`'s own language.

---

## 1. When automated retrieval is insufficient

Automated retrieval (CLI/tooling fetch) is insufficient when, after a reasonable attempt (see §2), it:
- returns an HTTP error (403, 404, 446, etc.) instead of the page content;
- returns only a cookie-consent wall, a JavaScript-rendering placeholder, or other non-substantive content;
- returns a document (e.g. a PDF) whose structure defeats automated text extraction after a genuine extraction attempt;
- times out or is otherwise unreachable across a reasonable number of attempts.

This is a **retrieval-tooling limitation**, not a judgment about the source's authority or the claim's truth. It says nothing about whether the underlying content exists, what it says, or whether a human could reach it.

## 2. Required order of attempts

1. **Automated retrieval** against the most specific, most authoritative first-party URL available (the actual Terms/License page, not a marketing page, where possible).
2. **Alternate first-party retrieval** — before escalating to a human, try: a different URL on the same first-party domain (a direct-linked PDF instead of an HTML help-center page; a non-help-center page covering the same terms; the provider's own blog/FAQ if it quotes the controlling language directly). This is still automated retrieval, just not the first URL tried — several genuinely different first-party pages should be attempted, not one URL retried repeatedly.
3. **Human-assisted primary-source capture** (§3) — only after (1) and (2) have been genuinely attempted and failed. Do not skip straight to this step because a URL "looks like" it will be blocked (e.g. a Zendesk `/hc/en-us/` help-center path) — attempt it, record the failure, then escalate.

**Explicitly prohibited at every stage:** silently substituting a third-party summary, blog post, or aggregator for controlling first-party evidence merely because the first-party page was hard to reach. A search-aggregated summary may inform which claim to investigate or which human-capture request to write, but it is never itself the evidence tier a governed proposition is authored against without disclosure of its weaker tier (see §5).

## 3. Human-assisted source capture

When steps 1–2 fail, request that a human directly open the authoritative source in an ordinary browser and supply:

- **provider/source name**
- **page/document title**
- **canonical URL**
- **access/capture date**
- **the relevant copied text** (not a paraphrase — the actual clause text)
- **enough surrounding context** to interpret the passage correctly (the section it sits in, neighboring clauses that change its meaning — see the Epidemic Sound Private-Tier-vs-Commercial-Tier finding, §6, for why this matters concretely)
- **any visible effective-date / last-updated / version information** on the page

**The human's job is capture, not interpretation.** Do not ask a human capturer to conclude what a clause means, whether it's favorable, or how it should be governed — that remains the CLI/governance reviewer's job once the text is in hand, per the existing `GOVERNED-CLAIMS.md` discipline that a real, named human must separately make the Adoption/CRC-eligibility decision.

**Acceptable capture methods** (non-exhaustive, matching the Kling precedent): browser Print→PDF, direct copy-paste of the visible text, a screenshot transcribed alongside the URL/date. The method itself is not what matters — what matters is that the provenance record below is accurate about which method was used.

## 4. Provenance classification

Every piece of evidence behind a governed proposition must be classified as one of:

- **A. Independently retrieved primary evidence** — CLI/tooling fetched and read the source directly this session.
- **B. Human-captured primary-source evidence** — a human directly read the authoritative source in a browser and supplied the text; CLI did not independently fetch it.
- **C. Corroborated via indexed excerpt, not independently fetched** — a search engine's indexed snippet of the primary source was read, but the full page itself was never directly fetched or captured (weaker than A/B — matches the existing "search-indexed excerpts" language already used for Kling/Pika).
- **D. Secondary/aggregated** — a third-party summary, explainer, or aggregation site, used only as a discovery aid, never as the sole basis for a governed proposition (matches `GOVERNED-CLAIMS.md`'s existing "candidate source material only" discipline).

**Hard rules:**
- CLI must never record class A when the evidence was actually class B — i.e., must never claim to have independently fetched or verified content that was actually supplied manually. The Source field must say which happened, in plain language (mirroring the Kling row's own "human-captured browser Print→PDF (JD), directly read").
- Human transport of text does **not** demote it to third-party/secondary evidence. Class B is still primary-source evidence — a human reading the actual authoritative page satisfies "a primary source was checked" exactly as well as an automated fetch does (this is the exact principle `MATRIX-LEARNINGS.md` already established for Kling/Pika; this document formalizes it, not invents it).
- Reuse the existing `Source authority/type` vocabulary (`GOVERNED-CLAIMS.md`'s entry template: Primary legal/official authority | Official platform authority | Strong secondary authority | Industry evidence | SI8 operational evidence | SI8 judgment) for what kind of source it is; use the A–D classification above, recorded in the Source field's own prose, for how it was obtained. The two are independent — a class-B (human-captured) piece of evidence can still be "Primary legal/official authority" in type.

## 5. Fail-closed rules

- If supplied text is **incomplete**, **ambiguous**, **internally contradictory**, **lacks sufficient context** to interpret confidently, or **cannot reasonably be tied to the claimed authoritative source** (no URL, no visible provenance, unclear which page it came from), the underlying proposition **remains unresolved** — `Lifecycle: Candidate` at most, never `Adopted`, never `CRC eligible: Yes`.
- **Retrieval failure is never evidence of absence.** "We could not fetch Artlist's page" must never be written or implied as "Artlist has no such restriction" — the correct record is "not yet independently confirmed," full stop.
- **A contradiction found in evidence must be preserved, not force-reconciled**, unless a *specific*, evidenced distinction resolves it (different plan/tier, different use case, different document version/effective date — see §6 for a real example of exactly this happening). Absent such a specific distinction, record the contradiction explicitly and leave the proposition `Candidate`/unresolved.
- Weak evidence must never be silently promoted to a stronger tier merely because a domain is new or because stronger evidence proved hard to obtain.

## 6. Worked example from this milestone (Epidemic Sound)

Two Epidemic Sound sources appeared to contradict: one FAQ page said Pro/Enterprise plans "can use music for ad campaigns," while a different summary said the license "does not cover... paid media space, such as online pre/mid/post-rolls." Direct primary-source retrieval (a class-A fetch of Epidemic Sound's own `SingleTrackLicensesV8.pdf`, successfully extracted after an initial automated-summarization failure required falling back to direct PDF text extraction) resolved this: the "no boosted or branded content, ads... paid media... pre/mid/post-rolls" restriction is a clause of the **Private Tier** license specifically; the separate **Commercial Tier** license section of the same document contains no such restriction (it excludes only "TV ads"/"broadcast type content," a narrower carve-out), and separately grants a "Monetization" right to display third-party ads on the user's own published Productions. **The apparent contradiction was resolved by tier, with primary-source text confirming it — the "different plan/license scopes explain it" outcome the task anticipated as legitimate, not a forced reconciliation.**

## 7. Refresh interaction — SOURCE CHANGED vs. GOVERNED PROPOSITION CHANGED

This SOP applies identically during periodic refresh, with one added distinction that must never be collapsed:

- **SOURCE CHANGED** — the provider's page moved, was restyled, changed URL structure, or updated an unrelated section. This alone does **not** require the governed proposition to change.
- **GOVERNED PROPOSITION CHANGED** — the specific clause(s) the proposition rests on now say something materially different.

A refresh pass must re-confirm the specific clause text (via the same §2 retrieval order, escalating to §3 human capture if needed), then compare it against the *proposition*, not just against "did the page load." Only a genuine proposition-level change triggers supersession (existing `superseded_by` mechanism, unchanged by this document). Recording *what specifically was re-confirmed unchanged vs. what changed* is not currently a structured field anywhere (a real, disclosed gap — see the parallel finding in the Music Scenario A diagnostic's own §V) — until it exists, record this distinction in prose in the claim's own Source/comment field, the same way every other nuance in this repo's LK documents already is.

## 8. Domain onboarding loop (current, evidenced shape — not a frozen schema)

```
domain candidate selection
  → scope / exclusions (what's in, what's explicitly out)
  → comparative provider research (small representative sample, not one provider generalized)
  → candidate propositions drafted
  → primary-evidence resolution (this SOP, §1-§6)
  → human-assisted source capture where automated retrieval was insufficient (this SOP, §3)
  → Formal Governance Review (governance-reviews/ folder, verbatim artifact required)
  → CRC Publication Review (separate decision from Adoption — CPR_NNN_<claim-id>_<date>.md)
  → publication (Lifecycle: Adopted + CRC eligible: Yes, both requiring a real named human approver)
  → periodic refresh (§7, same retrieval/capture discipline, re-applied)
```

This mirrors the process `GOVERNED-CLAIMS.md`'s own governance discipline and the `governance-reviews/` folder's existing naming convention already establish for Wave 1 (copyright) and M1–M4 (stock media) — this document does not introduce a new lifecycle, only names the research/capture steps that precede it explicitly.

## 9. Reconciling multiple sources for the same provider (added 2026-08-27, Artlist evidence-processing cycle)

When more than one source exists for the same provider (e.g. a Help Center explainer and the formal License/Terms document), classify each material statement as one of: **corroborated** (both sources state the same thing); **source-specific but compatible** (only one source covers it, but nothing contradicts); **narrower/broader** (one source's wording is a strict subset or superset of the other's); **potentially conflicting** (a real, unreconciled disagreement); **unresolved** (neither source is clear enough to say). Do not manufacture a conflict merely because wording differs in specificity or phrasing.

**The more formal/controlling document (License/Terms) governs proposition wording when it and a less formal source (Help Center, FAQ) differ in specificity or conditionality** — e.g. a Help Center page's unqualified summary sentence should not be used to state a governed proposition more strongly than the formal License's own, more conditional phrasing supports. The less formal source remains useful as corroborating context, not as the wording authority.

## 10. Testing a generic (provider-independent) proposition before promoting it (added 2026-08-27)

A proposition should only be authored with `provider_scope: null` if it demonstrably **survives variation across the sampled providers** — not merely because a majority of them happen to look similar. Concretely: check whether the proposed generic wording remains true for every sampled provider's own specific mechanism, even where those mechanisms differ structurally (e.g. one provider gating commercial use behind a plan upgrade, another granting it broadly by default but restricting specific use-types instead). A generic proposition that is only true for most sampled providers is not yet a generic proposition — it is either a provider-specific claim for those providers, or a narrower generic proposition that abstracts away the part that actually varies (matching the "access/download ≠ a specific use being licensed" framing found sufficiently narrow to survive real provider variation during the Music Scenario A milestone, where a broader "commercial use is always tier-gated" framing did not).

## 12. Durable repository preservation (added 2026-08-27, Artlist evidence-preservation cycle)

**A human-supplied evidence artifact (a PDF, a screenshot, a pasted excerpt) that exists only on the human's own machine, or only as text pasted into a chat/task prompt, is not durably preserved.** "Human supplied" does not mean "it existed somewhere in a conversation" — for evidence to survive a session handoff, the human intends to delete their local copy, or a future maintainer to reproduce the evidence-to-claim reasoning without relying on this chat, **the actual artifact (or an approved durable equivalent) must be committed to the repository** before that local copy is discarded.

**Naming/storage convention** — mirrors the pattern already established by `lk-automation/archive/` (automated-monitor evidence, scoped to `tools/lk-source-monitor/`) for the human-capture case that tool doesn't cover: `<source-id>_<timestamp>_<hash-prefix>.<ext>`, timestamp in the capture tool's own reported format (e.g. from PDF `/CreationDate` metadata), hash-prefix from a SHA-256 of the file. Store under `06_Operations/institutional-knowledge/notebook/evidence-captures/<provider-or-domain>/`, one file per source (never merge two sources into one artifact), plus a `MANIFEST.md` in the same folder recording the full provenance table (provider, title, source type, URL, capture method, capture date, effective/update date if stated, durable path, SHA-256, page count, extractability, evidence tier, completeness, which sections were actually inspected).

**Do not conflate this with `lk-automation/`** — that directory's own `state.json` hash-tracking is scoped to its two configured automated sources; adding unrelated human-captured content there would corrupt its own assumptions. The pattern is shared; the directory is not.

**Checksum requirement:** every preserved artifact gets a SHA-256 recorded in its manifest, so a future refresh pass can mechanically confirm whether a newly captured version is byte-identical to the one governed claims were authored against (§7's SOURCE CHANGED vs. GOVERNED PROPOSITION CHANGED distinction, now with an actual mechanism for detecting the first half of that question, at least for re-captured artifacts of the same source).

**Candidate propositions and claim drafts are equally subject to this rule.** A candidate claim drafted only in a conversational report, never written to a repository file, is exactly as fragile as an evidence artifact left only on a local machine — the next session cannot "recover it from repository evidence" because none exists. Write candidate propositions to a durable file (e.g. an FGR-prep package document) as part of the same milestone that drafts them, not deferred to "later."

**Do not tell a human their evidence is safely preserved unless it has actually been committed and verified** (checksum matches, file exists at the documented path) — a durable-storage claim that turns out to be wrong is worse than admitting uncertainty.

## 13. What this document deliberately does not do

- Does not add a `Verification Method`/`Verification Modality` schema field to `PLATFORM-RIGHTS-MATRIX.md` or `GOVERNED-CLAIMS.md` — that remains a separate, deferred decision (`MATRIX-LEARNINGS.md`'s own "freeze decision").
- Does not build any automated source-change detection, refresh scheduling, or crawler.
- Does not define a Domain Manifest schema.
- Does not authorize CRC publication of any specific claim — publication remains governed exactly as before.
