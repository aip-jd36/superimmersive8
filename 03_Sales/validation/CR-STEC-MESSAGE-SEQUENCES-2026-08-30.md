# CR STEC Message Sequences — 2026-08-30

**Status:** Real, send-ready sequence drafts for Strategic OS review. **Not launched, not loaded into Dripify.**
**Parent:** `CR-TRACK-A-B2B-READINESS-SPEC.md`, `CR-TRACK-B-CREATOR-READINESS-SPEC.md`, `CR-TRACK-A2-DECISION-OWNERSHIP-SPEC.md`, `CR-TRACK-B2-DECISION-FRICTION-SPEC.md`
**Format convention:** matches existing live sequences in `data/sequence-content.json` (4-message Dripify sequence, `%%first_name%%` merge tag, msg1 = open hook with no pitch, msg4 = polite closer). Signing alias is whichever live alias (Ivy/Vanessa/Angel/JD) is assigned to that lead per `CR-TRACK-A-WAVE1-CANDIDATES.csv` / `CR-TRACK-B-WAVE1-CANDIDATES.csv` — shown as `[Alias]` below.
**A2/B2 addendum (2026-09-12):** Sections A2 and B2 below close the gap flagged in both sub-experiment specs and in `COMMERCIAL-READINESS-VALIDATION-PLAN-v1.md` — approved Strategic OS message copy for Angel (A2) and Vanessa (B2), supplied verbatim by Strategic OS and committed here unedited (no rewriting, no optimization). Prior to this addendum this file had zero A2/B2 references, per the audit finding both specs recorded on 2026-09-11.

**Discipline applied throughout (PMM §10):** no "Decision Engine," no provenance/C2PA/prompt-logging pitch, no Commercial Assurance sales pitch, no language presupposing a review/sign-off step exists. Every discovery message stays a genuine open question the respondent can answer "nothing happens — the documentation is enough" without that reading as a failed message.

---

## A. CR-Track A — B2B Readiness Discovery Sequence

**Objective:** discover whether a distinct commercial-readiness determination exists *after* production documentation/evidence — not to teach the respondent SI8's architecture, not to sell anything in this sequence.

**Proposed Dripify name:** `SI8_CR-Track A Discovery (4 Msg)`

**Msg 1 (connection request note):**
> Hi %%first_name%%,
>
> Quick question — once you've documented the AI tools, source assets, licenses and other production details on a project, what happens next before it actually goes live? Genuinely curious how that works on your end.

**Msg 2 (post-connect):**
> Hi %%first_name%%, thanks for connecting!
>
> I'm trying to understand what happens *after* the documentation exists — not the documentation itself. Once it's there, is that the end of it, or does someone still need to review what it means for the specific use? Even a one-line answer helps.
>
> [Alias]

**Msg 3 (narrow follow-up):**
> Following up — specifically curious whether that's a formal step (someone reviews and signs off) or informal (the documentation itself is treated as enough, nobody separately checks it). Both are genuinely useful answers for what I'm working on. No pitch here — just trying to understand how this actually works day to day.

**Msg 4 (polite closer):**
> No worries if the timing isn't right, %%first_name%%. If you're ever up for comparing notes on how AI production documentation actually gets used once it exists, I'm around. Good luck with what you're working on.

**Explicitly permitted "negative" outcome:** a reply of "nothing happens, the documentation is enough" is a complete, valid, useful answer — logged as `response_classification=A` in the ledger, not a failed send.

---

## A2. CR-Track A2 — Decision Ownership Discovery Sequence (Angel)

**Sub-experiment of CR-Track A** — see `CR-TRACK-A2-DECISION-OWNERSHIP-SPEC.md`. **Sender (alias):** Angel. **Objective:** locate who owns the readiness determination, per that spec's Hypothesis and Message principle — not to sell architecture. **Status:** approved copy, supplied verbatim by Strategic OS 2026-09-12; not loaded into Dripify, no send has occurred.

### Message 1 — Connection Request

Hi %%first_name%%,

Quick question — on commercial AI projects, if the team has documented the tools, source assets, licenses and approvals, who actually decides whether that's sufficient for client delivery?

Curious how that works at your company.

### Message 2 — After Connection

Hi %%first_name%%, thanks for connecting!

I'm especially curious whether that's a formal step on your projects — producer sign-off, legal/client review, etc. — or whether the documentation itself is generally enough.

Either answer is genuinely useful for what I'm researching.

Angel

### Message 3 — Follow-up

Last question on this — when something in that record isn't clear, what usually happens? Does someone internally make the call, does it go to the client/legal, or does the team tend to change the work instead?

### Message 4 — Close

No worries if the timing isn't right, %%first_name%%. I'm trying to understand how AI-production teams actually handle that last step before commercial delivery, including when there isn't really a separate review step.

Happy to compare notes anytime.

---

## B. CR-Track B — Creator Readiness Discovery Sequence

**Objective:** discover how creators currently determine whether an AI project is commercially okay to use — no provenance-maturity requirement, no CRC link in this sequence.

**Proposed Dripify name:** `SI8_CR-Track B Discovery (4 Msg)`

**Msg 1 (connection request note):**
> Hi %%first_name%%,
>
> Quick question — when you're using AI on a commercial project, how do you check whether the tools, reference assets, likenesses, music, etc. are actually okay for the intended commercial use? Curious how you handle that.

**Msg 2 (post-connect):**
> Hi %%first_name%%, thanks for connecting!
>
> I'm trying to understand how creators actually make that call in practice — is it something you check per project, or more of a general instinct you've built up at this point? Even a rough answer is genuinely useful to me.
>
> [Alias]

**Msg 3 (narrow follow-up):**
> Following up — specifically curious whether you've ever been unsure about a project (something felt like it might be a problem but you weren't fully sure), versus always feeling confident going in. No pitch — just trying to understand the real experience.

**Msg 4 (polite closer):**
> No worries if the timing isn't right, %%first_name%%. If you're ever up for comparing notes on how creators think about this, I'm around. Good luck with the work.

**If a creator raises provenance/prompt-logging pain unprompted** (e.g. "the hard part is just keeping track of what I used"): acknowledge it, then redirect per the Track B spec — *"Assume you had all of that information available — would you know whether the project was commercially okay to use?"* — manually, in conversation; not scripted into the sequence itself since it's conditional on their specific reply.

---

## B2. CR-Track B2 — Decision Friction Discovery Sequence (Vanessa)

**Sub-experiment of CR-Track B** — see `CR-TRACK-B2-DECISION-FRICTION-SPEC.md`. **Sender (alias):** Vanessa. **Objective:** probe post-check residual uncertainty and its consequence, per that spec's Hypothesis and Message principle — not the existence of checking itself (B1's job) and not a pitch for CRC/provenance/Decision Engine architecture. **Status:** approved copy, supplied verbatim by Strategic OS 2026-09-12; not loaded into Dripify, no send has occurred.

### Message 1 — Connection Request

Hi %%first_name%%,

Quick question — when you're using AI on client work, are there ever cases where you've checked the tools, licenses and source assets but still aren't sure whether the project is actually okay to use commercially? Curious what you do in those situations.

### Message 2 — After Connection

Hi %%first_name%%, thanks for connecting!

When one of those gray areas does come up, who usually makes the call — you, the client, legal, or someone else? I'm trying to understand where that decision actually lands in practice.

Vanessa

### Message 3 — Follow-up

One more thing I'm curious about — has that uncertainty ever actually changed what you did on a project? For example, changing or dropping something, delaying delivery, or getting someone else to review it.

Even "not really, I can usually resolve it myself" is useful for what I'm researching.

### Message 4 — Close

No worries if the timing isn't right, %%first_name%%. I'm mainly trying to understand where commercial-use questions actually become difficult for creators, if they do at all.

If you're ever up for comparing notes, I'm around. Good luck with the work.

---

## C. Track B — CRC Invitation (separate follow-up, NOT part of the discovery sequence)

**Sent only after a substantive response to the discovery sequence** — never bundled into msg1–4, never sent automatically to everyone contacted. Per the Track B funnel, this is the `crc_offered` event.

> Hi %%first_name%%,
>
> Based on what you shared, thought this might actually be useful rather than just something to talk about: we built a free tool (CRC) that walks through a specific AI project and shows you what looks resolved, what's missing, and what might need a closer look. No cost, no signup beyond an email if you want the results sent over — and to be clear, it's not a certification or a legal opinion, just a structured way to check.
>
> If you want to try it on the project you mentioned: [tagged CRC link — see below]
>
> Takes about 10–15 minutes. No pressure either way — happy to keep comparing notes regardless.

**Tagged link format:** `https://app.superimmersive8.com/crc?ref=<wave-code>&lead=<b-id>`
- `ref` — the wave code, e.g. `cr-track-b-wave1`. Always included.
- `lead` — the CRM B-ID, e.g. `B087`. Included **only when the lead already has one** (i.e. warm-lead candidates or anyone graduated into `CRM.md`). STEC-sourced Track B candidates without a B-ID get a `ref`-only link — `lead` is never backfilled with a name, email, or any other identifier as a substitute.
- Never a name, email, or LinkedIn URL anywhere in the link, per the attribution implementation's sanitization (`VALIDATION-LEDGER-SCHEMA.md` §"CRC attribution").

**Example, warm lead with a B-ID:** `https://app.superimmersive8.com/crc?ref=cr-track-b-wave1&lead=B087`
**Example, STEC-only candidate, no B-ID:** `https://app.superimmersive8.com/crc?ref=cr-track-b-wave1`

---

## Not yet done

- These sequences (A, A2, B, B2) are not loaded into Dripify and no send has occurred.
- Msg-level A/B copy testing (e.g. alternate hooks) not drafted — out of scope until Wave 1 itself is authorized.
- The CRC invitation's exact send trigger (manual by the outreach operator vs. a future automated follow-up) is intentionally left as an implementation detail per the Track B spec — "that implementation choice is secondary" to the discovery-outreach-≠-CRC-invitation distinction itself.
