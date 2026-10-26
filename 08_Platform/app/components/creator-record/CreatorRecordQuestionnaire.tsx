'use client'

/**
 * CR-V2-VERTICAL-SLICE-1 — Creator Record v2 questionnaire (intended for reuse
 * by the eventual customer product).
 *
 * Generic: it renders whatever the supplied registry and presentation define.
 * Which questions are shown is decided ONLY by the contract's
 * `eligibleQuestions()` (via `visibleQuestions`), recomputed on every change,
 * so changing an earlier answer hides dependent questions immediately. It
 * holds no governance, applicability or guidance logic.
 */

import { useMemo, useState } from 'react'
import { loadQuestionRegistry, NOT_SURE, type RegistryInput } from '@/lib/creator-record/contract/question-registry'
import { visibleQuestions, type CreatorRecordFormState, type FormConfig, type FormIssue, type QuestionPresentation } from '@/lib/creator-record/prototype/form'

export interface QuestionnaireProps {
  registryInput: RegistryInput
  presentation: Readonly<Record<string, QuestionPresentation & { section: string; text: string; help: string | null }>>
  sectionTitles: Readonly<Record<string, string>>
  acknowledgements: Readonly<Record<string, string>>
  maxTools: number
  initialState?: CreatorRecordFormState
  submitting: boolean
  issues: FormIssue[]
  onSubmit: (state: CreatorRecordFormState) => void
}

const SECTION_ORDER = ['project', 'locations', 'tools', 'people', 'materials', 'contribution']
const EMPTY: CreatorRecordFormState = { answers: {}, tools: [{}], acknowledgements: {} }

const ISSUE_TEXT: Record<FormIssue['issue'], string> = {
  required: 'Please answer this question.',
  invalid_option: 'Please choose one of the options.',
  too_long: 'Please shorten this answer.',
  single_choice_only: 'Please choose one option.',
  too_many_tools: 'Too many tools.',
  no_tools: 'Please add at least one tool.',
  acknowledgement_required: 'Please confirm this statement.',
  unknown_question: 'Unexpected answer.',
}

export function CreatorRecordQuestionnaire(props: QuestionnaireProps) {
  const [state, setState] = useState<CreatorRecordFormState>(props.initialState ?? EMPTY)
  const config: FormConfig = useMemo(() => {
    const r = loadQuestionRegistry(props.registryInput)
    if (!r.ok) throw new Error(r.errors.join('; '))
    return { registry: r.registry, presentation: props.presentation, acknowledgement_ids: Object.keys(props.acknowledgements), max_tools: props.maxTools }
  }, [props.registryInput, props.presentation, props.acknowledgements, props.maxTools])

  const shown = visibleQuestions(config, state.answers)
  const issueFor = (q_id: string, tool_index: number | null) => props.issues.find((i) => i.q_id === q_id && i.tool_index === tool_index)

  const setAnswer = (q_id: string, values: string[]) => setState((s) => ({ ...s, answers: { ...s.answers, [q_id]: values } }))
  const setToolAnswer = (index: number, q_id: string, values: string[]) =>
    setState((s) => ({ ...s, tools: s.tools.map((t, i) => (i === index ? { ...t, [q_id]: values } : t)) }))

  const field = (q_id: string, values: string[] | undefined, onChange: (v: string[]) => void, tool_index: number | null, key: string) => {
    const p = props.presentation[q_id]
    const q = config.registry.questions.get(q_id)!
    const issue = issueFor(q_id, tool_index)
    const current = values ?? []
    const notSure = current[0] === NOT_SURE
    const options = q.options === 'free_text' ? [] : q.options
    const id = `cr-${key}`
    const describedBy = [p.help ? `${id}-help` : null, issue ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
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

  return (
    <form
      noValidate
      aria-label="Creator Record questionnaire"
      onSubmit={(e) => {
        e.preventDefault()
        props.onSubmit(state)
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
        const perTool = section === 'tools' ? shown.per_tool : []
        if (singles.length === 0 && perTool.length === 0) return null
        return (
          <section key={section} aria-labelledby={`cr-section-${section}`} className="mb-8 rounded-lg border bg-white p-6" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <h2 id={`cr-section-${section}`} className="font-display text-lg font-semibold mb-4" style={{ color: '#1a1918' }}>{props.sectionTitles[section] ?? section}</h2>
            {singles.map((q) => field(q.q_id, state.answers[q.q_id], (v) => setAnswer(q.q_id, v), null, q.q_id))}
            {perTool.length > 0 &&
              state.tools.map((t, i) => (
                <div key={i} role="group" aria-labelledby={`cr-tool-${i}`} className="mb-6 rounded-md border p-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 id={`cr-tool-${i}`} className="text-sm font-semibold">Tool {i + 1}</h3>
                    {state.tools.length > 1 && (
                      <button type="button" className="rounded-md border px-3 py-1 text-xs" onClick={() => setState((s) => ({ ...s, tools: s.tools.filter((_, j) => j !== i) }))}>
                        Remove tool {i + 1}
                      </button>
                    )}
                  </div>
                  {perTool.map((q) => field(q.q_id, t[q.q_id], (v) => setToolAnswer(i, q.q_id, v), i, `${q.q_id}-${i}`))}
                </div>
              ))}
            {perTool.length > 0 && state.tools.length < props.maxTools && (
              <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={() => setState((s) => ({ ...s, tools: [...s.tools, {}] }))}>
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
        disabled={props.submitting}
        className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: '#1a1918' }}
      >
        {props.submitting ? 'Preparing draft…' : 'Prepare draft record'}
      </button>
    </form>
  )
}
