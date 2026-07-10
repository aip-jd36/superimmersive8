'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { WorkbookData, DOMAIN_LABELS, JUDGMENT_OPTIONS } from './workbook-schema'

type S3 = WorkbookData['section_3']
type ControlId = keyof S3

interface Props {
  data: S3
  onChange: (updates: Partial<S3>) => void
  onDomainFocus?: (domain: string) => void
}

const DOMAIN_CONTROLS: Record<string, ControlId[]> = {
  A: ['A01'],
  R: ['R01', 'R02', 'R03', 'R04'],
  H: ['H01', 'H02'],
  I: ['I01', 'I02', 'I03'],
  L: ['L01', 'L02', 'L03'],
  T: ['T01'],
  D: ['D01', 'D02'],
}

const CONTROL_DESCRIPTIONS: Record<ControlId, string> = {
  A01: 'Submitting party identity and authority to submit',
  R01: 'AI tool identification — all tools named and documented',
  R02: 'Commercial license confirmation for each named tool',
  R03: 'Custom or fine-tuned model provenance',
  R04: 'AI output ownership and work-for-hire arrangement',
  H01: 'Human creative contribution — level and documentation',
  H02: 'Authorship claim — basis and supportability',
  I01: 'Third-party copyrighted content — visual',
  I02: 'Third-party copyrighted content — audio',
  I03: 'Trademarks and brand elements',
  L01: 'Synthetic likeness — real person resemblance',
  L02: 'Performer distinctness — generic vs. identifiable',
  L03: 'Likeness releases and right-of-publicity documentation',
  T01: 'Production workflow documentation and coherence',
  D01: 'Date and version consistency across documents',
  D02: 'Retroactive documentation indicators',
}

function Sel({ value, onChange, options, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void
  options: string[]; placeholder?: string; className?: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`text-sm border rounded px-2 py-1.5 ${className}`}
      style={{ borderColor: 'rgba(0,0,0,0.15)' }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Text({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`text-sm border rounded px-2 py-1.5 ${className}`}
      style={{ borderColor: 'rgba(0,0,0,0.15)' }} />
  )
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: '#C8900A' }} />
      {label}
    </label>
  )
}

function Textarea({ value, onChange, rows = 3, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      className="w-full text-sm border rounded px-2 py-1.5 resize-none"
      style={{ borderColor: 'rgba(0,0,0,0.15)' }} />
  )
}

function judgmentColor(j: string) {
  if (j === 'Verified') return 'text-green-600'
  if (j === 'Partially Verified') return 'text-amber-600'
  if (j === 'Not Provided') return 'text-red-500'
  if (j === 'Not Applicable') return 'text-gray-400'
  return 'text-gray-400'
}

function ControlExtras({ id, data, update }: {
  id: ControlId; data: any; update: (updates: any) => void
}) {
  switch (id) {
    case 'R02': return (
      <div className="space-y-2">
        <Textarea value={data.tools_reviewed} onChange={v => update({ tools_reviewed: v })} rows={2}
          placeholder="Which tool licenses did you check? (e.g. Runway Gen-3 subscription ToS as of [date])" />
        <Textarea value={data.license_status} onChange={v => update({ license_status: v })} rows={2}
          placeholder="License status per tool — include commercial use clause language or lack thereof" />
        <Sel value={data.receipts} onChange={v => update({ receipts: v })} className="w-full"
          options={['Provided', 'Partially provided', 'Not provided']} placeholder="Receipts / subscription proof…" />
      </div>
    )
    case 'R03': return (
      <div className="space-y-2">
        <Check checked={data.custom_model} onChange={v => update({ custom_model: v })} label="Custom / fine-tuned model was used" />
        {data.custom_model && <>
          <Textarea value={data.training_data} onChange={v => update({ training_data: v })} rows={2}
            placeholder="Training data source as declared or inferred" />
          <Sel value={data.licensing_documented} onChange={v => update({ licensing_documented: v })} className="w-full"
            options={['Documented', 'Partially documented', 'Not documented']}
            placeholder="Training data licensing status…" />
        </>}
      </div>
    )
    case 'R04': return (
      <div className="space-y-2">
        <Textarea value={data.tos_summary} onChange={v => update({ tos_summary: v })} rows={2}
          placeholder="Relevant ToS output ownership language (quote or paraphrase)" />
        <Sel value={data.work_for_hire} onChange={v => update({ work_for_hire: v })} className="w-full"
          options={['Yes — documented', 'Not applicable (creator owns work)', 'Unclear / undocumented']}
          placeholder="Work-for-hire arrangement…" />
      </div>
    )
    case 'H01': return (
      <Sel value={data.contribution_level} onChange={v => update({ contribution_level: v })} className="w-full"
        options={['Substantial', 'Moderate', 'Minimal']}
        placeholder="Human contribution level…" />
    )
    case 'H02': return (
      <div className="space-y-2">
        <Sel value={data.copyright_claim} onChange={v => update({ copyright_claim: v })} className="w-full"
          options={['Yes — claiming copyright', 'No claim stated', 'Unclear']}
          placeholder="Copyright claim made?" />
        {data.copyright_claim === 'Yes — claiming copyright' && (
          <Textarea value={data.claim_basis} onChange={v => update({ claim_basis: v })} rows={2}
            placeholder="Basis of claim — what human-authored elements are being claimed?" />
        )}
      </div>
    )
    case 'I01': return (
      <div className="space-y-2">
        <Check checked={data.content_viewed} onChange={v => update({ content_viewed: v })}
          label="Reviewer watched content independently before checking declarations" />
        <Textarea value={data.elements_identified} onChange={v => update({ elements_identified: v })} rows={2}
          placeholder="Copyrighted elements identified by reviewer (or 'none identified')" />
      </div>
    )
    case 'I02': return (
      <div className="space-y-2">
        <Check checked={data.audio_reviewed} onChange={v => update({ audio_reviewed: v })} label="Audio reviewed by reviewer" />
        <Textarea value={data.audio_source} onChange={v => update({ audio_source: v })} rows={2}
          placeholder="Audio source as declared (tool, platform, licensed track, original)" />
        <Sel value={data.license_provided} onChange={v => update({ license_provided: v })} className="w-full"
          options={['License documentation provided', 'Not required (original / AI-generated no-rights)', 'Missing']}
          placeholder="Audio license status…" />
      </div>
    )
    case 'I03': return (
      <Textarea value={data.trademark_elements} onChange={v => update({ trademark_elements: v })} rows={2}
        placeholder="Trademark/brand elements noted by reviewer (or 'none observed')" />
    )
    case 'L01': return (
      <div className="space-y-2">
        <Check checked={data.content_viewed} onChange={v => update({ content_viewed: v })}
          label="Reviewer watched specifically for likeness (independent of declarations)" />
        <Sel value={data.likeness_found} onChange={v => update({ likeness_found: v })} className="w-full"
          options={['None identified', 'Suspected — describe in notes', 'Confirmed — describe in notes']}
          placeholder="Reviewer likeness finding…" />
      </div>
    )
    case 'L02': return (
      <div className="space-y-2">
        <Check checked={data.performers_present} onChange={v => update({ performers_present: v })}
          label="Synthetic performers present in content" />
        {data.performers_present && (
          <Sel value={data.distinctness} onChange={v => update({ distinctness: v })} className="w-full"
            options={['Generic — no specific person identifiable', 'Distinctive but not resembling a real person', 'Resembles or could be confused with a real person']}
            placeholder="Performer distinctness assessment…" />
        )}
      </div>
    )
    case 'L03': return (
      <div className="space-y-2">
        <Check checked={data.real_person_confirmed} onChange={v => update({ real_person_confirmed: v })}
          label="Real person likeness confirmed in this submission" />
        {data.real_person_confirmed && <>
          <Text value={data.documentation_type} onChange={v => update({ documentation_type: v })} className="w-full"
            placeholder="Type of documentation required (talent release, right of publicity license, etc.)" />
          <Sel value={data.documentation_provided} onChange={v => update({ documentation_provided: v })} className="w-full"
            options={['Documentation provided and confirmed', 'Documentation not provided', 'Unclear']}
            placeholder="Documentation status…" />
        </>}
      </div>
    )
    case 'T01': return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Sel value={data.workflow_provided} onChange={v => update({ workflow_provided: v })} className="w-full"
            options={['Provided', 'Partially provided', 'Not provided']} placeholder="Workflow description…" />
          <Sel value={data.prompt_logs} onChange={v => update({ prompt_logs: v })} className="w-full"
            options={['Provided', 'Partially provided', 'Not provided']} placeholder="Prompt logs…" />
          <Sel value={data.metadata_provided} onChange={v => update({ metadata_provided: v })} className="w-full"
            options={['Provided', 'Partially provided', 'Not provided']} placeholder="File metadata…" />
          <Sel value={data.workflow_coherence} onChange={v => update({ workflow_coherence: v })} className="w-full"
            options={['Coherent', 'Minor inconsistencies', 'Notable inconsistencies', 'Incoherent']}
            placeholder="Workflow coherence…" />
        </div>
      </div>
    )
    case 'D01': return (
      <div className="grid grid-cols-3 gap-2">
        <Sel value={data.date_consistency} onChange={v => update({ date_consistency: v })} className="w-full"
          options={['Consistent', 'Minor issues', 'Inconsistent']} placeholder="Date consistency…" />
        <Sel value={data.version_consistency} onChange={v => update({ version_consistency: v })} className="w-full"
          options={['Consistent', 'Minor issues', 'Inconsistent']} placeholder="Version consistency…" />
        <Sel value={data.receipt_date_consistency} onChange={v => update({ receipt_date_consistency: v })} className="w-full"
          options={['Consistent', 'Receipt postdates generation', 'Unclear']} placeholder="Receipt dates…" />
      </div>
    )
    case 'D02': return (
      <div className="space-y-2">
        <Textarea value={data.retroactive_indicators} onChange={v => update({ retroactive_indicators: v })} rows={2}
          placeholder="Specific indicators observed (inconsistent timestamps, print dates, reconstructed-sounding descriptions)" />
        <Sel value={data.retroactive_basis} onChange={v => update({ retroactive_basis: v })} className="w-full"
          options={['None — documentation appears contemporaneous', 'Suspected — note indicators above', 'Confirmed — clear evidence of retroactive documentation']}
          placeholder="Overall retroactive documentation assessment…" />
      </div>
    )
    default: return null
  }
}

function ControlRow({ id, data, onChange }: {
  id: ControlId; data: S3; onChange: (updates: Partial<S3>) => void
}) {
  const ctrl = (data as any)[id] ?? {}
  const update = (updates: any) => onChange({ [id]: { ...ctrl, ...updates } } as any)

  return (
    <div className="border rounded-lg p-4 space-y-3" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-gray-500 mr-2">{id}</span>
          <span className="text-sm font-medium" style={{ color: '#1a1918' }}>{CONTROL_DESCRIPTIONS[id]}</span>
        </div>
        <select
          value={ctrl.judgment ?? ''}
          onChange={e => update({ judgment: e.target.value })}
          className={`flex-shrink-0 text-xs border rounded px-2 py-1 font-medium ${judgmentColor(ctrl.judgment ?? '')}`}
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
        >
          <option value="">— Judgment —</option>
          {JUDGMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Domain-specific extra fields */}
      <ControlExtras id={id} data={ctrl} update={update} />

      {/* Evidence field (shared, not all controls) */}
      {'evidence' in ctrl && (
        <textarea
          value={ctrl.evidence ?? ''}
          onChange={e => update({ evidence: e.target.value })}
          rows={2}
          placeholder={`Evidence reviewed for ${id}…`}
          className="w-full text-sm border rounded px-2 py-1.5 resize-none"
          style={{ borderColor: 'rgba(0,0,0,0.12)' }}
        />
      )}

      {/* Notes (all controls) */}
      <textarea
        value={ctrl.notes ?? ''}
        onChange={e => update({ notes: e.target.value })}
        rows={2}
        placeholder="Reviewer notes — discrepancies, uncertainty, anything a future reviewer should know"
        className="w-full text-xs border rounded px-2 py-1.5 resize-none text-gray-600"
        style={{ borderColor: 'rgba(0,0,0,0.10)' }}
      />
    </div>
  )
}

function DomainSection({ domain, controls, data, onChange, onDomainFocus }: {
  domain: string; controls: ControlId[]
  data: S3; onChange: (u: Partial<S3>) => void; onDomainFocus?: (d: string) => void
}) {
  const [open, setOpen] = useState(true)
  const done = controls.filter(id => !!(data as any)[id]?.judgment).length

  return (
    <div>
      <button
        type="button"
        onClick={() => { setOpen(!open); onDomainFocus?.(domain) }}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <span className="font-mono text-sm font-semibold" style={{ color: '#C8900A' }}>{domain}</span>
          <span className="text-sm font-medium" style={{ color: '#1a1918' }}>{DOMAIN_LABELS[domain]}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          done === controls.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {done}/{controls.length}
        </span>
      </button>

      {open && (
        <div className="space-y-3 mb-6">
          {controls.map(id => (
            <ControlRow key={id} id={id} data={data} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Section3Evidence({ data, onChange, onDomainFocus }: Props) {
  const totalDone = Object.keys(data).filter(id => !!(data as any)[id]?.judgment).length

  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#1a1918' }}>§ 3  Evidence Checklist</h2>
        <p className="text-sm text-gray-500">16 controls across 7 domains. Assign a judgment to each. All 16 must be judged to unlock Sections 4 and 5.</p>
        <div className={`mt-2 text-xs px-3 py-1.5 rounded inline-block ${
          totalDone === 16 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
        }`}>
          {totalDone}/16 controls judged
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        {Object.entries(DOMAIN_CONTROLS).map(([domain, controls]) => (
          <DomainSection
            key={domain}
            domain={domain}
            controls={controls}
            data={data}
            onChange={onChange}
            onDomainFocus={onDomainFocus}
          />
        ))}
      </div>
    </div>
  )
}
