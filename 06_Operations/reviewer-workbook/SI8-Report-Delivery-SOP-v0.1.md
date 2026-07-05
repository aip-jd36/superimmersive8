# SI8 Report Delivery SOP
**Version:** 0.1
**Effective date:** July 5, 2026
**Status:** ACTIVE — required for every Assessment Report delivery
**Audience:** SI8 reviewer / Chief of Staff — internal only
**Purpose:** Standard procedure for finalizing, exporting, and delivering the Campaign Assurance Assessment Report to the customer.

---

## When This SOP Applies

This SOP applies when:
- The Reviewer Workbook Section 5 (Overall Assessment) is signed off
- The Reviewer Workbook Section 6 (Report Brief) is complete
- The customer has paid and received the Engagement Confirmation Email

Do not begin report finalization until all three conditions are met.

---

## Step 1 — Populate the Report Template

1. Open `06_Operations/reviewer-workbook/SI8-Assessment-Report-Template-v0.2.md`
2. Save a copy renamed with the Assessment ID: `SI8-Assessment-Report-[ASSESS-ID].md` — do NOT edit the template file directly
3. Transfer content from Workbook Section 6 into all bracketed fields
4. Write Section 1 Dashboard prose: 2-3 sentences for Overall Assessment basis; plain language for a general counsel
5. Complete Section 2 Scope: content details, declared tools, evidence list, scope limitations
6. Complete Section 3 Domain Assessment: all 7 domains; mark "N/A" only with explicit justification
7. Confirm Standard Assurance Language (Section 4) is verbatim — do not edit
8. Populate Appendix A: Supporting Evidence Record

**Key language discipline:**
- Use: "evidence reviewed," "evidence indicates," "the submission confirms," "the assessment is unable to verify"
- Avoid: "we found," "we believe," "this is safe," "legally cleared"
- Avoid language that implies a guarantee, warranty, or legal opinion

---

## Step 2 — Pre-Delivery Checklist

Work through the checklist embedded in the Report Template. Confirm all items before proceeding.

| Check | Item |
|-------|------|
| ☐ | All `[bracketed]` fields replaced |
| ☐ | All reviewer instruction blocks deleted (including the pre-delivery block at top) |
| ☐ | Section 1: Outcome, confidence, and key findings complete |
| ☐ | Section 3: All 7 domains addressed |
| ☐ | Standard Assurance Language (Section 4) is verbatim — not edited or paraphrased |
| ☐ | Appendix A: Supporting Evidence Record complete |
| ☐ | No language in the report implies a guarantee, warranty, or legal opinion |
| ☐ | Report reads as a complete, standalone document for a reader who has not seen the submission |
| ☐ | Assessment ID, Report date, Submission ID, and Prepared by fields confirmed |

---

## Step 3 — Export to PDF

The report is delivered as a PDF. The MD file is the source of truth for internal records; the PDF is the customer-facing deliverable.

**Recommended export method:** Open in VS Code with a Markdown PDF extension (e.g., Markdown PDF by yzane), or open in Obsidian and export to PDF, or use Pandoc if available.

**Pandoc command (if installed):**
```
pandoc SI8-Assessment-Report-[ASSESS-ID].md -o SI8-Assessment-Report-[ASSESS-ID].pdf
```

**File naming convention:** `SI8-Assessment-Report-[ASSESS-ID].pdf`

Example: `SI8-Assessment-Report-ASSESS-2026-07-05-001.pdf`

**After export:** Review the PDF visually before sending. Confirm:
- All sections rendered correctly
- No reviewer instruction blocks visible
- Tables are formatted cleanly
- Document reads professionally from start to finish

---

## Step 4 — Delivery Email

Send the report via email to the submitting party within 5 business days of payment (the external commitment). The internal target is 90-minute review + same-day delivery.

**Subject line options:**

For standard delivery:
```
SI8 Campaign Assurance Assessment — [Content Title] ([ASSESS-ID])
```

For delivery with positive outcome:
```
Your SI8 Assessment is ready — [Content Title]
```

For delivery with conditions or material risks:
```
SI8 Assessment complete — [Content Title] — please review conditions
```

---

**Email body template:**

```
Hi [First Name],

Your SI8 Campaign Assurance Assessment for [Content Title] is attached.

[Select one opening paragraph based on outcome:]

[POSITIVE OUTCOME] 
The assessment found that the evidence provided supports the intended commercial use of the content. Full findings, the evidence coverage summary, and recommended next steps are in the attached report.

[WITH CONDITIONS]
The assessment found that the evidence largely supports commercial deployment with a small number of specific conditions to address. The conditions are straightforward and documented on page [N] of the attached report. I'd suggest reviewing those before your launch date.

[MATERIAL RISKS]
The assessment identified some commercial evidence gaps that your team should be aware of before deployment. The findings and their commercial implications are documented clearly in Section 1 of the attached report. Happy to walk you through them on a short call if that's helpful.

The report includes:
- A Commercial Assurance Summary (Section 1) — designed for your brand legal team or E&O underwriter
- A full domain-by-domain assessment (Section 3)
- Recommended next steps

[If conditions exist, add:]
The conditions in Section 1 are actions you can take before or during deployment — not post-hoc fixes. Reach out if you have questions on any of them.

Assessment ID: [ASSESS-ID]
Report date: [YYYY-MM-DD]

Best,
JD Chang
SuperImmersive 8
```

**Attachments:** `SI8-Assessment-Report-[ASSESS-ID].pdf`

**Do not attach:** the Reviewer Workbook, the Post-Assessment Review, or any internal working documents.

---

## Step 5 — Post-Delivery Record-Keeping

Within 24 hours of delivery, complete the following:

**1. Complete the Post-Assessment Review** (`SI8-Post-Assessment-Review-Template-v0.1.md`)
- Fill in Review Header
- Log actual time per section
- Document difficult controls, missing evidence, and unexpected observations
- Complete Case Library Flag section
- Write the v0.2 Summary bullets
- File the completed Post-Assessment Review in `06_Operations/reviewer-workbook/post-assessment-reviews/` with filename: `PAR-[ASSESS-ID]-[YYYY-MM-DD].md`

**2. Archive the working documents** in the assessment folder:
```
06_Operations/assessments/[ASSESS-ID]/
  ├── SI8-Reviewer-Workbook-[ASSESS-ID].md     (completed workbook)
  ├── SI8-Assessment-Report-[ASSESS-ID].md     (MD source file)
  ├── SI8-Assessment-Report-[ASSESS-ID].pdf    (delivered PDF)
  └── PAR-[ASSESS-ID]-[YYYY-MM-DD].md          (Post-Assessment Review)
```

*(The `06_Operations/assessments/` folder structure will be created with Assessment 1.)*

**3. Update the CRM** (`03_Sales/CRM.md`) — update the lead's stage to "Closed Won" and add a note:
```
Assessment [ASSESS-ID] delivered [YYYY-MM-DD]. Outcome: [outcome]. Report on file.
```

**4. Update the Sales Pipeline** (`03_Sales/SALES-PIPELINE.md`) — move the lead to the "SI8 Certified Submitted / Closed Won" stage.

---

## Step 6 — 48-Hour Follow-Up (Optional but Recommended)

If no customer response within 48 hours of delivery, send a brief follow-up:

```
Subject: Re: SI8 Campaign Assurance Assessment — [Content Title]

Hi [First Name],

Just checking in to confirm you received the assessment report. Let me know if you have any questions on the findings or next steps.

JD
```

This is optional. Use judgment — some customers will have reviewed quietly and moved on; a follow-up is a light touch to open a conversation, not a pressure tactic.

---

## Known Gaps (as of v0.1)

| Gap | Priority | Status |
|-----|----------|--------|
| No Markdown PDF pipeline documented in detail | Medium | Manual export process for now; automate in v0.2 |
| `06_Operations/assessments/` folder structure not yet created | High | Create with Assessment 1 |
| `03_Sales/CRM.md` "Closed Won" stage not defined | Medium | Define when Assessment 1 is delivered |
| Post-Assessment Review folder not yet created | High | Create with Assessment 1 |

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 0.1 | 2026-07-05 | Initial version — pre-Assessment 1. All steps are design estimates. |

---

*SI8 Report Delivery SOP · PMF Strategy Inc. d/b/a SuperImmersive 8 · Internal use only*
