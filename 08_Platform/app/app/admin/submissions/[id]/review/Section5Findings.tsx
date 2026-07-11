'use client'

import { Trash2 } from 'lucide-react'
import { WorkbookData, DOMAIN_LABELS } from './workbook-schema'

type S5 = WorkbookData['section_5']
type Finding = S5['findings'][number]

interface Props {
  data: S5
  onChange: (updates: Partial<S5>) => void
}

const DOMAIN_OPTIONS = Object.entries(DOMAIN_LABELS).map(([k, v]) => ({ value: k, label: `${k} — ${v}` }))

function generateId() {
  return `finding-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export function Section5Findings({ data, onChange }: Props) {
  const updateFinding = (index: number, updates: Partial<Finding>) => {
    const updated = data.findings.map((f, i) => i === index ? { ...f, ...updates } : f)
    onChange({ findings: updated })
  }

  const addFinding = () => {
    onChange({
      findings: [
        ...data.findings,
        { id: generateId(), domain: '', finding: '', evidence_basis: '', commercial_impact: '', addressable: '' },
      ],
    })
  }

  const removeFinding = (index: number) => {
    onChange({ findings: data.findings.filter((_, i) => i !== index) })
  }

  const isComplete = data.findings.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#1a1918' }}>§ 5  Findings</h2>
        <p className="text-sm text-gray-500">
          At least one finding required to unlock Section 6. Include both positive and negative findings.
          Positive findings ("commercial licenses confirmed for all tools") are as important as risk findings.
        </p>
        {!isComplete && (
          <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded inline-block">
            Add at least one finding to unlock Section 6
          </div>
        )}
        {isComplete && (
          <div className="mt-2 text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded inline-block">
            ✓ {data.findings.length} finding{data.findings.length !== 1 ? 's' : ''} — Section 6 unlocked
          </div>
        )}
        {data.findings.length === 1 && (
          <div className="mt-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-3 py-2 rounded">
            One finding is thin for a complete assessment. Consider adding positive findings for domains where evidence was strong — e.g. R (commercial licenses confirmed), I/L (no IP or likeness concerns identified).
          </div>
        )}
      </div>

      <div className="space-y-4">
        {data.findings.map((finding, i) => (
          <div key={finding.id} className="border rounded-lg p-4 space-y-3" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-400">Finding {i + 1}</span>
                <select
                  value={finding.domain}
                  onChange={e => updateFinding(i, { domain: e.target.value })}
                  className="text-xs border rounded px-2 py-1"
                  style={{ borderColor: 'rgba(0,0,0,0.15)' }}
                >
                  <option value="">Domain…</option>
                  {DOMAIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  <option value="Overall">Overall</option>
                </select>
              </div>
              <button type="button" onClick={() => removeFinding(i)}
                className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Finding statement</label>
              <textarea
                value={finding.finding}
                onChange={e => updateFinding(i, { finding: e.target.value })}
                rows={2}
                placeholder="e.g. 'Commercial licenses for all declared AI tools were adequately established for the stated generation period.' — noun-first, past-tense, factual."
                className="w-full text-sm border rounded px-2 py-1.5 resize-none"
                style={{ borderColor: 'rgba(0,0,0,0.12)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Supporting evidence</label>
              <input
                type="text"
                value={finding.evidence_basis}
                onChange={e => updateFinding(i, { evidence_basis: e.target.value })}
                placeholder="Cite the specific documents reviewed — e.g. 'Kling AI Pro receipt (Jan 2026); Pro plan ToS reviewed — confirms commercial output rights for paid subscribers'"
                className="w-full text-sm border rounded px-2 py-1.5"
                style={{ borderColor: 'rgba(0,0,0,0.12)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Commercial impact</label>
                <select
                  value={finding.commercial_impact}
                  onChange={e => updateFinding(i, { commercial_impact: e.target.value })}
                  className="w-full text-sm border rounded px-2 py-1.5"
                  style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                >
                  <option value="">Select…</option>
                  <option>Positive — supports clearance</option>
                  <option>Neutral — informational</option>
                  <option>Low risk — noted but unlikely</option>
                  <option>Medium risk — relevant consideration</option>
                  <option>High risk — material commercial concern</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Addressable?</label>
                <select
                  value={finding.addressable}
                  onChange={e => updateFinding(i, { addressable: e.target.value })}
                  className="w-full text-sm border rounded px-2 py-1.5"
                  style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                >
                  <option value="">Select…</option>
                  <option>N/A (positive finding)</option>
                  <option>Yes — specific remediation available</option>
                  <option>Partially</option>
                  <option>No — inherent risk</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addFinding}
        className="w-full py-2.5 text-sm border-2 border-dashed rounded-lg transition-colors"
        style={{ borderColor: 'rgba(200,144,10,0.3)', color: '#C8900A' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#C8900A')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(200,144,10,0.3)')}
      >
        + Add finding
      </button>

      {data.findings.length >= 3 && (
        <div className="text-xs text-gray-400 text-center">
          Tip: Mix positive and negative findings. A good assessment documents what was confirmed, not only what was missing.
        </div>
      )}
    </div>
  )
}
