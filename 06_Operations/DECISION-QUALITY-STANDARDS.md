# SI8 Decision Quality Standards
**Version:** 1.0
**Created:** July 2, 2026
**Owner:** Chief of Staff (Claude)
**Purpose:** Framework for classifying institutional knowledge. Used by the SI8 operating team and any AI agent working in this codebase.

---

## Why This Exists

As SI8 evolves, discussions produce different kinds of information. These are not equivalent and should never be treated as such.

A Hypothesis promoted silently to a Fact is an institutional liability. A Decision justified as objective truth is not auditable. An Open Question assumed to be resolved blocks course-correction.

This framework keeps the distinction visible.

---

## The Five Classifications

### PRINCIPLE

An enduring belief that guides SI8 — not provable, not falsifiable. Principles govern decisions even when evidence is incomplete or mixed. They reflect SI8's identity and operating philosophy.

Principles do not expire. They may be revised only through an explicit strategic decision.

**Current SI8 Principles:**

| # | Principle |
|---|-----------|
| P1 | **Evidence over assertions.** Claims must be traceable to evidence. Consensus is not validation. |
| P2 | **Technology neutrality.** SI8 evaluates AI content regardless of which tool produced it. No tool preference. |
| P3 | **Independent assessment is the product.** The value is not the file, the platform, or the credential — it is the independent commercial judgment of a qualified human reviewer. |
| P4 | **Human judgment for commercial clearance cannot be automated.** AI can detect; it cannot decide. The liability layer requires a human. |
| P5 | **Disclosure and clearance are different buying decisions.** Disclosure satisfies a labeling obligation. Clearance satisfies a commercial risk question. These are not the same product and not the same buyer. |
| P6 | **The file is the carrier. The commercial trust layer is the product.** C2PA, blockchain, and PDF are delivery mechanisms. The independent opinion is what the buyer pays for. |

---

### FACT

Information confirmed by direct evidence. Must cite source.

**Qualifying evidence types:**
- Customer interview or verbatim quote
- Completed product test or technical verification
- Signed agreement or confirmed transaction
- Published regulatory text or court ruling
- Campaign data (acceptance rate, reply rate, etc.)
- Meeting outcome with named participant

Facts may change over time as new evidence emerges. When a Fact is superseded, document what changed and when.

---

### HYPOTHESIS

A reasoned belief that has not yet been validated. Hypotheses are valuable — they drive research. But they must be labeled as such.

**Requirements:**
- State the belief clearly
- Attach a proposed validation method
- Do not present as Fact in sales materials, customer conversations, or strategic documents

**Validation methods may include:**
- Customer interview
- Campaign A/B test
- Prototype or live assessment
- Landing page / pricing experiment
- Technical proof-of-concept
- API test

---

### DECISION

A strategic choice SI8 has intentionally committed to. Does not need to be objectively true — reflects current direction.

Future work assumes current Decisions remain in force until explicitly revised. Major Decisions should be captured in an Architecture Decision Record (ADR) or equivalent.

Decisions are not evidence. A Decision justified by asserting it is factually correct is a red flag.

---

### OPEN QUESTION

An important uncertainty that materially affects future decisions. Remains visible until resolved.

For each Open Question, identify:
- Why it matters (what decision it blocks or affects)
- How to answer it (research method, call, test)
- Expected impact if answered

Open Questions should drive future research. Do not remove them because they are inconvenient. Do not assume they are resolved without evidence.

---

## Decision Hygiene Rules

1. **Do not silently promote a Hypothesis to a Fact.** Record what evidence justified the promotion.
2. **Do not treat a Decision as evidence.** "We decided X" is not proof that X is true.
3. **Do not confuse consensus with validation.** Agreement among team members is not market validation.
4. **Do not remove Open Questions simply because they are inconvenient.**
5. **Do not present a Principle as a Fact.** Principles are guiding beliefs, not proven claims.
6. **When reviewing existing documentation**, identify statements that appear to have drifted between categories. Flag for review before rewriting.

---

## Hypothesis → Fact Promotion Protocol

When a Hypothesis is promoted to a Fact, record the following:

```
PROMOTION RECORD
Hypothesis: [original statement]
Promoted to: FACT
Date: YYYY-MM-DD
Evidence: [what specifically justified promotion]
Source: [interview name / document / test / data point]
Recorded by: [who made the promotion call]
```

These promotion records should be appended to the relevant document or logged in the Decision Quality Audit.

---

## Recommendation Format

When making a significant recommendation, use this structure:

```
FACTS
[Known evidence supporting the recommendation — cite sources]

HYPOTHESES
[Assumptions still requiring validation — with proposed validation method]

DECISION (RECOMMENDED)
[The proposed choice — adopt / reject / defer — with rationale]

OPEN QUESTIONS
[Remaining unknowns that should influence future work]

CONFIDENCE
[High / Moderate / Low]
[What evidence most strongly supports or limits this confidence level]
```

---

## Decision Quality Audit Log

Periodic audits identify statements that have drifted between classifications. Audits are reviewed and approved before any documents are updated.

| Audit | Date | Status |
|-------|------|--------|
| v0.1 | 2026-07-02 | Pending JD review — `06_Operations/DECISION-QUALITY-AUDIT-v0.1.md` |

---

## Guiding Principle

Evidence informs hypotheses.
Hypotheses inform decisions.
Decisions guide execution.
Execution produces new evidence.

The goal of the SI8 operating model is to continuously improve the quality of company decisions through disciplined reasoning, transparent documentation, and ongoing validation.
