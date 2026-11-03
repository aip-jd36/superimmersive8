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
  COMPARISON_LABELS, EXAM_TEXT, OBSERVATION_STATUS_LABELS, RESPONSE_LABELS, chosenResponses, limitationText, targetKey,
  type ResponseInput, type ResponseTarget,
} from '@/lib/creator-record-flow/examination-ui'

const INK = '#1a1918'
const MUTED = '#6b6560'
const LINE = '#e5e2dc'

export interface ExaminationReviewProps {
  view: PreparedView
  busy: boolean
  /** Prepare a new version with these responses (the server validates and records them). */
  onRespond: (responses: ResponseInput[]) => void
}

const fieldLabel = (field: string) => field.replace(/_/g, ' ')

export function ExaminationReview({ view, busy, onRespond }: ExaminationReviewProps) {
  const e = view.examination
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [reaffirm, setReaffirm] = useState<Record<string, boolean>>({})
  if (!e) return null
  const fileName = (id: string) => view.documents.find((d) => d.document_id === id)?.file_name ?? 'Document'
  const recorded = (t: ResponseTarget) => e.responses.find((r) => targetKey(r.target) === targetKey(t))

  const select = (t: ResponseTarget) => (
    <select aria-label="Your response" value={choice[targetKey(t)] ?? ''} onChange={(ev) => setChoice((c) => ({ ...c, [targetKey(t)]: ev.target.value }))} disabled={busy}>
      <option value="">{EXAM_TEXT.no_response}</option>
      {e.response_codes.map((code) => <option key={code} value={code}>{RESPONSE_LABELS[code] ?? code}</option>)}
    </select>
  )
  const recordedNote = (t: ResponseTarget) => {
    const r = recorded(t)
    return r ? <span className="block text-xs" style={{ color: INK }} data-recorded-response>Your response (version {r.given_in_version}): {RESPONSE_LABELS[r.code] ?? r.code}</span> : null
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
            <thead><tr style={{ color: MUTED }}><th className="text-left font-medium">Detail</th><th className="text-left font-medium">Appears to show</th><th className="text-left font-medium">Respond</th></tr></thead>
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
              <p style={{ color: INK }}>Tool {c.tool_index + 1} — {fileName(c.document_id)}</p>
              {(['provider', 'plan'] as const).map((field) => {
                const t: ResponseTarget = { kind: 'comparison', tool_index: c.tool_index, document_id: c.document_id, field }
                const declared = field === 'provider' ? c.declared.tool_id : c.declared.plan
                return (
                  <div key={field} className="ml-3 mt-1" data-comparison-field={field}>
                    <span style={{ color: MUTED }}>{field === 'provider' ? 'Provider' : 'Plan'}: you declared {declared ?? 'nothing'} — </span>
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
