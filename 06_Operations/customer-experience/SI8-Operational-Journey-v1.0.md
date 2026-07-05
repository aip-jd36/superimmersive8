# SI8 Operational Journey
**Version:** 1.0
**Effective date:** July 5, 2026
**Status:** ACTIVE — execution document; expected to evolve with each assessment cycle
**Audience:** Internal — JD / reviewer reference
**Owner:** Chief of Staff
**Related document:** `SI8-Customer-Journey-v1.0.md` (vision document this execution map serves)

---

## 1. Purpose

This document maps the intended SI8 customer experience to the actual operational workflows, artifacts, and responsibilities used to deliver the Campaign Clearance Package.

It answers: *How does SI8 operationally deliver the intended customer experience?*

It is an honest execution map. Where artifacts do not exist or processes are undefined, this document says so. Gaps are as important as completed items — they identify where the next operational investment should go.

This document is expected to evolve frequently as real assessments generate process evidence, automation is layered in, and artifacts are added or improved.

---

## 2. Relationship to Customer Journey

| Customer Journey | Operational Journey |
|-----------------|---------------------|
| Defines the intended experience | Defines how SI8 delivers it |
| Stable — changes represent a philosophy shift | Living — updates after every 1-3 assessments |
| Written for the customer's perspective | Written for the reviewer's perspective |
| Describes emotions, messages, and principles | Describes actions, artifacts, owners, and gaps |

When the Customer Journey and the Operational Journey diverge — when what SI8 intends to communicate is not what the current workflow delivers — that divergence is a gap to close.

---

## 3. Operational Principles

| # | Principle |
|---|-----------|
| O1 | Every customer-facing action should be intentional. No improvised communications at any stage. |
| O2 | The reviewer and the relationship owner are the same person (JD) at current scale. The workflow must account for this — context-switching is a real operational cost. |
| O3 | The first 1-5 assessments are manually delivered. Automation should be layered in only after real patterns are confirmed. |
| O4 | Evidence gaps are documented in the workbook before the report is written. Never leave the gap in the report without a workbook record. |
| O5 | The report is a product, not a note. It should be formatted and delivered consistently from the first assessment forward. |
| O6 | Post-Assessment Review is mandatory. Every assessment generates a completed Post-Assessment Review within 24 hours of report delivery. |

---

## 4. End-to-End Workflow Summary

```
CUSTOMER STAGE                    SI8 ACTION                              ARTIFACT

Awareness                 ──►     Pull marketing (no action required)     Marketing site / LinkedIn
Initial Outreach          ──►     Respond, qualify intent                 LinkedIn / email
Qualification             ──►     Confirm fit, set expectations           ICP Definitions, conversation
Pre-Sale Prep             ──►     Share Evidence Preparation Guide        Evidence Preparation Guide
Purchase / Commitment     ──►     Send Engagement Confirmation Email      Engagement Confirmation Email
Evidence Submission       ──►     Triage CertForm submission              CertForm / Supabase
Assessment In Progress    ──►     Conduct review                          Reviewer Workbook (all 4 docs)
Report Delivery           ──►     Finalize, format, send report           Report Template + delivery email
Follow-Up / Clarification ──►     Respond, clarify                        Email (no protocol — gap)
Future Campaign Readiness ──►     [No current process — gap]              None — future
```

---

## 5. Stage-by-Stage Operational Map

### Stage 1 — Awareness

| Field | Detail |
|-------|--------|
| Customer stage | Awareness |
| SI8 internal action | Pull marketing — no action triggered by JD at this stage. Website and LinkedIn presence generate inbound interest. |
| Artifact used | Marketing site (superimmersive8.com), LinkedIn content, LinkedIn outreach campaigns (Dripify aliases) |
| Owner | JD |
| Manual or automated | Partially automated (Dripify sequences) / manual (LinkedIn content) |
| Status | **Exists** |
| Notes | Dripify campaigns active for UK, Amsterdam, Dubai. LinkedIn company page and personal profile are the primary awareness channels. No paid advertising currently. |

---

### Stage 2 — Initial Outreach / Conversation

| Field | Detail |
|-------|--------|
| Customer stage | Initial Outreach / Conversation |
| SI8 internal action | Respond to LinkedIn reply or inbound inquiry. Assess surface fit. Begin a conversation about what the assessment covers. |
| Artifact used | LinkedIn message thread / email. ICP Definitions (`03_Sales/ICP-DEFINITIONS.md`) as internal reference. |
| Owner | JD |
| Manual or automated | Manual |
| Status | **Exists** |
| Notes | Outreach message sequences exist (Legal Friction campaign). Response protocol is not formally documented but is operationally consistent. The Evidence Preparation Guide is available as a pre-sale asset at this stage — send on request or when the lead asks "what does the assessment cover?" |

---

### Stage 3 — Qualification

| Field | Detail |
|-------|--------|
| Customer stage | Qualification |
| SI8 internal action | Assess whether the lead fits ICP 1 or ICP 2. Confirm the lead has AI content they want to clear for commercial use. Confirm the $499 price is not a blocker. Flag No List risks if apparent. |
| Artifact used | ICP Definitions, No List (in CLAUDE.md), CRM (`03_Sales/CRM.md`), Sales Pipeline (`03_Sales/SALES-PIPELINE.md`) |
| Owner | JD |
| Manual or automated | Manual |
| Status | **Exists** |
| Notes | Qualification is conversational — no formal scoring rubric exists. The No List (celebrity likeness, voice cloning, political content, explicit content, deepfakes) is the primary disqualifier checklist. ICP fit is a judgment call at this stage. |

---

### Stage 4 — Pre-Sale Evidence Preparation

| Field | Detail |
|-------|--------|
| Customer stage | Pre-Sale Evidence Preparation |
| SI8 internal action | Share the Evidence Preparation Guide before the purchase commitment. Frame it as "here is what the assessment requires" — not a barrier, but a preparation aid. |
| Artifact used | `SI8-Evidence-Preparation-Guide-v0.1.md` (customer-facing, send as PDF or shared link) |
| Owner | JD |
| Manual or automated | Manual |
| Status | **Exists** |
| Notes | The Evidence Preparation Guide should be sent *before* the customer commits to purchase — it functions as a pre-sale qualification aid as well as a preparation tool. A customer who reads it and decides not to proceed has self-selected out; a customer who reads it and proceeds is better prepared. Currently distributed manually by JD via email or LinkedIn message. No hosted version or automated delivery exists. |

---

### Stage 5 — Purchase / Commitment

| Field | Detail |
|-------|--------|
| Customer stage | Purchase / Commitment |
| SI8 internal action | (1) Customer pays via Stripe through the CertForm at app.superimmersive8.com/certify. (2) Stripe webhook processes payment, updates Supabase submission record. (3) JD sends Engagement Confirmation Email manually within 24 hours. |
| Artifact used | CertForm (`app.superimmersive8.com/certify`), Stripe ($499 live mode), Supabase (submission record), `SI8-Engagement-Confirmation-Email-v0.1.md` |
| Owner | Stripe (payment automation), JD (engagement email) |
| Manual or automated | Payment: automated. Engagement email: manual. |
| Status | **Exists** (payment + CertForm). **Gap: Engagement email is manually triggered** — no Stripe webhook → email automation. |
| Notes | The Engagement Confirmation Email must be sent within 24 hours of payment confirmation. Three variants exist: standard, cold-to-warm, warm LinkedIn lead. Attach Evidence Preparation Guide if not already shared. For the first assessments, JD may elect to handle intake manually rather than routing through the full CertForm — in that case, a direct email with the submission intake form replaces the CertForm step. |

---

### Stage 6 — Evidence Submission

| Field | Detail |
|-------|--------|
| Customer stage | Evidence Submission |
| SI8 internal action | (1) Customer completes CertForm (11 sections). (2) Submission record created in Supabase. (3) JD receives internal notification (Resend email). (4) JD triages submission: check for No List red flags, confirm completeness sufficient to begin review. |
| Artifact used | CertForm, Supabase, Resend admin notification email |
| Owner | Customer (submission), JD (triage) |
| Manual or automated | Submission: partially automated (form + Supabase). Triage: manual. |
| Status | **Exists** (CertForm + Supabase + notification). **Gap: No submission triage SOP.** JD receives a notification but there is no documented checklist for confirming readiness to begin review. |
| Notes | If the submission has significant gaps that make review impossible (e.g., no video link provided), JD should contact the customer before starting the review. No protocol currently exists for this edge case. The Customer Submission Checklist is the customer's guide; a parallel internal triage checklist does not yet exist. |

---

### Stage 7 — Assessment In Progress

| Field | Detail |
|-------|--------|
| Customer stage | Assessment In Progress |
| SI8 internal action | JD conducts the assessment using the Reviewer Workbook. Work through all 6 sections: Intake & Scope, Evidence Checklist (16 controls), Evidence Gap Log, Findings Log, Overall Assessment, Report Brief. Target: ~90 minutes. Actual: likely 2–3× longer for first assessments. |
| Artifact used | `SI8-Reviewer-Workbook-v0.1.md`, `SI8-Reviewer-Workbook-Schema-v0.1.md` |
| Owner | JD |
| Manual or automated | Manual |
| Status | **Exists** |
| Notes | No mid-review customer communication currently exists. The customer has no visibility into the review while it is in progress. A brief acknowledgment email ("review started — you'll hear from us by [date]") would reduce anxiety but is not currently templated. Timeline commitment is 5 business days from completed submission — this is the external anchor; the 90-minute estimate is internal only. |

---

### Stage 8 — Report Delivery

| Field | Detail |
|-------|--------|
| Customer stage | Report Delivery |
| SI8 internal action | (1) Complete Section 6 (Report Brief) of the Reviewer Workbook. (2) Transfer content into Assessment Report Template. (3) Replace all bracketed fields. (4) Delete reviewer instructions. (5) Confirm Standard Assurance Language is verbatim. (6) Export to PDF. (7) Send to customer via email with a brief cover note. (8) Complete Post-Assessment Review within 24 hours. |
| Artifact used | `SI8-Assessment-Report-Template-v0.1.md`, `SI8-Post-Assessment-Review-Template-v0.1.md`, delivery email (no template — gap) |
| Owner | JD |
| Manual or automated | Manual |
| Status | **Report Template exists. Post-Assessment Review Template exists.** **Gap: No Report Delivery SOP. No delivery email template.** |
| Notes | The delivery email is the last customer-facing touchpoint before follow-up. It should include: a brief personal note from JD, the PDF report as an attachment, and an offer to discuss findings. No template currently exists for this email. A simple template (3-5 lines + offer to discuss) would ensure consistency. This is the highest-priority operational gap at current stage. |

---

### Stage 9 — Follow-Up / Clarification

| Field | Detail |
|-------|--------|
| Customer stage | Follow-Up / Clarification |
| SI8 internal action | Respond to customer questions about findings. Clarify in plain language. Do not retreat from independent assessment under client pushback. If the customer believes a finding is incorrect, review the workbook record and respond with specific evidence basis. |
| Artifact used | Email (no template — gap), Reviewer Workbook (internal reference for evidence basis) |
| Owner | JD |
| Manual or automated | Manual |
| Status | **Gap: No follow-up protocol or template exists.** |
| Notes | Most follow-up will be interpretive ("what does this finding mean?") rather than substantive ("this finding is wrong"). The reviewer workbook is the evidence record and should be consulted before any follow-up response. A brief follow-up protocol — covering how to respond to common question types — should be written after Assessment 1 when actual question patterns are known. |

---

### Stage 10 — Future Campaign Readiness

| Field | Detail |
|-------|--------|
| Customer stage | Future Campaign Readiness |
| SI8 internal action | No current process. |
| Artifact used | None |
| Owner | — |
| Manual or automated | — |
| Status | **Gap: No re-engagement process exists.** |
| Notes | The Report's "Recommended Next Steps" section partially serves this purpose — it tells the customer what to retain, monitor, and do differently next time. But there is no proactive re-engagement from SI8 after delivery. A 6-month re-engagement email (triggered manually or automatically) would be the simplest future campaign readiness mechanism. This is a future automation opportunity, not a blocker for Assessment 1. |

---

## 6. Current Artifacts — Status Summary

| Artifact | Location | Stage Used | Customer-Facing | Status |
|----------|----------|------------|----------------|--------|
| Marketing site | superimmersive8.com | Awareness | Yes | Exists |
| LinkedIn outreach sequences | Dripify / `03_Sales/outreach/` | Awareness | Yes | Exists |
| ICP Definitions | `03_Sales/ICP-DEFINITIONS.md` | Qualification | No | Exists |
| CRM + Sales Pipeline | `03_Sales/CRM.md` / `SALES-PIPELINE.md` | Qualification | No | Exists |
| Evidence Preparation Guide | `06_Operations/customer-onboarding/` | Pre-Sale / Purchase | Yes | Exists v0.1 |
| Customer Submission Checklist | `06_Operations/customer-onboarding/` | Pre-Sale / Submission | Yes | Exists v0.1 |
| CertForm | app.superimmersive8.com/certify | Evidence Submission | Yes | Exists |
| Stripe payment ($499) | Stripe live mode | Purchase | Yes | Exists |
| Supabase submission database | Supabase | Submission | No | Exists |
| Engagement Confirmation Email template | `06_Operations/customer-onboarding/` | Purchase | Yes | Exists v0.1 — manual send |
| Reviewer Workbook | `06_Operations/reviewer-workbook/` | Assessment | No | Exists v0.1 |
| Reviewer Workbook Schema | `06_Operations/reviewer-workbook/` | Assessment | No | Exists v0.1 |
| Assessment Report Template | `06_Operations/reviewer-workbook/` | Report Delivery | Yes | Exists v0.1 |
| Standard Assurance Language | Embedded in Report Template | Report Delivery | Yes | Exists v0.1 |
| Post-Assessment Review Template | `06_Operations/reviewer-workbook/` | Post-Delivery | No | Exists v0.1 |
| Delivery email template | — | Report Delivery | Yes | **Gap — Needs Draft** |
| Submission triage checklist | — | Evidence Submission | No | **Gap — Needs Draft** |
| Follow-up / clarification protocol | — | Follow-Up | No | **Gap — After Assessment 1** |
| Future campaign re-engagement | — | Future Readiness | Yes | **Gap — Future** |

---

## 7. Manual vs. Automated Steps

| Step | Current State | Trigger for Automation |
|------|--------------|------------------------|
| LinkedIn outreach sequences | Partially automated (Dripify) | — |
| Payment processing | Automated (Stripe) | — |
| Supabase submission record creation | Automated | — |
| Internal notification on new submission | Automated (Resend) | — |
| Customer Engagement Confirmation Email | Manual — JD sends within 24 hrs | When volume exceeds 2-3/month |
| Evidence review | Manual | Not a candidate — human review is the product |
| Report generation | Manual | Partial — structured sections could be pre-populated |
| Report delivery | Manual | When volume exceeds 2-3/month |
| Follow-up responses | Manual | Not a candidate for automation |
| Re-engagement sequence | Manual (not currently done) | When volume warrants a CRM trigger |

---

## 8. Gaps — Priority Order

The following gaps are identified in the current operational workflow. Priority is based on which gaps most affect the customer experience and the likelihood of the gap surfacing in Assessment 1.

| Gap | Stage | Priority | Why |
|-----|-------|----------|-----|
| Report Delivery SOP + delivery email template | Report Delivery | **High — before Assessment 1** | Last customer touchpoint before follow-up; inconsistent delivery undermines the professional positioning |
| Submission triage checklist | Evidence Submission | **Medium — before Assessment 1** | Ensures JD knows when a submission is ready to review vs. needs follow-up |
| Mid-review acknowledgment communication | Assessment In Progress | **Medium — after Assessment 1** | Reduces customer anxiety during the review window |
| Follow-up / clarification protocol | Follow-Up | **Low — after Assessment 1** | Can be improvised for first assessment; write after seeing real question patterns |
| Automated Engagement Confirmation Email | Purchase / Commitment | **Low — after Assessment 3-5** | Manual is fine at current volume; automate when it becomes a consistent burden |
| Future campaign re-engagement process | Future Readiness | **Future** | Not relevant until the first customers return for a second assessment |

---

## 9. Future Automation Opportunities

These automations are not current priorities but represent the natural evolution of the operational journey.

| Automation | Stage | Trigger |
|-----------|-------|---------|
| Engagement Confirmation Email via Stripe webhook | Purchase | When volume exceeds 2-3/month |
| Submission triage notification with checklist | Evidence Submission | Can be built into admin panel |
| Mid-review status email (Day 3 of review) | Assessment In Progress | Simple automated send from Supabase trigger |
| Report delivered to customer portal (vs. email attachment) | Report Delivery | When customer portal has secure document delivery |
| 6-month re-engagement email | Future Readiness | CRM trigger or Supabase date-based query |
| AI-assisted pre-screening (logo/likeness detection) | Assessment | Year 2 — reduces manual review time on low-risk controls |

---

*SI8 Operational Journey v1.0 · PMF Strategy Inc. d/b/a SuperImmersive 8*
*Internal reference — not for distribution*
