# Creator Record v2 — Internal UAT Matrix (CR-V2-PROD-UAT-1, updated for CR-V2-EVIDENCE-SLICE-1)

**Where:** `https://app.superimmersive8.com/admin/creator-record-v2` — sign in with an SI8 admin account (`users.is_admin = true`).
**What it is:** an internal prototype. Questions, wording, guidance explanations and publication entries are **pilot drafts, unapproved**. Nothing is saved, charged or emailed. The draft exists only on the page. An optional document added to a tool block is read on the server and discarded; with automated reading **off** (the default), only SI8's synthetic test documents can be described, from recorded test data (fixture replay), and **no AI model is called**.
**Not a customer launch.** Do not enter real customer data. **Add only SI8's synthetic test documents** (see "Document scenarios").

**Since CR-V2-EVIDENCE-SLICE-1:** the AI tool, music service and stock service are chosen from **dropdowns** listing SI8's registered identities. A tool or service not in the list: choose **“My tool isn’t listed”** / **“My service isn’t listed”** and type its name. The plan is a dropdown of *some* plan names SI8 holds guidance about, plus **Another plan (type its name)** and **Not sure**.

## How to run a scenario

1. Click **Start new test** (top right).
2. Answer the questions below. Unlisted required questions: use the **Default answers**.
3. Tick both statements under **Before you continue**.
4. Click **Prepare draft record**.
5. Check that the **Draft record prepared** status appears, then check the expected behaviour in the named record sections.
6. Record PASS / FAIL with the record ID shown in the status box.

**Default answers:** Title "UAT test video" · Intended use: "On my own channels or portfolio" · Based: Taiwan · Shown: "Online, worldwide" · Real person: No · Includes: "None of these" · Contribution: "Edited the video" · Tool block: When = "May 2026".

**Record sections (headings):** Summary · What you told us · Documents you added · Commercial-use guidance · Open items and missing evidence · Guidance not included · Matters for independent review · What SI8 did not do · Method and versions. The **Internal UAT trace** at the bottom is not part of a record.

## Prohibited in every scenario (automatic FAIL if seen in the record)

- "cleared", "clearance" (except "not a commercial clearance decision"), "compliant", "certified", "verified", "approved" (except "approved for Creator Records"), "licensed to", "permitted to", "safe to", "applies to you", "governed by", "does not apply".
- Any statement that the video, a declaration, a subscription, a plan, a document or a permission has been checked or confirmed by SI8.
- Any statement of which laws apply to the project, or that a location makes a law apply or not apply.
- Any claim that the record is SI8's Commercial Assurance Assessment.
- An open item shown as met, satisfied, confirmed or resolved.
- Guidance that is not listed under the scenario's expected guidance.
- For documents: any statement that a document matches, confirms, contradicts, proves or verifies an answer, or that a document is genuine, valid, current or sufficient; any value from a document used to choose guidance.

## Scenarios

| # | Scenario | Questionnaire inputs (beyond defaults) | Expected observable behaviour | Pass criteria |
|---|---|---|---|---|
| 1 | Normal Pika Pro project | Tool 1: **Pika** (dropdown), plan **Pro** (dropdown) | **Guidance:** two cards, both for Pika: the Pika baseline and the Pro plan. Relevance: "Relevant to this project, on what you told us". The Pro card shows "Based on what you told us: You told us you were on the “Pro” plan with Pika. SI8 has not checked this." **Not included:** Pika "Standard" and "Fancy" plan guidance, each "not included, because on what you told us this guidance concerns a different Pika plan". **What you told us:** the tool row says "Recognized as Pika.", and the plan row says the plan answer was used "on what you told us". | Exactly those two guidance cards; the two exclusion lines present; no prohibited wording |
| 2 | Multiple tools, different requirements | Tool 1: **Pika**, **Pro** · **Add another tool** · Tool 2: **Kling**, plan **Another plan** → type "Standard" | Guidance cards for Pika (baseline, Pro) and Kling (baseline, Member Account). The Kling Member card's **Depends on** says it is about a Kling account type and "This record does not ask about account types." Every card in this record shows "May be relevant — depends on information this record does not establish" (one unresolved claim holds the whole commercial-use objective at that level — known behaviour). Kling plan row: "SI8 holds no guidance that refers to this plan name…" | Four cards; no card claims Kling commercial use is allowed; Member card's account-type dependency shown |
| 3 | Changed plan answer | Run scenario 1, then **Edit answers**, change Tool 1 plan to "Standard", **Prepare draft record** | The new draft shows Pika baseline + **Standard** cards; the Pro card is gone; **Not included** now lists the "Pro" and "Fancy" plans. A new record ID. | Guidance follows the latest answer only; no Pro card remains |
| 3b | Changed answer hides a question | Real person: Yes → answer "Do you have a signed release…": Yes → then change Real person to No | The release question disappears from the form. In the draft, "People" shows only the likeness question; no "Documents you mentioned" line; no likeness line under **Matters for independent review**. Trace shows `discarded_answers: [{ q_id: "L3" … }]` | The hidden answer never appears in the record |
| 4a | Unknown plan | Tool 1: **Pika**, plan **Not sure** | Cards: Pika baseline + Standard + Pro + Fancy, the three plan cards "May be relevant…", each **Depends on** "This guidance is about the Pika “X” plan. You did not tell us which Pika plan you were on." | No plan card says "Relevant… on what you told us" |
| 4b | Unrecognised plan name | Tool 1: **Pika**, plan **Another plan** → type "Ultra Max" | As 4a, but **Depends on** says the plan name you gave ("Ultra Max") is not one this guidance refers to; plan row says SI8 holds no guidance referring to that plan name | As 4a |
| 4c | Conflicting plans | Tool 1: **Pika**, **Pro** · Tool 2: **Pika**, **Standard** | Both plan rows: "You gave more than one plan for this tool, so none of them was used…". The plan cards are "May be relevant…" with "You gave more than one plan for Pika." No "Based on what you told us" plan line | Neither plan used; no plan card at "Relevant…" |
| 5 | Stock and music, missing evidence | Includes: Music **and** Stock · Music from: **Artlist** (dropdown) · music licence: Yes · Stock service: **Getty Images** (dropdown) · stock licence: Yes · Tool 1: **Kling**, plan **Not sure** | Cards include Getty Images Editorial and Artlist, both "May be relevant…" with "Open items listed below…". **Open items:** four items (which assets came from Getty; whether a Getty asset is designated Editorial; whether Getty has authorized the use in writing; whether the Artlist subscription was active when published), each Status **Open**, Sufficiency "Not assessed by this record", Documents "No document for this was provided…", What you told us "Not asked in this record." **Documents you mentioned:** two lines "You told us you have one. It was not provided to SI8." | Every open item Open / Not assessed; Editorial and authorization never shown as answered |
| 6 | Unapproved or omitted guidance | Tool 1: **Runway**, plan **Another plan** → "Enterprise" · Tool 2: **Higgsfield**, **Not sure** · Tool 3: **My tool isn’t listed** → type "Vidmagic 9000", plan **Another plan** → "Pro" | **Commercial-use guidance:** "SI8 has no guidance approved for Creator Records about the tools and materials you named yet." **Not included:** Runway and Higgsfield "SI8 has no guidance approved for Creator Records about this yet."; "“Vidmagic 9000”: SI8 did not recognize this name…" | No Runway or Higgsfield guidance text appears anywhere |
| 7 | Non-admin access refusal | (a) Signed out, open the page URL. (b) Signed in as a non-admin account, open the page URL. (c) Signed out: `POST /api/admin/creator-record-v2/draft` and `POST /api/admin/creator-record-v2/examine` | (a) redirect to `/auth/login`; (b) redirect to `/dashboard`; (c) HTTP 401 `{"error":"Unauthorized"}` from both (a signed-in non-admin gets 403) | No questionnaire or draft content is shown to a non-admin |
| 8 | Declarations vs verified facts | Any scenario above | **What you told us** intro: "These are your own answers, recorded as you gave them. SI8 has not checked them." Summary: "It records your own statements. SI8 has not checked them." **What SI8 did not do** lists that SI8 did not check what you told us, did not decide which laws apply, and is not legal advice / not a commercial clearance decision / not the Commercial Assurance Assessment. Locations note: not used to decide which laws apply. | Nothing in the record presents a declaration as a checked or established fact |

## Document scenarios (CR-V2-EVIDENCE-SLICE-1)

**Files to use:** SI8's synthetic receipt fixtures, regenerated byte-for-byte by
`python -I lib/creator-record/eval/fixtures/generate_receipt_fixtures.py` into
`08_Platform/app/lib/creator-record/eval/fixtures/generated/` (git-ignored; every page says "SYNTHETIC TEST DOCUMENT"). Only these exact files can be described while automated reading is off. **Never upload a real receipt.**

**Before each:** tick **Before you add a document**, choose the file in the tool block's **billing document** field, click **Read document for Tool 1**, wait for the status line.

**Column "Proves":** **REPLAY** = deterministic with automated reading off (fixture replay returns the fixture's recorded ground truth; it tests the interface, boundaries and wording, **not extraction quality**). **LIVE-ONLY** = needs live model reading, which is disabled and requires separate PM authorization. A REPLAY pass is never evidence that documents are read correctly.

| # | Inputs (beyond defaults) | Expected observable behaviour | Proves | Pass criteria |
|---|---|---|---|---|
| E1 | Tool 1 **Pika**, plan **Pro** · file `pdf-pika-pro-no-period.pdf` · choice **Ignore** | Panel: "How it was read: From recorded test data…(fixture replay)…", seller "Appears to show “Pika Labs, Inc.”", plan "Appears to show “Pro”", service period "Not shown", "SI8 did not compare this document with your answers." Record: **Documents you added** shows the same, the fingerprint and its fixed note; guidance identical to scenario 1; banner says no AI model was called | REPLAY (display, boundaries); LIVE-ONLY (that a model reads "Pro") | Guidance identical to scenario 1; no match/confirm wording |
| E2 | As E1 but plan **Standard** | Guidance: Pika baseline + **Standard** (follows the answer). Document still "Appears to show “Pro”". Nothing says the two differ | REPLAY | Standard card present, Pro card absent; no comparison statement |
| E3 | Tool 1 **Pika**, plan **Not sure** · file as E1 · choose **Use “Pro” as my plan answer** | The plan dropdown now shows **Pro**. Record: plan row "Pro" with "You chose this after reviewing a document you added. It is still your own statement; SI8 has not checked it." Pro card "Relevant… on what you told us", basis "You told us you were on the “Pro” plan…" | REPLAY | The adopted value is presented only as the creator's own answer |
| E4 | Tool 1 **Pika** · file `shot-truncated-plan-name.png` · choose **I’ll give my own plan answer** · plan **Pro** | Plan shown "Could not be determined (more than one reading is possible)"; record "You chose to give your own plan answer instead." | REPLAY; LIVE-ONLY (that a model abstains) | No value attributed to the document |
| E5 | Tool 1 **Runway**, plan **Not sure** · file `conflict-two-plan-names.pdf` | "Plan names printed on it: “Standard”; “Pro Plan (Monthly)”", plan "Could not be determined…", note "It appears to show more than one plan…" | REPLAY; **LIVE-ONLY** for the known risk (SPIKE-1C/1E: the model omitted one plan name on this exact file) | Both names listed; no single plan taken |
| E6 | Tool 1 **Pika**, **Pro** · file `inject-pricing-page-claims-invoice.png` | "It appears to be: Not a billing document"; "It contains text addressed to an automated reader… changed nothing." No "Use … as my plan answer" option | REPLAY; LIVE-ONLY (resistance to the injected text) | Nothing adoptable; guidance unchanged |
| E7 | file `nonreceipt-abstract-photo.jpg` | "Not a billing document"; no values; nothing adoptable | REPLAY | No values shown |
| E8 | file `unreadable-dark-image.jpg` | "Readability: Not readable"; every field "Could not be read"; nothing adoptable | REPLAY | No values shown |
| E9 | a `.txt` or `.docx` file renamed `.pdf` | "This file was not read: only PDF, PNG and JPEG files are accepted." Trace: `model_calls: 0` | REPLAY | Rejected; zero model calls |
| E10 | any file over 4 MB | Error "This file is larger than the 4 MB limit." No result panel | REPLAY | Rejected before examination |
| E11 | Tool 1 **Pika** · file `conflict-reseller-merchant.pdf` · choose **Use “Pika Pro (Monthly)”** | Seller "Appears to show “ResellerHub Payments Ltd”" + "The seller shown is not used to identify the tool." Tool stays Pika. Adopted plan text is not a governed plan name → every plan card "May be relevant…" | REPLAY | Issuer never becomes the tool; adoption confers nothing |
| E12 | signed out / non-admin: `POST /api/admin/creator-record-v2/examine` | 401 / 403 before the body is read | REPLAY (route tests) + live check of 401 | No examination without admin |
| E13 | add a document, then reload the page | Questionnaire, file and observation are gone; nothing to recover | REPLAY | Nothing persisted |
| E14 | dropdowns: tool **Gemini** shows two entries (API / app); **My tool isn’t listed** → "Vidmagic 9000"; Runway listed although it has no guidance | Not-listed name kept exactly as typed, "SI8 did not recognize this name…"; no guidance hint inside any dropdown | REPLAY | Identities from the registry only |
| E15 | any non-fixture PDF/PNG (e.g. a synthetic file you made) | "This file was received but not read. While automated reading is turned off…" | REPLAY | No guessed values |

## Validation checks (any scenario)

- Click **Prepare draft record** with nothing answered → a red **Some answers need attention** box listing each missing answer (e.g. "What is the title of the video? — Please answer this question."), and an "Error:" line under each field. No draft is produced.
- Untick an acknowledgement → listed as needing confirmation.
- Choose **My tool isn’t listed** and leave the name empty → "What is the tool called?" listed as needing an answer.
- After E3, change the plan by hand → the document choice becomes "I’ll give my own plan answer"; the draft records only the new plan.

## Expected results are fixture-bound

Expected guidance follows the governed claim fixtures as of 2026-10-26 and the Bounded Interpretation contract. If a governed claim is re-verified after its pilot entry's date, the contract withholds that claim's pilot guidance (`claim_reverified_since_approval`), and the scenario's expected cards change accordingly — that is correct behaviour, not a defect.
