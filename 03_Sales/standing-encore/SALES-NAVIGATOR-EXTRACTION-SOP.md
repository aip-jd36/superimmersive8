# Standing Encore — Sales Navigator Extraction SOP

**Purpose:** Step-by-step procedure for turning `AGENCY-INTELLIGENCE-DATABASE.md` into the final ~500-person Standing Encore send list. This is JD's own workstream — none of it requires further agency research unless a specific row needs re-verification at extraction time.

**Status:** Active
**Owner:** JD
**Started:** 2026-08-04
**Inputs:** `AGENCY-INTELLIGENCE-DATABASE.md` (agency universe — 84 agencies, 33 HGE / 51 SCE, ~515 estimated eligible people), `AGENCY-INTELLIGENCE-METHODOLOGY.md` (classification rules), `SAMPLING-METHODOLOGY-v1.1.md` (frozen sampling mechanics this SOP implements)
**Related:** `SE-SIGNAL-TEST-HOWTO.md` (Standing Encore's own test mechanics — 500 sends, 4-message arms), `SIGNAL-TEST-LOG.md` (where SE-001 gets tracked once launched)

---

## 1. Target

**~500 people total, split as close to 250 HGE / 250 SCE as the data allows.** This is a person-level target, not an agency-count target — agency count floats to whatever it takes to hit the person target (Sampling Methodology v1.1, Q1).

---

## 2. Search method

- **Search by company name, not industry filter.** Sales Navigator's industry filter is confirmed unreliable for this use case (documented finserv search failure — see `03_Sales/ICP-DEFINITIONS.md`).
- Work from the agency list in `AGENCY-INTELLIGENCE-DATABASE.md` directly — one Sales Navigator company search per agency row.
- **Target titles:** Creative Director, Executive Producer, Head of Production, Senior Production Specialist (or the closest local equivalent). These are the roles with plausible proximity to a real T3/T4 institutional-approval conversation.

---

## 3. Order of operations

1. **Work each arm (HGE, then SCE) in Density order: High → Medium → Low.** Density is the pre-extraction yield estimate already recorded per agency in the database.
2. **Stop adding agencies once the person-level target for that arm is reached.** Don't work the full list just because it's there, and don't stop early at an arbitrary agency count.
3. **Cap extraction at ~8 contacts per agency**, even for High-density agencies with a much larger available pool (e.g. Adam & Eve\TBWA at ~700 staff). This exists to prevent one or two mega-agencies from carrying an entire arm — see Sampling Methodology v1.1 Q4 for the full reasoning (firm-level clustering risk). Raise the cap only if a region's HGE pool turns out genuinely thin.
4. **SCE will need more agencies than HGE to hit the same person target** — expect roughly 2.2×–3× as many SCE agencies as HGE agencies (observed range across all 5 regions). Plan for this at the start of a region's extraction, not as a shortfall discovered partway through.

---

## 4. Special-case flags — check before pulling

- **Network-inferred confidence rows** (flagged in the database) — the evidence comes from the parent network's global client roster, not a confirmed local-office account list. Spot-check the specific office's actual footprint before pulling contacts, since a network relationship doesn't guarantee that office holds the account.
- **"Fractional"/network-model agencies** (e.g. Coldridge Studios, ikon) — may not have real in-house employees in the traditional sense. Skip or treat as a likely zero-yield row rather than forcing a Low-density guess.
- **Borderline/watchlist rows** in the database (not forced into either arm) — only pull from these if a specific arm is short and needs the extra headroom; verify the client roster first per the standing rule below.
- **Standing rule — always applies:** an agency's own self-positioning ("independent," "boutique," "unconventional," "challenger") carries no information about client-institutional-exposure. This has been wrong 5 times across 4 countries (Lucky Generals, HY.AM STUDIOS, KesselsKramer, The Secret Little Agency, FEEL). The database has already corrected for this at the agency level — no action needed here — but if a name looks surprising during extraction, that's a reason to double-check its row in the database, not to skip it.

---

## 5. Fields to capture per contact

- Full name
- Title (as listed)
- Agency / company name
- Geo
- LinkedIn profile URL
- HGE or SCE (inherited from the agency's classification)
- Source agency's RSE / IAE scores (inherited, for later analysis)

---

## 6. Post-extraction steps (after all 5 regions are pulled)

1. **CRM dedupe** — cross-check the full extracted list against `03_Sales/CRM.md` and existing Dripify campaign history. Exclude anyone already contacted in a prior SI8 or Standing Encore campaign (per `SE-SIGNAL-TEST-HOWTO.md`'s own rule: no repeat contacts across tests).
2. **Employment verification** — confirm each contact still holds the title/company combination pulled (case-study evidence underlying some rows is not current-year — see Sampling Methodology v1.1, Confound 4).
3. **Randomization into the final send list** — once deduped and verified, randomize within each arm before assigning to message variants, so message-arm assignment isn't confounded with extraction order or agency order.
4. **Record final counts** — actual extracted/verified/final person counts per arm and per region should replace the estimated Density-based figures currently in `AGENCY-INTELLIGENCE-DATABASE.md`, so the database reflects real extraction yield going forward, not just the pre-extraction estimate.

---

## 7. What this SOP does not cover

Message design, arm definitions, and test launch mechanics live in `SE-SIGNAL-TEST-HOWTO.md`. This SOP stops at "final verified 500-person list, randomized and ready to hand to Standing Encore" — it does not cover drafting the message arms or launching the test itself.
