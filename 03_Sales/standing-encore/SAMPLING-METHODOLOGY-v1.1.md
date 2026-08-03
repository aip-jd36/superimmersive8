# Standing Encore — Sampling Methodology v1.1

**Status:** **FROZEN** 2026-08-04 — approved for the live experiment. Further methodological changes are logged as v1.2 candidates (see bottom of this file) after Standing Encore completes, not applied mid-build. Governs how `AGENCY-INTELLIGENCE-DATABASE.md` gets converted into a final send list for Netherlands, Singapore, and UAE.

**Standing Encore principle (preserve verbatim):** Standing Encore is not testing whether HGE is "the" ICP. It is testing whether HGE is a useful operational proxy for organizations that experience higher rates of T4 institutional approval events. The proxy may change in future experiments. The underlying scientific question should not.
**Date:** 2026-08-04
**Supersedes:** the implicit v1.0 approach used for UK/Germany (agency-count parity, uncapped per-agency extraction)
**Scope:** sampling mechanics only. **Does not touch the T0–T5 taxonomy, the institutional-exposure hypothesis, message design, or the HGE/SCE proxy definitions** — those are unchanged. This document answers "how do we turn the agency database into a clean 500-person experiment," not "what are we testing."
**Evidence base:** two independent geographies, both showing HGE agencies yielding roughly 2.6×–3.1× more eligible people per agency than SCE agencies (UK: PYR 11.5 vs. 3.7; Germany: PYR 11.7 vs. 4.5 — full detail in `AGENCY-INTELLIGENCE-DATABASE.md`).

---

## 1. What is the cleanest sampling strategy, given the observed PYRs?

**Sample to a person-level target per arm, and let agency count float to whatever it takes to hit that target.** Concretely: pick the target N per arm (e.g., 250 HGE / 250 SCE for a 500-person experiment), then walk down each arm's agency list in Density order (High → Medium → Low), adding agencies and their estimated yield until the running total reaches the target. Stop adding agencies once the target is hit — don't keep going to some fixed agency count, and don't stop early just because an arbitrary agency count (like 13) was reached.

This is a direct consequence of the PYR data, not a new idea — it's the same principle already applied ad hoc to Germany (7 HGE agencies vs. 15 SCE agencies, sized to close the person gap rather than match agency counts). v1.1 formalizes it as the standing rule instead of a per-region judgment call.

## 2. Should balancing occur at the agency level or the person level?

**Person level**, for the reason above — but this needs an explicit caveat: person-level balancing fixes the *sample-size/statistical-power* problem (both arms end up with comparable N), it does **not** fully fix the *identification* problem of whether the effect being measured is really about institutional client exposure or just about agency size (see Confound 1 below). Balancing at the agency level would have been worse on both counts — it under-samples SCE and doesn't even solve the confound. Person-level balancing is the better of the two options, not a complete fix.

## 3. Should agencies contribute equal numbers of contacts?

No — but they should be **capped**, which is a different thing. Full detail in the next answer.

## 4. Should large agencies be capped?

**Yes. Cap per-agency extraction at roughly 8 contacts, even for agencies with High density and a technically much larger available pool (e.g., Adam & Eve\TBWA at ~700 staff).** Reasoning:

- **Firm-level clustering risk.** People at the same agency aren't independent observations — they share internal policy, client relationships, and culture. If AMV BBDO alone contributed 25 of the HGE arm's contacts, the "HGE effect" would really be measuring "AMV BBDO's internal culture" with extra steps. Capping forces breadth across distinct firms, which is what actually tests the institutional-exposure hypothesis rather than a handful of specific-company effects.
- **It also helps close the PYR gap indirectly.** A hard per-agency cap means the very-high-density HGE agencies stop over-contributing relative to their "true" availability, which — combined with the person-level target from Question 1 — naturally pulls in more distinct agencies on both sides rather than a small number of mega-agencies carrying the whole HGE arm.

A cap of ~8 is a starting point, not a law — if Netherlands' HGE pool turns out thin (fewer large agencies than UK/Germany), it's fine to raise it there specifically, but the default should be capped, not maximized.

## 5. Should SCE intentionally include more agencies than HGE?

**Yes, and this should be planned for at sourcing time, not discovered as a shortfall afterward** (which is what happened with UK). Use the observed PYR ratio (~2.6×–3× so far) as a starting planning ratio for how many SCE agencies to source relative to HGE, but treat that ratio as **region-specific and re-verified**, not a constant carried forward blindly — Netherlands, Singapore, and UAE may have different agency-size distributions (Singapore and UAE in particular are smaller, more concentrated ad markets than UK/Germany, and the ratio could look quite different there).

## 6. What agency-scale variable should be recorded to separate Institutional Approval Exposure from organizational complexity?

Add a new field: **Agency Scale**, recorded independently of RSE/IAE for every agency in both arms (not just HGE). Band it coarsely from whatever staff-count signal is available during sourcing (LinkedIn company page, "House of Communication serves 2,000 colleagues"-style self-description, or explicit "X employees" citations already surfacing naturally in this research):

- **S** — under ~50
- **M** — ~50–250
- **L** — ~250–1,000
- **XL** — 1,000+

This is exactly the variable needed to answer the question the whole database is at risk of quietly begging: is a high T4 rate at HGE agencies really about *client* institutional exposure, or just about *agency* organizational complexity (bigger agencies have more internal process regardless of who their clients are)? With Agency Scale recorded across both arms, the eventual analysis can check whether T4 frequency tracks RSE/IAE **controlling for** scale, or whether it just tracks scale directly. A small HGE agency (S/M scale, one real regulated client) showing real T4 signal would be strong evidence for the actual hypothesis; if T4 only shows up at XL agencies regardless of RSE/IAE score, that's evidence the real driver is organizational complexity, not client type — a different and still-useful finding, but a different one.

**Retroactive note:** UK and Germany entries already contain enough scale signal in their evidence text (staff counts were captured incidentally during sourcing — "2,000 colleagues," "1,300+ staff," "400 employees," "280 employees," etc.) to backfill this field without new research. Worth doing as a quick pass before analysis, not urgent before Netherlands starts.

## 7. What remaining confounds exist before launch?

Naming these plainly rather than letting them sit implicit:

1. **Agency size ↔ institutional client exposure is a real-world correlation, not just a sampling artifact.** Big agencies get big clients; that's not a bug in the sampling, it's how the industry works. Agency Scale (Question 6) lets this be examined statistically, but it can't be fully engineered away — the eventual finding may end up being "these two things are genuinely entangled in practice," which is itself a legitimate result, not a failure of the experiment.
2. **Firm-level clustering / non-independence of contacts within an agency**, partially mitigated by the per-agency cap (Question 4) but not eliminated. Worth remembering if this ever moves toward formal statistical analysis rather than descriptive comparison.
3. **Title-role variance.** "Creative Director" at a 700-person merged network entity and "Creative Director" at a 20-person boutique are not doing comparably-scoped jobs, even before considering HGE/SCE status — proximity to an actual legal/procurement conversation likely varies by role scope in ways title alone doesn't capture.
4. **Case-study recency.** Several of the evidence citations gathered are not current-year — client relationships evidenced by a 2016–2022 case study may no longer be active. This affects RSE/IAE accuracy at the margins, not the overall HGE/SCE split, but it's a real limitation on any single row's precision.
5. **Selection bias in the sourcing method itself.** Agencies that publish prominent case studies naming big clients may share a cultural trait (comfort with process, self-promotion of "serious" work) that correlates with survey-reply behavior independent of actual governance exposure — meaning some of the observed HGE/SCE gap could reflect "agencies that talk about big clients also reply to cold outreach more thoughtfully," not purely the institutional-exposure mechanism itself. No clean fix for this one; flagging it as an interpretive caution for whoever reads the eventual T4 results.
6. **"Fractional"/network-model agencies** (Coldridge Studios, ikon) may not have real employees in the traditional sense at all — the Density/PYR framework may not apply cleanly to them. Recommend excluding this category from person-yield estimates rather than forcing a Low-density guess, and flagging them explicitly rather than silently estimating.
7. **Cross-market PYR comparability is not guaranteed.** UK and Germany are similar enough (Western European, comparable agency-title conventions) that a converging PYR ratio is meaningful. Singapore and UAE are different markets with potentially different title structures and agency-size distributions — a similar PYR ratio there would be a stronger replication than a different one would be a refutation; don't assume the 2.6×–3× ratio is a universal constant before seeing non-European data.

---

## v1.2 candidate log (do not apply — record only, for after Standing Encore completes)

*Empty as of freeze. Add entries here if a genuinely new methodological issue surfaces during Netherlands/Singapore/UAE — do not edit the frozen sections above mid-build.*

## Net effect on Netherlands / Singapore / UAE build process

1. Source HGE agencies via named-network/case-study method (unchanged from UK/Germany), verifying inclusion (real creative/production agency) before evidence (client exposure) — unchanged discipline.
2. Record Agency Scale alongside RSE/IAE/Density for every agency, both arms.
3. Stop HGE sourcing once the *person* target for that arm is reached at an 8-contact-per-agency cap, not at a fixed agency count.
4. Size SCE sourcing using that region's own emerging PYR ratio once enough agencies are scored to estimate it, planning for materially more SCE agencies than HGE from the start rather than discovering the gap afterward.
5. Watch for near-miss agencies (the Lucky Generals / HY.AM pattern) — verify actual client rosters before accepting an agency's own positioning as a proxy for SCE status; this has now happened twice and should be treated as a standing risk, not a one-off catch.
