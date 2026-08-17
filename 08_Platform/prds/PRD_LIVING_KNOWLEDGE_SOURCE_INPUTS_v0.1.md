# Living Knowledge Source Inputs & Continuous Knowledge Direction
## Product Requirements Document v0.1

**Status:** Directional / Future Architecture
**Version:** 0.1
**Date:** 2026-08-17
**Owner:** JD / SI8
**Implementation status:** Partially implemented; future-state direction defined here
**Related:** `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md` (the governed-claims system this PRD directs the future of); `08_Platform/implementation/LK_PHASE1_TECHNICAL_DESIGN.md` / `LK_PHASE1_TECHNICAL_DESIGN_v2.md` (current implemented state); `06_Operations/institutional-knowledge/lk-automation/README.md` (the existing source-monitor prototype, Source B below); `08_Platform/prds/PRD_LIVING_NOTEBOOK.md` (a related but distinct system — the four-document Living Notebook, not the governed-claims research/demand loop this PRD addresses); `06_Operations/institutional-knowledge/notebook/TOPIC-RELATIONSHIPS.md` (governed relationships, referenced in §9/§10); CLAIM-COPY-004-v1 (the first claim to complete the full lifecycle this PRD generalizes from — Adoption → Reviewer/Commercial Assurance publication → CRC-publication governance review → source-hardening research → Global-scope comparative hardening → CRC publication, 2026-08-16/17).

---

## 1. Purpose

SI8 Living Knowledge (LK) is the governed knowledge system underlying products such as the Commercial Readiness Check (CRC) and, eventually, the Commercial Assurance reviewer workflow.

Living Knowledge should not become a static collection of legal claims manually researched once and left unchanged.

The intended system is a continuously improving governed knowledge network in which new knowledge needs can originate from multiple sources, research can increasingly be performed by AI agents, and substantive knowledge becomes usable by SI8 products only after the appropriate human governance decisions.

This PRD defines:

- the primary sources that create demand for Living Knowledge;
- the future research and maintenance loops around those sources;
- the distinction between automated discovery/research and human governance;
- how CRC and Commercial Assurance should interact with LK;
- the longer-term direction toward a continuously maintained knowledge system.

**This PRD does not authorize implementation of the full system.**

---

## 2. Core Principle

Living Knowledge should be driven by real commercial-assurance demand, not by attempting to build an encyclopedic database of every possible AI/legal issue in advance.

The basic lifecycle is:

```
Demand signal → research → candidate knowledge → human governance → governed knowledge → product use → new demand signals
```

AI agents may increasingly automate the discovery, research, verification, monitoring, and drafting portions of this lifecycle.

Humans remain responsible for substantive governance decisions about what SI8 adopts and what its products are permitted to state.

---

## 3. The Four Primary Input Loops

Living Knowledge should ultimately receive demand from four primary sources.

### Source A — CRC User Demand

**Driving actor:** CRC users

CRC conversations reveal what real creators, agencies, producers, brands, and other users actually want to know.

Examples:

- "Can I use this Kling output commercially?"
- "Do I own the copyright?"
- "Can I use a celebrity's voice?"
- "The client gave me its logo. Is that okay?"
- "I licensed these images from Getty. Can I use them in an AI-generated commercial?"

CRC therefore acts as a demand sensor for Living Knowledge.

When CRC encounters a user goal that existing governed knowledge cannot adequately address, that gap should eventually become a structured LK research signal.

Conceptually:

```
CRC question
↓
captured user goal
↓
governed coverage check
↓
knowledge gap identified
↓
research queue
```

CRC should not autonomously invent an answer simply because a user asks a question.

**A lack of governed coverage is a demand signal, not permission for runtime legal research.**

**Current example**

The production test surfaced:

> "I sourced them myself via Getty Images."

CRC retained the fact but could not meaningfully interpret Getty Images within the existing platform-oriented knowledge model.

That exposes a potential future LK domain:

**Third-party source assets / stock-media licensing**

Potential knowledge areas include:

- Getty Images
- Shutterstock
- Adobe Stock
- licensed music
- licensed footage
- client-supplied assets
- stock-license restrictions
- use of licensed source material in AI workflows

This is exactly the intended CRC → LK demand loop.

### Source B — Automated Source Monitoring

**Driving actor:** AI agents / scheduled automation

Some Living Knowledge already exists and must remain current.

Relevant sources change independently of CRC demand.

Examples:

- AI platform Terms of Service;
- commercial-use policies;
- copyright-office guidance;
- government AI guidance;
- legislation;
- regulations;
- relevant court decisions;
- platform licensing policies.

The future LK maintenance system should periodically monitor designated authoritative sources.

Conceptually:

```
Known governed source
↓
scheduled monitoring agent
↓
source changed?
↓
No → record/check and stop
Yes → analyze material difference
↓
possible affected claims identified
↓
human review queue
```

A source change must not automatically rewrite governed knowledge.

The automation detects and analyzes changes.

Human governance decides whether an LK claim must be revised, deprecated, superseded, or left unchanged.

**Monitoring frequency**

Monitoring cadence should depend on source volatility.

For example:

**Higher-change sources**
- platform Terms;
- licensing policies;
- product-specific commercial-use rules.

These may warrant frequent monitoring.

**Lower-change sources**
- statutes;
- stable government guidance.

These can generally be checked less frequently.

The appropriate cadence should be determined by source class rather than applying one cron frequency to all knowledge.

### Source C — Commercial Assurance Reviewer Demand

**Driving actor:** Human SI8 reviewer

Commercial Assurance reviews will expose questions that CRC may never encounter.

A reviewer examining actual evidence may encounter:

- unusual tool chains;
- custom enterprise agreements;
- third-party assets;
- unusual licensing language;
- regional legal questions;
- novel AI workflows;
- conflicting evidence;
- unclear ownership chains;
- new vendors;
- edge cases not represented in CRC conversations.

The reviewer should eventually be able to query Living Knowledge directly.

Conceptually:

```
Reviewer encounters issue
↓
queries LK
↓
Existing governed knowledge sufficient?
↓
Yes → reviewer uses it as an input to professional analysis
```

or:

```
No → reviewer creates/escalates research need
↓
LK research queue
```

The reviewer should never be forced to treat absence of LK knowledge as evidence that no relevant law or issue exists.

"No governed result" means only:

> Living Knowledge does not currently contain sufficient governed knowledge for this question.

### Source D — Strategic Research

**Driving actor:** SI8 human leadership / product / business development

Not all important knowledge gaps will first appear in CRC or an Assurance engagement.

SI8 may proactively decide that a domain is strategically important.

Examples:

- right of publicity;
- synthetic performers;
- AI voice cloning;
- trademark;
- music licensing;
- training-data exposure;
- regional AI legislation;
- disclosure requirements;
- advertising regulations;
- agency/client contractual structures;
- emerging insurance requirements.

These research programs originate through deliberate business or product decisions.

Conceptually:

```
Strategic priority
↓
research brief
↓
agent-assisted research
↓
candidate knowledge
↓
human governance
↓
Living Knowledge
```

This prevents LK from becoming purely reactive.

---

## 4. Unified Knowledge-Demand Model

Although the four sources have different driving actors, they should eventually converge on a common conceptual pipeline.

**Demand sources**

- CRC users
- Source-monitor agents
- Commercial Assurance reviewers
- SI8 strategic research

↓

**Knowledge Need**

A normalized research need describing:

- topic;
- question;
- origin;
- jurisdiction if known;
- relevant tools/platforms if any;
- frequency/importance signals;
- related existing knowledge;
- urgency.

↓

**Research**

AI agents may:

- locate sources;
- retrieve primary authority;
- compare versions;
- extract propositions;
- identify conflicting evidence;
- propose claim wording;
- construct provenance;
- identify applicability requirements;
- identify unresolved project dependencies.

↓

**Candidate Knowledge**

Research output is not automatically governed knowledge.

↓

**Human Governance**

Authorized SI8 humans decide:

- whether the proposition is sound;
- whether SI8 adopts it;
- appropriate jurisdiction;
- applicability;
- provenance adequacy;
- publication scope;
- whether CRC may expose it;
- whether reviewers may rely on it.

↓

**Governed Living Knowledge**

↓

**Product Surfaces**

Potential consumers include:

- CRC;
- Commercial Assurance reviewer tools;
- Assessment generation;
- future internal research tools;
- future compliance products.

---

## 5. Discovery Is Not Governance

This separation is foundational.

An AI research agent may discover:

> "Source X appears to say Y."

That does not mean SI8 knows Y.

An agent may draft:

> Candidate Claim: Y

That still does not mean SI8 has adopted Y.

The system should preserve explicit stages conceptually similar to:

```
Observed source
→ Extracted proposition
→ Candidate claim/synthesis
→ Human-reviewed knowledge
→ Adopted knowledge
→ Product-publication approval
```

The existing distinction between **Lifecycle** and **CRC Eligible** is therefore intentional.

CLAIM-COPY-004-v1 demonstrated this directly:

It was first:

> Adopted + Reviewer-accessible + CRC Pending

before eventually becoming:

> Adopted + Reviewer-accessible + CRC Yes

Adoption does not automatically imply product publication.

---

## 6. Source Proposition vs Governed Synthesis

CLAIM-COPY-004-v1 exposed an important future architectural concept.

Some LK knowledge may map closely to a single authoritative proposition:

```
Source
→ Proposition
```

Other knowledge may require synthesis across several authorities.

CLAIM-COPY-004-v1 followed:

```
U.S. statutory propositions
UK authority
EU authority
Taiwan authority
Japanese authority
platform contractual evidence
↓
human governance
↓
SI8 governed synthesis
```

The final claim is not a quotation from one source. It is an SI8-governed conclusion supported by an auditable provenance chain.

Future LK architecture may therefore need to distinguish **Source Proposition** from **Governed Synthesis**.

**No schema change is authorized by this PRD.** This is a directional architecture requirement to preserve for future design.

---

## 7. Jurisdiction Model

Legal knowledge does not all operate at the same jurisdictional grain.

Some knowledge is inherently jurisdiction-specific — example: U.S. human-authorship requirements for copyrightability.

Other knowledge may represent a structural relationship that survives across materially different legal systems. CLAIM-COPY-004-v1 established the first approved example.

For LK governance purposes:

> "Global" means a jurisdiction-neutral structural relationship between legal concepts that has been pressure-tested across materially different legal systems. It does not mean that every detailed substantive rule has been verified in every jurisdiction worldwide.

Therefore, **Global structural synthesis** and **jurisdiction-specific substantive doctrine** must remain distinct concepts.

A Global relationship must never automatically convert its underlying jurisdiction-specific claims into Global claims.

---

## 8. CRC's Role

CRC is not the Living Knowledge system.

CRC is one consumer of governed Living Knowledge and one generator of demand signals for it.

CRC should:

- capture user goals;
- understand relevant workflow facts;
- retrieve eligible governed knowledge;
- provide bounded interpretations;
- identify where governed coverage is insufficient;
- generate demand signals for future LK research.

CRC should not:

- perform open-web legal research during a user conversation;
- create new doctrine;
- promote candidate knowledge;
- silently infer legal conclusions;
- treat reviewer-only knowledge as CRC-visible;
- make project-specific determinations beyond its approved product boundary.

This separation should remain architectural, not merely prompt-based.

---

## 9. Commercial Assurance Reviewer's Role

The reviewer is a fundamentally different consumer of LK.

CRC asks: *What governed information can safely be shown to a user in this lightweight educational workflow?*

A reviewer asks: *What governed knowledge is relevant to the evidence and determination I am reviewing?*

Reviewer access may therefore legitimately expose knowledge that is **Adopted** but **not CRC Eligible**. CLAIM-COPY-001/002/003 currently demonstrate this state.

The future Reviewer ↔ LK interface should support deeper exploration of:

- claims;
- sources;
- provenance;
- jurisdiction;
- applicability;
- related knowledge;
- unresolved project dependencies;
- source excerpts;
- confidence/governance status;
- superseded knowledge.

The reviewer remains responsible for applying that knowledge to the specific Assessment evidence.

---

## 10. Future Reviewer Query Experience

A future reviewer should be able to ask natural-language questions such as:

- "What does our governed knowledge say about copyright ownership when most of the video was generated from prompts?"
- "What should I examine when a client provided the logo?"
- "What do we know about commercial use of ElevenLabs Free-tier output?"

The reviewer interface should translate the question into governed LK retrieval.

The answer should distinguish **Governed knowledge** from **application to this Assessment**.

Eventually, the system may combine LK knowledge with Assessment evidence to assist the reviewer, but it should not silently make final Assurance determinations without the reviewer.

A separate Reviewer ↔ LK Access PRD should govern implementation of this interface.

---

## 11. Future Agent Research Loop

The desired long-term research workflow is not simply: *Ask an LLM a legal question.*

It should resemble:

```
Research brief
↓
source discovery agent
↓
primary-source retrieval
↓
source verification
↓
proposition extraction
↓
cross-source comparison
↓
contrary-evidence search
↓
jurisdiction analysis
↓
candidate claim/synthesis generation
↓
provenance construction
↓
human governance
```

Multiple agents or repeated loops may eventually challenge each other's findings.

For higher-risk claims, the system should intentionally attempt to disprove the proposed knowledge rather than only collecting confirming evidence.

The CLAIM-COPY-004-v1 Global Scope Hardening pass provides an early model for this process.

---

## 12. Demand Prioritization

Not every uncovered CRC question should trigger immediate research.

As usage grows, LK may receive hundreds or thousands of knowledge-gap signals.

Future prioritization may consider:

- frequency of user goals;
- number of affected CRC sessions;
- Commercial Assurance reviewer demand;
- commercial importance;
- customer pipeline relevance;
- jurisdiction;
- severity/risk;
- strategic importance;
- existing partial coverage;
- estimated research effort.

Example: if 47 CRC users ask variants of "Can I use Getty images in AI video?", that should likely rank above a one-off obscure question.

But frequency should not be the only factor. A low-frequency issue with major legal/commercial consequences may deserve priority.

---

## 13. Knowledge Gap Aggregation

Raw user questions should not automatically become individual research tasks.

Future systems should cluster semantically related gaps. For example:

- "Can I use Getty?"
- "I used a Getty stock image."
- "Does my Getty license cover AI?"
- "Can Getty footage go into Runway?"

may belong to a broader research domain: **Third-party stock-media licensing in AI workflows**.

This avoids building LK as a collection of one-off answers.

Agents may eventually assist with clustering and research-brief generation. Human governance should determine whether proposed clusters represent the same legal/commercial question.

---

## 14. Maintenance Is Part of Knowledge

A governed claim is not permanently correct merely because it was correct when adopted.

Every important claim should eventually have enough provenance to answer:

- What sources support this?
- When were they last checked?
- Which sources are load-bearing?
- What jurisdiction applies?
- What source changes could invalidate the claim?
- When was the claim last reviewed?
- Who approved it?
- Which products may expose it?

Living Knowledge therefore includes both **knowledge content** and **knowledge-maintenance state**.

---

## 15. Source Volatility

Sources should eventually carry a notion of expected volatility.

Conceptually:

- **High volatility** — Platform Terms, pricing-tier rights, product policies.
- **Medium volatility** — Government AI guidance, agency policies, regulatory guidance.
- **Lower volatility** — Statutory copyright structures and established legal doctrine.

Monitoring frequency and alert severity should reflect these differences.

This PRD does not define the eventual data model.

---

## 16. Change Impact Analysis

When a monitored source changes, the future system should answer more than: *"The page changed."*

It should attempt to determine:

```
What changed?
↓
Is the change substantive?
↓
Which source propositions depend on it?
↓
Which governed claims/syntheses depend on those propositions?
↓
Which products currently expose those claims?
```

This creates a future provenance graph:

```
Source → Proposition → Governed Knowledge → Product Surface
```

For example:

```
Kling Terms
↓
Kling paid-tier commercial-use proposition
↓
governed Matrix claim
↓
CRC
```

If the Terms change materially, SI8 should be able to identify the affected product output quickly.

---

## 17. Human Governance Remains Load-Bearing

Automation should reduce research labor, not eliminate governance responsibility.

AI agents may eventually: discover; monitor; compare; extract; summarize; draft; challenge; prioritize; propose.

Authorized humans decide: adopt; reject; revise; supersede; deprecate; publish to CRC; expose to reviewers; expand jurisdiction.

The system should preserve who made each substantive governance decision and when.

---

## 18. No Automatic CRC Publication

One especially important rule:

**New research must never automatically become CRC output.**

Even if:

- five agents agree;
- primary sources were found;
- confidence is high;
- the same question has been asked 1,000 times.

The path remains: **research → governance → CRC publication decision.**

This is a product trust boundary.

---

## 19. Feedback From Product Usage

Once knowledge is published, its use should itself generate signals.

Future analytics may help answer:

- Which claims are frequently retrieved?
- Which goals remain outside coverage?
- Which claims frequently produce unresolved project dependencies?
- Which questions lead users toward Assurance?
- Which claims rarely match?
- Which jurisdictions are increasingly requested?
- Where do reviewers repeatedly need knowledge that LK lacks?

These signals feed back into research prioritization.

Raw sensitive conversation content should not need to become analytics merely to accomplish this. Prefer structured categories/counts where possible.

---

## 20. Emerging Knowledge Domains

The current six-platform Matrix was intentionally narrow.

Living Knowledge should eventually expand beyond platform Terms. Likely domains include:

- **Platform rights** — Commercial-use permissions, plan tiers, ownership clauses, restrictions.
- **Copyright** — Copyrightability, authorship, ownership, assignment, registration, human contribution.
- **Trademark** — Brand assets, logos, generated marks, infringement considerations.
- **Likeness / publicity** — Real-person identity, synthetic performers, celebrity likeness, voice.
- **Source assets** — Stock media, licensed photography, footage, music, client-provided assets.
- **AI voice/audio** — Voice cloning, synthetic speech, performer consent, music generation.
- **Regional law** — Country/jurisdiction-specific legal requirements.
- **Disclosure** — Synthetic-media labeling and AI disclosure requirements.
- **Contractual/commercial issues** — Client representations, licenses, warranties, chain-of-title documentation.

This list is directional, not exhaustive.

---

## 21. What Living Knowledge Should Not Become

LK should not become a legal encyclopedia. Nor should it become an autonomous AI lawyer.

Its purpose is narrower:

> Maintain governed, auditable knowledge needed to evaluate and communicate commercial-assurance questions involving AI-generated media.

The relevance test should therefore always be:

> Does SI8 need this knowledge to perform or support Commercial Assurance?

---

## 22. Near-Term vs Future State

**Already present or emerging**
- governed claims;
- source references;
- lifecycle;
- publication controls;
- CRC eligibility;
- topic retrieval;
- applicability;
- jurisdiction;
- user-goal capture;
- source monitoring prototype;
- governed relationships;
- bounded interpretation;
- human approval.

**Near-term direction**
- broaden governed copyright knowledge;
- publish ownership → copyrightability relationship safely;
- expand high-demand domains;
- continue source-monitor development;
- record knowledge gaps generated by CRC;
- design Reviewer ↔ LK access.

**Later direction**
- unified knowledge-demand queue;
- agentic research workflows;
- gap clustering;
- source-proposition layer;
- governed-synthesis representation;
- provenance graph;
- automated change-impact analysis;
- reviewer natural-language LK query;
- prioritization system;
- maintenance dashboards;
- cross-product knowledge consumption.

**Do not build the later-state architecture prematurely. Real usage should determine its exact shape.**

---

## 23. Architectural North Star

The eventual Living Knowledge loop should resemble:

```
REAL-WORLD DEMAND
  CRC users
  Commercial Assurance reviewers
  Strategic SI8 research

REAL-WORLD CHANGE
  Automated authoritative-source monitoring

↓

KNOWLEDGE DEMAND
↓
AGENT-ASSISTED RESEARCH
↓
VERIFIED SOURCES
↓
SOURCE PROPOSITIONS
↓
CANDIDATE CLAIMS / SYNTHESES
↓
HUMAN GOVERNANCE
↓
GOVERNED LIVING KNOWLEDGE
↓
PRODUCT-SPECIFIC PUBLICATION
  CRC
  Reviewer tools
  Commercial Assurance
  Future SI8 products

↓

USAGE + NEW QUESTIONS + SOURCE CHANGES

↓

BACK INTO THE LOOP
```

The system becomes more valuable not simply because it contains more information, but because it becomes increasingly good at determining: what SI8 needs to know, what SI8 actually knows, why SI8 believes it, where that knowledge applies, whether it is still current, and which products are permitted to use it.

---

## 24. Governance Principles Established by Current Work

The following principles should be treated as established direction unless explicitly revisited:

1. Adoption ≠ publication.
2. Reviewer-accessible ≠ CRC-accessible.
3. Absence of governed knowledge ≠ absence of relevant law or commercial risk.
4. Runtime product systems do not invent doctrine.
5. Research agents propose; humans govern.
6. Source monitoring detects change; it does not autonomously rewrite governed knowledge.
7. Jurisdiction belongs to knowledge applicability, not user IP/location inference.
8. Global does not mean every jurisdiction was exhaustively researched.
9. A governed synthesis may be supported by multiple jurisdiction-specific source propositions.
10. Product usage should generate demand signals for LK without automatically creating knowledge.
11. Commercial Assurance reviewers may access a broader governed knowledge set than CRC.
12. Every automated knowledge output should ultimately be traceable to governed provenance.

---

## 25. Non-Goals of v0.1

This PRD does not authorize:

- new database tables;
- new migrations;
- autonomous claim publication;
- runtime web research by CRC;
- automatic legal conclusions;
- automatic governance decisions;
- new analytics containing raw user questions;
- source-proposition schema implementation;
- governed-synthesis schema implementation;
- reviewer UI implementation;
- knowledge-gap queue implementation;
- automated research-agent deployment;
- broad international-law ingestion.

Those require separate design and implementation decisions.

---

## 26. Immediate Follow-On Work

After this PRD is recorded, return to the current copyright milestone:

> copyright_ownership → copyrightability

with CLAIM-COPY-001-v1 / CLAIM-COPY-002-v1 / CLAIM-COPY-003-v1.

The next milestone should determine how CRC can use governed U.S. copyrightability knowledge to provide a more useful response to questions such as:

> "I generated the video mostly with prompts and did some editing afterward. Do I own the copyright?"

without collapsing copyright ownership into copyrightability, and without turning CRC into a project-specific legal determination engine.

That work remains separate from this PRD.

---

## 27. Project-Fact-Aware Bounded Composition (Deferred Capability, recorded 2026-08-17)

**Status: Future direction / backlog. Not authorized for design or implementation by this PRD or by its recording here.**

This section documents a real product-completeness gap surfaced by the Phase 1 individual CRC-publication governance reviews of CLAIM-COPY-001-v1 / CLAIM-COPY-002-v1 / CLAIM-COPY-003-v1 (2026-08-17), so a future engineering/design milestone understands *why* the capability exists rather than starting from nothing.

**The gap, precisely:** CRC can retrieve a governed principle and correctly identify that the claim carries `unresolved_project_dependencies`. It does not yet use the conversational observations it already has (e.g. `workflow_role`, scoped observations) to determine *which* of several overlapping governed principles are actually relevant to what the user described, or to compose them differently as a result. Empirically confirmed during the Phase 1 reviews: a user who explicitly states "I only entered prompts and used the output as-is," a user who states "I spent hours iterating on detailed prompts," and a user who states "I generated clips, then substantially re-edited, composited, and restructured them" all currently receive byte-identical CRC output for the same `copyrightability` goal — whether one claim is eligible or all three are eligible together.

**Working name:** Project-Fact-Aware Bounded Composition.

**Purpose:** Allow CRC to use project facts and conversational observations to determine which governed principles are relevant to the evidence the user actually described, and to compose overlapping governed claims into a clearer, more targeted answer than simple concatenation produces.

**The critical boundary (non-negotiable, carried forward from every governance review in this milestone):** the system may recognize *"the user described evidence relevant to this governed principle."* It must **never** conclude *"the evidence satisfies the legal threshold."* Recognizing relevance is a retrieval-adjacent, bounded operation; declaring sufficiency is exactly the kind of project-specific legal determination CRC is not authorized to make (SI8 Principle 4).

Illustrative (not a spec — the exact wording is future design work):

- **Allowed:** "You described substantial selection, arrangement, and editing. Current U.S. guidance says meaningful human creative contribution of that kind can be relevant to copyrightability. CRC can't determine from this conversation whether your contribution satisfies the legal threshold."
- **Not allowed:** "Your substantial editing establishes copyright."

**Explicit non-goals for this future capability:**
- autonomous legal adjudication;
- automatic copyrightability determination;
- automatic ownership determination;
- free-form LLM legal reasoning;
- an implicit replacement for Commercial Assurance;
- a way around governed LK claims;
- a mechanism for inventing doctrine.

The eventual design must preserve the same three-layer discipline every other part of this PRD assumes: **governed knowledge + bounded interpretation + explicit unresolved thresholds.** Relevance-matching is new; the underlying governance/publication/applicability machinery is not renegotiated by adding it.

**Relationship to governed topic relationships:** this capability is distinct from, and must not be confused with, a `TopicRelationship` (§9 above generalizes this from CLAIM-COPY-004-v1; also see `TOPIC-RELATIONSHIPS.md`). A relationship answers *"what governed knowledge domains may be relevant to this goal category?"* — a retrieval-time, claim-independent question. Project-Fact-Aware Bounded Composition would answer a narrower, project-specific question one layer downstream: *"given what the user described, how should the already-retrieved, already-eligible governed principles be selected and presented?"* A relationship must never be asked to solve this; this capability must never be asked to decide CRC eligibility or invent a relationship.

**Not authorized by this recording:** any data model, dependency-resolution logic, mapping from observations to legal thresholds, changes to Retrieval, Bounded Interpretation, Interview Engine, claim composition, new LLM calls, new prompts, new schemas, claim ranking, deduplication, or migrations. This section exists to preserve institutional memory of the gap and its boundary, not to scope an implementation.
