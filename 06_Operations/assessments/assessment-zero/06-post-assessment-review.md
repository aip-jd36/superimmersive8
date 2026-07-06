# SI8 Post-Assessment Review — Assessment Zero
**Version:** 0.1
**Assessment ID:** ASSESS-ZERO-2026-07-06
**Assessment number:** #0 (system test — not counted in production sequence)
**Reviewer:** JD Chang
**Assessment date:** 6 July 2026
**Report delivered:** 6 July 2026
**Assessment outcome:** Evidence Supports Intended Commercial Use with Conditions
**Workbook version used:** 0.1

*Note: Assessment Zero is a simulated system test, not a real customer submission. Time log entries are design estimates — not measured from a real review. All other sections reflect genuine observations from executing the full system end-to-end for the first time.*

---

## Time Log

```
Section 1 — Intake & Scope:        10 min   (target: 10 min) — matched
Section 2 — Evidence Checklist:    30 min   (target: 25 min) — over by 5 min
Section 3 — Evidence Gap Log:       8 min   (target: 10 min) — under
Section 4 — Findings Log:          20 min   (target: 20 min) — matched
Section 5 — Overall Assessment:     7 min   (target: 10 min) — under (well-documented submission made synthesis fast)
Section 6 — Report Brief:          10 min   (target: 10 min) — matched
Report finalization / formatting:  30 min   (estimate for populating Report v0.2 from Brief)
Total time:                       115 min   (target: 90 min)

Variance from target:              +25 min
Primary cause of variance:         Report finalization took longer than estimated (30 min vs. no target).
                                   Evidence Checklist also ran 5 min over — reading ToS for two tools
                                   (Runway, ElevenLabs) during the assessment is time-consuming.
                                   Implication: 90-minute target should be understood as review + workbook
                                   only. Report finalization is a separate time block (~30 min).
                                   Combined realistic target: ~2 hours for a well-documented submission.
```

---

## Controls That Were Difficult

```
Control T02 — Generation documentation (prompt history):
  What was difficult: Deciding between Low and Medium commercial impact for
  the missing prompt history export. The Manual (Part 4, Domain T) says
  "generation logs not preserved — common and acceptable if the workflow
  description is sufficiently specific." The workflow description and prompt
  summary together are detailed enough that the gap would be Low impact in
  most contexts. But the finserv brand context (legal review gate confirmed
  from T1 signal) elevates it to Medium. The Manual's guidance covers the
  baseline case well; it doesn't yet address how commercial context modifies
  the impact assessment.
  
  Conclusion reached: Medium. The Manual implicitly supports this through
  the "commercial framing" philosophy (Part 1, §5: "the reviewer's frame
  is always: given this evidence, what can a commercial party reasonably
  rely upon when deploying this content?"). The finserv context made this
  clear — but a reviewer without explicit guidance to weigh deployment
  context in Domain T might default to Low.
  
  Recommended fix: Add a note to Domain T in the Manual: "Impact
  calibration should reflect the intended deployment context, not just
  the evidence absence in isolation. A missing prompt history export for
  a regulated-sector brand with a confirmed legal review gate is Medium
  impact. The same gap for a social media creator deploying to a general
  consumer audience is Low."

Control R01 — Runway date alignment (May receipt, June production):
  What was difficult: The May receipt covers the May billing cycle;
  the June generation sessions would fall under a June renewal not
  documented in the provided receipt. A strict reading of the control
  would produce "Partially Verified" (renewal not confirmed). A pragmatic
  reading: no adverse information, submitter confirms active subscription,
  and the May receipt is the most recent available. Chose Verified with
  a workbook note.
  
  Observation: The Manual's Domain R guidance doesn't address the
  recurring-subscription date gap problem explicitly. Monthly subscriptions
  mean the receipt available is always for the previous billing cycle.
  A clear rule is needed: what's the minimum to confirm renewal?
  Possible rule: "For recurring monthly subscriptions, the prior billing
  period receipt + no adverse information (cancellation, downgrade) is
  sufficient to treat as Verified. If the generation date is more than
  45 days after the receipt date without renewal confirmation, treat as
  Partially Verified."
```

---

## Evidence Consistently Missing

```
Control T02 — Runway prompt history export:
  What was missing:      Platform-level prompt export (Runway generation history)
  Addressable?           Yes — submitter indicated they would check if retrospective
                         export is possible; attestation document is a viable alternative
  Recommended fix:       Add to Customer Submission Checklist: "For Runway users —
                         export your generation history immediately after completing
                         your sessions. Instructions: Runway dashboard → History →
                         Export. Do not close sessions before exporting."

Control R01/R02 — Receipts for ancillary tools (ChatGPT Plus, Adobe CC):
  What was missing:      Receipts for tools used in supporting roles (script, editing)
  Addressable?           Yes — submitter has these subscriptions
  Notes:                 Not a material gap for ancillary tools with well-documented
                         public ToS. However, the checklist currently doesn't
                         distinguish "Important" vs. "Conditional" for ancillary tools.
                         Recommend updating: Runway and ElevenLabs receipts = Important;
                         ancillary tool receipts (GPT Plus, Adobe) = Conditional.
```

---

## Evidence Unexpectedly Present

```
The prompt iteration table in the workflow description (showing 12 sessions,
6 selected, with stated rationale for each rejection) is a higher level of
documentation than the Evidence Preparation Guide currently prompts for.
The Guide asks for "workflow description" — it doesn't specifically ask for
a session-by-session iteration log.

This is excellent evidence for Domain H (human creative direction). Consider
adding to the Evidence Preparation Guide: "If you ran multiple generation
attempts and selected specific clips, a brief table showing what you
attempted, what you selected, and why is especially helpful for
demonstrating creative direction."
```

---

## Customer Questions or Points of Confusion

```
Simulated observation (not from a real customer interaction):

The submitter's note in CertForm Section 5 ("I didn't export the prompt
history before ending the session. I've provided a prompt summary instead.")
shows that the Evidence Preparation Guide successfully communicated what
was expected — the submitter knew what was missing and explained it proactively.
This is the intended behaviour.

However: the Guide doesn't currently explain HOW to export Runway generation
history (the specific UI steps). If a submitter wants to comply, they need
to figure out the export process themselves. Adding a platform-specific
export instruction (Runway, ElevenLabs, Kling) to the Guide would prevent
this gap entirely for future submissions.

Recommended addition to Evidence Preparation Guide:
"For Runway users: after completing your generation sessions, go to your
Runway dashboard → History tab → select your sessions → Export. Complete
this step before ending your browser session, as export may not be available
for older sessions."
```

---

## Workbook Improvements

```
Priority: High
Change: Domain T, control T02 — add inline guidance on impact calibration
        by deployment context:
        "Impact calibration should reflect the intended deployment context.
        A missing prompt history export for a regulated-sector client with
        a confirmed legal review gate = Medium. The same gap for a general
        consumer social campaign = Low."

Priority: High
Change: Domain R, recurring subscription rule — add explicit guidance:
        "For recurring monthly subscriptions where only the prior billing
        period receipt is available: prior period receipt + no adverse
        information = Verified with note. If generation date is more than
        45 days after the receipt date, treat as Partially Verified unless
        submitter can confirm renewal (account screenshot, bank statement)."

Priority: Medium
Change: Evidence Checklist — add a "role classification" column to distinguish
        primary generation tools (Runway, ElevenLabs) from supporting tools
        (GPT Plus, Adobe). Receipt evidence requirements differ by role.
        Primary tools = Important. Supporting tools = Conditional.
```

---

## Methodology Improvements

```
No methodology-level changes identified in Assessment Zero. The 7-domain
framework was sufficient to cover all evidence types in this submission.
No evidence appeared that would suggest a missing domain or a control
outside the current scope.

Note for tracking: training data liability appeared as a structural residual
risk in Domain I. It is currently handled correctly (documented as residual
risk, not a finding). No change needed. But this should be monitored across
future assessments — if training data litigation develops in a way that
makes this a more acute commercial risk (not just a background residual),
the methodology may need a dedicated handling protocol.
```

---

## New Risk Patterns Observed

```
ASA monitoring (UK AI advertising guidance): This appeared as a residual
risk in the Residual Commercial Risks section. It's not currently a finding
or a condition — it's a "monitor for updates" item. But for any UK commercial
deployment by a regulated-sector brand, this may become more acute as ASA
guidance develops. The current treatment (Residual Commercial Risk, monitor)
is correct. Flag for review if ASA publishes specific AI-content guidance
before Assessment 5.

ElevenLabs voice model provenance: The "Rachel" model was confirmed as a
professionally licensed model by ElevenLabs, not a cloned voice. Domain L
handled this correctly. But the underlying question — how do we verify this
for any ElevenLabs model? — is not yet addressed in the Manual. The current
approach relies on ElevenLabs' own documentation. This is appropriate for
now but may need a more structured verification process as voice synthesis
becomes more common in submissions.
```

---

## Case Library Flag

```
Add to Case Library?   Yes

What is the novel pattern, edge case, or precedent?
  Domain T — Partially Verified with Medium commercial impact driven by
  deployment context, not evidence quality alone.
  
  The evidence (workflow description + prompt summary) was actually quite
  good. The gap (missing prompt history export) is a Low-impact gap in most
  contexts. What elevated it to Medium was the specific deployment context:
  financial services brand with a confirmed legal review gate (T1 signal
  from original outreach). This is the first case where the Manual's guidance
  on "commercial framing over evidence counting" was applied directly to an
  impact calibration decision, and where the reviewer had to exercise judgment
  to elevate a baseline Low gap to Medium based on context.
  
  This is exactly the kind of judgment that:
  (a) a new reviewer might get wrong (defaulting to Low without considering context)
  (b) the Manual should address more explicitly
  (c) demonstrates what "commercial framing, not legal conclusions" means in practice

Suggested Case Library title:
  "Domain T — Missing prompt history export in regulated-sector deployment context:
   Low evidence gap elevated to Medium commercial impact by brand legal review gate"
```

---

## Reviewer Notes

```
Overall assessment of Assessment Zero:

The system works. Every artifact in the dossier was produced using existing
templates without inventing process midstream. The Reviewer Manual guided
the two judgment calls correctly — both the T02 impact calibration and
the R01 date alignment question. The Report v0.2 structure worked well;
the Section 1 Dashboard is genuinely useful for a non-technical reader.

What the simulation couldn't test:
- Actual review timing (90-minute target needs real assessment data)
- PDF export quality (needs to be tested with a real tool before Assessment 1)
- Customer reactions to the report language (whether they find it clear or confusing)
- Whether the Condition was actionable from the customer's perspective
  (Sarah Chen would need to try the Runway retrospective export to know)

What should happen before Assessment 1:
1. Test PDF export from the Report MD file using the planned tool
2. Create the 06_Operations/assessments/ folder structure (per the Report Delivery SOP)
3. Create the post-assessment-reviews/ subfolder
4. Apply the Manual improvement recommendations from this PAR to Workbook v0.1 inline notes
   (not a full version update — just clarifying notes in the relevant control descriptions)
5. Update the Evidence Preparation Guide with Runway export instructions
```

---

## Summary: What Should Change in v0.2?

```
1. Reviewer Workbook — Domain T, T02: Add impact calibration guidance by
   deployment context (regulated-sector brand with legal review = Medium
   even for well-documented gaps).

2. Reviewer Workbook — Domain R, R01: Add recurring subscription rule
   (prior period receipt + no adverse info = Verified with note; >45 days
   gap = Partially Verified unless renewal confirmed).

3. Evidence Preparation Guide: Add platform-specific export instructions
   (Runway, ElevenLabs) and expand Domain H guidance to invite session-by-
   session iteration logs for submissions with multiple generation attempts.
```

---

*SI8 Post-Assessment Review — Internal Use Only*
*Assessment Zero (system test) · JD Chang · 6 July 2026*
