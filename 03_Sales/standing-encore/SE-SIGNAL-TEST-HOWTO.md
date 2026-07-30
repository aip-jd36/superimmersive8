# Standing Encore — Managed ICP Signal Test: How-To (v1)

*A one-page brief for running a Signal Test. Generic — hand it to any team. SI8 / Creative Directors used as the worked example throughout.*

*Filed verbatim as received from Standing Encore, 2026-07-30. This is the reference doc — do not edit. Test-specific work (audience definitions, hypotheses, message arms, results) goes in `SIGNAL-TEST-LOG.md` in this folder.*

---

## What this is

A **Signal Test** is a managed cold-outreach experiment that tells you **which message resonates with which audience** — before you commit real budget to a campaign, a hire, or a market. Standing Encore sends **500 targeted, human-delivered LinkedIn messages** into a specific audience you want to understand, reads the replies, and returns an **Intelligence Report**: verbatim responses, a read on how strongly the message landed, and a recommendation.

**What it delivers:** signal about audience + message fit.
**What it does NOT deliver:** leads, booked meetings, or proof that anyone will buy. It answers *"does this audience respond to this framing?"* — not *"will they purchase?"* Treat the output as market intelligence, not a sales pipeline. (Warm replies may occur; they're a byproduct, not the deliverable.)

---

## Core parameters (the product, fixed)

- **500 sends** per test — this is the standard unit. Not 300, not 1,000. One test = 500.
- **One audience, held constant.** The whole test targets a single, well-defined segment (e.g. *Creative Directors at mid-size ad/production agencies, English-speaking markets*). Do not mix audiences in one test — you won't be able to tell whether a result is about the message or the audience.
- **Message is the variable.** If you're testing message framing, run multiple *arms* (e.g. 4 arms × ~125 sends, or a 2-arm A/B at 250 each) where **only the message differs** and everything else — audience, sender, timing — is held constant.
- **~3 week turnaround** from launch to report.

---

## How to run one (6 steps)

1. **Define the audience precisely.** Title(s), company type, company size band, region/language. Vague audiences produce vague results. *SI8 example: "Creative Directors and Executive Creative Directors at independent creative/production agencies, 10-200 employees, English-speaking markets."*

2. **Write the hypothesis as a testable question.** What do you believe this audience feels, and which framing will surface it? *SI8 example: "CDs producing AI-generated video feel exposed on rights/chain-of-title and will engage with a message about defensible provenance."*

3. **Draft the message arms.** A 4-message sequence per arm (M1 opener + connect, M2 follow-up question, M3 the reveal/offer, M4 last-touch). If testing framing, vary ONLY the message across arms; keep sender, audience, and timing identical. *SI8 example arms: "legal-risk framing" vs "creative-credibility framing" vs "client-trust framing."*

4. **Build the target list.** 500 real contacts matching the audience definition, deduplicated, and **excluding anyone already contacted** in a prior test. Confirm list composition is balanced across arms if running a multi-arm test.

5. **Launch all arms together, from one sender.** Simultaneous start and a single sending identity remove timing and sender as hidden variables. Confirm the sending tool distributes evenly across arms rather than finishing one before starting the next (a common default that reintroduces a timing bias).

6. **Read replies against a consistent rubric.** Score each reply on: **FIT** (was this the right person?), **RESONANCE** (did the message land — substantive engagement, not just politeness?), and **ACTION** (did they do anything — ask for more, book a call?). Use the *same* rubric across all arms. Compare **resonance rates** across arms to see which framing won.

---

## The rules that make the result trustworthy (do not skip)

- **Score FIT before RESONANCE.** If the list was wrong, the message was never really tested. If fewer than ~half the replies are the right audience, the result is *"list problem — message untested,"* never *"message failed."*
- **Hold everything constant except the one thing you're testing.** Audience, sender, timing, offer — all fixed. Message is the only variable. Any second variable (different sender per arm, staggered launch) makes the result uninterpretable.
- **Small numbers are directional, not conclusive.** 500 sends yields a modest number of replies. A result points you toward which message to run at larger volume — it does not "prove" a winner. Don't over-read a small gap.
- **Pre-commit to how you'll read the result** *before* replies land — including which arm you expect to lose. Deciding what counts as a win after seeing the data invalidates the test.

---

## What you get back

An **Intelligence Report**: each arm's funnel (sends → accepts → replies), verbatim quotes, a resonance read per arm, a clear recommendation on which message to carry forward, and honest flags on anything the test could NOT conclude (e.g. an arm whose list was too off-target to judge).

---

## For your technical team

Everything above is process, not software — a Signal Test can be run manually (outreach tool + a spreadsheet + a human reading replies against the rubric). If you automate the reply-classification step, the classifier is a **first-pass triage that a human then verifies** — never an unattended judge. The audience/message/timing controls above matter far more to result quality than any tooling. Build the discipline first; automate second.
