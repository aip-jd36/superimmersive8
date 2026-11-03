'use client'

/**
 * CR-V2-MVP-M2 — questionnaire → review of the declarations as recorded → confirm.
 *
 * The server prepares and stores every version; this client only sends the
 * answers (and, for a correction, the draft they correct) and shows what the
 * server recorded. Confirming freezes that version. No uploads are offered.
 *
 * CR-V2-MVP-M3: once confirmed, "Continue to payment" asks the server to create (or
 * return) the submission for that version, then opens the existing checkout. The
 * server re-checks every condition at both steps; `paymentOpen` only hides the button.
 *
 * CR-V2-EXAM-INTEGRATION-X3: only when the page offers examination (`examination`), the creator can add synthetic test
 * documents, examine them, include the findings in a version, and respond to them. Every step goes through the server;
 * a response is recorded by preparing a new version. Without `examination` this client is exactly the v5 journey.
 */
import { useState } from 'react'
import { CreatorRecordQuestionnaire, type QuestionnaireProps } from '@/components/creator-record/CreatorRecordQuestionnaire'
import type { CreatorRecordFormState, FormIssue } from '@/lib/creator-record/prototype/form'
import type { PreparedView } from '@/lib/creator-record/customer-flow/service'
import { V2_REVIEW_PAGE } from '@/lib/creator-record-flow/wording'
import { EvidencePanel } from '@/components/creator-record/EvidencePanel'
import { ExaminationReview } from '@/components/creator-record/ExaminationReview'
import { EXAM_TEXT, attachmentsOf, preparedBody, type Attachment, type ResponseInput } from '@/lib/creator-record-flow/examination-ui'

const SECTION_TITLES: Record<string, string> = {
  project: 'About the video',
  locations: 'Where',
  tools: 'AI tools',
  people: 'People',
  materials: 'Other material in the video',
  contribution: 'Your contribution',
}

const INK = '#1a1918'
const MUTED = '#6b6560'
const LINE = '#e5e2dc'
const FAILED = 'Something went wrong. Nothing was changed.'
const buttonClass = 'rounded-md border px-4 py-2 text-sm font-medium bg-white disabled:opacity-50'
const primaryClass = 'rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50'

interface Props {
  registryInput: QuestionnaireProps['registryInput']
  presentation: QuestionnaireProps['presentation']
  acknowledgements: QuestionnaireProps['acknowledgements']
  maxTools: number
  /** CR-V2-MVP-M3: whether v2 issuance is enabled (display only; the server decides). */
  paymentOpen: boolean
  /** CR-V2-EXAM-INTEGRATION-X3: offered only when the page says so (display only; the server decides). */
  examination?: { consentVersion: string }
}

export function CreatorRecordV2Client(props: Props) {
  const [mode, setMode] = useState<'form' | 'review'>('form')
  const [view, setView] = useState<PreparedView | null>(null)
  const [lastState, setLastState] = useState<CreatorRecordFormState | undefined>(undefined)
  const [issues, setIssues] = useState<FormIssue[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [includeExaminations, setIncludeExaminations] = useState(false)

  async function post(body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch('/api/creator-record-v2/prepared', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (res.ok && json.prepared) {
      setView(json.prepared as PreparedView)
      setMode('review')
      window.scrollTo({ top: 0 })
      return true
    }
    setIssues(Array.isArray(json.issues) ? json.issues : [])
    setError(typeof json.error === 'string' ? json.error : FAILED)
    return false
  }

  /** CR-V2-EXAM-INTEGRATION-X3: responses are recorded on a NEW version with exactly this version's inputs. */
  async function respond(responses: ResponseInput[]) {
    if (!view) return
    setBusy(true)
    setError(null)
    try {
      await post(preparedBody({ state: view.form_state, draftId: view.draft_id, attachments: attachmentsOf(view), includeExaminations: true, responses }))
    } catch {
      setError(FAILED)
    } finally {
      setBusy(false)
    }
  }

  async function submit(state: CreatorRecordFormState) {
    setBusy(true)
    setError(null)
    setIssues([])
    setLastState(state)
    try {
      await post(props.examination
        ? preparedBody({ state, draftId: view?.draft_id ?? null, attachments, includeExaminations })
        : { state, ...(view ? { draft_id: view.draft_id } : {}) })
    } catch {
      setError(FAILED)
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!view) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/creator-record-v2/prepared/${view.id}/review`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.prepared) setView(json.prepared as PreparedView)
      else setError(typeof json.error === 'string' ? json.error : FAILED)
    } catch {
      setError(FAILED)
    } finally {
      setBusy(false)
    }
  }

  async function pay() {
    if (!view) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/creator-record-v2/prepared/${view.id}/purchase`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || typeof json.submission_id !== 'string') {
        setError(typeof json.error === 'string' ? json.error : FAILED)
        return
      }
      const checkout = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId: json.submission_id }),
      })
      const session = await checkout.json().catch(() => ({}))
      if (checkout.ok && typeof session.url === 'string') {
        window.location.assign(session.url)
        return
      }
      setError(typeof session.error === 'string' ? session.error : FAILED)
    } catch {
      setError(FAILED)
    } finally {
      setBusy(false)
    }
  }

  function correct() {
    if (!view) return
    setLastState(view.form_state)
    if (props.examination) {
      setAttachments(attachmentsOf(view))
      setIncludeExaminations(view.examination !== undefined)
    }
    setMode('form')
    setFormKey((k) => k + 1)
    window.scrollTo({ top: 0 })
  }

  if (mode === 'review' && view) {
    const reviewed = view.status === 'reviewed'
    const single = view.declarations.answers.filter((a) => a.tool_index === null)
    const tools = Array.from(new Set(view.declarations.answers.filter((a) => a.tool_index !== null).map((a) => a.tool_index as number))).sort((a, b) => a - b)
    return (
      <div>
        <h1 className="font-display text-2xl font-bold mb-2" style={{ color: INK }}>Check your declarations</h1>
        <p className="text-sm mb-6" style={{ color: MUTED }}>
          This is exactly what SI8 recorded from your answers (version {view.version}). SI8 has not checked them. If anything is wrong, correct your answers. The corrected version is then the one you review.
        </p>
        {reviewed && (
          <div role="status" className="mb-6 rounded-lg border p-4" style={{ borderColor: '#16a34a', backgroundColor: '#F0FDF4' }}>
            <p className="text-sm font-semibold" style={{ color: '#166534' }}>{props.paymentOpen ? V2_REVIEW_PAGE.confirmed : V2_REVIEW_PAGE.payment_closed}</p>
          </div>
        )}
        {error && <p className="mb-4 text-sm font-medium" style={{ color: '#b42318' }} role="alert">{error}</p>}
        <section className="mb-6 rounded-lg border bg-white p-6" style={{ borderColor: LINE }} aria-labelledby="decl-answers">
          <h2 id="decl-answers" className="font-display text-lg font-semibold mb-3" style={{ color: INK }}>Your answers</h2>
          <dl className="space-y-3">
            {single.map((a, i) => (
              <div key={`s-${a.q_id}-${i}`}>
                <dt className="text-sm font-medium" style={{ color: INK }}>{a.question}</dt>
                <dd className="text-sm" style={{ color: MUTED }}>{a.answer}</dd>
              </div>
            ))}
          </dl>
          {tools.map((t) => (
            <div key={`tool-${t}`} className="mt-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: INK }}>Tool {t + 1}</h3>
              <dl className="space-y-3">
                {view.declarations.answers.filter((a) => a.tool_index === t).map((a, i) => (
                  <div key={`t-${t}-${a.q_id}-${i}`}>
                    <dt className="text-sm font-medium" style={{ color: INK }}>{a.question}</dt>
                    <dd className="text-sm" style={{ color: MUTED }}>{a.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </section>
        {view.examination && <ExaminationReview key={view.id} view={view} busy={busy} onRespond={(r) => void respond(r)} />}
        <section className="mb-6 rounded-lg border bg-white p-6" style={{ borderColor: LINE }} aria-labelledby="decl-acks">
          <h2 id="decl-acks" className="font-display text-lg font-semibold mb-3" style={{ color: INK }}>What you acknowledged</h2>
          <ul className="list-disc pl-5 space-y-2">
            {view.declarations.acknowledgements.map((a) => <li key={a.id} className="text-sm" style={{ color: MUTED }}>{a.text}</li>)}
          </ul>
        </section>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={buttonClass} onClick={correct} disabled={busy}>Correct my answers</button>
          {!reviewed && (
            <button type="button" className={primaryClass} style={{ backgroundColor: INK }} onClick={confirm} disabled={busy}>
              {busy ? 'Confirming…' : 'Confirm these declarations'}
            </button>
          )}
          {reviewed && props.paymentOpen && view.examination && (
            <p className="text-sm" style={{ color: MUTED }} role="status">{EXAM_TEXT.payment_blocked}</p>
          )}
          {reviewed && props.paymentOpen && !view.examination && (
            <button type="button" className={primaryClass} style={{ backgroundColor: INK }} onClick={pay} disabled={busy}>
              {busy ? V2_REVIEW_PAGE.paying : V2_REVIEW_PAGE.pay}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-2" style={{ color: INK }}>Creator Record</h1>
      <p className="text-sm mb-8" style={{ color: MUTED }}>
        Tell us about your video and how you made it. You will check your declarations before anything is completed. SI8 does not check your answers.
      </p>
      {error && issues.length === 0 && <p className="mb-4 text-sm font-medium" style={{ color: '#b42318' }} role="alert">{error}</p>}
      <CreatorRecordQuestionnaire
        key={formKey}
        registryInput={props.registryInput}
        presentation={props.presentation}
        sectionTitles={SECTION_TITLES}
        acknowledgements={props.acknowledgements}
        maxTools={props.maxTools}
        initialState={lastState}
        submitting={busy}
        issues={issues}
        onSubmit={(state) => submit(state)}
      />
      {props.examination && (
        <EvidencePanel
          consentVersion={props.examination.consentVersion}
          maxTools={props.maxTools}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          includeExaminations={includeExaminations}
          onIncludeExaminationsChange={setIncludeExaminations}
        />
      )}
    </div>
  )
}
