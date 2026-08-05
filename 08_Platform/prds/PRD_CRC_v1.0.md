# Commercial Readiness Check (CRC)
## Product Requirements Document v1.0

**Status:** Frozen — v1.0
**Owner:** SI8
**Frozen:** 2026-08-05
**Supersedes:** N/A — first frozen version. Synthesizes the CRC PRD Working Update, Phase 3 formalization, and Final Architecture Review design sessions (2026-08-04 – 2026-08-05).
**Related:** `01_Business/pricing/PRICING-STRATEGY-v3.0.md` (2026-08-05 addendum — CRC replaces the $29 tier in the marketed free-tier narrative); `08_Platform/implementation/CRC_IMPLEMENTATION_RISKS.md` (known implementation risks and pre-prototype questions — deliberately kept out of this PRD); `06_Operations/institutional-knowledge/notebook/` (Living Notebook — a knowledge source CRC retrieves from); SI8 Principle 7 (institutional learning); SI8 Principle 4 (human judgment for commercial clearance cannot be automated).

---

## Freeze Notice

This PRD is frozen as of 2026-08-05. Further philosophical or architectural redesign is deliberately out of scope from this point forward — the design questions this document exists to answer (interview architecture, stopping conditions, output shape, engine separation, data model) are considered resolved. Remaining unknowns are empirical, not conceptual, and can only be answered by building and observing a prototype (see `CRC_IMPLEMENTATION_RISKS.md`). A substantive change to Sections 3, 8, 9, or 10 requires a version bump (v1.1+) and an explicit reason, not a silent edit.

---

## 1. Purpose

CRC is a free, AI-assisted commercial-readiness conversation that helps creators, agencies, and production teams identify obvious commercial-readiness questions before considering a paid SI8 Commercial Assurance Assessment. (Internally, CRC also functions as a lead-generation engine — but that describes the business outcome, not the product experience, and this document describes the latter.)

CRC is not an assessment. CRC is not a certification. CRC is not legal advice.

CRC's purpose:

> To understand a user's commercial AI-production workflow well enough to retrieve relevant SI8 educational knowledge and help the user conduct an informed self-review.

CRC does not:
- determine commercial acceptability
- assess or score risk
- certify a project
- issue an assurance opinion
- provide legal advice
- replace an SI8 human reviewer

---

## 2. Product Philosophy

CRC does not determine whether an AI-generated project is commercially acceptable. Its purpose is to help creators identify obvious missing information, platform-specific considerations, documentation questions, and common commercial-readiness gaps — before seeking an independent Commercial Assurance Assessment.

CRC educates. CRC does not certify.
CRC organizes facts. CRC does not issue opinions.

Independent commercial judgment remains the responsibility of SI8's human review process. Every future CRC feature should be evaluated against this philosophy — if a feature begins making assurance decisions instead of surfacing educational observations, it belongs inside the SI8 assessment, not CRC.

**Optimization target:** CRC does not try to maximize information gathered. It tries to maximize useful understanding per unit of user effort — the same way an experienced consultant doesn't leave a meeting thinking "I extracted every possible fact," but thinking "I understand this well enough to have a productive conversation." Every design decision in this document is held to that standard, not to completeness.

---

## 3. System Architecture — Two Independent Engines

CRC is built from two systems that run simultaneously but never optimize around each other.

### System A — Interview Engine

Its only job: **understand the person's situation naturally.** It behaves like an experienced consultant. It asks questions because that's where a natural human conversation would go — never because Platform Intelligence happens to contain a specific article on the topic. It owns both completion gates (Section 9).

### System B — Retrieval Engine

Completely independent. Its only job: **given what is currently understood, determine what SI8 knowledge is relevant.** It updates silently after every turn. It never informs what the Interview Engine asks next.

**This is an architectural boundary, not a prompt instruction.** It must be implemented as genuinely independent systems or contexts — a single model instructed "don't let retrieval influence your questions" is a soft constraint that can leak. If the interview and retrieval share a context window with visibility into each other's state, the separation is illusory regardless of what the system prompt says.

**Understanding Stability vs. Retrieval Stability:** these describe the same underlying event from two different systems, but only one belongs in the architecture. *Understanding Stability is an Interview Engine concept — it belongs in this document.* *Retrieval Stability is an implementation observation — a downstream consequence of understanding stabilizing, not a control signal, and belongs in engineering notes if tracked at all, never in the Interview Engine's own stopping logic.* See Section 9, Gate 2.

---

## 4. Product Goal

CRC should answer one question: *"Based on what you've told us, is there anything obvious you should check before spending money on a full SI8 review?"* Nothing more, nothing less.

---

## 5. Primary User

Initially: Creative Directors, Executive Producers, AI Creators, agency founders, production teams.
Later: Brand teams, Legal, Procurement.

---

## 6. User Journey

```
Landing Page
    ↓
Start CRC
    ↓
Interview Engine conversation (Phases 1–4)  ⇄  Retrieval Engine (updates silently, every turn)
    ↓
Completion — Gate 1 + Gate 2 met, or user decline (Section 9)
    ↓
Output (Section 13)
    ↓
Optional SI8 consultation
```

CRC should feel like an experienced consultant asking thoughtful questions — not a compliance questionnaire, a chatbot, ChatGPT, or a legal intake form. The interaction is conversational; the phase structure and the T0–T5 taxonomy stay hidden from the user entirely.

---

## 7. Core Interview Structure — Four Phases

- **Phase 1 — Project Discovery** ("What did you make?") — high-level understanding of the project.
- **Phase 2 — Workflow Discovery** ("How was it made?") — tools, assets, contributors, workflow. Facts only, no judgments.
- **Phase 3 — Post-Production Discovery** ("What happened after production?") — see Section 8.
- **Phase 4 — Completion Check** — governed entirely by Section 9's two gates and the user-override rule. If met: stop. If not: ask only the missing question(s).

---

## 8. Phase 3 — Post-Production Discovery (Detailed)

**Objective:** Understand what happened to the project after production — without sounding like a compliance questionnaire — well enough to populate internal T0–T5 signal and inform retrieval. The taxonomy is never shown to the user; it exists only in Discovery Data.

**Opening principle:** Lead with process language, not institutional language. Preferred pattern: *"Once this was finished, what happened next — did it go straight out, or did anyone need to sign off first?"* CRC never introduces "legal," "procurement," "compliance," "rejection," "risk," or "audit" unless the user says the word first.

**Normative rules:**

1. **Design the no-signal path first.** "Nothing happened yet" is the modal response, not an edge case, and must close as complete and normal — never as deficient.
2. **One follow-up per signal.** Clarify scope, actor, request, or directness — never conduct an incident investigation.
3. **One historical-experience question**, asked only if nothing historical has surfaced naturally.
4. **One uncertainty clarification** on "I don't know" — distinguishing lack-of-visibility from genuine unknown — then stop probing regardless of outcome.
5. **One disentangling question** for bundled answers, scoped to "which fact applies to which project/time period," never resolved by guessing.
6. **User boundaries override completeness.** A decline ends the question, phase, or interview immediately. A shallow result is preferable to a coerced one.
7. **No fear framing.** Never imply review "usually comes up sooner than expected," or that the user is behind, exposed, or likely to encounter problems.
8. **T-stage stays invisible.** Internal Discovery Data only — never surfaced in-conversation or in output, including indirectly.

**Dialogue library (normative, not illustrative):**

**A — Rich signal surfaces naturally**
> **CRC:** Once this was finished, what happened next — did it go straight out, or did anyone need to sign off first?
> **User:** Our client's legal and procurement team review everything before it goes live. Usually the slowest part.
> **CRC:** That's common right now. When they review it, do you know roughly what they're looking for — who made it, what tools were used, who owns the rights, something else?
> **User:** Mostly proof of ownership — where every piece came from.

*One follow-up, then stop.*

**B — Nothing has happened yet**
> **CRC:** Once this was finished, what happened next — did it go straight out, or did anyone need to sign off first?
> **User:** Nope, just went out. No one really asks about that stuff yet.
> **CRC:** Got it — that's pretty normal at this stage. Has a client or partner ever brought up documentation or how something was made, even informally, on a different project?
> **User:** Not really, no.
> **CRC:** Makes sense — a lot of what I'll show you is general reference for when that does come up.

**C — Current project differs from historical experience**
> **CRC:** Once this was finished, what happened next?
> **User:** This one's early, hasn't gone anywhere yet. But on a project last year, a client's procurement team asked for our prompt logs before sign-off.
> **CRC:** Good to know both. For last year's — do you remember what they ended up needing, or how it got resolved?
> **User:** We sent a doc listing the tools and how we used them. They accepted it.

*Two scoped observations, not one blended stage.*

**D — Ambiguous or uncertain answer**
> **CRC:** Once this was finished, what happened next?
> **User:** Honestly not sure. Wasn't really involved in that part.
> **CRC:** That's fine — is that something that might happen on the client's side, just not somewhere you'd see it, or genuinely not sure if any review happens at all?
> **User:** There's probably someone on their end who looks at it. I just don't see that part.
> **CRC:** Got it, useful either way. I'll include what teams in that position typically run into on the client side, since it may come up indirectly.

*One clarification only. A second-order "genuinely no idea" answer also stops here — logged as `unknown`, never probed twice.*

**E — Full opt-out**
> **CRC:** Once this was finished, what happened next?
> **User:** I'd rather not get into that.
> **CRC:** Totally fine — want me to skip just this one, or the rest of this section too?
> **User:** Let's skip the rest.
> **CRC:** No problem. I've got enough from the project and how it was made to point you toward some useful info.

*If the decline reads as a broader boundary, skip the negotiation offer entirely — no "are you sure?"*

**F — Mixed or multi-signal answer**
> **CRC:** Once this was finished, what happened next?
> **User:** It went through our internal creative review first — we always do that. Whether it goes further depends on the client. Some bigger accounts have started looping in legal, but this one hasn't yet.
> **CRC:** Got it — a couple of things there. For this specific project, has it gone to the client yet, or still mid-review?
> **User:** Still mid-review.
> **CRC:** And that trend — bigger accounts pulling in legal — seen directly, or heard it's starting to happen?
> **User:** Directly. One account last quarter asked for tool and version documentation before sign-off.

*Produces three scoped observations: current-project (in progress), historical/adjacent-account (completed), and a `general_practice` qualifier with no forced stage.*

**Internal flow:**

```
Ask open process question
    ↓
Extract zero or more scoped observations
    ↓
Bundled or ambiguous? ── Yes → ask one clarification
    │ No
    ↓
Historical experience covered? ── No → ask one historical-experience question
    │ Yes
    ↓
User declined? ── Yes → end Phase 3 immediately
    │ No
    ↓
Update retrieval (Retrieval Engine, silently)
    ↓
Continue only if Gate 2 (Section 9) has not yet stabilized
```

The decline check wraps every turn, not just the end of the loop — Example E can trigger on the very first question.

---

## 9. Completion Logic — Two Gates + User Override

**Gate 1 — Minimum Understanding.** Two criteria, not three:
- Intended-use signal present (an `unclear`/mixed value is an acceptable answer here, using the same confidence taxonomy as everything else — not a forced commercial/non-commercial binary)
- AND at least one of: a named tool/platform, OR a production step specific enough to map to a known knowledge category (e.g., "voice cloning," "used a real person's likeness")

A bare project existing, and a bare undifferentiated asset-type description ("it's a video"), do not satisfy Gate 1 on their own. In the normal case, Gate 1 requires **zero additional questions** — Phases 1–2 already elicit both facts through ordinary conversation. It is a completion check on Phase 1–2 output, not a new interrogation step, and only becomes a live decision point when those answers are unusually thin.

**Three fallback states:**

| State | Trigger | Behavior |
|---|---|---|
| **Met** | Both criteria present | Full project-specific retrieval |
| **Not met — insufficient input** | Phase 1–2 completed but thin (no tool named, genuinely doesn't know) | Do not keep probing past the normal Phase 1–2 flow. Return general/platform-overview content. Neutral tone — this can happen to someone with real, thin knowledge, not just a disengaged user. |
| **Opt-out** | User declines before or during Gate 1 evaluation | Return whatever partial material is appropriate to what's known. No further probing, regardless of Gate 1 status. |

**Gate 2 — Understanding Stability** (Interview Engine concept; see Section 3). The interview stops when the last one or two turns haven't materially changed the Interview Engine's own model of the situation. This is answerable entirely from the Interview Engine's own conversation state — it never checks what Retrieval is doing. Retrieval stabilizing at the same point is a natural downstream consequence, not the mechanism.

**User Override.** A decline is not a third normal completion gate — it is a boundary that ends a question, a phase, or the entire interview immediately, regardless of either gate's status. A shallow output is preferable to a coerced one.

---

## 10. Scoped-Observation Data Model

```json
{
  "session_id": "string",
  "scoped_observations": [
    {
      "scope": "current_project | historical_project | general_practice",
      "workflow_stage": "T0 | T1 | T2 | T3 | T4 | T5 | null",
      "confidence": "confirmed | confirmed_absent | unresolved_no_visibility | unknown | declined",
      "status": "in_progress | completed | null",
      "note": "factual, non-evaluative free text"
    }
  ],
  "interview_meta": {
    "phase_reached": 1,
    "phase_completion_status": {
      "phase_1": "completed | declined | incomplete",
      "phase_2": "completed | declined | incomplete",
      "phase_3": "completed | declined | incomplete"
    },
    "gate_1_status": "met | not_met | not_applicable_declined",
    "interview_completion_status": "completed | ended_gate1_unmet | declined | completed_after_partial_decline",
    "understanding_stabilization_turn": "integer | null",
    "user_stopped_early": "boolean",
    "user_declined": "boolean"
  }
}
```

`general_practice` observations carry `workflow_stage: null` and `status: null` by design — a "depends on the client" fact isn't a stage, and forcing one would misrepresent it.

**Scoped observations must be mutable.** The Interview Engine must be able to revise a previously-logged observation when the user later corrects or adds information ("Actually, we also used Runway for part of it"). This is normal conversational behavior, not an edge case — the data model must support in-place revision, not just append-only logging.

**Deferred, not added (v1.1 candidate):** a fourth scope type for forward-looking/anticipated signal (e.g., "I suspect this is coming soon for us") is a real, recurring pattern in observed data but distinct from all three current types. Log as a schema candidate once real CRC conversations exist to validate it — do not add speculatively now.

---

## 11. Interview Engine — Responsibilities

**Does:** conduct the interview; recognize tools; extract facts; identify missing information; ask phase-appropriate questions; apply the Section 8 rules; own Gates 1 and 2.

**Never does:** determine commercial acceptability; issue assurance; certify projects; provide legal advice; estimate legal risk; predict litigation; replace SI8 reviewer judgment; ask a question because of what's in the knowledge base rather than where the conversation naturally goes.

---

## 12. Retrieval Engine — Responsibilities

**Does:** given current structured understanding, retrieve relevant SI8 knowledge; update after every turn; surface knowledge and follow-up questions triggered strictly by what the user *did* say.

**Never does:** influence what the Interview Engine asks; generate content, knowledge cards, or follow-up questions from *absences* in the conversation (i.e., from what the user didn't mention). A knowledge card or suggested question must be traceable to something the user actually said — never to a gap CRC noticed. This is the single rule most likely to be silently violated during implementation, since it's the exact mechanism by which CRC would drift back into risk-flagging.

*Scope note: this rule governs the Retrieval Engine's output only. It does not restrict the Interview Engine's own questions (Section 8) — Phase 3 Rule 3 (asking about historical experience when none has surfaced) is the Interview Engine exploring a gap in its own understanding, which is its normal job. The two look similar ("asking about something absent") but are different systems governed by different rules.*

---

## 13. SI8 Knowledge Sources

CRC may retrieve from: Platform Intelligence, the Living Notebook (SI8 Positions, Platform Rights Matrix), public platform documentation, reviewer-approved educational content. CRC never invents institutional positions.

---

## 14. End-of-Conversation Output

Structure — a consultant wrapping up a meeting, not a generated report:

> Thanks — here's what I picked up from our conversation.
>
> You're working on [project], built with [tools]. It's been through internal review, but hasn't gone out to the client yet.
>
> Based on what you described, a few pieces of SI8 knowledge that might be useful:
>
> — [Tool]'s commercial permissions vary by account type. *(SI8 Platform Intelligence, content last updated [date].)*
>
> As teams move toward commercial deployment, these are some of the topics that often come up:
>
> — [retrieved, presence-triggered question 1]
> — [retrieved, presence-triggered question 2]
>
> If you'd ever like an independent human review of your commercial readiness, we'd be happy to help.

**Rules:**
- "Here's what we understood" is a plain-language restatement of scoped observations — never names a T-stage or paraphrases one.
- Each knowledge item: neutral statement, source, "content last updated" (not "last reviewed" — that phrasing reads closer to an audit/verification claim than a freshness stamp).
- "Topics that often come up" is phrased about the *workflow trajectory* ("as teams move toward commercial deployment"), never about the *user* ("teams working on similar projects") — the latter subtly implies CRC has classified the user into a cohort, which the former avoids while saying the same thing.
- The closing CTA is an offer, never a recommendation ("if you'd ever like," not "we recommend").
- Avoid entirely: readiness scores, risk ratings, "worth verifying" status labels, warnings, pass/fail language, any claim that the project is safe or unsafe, any conclusion about commercial acceptability.
- Governed by Section 12's presence-not-absence rule throughout.

---

## 15. Design Principles

CRC should feel educational, conversational, and practical. Avoid fear marketing and legal jargon. Reward honesty. Make uncertainty acceptable. Normalize "I don't know," "I'm not sure," "we'll check."

---

## 16. Success Metrics

Not optimized for chat length. Primary: conversation completion, lead capture, consultation conversion, assessment conversion, knowledge-hit frequency, most-referenced platforms, most common missing documentation, most common workflow patterns. `phase_reached`, `gate_1_status`, and `interview_completion_status` (Section 10) give completion-quality granularity beyond a binary completion metric.

**Median interview turns before Understanding Stability** (`understanding_stabilization_turn`, Section 10) — the metric that most directly represents CRC's stated optimization target (Section 2): useful understanding per unit of user effort. Tracking this over time answers whether CRC is actually getting more efficient at understanding, not just whether it's completing conversations.

---

## 17. Explicit Non-Goals

CRC is not: a prompt logger, a DAM, a provenance platform, a project management tool, a legal opinion, an automated assessment, a replacement for SI8, an incident investigator, a personalized risk-flag generator.

---

## 18. Institutional Learning (Principle 7)

Every CRC conversation is also a natural opportunity for institutional learning — new tools, workflows, approval paths, and commercial friction surfaced in real conversations feed back into Platform Intelligence and the Living Notebook over time, consistent with SI8 Principle 7. This is a byproduct of real customer conversations, not a purpose CRC is designed or operated to serve.

---

## 19. Long-Term Relationship to SI8

```
Commercial Readiness Check (free)
    ↓
Commercial Assurance Assessment ($499, human reviewed)
```

The $29 Creator Record is no longer part of the marketed product journey (decided 2026-08-05, see `PRICING-STRATEGY-v3.0.md` addendum). Its existing infrastructure remains dormant and untouched. CRC should not attempt to reproduce a self-attested Chain of Title PDF or provide a free substitute for the human-reviewed assessment. CRC should increase confidence that a customer is ready for independent review — it should never reduce the value of that review.

---

## Open Questions (Deferred, Not Part of v1.0)

- Should CRC save user projects for a returning-user experience?
- Should users upload evidence during CRC?
- Should CRC produce a downloadable PDF summary of the conversation?
- Should CRC benchmark against anonymized aggregate data ("teams using Kling also...")?
- Should CRC integrate directly with Numbers Protocol or other provenance providers?
- Should CRC remember prior conversations for returning users?
- A fourth scoped-observation type for forward-looking/anticipated signal (Section 10).
