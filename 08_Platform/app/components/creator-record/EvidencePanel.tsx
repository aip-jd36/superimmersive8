'use client'

/**
 * CR-V2-EXAM-INTEGRATION-X3 — the creator's documents for a version: add one through the existing evidence intake
 * (`/api/creator-record-v2/evidence`), examine one through the X2 route (`…/evidence/[id]/examination`), and link each
 * to a tool for the next version. The server decides everything (gates, ownership, synthetic-only lock, examination
 * authority); this panel only sends the creator's choices and shows the server's answers. No grant, nonce, envelope or
 * credential is ever sent or shown. Wording: DRAFT, not approved (see examination-ui.ts).
 */
import { useCallback, useEffect, useState } from 'react'
import { EXAM_TEXT, EVIDENCE_CATEGORIES, EVIDENCE_CATEGORY_DEFAULT, examineStateFrom, type Attachment, type ExamineState } from '@/lib/creator-record-flow/examination-ui'

const INK = '#1a1918'
const MUTED = '#6b6560'
const LINE = '#e5e2dc'
const FAILED = 'Something went wrong. Nothing was changed.'

/** Exactly the evidence list route's view (stored documents only). */
export interface EvidenceDocument { id: string; file_name: string; media_type: string; byte_size: number; sha256: string; created_at: string }

export interface EvidencePanelProps {
  /** The consent identifier the intake requires (passed from the server page). */
  consentVersion: string
  maxTools: number
  attachments: Attachment[]
  onAttachmentsChange: (next: Attachment[]) => void
  includeExaminations: boolean
  onIncludeExaminationsChange: (next: boolean) => void
  /** Server-rendered tests pass a list; the browser loads it. */
  initialDocuments?: EvidenceDocument[]
  /** The admin UAT page's own API routes. Defaults to the customer routes. */
  apiBase?: string
}

export function EvidencePanel(props: EvidencePanelProps) {
  const apiBase = props.apiBase ?? '/api/creator-record-v2'
  const [documents, setDocuments] = useState<EvidenceDocument[]>(props.initialDocuments ?? [])
  const [loading, setLoading] = useState(props.initialDocuments === undefined)
  const [listError, setListError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [consent, setConsent] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [examine, setExamine] = useState<Record<string, ExamineState>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const res = await fetch(`${apiBase}/evidence`)
      const json = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(json.documents)) setDocuments(json.documents as EvidenceDocument[])
      else setListError(typeof json.error === 'string' ? json.error : FAILED)
    } catch {
      setListError(FAILED)
    } finally {
      setLoading(false)
    }
  }, [apiBase])
  useEffect(() => { if (props.initialDocuments === undefined) void load() }, [load, props.initialDocuments])

  async function upload() {
    if (!file || !consent) return
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('consent', props.consentVersion)
      const res = await fetch(`${apiBase}/evidence`, { method: 'POST', body: form })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setUploadError(typeof json.error === 'string' ? json.error : FAILED)
      else { setFile(null); await load() }
    } catch {
      setUploadError(FAILED)
    } finally {
      setUploading(false)
    }
  }

  async function runExamination(id: string) {
    setExamine((s) => ({ ...s, [id]: { kind: 'working' } }))
    try {
      const res = await fetch(`${apiBase}/evidence/${id}/examination`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      setExamine((s) => ({ ...s, [id]: examineStateFrom(res.status, json) }))
    } catch {
      setExamine((s) => ({ ...s, [id]: { kind: 'refused', message: FAILED, retry: true } }))
    }
  }

  const attachmentOf = (id: string) => props.attachments.find((a) => a.document_id === id)
  function setLink(id: string, value: string) {
    const rest = props.attachments.filter((a) => a.document_id !== id)
    if (value === 'none') return props.onAttachmentsChange(rest)
    const tool_index = value === 'unlinked' ? null : Number(value)
    props.onAttachmentsChange([...rest, { document_id: id, category: attachmentOf(id)?.category ?? EVIDENCE_CATEGORY_DEFAULT, tool_index }])
  }
  function setCategory(id: string, category: string) {
    props.onAttachmentsChange(props.attachments.map((a) => (a.document_id === id ? { ...a, category } : a)))
  }

  const stored = documents
  return (
    <section className="mt-8 rounded-lg border bg-white p-6" style={{ borderColor: LINE }} aria-labelledby="evidence-title">
      <h2 id="evidence-title" className="font-display text-lg font-semibold mb-2" style={{ color: INK }}>{EXAM_TEXT.evidence_title}</h2>
      <p className="text-sm mb-4" style={{ color: MUTED }}>{EXAM_TEXT.evidence_intro}</p>

      <div className="mb-5 space-y-2">
        <input type="file" accept="application/pdf,image/png,image/jpeg" aria-label="Choose a document" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <label className="flex items-start gap-2 text-sm" style={{ color: MUTED }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{EXAM_TEXT.consent_label}</span>
        </label>
        <button type="button" className="rounded-md border px-3 py-1.5 text-sm font-medium bg-white disabled:opacity-50" onClick={upload} disabled={!file || !consent || uploading}>
          {uploading ? EXAM_TEXT.uploading : EXAM_TEXT.upload}
        </button>
        {uploadError && <p className="text-sm font-medium" style={{ color: '#b42318' }} role="alert">{uploadError}</p>}
      </div>

      {loading && <p className="text-sm" style={{ color: MUTED }} role="status">Loading documents…</p>}
      {listError && (
        <p className="text-sm font-medium" style={{ color: '#b42318' }} role="alert">
          {listError} <button type="button" className="underline" onClick={() => void load()}>{EXAM_TEXT.retry}</button>
        </p>
      )}
      {!loading && !listError && stored.length === 0 && <p className="text-sm" style={{ color: MUTED }}>{EXAM_TEXT.no_documents}</p>}

      <ul className="space-y-4">
        {stored.map((d) => {
          const a = attachmentOf(d.id)
          const ex = examine[d.id] ?? { kind: 'idle' }
          return (
            <li key={d.id} className="rounded-md border p-3" style={{ borderColor: LINE }} data-document={d.id}>
              <p className="text-sm font-medium" style={{ color: INK }}>{d.file_name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <label style={{ color: MUTED }}>
                  {EXAM_TEXT.link_label}{' '}
                  <select value={a ? (a.tool_index === null ? 'unlinked' : String(a.tool_index)) : 'none'} onChange={(e) => setLink(d.id, e.target.value)}>
                    <option value="none">Not in this version</option>
                    <option value="unlinked">{EXAM_TEXT.not_linked}</option>
                    {Array.from({ length: props.maxTools }, (_, i) => <option key={i} value={String(i)}>Tool {i + 1}</option>)}
                  </select>
                </label>
                {a && (
                  <label style={{ color: MUTED }}>
                    Kind{' '}
                    <select value={a.category} onChange={(e) => setCategory(d.id, e.target.value)}>
                      {EVIDENCE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                    </select>
                  </label>
                )}
                <button type="button" className="rounded-md border px-3 py-1 text-sm bg-white disabled:opacity-50" onClick={() => void runExamination(d.id)} disabled={ex.kind === 'working' || ex.kind === 'done'}>
                  {ex.kind === 'working' ? EXAM_TEXT.examining : EXAM_TEXT.examine}
                </button>
              </div>
              {ex.kind === 'done' && <p className="mt-2 text-sm" style={{ color: MUTED }} role="status">{EXAM_TEXT.examined}</p>}
              {ex.kind === 'refused' && (
                <p className="mt-2 text-sm font-medium" style={{ color: '#b42318' }} role="alert">
                  {ex.message}{ex.retry && <> <button type="button" className="underline" onClick={() => void runExamination(d.id)}>{EXAM_TEXT.retry}</button></>}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <label className="mt-5 flex items-start gap-2 text-sm" style={{ color: INK }}>
        <input type="checkbox" checked={props.includeExaminations} onChange={(e) => props.onIncludeExaminationsChange(e.target.checked)} />
        <span>{EXAM_TEXT.include_label}<span className="block" style={{ color: MUTED }}>{EXAM_TEXT.include_note}</span></span>
      </label>
    </section>
  )
}
