# CR-DESIGN-2A — Evidence-location discrepancy: finding

**Status: PROPOSED — NOT APPROVED.** Read-only investigation, 2026-11-15. No data, reading, template or code was changed.

## Question

The CR-DESIGN-1 feasibility report classified the mockup row **"Where it appears: Account details"** as invented location data, because the live examination envelope sets `source.location` to `null`. PM/Architecture recalled the row appearing in the issued Production record CR-2026-7E82CA09.

## Finding: legitimate existing data. The feasibility report was wrong.

"Where it appears" is not `source.location`. It is the approved label for an observation's **`qualifier`**, a different field.

| Layer | Evidence |
|---|---|
| Reading schema | A plan-name candidate carries `context` from a closed enum (`PLAN_CANDIDATE_CONTEXTS`): "Where on the document a plan-name observation was printed. Informational only" (`lib/creator-record/receipt-examination/schema.ts:80-92, 182`). |
| Projection into the envelope | `plan_candidate` observations take `qualifier: c.context` (`examination/receipt-profile.ts:55`, `examination/receipt-reading.ts:35`). `source.location` is a separate field, always `null` for live readings (`live-examination/envelope.ts:77, 162`). |
| Approved wording (v5) | `examination.qualifier` = "Where it appears"; `examination.qualifier_labels.account_detail` = "Account details" (also `heading_or_title`, `current_plan_label`, `charge_line`, `other`) in `governed/proposals/CR-PDF-TEMPLATES-v5-schema8.proposal.json` and `governed/sources.ts`. |
| Rendering | `customer-pdf/document-model.ts:478` prints the qualifier row with its approved label; an unlabelled qualifier refuses (`observation_qualifier_unlabelled`). |
| Production reading (read-only SQL, `supabase_read_only_user`) | Live attempt `4be776e0-…`, envelope `79118a472c3a…`: observation `plan_candidate`, `qualifier = "account_detail"`, `source.location = null`, value "Runway Standard (SYNTHETIC TEST PLAN LABEL)". Limitations include `no_location_reference`. |
| Immutable prepared record | Prepared `10742325-…` (sha256 `4e1cec43801f…`) carries the same observation and qualifier. |

So the issued record legitimately prints **"Plan name shown · Where it appears: Account details"**. The Round 2 mockup reproduces existing data correctly.

## A pre-existing wording tension (approved, not a design defect)

The same reading also prints the approved limitation `no_location_reference`: "The reading does not say where on the document each detail appears." The two are not contradictory in data terms: the qualifier is a coarse context the model chose for one plan-name candidate, and the limitation refers to positional location, which no reading provides. A reader could still take them as contradictory.

- Classification: **existing approved wording**, released in v5. Not introduced by the design.
- Disposition: carry both verbatim into the new templates. Note the tension as a deferred wording-maintenance item for a later, separately governed wording review. CR-DESIGN-2A does not propose rewording.

## What could not be inspected, and the minimal check

The issued PDF bytes (artifact `cb444a2c-…`, `-pdf-v3`, sha256 `e38921286e47…`, 28,342 bytes) are in private storage and are not readable through the read-only SQL role. The conclusion above rests on the stored reading, the prepared record and the rendering code, which together determine the printed row.

To confirm against the bytes, the operator:
1. downloads the issued PDF for CR-2026-7E82CA09 from the admin surface;
2. checks its SHA-256 equals `e38921286e477d574d8fa2d273a25225acd438758811854088fbf756e7ae16b9`;
3. confirms that section 6 shows "Plan name shown", value "Runway Standard (SYNTHETIC TEST PLAN LABEL)", and a "Where it appears: Account details" row, plus the limitation "The reading does not say where on the document each detail appears."

## Corrections this makes to CR-DESIGN-1

- Feasibility discrepancy #22 is withdrawn. "Where it appears" is class **A / B** (approved label over existing data), not E.
- The Round 2 reference also correctly shows **Legibility** (`readability`, approved label "Legibility").
