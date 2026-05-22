# SI8 Product Discovery Pipeline

**Purpose:** Track leads who gave valuable product insights — workflow descriptions, pain
quantification, product questions, competitive intel. These are NOT sales leads. The goal
is discovery calls to validate PMF, surface edge cases, and identify product gaps.

**Source:** `03_Sales/DISCOVERY-PERFORMANCE-LOG.md` → Discovery Signal Checklist → manual review.
A lead can appear in BOTH this pipeline and `03_Sales/CRM.md` if they are also a sales prospect.

**Last updated:** 2026-05-23

---

## Stage Definitions

| Stage | What it means | Entry criteria |
|-------|---------------|----------------|
| **Signal** | Reply contained real insight — added here pending outreach decision | Flagged by `is_product_feedback()`, confirmed by manual review |
| **Outreach Sent** | JD replied asking to learn more / get on a discovery call | Message sent specifically for product discovery |
| **Call Booked** | Date and time confirmed, calendar invite sent | Calendar event created |
| **Call Taken** | Call happened, notes captured | Post-call |
| **Insight Documented** | Key learnings written up in Insights Archive below | Write-up filed |

**Advisor/Beta** (ongoing): Leads invited into a recurring feedback loop — platform beta, advisory role, or ongoing check-ins.

---

<!-- discovery-pipeline:start -->

## Signal (0)

*Leads flagged from discovery report, pending outreach decision.*

| Lead | Title | Company | Geo | Sales Class | Campaign | Key insight excerpt | Added |
|------|-------|---------|-----|-------------|----------|---------------------|-------|

---

## Outreach Sent (0)

*JD has sent a discovery-focused follow-up. Waiting for response.*

| Lead | Title | Company | Geo | Last Action | Next Action | Follow Up By |
|------|-------|---------|-----|-------------|-------------|--------------|

---

## Call Booked (0)

*Discovery call confirmed on calendar.*

| Lead | Title | Company | Geo | Call Date | Focus Areas | Notes |
|------|-------|---------|-----|-----------|-------------|-------|

---

## Call Taken (0)

*Call happened. Notes captured.*

| Lead | Title | Company | Geo | Call Date | Key Findings | Insight Filed? |
|------|-------|---------|-----|-----------|--------------|----------------|

---

## Insight Documented (0)

*Key learnings written up and filed in Insights Archive.*

| Lead | Title | Company | Geo | Call Date | Insight Summary | Tags |
|------|-------|---------|-----|-----------|-----------------|------|

---

## Advisor / Beta (0)

*Ongoing relationship — invited into recurring feedback loop.*

| Lead | Title | Company | Geo | Role | Engagement Type | Last Contact |
|------|-------|---------|-----|------|-----------------|--------------|

<!-- discovery-pipeline:end -->

---

## Insights Archive

*Running log of key product learnings from discovery conversations.*
*Format: date · lead name · company · geo · key insight · tags*

<!-- insights:start -->

*(No insights logged yet. After each discovery call, add a bullet below.)*

<!-- insights:end -->

---

## Tag Reference

Use tags to group insights by theme in the archive:

| Tag | What it covers |
|-----|----------------|
| `#workflow` | How they currently handle AI video rights (process, tools, people) |
| `#pain` | Specific pain quantified — time, cost, frequency, deal impact |
| `#objection` | Why they said no or pushed back — reveals assumptions |
| `#competitive` | What they use instead (competitor, workaround, DIY approach) |
| `#edge-case` | Scenario or use case the product doesn't currently handle |
| `#pricing` | Signals about willingness to pay, budget, or cost framing |
| `#icp` | Insight that refines who the ideal customer is |
| `#regulatory` | Legal or compliance context — specific laws, frameworks, requirements |
| `#feature` | Product feature request or gap mentioned |
