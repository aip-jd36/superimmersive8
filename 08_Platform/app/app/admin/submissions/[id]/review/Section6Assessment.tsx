'use client'

import { WorkbookData, OUTCOME_OPTIONS, CONFIDENCE_OPTIONS } from './workbook-schema'

type S6 = WorkbookData['section_6']
type Finding = WorkbookData['section_5']['findings'][number]

interface Props {
  data: S6
  findings: Finding[]
  assessId: string
  onChange: (updates: Partial<S6>) => void
}

const OUTCOME_GUIDANCE: Record<string, string> = {
  EVIDENCE_SUPPORTS:
    'All material controls Verified or N/A. No significant gaps. Use when evidence is strong across all domains.',
  EVIDENCE_SUPPORTS_WITH_CONDITIONS:
    'Commercial use can proceed if specific addressable conditions are met. State conditions precisely.',
  MATERIAL_RISKS_IDENTIFIED:
    'Evidence reveals specific risks that cannot be resolved through additional documentation.',
  INSUFFICIENT_EVIDENCE:
    'Too incomplete to reach a conclusion. Multiple material domains are Not Provided.',
  UNABLE_TO_ASSESS:
    'Exceptional circumstances only — video not accessible, fundamental scope issue. Should be rare.',
}

export function Section6Assessment({ data, findings, assessId, onChange }: Props) {
  const isComplete = !!(data.outcome && data.commercial_confidence && data.signed_off)
  const canSignOff = !!(data.outcome && data.commercial_confidence && data.basis.trim().length > 20)

  const handleAddCondition = () => {
    onChange({ conditions: [...data.conditions, ''] })
  }
  const handleCondition = (i: number, v: string) => {
    const updated = data.conditions.map((c, idx) => idx === i ? v : c)
    onChange({ conditions: updated })
  }
  const handleRemoveCondition = (i: number) => {
    onChange({ conditions: data.conditions.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#1a1918' }}>§ 6  Overall Assessment</h2>
        <p className="text-sm text-gray-500">
          Synthesize all findings into a single outcome. The signed-off assessment is immutable — a milestone snapshot
          is recorded when you check the sign-off box.
        </p>
        <div className="text-xs font-mono text-gray-400 mt-1">{assessId}</div>
      </div>

      {/* Assessment end time */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>Assessment end time</label>
        <input
          type="datetime-local"
          value={data.assessment_end || ''}
          onChange={e => onChange({ assessment_end: e.target.value })}
          className="text-sm border rounded px-3 py-1.5"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
        />
      </div>

      {/* Outcome */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#1a1918' }}>Outcome</label>
        <div className="space-y-2">
          {OUTCOME_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors"
              style={{
                borderColor: data.outcome === opt.value ? '#C8900A' : 'rgba(0,0,0,0.08)',
                backgroundColor: data.outcome === opt.value ? 'rgba(200,144,10,0.04)' : 'transparent',
              }}>
              <input
                type="radio"
                name="outcome"
                value={opt.value}
                checked={data.outcome === opt.value}
                onChange={() => onChange({ outcome: opt.value })}
                className="mt-0.5 flex-shrink-0"
                style={{ accentColor: '#C8900A' }}
              />
              <div>
                <div className="text-sm font-medium" style={{ color: '#1a1918' }}>{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{OUTCOME_GUIDANCE[opt.value]}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Conditions (only for EVIDENCE_SUPPORTS_WITH_CONDITIONS) */}
      {data.outcome === 'EVIDENCE_SUPPORTS_WITH_CONDITIONS' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1a1918' }}>
            Conditions <span className="text-gray-400 font-normal text-xs">(state each condition specifically and actionably)</span>
          </label>
          <div className="space-y-2">
            {data.conditions.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={c}
                  onChange={e => handleCondition(i, e.target.value)}
                  placeholder={`Condition ${i + 1} — e.g. "Obtain sync license for background audio before commercial deployment"`}
                  className="flex-1 text-sm border rounded px-3 py-1.5"
                  style={{ borderColor: 'rgba(0,0,0,0.15)' }}
                />
                <button type="button" onClick={() => handleRemoveCondition(i)}
                  className="text-gray-300 hover:text-red-400 text-xs px-2">✕</button>
              </div>
            ))}
            <button type="button" onClick={handleAddCondition}
              className="text-sm text-amber-600 hover:text-amber-700">
              + Add condition
            </button>
          </div>
        </div>
      )}

      {/* Basis narrative */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>
          Basis for outcome
        </label>
        <textarea
          value={data.basis}
          onChange={e => onChange({ basis: e.target.value })}
          rows={4}
          placeholder="Explain the primary evidence and reasoning that supports this outcome. Reference specific findings and domain judgments. This is your professional conclusion."
          className="w-full text-sm border rounded px-3 py-2 resize-none"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
        />
        {data.basis.trim().length < 20 && data.basis.length > 0 && (
          <div className="text-xs text-amber-500 mt-1">
            Basis must be at least 20 characters before you can sign off.
          </div>
        )}
      </div>

      {/* Confidence */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>Commercial confidence</label>
          <p className="text-xs text-gray-400 mb-2">Reflects the quality of evidence reviewed. Independent of outcome favorability.</p>
          <div className="flex gap-2">
            {CONFIDENCE_OPTIONS.map(c => (
              <button key={c} type="button"
                onClick={() => onChange({ commercial_confidence: c })}
                className={`flex-1 py-2 text-sm rounded border transition-colors ${
                  data.commercial_confidence === c
                    ? 'font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={{
                  borderColor: data.commercial_confidence === c ? '#C8900A' : 'rgba(0,0,0,0.12)',
                  color: data.commercial_confidence === c ? '#C8900A' : undefined,
                  backgroundColor: data.commercial_confidence === c ? 'rgba(200,144,10,0.06)' : 'transparent',
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>Reviewer confidence</label>
          <p className="text-xs text-gray-400 mb-2">Your confidence in your own assessment, given the evidence quality.</p>
          <div className="flex gap-2">
            {CONFIDENCE_OPTIONS.map(c => (
              <button key={c} type="button"
                onClick={() => onChange({ reviewer_confidence: c })}
                className={`flex-1 py-2 text-sm rounded border transition-colors ${
                  data.reviewer_confidence === c ? 'font-semibold' : 'text-gray-500 hover:text-gray-700'
                }`}
                style={{
                  borderColor: data.reviewer_confidence === c ? '#1a1918' : 'rgba(0,0,0,0.12)',
                  color: data.reviewer_confidence === c ? '#1a1918' : undefined,
                  backgroundColor: data.reviewer_confidence === c ? 'rgba(26,25,24,0.05)' : 'transparent',
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviewer confidence notes */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>
          Reviewer confidence notes <span className="text-gray-400 font-normal text-xs">(optional — especially useful if Moderate or Low)</span>
        </label>
        <textarea
          value={data.reviewer_confidence_notes}
          onChange={e => onChange({ reviewer_confidence_notes: e.target.value })}
          rows={2}
          placeholder="What would have made you more confident? What is uncertain?"
          className="w-full text-sm border rounded px-3 py-2 resize-none"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
        />
      </div>

      {/* Findings summary */}
      {findings.length > 0 && (
        <div className="p-4 rounded-lg border text-xs space-y-1" style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#f5f3f0' }}>
          <div className="font-medium text-gray-600 mb-2">Findings to incorporate ({findings.length})</div>
          {findings.map((f, i) => (
            <div key={f.id} className="flex items-start gap-2">
              <span className="text-gray-400">{i + 1}.</span>
              <span className="text-gray-700">{f.finding || <em className="text-gray-400">Untitled finding</em>}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sign-off */}
      <div className={`p-4 rounded-lg border space-y-3 ${
        data.signed_off ? 'bg-green-50 border-green-200' : canSignOff ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
      }`}>
        {!canSignOff && !data.signed_off && (
          <div className="text-xs text-gray-500">
            Complete outcome, basis (20+ chars), and commercial confidence before signing off.
          </div>
        )}

        <label className={`flex items-start gap-3 cursor-pointer ${!canSignOff ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            type="checkbox"
            checked={data.signed_off}
            disabled={!canSignOff && !data.signed_off}
            onChange={e => onChange({ signed_off: e.target.checked })}
            className="mt-0.5 flex-shrink-0"
            style={{ accentColor: '#22c55e' }}
          />
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {data.signed_off ? '✓ Assessment signed off' : 'Sign off this assessment'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              I confirm the findings and outcome above represent my professional assessment.
              This action triggers a milestone snapshot — the workbook state at this point is preserved immutably.
            </div>
          </div>
        </label>

        {data.signed_off && (
          <div className="text-xs text-green-700 font-medium">
            ✓ Signed off — snapshot recorded. Section 7 unlocked.
          </div>
        )}
      </div>
    </div>
  )
}
