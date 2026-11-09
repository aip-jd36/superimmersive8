'use client'

/**
 * CR-V2-EXAM-INTEGRATION-X3 — the examination-bearing parts of a prepared version, exactly as the server recorded
 * them, kept visibly apart: OBSERVATIONS (never verified) with their LIMITATIONS, COMPARISONS (provisional, from this
 * version's declarations) and this version's CREATOR RESPONSES. Responding sends closed codes; the server records them
 * on a new version (nothing is kept in the browser as if it were recorded). Earlier responses are offered for explicit
 * re-affirmation only, unticked. Wording: DRAFT, not approved (see examination-ui.ts).
 */
import { useState } from 'react'
import type { PreparedView } from '@/lib/creator-record/customer-flow/service'
import {
  COMPARISON_LABELS, examText, OBSERVATION_STATUS_LABELS, RESPONSE_LABELS, chosenResponses, limitationText, targetKey, type ExaminationTextMode,
  type ResponseInput, type ResponseTarget,
} from '@/lib/creator-record-flow/examination-ui'
import { T } from '@/lib/creator-record/presentation/templates'
import { fillReviewText, PANEL_TEXT } from '@/lib/creator-record-flow/wording'

const INK = '#1a1918'
const MUTED = '#6b6560'
const LINE = '#e5e2dc'

export interface ExaminationReviewProps {
  view: PreparedView
  busy: boolean
  /** Prepare a new version with these responses (the server validates and records them). */
  onRespond: (responses: ResponseInput[]) => void
  /** CR-V2-SCHEMA8-PATH-1 (E3): 'live' when the page offers a live AI examination; default: the synthetic replay wording. */
  textMode?: ExaminationTextMode
}

const fieldLabel = (field: string) => field.replace(/_/g, ' ')

type UnresolvedRequirement = NonNullable<PreparedView['examination']>['guidance'][number]['unresolved_requirements'][number]
/** The existing wording for what a record has not established. Unknown shapes get the generic line, never an inference. */
function unresolvedText(r: UnresolvedRequirement): string {
  if (r.fact === 'tool_account_status' && r.tool_label) return T.not_established_next_account(r.tool_label, r.value)
  if (r.fact === 'tool_plan_tier' && r.tool_label) return T.not_established_next_plan(r.tool_label, [r.value])
  return T.not_established_other
}

export function ExaminationReview({ view, busy, onRespond, textMode }: ExaminationReviewProps) {
  const EXAM_TEXT = examText(textMode ?? 'replay')
  const e = view.examination
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [reaffirm, setReaffirm] = useState<Record<string, boolean>>({})
  if (!e) return null
  const fileName = (id: string) => view.documents.find((d) => d.document_id === id)?.file_name ?? PANEL_TEXT.document_fallback
  const recorded = (t: ResponseTarget) => e.responses.find((r) => targetKey(r.target) === targetKey(t))

  const select = (t: ResponseTarget) => (
    <select aria-label={PANEL_TEXT.your_response} value={choice[targetKey(t)] ?? ''} onChange={(ev) => setChoice((c) => ({ ...c, [targetKey(t)]: ev.target.value }))} disabled={busy}>
      <option value="">{EXAM_TEXT.no_response}</option>
      {e.response_codes.map((code) => <option key={code} value={code}>{RESPONSE_LABELS[code] ?? code}</option>)}
    </select>
  )
  const recordedNote = (t: ResponseTarget) => {
    const r = recorded(t)
    return r ? <span className="block text-xs" style={{ color: INK }} data-recorded-response>{fillReviewText(PANEL_TEXT.recorded_response, { version: r.given_in_version, label: RESPONSE_LABELS[r.code] ?? r.code })}</span> : null
  }

  function submit() {
    const fresh = chosenResponses(choice, view)
    const freshKeys = new Set(fresh.map((r) => targetKey(r.target)))
    const again = (view.carry_forward_candidates ?? []).filter((c) => reaffirm[targetKey(c.target)] && !freshKeys.has(targetKey(c.target)))
    onRespond([...fresh, ...again.map((c) => ({ target: c.target, code: c.code }))])
  }

  return (
    <section className="mb-6 rounded-lg border bg-white p-6" style={{ borderColor: LINE }} aria-labelledby="exam-findings" data-examination>
      <h2 id="exam-findings" className="font-display text-lg font-semibold mb-2" style={{ color: INK }}>{EXAM_TEXT.findings_title}</h2>
      <p className="text-sm mb-4" style={{ color: MUTED }}>{EXAM_TEXT.findings_intro}</p>

      {e.documents.map((d) => (
        <div key={d.document_id} className="mb-6" data-examined-document={d.document_id}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: INK }}>
            {fileName(d.document_id)} <span className="ml-2 rounded border px-1.5 py-0.5 text-xs" style={{ borderColor: '#d97706', color: '#92400e' }} data-not-verified>{EXAM_TEXT.not_verified}</span>
          </h3>
          <table className="w-full text-sm mt-2">
            <thead><tr style={{ color: MUTED }}><th className="text-left font-medium">{PANEL_TEXT.table_detail}</th><th className="text-left font-medium">{PANEL_TEXT.table_appears}</th><th className="text-left font-medium">{PANEL_TEXT.table_respond}</th></tr></thead>
            <tbody>
              {d.observations.map((o) => {
                const t: ResponseTarget = { kind: 'observation', run_id: d.run_id, observation_id: o.observation_id }
                return (
                  <tr key={o.observation_id} className="align-top border-t" style={{ borderColor: LINE }}>
                    <td className="py-1 pr-3" style={{ color: INK }}>{fieldLabel(o.field)}{o.qualifier ? ` (${o.qualifier})` : ''}</td>
                    <td className="py-1 pr-3" style={{ color: MUTED }}>
                      {o.status === 'present' ? o.value : OBSERVATION_STATUS_LABELS[o.status] ?? o.status}
                      {o.excerpt && <span className="block text-xs">“{o.excerpt}”</span>}
                    </td>
                    <td className="py-1">{select(t)}{recordedNote(t)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <h4 className="text-sm font-semibold mt-3" style={{ color: INK }}>{EXAM_TEXT.limitations_title}</h4>
          <ul className="list-disc pl-5 text-sm" style={{ color: MUTED }} data-limitations>
            {d.limitations.map((l) => <li key={l}>{limitationText(l)}</li>)}
          </ul>
        </div>
      ))}

      {e.comparisons.length > 0 && (
        <div className="mb-6" data-comparisons>
          <h3 className="text-sm font-semibold mb-1" style={{ color: INK }}>{EXAM_TEXT.comparisons_title}</h3>
          <p className="text-sm mb-2" style={{ color: MUTED }}>{EXAM_TEXT.comparisons_intro}</p>
          {e.comparisons.map((c) => (
            <div key={`${c.tool_index}-${c.document_id}`} className="mb-3 text-sm">
              <p style={{ color: INK }}>{fillReviewText(PANEL_TEXT.comparison_heading, { n: c.tool_index + 1, file: fileName(c.document_id) })}</p>
              {(['provider', 'plan'] as const).map((field) => {
                const t: ResponseTarget = { kind: 'comparison', tool_index: c.tool_index, document_id: c.document_id, field }
                const declared = field === 'provider' ? c.declared.tool_id : c.declared.plan
                return (
                  <div key={field} className="ml-3 mt-1" data-comparison-field={field}>
                    <span style={{ color: MUTED }}>{fillReviewText(PANEL_TEXT.comparison_declared, { field: field === 'provider' ? PANEL_TEXT.comparison_provider : PANEL_TEXT.comparison_plan, declared: declared ?? PANEL_TEXT.comparison_declared_nothing })}</span>
                    <strong style={{ color: INK }}>{COMPARISON_LABELS[c[field].result] ?? c[field].result}</strong>
                    <span className="ml-2">{select(t)}</span>
                    {recordedNote(t)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {e.guidance.length > 0 && (
        <div className="mb-6" data-guidance-beside-documents>
          <h3 className="text-sm font-semibold mb-1" style={{ color: INK }}>{EXAM_TEXT.guidance_title}</h3>
          <p className="text-sm mb-2" style={{ color: MUTED }}>{T.guidance_intro}</p>
          {e.guidance.map((g) => {
            const notEstablished = [
              ...g.unresolved_requirements.map((r) => unresolvedText(r)),
              ...g.open_dependencies.map((d) => fillReviewText(EXAM_TEXT.guidance_open_dependency, { label: d.label ?? T.open_unlabelled })),
            ]
            return (
              <article key={g.claim_id} className="mb-3 rounded-md border p-3 text-sm" style={{ borderColor: LINE }} data-guidance-claim={g.claim_id}>
                {g.tool_labels.length > 0 && <p className="text-xs font-semibold" style={{ color: MUTED }}>{g.tool_labels.map(T.subject_tool).join('; ')}</p>}
                <p className="mt-1" style={{ color: INK }} data-guidance-conclusion={g.conclusion}><strong>{T.conclusion_label[g.conclusion]}</strong></p>
                <p className="mt-1" style={{ color: INK }}>{g.explanation}</p>
                {g.declared_plans.map((d) => <p key={`${d.tool_label}-${d.plan}`} className="mt-1 text-xs" style={{ color: MUTED }} data-guidance-declared>{T.basis_plan(d.tool_label, d.plan)}</p>)}
                {notEstablished.length > 0 && (
                  <div className="mt-2 text-xs" data-guidance-not-established>
                    <span className="font-semibold" style={{ color: INK }}>{EXAM_TEXT.guidance_not_established_label}</span>
                    <ul className="list-disc pl-5" style={{ color: MUTED }}>{notEstablished.map((n) => <li key={n}>{n}</li>)}</ul>
                  </div>
                )}
                {g.conclusion === 'relevant_applicability_unresolved' && notEstablished.length === 0 && <p className="mt-2 text-xs" style={{ color: MUTED }}>{T.depends_shared_purpose}</p>}
                {g.caveats.map((c) => <p key={c} className="mt-1 text-xs" style={{ color: MUTED }}>{c}</p>)}
                <div className="mt-2 text-xs" data-guidance-documents>
                  <span className="font-semibold" style={{ color: INK }}>{EXAM_TEXT.guidance_documents_label}</span>
                  {g.documents.length === 0 && <p style={{ color: MUTED }} data-guidance-no-document>{EXAM_TEXT.guidance_no_document}</p>}
                  {g.documents.map((d) => (
                    <div key={d.document_id} className="mt-1" style={{ color: MUTED }} data-guidance-document={d.document_id}>
                      <p>
                        {fileName(d.document_id)} — {d.examination.status === 'examined' ? fillReviewText(d.examination.observation_ids.length === 1 ? EXAM_TEXT.guidance_examined_one : EXAM_TEXT.guidance_examined_other, { count: d.examination.observation_ids.length }) : EXAM_TEXT.guidance_not_examined}
                        {d.examination.status === 'examined' && <span className="ml-2 rounded border px-1 py-0.5" style={{ borderColor: '#d97706', color: '#92400e' }} data-not-verified>{EXAM_TEXT.not_verified}</span>}
                      </p>
                      {d.comparison && <p>{fillReviewText(PANEL_TEXT.comparison_summary, { provider: COMPARISON_LABELS[d.comparison.provider.result] ?? d.comparison.provider.result, plan: COMPARISON_LABELS[d.comparison.plan.result] ?? d.comparison.plan.result })}</p>}
                    </div>
                  ))}
                  {g.documents.length > 0 && <p className="mt-1" style={{ color: MUTED }}>{EXAM_TEXT.guidance_document_effect}</p>}
                </div>
                <p className="mt-2 text-xs" style={{ color: MUTED }} data-guidance-provenance>{T.source_line(g.provenance.claim_last_verified)} {fillReviewText(PANEL_TEXT.guidance_reference, { claim_id: g.claim_id })}</p>
              </article>
            )
          })}
        </div>
      )}

      {(view.carry_forward_candidates ?? []).length > 0 && (
        <div className="mb-6" data-carry-forward>
          <h3 className="text-sm font-semibold mb-1" style={{ color: INK }}>{EXAM_TEXT.earlier_title}</h3>
          <p className="text-sm mb-2" style={{ color: MUTED }}>{EXAM_TEXT.earlier_intro}</p>
          {(view.carry_forward_candidates ?? []).map((c) => (
            <label key={targetKey(c.target)} className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
              <input type="checkbox" checked={reaffirm[targetKey(c.target)] ?? false} onChange={(ev) => setReaffirm((r) => ({ ...r, [targetKey(c.target)]: ev.target.checked }))} disabled={busy} />
              {RESPONSE_LABELS[c.code] ?? c.code} — {c.target.kind === 'comparison' ? `tool ${c.target.tool_index + 1} ${c.target.field}` : 'an observation'}
            </label>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold mb-1" style={{ color: INK }}>{EXAM_TEXT.responses_title}</h3>
      <p className="text-sm mb-3" style={{ color: MUTED }}>{EXAM_TEXT.responses_intro}</p>
      <button type="button" className="rounded-md border px-4 py-2 text-sm font-medium bg-white disabled:opacity-50" onClick={submit} disabled={busy}>
        {busy ? EXAM_TEXT.recording : EXAM_TEXT.record_responses}
      </button>
    </section>
  )
}
