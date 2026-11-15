# CR-DESIGN-2A — Consideration presentation contract

**Status: PROPOSED — NOT APPROVED.** Defines how the Institutional Trust consideration component and first-page guidance index sit on the existing placement tree. It adds no selection, priority, assessment or interpretation logic.

## 1. What already exists (v4/v5, `customer-pdf/readiness-layout.ts`)

The approved three-level layout (founder approval F3) already contains every structural element the design needs:

| Design element | Existing structure | Reference |
|---|---|---|
| First-page guidance index | The **overview map**: one `map_row` per consideration (reference, topic, its open matters, or the render set's `overview_no_open`), grouped under the summary's subject groups (`map_group`). Only verbatim navigation copies. | `readinessLayout`, section A |
| Consideration block | `consideration` box: `consideration_head` (reference + topic), then the consideration's own blocks in renderer order (conclusion, framing, explanation, boundary, notes, declarations), then its open matters (`open` / `dependency` boxes) | section B, `openFor` |
| Provider grouping | `group` box per subject, with the subject `band` | section B |
| Applicability not established | Conclusion label `relevant_applicability_unresolved` ("May be relevant: it depends on something this record does not establish"), "Depends on" + conditions, open facts (`unresolved_applicability`) and governed dependencies listed per consideration | render set; `summary.open_items` |
| Shared caveats | **One** caveat panel in the overview: "Please note" label, the caveats, and "Applies to considerations N" references | `caveatPanel` |
| Neutral order | Questionnaire position of the selecting declaration, then record order; never by status | `readiness-summary/summary.ts:32, 323-324` |
| Exactly once | Every source block is printed exactly once or recorded as consolidated; layout order equals printed order, or refuse | `readinessLayout` end, `checked()` |

**Conclusion.** Multiple considerations, provider scope, unresolved applicability, linked open items and neutral order are all supported by existing contracts. **No new governed data concept is needed.** The change register's "applicability-dependent considerations need a new governed concept" is not correct.

## 2. Proposed contract (CR-DESIGN-2B)

**C1. One tree, restyled.** The new presentation consumes the same `SectionLayout` (blocks, `LayoutNode` tree, `consolidated[]`) that `readinessLayout` produces today. It changes styling, chrome and page grouping only. Block text, block order and the set of printed blocks are identical to the v4/v5 tree for the same record and wording.

**C2. Guidance index = the overview map.** The index is the existing map, restyled (solid institutional block on the first page where it fits). Its rows stay verbatim navigation copies. **No page numbers** (deferred). An internal link from each row to its consideration block is permitted, because it adds no text.

**C3. Consideration block.** Fixed internal order = the renderer's order, unchanged:
1. head: reference ("Consideration N") + topic, under the provider band;
2. selection provenance ("Selected because you told us" + the declarations), or the group's shared selection when the layout already consolidates it (`shared_selection`);
3. conclusion ("Relevant to what you told us" / "May be relevant: it depends on something this record does not establish");
4. framing, then the governed explanation (the guidance), complete and unabbreviated, styled as the single typographic hero;
5. boundary text (`item_limitation`), notes (with paired list labels, D5);
6. open matters (`open` box: "Depends on", conditions, dependency details), or the map's `overview_no_open` line in the index.

Styling may label positions with existing strings only (C1). New sub-labels such as "Why this was selected" are wording proposals (see `01-WORDING-RECONCILIATION.md`), not part of this contract.

**C4. Guidance never separates from its conditions.**
- The consideration head, the conclusion and the first lines of the explanation are kept together (`wrap={false}` unit, as today with `KEEP_CHARS`).
- A consideration's `open` box may move to the next page only together with at least the explanation's last lines. Keep the existing "head travels with up to two following simple blocks" rule, and extend it so the `open` box is never orphaned from the explanation.
- The explanation is never truncated, ellipsised or continued with "…": it wraps.

**C5. Shared caveats stay one block, clearly associated, never duplicated.**
- Default (preferred, no new text): **group-scoped placement.** When every consideration in a caveat's "Applies to considerations" list belongs to one provider `group`, the caveat panel is placed at the end of that group's box, after its considerations. The existing "Applies to considerations N" row stays with it. This is a placement change only: the same blocks, printed once.
- Otherwise (a caveat spans several groups): keep the single panel and place it **immediately after the guidance section's last group** instead of in the overview. The existing "Applies to considerations N" references stay.
- Optional, wording-gated: a one-line, template-worded cross-reference inside each consideration ("Please note applies: see below" or similar) is a **new navigational string (class C)**. It is not in the contract unless approved. A verbatim copy of caveat **text** inside each block is **rejected**: it duplicates a governed block and breaks the exactly-once rule.
- Founder decision (FD-5): whether the caveat panel moves from the overview (today) into the guidance section (C5 default). Both preserve exactly-once.

**C6. Open items.** Per-consideration open matters remain inside their block (as today). The overview map keeps its per-row open list (navigation copies) or `overview_no_open`. Counts on page 1 use the approved plural strings (`count_open_linked`, `count_not_sure`, `about.counts`) and are always accompanied by the approved `unresolved_intro` / `unresolved_empty` text on the same page. New "0 open items" cautions are wording proposals, not part of this contract.

**C7. Empty and uncovered states.** These four stay distinct and use their approved strings:
- **none selected:** `guidance_none_selected` and `about_intro_no_guidance`;
- **uncovered tool or service named:** `uncovered_intro` + the verbatim answers + `rest_of_answers`;
- **tool or service not identified:** `guidance_unidentified`;
- **missing applicable information:** the conclusion `relevant_applicability_unresolved` + "Depends on" + "You did not tell us about this."

The design's single "no published guidance" empty state is rejected.

**C8. D10.** The guidance section, the overview map and the caveat panel receive no block derived from a document. Unchanged: `CR-PDF-DECISION-1`, the `readiness_layout_refused` guards and comparison method v2 only.

## 3. Invariants the 2B tests must hold

- The printed block multiset of the new presentation equals that of the v4/v5 layout for the same record and template strings (excluding approved additions).
- `consolidated[]` is unchanged, or changed only by approved additions.
- No block is printed twice. No caveat text appears in more than one place.
- Every consideration's explanation appears complete, on pages where the head or the continuation of the same block appears.
- Order of considerations and groups is identical to the v4/v5 tree.
