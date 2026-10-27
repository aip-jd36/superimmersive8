'use client'

/**
 * CR-V2-WORK-UAT-HARNESS-2 — client for the public UAT harness. Reuses the
 * Creator Record questionnaire and record view unchanged; differs from the
 * admin client only in what it sends and shows:
 *   - documents are chosen from SI8's synthetic test set (no upload); on
 *     submit only `{ tool_index, fixture_id, review }` is sent — the server
 *     rebuilds every observation itself;
 *   - the record is rendered without trace or internal references;
 *   - GA4 measurement is disabled for this page (also set by the root layout
 *     on a direct load of a /uat path).
 * Nothing is stored anywhere but this component's memory.
 */

import { useEffect, useState } from 'react'
import { CreatorRecordQuestionnaire, type FixtureDocumentOption } from '@/components/creator-record/CreatorRecordQuestionnaire'
import { DraftRecordView } from '@/components/creator-record/DraftRecordView'
import { GA_MEASUREMENT_ID } from '@/lib/analytics/ga-snippet'
import { PILOT_ACKNOWLEDGEMENTS, PILOT_MAX_TOOLS, PILOT_QUESTION_META, PILOT_REGISTRY_INPUT } from '@/lib/creator-record/pilot/pilot-registry'
import type { ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import type { CreatorRecordFormState, FormIssue } from '@/lib/creator-record/prototype/form'
import type { PublicUatView } from '@/lib/creator-record/public-uat/build-public-uat-draft'
import { T } from '@/lib/creator-record/presentation/templates'

const SECTION_TITLES: Record<string, string> = {
  project: 'About the video',
  locations: 'Where',
  tools: 'AI tools',
  people: 'People',
  materials: 'Other material in the video',
  contribution: 'Your contribution',
}

export interface PublicUatClientProps {
  planSuggestions: Record<string, string[]>
  fixtureDocuments: FixtureDocumentOption[]
  closesAt: string
}

/** Only fixture ids and the creator's choice leave the browser. */
export const toFixtureRefs = (documents: readonly ToolDocument[]) =>
  documents
    .filter((d) => d.document.replay_fixture_id !== null)
    .map((d) => ({ tool_index: d.tool_index, fixture_id: d.document.replay_fixture_id as string, review: { decision: d.review.decision, adopted_value: d.review.adopted_value } }))

export function PublicUatClient({ planSuggestions, fixtureDocuments, closesAt }: PublicUatClientProps) {
  const [lastState, setLastState] = useState<CreatorRecordFormState | undefined>(undefined)
  const [lastDocuments, setLastDocuments] = useState<ToolDocument[]>([])
  const [view, setView] = useState<PublicUatView | null>(null)
  const [issues, setIssues] = useState<FormIssue[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    ;(window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = true
  }, [])

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
      const res = await fetch('/api/uat/creator-record-v2/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state, documents: toFixtureRefs(documents) }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 422 && data?.issues) {
        setIssues(data.issues)
        setError('Some answers need attention.')
        window.scrollTo({ top: 0 })
      } else if (res.status === 404) {
        setError(T.public_uat_closed)
      } else if (!res.ok || !data?.ok) {
        setError('The draft could not be prepared. Please try again.')
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

  const banner = (
    <div className="mb-6 rounded-lg border p-4" style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }} role="note">
      <p className="text-sm font-semibold" style={{ color: '#92400E' }}>{T.public_uat_designation}</p>
      {T.public_uat_banner_lines.map((l) => <p key={l} className="text-xs mt-1" style={{ color: '#92400E' }}>{l}</p>)}
      <p className="text-xs mt-1" style={{ color: '#92400E' }}>This test harness closes on {closesAt.slice(0, 10)}.</p>
    </div>
  )

  if (view) {
    return (
      <div>
        <div role="status" className="mb-4 rounded-lg border p-4" style={{ borderColor: '#16a34a', backgroundColor: '#F0FDF4' }}>
          <p className="text-sm font-semibold" style={{ color: '#166534' }}>{T.public_uat_prepared}</p>
          <p className="text-xs mt-1" style={{ color: '#166534' }}>Record {view.header.record_id}. Nothing was saved; this draft exists only on this page.</p>
        </div>
        <div className="mb-6 flex flex-wrap gap-3">
          <button type="button" className={buttonClass} onClick={() => { setView(null); setFormKey((k) => k + 1) }}>Edit answers</button>
          <button type="button" className={buttonClass} onClick={startNewTest}>Start new test</button>
        </div>
        <DraftRecordView view={view} showTrace={false} showReferences={false} />
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={buttonClass} onClick={() => { setView(null); setFormKey((k) => k + 1) }}>Edit answers</button>
          <button type="button" className={buttonClass} onClick={startNewTest}>Start new test</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {banner}
      <div className="mb-4 flex justify-end">
        <button type="button" className={buttonClass} onClick={startNewTest}>Start new test</button>
      </div>
      <h1 className="font-display text-2xl font-bold mb-2" style={{ color: '#1a1918' }}>Creator Record — public UAT harness</h1>
      <p className="text-sm mb-8" style={{ color: '#6b6560' }}>{T.public_uat_page_intro}</p>
      {error && issues.length === 0 && <p className="mb-4 text-sm font-medium" style={{ color: '#b42318' }} role="alert">Error: {error}</p>}
      <CreatorRecordQuestionnaire
        key={formKey}
        registryInput={PILOT_REGISTRY_INPUT}
        presentation={PILOT_QUESTION_META}
        sectionTitles={SECTION_TITLES}
        acknowledgements={PILOT_ACKNOWLEDGEMENTS}
        maxTools={PILOT_MAX_TOOLS}
        planSuggestions={planSuggestions}
        examinationMode="fixture_replay"
        fixtureDocuments={fixtureDocuments}
        initialState={lastState}
        initialDocuments={lastDocuments}
        submitting={submitting}
        issues={issues}
        onSubmit={submit}
      />
    </div>
  )
}
