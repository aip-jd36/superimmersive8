# CR-DESIGN-2A — Wording and presentation reconciliation

**Status: PROPOSED — NOT APPROVED.** Decision-ready mapping of every design slot in the Round 2 package to the approved v4 (schema 7) and v5 (schema 8) template sets. The approved sets remain authoritative until a founder-approved release.

Sources compared: Round 2 mockups (`round-2/SI8-CreatorRecord-Round2-Export.zip`: Complete Reference, Variants and Stress Tests, page PDFs); approved strings in `08_Platform/app/lib/creator-record/governed/proposals/CR-PDF-TEMPLATES-v4-schema7.proposal.json`, `…v5-schema8.proposal.json` and `governed/sources.ts` (ledger caveats). Template keys below are paths in those files (`t.` = template root, `R.` = `t.readiness_summary.render`, `S.` = `t.sections`, `E.` = `t.examination`, `L.` = `t.live_examination`).

## Classes

- **A** — existing approved v4/v5 wording, carried verbatim.
- **B** — existing governed data, projected without changing its meaning.
- **C** — proposed navigational or presentation wording (new string, no proposition).
- **D** — proposed Customer Explanatory Text (new or revised string carrying meaning); needs LK governance review.
- **E** — rejected content or behaviour.

## Approval authorities

- **Founder:** approves the v6/v7 sets as a whole (every string in them), the presentation contract, and chrome/prominence.
- **LK-G:** LK governance (PM role) classification of any non-proposition Customer Explanatory Text (as R1–W1 were).
- **PM/A:** PM/Architecture, for projection and placement rules.
- "Carried" means the string is unchanged and is approved again only as part of the founder's approval of the whole set.

Schema: **7** = v4 lineage, **8** = v5 lineage, **7/8** = both, with each set's own wording.

## Summary of the default

Every slot defaults to its approved string. The recommended launch scope needs **no D-class text** and **at most four optional C-class labels** (C-1 to C-4). All substantive wording stays as approved.

---

## 1. Chrome (every page)

| ID | Design slot (Round 2) | Existing approved wording | Proposed | Placement / purpose | Sch. | Class | Data | Disposition | Authority |
|---|---|---|---|---|---|---|---|---|---|
| CH-1 | Running header "SI8 CREATOR RECORD" + record no. | `t.footer` v4/v5: "SI8 Creator Record {record_id} · Self-declared · Not legal advice · Not a clearance" | Use `t.footer` **verbatim** as the running header (record ID filled). No separate "SI8 CREATOR RECORD" text | Masthead, every page | 7/8 | A | record ID | **Adopt** (no new text) | Founder (placement) |
| CH-2 | Footer disclaimer "SELF-DECLARED RECORD · DOCUMENT READINGS ARE AUTOMATED, NOT CHECKED BY A PERSON · EDUCATIONAL GUIDANCE · NOT LEGAL ADVICE · NOT A CLEARANCE" | `t.stamp` v5: "SELF-DECLARED RECORD · **ANY** DOCUMENT READINGS ARE AUTOMATED, NOT CHECKED BY A PERSON · EDUCATIONAL GUIDANCE · NOT LEGAL ADVICE · NOT A CLEARANCE"; v4: "SELF-DECLARED RECORD · EDUCATIONAL GUIDANCE · NOT LEGAL ADVICE · NOT A CLEARANCE" | `t.stamp` **verbatim**, each schema's own (the mockup's dropped "ANY" is rejected), quieter running position, every page | Running footer | 7/8 | A (wording); placement = decision | — | **Adopt verbatim; placement per FD-3** | Founder |
| CH-3 | First-page disclosure | `t.stamp` | `t.stamp` verbatim, shown prominently once on page 1 (larger than the running copy) | Page 1, near the identity block | 7/8 | A | — | **Adopt** (PM condition for the quieter running stamp) | Founder |
| CH-4 | "Page N of M" | `t.page_label` "Page {page} of {pages}" | Unchanged, dynamic | Footer | 7/8 | A | computed | Adopt | — |
| CH-5 | "8" tile + "SuperImmersive 8 / Creator Record" lockup | none | none | — | 7/8 | E (mark) | — | **Exclude** (provisional mark; PM) | — |
| CH-6 | "End of record CR-… · SuperImmersive 8 Creator Record" | none | none | Last page | 7/8 | C | — | **Omit** (not needed; page count shows the end) | — |
| CH-7 | "continued from p.4", "Reading limitations & provenance continue p.5", "→ p.3", "Full guidance p.3" | none | none | Continuation cues and page refs | 7/8 | E (deferred) | — | **Defer** (page cross-references deferred; p.3 vs p.2 error shows the risk) | — |
| CH-8 | Section numerals "02", uppercase "YOUR VIDEO" | headings such as `R.heading` "2. Commercial-readiness considerations", `S.project.heading` "3. Your video", `E.heading` "6. Your documents and what they appear to show" | Print each heading string **verbatim**; style the leading number typographically (split at the first ". " mechanically, all characters printed); **no case transform** | Section headers | 7/8 | A (+ mechanical styling) | — | **Adopt** | PM/A |

## 2. First page (identity, about, overview)

| ID | Design slot | Existing approved wording | Proposed | Placement / purpose | Sch. | Class | Data | Disposition | Authority |
|---|---|---|---|---|---|---|---|---|---|
| FP-1 | Hero title "Urban Futures" + subline "SI8-UAT-2026-11-14" | Declared answer to "What is the title of the video?" (source text), printed today in section 3 | A **verbatim navigation copy of the full declared title** as the page-1 hero, with the question wording as its small label; never split, shortened or re-cased; if unanswered, no hero | Page 1, identity | 7/8 | B | yes (answer) | **Adopt full title; splitting rejected** | PM/A + Founder |
| FP-2 | Document identity | `t.document_title` "SI8 Creator Record {record_id}"; rows `S.provenance.labels.record_id` "Record number", `issued_on` "Issued on" | Unchanged (identity block) | Page 1 | 7/8 | A | yes | Adopt | — |
| FP-3 | "Issued 14 November 2026" | "Issued on" + `2026-11-14` | Keep label and ISO value; no locale reformatting | Page 1 | 7/8 | B | yes | **Adopt existing; reformatting rejected** | — |
| FP-4 | Eyebrow "CREATOR RECORD · SELF-DECLARED" | none (stamp carries it) | none | Page 1 | 7/8 | C | — | **Omit** (CH-3 covers it) | — |
| FP-5 | Intro "This record sets out … It is not legal advice, not a clearance, and not SI8's human-reviewed Commercial Assurance Assessment." | `S.about.intro[0]` "This Creator Record sets out what you told SI8 about your AI video, what any documents you added appear to show, and general educational guidance that SI8 has published for the tools and services you named." (v4: without the documents clause) | `S.about.intro[0]` verbatim. The added sentence is rejected as a rewrite (its substance is already in `S.not_done.lines[5]` and `R.assurance_text`) | Page 1 | 7/8 | A | — | **Keep approved; mockup rewrite rejected** | — |
| FP-6 | "WHAT THIS RECORD CONTAINS" + four cards (declarations §3–5, guidance §2, readings §6, limitations §7–8) with new captions | `S.about.intro[1..4]` (v5: 5 paragraphs; v4: 4) describe exactly these parts | Render `S.about.intro[1..n]` **verbatim** as the "contains" cards (one paragraph per card). Card titles: optional C-1 heading only. No hard-coded section numbers (the approved paragraphs carry them, and v4 numbering differs) | Page 1 | 7/8 | A (+ C-1 optional) | — | **Adopt with approved paragraphs; new captions rejected** | Founder |
| C-1 | Heading "What this record contains" | none | "What this record contains" | Above FP-6 cards | 7/8 | C | — | **Optional** | LK-G + Founder |
| FP-7 | "PUBLISHED GUIDANCE SELECTED FOR THIS RECORD" + index rows (provider / topic / open items) | `R.unresolved_heading` "Considerations and what remains open" + map rows (verbatim copies) + `R.overview_no_open` | The existing **overview map**, restyled as the index, under `R.unresolved_heading`; no page numbers; optional internal links | Page 1 (flows to page 2 if long) | 7/8 | A + B | yes (summary) | **Adopt** | PM/A |
| FP-8 | Index count "1 consideration" / "3 considerations · 3 providers" | `S.about.counts.guidance` "{n} consideration." / "{n} considerations." | Approved plural string; provider count rejected (new metric) | Page 1 | 7/8 | A (+E for provider count) | yes | **Adopt approved; provider count rejected** | — |
| FP-9 | "Listed in the order you named the tools. Not ranked, prioritised or compared." | none; actual order = questionnaire position of the selecting declaration, then record order | If wanted: "Listed in the order of your answers. Not ranked or compared." (accurate for tool and non-tool considerations) | Under the index | 7/8 | D | ordering rule exists | **Optional; mockup wording rejected as inaccurate** | LK-G + Founder |
| FP-10 | Record summary "14 answers recorded · 1 consideration · 0 open items · 1 answer you were unsure about" | `S.about.counts.answers` "{n} answer(s) recorded.", `.guidance`, `R.count_open_linked` "{n} open item(s) linked to considerations.", `R.count_not_sure` "{n} answer(s) you were not sure about." | Approved plural strings verbatim (styling may set the number in mono) | Page 1 | 7/8 | A | yes | **Adopt approved** | — |
| FP-11 | Zero caution "'0 open items' is not a finding that nothing is open, and does not mean there are no commercial issues to consider. An open item is not a problem SI8 has found, and none being listed does not resolve anything." / multi: "Counts of open items are not a measure of commercial readiness, and '0' never means there are no commercial issues to consider." | `R.unresolved_intro` "An open item is not a problem SI8 has found, and it is not resolved by anything in this record."; `R.unresolved_empty` "No open items were identified from what you told SI8. This does not mean nothing is open." | Place the approved `R.unresolved_intro` (and `R.unresolved_empty` when zero) **next to the counts** on page 1. The new "commercial issues" and "measure of commercial readiness" sentences are rejected (new concepts) | Page 1 | 7/8 | A | — | **Adopt approved placement; new cautions rejected** | — |
| FP-12 | "Favourable guidance for one tool does not carry across to another." / "Each consideration carries its own qualifications…" | none | none | Page 1 (multi) | 7/8 | E | — | **Reject** ("favourable" characterises governed guidance) | — |

## 3. Commercial-readiness considerations (section 2)

| ID | Design slot | Existing approved wording | Proposed | Placement / purpose | Sch. | Class | Data | Disposition | Authority |
|---|---|---|---|---|---|---|---|---|---|
| CN-1 | Section intro (orientation + guidance intro) | `R.orientation`; `R.guidance_intro` (v5 mentions section 6; v4 does not) | Verbatim, each schema's own | Section 2 head | 7/8 | A | — | Adopt | — |
| CN-2 | Provider eyebrow "RUNWAY" | subject group band (`role: subject`, the summary's verbatim subject) | Unchanged text; styled as eyebrow; **no case transform** of the string (visual small caps only if the font renders the same characters) | Group head | 7/8 | B | yes | Adopt | PM/A |
| CN-3 | "Commercial use of AI output" + "Consideration 1" | topic (`t.topic_labels.commercial_use`), reference (`R.consideration_ref_label` "Consideration" + n) | Unchanged | Block head | 7/8 | A | yes | Adopt | — |
| CN-4 | "WHY THIS WAS SELECTED" / "You told us — Which AI tool did you use? Runway." | `t.readiness_summary.summary.selected_because_label` "Selected because you told us" + the declaration rows (question + answer) | Approved label and rows verbatim | Block | 7/8 | A | yes | **Keep approved; relabel rejected as default**. Optional C-2 eyebrow only if founder wants it **in addition** | — |
| C-2 | Eyebrow "Why this was selected" | none | "Why this was selected" (above the approved "Selected because you told us") | Block | 7/8 | C | — | **Optional, not recommended** (duplicates meaning) | LK-G + Founder |
| CN-5 | "The terms of an AI tool may contain conditions or restrictions on commercial use of its output." + "Relevant to what you told us." | `summary.topic_framing.commercial_use` (verbatim match); `t.conclusion_labels.relevant_on_declared_facts` under `R.conclusion_label` "How this relates to what you told us" | Verbatim, conclusion label kept | Block | 7/8 | A | yes | Adopt | — |
| CN-6 | "WHAT THE GUIDANCE SAYS" + guidance text | `R.guidance_heading` "What SI8's published guidance says"; ledger explanation (governed guidance) | Approved heading; the guidance **complete and verbatim** as the typographic hero | Block | 7/8 | A | yes | **Adopt; relabel rejected** | — |
| CN-7 | "General educational guidance about the provider's terms. Not a determination about your video, your account or your use." | `R.item_limitation` "This is general educational guidance about the provider's terms. It is not a determination about your video, your account or your use." | Verbatim | Under the guidance | 7/8 | A | — | **Keep approved; shortening rejected** | — |
| CN-8 | "PLEASE NOTE — APPLIES TO THIS CONSIDERATION" + caveats "Describes the provider's own published terms or policy, as SI8 read them. It is not law and not legal advice." / "…may differ from the terms in force for your account…" | `R.caveats_label` "Please note"; ledger caveats (`governed/sources.ts:287`): "This describes the provider's own published terms or policy, as SI8 read them. It is not law and it is not legal advice."; "…may differ from the terms that were in force for your account when you made the video."; `R.caveat_applies_to_label` "Applies to considerations" | Approved label, caveats **verbatim**, one panel, with "Applies to considerations N"; placement per contract C5 | After the group / guidance | 7/8 | A (+ placement) | yes (`applies_to`) | **Keep approved; caveat edits rejected; per-block duplication rejected** | PM/A (C5) + Founder (FD-5) |
| C-3 | Per-block pointer to the shared caveats | none | e.g. "See 'Please note' below." | Inside each consideration | 7/8 | C | yes | **Optional** | LK-G + Founder |
| CN-9 | "OPEN ITEMS — FOR THIS CONSIDERATION" + "No open item was identified for this consideration from what you told SI8. This does not mean nothing is open; an open item is not a problem SI8 has found." | `R.overview_no_open` "No open item was identified for this consideration from what you told SI8. This does not mean nothing is open."; open box ("Depends on", conditions) | Approved strings verbatim; the appended clause is rejected | Block / index | 7/8 | A | yes | **Keep approved** | — |
| CN-10 | Applicability panel "APPLICABILITY DEPENDS ON — NOT ESTABLISHED … is not a finding that it applies to your video" (synthetic Pika) | `t.conclusion_labels.relevant_applicability_unresolved` "May be relevant: it depends on something this record does not establish"; `R.depends_on_label` "Depends on"; `R.fact_labels`; `R.dependency_nothing_told` "You did not tell us about this."; open facts and dependencies | Use the **existing** structure and strings (contract §1). The mockup wording fails the wording lock ("applies to you") | Block | 7/8 | A + B | yes (existing) | **Adopt existing; mockup panel rejected** | — |
| CN-11 | Synthetic guidance text "…except to create or improve competing products" and "[Synthetic] Commercial use of Pika output…" with "…guidance continues on page 4" | ledger explanation (complete) | Guidance printed complete; never paraphrased, truncated or ellipsised | Block | 7/8 | E | — | **Reject** (alters governed guidance; Pika withdrawn) | — |
| CN-12 | Stress labels "QUALIFICATIONS" / "Provider's own terms, as SI8 read them — not law. Terms change." / "None identified. Not a sign nothing is open." / "1 — plan in force during usage period not established." | approved caveats, `R.overview_no_open`, open box | Approved strings | Block | 7/8 | E | — | **Reject** (abbreviated governed text) | — |
| CN-13 | "ANSWERS YOU WERE NOT SURE ABOUT" + "NOT SURE" chip + question | `R.not_sure_heading` "Answers you were not sure about"; `t.not_sure_label` "Not sure"; question text | Verbatim; the chip may style `t.not_sure_label` | Section 2 | 7/8 | A | yes | Adopt | — |
| CN-14 | "WHAT THIS RECORD DOES NOT ESTABLISH" + "No SI8 guidance for — Where did the music come from? Epidemic Sound" | `R.not_established_heading`; `R.uncovered_intro` "This record contains no SI8 guidance for this tool or service you named:" / plural; answer rows | Verbatim (one/other) | Section 2 | 7/8 | A | yes | **Keep approved; "No SI8 guidance for —" rejected** | — |
| CN-15 | "The rest of your answers received no guidance in this record. That is not a finding…" | `R.rest_of_answers` (verbatim match) | Verbatim | Section 2 | 7/8 | A | — | Adopt | — |
| CN-16 | "TOOLS YOU NAMED WITH NO PUBLISHED GUIDANCE" / "no guidance" tag / "Recorded as you gave it, without guidance…" | `R.uncovered_intro`; `S.open_items.limitations[…]` ("Tools and services SI8 has no published guidance for are recorded as you gave them, without guidance. That says nothing about whether they may be used commercially.") | Approved strings | Section 2 / limitations | 7/8 | E (new labels) | yes | **Reject new labels; keep approved** | — |
| CN-17 | Unidentified provider (not shown in mockups) | `R.guidance_unidentified` (one/other) | Must remain a distinct state | Section 2 | 7/8 | A | yes | **Required** | — |
| CN-18 | "HOW THIS DIFFERS FROM A HUMAN-REVIEWED ASSESSMENT" + text | `R.assurance_heading`, `R.assurance_text` (verbatim match) | Verbatim; quiet boundary panel | Section 2 end | 7/8 | A | — | Adopt | — |
| CN-19 | Subjects shown as not established / unspecified conditions (not shown in mockups) | `R.topic_qualified_heading`, `R.unspecified_heading`, `summary.topic_qualified_note`, `summary.unspecified_condition_note` | Must remain | Section 2 | 7/8 | A | yes | **Required** | — |

## 4. Zero-guidance and document-free variants

| ID | Design slot | Existing approved wording | Proposed | Placement / purpose | Sch. | Class | Data | Disposition | Authority |
|---|---|---|---|---|---|---|---|---|---|
| ZG-1 | FP-None intro "This record is a complete, organised account … SI8 held no published guidance for the tools and services you named." | `R.about_intro_no_guidance` (v4/v5 each) | Approved string | Page 1 | 7/8 | A | yes | **Keep approved; rewrite rejected** ("complete" overclaims; conflates reasons) | — |
| ZG-2 | "No published SI8 guidance was selected." + "SI8 had no published guidance for the tools and services you named… The value of this record here is…" | `R.guidance_none_selected` "No guidance was selected for this record."; plus `R.uncovered_intro` / `R.guidance_unidentified` / dependencies, **as the record's data warrants** | Approved strings, with the reason states kept distinct (contract C7) | Index + section 2 | 7/8 | A | yes | **Keep approved; conflation and value claim rejected** | — |
| ZG-3 | "No considerations and '0 open items' do not mean there are no commercial issues… They mean SI8 selected no published guidance for what you named." | `R.unresolved_empty`; `R.unresolved_intro` | Approved | Page 1 | 7/8 | E | — | **Reject** (new concept; "for what you named" is inaccurate when the provider was not identified) | — |
| ZG-4 | Guidance card "None selected for this record." | `R.guidance_none_selected` | Approved string | Page 1 card | 7/8 | A | yes | Adopt approved | — |
| DF-1 | Schema 8 no documents: "No documents were added to this record." | `S.open_items.documents_not_provided` "You did not add any documents." | Approved string | Section 6 | 8 | A | yes | **Keep approved** | — |
| DF-2 | "A document is optional. Where a creator adds one, an AI model may read it…" / "The absence of documentary evidence is not a finding… does not weaken your declarations, which stand as recorded" | none | none | Section 6 | 8 | D | — | **Reject** (new claims about declarations) | — |
| DF-3 | "WHAT THIS RECORD STILL ESTABLISHES — A complete, fingerprinted account…" | none | none | Section 6 | 8 | E | — | **Reject** ("establishes", "complete") | — |
| DF-4 | Schema 7 documents (not in mockups) | `S.open_items.documents_heading` "Documents you added", `t.documents.intro` v4 "…SI8 did not read or examine them for this record.", inventory rows, "Examination: Not examined", `fingerprint_note`; heading `R.limitations_heading` v4 "6. Documents and limitations" | Approved strings; warm register (no reading register on schema 7) | Section 6 | 7 | A | yes | **Required** | — |

## 5. Declarations (sections 3–5)

| ID | Design slot | Existing approved wording | Proposed | Placement / purpose | Sch. | Class | Data | Disposition | Authority |
|---|---|---|---|---|---|---|---|---|---|
| DC-1 | Banner "What you told SI8" + "RECORDED AS YOU GAVE IT · NO PERSON CHECKED IT" | `S.project.intro`, `S.tools.intro`, `S.contribution.intro`; `S.about.intro[1]` "Everything in sections 3 to 5 is your own declaration, recorded as you gave it. No person at SI8 checked it." | Approved section intros; optional C-4 register banner using **`S.about.intro[1]` verbatim** (a navigation copy) | Section 3 head | 7/8 | A (+B copy) | — | **Adopt approved; new banner wording rejected** | PM/A |
| C-4 | Register banner title | none | none needed (see DC-1) | — | — | — | — | Withdrawn in favour of DC-1 | — |
| DC-2 | Question labels (full production questions) | source-text questions (the governed Source Text) | Verbatim, full questions | Q/A rows | 7/8 | A | yes | **Adopt; the change register's short labels rejected** (also used in Declarations-Stress) | — |
| DC-3 | Answers incl. multi-select "·" lists, long values | record answers | Verbatim; wrap, never truncate; any script | Q/A rows | 7/8 | B | yes | Adopt | — |
| DC-4 | Tool card "TOOL 1" + three Q/A | `S.tools.tool_heading` (template) + per-tool Q/A | Approved heading; full questions | Section 4 | 7/8 | A | yes | Adopt | — |
| DC-5 | "Not sure" chip "YOU NOTED YOU WERE NOT SURE" | `t.not_sure_label` "Not sure" | Approved label only | Q/A row | 7/8 | A (new phrase E) | yes | **Keep approved; new phrase rejected** | — |
| DC-6 | Empty sections (not in mockups) | `S.project.empty`, `S.tools.empty`, `S.contribution.empty` | Approved | Sections 3–5 | 7/8 | A | yes | Required | — |

## 6. Document readings (section 6, schema 8)

| ID | Design slot | Existing approved wording | Proposed | Placement / purpose | Sch. | Class | Data | Disposition | Authority |
|---|---|---|---|---|---|---|---|---|---|
| DR-1 | "AUTOMATED READING" tab + note | `E.intro[0..2]` (three paragraphs, verbatim) | All three paragraphs verbatim; the mockup's dropped `intro[0]` and re-punctuated `intro[1]` are rejected; tab text optional C (reuse `E.heading` instead) | Section 6 head | 8 | A | — | **Keep approved** | — |
| DR-2 | "DOCUMENT 1 · FILE 1 · LINKED TO TOOL 1" + filename + chips | `E.document_heading` "Document {n}"; `t.documents.item_label` "File {n}"; `.tool` "Linked to" / `.tool_value` "Tool {n}"; `.type` "File type"; `.size` "Size" / `.size_value` "{bytes} bytes"; `.category` "Your description"; `E.status` "Examination" + `E.status_labels` | Approved labels and values verbatim (no "67,771 B" abbreviation) | Document card head | 8 | A | yes | **Adopt approved** | — |
| DR-3 | "WHAT THE DOCUMENT APPEARS TO SHOW" | `E.observations_heading` | Verbatim | Card | 8 | A | — | Adopt | — |
| DR-4 | "BASIS — THE READING'S OWN DESCRIPTION…" / "BASIS — TEXT PRINTED ON THE DOCUMENT" group headers | `E.basis` "Basis" + `E.basis_labels` | Grouping by basis is permitted **only if** every observation still prints its own approved basis row; group header = the approved basis label | Card | 8 | A (+ placement) | yes | Adopt with the per-observation rule | PM/A |
| DR-5 | Field labels and values (Kind of document, Legibility, More than one plan shown, Contains text addressed to an AI, Product or plan, Transaction date, Plan name shown) | `E.field_labels`, `E.classification_labels`, `E.reading_labels`; `E.value` "Reported value" | Approved labels; values exactly as recorded | Card | 8 | A + B | yes | Adopt | — |
| DR-6 | "Read from: '…'" | `E.excerpt` "Text it was read from" + excerpt | Approved label | Card | 8 | A | yes | **Keep approved; "Read from" rejected** | — |
| DR-7 | "Where it appears: Account details" | `E.qualifier` "Where it appears" + `E.qualifier_labels.account_detail` "Account details" | Verbatim (legitimate data; see `02-EVIDENCE-LOCATION-FINDING.md`) | Card | 8 | A + B | yes | **Adopt** | — |
| DR-8 | "Service period 2026-10-01 → 2026-10-31" (one row) | `E.field_labels.service_period_start` / `_end` (two observations) | Two rows, each with its own basis and excerpt; a combined row would merge two observations | Card | 8 | B | yes | **Keep separate rows** (combining rejected) | PM/A |
| DR-9 | "Your response" (absent from mockups) | `E.your_response` + `E.response_labels`; `E.comparison_response` | **Must** print beside the reading it refers to (Terms §4) | Card | 8 | A | yes | **Required (mockup omission)** | — |
| DR-10 | "LIMITATIONS OF THIS READING" + items | `E.limitations_heading`, `L.limitation_labels` | Verbatim | Card | 8 | A | yes | Adopt | — |
| DR-11 | "HOW THE READING WAS MADE" grid | `E.provenance_heading`, `E.reference`, `E.method`, `L.method`, `L.provider` + `L.provider_labels`, `L.model`, `L.executed_at`, `E.profile` + `E.profile_value`, `E.content` + `L.content_labels` | Verbatim labels, values as recorded (full `executed_at` timestamp) | Card | 8 | A + B | yes | Adopt | — |
| DR-12 | "DOCUMENT FINGERPRINT (SHA-256)" + note "…This record does not say whether a document matches what you told SI8." | `t.documents.fingerprint` "SHA-256 fingerprint"; `t.documents.fingerprint_note`; `E.comparison_note` "This record does not say whether a document matches what you told SI8." | Approved labels; the note and comparison note as two approved strings | Card | 8 | A | yes | **Keep approved labels** | — |
| DR-13 | Reading failures (not in mockups) | `E.failure` "Reason" + `E.failure_labels`; `E.no_observations`; `E.status_labels.could_not_examine` | Required states | Card | 8 | A | yes | **Required** | — |
| DR-14 | Multi-document banner "Each document is read on its own… were not compared with each other…" | `E.intro` | Approved intro | Section 6 | 8 | D | — | **Reject** | — |
| DR-15 | Compact multi-document cells "Kind / Plan read / Service period", "Not found", "7 further observations, supporting text & limitations → continue on next page" | per-observation rows | Every observation as a full approved row (basis, value, excerpt, qualifier) | Card | 8 | E | — | **Reject** (drops basis and excerpt; new labels) | — |
| DR-16 | "The reading did not find a plan… It does not establish the declared subscription details. The declaration is preserved unchanged." | none | none | Card | 8 | E | — | **Reject (D10)**: relates a reading to a declaration | — |
| DR-17 | "…the provider was not inferred from the amount. Recorded with its evidence limitation preserved." | none | none | Card | 8 | E | — | **Reject**: statements no record field holds | — |
| DR-18 | Reading register page ground / slate chrome | — | Presentation only; the readings section starts on its own page(s) | Section 6 | 8 | — (presentation) | — | **Adopt** | PM/A |

## 7. Limitations, what SI8 did not do, how the record was made

| ID | Design slot | Existing approved wording | Proposed | Placement / purpose | Sch. | Class | Data | Disposition | Authority |
|---|---|---|---|---|---|---|---|---|---|
| LM-1 | "07 Limitations of this record" + bullets | `R.limitations_heading` (v5 "7. Limitations of this record"; v4 "6. Documents and limitations"); `S.open_items.limitations[]` (v4: 4; v5: 5) | Verbatim, each schema's own | Section 7 / 6 | 7/8 | A | — | Adopt | — |
| LM-2 | "08 What SI8 did not do" + lines | `S.not_done.heading`, `S.not_done.lines[]` (v4/v5 differ) | Verbatim, quiet boundary panel | Section 8 / 7 | 7/8 | A | — | Adopt | — |
| HM-1 | "09 How this record was made" / "WHAT YOU ACKNOWLEDGED" + numbered acknowledgements | `S.provenance.heading`, `.acknowledgements_heading`; acknowledgement texts (source text) | Verbatim; numbering is styling only | Section 9 / 8 | 7/8 | A | yes | Adopt | — |
| HM-2 | "THIS RECORD" grid | `.identity_heading` "This record" + labels | Verbatim | Section 9 | 7/8 | A | yes | Adopt | — |
| HM-3 | "APPENDIX TECHNICAL PROVENANCE" consolidated grid; "Layout version", "Layout fingerprint", "Format version", "Builder version", "Guidance source", "Consideration 1 · entry v1" | `.sources_heading` "Questions and wording used", `.publications_heading` "Guidance sources"; labels such as "Document layout version", "Document layout fingerprint", "Record format version", "Record builder version", "Guidance entry version" | Approved headings and labels verbatim; dense grid styling permitted; "APPENDIX" not added | Section 9 | 7/8 | A | yes | **Keep approved labels; relabelling rejected** | — |

## 8. Rejected content (E) — consolidated

FP-12, CN-11, CN-12, CN-16 (labels), ZG-3, DF-3, DR-15, DR-16, DR-17, CH-5 (mark), the provider count in FP-8, title splitting (FP-1), date reformatting (FP-3), dropping "ANY" (CH-2), every abbreviation of governed or approved text, and all synthetic provider content (Pika, ElevenLabs, Suno, "Nova Video 3") as product behaviour.

## 9. Optional new strings for founder decision (C / D)

| ID | Exact proposed wording | Class | Recommendation |
|---|---|---|---|
| C-1 | "What this record contains" | C | Optional |
| C-2 | "Why this was selected" | C | Not recommended |
| C-3 | "See 'Please note' below." | C | Optional, only with caveat placement C5 |
| FP-9 | "Listed in the order of your answers. Not ranked or compared." | D | Optional; if adopted, LK-G review |

All other wording in v6/v7 would be **carried verbatim** from v4/v5.
