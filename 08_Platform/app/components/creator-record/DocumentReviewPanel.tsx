'use client'

/**
 * CR-V2-EVIDENCE-SLICE-1 — the optional billing document for one tool block:
 * add a file, have it examined, see what it appears to show, and make an
 * explicit choice about it.
 *
 * The document observation is shown read-only and is never edited here. The
 * only things the creator can do are: adopt a plan name the document appears
 * to show as THEIR OWN answer (the parent sets the plan answer), say they will
 * give their own answer, or ignore it. Nothing is chosen automatically.
 * Standard controls only (file input, buttons, radios); no hover or drag.
 *
 * CR-V2-WORK-UAT-HARNESS-2: with `fixtures`, the empty state is a native
 * dropdown of SI8's synthetic test documents instead of a file input; nothing
 * is uploaded and no consent to upload is needed.
 */

import { useState } from 'react'
import { adoptablePlanValues, DOCUMENT_FIELDS, type ExtractionMode, type ReviewDecision, type ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import { T } from '@/lib/creator-record/presentation/templates'
import type { ExaminedDocument } from '@/lib/creator-record/evidence/document-observations'

const MUTED = '#6b6560'
const ERROR = '#b42318'

export interface DocumentReviewPanelProps {
  toolIndex: number
  doc: ToolDocument | null
  /** Public UAT harness: choose from SI8's synthetic test documents instead of uploading. */
  fixtures?: readonly { fixture_id: string; label: string; document: ExaminedDocument }[]
  onSelectFixture?: (fixtureId: string) => void
  consented: boolean
  mode: ExtractionMode
  examining: boolean
  error: string | null
  onExamine: (file: File) => void
  onRemove: () => void
  onReview: (decision: ReviewDecision, adoptedValue: string | null) => void
}

export function DocumentReviewPanel(p: DocumentReviewPanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const n = p.toolIndex + 1
  const id = `cr-doc-${p.toolIndex}`

  if (!p.doc && p.fixtures) {
    return (
      <div role="group" aria-labelledby={`${id}-label`} className="mt-2 mb-2 rounded-md border p-3" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <p id={`${id}-label`} className="text-sm font-medium">Tool {n}: {T.public_uat_documents_choose}</p>
        <p id={`${id}-help`} className="text-xs mb-2" style={{ color: MUTED }}>{T.public_uat_documents_note}</p>
        <select
          id={`${id}-fixture`}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-help`}
          className="w-full rounded-md border px-3 py-2 text-sm bg-white"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
          value=""
          onChange={(e) => e.target.value && p.onSelectFixture?.(e.target.value)}
        >
          <option value="">No document</option>
          {p.fixtures.map((f) => (
            <option key={f.fixture_id} value={f.fixture_id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (!p.doc) {
    return (
      <div role="group" aria-labelledby={`${id}-label`} className="mt-2 mb-2 rounded-md border p-3" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <p id={`${id}-label`} className="text-sm font-medium">Tool {n}: billing document (optional)</p>
        <p id={`${id}-help`} className="text-xs mb-2" style={{ color: MUTED }}>
          A receipt, invoice or billing screenshot for this tool. PDF, PNG or JPEG, up to 4 MB. Synthetic test documents only.
          {!p.consented && ' Tick the statement under “Before you add a document” to enable this.'}
        </p>
        <input
          type="file"
          id={`${id}-file`}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-help`}
          accept="application/pdf,image/png,image/jpeg"
          disabled={!p.consented || p.examining}
          className="text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="mt-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm bg-white disabled:opacity-50"
            disabled={!p.consented || !file || p.examining}
            onClick={() => file && p.onExamine(file)}
          >
            {p.examining ? `Reading document for Tool ${n}…` : `Read document for Tool ${n}`}
          </button>
        </div>
        {p.examining && <p role="status" className="text-xs mt-2" style={{ color: MUTED }}>Reading the document. This can take a few seconds.</p>}
        {p.error && <p role="alert" className="text-xs mt-2 font-medium" style={{ color: ERROR }}>Error: {p.error}</p>}
      </div>
    )
  }

  const d = p.doc.document
  const ex = d.extraction
  const adoptable = adoptablePlanValues(d)
  const decision = p.doc.review.decision
  const adoptedValue = p.doc.review.adopted_value

  return (
    <section aria-labelledby={`${id}-heading`} data-document-id={d.document_id} className="mt-2 mb-2 rounded-md border p-3" style={{ borderColor: 'rgba(0,0,0,0.15)' }}>
      <h4 id={`${id}-heading`} className="text-sm font-semibold">Tool {n}: what this document appears to show</h4>
      <p className="text-xs mt-1" style={{ color: MUTED }}>{d.file_name} · {T.doc_fingerprint_label} {d.sha256}</p>
      <p role="status" className="text-xs mt-2">
        <span className="font-semibold">{T.doc_read_label}: </span>
        {d.outcome === 'document_examined' ? (d.extraction_mode === 'fixture_replay' ? T.doc_read_replay : T.doc_read_live(d.model_calls)) : T.doc_not_read[d.reason ?? 'model_error'] ?? T.doc_not_read.model_error}
      </p>
      {ex && (
        <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs">
          <dt style={{ color: MUTED }}>{T.doc_type_label}</dt>
          <dd className="sm:col-span-2">{T.doc_type[ex.document_type] ?? T.doc_type.unknown}</dd>
          <dt style={{ color: MUTED }}>{T.doc_readability_label}</dt>
          <dd className="sm:col-span-2">{T.doc_readability[ex.readability] ?? ex.readability}</dd>
          {DOCUMENT_FIELDS.map((f) => (
            <div key={f} className="contents">
              <dt style={{ color: MUTED }}>{T.doc_field_label[f]}</dt>
              <dd className="sm:col-span-2">
                {ex[f].status === 'present' ? T.doc_field_present(ex[f].value as string) : T.doc_field_status[ex[f].status]}
                {ex[f].status === 'present' && ex[f].evidence && <span className="block" style={{ color: MUTED }}>{T.doc_field_excerpt(ex[f].evidence as string)}</span>}
              </dd>
            </div>
          ))}
          <dt style={{ color: MUTED }}>{T.doc_plan_names_label}</dt>
          <dd className="sm:col-span-2">{ex.plan_candidates.length > 0 ? ex.plan_candidates.map((c) => `“${c.text}”`).join('; ') : T.doc_plan_names_none}</dd>
        </dl>
      )}
      {ex?.multiple_plans_shown && <p className="text-xs mt-2">{T.doc_multiple_plans}</p>}
      {ex?.instruction_like_text_present && <p className="text-xs mt-2">{T.doc_instruction_text}</p>}
      <p className="text-xs mt-2" style={{ color: MUTED }}>{T.doc_not_compared}</p>

      <fieldset className="mt-3" aria-describedby={`${id}-review-help`}>
        <legend className="text-sm font-medium">Tool {n}: what would you like to do with what this document appears to show?</legend>
        <p id={`${id}-review-help`} className="text-xs mb-1" style={{ color: MUTED }}>Your plan answer is always your own statement. Nothing is used unless you choose it.</p>
        {adoptable.map((v) => (
          <label key={v} className="flex items-center gap-2 text-sm">
            <input type="radio" name={`${id}-review`} checked={decision === 'adopted' && adoptedValue === v} onChange={() => p.onReview('adopted', v)} />
            Use “{v}” as my plan answer
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name={`${id}-review`} checked={decision === 'entered_different'} onChange={() => p.onReview('entered_different', null)} />
          I’ll give my own plan answer
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name={`${id}-review`} checked={decision === 'ignored'} onChange={() => p.onReview('ignored', null)} />
          Ignore what this document appears to show
        </label>
      </fieldset>
      <div className="mt-3">
        <button type="button" className="rounded-md border px-3 py-1 text-xs bg-white" onClick={p.onRemove}>
          Remove document for Tool {n}
        </button>
      </div>
    </section>
  )
}
