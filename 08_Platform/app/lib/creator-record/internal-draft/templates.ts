/**
 * CR-OPTION-C-OC1 — fixed wording and identifiers of the INTERNAL draft snapshot and PDF.
 *
 * Internal review material only (PM and governance). Not customer wording, not
 * counsel-reviewed, and not an approval of the PRD's proposed PDF structure.
 *
 * C1 (PM decision, CR-OPTION-C-OC1): document comparisons use NEUTRAL FALLBACK
 * wording only. Nothing here states, counts or implies that a document appears
 * consistent or inconsistent with an answer.
 */

import { T } from '../presentation/templates'

/** Identifies the internal draft renderer. Deliberately unlike the issued-artifact versions (`legacy-creator-record-pdf-v*`). */
export const INTERNAL_DRAFT_GENERATOR_ID = 'si8-internal-draft/creator-record-v2-pdf@0'

export const INTERNAL_DRAFT_SNAPSHOT_SCHEMA = 'si8-internal-draft/creator-record-v2-snapshot'
/** 1 (OC-1B): adds `templates`; the prototype templates are recorded as `prototype_presentation_templates`. */
export const INTERNAL_DRAFT_SNAPSHOT_SCHEMA_VERSION = 1

/** The comparison policy recorded in every snapshot (C1). */
export const COMPARISON_POLICY = 'neutral_fallback' as const

/**
 * Version identifiers that do not exist yet. Recorded as missing; never invented.
 * The prototype's own presentation templates (the wording carried in from its
 * draft view: declaration labels, guidance cards, open items and so on) have no
 * version. The internal draft's own templates (`D`) do: see below.
 */
export const NOT_YET_VERSIONED = ['prototype_presentation_templates'] as const

/**
 * CR-OPTION-C-OC1B — the internal draft template contract.
 *
 * The contract is everything `D` prints, including the prototype strings it
 * pins (section titles, summary sentences, the general "what SI8 did not do"
 * list). Its fingerprint is the SHA-256 of `D` evaluated (see
 * `./template-contract`). A snapshot can only be built when the fingerprint of
 * the running `D` is the one pinned for `INTERNAL_DRAFT_TEMPLATE_VERSION`, so any
 * change to the wording, including a change in a pinned prototype string,
 * stops snapshot building until the version is raised and its fingerprint
 * pinned here. Separate from the questionnaire (registry), Observation Map
 * (mapping) and publication ledger versions, which come from the sources.
 *
 * Append-only: add a new version with its fingerprint; never edit a pinned one.
 */
export const INTERNAL_DRAFT_TEMPLATE_ID = 'si8-internal-draft/creator-record-v2-templates'
export const INTERNAL_DRAFT_TEMPLATE_VERSION = 1
export const INTERNAL_DRAFT_TEMPLATE_FINGERPRINTS: Readonly<Record<number, string>> = {
  1: '875940f72b3ab6f8dbd6b533c980744f9e53b5d9560ac85a5e1691d65e7dee94',
}

/** The issued Creator Record id format (`CR-{year}-{8 HEX}`). A draft may never carry one. */
export const ISSUED_RECORD_ID = /^CR-\d{4}-[0-9A-F]{8}$/

/** Section titles: the prototype's own, numbered for the internal draft. */
const n = (i: number, title: string) => `${i}. ${title}`

export const D = {
  /** On every page, header and footer. */
  marking: 'INTERNAL DRAFT — NOT ISSUED — NOT A CREATOR RECORD',
  marking_detail: 'Prepared for SI8 internal PM and governance review only. Not for customers. Nothing in it has been issued, saved, sent or charged.',
  structure_note: 'Structure and wording are internal working drafts, not the final Creator Record format, and have not been reviewed by counsel.',

  section: {
    summary: T.section_summary,
    declarations: n(1, T.section_declarations),
    guidance: n(2, T.section_guidance),
    open_items: n(3, T.section_open_items),
    not_shown: n(4, T.section_not_shown),
    independent_review: n(5, T.section_independent_review),
    not_done: n(6, T.section_not_done),
    method: n(7, T.section_method),
    documents: T.section_reconciliation,
  },
  documents_subheading: T.section_documents,
  not_established_heading: 'Information this record does not establish',
  open_evidence_heading: 'Items needing supporting documents',
  documents_mentioned_heading: 'Documents you mentioned',

  // ── Summary: built from structured counts (OC-1B), never from the prototype's summary list ──
  summary_intro: T.summary_intro,
  summary_counts: T.summary_counts,
  summary_conditions: T.summary_conditions,
  summary_not_assessment: T.summary_not_assessment,

  documents_intro: T.documents_intro,
  open_documents_none: T.open_documents_none,
  /** The general list; the internal draft adds its own document line (`not_done_documents`). */
  not_done_base: T.not_done,

  // ── Neutral fallback (C1) ──
  comparison_intro: 'Your answers are set out in section 1. Documents you added are listed below with what each appears to show. In this draft SI8 did not compare any document with your answers.',
  comparison_tool_with_document: (tool: number) => `Tool ${tool}: a document was added. SI8 did not compare it with your answers in this draft.`,
  comparison_tool_without_document: (tool: number) => `Tool ${tool}: no document was added.`,
  comparison_no_documents: 'You did not add any documents.',
  summary_documents: (count: number) =>
    count === 0
      ? 'You did not add any documents.'
      : `You added ${count} ${count === 1 ? 'document' : 'documents'}. ${count === 1 ? 'It is' : 'They are'} listed with what ${count === 1 ? 'it appears' : 'they appear'} to show. SI8 did not compare documents with your answers in this draft.`,
  open_documents_some: 'A document was added and is listed under “Documents you added”. SI8 did not compare it with your answers in this draft. A document does not establish this.',
  not_done_documents: 'SI8 did not check whether any document you added is genuine, complete or current, and did not compare any document with your answers in this draft.',

  draft_label: 'Draft',
  prepared: (date: string) => `prepared ${date}`,
  provenance_label: 'Provenance',
  method_generator: 'Draft renderer',
  method_snapshot_schema: 'Snapshot schema',
  method_comparison_policy: 'Document comparison',
  method_comparison_policy_value: 'Neutral fallback only: no document was compared with your answers',
  method_missing_versions: 'Not yet versioned',
  method_templates: 'Draft templates',
  footer_snapshot: (sha: string) => `Snapshot SHA-256 ${sha}`,
} as const
