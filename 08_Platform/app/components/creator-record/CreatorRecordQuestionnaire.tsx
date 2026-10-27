'use client'

/**
 * CR-V2-VERTICAL-SLICE-1 — Creator Record v2 questionnaire (intended for reuse
 * by the eventual customer product).
 *
 * Generic: it renders whatever the supplied registry and presentation define.
 * Which questions are shown is decided ONLY by the contract's
 * `eligibleQuestions()` (via `visibleQuestions` / `visibleToolQuestions`),
 * recomputed on every change, so changing an earlier answer hides dependent
 * questions immediately. It holds no governance, applicability or guidance
 * logic.
 *
 * CR-V2-EVIDENCE-SLICE-1:
 *   - `select` questions are native dropdowns (tools and services come from
 *     the canonical identity registries via the pilot registry);
 *   - the `plan` question offers the governed plan names for the chosen tool
 *     as PARTIAL suggestions, plus "Another plan" (typed) and "Not sure";
 *   - each tool block can carry one optional billing document. What it
 *     appears to show is displayed read-only; the creator may adopt a plan
 *     name it shows as their own answer, give their own answer, or ignore it.
 *     Changing the tool clears the plan answer and the document choice, so no
 *     stale answer survives a correction.
 *
 * CR-V2-WORK-UAT-HARNESS-2: with `fixtureDocuments` (and no `onExamine`) the
 * document panel offers a choice from SI8's synthetic test set instead of a
 * file input. The observations shown come from the server; on submit the
 * caller sends only the chosen fixture id and the review.
 */

import { useMemo, useState } from 'react'
import { loadQuestionRegistry, NOT_SURE, type RegistryInput } from '@/lib/creator-record/contract/question-registry'
import type { ExaminedDocument, ExtractionMode, ReviewDecision, ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import { visibleQuestions, visibleToolQuestions, type CreatorRecordFormState, type FormConfig, type FormIssue, type QuestionPresentation } from '@/lib/creator-record/prototype/form'
import { DocumentReviewPanel } from './DocumentReviewPanel'

export type ExamineResult = { ok: true; document: ExaminedDocument } | { ok: false; error: string }
export interface FixtureDocumentOption {
  fixture_id: string
  label: string
  document: ExaminedDocument
}

export interface QuestionnaireProps {
  registryInput: RegistryInput
  presentation: Readonly<Record<string, QuestionPresentation & { section: string; text: string; help: string | null }>>
  sectionTitles: Readonly<Record<string, string>>
  acknowledgements: Readonly<Record<string, string>>
  maxTools: number
  /** Partial plan-name suggestions per canonical tool id (server-computed). */
  planSuggestions?: Readonly<Record<string, readonly string[]>>
  examinationMode?: ExtractionMode
  initialState?: CreatorRecordFormState
  initialDocuments?: readonly ToolDocument[]
  submitting: boolean
  issues: FormIssue[]
  /** Examines one document; omitted → no document upload is offered. */
  onExamine?: (toolIndex: number, file: File) => Promise<ExamineResult>
  /** Synthetic test documents to choose from instead of uploading (public UAT harness). */
  fixtureDocuments?: readonly FixtureDocumentOption[]
  onSubmit: (state: CreatorRecordFormState, documents: ToolDocument[]) => void
}

const SECTION_ORDER = ['project', 'locations', 'tools', 'people', 'materials', 'contribution']
const EMPTY: CreatorRecordFormState = { answers: {}, tools: [{}], acknowledgements: {} }
const ANOTHER = '__another_plan'
const UNSURE = '__not_sure'

const ISSUE_TEXT: Record<FormIssue['issue'], string> = {
  required: 'Please answer this question.',
  invalid_option: 'Please choose one of the options.',
  too_long: 'Please shorten this answer.',
  single_choice_only: 'Please choose one option.',
  too_many_tools: 'Too many tools.',
  no_tools: 'Please add at least one tool.',
  acknowledgement_required: 'Please confirm this statement.',
  unknown_question: 'Unexpected answer.',
  stale_document_review: 'Your plan answer is no longer the value you chose from the document. Please make your choice about the document again.',
}

const docsFrom = (tools: number, initial: readonly ToolDocument[] | undefined): (ToolDocument | null)[] =>
  Array.from({ length: tools }, (_, i) => initial?.find((d) => d.tool_index === i) ?? null)

export function CreatorRecordQuestionnaire(props: QuestionnaireProps) {
  const initial = props.initialState ?? EMPTY
  const [state, setState] = useState<CreatorRecordFormState>(initial)
  const [docs, setDocs] = useState<(ToolDocument | null)[]>(() => docsFrom(initial.tools.length, props.initialDocuments))
  const [anotherPlan, setAnotherPlan] = useState<boolean[]>(() => initial.tools.map(() => false))
  const [consented, setConsented] = useState<boolean>((props.initialDocuments ?? []).length > 0)
  const [examining, setExamining] = useState<number | null>(null)
  const [docErrors, setDocErrors] = useState<Record<number, string>>({})

  const config: FormConfig = useMemo(() => {
    const r = loadQuestionRegistry(props.registryInput)
    if (!r.ok) throw new Error(r.errors.join('; '))
    return { registry: r.registry, presentation: props.presentation, acknowledgement_ids: Object.keys(props.acknowledgements), max_tools: props.maxTools }
  }, [props.registryInput, props.presentation, props.acknowledgements, props.maxTools])

  const shown = visibleQuestions(config, state.answers)
  const issueFor = (q_id: string, tool_index: number | null) => props.issues.find((i) => i.q_id === q_id && i.tool_index === tool_index)

  const setAnswer = (q_id: string, values: string[]) => setState((s) => ({ ...s, answers: { ...s.answers, [q_id]: values } }))
  const setDoc = (index: number, f: (d: ToolDocument | null) => ToolDocument | null) => setDocs((ds) => ds.map((d, i) => (i === index ? f(d) : d)))
  const setReview = (index: number, decision: ReviewDecision, adopted_value: string | null) =>
    setDoc(index, (d) => (d ? { ...d, review: { document_id: d.document.document_id, decision, adopted_value } } : d))

  const setToolAnswer = (index: number, q_id: string, values: string[]) => {
    setState((s) => ({
      ...s,
      tools: s.tools.map((t, i) => {
        if (i !== index) return t
        const next = { ...t, [q_id]: values }
        // A different tool: the plan answer and any typed tool name belonged to the old one.
        if (q_id === 'T1' && (t.T1 ?? [])[0] !== values[0]) {
          delete next.T3
          if (values[0] !== 'other_tool') delete next.T1X
        }
        return next
      }),
    }))
    if (q_id === 'T1') {
      setAnotherPlan((a) => a.map((v, i) => (i === index ? false : v)))
      setDoc(index, (d) => (d ? { ...d, review: { document_id: d.document.document_id, decision: 'not_reviewed', adopted_value: null } } : d))
    }
    if (q_id === 'T3') {
      // Editing the plan after adopting a document value makes it the creator's own, different answer.
      setDoc(index, (d) =>
        d && d.review.decision === 'adopted' && d.review.adopted_value !== values[0] ? { ...d, review: { document_id: d.document.document_id, decision: 'entered_different', adopted_value: null } } : d,
      )
    }
  }

  const examine = async (index: number, file: File) => {
    if (!props.onExamine) return
    setExamining(index)
    setDocErrors((e) => ({ ...e, [index]: '' }))
    const r = await props.onExamine(index, file)
    setExamining(null)
    if (r.ok) setDoc(index, () => ({ tool_index: index, document: r.document, review: { document_id: r.document.document_id, decision: 'not_reviewed', adopted_value: null } }))
    else setDocErrors((e) => ({ ...e, [index]: r.error }))
  }

  const review = (index: number, decision: ReviewDecision, value: string | null) => {
    if (decision === 'adopted' && value !== null) {
      setState((s) => ({ ...s, tools: s.tools.map((t, i) => (i === index ? { ...t, T3: [value] } : t)) }))
      const tool = (state.tools[index]?.T1 ?? [])[0] ?? ''
      const suggestions = props.planSuggestions?.[tool] ?? []
      setAnotherPlan((a) => a.map((v, i) => (i === index ? !suggestions.includes(value) : v)))
    }
    if (decision === 'entered_different') setAnotherPlan((a) => a.map((v, i) => (i === index ? true : v)))
    setReview(index, decision, value)
  }

  const field = (q_id: string, values: string[] | undefined, onChange: (v: string[]) => void, tool_index: number | null, key: string, toolAnswers?: Record<string, string[]>) => {
    const p = props.presentation[q_id]
    const q = config.registry.questions.get(q_id)!
    const issue = issueFor(q_id, tool_index)
    const current = values ?? []
    const notSure = current[0] === NOT_SURE
    const options = q.options === 'free_text' ? [] : q.options
    const id = `cr-${key}`
    const describedBy = [p.help ? `${id}-help` : null, issue ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
    const selectClass = 'w-full rounded-md border px-3 py-2 text-sm bg-white'
    const renderPlan = () => {
      if (tool_index === null) return null
      const suggestions = props.planSuggestions?.[(toolAnswers?.T1 ?? [])[0] ?? ''] ?? []
      const v = current[0] ?? ''
      const selectValue = v === NOT_SURE ? UNSURE : suggestions.includes(v) ? v : v !== '' || anotherPlan[tool_index] ? ANOTHER : ''
      return (
        <div className="space-y-2">
          <select
            id={`${id}-input`}
            aria-labelledby={`${id}-legend`}
            aria-describedby={describedBy}
            aria-required={p.required}
            className={selectClass}
            style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            value={selectValue}
            onChange={(e) => {
              const next = e.target.value
              setAnotherPlan((a) => a.map((x, i) => (i === tool_index ? next === ANOTHER : x)))
              if (next === '' || next === ANOTHER) onChange([])
              else if (next === UNSURE) onChange([NOT_SURE])
              else onChange([next])
            }}
          >
            <option value="">Choose…</option>
            {suggestions.length > 0 && (
              <optgroup label="Some plan names SI8 has guidance about (not a full list)">
                {suggestions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            )}
            <option value={ANOTHER}>Another plan (type its name)</option>
            <option value={UNSURE}>Not sure</option>
          </select>
          {selectValue === ANOTHER && (
            <input
              type="text"
              id={`${id}-other`}
              aria-label={`Tool ${tool_index + 1}: plan name`}
              aria-describedby={describedBy}
              className="w-full rounded-md border px-3 py-2 text-sm bg-white"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
              maxLength={500}
              value={v}
              onChange={(e) => onChange(e.target.value === '' ? [] : [e.target.value])}
            />
          )}
        </div>
      )
    }
    return (
      <fieldset key={key} id={id} className="mb-6" aria-invalid={!!issue} aria-describedby={describedBy} data-question-id={q_id}>
        <legend id={`${id}-legend`} className="text-sm font-medium mb-1" style={{ color: '#1a1918' }}>
          {tool_index !== null && <span>Tool {tool_index + 1}: </span>}
          {p.text}
          <span className="ml-1 text-xs" style={{ color: '#6b6560' }}>{p.required ? '(required)' : '(optional)'}</span>
        </legend>
        {p.help && <p id={`${id}-help`} className="text-xs mb-2" style={{ color: '#6b6560' }}>{p.help}</p>}
        {(p.input === 'text' || p.input === 'textarea') && (
          <div className="space-y-2">
            {p.input === 'text' ? (
              <input
                type="text"
                id={`${id}-input`}
                aria-labelledby={`${id}-legend`}
                aria-describedby={describedBy}
                aria-required={p.required}
                className="w-full rounded-md border px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                style={{ borderColor: 'rgba(0,0,0,0.15)' }}
                value={notSure ? '' : current[0] ?? ''}
                disabled={notSure}
                maxLength={500}
                onChange={(e) => onChange([e.target.value])}
              />
            ) : (
              <textarea
                id={`${id}-input`}
                aria-labelledby={`${id}-legend`}
                aria-describedby={describedBy}
                className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                style={{ borderColor: 'rgba(0,0,0,0.15)' }}
                rows={3}
                maxLength={500}
                value={current[0] ?? ''}
                onChange={(e) => onChange([e.target.value])}
              />
            )}
            {p.allow_not_sure && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={notSure} onChange={(e) => onChange(e.target.checked ? [NOT_SURE] : [])} />
                Not sure
              </label>
            )}
          </div>
        )}
        {p.input === 'select' && (
          <select
            id={`${id}-input`}
            aria-labelledby={`${id}-legend`}
            aria-describedby={describedBy}
            aria-required={p.required}
            className={selectClass}
            style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            value={current[0] ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? [] : [e.target.value])}
          >
            <option value="">Choose…</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {p.option_labels[o] ?? o}
              </option>
            ))}
          </select>
        )}
        {p.input === 'plan' && renderPlan()}
        {p.input === 'single' && (
          <div className="space-y-1">
            {options.map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input type="radio" name={key} checked={current[0] === o} onChange={() => onChange([o])} />
                {p.option_labels[o] ?? o}
              </label>
            ))}
          </div>
        )}
        {p.input === 'multi' && (
          <div className="space-y-1">
            {options.map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={current.includes(o)}
                  onChange={(e) => onChange(e.target.checked ? [...current, o] : current.filter((x) => x !== o))}
                />
                {p.option_labels[o] ?? o}
              </label>
            ))}
          </div>
        )}
        {issue && <p id={`${id}-error`} className="text-xs mt-1 font-medium" style={{ color: '#b42318' }}>Error: {ISSUE_TEXT[issue.issue]}</p>}
      </fieldset>
    )
  }

  const toolIssue = props.issues.find((i) => i.issue === 'no_tools' || i.issue === 'too_many_tools')

  const issueLabel = (i: FormIssue) => {
    const text = i.q_id ? props.presentation[i.q_id]?.text ?? props.acknowledgements[i.q_id] ?? i.q_id : 'AI tools'
    return `${i.tool_index !== null ? `Tool ${i.tool_index + 1}: ` : ''}${text}`
  }

  const removeTool = (index: number) => {
    setState((s) => ({ ...s, tools: s.tools.filter((_, j) => j !== index) }))
    setDocs((ds) => ds.filter((_, j) => j !== index).map((d, j) => (d ? { ...d, tool_index: j } : d)))
    setAnotherPlan((a) => a.filter((_, j) => j !== index))
  }
  const addTool = () => {
    setState((s) => ({ ...s, tools: [...s.tools, {}] }))
    setDocs((ds) => [...ds, null])
    setAnotherPlan((a) => [...a, false])
  }

  const uploadsOffered = !!props.onExamine
  const fixtureMode = !uploadsOffered && (props.fixtureDocuments ?? []).length > 0
  const selectFixture = (index: number, fixtureId: string) => {
    const f = (props.fixtureDocuments ?? []).find((x) => x.fixture_id === fixtureId)
    setDoc(index, () => (f ? { tool_index: index, document: f.document, review: { document_id: f.document.document_id, decision: 'not_reviewed', adopted_value: null } } : null))
  }

  return (
    <form
      noValidate
      aria-label="Creator Record questionnaire"
      onSubmit={(e) => {
        e.preventDefault()
        props.onSubmit(state, docs.filter((d): d is ToolDocument => d !== null))
      }}
    >
      {props.issues.length > 0 && (
        <div role="alert" className="mb-6 rounded-lg border p-4" style={{ borderColor: '#b42318', backgroundColor: '#FEF3F2' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#b42318' }}>Some answers need attention ({props.issues.length})</h2>
          <ul className="mt-2 list-disc pl-5 text-sm" style={{ color: '#b42318' }}>
            {props.issues.map((i, n) => (
              <li key={n}>{issueLabel(i)} — {ISSUE_TEXT[i.issue]}</li>
            ))}
          </ul>
        </div>
      )}
      {SECTION_ORDER.map((section) => {
        const singles = shown.single.filter((q) => props.presentation[q.q_id].section === section)
        const hasTools = section === 'tools' && shown.per_tool.length > 0
        if (singles.length === 0 && !hasTools) return null
        return (
          <section key={section} aria-labelledby={`cr-section-${section}`} className="mb-8 rounded-lg border bg-white p-6" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <h2 id={`cr-section-${section}`} className="font-display text-lg font-semibold mb-4" style={{ color: '#1a1918' }}>{props.sectionTitles[section] ?? section}</h2>
            {singles.map((q) => field(q.q_id, state.answers[q.q_id], (v) => setAnswer(q.q_id, v), null, q.q_id))}
            {hasTools && uploadsOffered && (
              <div className="mb-6 rounded-md border p-3" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                <p className="text-sm font-medium">Before you add a document</p>
                <label className="flex items-start gap-2 text-sm mt-2">
                  <input type="checkbox" className="mt-1" checked={consented} onChange={(e) => setConsented(e.target.checked)} />
                  <span>
                    I will add only synthetic test documents. I understand that a file I add is read on SI8’s server to describe what it appears to show, and is then discarded.
                    {props.examinationMode === 'live_model'
                      ? ' Automated reading is turned on: the file is sent to an AI model provider to be read.'
                      : ' Automated reading is turned off: only SI8’s own synthetic test documents can be described, from recorded test data, and no AI model is used.'}
                  </span>
                </label>
              </div>
            )}
            {hasTools &&
              state.tools.map((t, i) => (
                <div key={i} role="group" aria-labelledby={`cr-tool-${i}`} className="mb-6 rounded-md border p-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 id={`cr-tool-${i}`} className="text-sm font-semibold">Tool {i + 1}</h3>
                    {state.tools.length > 1 && (
                      <button type="button" className="rounded-md border px-3 py-1 text-xs" onClick={() => removeTool(i)}>
                        Remove tool {i + 1}
                      </button>
                    )}
                  </div>
                  {visibleToolQuestions(config, state.answers, t).map((q) => field(q.q_id, t[q.q_id], (v) => setToolAnswer(i, q.q_id, v), i, `${q.q_id}-${i}`, t))}
                  {(uploadsOffered || fixtureMode) && i < props.maxTools && (
                    <DocumentReviewPanel
                      toolIndex={i}
                      doc={docs[i] ?? null}
                      fixtures={fixtureMode ? props.fixtureDocuments : undefined}
                      onSelectFixture={(id) => selectFixture(i, id)}
                      consented={consented}
                      mode={props.examinationMode ?? 'fixture_replay'}
                      examining={examining === i}
                      error={docErrors[i] || null}
                      onExamine={(file) => examine(i, file)}
                      onRemove={() => setDoc(i, () => null)}
                      onReview={(decision, value) => review(i, decision, value)}
                    />
                  )}
                </div>
              ))}
            {hasTools && state.tools.length < props.maxTools && (
              <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={addTool}>
                Add another tool
              </button>
            )}
            {section === 'tools' && toolIssue && <p className="text-xs mt-1 font-medium" style={{ color: '#b42318' }}>Error: {ISSUE_TEXT[toolIssue.issue]}</p>}
          </section>
        )
      })}

      <section aria-labelledby="cr-section-acknowledgements" className="mb-8 rounded-lg border bg-white p-6" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <h2 id="cr-section-acknowledgements" className="font-display text-lg font-semibold mb-4">Before you continue</h2>
        {Object.entries(props.acknowledgements).map(([id, text]) => (
          <label key={id} className="flex items-start gap-2 text-sm mb-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={state.acknowledgements[id] === true}
              onChange={(e) => setState((s) => ({ ...s, acknowledgements: { ...s.acknowledgements, [id]: e.target.checked } }))}
            />
            <span>
              {text}
              {issueFor(id, null) && <span className="block text-xs mt-1 font-medium" style={{ color: '#b42318' }}>Error: {ISSUE_TEXT.acknowledgement_required}</span>}
            </span>
          </label>
        ))}
      </section>

      <button
        type="submit"
        disabled={props.submitting || examining !== null}
        className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: '#1a1918' }}
      >
        {props.submitting ? 'Preparing draft…' : 'Prepare draft record'}
      </button>
    </form>
  )
}
