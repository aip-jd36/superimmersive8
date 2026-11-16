'use client'

/**
 * SI8-UX-2 — documents managed where the creator thinks of them: inside each declared tool's section ("Documents linked to this
 * tool"), plus, after the tools, the documents not linked to a tool and the ones that need a choice.
 *
 * Operations are exactly the existing ones (`useCreatorRecordDocuments`); links are the existing version references, kept correct
 * by `associationReducer`. Storage consent is asked for each upload and AI-examination permission for each examination, separately
 * and explicitly, with the approved wording. Document type, inclusion ("Not in this version") and the record-level choice to
 * include readings are the existing controls.
 *
 * D10: nothing here shows what a document appears to show. An examination's outcome is only its state ("Read…", or the refusal);
 * the readings themselves appear only in the separate reading view of the prepared version (the examination review). No comparison,
 * discrepancy, verification indicator or suggested correction exists here, and no link is ever inferred from a document or a reading.
 * Every customer string comes from the customer wording set (guarded by `scripts/customer-wording-check.js`).
 */
import { useState } from 'react'
import { examText, EVIDENCE_CATEGORIES, EVIDENCE_CATEGORY_DEFAULT, type Attachment, type ExaminationTextMode } from '@/lib/creator-record-flow/examination-ui'
import { attachmentsForTool, outOfRangeDocuments, unlinkedAttachments, uploadOrigin, type AssociationEvent, type AssociationState, type LinkChoice } from '@/lib/creator-record-flow/document-associations'
import { EVIDENCE_MAX_PER_RECORD, EVIDENCE_MAX_PER_TOOL } from '@/lib/creator-record/evidence-intake/vocabulary'
import { LEGAL_PATHS } from '@/lib/legal/paths'
import { EVIDENCE_MESSAGES, fillReviewText, PANEL_TEXT, QUESTIONNAIRE_CHROME } from '@/lib/creator-record-flow/wording'
import type { CreatorRecordDocuments } from './useCreatorRecordDocuments'

export interface DocumentsContext {
  /** The links as of this render. */
  state: AssociationState
  /** SI8-UX-2-R1: the LATEST links, for an operation that finishes after this render (never a render-time copy). */
  current(): AssociationState
  dispatch(event: AssociationEvent): void
  /** SI8-UX-2-R1: runs an upload while counting it as in flight (preparation waits for it). */
  trackUpload<T>(op: () => Promise<T>): Promise<T>
  docs: CreatorRecordDocuments
  toolCount: number
  textMode: ExaminationTextMode
  /** Set only when a live AI examination is offered: each examination then needs the creator's explicit permission. */
  aiPermissionRequired: boolean
}

const PENDING_VALUE = ''
const linkValue = (a: Attachment, pending: boolean) => (pending ? PENDING_VALUE : a.tool_index === null ? 'unlinked' : String(a.tool_index))
function choiceOf(value: string): LinkChoice | null {
  if (value === 'unlinked') return { kind: 'unlinked' }
  if (value === 'exclude') return { kind: 'exclude' }
  const n = Number(value)
  return value !== PENDING_VALUE && Number.isInteger(n) && n >= 0 ? { kind: 'tool', tool_index: n } : null
}

/** One document in this version: its link, its type and its optional examination. Never what it appears to show. */
function DocumentRow({ ctx, attachment, outOfRange = false }: { ctx: DocumentsContext; attachment: Attachment; outOfRange?: boolean }) {
  const T = examText(ctx.textMode)
  const [permitted, setPermitted] = useState(false)
  const stored = ctx.docs.documents.find((d) => d.id === attachment.document_id)
  // SI8-UX-2-R1: a link outside the declared tools (defensive; none should arise) is shown as needing a choice, never hidden.
  const pending = ctx.state.pending[attachment.document_id] ?? (outOfRange ? 'tool_removed' : undefined)
  const ex = ctx.docs.examination[attachment.document_id] ?? { kind: 'idle' }
  const id = `cr-doc-${attachment.document_id}`
  const blockedByPermission = ctx.aiPermissionRequired && !permitted
  return (
    <li className="cr-doc" data-document={attachment.document_id} data-pending={pending ?? undefined}>
      <p className="cr-doc-name" id={`${id}-name`}>{stored?.file_name ?? PANEL_TEXT.document_fallback}</p>
      {pending && (
        <p className="cr-notice" role="status" data-needs-choice={pending}>
          {pending === 'tool_removed' ? PANEL_TEXT.needs_choice_removed : PANEL_TEXT.needs_choice_changed}
        </p>
      )}
      <div className="cr-doc-controls">
        <label className="cr-inline-field">
          <span>{T.link_label}</span>
          <select
            value={linkValue(attachment, !!pending)}
            aria-describedby={`${id}-name`}
            onChange={(e) => { const c = choiceOf(e.target.value); if (c) ctx.dispatch({ kind: 'choose', document_id: attachment.document_id, choice: c }) }}
          >
            {pending && <option value={PENDING_VALUE}>{QUESTIONNAIRE_CHROME.choose}</option>}
            {/* A tool already holding the most documents a tool may have is not offered (the server refuses it too). */}
            {Array.from({ length: ctx.toolCount }, (_, i) => (
              <option key={i} value={String(i)} disabled={attachment.tool_index !== i && attachmentsForTool(ctx.state, i).length >= EVIDENCE_MAX_PER_TOOL}>
                {fillReviewText(QUESTIONNAIRE_CHROME.tool_heading, { n: i + 1 })}
              </option>
            ))}
            <option value="unlinked">{T.not_linked}</option>
            <option value="exclude">{PANEL_TEXT.not_in_version}</option>
          </select>
        </label>
        <label className="cr-inline-field">
          <span>{PANEL_TEXT.kind}</span>
          <select value={attachment.category} aria-describedby={`${id}-name`} onChange={(e) => ctx.dispatch({ kind: 'set_category', document_id: attachment.document_id, category: e.target.value })}>
            {EVIDENCE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
      </div>
      <div className="cr-doc-exam">
        {ctx.aiPermissionRequired && ex.kind !== 'done' && (
          <label className="cr-consent" data-ai-permission>
            <input type="checkbox" checked={permitted} onChange={(e) => setPermitted(e.target.checked)} />
            <span>{T.ai_permission_label}</span>
          </label>
        )}
        {ex.kind !== 'done' && (
          <button type="button" className="cr-btn cr-btn-ghost cr-btn-sm" aria-describedby={`${id}-name`} onClick={() => void ctx.docs.examine(attachment.document_id)} disabled={ex.kind === 'working' || blockedByPermission}>
            {ex.kind === 'working' ? T.examining : T.examine}
          </button>
        )}
        {ex.kind === 'done' && <p className="cr-muted" role="status">{T.examined}</p>}
        {ex.kind === 'refused' && (
          <p className="cr-error" role="alert">
            {ex.message}{ex.retry && <> <button type="button" className="cr-link" onClick={() => void ctx.docs.examine(attachment.document_id)} disabled={blockedByPermission}>{T.retry}</button></>}
          </p>
        )}
      </div>
    </li>
  )
}

/** Inside one declared tool's section: its documents, adding a new one, or choosing one already added. */
export function ToolDocuments({ ctx, toolIndex, toolKey }: { ctx: DocumentsContext; toolIndex: number; toolKey: string }) {
  const T = examText(ctx.textMode)
  const [mode, setMode] = useState<'idle' | 'upload' | 'pick'>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const linked = attachmentsForTool(ctx.state, toolIndex)
  const full = linked.length >= EVIDENCE_MAX_PER_TOOL || ctx.state.attachments.length >= EVIDENCE_MAX_PER_RECORD
  const inVersion = new Set(ctx.state.attachments.map((a) => a.document_id))
  const available = ctx.docs.documents.filter((d) => !inVersion.has(d.id))
  const headingId = `cr-tool-docs-${toolIndex}`

  const close = () => { setMode('idle'); setFile(null); setConsent(false) }
  async function upload() {
    if (!file || !consent) return
    setBusy(true)
    setMessage(null)
    // SI8-UX-2-R1: remember WHICH tool block (stable key) and which identity of it the upload began in — never its position.
    const origin = uploadOrigin(ctx.current(), toolKey)
    const r = await ctx.trackUpload(() => ctx.docs.upload(file))
    setBusy(false)
    if (!r.ok) { setMessage({ kind: 'error', text: r.error }); return }
    // Resolved against the links as they are NOW. The same file added again is the same stored document: if it is already in
    // this version (anywhere), nothing moves and no choice is overridden.
    if (ctx.current().attachments.some((a) => a.document_id === r.document.id)) setMessage({ kind: 'info', text: PANEL_TEXT.already_in_version })
    else ctx.dispatch({ kind: 'upload_completed', document_id: r.document.id, category: EVIDENCE_CATEGORY_DEFAULT, origin })
    close()
  }

  const actions = full ? <p className="cr-muted">{EVIDENCE_MESSAGES.too_many_documents}</p> : mode === 'idle' ? (
          <div className="cr-actions">
            <button type="button" className="cr-btn cr-btn-ghost cr-btn-sm" onClick={() => { setMessage(null); setMode('upload') }}>{PANEL_TEXT.add_new_document}</button>
            <button type="button" className="cr-btn cr-btn-ghost cr-btn-sm" onClick={() => { setMessage(null); setMode('pick') }}>{PANEL_TEXT.choose_existing}</button>
          </div>
        ) : mode === 'upload' ? (
          <div className="cr-subpanel" data-upload-panel>
            <input type="file" accept="application/pdf,image/png,image/jpeg" aria-label={PANEL_TEXT.choose_document} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <label className="cr-consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{T.consent_label}</span>
            </label>
            <div className="cr-actions">
              <button type="button" className="cr-btn cr-btn-primary cr-btn-sm" onClick={() => void upload()} disabled={!file || !consent || busy}>{busy ? T.uploading : T.upload}</button>
              <button type="button" className="cr-btn cr-btn-ghost cr-btn-sm" onClick={close} disabled={busy}>{PANEL_TEXT.close}</button>
            </div>
          </div>
        ) : (
          <div className="cr-subpanel" data-picker>
            <p className="cr-subpanel-heading">{PANEL_TEXT.choose_existing}</p>
            {ctx.docs.loading && <p className="cr-muted" role="status">{PANEL_TEXT.loading_documents}</p>}
            {ctx.docs.listError && <p className="cr-error" role="alert">{ctx.docs.listError} <button type="button" className="cr-link" onClick={() => void ctx.docs.reload()}>{T.retry}</button></p>}
            {!ctx.docs.loading && !ctx.docs.listError && available.length === 0 && <p className="cr-muted">{T.no_documents}</p>}
            <ul className="cr-doc-list">
              {available.map((d) => (
                <li key={d.id} className="cr-doc cr-doc-pick" data-pick={d.id}>
                  <p className="cr-doc-name" id={`cr-pick-${d.id}`}>{d.file_name}</p>
                  <button type="button" className="cr-btn cr-btn-ghost cr-btn-sm" aria-describedby={`cr-pick-${d.id}`} onClick={() => { ctx.dispatch({ kind: 'add', document_id: d.id, category: EVIDENCE_CATEGORY_DEFAULT, tool_index: toolIndex }); close() }}>
                    {PANEL_TEXT.add_existing}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="cr-btn cr-btn-ghost cr-btn-sm" onClick={close}>{PANEL_TEXT.close}</button>
          </div>
        )

  return (
    <section className="cr-tool-docs" aria-labelledby={headingId} data-tool-documents={toolIndex}>
      <h4 id={headingId} className="cr-tool-docs-heading">{T.guidance_documents_label}</h4>
      {linked.length === 0 ? <p className="cr-muted">{T.guidance_no_document}</p> : (
        <ul className="cr-doc-list">{linked.map((a) => <DocumentRow key={a.document_id} ctx={ctx} attachment={a} />)}</ul>
      )}
      {message && <p className={message.kind === 'error' ? 'cr-error' : 'cr-notice'} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
      {actions}
    </section>
  )
}

/** After the tools: documents that need a choice, documents not linked to a tool, and the record-level choice to include readings. */
export function RecordDocuments({ ctx, includeExaminations, onIncludeExaminationsChange }: { ctx: DocumentsContext; includeExaminations: boolean; onIncludeExaminationsChange(next: boolean): void }) {
  const T = examText(ctx.textMode)
  const unlinked = unlinkedAttachments(ctx.state)
  // SI8-UX-2-R1: every document that is not on a declared tool is listed here, so none is ever invisible.
  const outside = new Set(outOfRangeDocuments(ctx.state, ctx.toolCount))
  const needsChoice = [...unlinked.filter((a) => ctx.state.pending[a.document_id] !== undefined), ...ctx.state.attachments.filter((a) => outside.has(a.document_id))]
  const plain = unlinked.filter((a) => ctx.state.pending[a.document_id] === undefined)
  return (
    <section className="cr-record-docs" aria-labelledby="cr-record-docs-title" data-record-documents>
      <h3 id="cr-record-docs-title" className="cr-section-subheading">{T.evidence_title}</h3>
      <p className="cr-muted">{T.evidence_intro}</p>
      {needsChoice.length > 0 && (
        <div className="cr-needs-choice" role="group" aria-labelledby="cr-needs-choice-title" data-needs-choice-group>
          <h4 id="cr-needs-choice-title" className="cr-tool-docs-heading">{PANEL_TEXT.needs_choice_heading}</h4>
          <ul className="cr-doc-list">{needsChoice.map((a) => <DocumentRow key={a.document_id} ctx={ctx} attachment={a} outOfRange={outside.has(a.document_id)} />)}</ul>
        </div>
      )}
      {plain.length > 0 && (
        <div role="group" aria-labelledby="cr-unlinked-title" data-unlinked-group>
          <h4 id="cr-unlinked-title" className="cr-tool-docs-heading">{PANEL_TEXT.unlinked_heading}</h4>
          <ul className="cr-doc-list">{plain.map((a) => <DocumentRow key={a.document_id} ctx={ctx} attachment={a} />)}</ul>
        </div>
      )}
      <label className="cr-consent cr-include">
        <input type="checkbox" checked={includeExaminations} onChange={(e) => onIncludeExaminationsChange(e.target.checked)} />
        <span>{T.include_label}<span className="cr-muted cr-block">{T.include_note}</span></span>
      </label>
      <p className="cr-fine" data-legal-links>
        {T.legal_links_intro} <a className="cr-link" href={LEGAL_PATHS.privacy} target="_blank" rel="noopener noreferrer">{T.privacy_link}</a>{PANEL_TEXT.legal_links_and}
        <a className="cr-link" href={LEGAL_PATHS.terms} target="_blank" rel="noopener noreferrer">{T.terms_link}</a>.
      </p>
    </section>
  )
}
