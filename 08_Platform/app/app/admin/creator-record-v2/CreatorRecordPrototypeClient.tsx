'use client'

/**
 * CR-V2-VERTICAL-SLICE-1 — client glue for the internal prototype: shows the
 * questionnaire, posts the answers to the admin draft route, and shows the
 * returned draft record. "Edit answers" returns to the questionnaire with the
 * previous answers, so a changed answer produces a fresh draft. No state is
 * stored anywhere but this component.
 *
 * CR-V2-EVIDENCE-SLICE-1: a document added to a tool block is sent to the
 * admin examine route, which returns what it appears to show; the creator's
 * review of it travels with the answers to the draft route for display only.
 * Nothing is kept anywhere but this component's memory (a reload clears it).
 */

import { useState } from 'react'
import { CreatorRecordQuestionnaire, type ExamineResult } from '@/components/creator-record/CreatorRecordQuestionnaire'
import { DraftRecordView } from '@/components/creator-record/DraftRecordView'
import { PILOT_ACKNOWLEDGEMENTS, PILOT_MAX_TOOLS, PILOT_QUESTION_META, PILOT_REGISTRY_INPUT } from '@/lib/creator-record/pilot/pilot-registry'
import type { DraftRecordView as View } from '@/lib/creator-record/presentation/build-draft-record'
import { DOCUMENT_CONSENT_HEADER, DOCUMENT_CONSENT_VALUE, type ExtractionMode, type ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import type { CreatorRecordFormState, FormIssue } from '@/lib/creator-record/prototype/form'
import { T } from '@/lib/creator-record/presentation/templates'

const SECTION_TITLES: Record<string, string> = {
  project: 'About the video',
  locations: 'Where',
  tools: 'AI tools',
  people: 'People',
  materials: 'Other material in the video',
  contribution: 'Your contribution',
}

export interface PrototypeClientProps {
  planSuggestions: Record<string, string[]>
  examinationMode: ExtractionMode
}

async function examineDocument(toolIndex: number, file: File): Promise<ExamineResult> {
  const body = new FormData()
  body.append('file', file)
  body.append('tool_index', String(toolIndex))
  try {
    // Sent only from the document panel, which is enabled only after the consent statement is ticked.
    const res = await fetch('/api/admin/creator-record-v2/examine', { method: 'POST', headers: { [DOCUMENT_CONSENT_HEADER]: DOCUMENT_CONSENT_VALUE }, body })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.ok && data.document) return { ok: true, document: data.document }
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'You do not have access to this prototype.' }
    if (res.status === 413) return { ok: false, error: 'This file is larger than the 4 MB limit.' }
    if (res.status === 428) return { ok: false, error: 'Please confirm the statement under “Before you add a document” first.' }
    return { ok: false, error: 'The document could not be examined. Please try again.' }
  } catch {
    return { ok: false, error: 'The document could not be examined. Please try again.' }
  }
}

export function CreatorRecordPrototypeClient({ planSuggestions, examinationMode }: PrototypeClientProps) {
  const [lastState, setLastState] = useState<CreatorRecordFormState | undefined>(undefined)
  const [lastDocuments, setLastDocuments] = useState<ToolDocument[]>([])
  const [view, setView] = useState<View | null>(null)
  const [issues, setIssues] = useState<FormIssue[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  const startNewTest = () => {
    setView(null)
    setLastState(undefined)
    setLastDocuments([])
    setIssues([])
    setError(null)
    setFormKey((k) => k + 1)
    window.scrollTo({ top: 0 })
  }
  const buttonClass = 'rounded-md border px-4 py-2 text-sm font-medium bg-white'

  const submit = async (state: CreatorRecordFormState, documents: ToolDocument[]) => {
    setSubmitting(true)
    setError(null)
    setLastState(state)
    setLastDocuments(documents)
    try {
      const res = await fetch('/api/admin/creator-record-v2/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state, documents }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 422 && data?.issues) {
        setIssues(data.issues)
        setError('Some answers need attention.')
        window.scrollTo({ top: 0 })
      } else if (!res.ok || !data?.ok) {
        setError(res.status === 401 || res.status === 403 ? 'You do not have access to this prototype.' : 'The draft could not be prepared. Please try again.')
      } else {
        setIssues([])
        setView(data.view)
        window.scrollTo({ top: 0 })
      }
    } catch {
      setError('The draft could not be prepared. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (view) {
    return (
      <div>
        <div role="status" className="mb-4 rounded-lg border p-4" style={{ borderColor: '#16a34a', backgroundColor: '#F0FDF4' }}>
          <p className="text-sm font-semibold" style={{ color: '#166534' }}>Draft record prepared</p>
          <p className="text-xs mt-1" style={{ color: '#166534' }}>Record {view.header.record_id}. Nothing was saved; this draft exists only on this page.</p>
        </div>
        <div className="mb-6 flex flex-wrap gap-3">
          <button type="button" className={buttonClass} onClick={() => { setView(null); setFormKey((k) => k + 1) }}>Edit answers</button>
          <button type="button" className={buttonClass} onClick={startNewTest}>Start new test</button>
        </div>
        <DraftRecordView view={view} showTrace />
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={buttonClass} onClick={() => { setView(null); setFormKey((k) => k + 1) }}>Edit answers</button>
          <button type="button" className={buttonClass} onClick={startNewTest}>Start new test</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 rounded-lg border p-4" style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }} role="note">
        <p className="text-sm font-semibold" style={{ color: '#92400E' }}>{T.prototype_banner_title}</p>
        {T.prototype_banner_lines.map((l) => <p key={l} className="text-xs mt-1" style={{ color: '#92400E' }}>{l}</p>)}
      </div>
      <div className="mb-4 flex justify-end">
        <button type="button" className={buttonClass} onClick={startNewTest}>Start new test</button>
      </div>
      <h1 className="font-display text-2xl font-bold mb-2" style={{ color: '#1a1918' }}>Creator Record</h1>
      <p className="text-sm mb-8" style={{ color: '#6b6560' }}>Tell us about your AI video. Your answers become a record of what you told us, with general guidance about the tools and materials you name.</p>
      {error && issues.length === 0 && <p className="mb-4 text-sm font-medium" style={{ color: '#b42318' }} role="alert">Error: {error}</p>}
      <CreatorRecordQuestionnaire
        key={formKey}
        registryInput={PILOT_REGISTRY_INPUT}
        presentation={PILOT_QUESTION_META}
        sectionTitles={SECTION_TITLES}
        acknowledgements={PILOT_ACKNOWLEDGEMENTS}
        maxTools={PILOT_MAX_TOOLS}
        planSuggestions={planSuggestions}
        examinationMode={examinationMode}
        initialState={lastState}
        initialDocuments={lastDocuments}
        submitting={submitting}
        issues={issues}
        onExamine={examineDocument}
        onSubmit={submit}
      />
    </div>
  )
}
