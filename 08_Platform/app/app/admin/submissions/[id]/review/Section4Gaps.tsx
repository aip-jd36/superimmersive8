'use client'

import { useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { WorkbookData } from './workbook-schema'

type S4 = WorkbookData['section_4']
type S3 = WorkbookData['section_3']
type Gap = S4['gaps'][number]

interface Props {
  data: S4
  section3: S3
  onChange: (updates: Partial<S4>) => void
}

const CONTROL_LABELS: Record<string, string> = {
  A01: 'A01 — Identity & Accountability',
  R01: 'R01 — Tool Identification',
  R02: 'R02 — Commercial License',
  R03: 'R03 — Custom Model Provenance',
  R04: 'R04 — Output Ownership',
  H01: 'H01 — Human Contribution',
  H02: 'H02 — Authorship Claim',
  I01: 'I01 — Third-Party IP (Visual)',
  I02: 'I02 — Third-Party IP (Audio)',
  I03: 'I03 — Trademarks',
  L01: 'L01 — Likeness (Reviewer Observed)',
  L02: 'L02 — Performer Distinctness',
  L03: 'L03 — Likeness Releases',
  T01: 'T01 — Technical Provenance',
  D01: 'D01 — Date/Version Consistency',
  D02: 'D02 — Retroactive Documentation',
}

function generateId() {
  return `gap-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

function buildSuggestedGaps(section3: S3): Gap[] {
  const gaps: Gap[] = []
  const controls = Object.keys(section3) as Array<keyof S3>
  for (const id of controls) {
    const ctrl = (section3 as any)[id]
    if (ctrl?.judgment === 'Not Provided' || ctrl?.judgment === 'Partially Verified') {
      gaps.push({
        id: generateId(),
        control: id,
        what_missing: '',
        addressable: '',
        commercial_impact: '',
        impact_description: '',
      })
    }
  }
  return gaps
}

export function Section4Gaps({ data, section3, onChange }: Props) {
  // Auto-seed gaps when section first loads and gaps is empty
  useEffect(() => {
    if (data.gaps.length === 0) {
      const suggested = buildSuggestedGaps(section3)
      if (suggested.length > 0) {
        onChange({ gaps: suggested })
      }
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateGap = (index: number, updates: Partial<Gap>) => {
    const newGaps = data.gaps.map((g, i) => i === index ? { ...g, ...updates } : g)
    onChange({ gaps: newGaps })
  }

  const addGap = () => {
    onChange({
      gaps: [...data.gaps, {
        id: generateId(),
        control: '',
        what_missing: '',
        addressable: '',
        commercial_impact: '',
        impact_description: '',
      }],
    })
  }

  const removeGap = (index: number) => {
    onChange({ gaps: data.gaps.filter((_, i) => i !== index) })
  }

  // Counts from section 3
  const notProvided = Object.keys(section3).filter(id => (section3 as any)[id]?.judgment === 'Not Provided').length
  const partial = Object.keys(section3).filter(id => (section3 as any)[id]?.judgment === 'Partially Verified').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#1a1918' }}>§ 4  Gap Log</h2>
        <p className="text-sm text-gray-500 mb-3">
          Evidence gaps auto-seeded from Section 3. For each gap, document what is missing, whether it is addressable,
          and the commercial impact.
        </p>
        <div className="flex gap-3 text-xs">
          <span className="px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100">
            Not Provided: {notProvided}
          </span>
          <span className="px-2 py-1 rounded bg-amber-50 text-amber-600 border border-amber-100">
            Partially Verified: {partial}
          </span>
          <span className="px-2 py-1 rounded bg-gray-50 text-gray-500 border border-gray-100">
            Gaps logged: {data.gaps.length}
          </span>
        </div>
      </div>

      {data.gaps.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed rounded-lg"
          style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          No gaps logged. All Section 3 controls were Verified or Not Applicable.
        </div>
      )}

      <div className="space-y-4">
        {data.gaps.map((gap, i) => (
          <div key={gap.id} className="border rounded-lg p-4 space-y-3" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono w-6">{i + 1}</span>
                <select
                  value={gap.control}
                  onChange={e => updateGap(i, { control: e.target.value })}
                  className="text-sm border rounded px-2 py-1.5"
                  style={{ borderColor: 'rgba(0,0,0,0.15)' }}
                >
                  <option value="">Select control…</option>
                  {Object.entries(CONTROL_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => removeGap(i)}
                className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Missing evidence</label>
              <textarea
                value={gap.what_missing}
                onChange={e => updateGap(i, { what_missing: e.target.value })}
                rows={2}
                placeholder="Describe specifically what evidence was not provided or was insufficient"
                className="w-full text-sm border rounded px-2 py-1.5 resize-none"
                style={{ borderColor: 'rgba(0,0,0,0.12)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Can this gap be addressed?</label>
                <select
                  value={gap.addressable}
                  onChange={e => updateGap(i, { addressable: e.target.value })}
                  className="w-full text-sm border rounded px-2 py-1.5"
                  style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                >
                  <option value="">Select…</option>
                  <option>Yes — client can provide supplemental evidence</option>
                  <option>Partially — some but not full remediation possible</option>
                  <option>No — inherent gap, cannot be remediated</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Commercial impact</label>
                <select
                  value={gap.commercial_impact}
                  onChange={e => updateGap(i, { commercial_impact: e.target.value })}
                  className="w-full text-sm border rounded px-2 py-1.5"
                  style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                >
                  <option value="">Select…</option>
                  <option>High — materially affects commercial clearance</option>
                  <option>Medium — relevant risk but not blocking</option>
                  <option>Low — minor or unlikely scenario</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Commercial significance <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={gap.impact_description}
                onChange={e => updateGap(i, { impact_description: e.target.value })}
                placeholder="e.g. Without contemporaneous prompt records, provenance of the generated output cannot be independently confirmed"
                className="w-full text-sm border rounded px-2 py-1.5"
                style={{ borderColor: 'rgba(0,0,0,0.12)' }}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addGap}
        className="w-full py-2 text-sm border-2 border-dashed rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
      >
        + Add gap manually
      </button>
    </div>
  )
}
