'use client'

import { WorkbookData, OUTCOME_OPTIONS, CONFIDENCE_OPTIONS } from './workbook-schema'

type S6 = WorkbookData['section_6']
type Finding = WorkbookData['section_5']['findings'][number]
type Gap = WorkbookData['section_4']['gaps'][number]

interface Props {
  data: S6
  findings: Finding[]
  gaps: Gap[]
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

const IMPACT_SORT: Record<string, number> = {
  'Positive — supports clearance': 0,
  'Neutral — informational': 1,
  'Low risk — noted but unlikely': 2,
  'Medium risk — relevant consideration': 3,
  'High risk — material commercial concern': 4,
}

export function Section6Assessment({ data, findings, gaps, assessId, onChange }: Props) {
  const isComplete = !!(data.outcome && data.commercial_confidence && data.signed_off)
  const canSignOff = !!(data.outcome && data.commercial_confidence && data.basis.trim().length > 20)

  // Gap summary counts
  const gapHigh = gaps.filter(g => g.commercial_impact?.startsWith('High')).length
  const gapMedium = gaps.filter(g => g.commercial_impact?.startsWith('Medium')).length
  const gapUnresolved = gaps.filter(g => !g.commercial_impact).length

  // Finding counts
  const findingPositive = findings.filter(f => f.commercial_impact?.startsWith('Positive')).length
  const findingRisk = findings.filter(f => f.commercial_impact?.includes('risk')).length

  // Sorted findings — positive first
  const sortedFindings = [...findings].sort((a, b) => {
    const aO = IMPACT_SORT[a.commercial_impact ?? ''] ?? 5
    const bO = IMPACT_SORT[b.commercial_impact ?? ''] ?? 5
    return aO - bO
  })

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

      {/* Memory aid — gap and finding summary */}
      {(gaps.length > 0 || findings.length > 0) && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg border space-y-1.5" style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#f5f3f0' }}>
            <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-2">Gaps ({gaps.length})</div>
            {gaps.length === 0 && <div className="text-gray-400">None logged</div>}
            {gapHigh > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-red-600">{gapHigh} High commercial impact</span>
              </div>
            )}
            {gapMedium > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-amber-600">{gapMedium} Medium commercial impact</span>
              </div>
            )}
            {gapUnresolved > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                <span className="text-gray-400">{gapUnresolved} Impact not set</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg border space-y-1.5" style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#f5f3f0' }}>
            <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-2">Findings ({findings.length})</div>
            {findings.length === 0 && <div className="text-gray-400">None logged</div>}
            {findingPositive > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="text-green-600">{findingPositive} Positive</span>
              </div>
            )}
            {findingRisk > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-red-600">{findingRisk} Risk</span>
              </div>
            )}
            {findingPositive === 0 && findingRisk === 0 && findings.length > 0 && (
              <div className="text-gray-400">{findings.length} unclassified</div>
            )}
          </div>
        </div>
      )}

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

      {/* Assessment rationale */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>
          Assessment rationale
        </label>
        <textarea
          value={data.basis}
          onChange={e => onChange({ basis: e.target.value })}
          rows={4}
          placeholder="e.g. 'Commercial rights were independently supported for all declared AI tools, no material IP or likeness issues were identified through independent review, and the remaining evidence gap does not materially affect commercial reliance.'"
          className="w-full text-sm border rounded px-3 py-2 resize-none"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
        />
        {data.basis.trim().length < 20 && data.basis.length > 0 && (
          <div className="text-xs text-amber-500 mt-1">
            Rationale must be at least 20 characters before you can sign off.
          </div>
        )}
      </div>

      {/* Confidence */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>Commercial confidence</label>
          <p className="text-xs text-gray-400 mb-2">Reflects the strength, completeness, and reliability of the evidence reviewed. Independent of outcome favorability.</p>
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
          <p className="text-xs text-gray-400 mb-2">How confident are you that another SI8 reviewer applying the same methodology would reach substantially the same conclusion?</p>
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
          placeholder="What additional evidence or clarification would most improve confidence in this assessment?"
          className="w-full text-sm border rounded px-3 py-2 resize-none"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
        />
      </div>

      {/* Findings summary — positive first */}
      {findings.length > 0 && (
        <div className="p-4 rounded-lg border text-xs space-y-1" style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#f5f3f0' }}>
          <div className="font-medium text-gray-600 mb-2">Findings to incorporate ({findings.length})</div>
          {sortedFindings.map((f, i) => (
            <div key={f.id} className="flex items-start gap-2">
              <span className="text-gray-400 flex-shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-700">{f.finding || <em className="text-gray-400">Untitled finding</em>}</span>
                {f.commercial_impact && (
                  <span className={`ml-2 text-[10px] ${
                    f.commercial_impact.startsWith('Positive') ? 'text-green-600'
                    : f.commercial_impact.includes('High') ? 'text-red-500'
                    : f.commercial_impact.includes('Medium') ? 'text-amber-600'
                    : 'text-gray-400'
                  }`}>
                    {f.commercial_impact.split(' — ')[0]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sign-off */}
      <div className={`p-4 rounded-lg border space-y-4 ${
        data.signed_off ? 'bg-green-50 border-green-200' : canSignOff ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
      }`}>
        {!canSignOff && !data.signed_off && (
          <div className="text-xs text-gray-500">
            Complete outcome, rationale (20+ chars), and commercial confidence before signing off.
          </div>
        )}

        {/* Pre-sign-off checklist */}
        {canSignOff && !data.signed_off && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-600">Before signing:</div>
            {[
              'Outcome reflects all evidence reviewed',
              'Evidence gaps have been documented in Section 4',
              'Findings support the selected outcome',
              'Report Brief will reflect this assessment',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="text-amber-500 flex-shrink-0">◦</span>
                {item}
              </div>
            ))}
          </div>
        )}

        {/* Professional Reviewer Declaration */}
        {(canSignOff || data.signed_off) && (
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            Professional Reviewer Declaration
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
              {data.signed_off ? '✓ Signed' : 'Sign off this assessment'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              I confirm that this assessment reflects my independent professional judgment based on the evidence reviewed and the SI8 Reviewer Manual. This action triggers a milestone snapshot — the workbook state at this point is preserved immutably.
            </div>
          </div>
        </label>

        {data.signed_off && (
          <div className="text-xs text-green-700 font-medium">
            ✓ Milestone snapshot recorded. Section 7 unlocked.
          </div>
        )}
      </div>
    </div>
  )
}
