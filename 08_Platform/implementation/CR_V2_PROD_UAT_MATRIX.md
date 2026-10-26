# Creator Record v2 — Internal UAT Matrix (CR-V2-PROD-UAT-1)

**Where:** `https://app.superimmersive8.com/admin/creator-record-v2` — sign in with an SI8 admin account (`users.is_admin = true`).
**What it is:** an internal prototype. Questions, wording, guidance explanations and publication entries are **pilot drafts, unapproved**. Nothing is saved, uploaded, charged, emailed or sent to an AI model. The draft exists only on the page.
**Not a customer launch.** Do not enter real customer data.

## How to run a scenario

1. Click **Start new test** (top right).
2. Answer the questions below. Unlisted required questions: use the **Default answers**.
3. Tick both statements under **Before you continue**.
4. Click **Prepare draft record**.
5. Check that the **Draft record prepared** status appears, then check the expected behaviour in the named record sections.
6. Record PASS / FAIL with the record ID shown in the status box.

**Default answers:** Title "UAT test video" · Intended use: "On my own channels or portfolio" · Based: Taiwan · Shown: "Online, worldwide" · Real person: No · Includes: "None of these" · Contribution: "Edited the video" · Tool block: When = "May 2026".

**Record sections (headings):** Summary · What you told us · Commercial-use guidance · Open items and missing evidence · Guidance not included · Matters for independent review · What SI8 did not do · Method and versions. The **Internal UAT trace** at the bottom is not part of a record.

## Prohibited in every scenario (automatic FAIL if seen in the record)

- "cleared", "clearance" (except "not a commercial clearance decision"), "compliant", "certified", "verified", "approved" (except "approved for Creator Records"), "licensed to", "permitted to", "safe to", "applies to you", "governed by", "does not apply".
- Any statement that the video, a declaration, a subscription, a plan, a document or a permission has been checked or confirmed by SI8.
- Any statement of which laws apply to the project, or that a location makes a law apply or not apply.
- Any claim that the record is SI8's Commercial Assurance Assessment.
- An open item shown as met, satisfied, confirmed or resolved.
- Guidance that is not listed under the scenario's expected guidance.

## Scenarios

| # | Scenario | Questionnaire inputs (beyond defaults) | Expected observable behaviour | Pass criteria |
|---|---|---|---|---|
| 1 | Normal Pika Pro project | Tool 1: "Pika", plan "Pro" | **Guidance:** two cards, both for Pika: the Pika baseline and the Pro plan. Relevance: "Relevant to this project, on what you told us". The Pro card shows "Based on what you told us: You told us you were on the “Pro” plan with Pika. SI8 has not checked this." **Not included:** Pika "Standard" and "Fancy" plan guidance, each "not included, because on what you told us this guidance concerns a different Pika plan". **What you told us:** the tool row says "Recognized as Pika.", and the plan row says the plan answer was used "on what you told us". | Exactly those two guidance cards; the two exclusion lines present; no prohibited wording |
| 2 | Multiple tools, different requirements | Tool 1: "Pika", "Pro" · **Add another tool** · Tool 2: "Kling", "Standard" | Guidance cards for Pika (baseline, Pro) and Kling (baseline, Member Account). The Kling Member card's **Depends on** says it is about a Kling account type and "This record does not ask about account types." Every card in this record shows "May be relevant — depends on information this record does not establish" (one unresolved claim holds the whole commercial-use objective at that level — known behaviour). Kling plan row: "SI8 holds no guidance that refers to this plan name…" | Four cards; no card claims Kling commercial use is allowed; Member card's account-type dependency shown |
| 3 | Changed plan answer | Run scenario 1, then **Edit answers**, change Tool 1 plan to "Standard", **Prepare draft record** | The new draft shows Pika baseline + **Standard** cards; the Pro card is gone; **Not included** now lists the "Pro" and "Fancy" plans. A new record ID. | Guidance follows the latest answer only; no Pro card remains |
| 3b | Changed answer hides a question | Real person: Yes → answer "Do you have a signed release…": Yes → then change Real person to No | The release question disappears from the form. In the draft, "People" shows only the likeness question; no "Documents you mentioned" line; no likeness line under **Matters for independent review**. Trace shows `discarded_answers: [{ q_id: "L3" … }]` | The hidden answer never appears in the record |
| 4a | Unknown plan | Tool 1: "Pika", tick **Not sure** for the plan | Cards: Pika baseline + Standard + Pro + Fancy, the three plan cards "May be relevant…", each **Depends on** "This guidance is about the Pika “X” plan. You did not tell us which Pika plan you were on." | No plan card says "Relevant… on what you told us" |
| 4b | Unrecognised plan name | Tool 1: "Pika", plan "Ultra Max" | As 4a, but **Depends on** says the plan name you gave ("Ultra Max") is not one this guidance refers to; plan row says SI8 holds no guidance referring to that plan name | As 4a |
| 4c | Conflicting plans | Tool 1: "Pika", "Pro" · Tool 2: "Pika", "Standard" | Both plan rows: "You gave more than one plan for this tool, so none of them was used…". The plan cards are "May be relevant…" with "You gave more than one plan for Pika." No "Based on what you told us" plan line | Neither plan used; no plan card at "Relevant…" |
| 5 | Stock and music, missing evidence | Includes: Music **and** Stock · Music from: "Artlist" · music licence: Yes · Stock service: "Getty Images" · stock licence: Yes · Tool 1: "Kling", plan Not sure | Cards include Getty Images Editorial and Artlist, both "May be relevant…" with "Open items listed below…". **Open items:** four items (which assets came from Getty; whether a Getty asset is designated Editorial; whether Getty has authorized the use in writing; whether the Artlist subscription was active when published), each Status **Open**, Sufficiency "Not assessed by this record", Documents "No document provided…", What you told us "Not asked in this record." **Documents you mentioned:** two lines "You told us you have one. It was not provided to SI8." | Every open item Open / Not assessed; Editorial and authorization never shown as answered |
| 6 | Unapproved or omitted guidance | Tool 1: "Runway", plan "Enterprise" · Tool 2: "Higgsfield", Not sure · Tool 3: "Vidmagic 9000", "Pro" | **Commercial-use guidance:** "SI8 has no guidance approved for Creator Records about the tools and materials you named yet." **Not included:** Runway and Higgsfield "SI8 has no guidance approved for Creator Records about this yet."; "“Vidmagic 9000”: SI8 did not recognize this name…" | No Runway or Higgsfield guidance text appears anywhere |
| 7 | Non-admin access refusal | (a) Signed out, open the page URL. (b) Signed in as a non-admin account, open the page URL. (c) Signed out: `POST /api/admin/creator-record-v2/draft` | (a) redirect to `/auth/login`; (b) redirect to `/dashboard`; (c) HTTP 401 `{"error":"Unauthorized"}` (a signed-in non-admin gets 403) | No questionnaire or draft content is shown to a non-admin |
| 8 | Declarations vs verified facts | Any scenario above | **What you told us** intro: "These are your own answers, recorded as you gave them. SI8 has not checked them." Summary: "It records your own statements. SI8 has not checked them." **What SI8 did not do** lists that SI8 did not check what you told us, did not decide which laws apply, and is not legal advice / not a commercial clearance decision / not the Commercial Assurance Assessment. Locations note: not used to decide which laws apply. | Nothing in the record presents a declaration as a checked or established fact |

## Validation checks (any scenario)

- Click **Prepare draft record** with nothing answered → a red **Some answers need attention** box listing each missing answer (e.g. "What is the title of the video? — Please answer this question."), and an "Error:" line under each field. No draft is produced.
- Untick an acknowledgement → listed as needing confirmation.

## Expected results are fixture-bound

Expected guidance follows the governed claim fixtures as of 2026-10-26 and the Bounded Interpretation contract. If a governed claim is re-verified after its pilot entry's date, the contract withholds that claim's pilot guidance (`claim_reverified_since_approval`), and the scenario's expected cards change accordingly — that is correct behaviour, not a defect.
