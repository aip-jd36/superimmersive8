# Edge Cases

One entry per resolved judgment call — specific enough that the next reviewer who hits something similar should be able to find it, whether or not it's general enough to be a formal Position yet.

**Discipline (revised 2026-08-01, after external review — see note at bottom):** an entry only belongs here if SI8 actually made a judgment call. A conversation or external opinion that merely *supports* an existing Position without requiring a ruling is evidence for that Position, not a new Edge Case — log it there instead. An unresolved external opinion that hasn't been checked against SI8's own methodology belongs in Pending Questions, not here, and must never carry "Resolved" or "precedent" language until it actually has been checked.

Schema and update triggers: `08_Platform/prds/PRD_LIVING_NOTEBOOK.md` § Edge Cases.

---

### EC-001 — Cloud World: detailed but uncorroborated authorship narrative scored too favorably

**Domain(s):** H
**Source type:** Direct evidence — SI8's own issued assessment
**Source:** ASSESS-005-2026-07-12 (Cloud World); reconciliation note at `06_Operations/assessments/ASSESS-005-2026-07-12/README.md`
**Date:** 2026-07-12 (assessment issued); 2026-07-20 (root-caused and corrected)
**Scenario:** Cloud World's submitter provided a detailed, internally consistent written account of how the piece was made. Under Reviewer Manual v0.1, a detailed written account alone was treated as sufficient for Domain H "Verified," and the outcome-decision logic didn't gate the top outcome/High confidence on Domain H specifically. Result: top outcome and High confidence issued on a self-attested account with no corroborating artifact.
**Resolution:** Traced to two gaps in v0.1 (evidence hierarchy too permissive; no Domain H gate on outcome). Reviewer Manual v0.2 fixed both. Cloud World's own issued assessment was **not** retroactively changed — it keeps `methodology_version` v0.1, consistent with [[POS-004]].
**Status:** Resolved — **Codified in Reviewer Manual v0.2** (Part 4/5, Domain H). This entry is an index and practical summary. The cited Manual or Specification controls if the wording differs.
**Related:** [[POS-001]], [[POS-004]]

---

## Editorial note (2026-08-01)

Two earlier entries — a logged conversation with Anchor Film about reconstructed prompts, and a panel Q&A about AI-written scripts and licensed likeness — were removed from this file after review. Neither involved SI8 making an actual ruling. The Anchor Film conversation is now filed as a supporting data point under [[POS-001]]'s source fact (it required no judgment call — Alice Feng reached the same conclusion independently, unprompted). The panel Q&A is now filed as open questions in `PENDING-QUESTIONS.md` ([[PQ-004]], [[PQ-005]]), since it's an external, unverified opinion that hasn't yet been checked against SI8's own Domain I/L guidance — it was previously and incorrectly marked "Resolved — treat as precedent," which overstated what had actually happened. Full original text of both remains in git history (see the commit that introduced this note) rather than being silently lost.
