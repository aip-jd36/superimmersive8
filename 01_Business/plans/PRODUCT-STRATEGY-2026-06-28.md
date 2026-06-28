# SI8 Product Strategy Summary (June 28, 2026)

## Executive Summary

Today's strategy work fundamentally simplified SI8.

A week ago we were debating multiple product architectures (disclosure SaaS, self-attested clearance, workflow software, etc.).

Today we concluded that **there is only one validated commercial product: SI8 Certified.**

Everything else should either:

1. increase conversion into SI8 Certified, or
2. help us discover what Product #2 should become.

This is a major strategic simplification.

---

# Product Decisions

## 1. SI8 Certified remains the company

SI8 Certified is the core commercial product.

Current positioning:

* Human-reviewed commercial AI clearance
* Chain of Title
* Independent third-party assessment
* C2PA signed delivery
* Commercial rights review
* Enterprise legal documentation

This is the only product currently validated by customer interviews.

Our outreach consistently found demand among:

* agencies
* production houses
* regulated industries
* brand legal teams
* enterprise creative organizations

The value proposition is **independent commercial judgment**, not technical signing.

---

## 2. Creator Record becomes the entry point

The Creator Record is no longer viewed as a separate business.

Its primary purpose is:

* structured intake
* evidence collection
* disclosure
* friction reduction
* qualification
* preparing customers for SI8 Certified

It is **not** intended to become a disclosure SaaS business.

The Creator Record should never issue any opinion regarding commercial safety.

Instead it should explicitly remain:

* self-attested
* unverified
* ready for certification

Possible wording:

"Submitted and ready for certification."

Avoid:

* "Commercially safe"
* "Looks compliant"
* "No issues found"

The Creator Record must never compete with SI8 Certified.

---

## 3. Pricing

Current thinking:

### Preferred launch

Creator Record

Initially free (or potentially low-cost if abuse becomes an issue).

Reasoning:

The objective is learning and funnel generation rather than revenue.

If charging later becomes necessary:

* one-time
* per campaign
* Stripe Checkout
* approximately $29

Absolutely avoid subscriptions.

Our research does not support recurring disclosure demand.

---

## 4. Workflow

Do NOT build Workflow yet.

Instead:

Launch a Design Partner Program.

Current positioning:

"We're working with agencies to design the future of AI production compliance."

This allows us to:

* validate demand
* conduct interviews
* discover recurring workflows
* avoid premature engineering

The workflow product remains a hypothesis.

---

# New Product Vision

The most important conceptual shift today:

Originally:

Video → Review → Certificate

Potential future:

Campaign → Evidence → Independent review → Commercial clearance → Delivery

The future opportunity may be evidence capture rather than disclosure.

This remains unvalidated.

---

# Evidence vs Certification

Potential future architecture:

```
Campaign created
↓
Evidence gathered over production
  ↓ Licenses
  ↓ Prompts
  ↓ Reference assets
  ↓ Approvals
↓
SI8 Certified review
↓
Chain of Title
↓
Delivery
```

The certification stays human. The preparation becomes easier.

---

# Major Lessons From Customer Research

Current evidence strongly supports:

✓ Independent commercial review  
✓ Enterprise legal documentation  
✓ Regulated campaigns  
✓ Brand legal requirements  

Current evidence does NOT support:

✗ Monthly disclosure subscriptions  
✗ Standalone disclosure SaaS  
✗ Self-attested commercial clearance  
✗ Generic creator tools  

**Cadence data (626 LinkedIn responses):** Only 1 lead (Ibrahim Badi) explicitly described per-project documentation cadence as current practice. ~15–20 described it as periodic / campaign-size-gated. ~95% of substantive conversations said nothing about frequency. No lead gave a specific volume number (videos/month). Research does not support subscription pricing.

---

# Long-Term Product Hypothesis

The long-term opportunity may not be: Disclosure

Instead it may become: **Chain of Evidence**

Evidence captured throughout production → Independent evaluation → Commercial Chain of Title

This remains a hypothesis only. No engineering should begin until validated.

---

# Numbers Protocol Research

## Major realization

Numbers is NOT primarily a blockchain company.  
Numbers is NOT primarily a C2PA company.

Numbers appears to be building: **"The provenance infrastructure layer."**

Their philosophy: "Proof before anyone asks."

They describe themselves as:
* provenance infrastructure
* handoff layer
* builder platform
* workflow infrastructure

(NOT: blockchain company, signing company)

---

## Three-layer architecture

```
NID → Identity
C2PA → Embedded provenance
Numbers Mainnet / ERC-7053 → Durable public proof
```

Creates: identity × embedded credentials × public immutable evidence

---

## Business model

Numbers resembles infrastructure companies: Stripe, AWS, Twilio.  
Optimizes for mass adoption over high-margin individual transactions.  
Infrastructure is intentionally inexpensive.

---

## Why blockchain?

Blockchain does NOT store videos.  
It stores: hashes, timestamps, identifiers, receipts, immutable references.

Purpose: If C2PA metadata is stripped later, the public proof still exists.

---

## Difference between C2PA and On-Chain

| | C2PA | On-Chain |
|--|------|----------|
| Location | Embedded inside media | Public external record |
| Travels with file | Yes | No |
| Survives metadata stripping | No | Yes |
| Verification | File reader (Adobe viewer) | Public blockchain |

They complement each other. Neither replaces the other.

---

## Numbers positioning (current)

Recent communications show Numbers expanding beyond media:

* AI agents
* governance
* procurement
* legal packets
* support evidence
* research datasets
* contracts
* audit trails

Increasingly describing themselves as building the provenance layer for AI.

---

## Relationship to SI8

Current hypothesis:

```
Numbers → Evidence exists.
SI8 → Evidence independently evaluated.
```

Numbers provides: technical trust  
SI8 provides: commercial trust

Complementary rather than competitive — **if Numbers stays infrastructure.**

---

## Important Strategic Question

Need to verify whether Numbers intends to remain infrastructure.

If they move into: legal review / compliance workflows / commercial clearance → adjacent.  
If they remain infrastructure → SI8 becomes an ideal ecosystem partner.

---

# Creator Record Economics

Need to verify actual infrastructure costs with Sophia Yan:

* Capture API signing cost
* Upload bandwidth
* Storage and retention
* Processing
* Email
* Abuse prevention

Likely the largest future cost is abuse rather than signing.

---

# Wednesday Meeting Goals (Sophia Yan / Numbers Protocol / Capture)

**Primary objective:** Determine whether SI8 should become the commercial compliance layer built on top of Numbers.

## Questions

### Product Boundary
- Where does Numbers intentionally stop?
- Where should ecosystem partners build?
- Does Numbers intend to stay infrastructure?

### Workflow
- Where should signing occur? (creation / editing / delivery / certification)
- What are enterprise customers actually doing?

### Evidence
- Do enterprise customers think about provenance only at delivery, or throughout production?
- How are they thinking about prompt logs, licenses, evidence?

### Technical
- Can users upload directly to Capture?
- Who stores videos? Retention? Deletion? Maximum file sizes?
- Enterprise scaling?

### Economics
- What would 10,000 signed videos/month cost?
- What changes at scale? Storage pricing? Bandwidth? Rate limits?

### Metadata
- What belongs inside C2PA vs. on-chain vs. outside both?
- Could SI8 include custom assertions:
  - Review ID
  - Chain of Title ID
  - Reviewer
  - Evidence package hash
  - Commercial review reference

### Roadmap
- Where does Numbers see provenance going over 3–5 years?
- Infrastructure only? Workflow? Enterprise governance? Compliance?

### Strategic Question (ask directly)
> "If SI8 succeeds, what would make us your ideal ecosystem partner?"

---

# Success Criteria for Wednesday

Leave the meeting understanding:

1. Where the architectural boundary between Numbers and SI8 should exist.
2. Whether SI8 is building on top of Numbers or eventually competing with them.
3. Whether Numbers sees provenance ending at evidence creation or extending into enterprise compliance workflows.
4. Whether Creator Record can realistically be free based on actual infrastructure costs.
5. Whether SI8 should architect its Chain of Title schema around Numbers from the beginning.

---

# Guiding Principle Going Forward

**Ship only the product that customer research has validated (SI8 Certified).**

Everything else (Creator Record, Design Partner Program, future Workflow) exists solely to increase Certified adoption or discover the next validated product.

Do not build speculative products before the evidence supports them.
