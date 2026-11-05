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
 * a response is recorded by preparing a new version. Without `examination` this client has no documents or examination.
 *
 * CR-V2-DECL-1B-2: every submission names the contract of the questionnaire on screen. If the server answers
 * `questionnaire_changed`, the form is withdrawn and nothing is resubmitted. The creator asks for the updated questions, which
 * arrive in one server render with their digest; answers that still mean the same are kept (`questionnaire-recovery`), the rest
 * are reported, and only a new explicit submit sends anything. A response is never turned into a correction: it names its own
 * version's contract, and if refused it stays refused until the creator chooses "Correct my answers".
 */
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CreatorRecordQuestionnaire, type QuestionnaireProps } from '@/components/creator-record/CreatorRecordQuestionnaire'
import type { CreatorRecordFormState, FormIssue } from '@/lib/creator-record/prototype/form'
import { CUSTOMER_SECTION_TITLES } from '@/lib/creator-record/prototype/questionnaire-structure'
import type { PreparedView } from '@/lib/creator-record/customer-flow/service'
import { V2_REVIEW_PAGE } from '@/lib/creator-record-flow/wording'
import { EvidencePanel } from '@/components/creator-record/EvidencePanel'
import { ExaminationReview } from '@/components/creator-record/ExaminationReview'
import { EXAM_TEXT, SYNTHETIC_UAT_NOTICE, attachmentsOf, preparedBody, type Attachment, type ResponseInput } from '@/lib/creator-record-flow/examination-ui'
import { carryAnswersToContract, RECOVERY_TEXT, type QuestionnaireDefinition, type QuestionnaireRecovery } from '@/lib/creator-record-flow/questionnaire-recovery'

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
  /** CR-V2-DECL-1B-2: the approved contract of exactly the questionnaire in these props, from the same server render. */
  questionnaireContractSha256: string
  /** CR-V2-MVP-M3: whether v2 issuance is enabled (display only; the server decides). */
  paymentOpen: boolean
  /** CR-V2-EXAM-INTEGRATION-X3: offered only when the page says so (display only; the server decides). */
  examination?: { consentVersion: string }
  /** This session is on synthetic inputs (display only; the server decides). */
  syntheticUat?: boolean
  /** The admin UAT page's own API routes. Defaults to the customer routes. */
  apiBase?: string
  /** A version to open on arrival (admin UAT: reopening an earlier version). */
  initialView?: PreparedView | null
}

const definitionOf = (p: Props): QuestionnaireDefinition => ({ registryInput: p.registryInput, presentation: p.presentation, acknowledgements: p.acknowledgements, maxTools: p.maxTools })

export function CreatorRecordV2Client(props: Props) {
  const apiBase = props.apiBase ?? '/api/creator-record-v2'
  const router = useRouter()
  const [mode, setMode] = useState<'form' | 'review'>(props.initialView ? 'review' : 'form')
  const [view, setView] = useState<PreparedView | null>(props.initialView ?? null)
  const [lastState, setLastState] = useState<CreatorRecordFormState | undefined>(undefined)
  const [issues, setIssues] = useState<FormIssue[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [includeExaminations, setIncludeExaminations] = useState(false)
  // The questionnaire actually on screen, and the digest that identifies it.
  const [displayed, setDisplayed] = useState(() => ({ sha256: props.questionnaireContractSha256, definition: definitionOf(props) }))
  // CR-V2-DECL-1B-2: the server said this questionnaire is out of date. The form is withdrawn until the update has arrived.
  const [questionnaireChanged, setQuestionnaireChanged] = useState(false)
  const [updateRequested, setUpdateRequested] = useState(false)
  const [updating, startUpdate] = useTransition()
  const [recovery, setRecovery] = useState<QuestionnaireRecovery | null>(null)
  const [earlierAnswers, setEarlierAnswers] = useState<PreparedView['declarations']['answers'] | null>(null)

  // A different questionnaire arrived: keep only the answers that still mean the same, and report the rest. Sends nothing.
  useEffect(() => {
    if (props.questionnaireContractSha256 === displayed.sha256) return
    const next = definitionOf(props)
    const carried = carryAnswersToContract(displayed.definition, next, lastState)
    setDisplayed({ sha256: props.questionnaireContractSha256, definition: next })
    setLastState(carried.state)
    setRecovery(carried.recovery)
    setEarlierAnswers(null)
    if (carried.state) setAttachments((list) => list.filter((a) => a.tool_index === null || a.tool_index < carried.state!.tools.length))
    setIssues([])
    setError(null)
    setQuestionnaireChanged(false)
    setUpdateRequested(false)
    setFormKey((k) => k + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.questionnaireContractSha256])

  async function post(body: Record<string, unknown>): Promise<{ ok: boolean; code?: unknown }> {
    const res = await fetch(`${apiBase}/prepared`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (res.ok && json.prepared) {
      setView(json.prepared as PreparedView)
      setMode('review')
      window.scrollTo({ top: 0 })
      return { ok: true }
    }
    setIssues(Array.isArray(json.issues) ? json.issues : [])
    setError(typeof json.error === 'string' ? json.error : FAILED)
    return { ok: false, code: json.code }
  }

  /** CR-V2-EXAM-INTEGRATION-X3: responses are recorded on a NEW version with exactly this version's inputs. */
  async function respond(responses: ResponseInput[]) {
    if (!view) return
    setBusy(true)
    setError(null)
    try {
      // This version's own contract, never the page's: a response must not rebuild it under another questionnaire.
      const r = await post(preparedBody({ state: view.form_state, contractSha256: view.questionnaire_contract?.contract_sha256 ?? null, draftId: view.draft_id, attachments: attachmentsOf(view), includeExaminations: true, responses }))
      if (r.code === 'questionnaire_changed') setError(RECOVERY_TEXT.respond_blocked)
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
      const r = await post(props.examination
        ? preparedBody({ state, contractSha256: displayed.sha256, draftId: view?.draft_id ?? null, attachments, includeExaminations })
        : { state, questionnaire_contract_sha256: displayed.sha256, ...(view ? { draft_id: view.draft_id } : {}) })
      if (r.code === 'questionnaire_changed') {
        setQuestionnaireChanged(true)
        setUpdateRequested(false)
        setRecovery(null)
        setError(null)
      } else if (r.ok) {
        setRecovery(null)
        setEarlierAnswers(null)
      }
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
      const res = await fetch(`${apiBase}/prepared/${view.id}/review`, { method: 'POST' })
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
    // Another contract (or a schema 5 or 6 version, which names none): its answers are shown for reference, not filled in.
    const sameQuestionnaire = view.questionnaire_contract?.contract_sha256 === displayed.sha256
    setLastState(sameQuestionnaire ? view.form_state : undefined)
    setEarlierAnswers(sameQuestionnaire ? null : view.declarations.answers)
    setRecovery(null)
    setError(null)
    if (props.examination) {
      setAttachments(attachmentsOf(view))
      setIncludeExaminations(view.examination !== undefined)
    }
    setMode('form')
    setFormKey((k) => k + 1)
    window.scrollTo({ top: 0 })
  }

  const uatNotice = props.syntheticUat ? (
    <div role="note" className="mb-6 rounded-lg border-2 p-4" style={{ borderColor: '#b42318', backgroundColor: '#FEF3F2' }} data-synthetic-uat>
      <p className="text-sm font-semibold" style={{ color: '#b42318' }}>{SYNTHETIC_UAT_NOTICE.title}</p>
      <p className="text-sm" style={{ color: '#7a271a' }}>{SYNTHETIC_UAT_NOTICE.body}</p>
    </div>
  ) : null

  if (mode === 'review' && view) {
    const reviewed = view.status === 'reviewed'
    const single = view.declarations.answers.filter((a) => a.tool_index === null)
    const tools = Array.from(new Set(view.declarations.answers.filter((a) => a.tool_index !== null).map((a) => a.tool_index as number))).sort((a, b) => a - b)
    return (
      <div>
        {uatNotice}
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

  if (questionnaireChanged) {
    return (
      <div>
        {uatNotice}
        <div role="alert" className="rounded-lg border p-6" style={{ borderColor: '#b42318', backgroundColor: '#FEF3F2' }} data-questionnaire-changed>
          <h1 className="font-display text-xl font-bold mb-2" style={{ color: INK }}>{RECOVERY_TEXT.changed_heading}</h1>
          <p className="text-sm mb-4" style={{ color: INK }}>{RECOVERY_TEXT.changed_body}</p>
          {updateRequested && !updating && <p className="text-sm font-medium mb-4" style={{ color: '#b42318' }}>{RECOVERY_TEXT.load_failed}</p>}
          <button type="button" className={primaryClass} style={{ backgroundColor: INK }} disabled={updating} onClick={() => { setUpdateRequested(true); startUpdate(() => router.refresh()) }}>
            {updating ? RECOVERY_TEXT.loading : RECOVERY_TEXT.load}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {uatNotice}
      <h1 className="font-display text-2xl font-bold mb-2" style={{ color: INK }}>Creator Record</h1>
      <p className="text-sm mb-8" style={{ color: MUTED }}>
        Tell us about your video and how you made it. You will check your declarations before anything is completed. SI8 does not check your answers.
      </p>
      {error && issues.length === 0 && <p className="mb-4 text-sm font-medium" style={{ color: '#b42318' }} role="alert">{error}</p>}
      {recovery && (
        <section role="status" className="mb-6 rounded-lg border p-4 text-sm" style={{ borderColor: LINE, backgroundColor: '#FFFBEB' }} data-questionnaire-updated>
          <h2 className="font-semibold mb-1" style={{ color: INK }}>{RECOVERY_TEXT.updated_heading}</h2>
          <p className="mb-2" style={{ color: MUTED }}>{RECOVERY_TEXT.updated_body}</p>
          {recovery.changes.length > 0 && (
            <ul className="list-disc pl-5 space-y-2 mb-2">
              {recovery.changes.map((c, i) => (
                <li key={`${c.q_id}-${c.tool_index}-${i}`} data-answer-change={c.reason}>
                  <span className="font-medium" style={{ color: INK }}>{c.tool_index !== null ? `Tool ${c.tool_index + 1}: ` : ''}{c.question}</span>
                  <br />{RECOVERY_TEXT.reasons[c.reason]}. {RECOVERY_TEXT.earlier_answer}: {c.previous}
                </li>
              ))}
            </ul>
          )}
          {recovery.added_questions.length > 0 && (
            <p className="mb-2" style={{ color: MUTED }} data-added-questions>{RECOVERY_TEXT.added_heading}: {recovery.added_questions.join('; ')}</p>
          )}
          {recovery.acknowledgements_cleared && <p className="font-medium" style={{ color: INK }} data-acknowledgements-cleared>{RECOVERY_TEXT.acknowledgements}</p>}
        </section>
      )}
      {earlierAnswers && (
        <section role="status" className="mb-6 rounded-lg border p-4 text-sm" style={{ borderColor: LINE, backgroundColor: '#FFFBEB' }} data-earlier-answers>
          <h2 className="font-semibold mb-1" style={{ color: INK }}>{RECOVERY_TEXT.correction_heading}</h2>
          <p className="mb-2" style={{ color: MUTED }}>{RECOVERY_TEXT.correction_body}</p>
          <dl className="space-y-2">
            {earlierAnswers.map((a, i) => (
              <div key={`${a.q_id}-${a.tool_index}-${i}`}>
                <dt className="font-medium" style={{ color: INK }}>{a.tool_index !== null ? `Tool ${a.tool_index + 1}: ` : ''}{a.question}</dt>
                <dd style={{ color: MUTED }}>{a.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <CreatorRecordQuestionnaire
        key={formKey}
        registryInput={props.registryInput}
        presentation={props.presentation}
        sectionTitles={CUSTOMER_SECTION_TITLES}
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
          apiBase={apiBase}
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
