/**
 * CR-V2-WORK-UAT-HARNESS-2 — public harness draft: the SAME orchestrator as the
 * admin prototype (`buildCreatorRecordDraft` over `pilotSources()` and the
 * governed claim fixtures), then a presentation-only public view.
 *
 *   request → fixture refs → server-built document observations (./fixtures)
 *     → buildCreatorRecordDraft (unchanged: validation, declarations, guidance
 *       pipeline, composition, view model; documents display-only)
 *     → toPublicUatView: adds the PUBLIC UAT designation to the record title,
 *       status, banner, summary, method and "did not do"; adds the document
 *       origin line; removes the internal trace, publication-entry provenance,
 *       internal claim/dependency identifiers and internal version identifiers.
 *
 * `toPublicUatView` never changes a conclusion, a guidance text, an open item,
 * a limitation or an omission: it only adds fixed designation text and
 * removes internal metadata (test-enforced).
 */

import type { RecordContext } from '../contract/provenance'
import type { ToolDocument } from '../evidence/document-observations'
import type { DraftGuidanceCard, DraftOpenItem, DraftRecordView } from '../presentation/build-draft-record'
import { T } from '../presentation/templates'
import { buildCreatorRecordDraft, pilotSources, type BuildDraftResult } from '../prototype/build-draft'
import type { CreatorRecordFormState, FormIssue } from '../prototype/form'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { documentForFixture } from './fixtures'
import type { PublicDocumentRef } from './parse-public-request'

export type PublicUatCard = Omit<DraftGuidanceCard, 'provenance'>
export type PublicUatView = Omit<DraftRecordView, 'trace' | 'guidance' | 'open_items'> & {
  public_uat: true
  guidance: { intro: string; cards: PublicUatCard[]; empty: string | null }
  open_items: { intro: string; not_established: DraftRecordView['open_items']['not_established']; items: DraftOpenItem[]; empty: string | null; documents_mentioned: DraftRecordView['open_items']['documents_mentioned'] }
}

/** Server-side: each fixture reference becomes a document observation built from the replay table. */
export function documentsFromRefs(refs: readonly PublicDocumentRef[]): ToolDocument[] {
  return refs.map((r) => {
    const document = documentForFixture(r.fixture_id)
    return { tool_index: r.tool_index, document }
  })
}

export function toPublicUatView(view: DraftRecordView): PublicUatView {
  const { trace: _trace, guidance, open_items, ...rest } = view
  return {
    ...rest,
    public_uat: true,
    banner: { title: T.public_uat_designation, lines: [...T.public_uat_banner_lines] },
    header: { ...view.header, record_title: T.public_uat_record_title, status: T.public_uat_status },
    summary: [T.public_uat_summary_designation, T.public_uat_summary_unapproved, ...view.summary],
    documents: {
      ...view.documents,
      items: view.documents.items.map((d) => ({
        ...d,
        rows: [d.rows[0], { label: T.public_uat_doc_origin_label, value: T.public_uat_doc_origin }, ...d.rows.slice(1)].filter(Boolean),
      })),
    },
    guidance: {
      ...guidance,
      cards: guidance.cards.map(({ provenance: _p, ...c }, i) => ({ ...c, claim_id: `guidance-${i + 1}` })),
    },
    open_items: {
      ...open_items,
      not_established: open_items.not_established.map((n, i) => ({ ...n, key: `not-established-${i + 1}` })),
      items: open_items.items.map((o, i) => ({ ...o, dependency_id: `open-item-${i + 1}` })),
    },
    not_done: [...view.not_done, T.public_uat_not_done],
    // Internal version identifiers are replaced by what they mean; the rows themselves stay.
    method: [
      { label: T.public_uat_method_run, value: T.public_uat_method_run_value },
      ...view.method.map((m) =>
        m.label === T.method_registry ? { ...m, value: T.public_uat_method_registry } : m.label === T.method_ledger ? { ...m, value: T.public_uat_method_ledger } : m,
      ),
    ],
  }
}

export interface PublicUatDraftInput {
  state: CreatorRecordFormState
  refs: readonly PublicDocumentRef[]
  topicClaims: TopicClaim[]
  as_of: string
  record: RecordContext
}

export type PublicUatDraftResult = { ok: true; view: PublicUatView; internal: Extract<BuildDraftResult, { ok: true }> } | { ok: false; issues: FormIssue[] }

export function buildPublicUatDraft(input: PublicUatDraftInput): PublicUatDraftResult {
  const r = buildCreatorRecordDraft({
    state: input.state,
    sources: pilotSources(),
    topicClaims: input.topicClaims,
    as_of: input.as_of,
    record: input.record,
    documents: documentsFromRefs(input.refs),
  })
  if (!r.ok) return r
  return { ok: true, view: toPublicUatView(r.view), internal: r }
}
