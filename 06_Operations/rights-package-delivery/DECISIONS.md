# Rights Package Delivery — Decision Log

## Version History

| Version | Date | Status | Trigger | Key Changes |
|---------|------|--------|---------|-------------|
| **v0.1** | Feb 21, 2026 | Draft (peer review pending) | Research completed on Getty SOP | Initial framework based on Getty Images delivery model |

---

## v0.1 — February 21, 2026

### What Triggered This Version

User question: "How does Getty give a user their rights package? Does Getty give a certificate overview? Does Getty store the rights package on their servers for a fixed amount of time, in case there is a legal dispute? I want to model our SOP after Getty's process."

Research completed on Getty Images, Adobe Stock, and stock photography industry best practices for rights documentation delivery.

### What's Included in v0.1

1. **README.md** — Project overview, how documents relate, version roadmap
2. **DELIVERY-PROCESS.md** — Step-by-step buyer purchase → delivery flow (Year 1 manual, Year 2 semi-auto, Year 3 platform)
3. **EMAIL-TEMPLATES.md** — 8 email templates (license confirmation, re-download, refund, proposal, follow-up, etc.)
4. **STORAGE-RETENTION.md** — File storage architecture (Google Drive → S3), retention policies, backup strategy
5. **ACCOUNT-DASHBOARD.md** — Year 2-3 self-serve platform vision (user accounts, download dashboard, API)
6. **DECISIONS.md** — This file (version log)
7. **research/getty-sop-research.md** — Web research findings on Getty's actual delivery process

### Key Decisions Made in v0.1

| # | Decision | Rationale | Status |
|---|----------|-----------|--------|
| 1 | Model delivery SOP after Getty Images | Proven 25+ year stock licensing model, industry standard | ✓ Final |
| 2 | Rights Package is primary deliverable, video file is secondary | Getty logic: buyers pay for legal guarantee, not just the file | ✓ Final |
| 3 | Year 1 = manual delivery via Google Drive + email | Low tech overhead, focus on validating model before building platform | ✓ Final |
| 4 | Year 2 = semi-automated (Stripe webhooks + Resend) | Automate when deal volume justifies the dev time | ✓ Final |
| 5 | Year 3 = full self-serve platform (Next.js + PostgreSQL) | Scale to 100+ deals/year without manual work | ✓ Final |
| 6 | Indefinite retention of all license records | Matches Getty model, legal compliance, buyer may need docs years later | ✓ Final |
| 7 | No expiration on download links (Year 1) | Reduces support burden, matches Getty UX | ✓ Final |
| 8 | 7-day expiration on download links (Year 2+) | Pre-signed URLs expire for security, but buyer can generate new links from account | ⚠️ Provisional (test in Year 2) |
| 9 | Plain text emails for Year 1, HTML for Year 2+ | Easy to maintain, universal compatibility | ✓ Final |
| 10 | Include catalog ID in every email subject line | Makes emails searchable for buyer compliance teams | ✓ Final |
| 11 | No file attachments in emails (download links only) | Avoids email size limits, allows file updates if needed | ✓ Final |
| 12 | Support both password + magic link authentication (Year 2+) | Magic link = lower friction, password = familiar UX | ✓ Final |
| 13 | Allow guest checkout (Year 2+) | Reduces friction, but encourage account creation | ⚠️ Provisional (test conversion rate) |
| 14 | Storage tier transitions: Hot (0-1yr) → Warm (1-7yr) → Cold (7yr+) | Cost optimization while maintaining indefinite retention | ✓ Final |
| 15 | Cross-region replication (primary + backup region) | Disaster recovery + improved download speed for SEA buyers | ⚠️ Provisional (Year 2+, cost-dependent) |

### Open Questions (To Be Resolved)

1. **Payment processing:** Stripe only? Or also PayPal / wire transfer for international buyers?
   - **Why it matters:** Wire transfers add 3-5 day delay, manual confirmation required
   - **Decision needed by:** First international buyer inquiry

2. **Download link expiration policy (Year 2+):** 7 days? 30 days? No expiration?
   - **Why it matters:** Shorter = more secure, longer = better UX
   - **Decision needed by:** Before Year 2 platform build

3. **Rights Package versioning:** If template format changes (v1.0 → v1.1), do existing buyers get updated PDF?
   - **Why it matters:** Affects buyer support burden, database versioning complexity
   - **Decision needed by:** Before first template update

4. **Re-download limits:** Unlimited? Or "after 1 year, contact support"?
   - **Why it matters:** Unlimited = best UX but potential for abuse (buyer shares link publicly)
   - **Decision needed by:** Before Year 2 platform build

5. **Team accounts (Year 3):** Can agency add 5 employees, all access same licenses?
   - **Why it matters:** Major UX improvement for agency buyers, but adds auth complexity
   - **Decision needed by:** Year 3 platform roadmap

6. **Refund policy details:** 30 days? Only if asset unused? How to verify non-use?
   - **Why it matters:** Affects revenue risk, buyer trust
   - **Decision needed by:** Before first refund request (document precedent in EDGE-CASES.md)

7. **International data residency:** Do EU buyers require data stored in EU region?
   - **Why it matters:** GDPR compliance, adds storage cost + complexity
   - **Decision needed by:** First EU buyer (if any)

8. **License transfer policy:** Can buyer transfer license to new company if acquired?
   - **Why it matters:** Common in B2B, Getty allows it
   - **Decision needed by:** First transfer request

---

## Research Findings (Feb 21, 2026)

### Getty Images SOP

**What Getty provides at purchase:**
- License automatically granted when asset downloaded
- Invoice/receipt emailed
- License recorded in user account "License History" indefinitely
- NO individual certificate PDFs per asset
- NO detailed provenance reports
- Master Content License Agreement (covers all purchases, not asset-specific)

**Record retention:**
- License history maintained "for the duration of licenses" (legal compliance requirement)
- Users can access full license history indefinitely through account
- Getty cross-checks licensed content against database when infringement claims arise
- Invoice + account history = legal defense bundle

**Delivery mechanism:**
- Immediate download link after payment
- Account dashboard shows all licenses (asset ID, date, license type)
- No expiration on account access (buyers can re-download anytime)

**Key insight:** Getty does NOT provide detailed provenance documentation. Their value is "we warrant we can license this." SI8's differentiation is providing documented defensibility that Getty doesn't offer.

### Adobe Stock SOP

- Similar to Getty: license history + invoice, no separate certificates
- Users have requested PDF certificate downloads, but Adobe hasn't implemented
- License history + screenshot + standard terms = proof of license

**Key insight:** Stock photo industry standard = minimal documentation. SI8's Rights Package is above industry standard.

### Stock Photo Agency Best Practices

- Maintain detailed records of licensed images and agreements to avoid legal issues
- Educate team on licensing compliance
- Regularly review deployed content for compliance
- Record retention: 3-7 years minimum (tax law), indefinite recommended (legal defense)

**Key insight:** Industry expectation is permanent record retention, even if not legally required.

---

## What Changed from Initial Assumptions

| Initial Assumption | Reality (After Research) | Impact on SI8 SOP |
|-------------------|-------------------------|------------------|
| Getty provides detailed certificate PDFs | ❌ No, just invoice + license history | SI8's Rights Package is a true differentiator |
| Stock agencies provide provenance documentation | ❌ No, minimal documentation is industry standard | SI8's 9-field Rights Package is above industry norm |
| Download links expire after 30 days | ✅ Getty: no expiration (account access indefinite) | Year 1: match Getty (no expiration) |
| Buyers expect detailed per-asset legal docs | ❓ Mixed (some request it, most don't) | SI8 should position Rights Package as premium compliance layer |
| Refunds are common in stock licensing | ❓ Unknown refund rate (not public) | Monitor SI8 refund rate, adjust policy if >5% |

---

## Precedents Set (To Be Updated as Real Deals Happen)

### Precedent 001: [Placeholder - First Deal]
**Date:** TBD
**Situation:** First real license delivered
**Decision:** [Document what worked, what broke, what to change]
**Carry-forward:** [How future deals should be handled based on this experience]

### Precedent 002: [Placeholder - First Refund Request]
**Date:** TBD
**Situation:** First refund request
**Decision:** [How it was handled, policy clarification]
**Carry-forward:** [Standard refund SOP going forward]

### Precedent 003: [Placeholder - First Re-Download Request]
**Date:** TBD
**Situation:** Buyer lost download link, requested resend
**Decision:** [How it was handled, turnaround time]
**Carry-forward:** [Standard re-download SOP going forward]

---

## Next Review Triggers

| Trigger | Action |
|---------|--------|
| After first 3 deals close | Update v0.1 → v0.2 (refine email templates, delivery process based on real buyer feedback) |
| First refund request | Document in precedents, finalize refund policy |
| First re-download request | Document in precedents, measure support time cost |
| First Tier 2 custom placement delivered | Document regeneration delivery flow, update EMAIL-TEMPLATES.md |
| 10 deals closed (manual process) | Evaluate if Year 2 semi-automation is justified |
| Legal review completed (Month 3-6) | Update email templates with lawyer-approved language, finalize license terms |
| Year 1 ends (Month 12) | Comprehensive review: what worked, what didn't, Year 2 roadmap |

---

## Decisions Deferred to Future Versions

| Decision | Why Deferred | Revisit When |
|----------|--------------|--------------|
| Tier pricing differential (Certified vs Standard) | No deals yet, can't validate pricing | After 10 Tier 1 + 3 Tier 2 deals |
| E&O insurance requirement | Not Year 1 blocker, investigate later | When first large brand buyer requests it |
| Platform tech stack final choice | Too early to commit, might change | Month 9-12 (before Year 2 build starts) |
| API access for enterprise buyers | No enterprise buyers yet | When first buyer requests programmatic access |
| International tax/VAT handling | No international buyers yet | First EU or non-US buyer |
| Filmmaker royalty automation | Manual tracking fine for <20 deals | Year 2 (when filmmaker pool grows) |

---

## Version Changelog

### v0.1 → v0.2 (Planned)

**Trigger:** After first 3 deals close
**Expected changes:**
- Email templates refined based on buyer feedback
- Delivery timeline adjusted (if 15-30 min manual process is too slow)
- Storage folder structure optimized (if current structure is clunky)
- Document first edge cases (refund, re-download, transfer, etc.)
- Add real deal examples to DELIVERY-PROCESS.md (redacted buyer names)

### v0.2 → v0.3 (Planned)

**Trigger:** Legal review completed (Month 3-6)
**Expected changes:**
- Email language approved by lawyer
- License terms finalized
- Refund policy formalized
- Invoice format standardized
- Data privacy clauses added

### v0.3 → v1.0 (Planned)

**Trigger:** Month 12 (end of Year 1)
**Expected changes:**
- Stable manual SOP documented
- All edge cases encountered in Year 1 documented
- Year 2 automation roadmap finalized
- Metrics from Year 1 (delivery speed, re-download rate, refund rate) included
- Decision: migrate to semi-automation in Year 2 or wait until Year 3?

---

## Document Maintenance

**Owner:** JD
**Review frequency:** After every 3 deals (until v1.0 stable)
**Update process:**
1. Document new precedent in EDGE-CASES.md (if applicable)
2. Update DECISIONS.md with decision + rationale
3. Update affected SOP documents (DELIVERY-PROCESS.md, EMAIL-TEMPLATES.md, etc.)
4. Increment version if significant changes (v0.1 → v0.2)

**When to create new version snapshot:**
- After every 10 deals (until v1.0)
- After legal review (major milestone)
- After platform build (Year 2-3 transitions)

---

## Open Questions Log

*Questions that come up during implementation but don't block immediate work. Document here for future resolution.*

### Q1: Should SI8 offer a "verification badge" for buyers to display on their website?
**Context:** "This content verified by SuperImmersive 8 Safe Lane"
**Why it might matter:** Marketing benefit for buyer, credibility signal
**Concerns:** Implies SI8 is certifying (legal risk), branding complexity
**Decision needed by:** After first 5 deals (gauge buyer interest)

### Q2: What if buyer deploys content that later becomes controversial (e.g., brand scandal)?
**Context:** Buyer licensed clean content, but brand later involved in scandal. Does buyer's deployment of SI8 content reflect poorly on SI8?
**Why it might matter:** Reputation risk
**Concerns:** Can't control how buyers use content, but association risk exists
**Decision needed by:** Before first major brand deal

### Q3: Should Rights Package include filmmaker name, or keep filmmaker anonymous to buyers?
**Context:** Getty doesn't disclose photographer names in license docs (just asset ID)
**Why it might matter:** Filmmaker attribution vs. privacy
**Current stance:** Filmmaker name included in Rights Package (transparency), but not required in buyer's deployment (optional attribution)
**Decision needed by:** Before first filmmaker agreement finalized

---

**Last Updated:** February 21, 2026
**Next Review:** After first 3 deals close (target: Month 3-4)
