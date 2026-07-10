'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle } from 'lucide-react'
import { WorkbookData, DOMAIN_LABELS, JUDGMENT_OPTIONS } from './workbook-schema'

type S3 = WorkbookData['section_3']
type S2 = WorkbookData['section_2']
type ControlId = keyof S3

interface Props {
  data: S3
  section2?: S2
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

const CONTROL_OBJECTIVES: Record<ControlId, string> = {
  A01: 'Is the submitting party clearly identified with documented authority to submit this content?',
  R01: 'Are all AI generation tools named and documented with enough specificity to verify license terms?',
  R02: 'Did each named tool have a commercial license in effect during the production period?',
  R03: 'If a custom or fine-tuned model was used, is its training data source and licensing documented?',
  R04: 'Who owns the AI output, and is any work-for-hire arrangement clearly documented?',
  H01: 'Is the human creative contribution documented at a level that could support a copyright claim?',
  H02: 'If a copyright claim is made, is the basis plausible and documented?',
  I01: 'Does the content contain recognizable third-party copyrighted visual elements not cleared by license?',
  I02: 'Is the audio free of unlicensed third-party copyrighted content?',
  I03: 'Does the content contain trademarks or brand elements that could create commercial risk?',
  L01: 'Does any synthetic figure in the content resemble a specific real, identifiable person?',
  L02: 'Are synthetic performers generic, or could any be confused with a real person?',
  L03: 'If a real-person likeness is confirmed, is the required rights documentation provided?',
  T01: 'Is the production workflow documented well enough to establish a coherent provenance record?',
  D01: 'Are dates, versions, and subscription records internally consistent across all submitted documents?',
  D02: 'Is there evidence that documentation was created or modified retroactively?',
}

// ── Primitive form components ─────────────────────────────────────────────────

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

// ── Section 2 context banner ──────────────────────────────────────────────────

function S2Banner({ items }: {
  items: Array<{ label: string; value: string | boolean | null | undefined; warn?: boolean }>
}) {
  const visible = items.filter(i => i.value !== '' && i.value !== null && i.value !== undefined && i.value !== false)
  if (visible.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 rounded text-[11px]"
      style={{ backgroundColor: '#f5f3f0' }}>
      <span className="text-gray-400 mr-0.5">§2 obs.:</span>
      {visible.map(i => (
        <span key={String(i.label)} className={`px-2 py-0.5 rounded-full border ${
          i.warn
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : 'border-gray-200 bg-white text-gray-600'
        }`}>
          <span className="text-gray-400 mr-1">{i.label}:</span>
          <span>{typeof i.value === 'boolean' ? (i.value ? 'Yes' : 'No') : String(i.value)}</span>
        </span>
      ))}
    </div>
  )
}

// ── Per-control evidence fields ───────────────────────────────────────────────

function ControlExtras({ id, data, update, section2 }: {
  id: ControlId; data: any; update: (updates: any) => void; section2?: S2
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
        <Check checked={data.custom_model} onChange={v => update({ custom_model: v })}
          label="Custom / fine-tuned model was used" />
        {data.custom_model && (
          <>
            <Textarea value={data.training_data} onChange={v => update({ training_data: v })} rows={2}
              placeholder="Training data source as declared or inferred" />
            <Sel value={data.licensing_documented} onChange={v => update({ licensing_documented: v })} className="w-full"
              options={['Documented', 'Partially documented', 'Not documented']}
              placeholder="Training data licensing status…" />
          </>
        )}
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
          <>
            <Textarea value={data.claim_basis} onChange={v => update({ claim_basis: v })} rows={2}
              placeholder="Basis of claim — what human-authored elements are being claimed?" />
            <Sel value={data.assessment} onChange={v => update({ assessment: v })} className="w-full"
              options={['Plausible and documented', 'Plausible but weakly documented', 'Not plausible — contribution too minimal']}
              placeholder="Reviewer assessment of claim strength…" />
          </>
        )}
      </div>
    )

    case 'I01': return (
      <div className="space-y-2">
        {section2 && (
          <S2Banner items={[
            { label: 'Logos', value: section2.logos_observed, warn: !!section2.logos_observed && section2.logos_observed !== 'No' },
            { label: 'Copyright artwork', value: section2.copyrighted_artwork, warn: !!section2.copyrighted_artwork && section2.copyrighted_artwork !== 'None observed' },
            ...(section2.logos_description ? [{ label: 'Logo notes', value: section2.logos_description }] : []),
          ]} />
        )}
        <Check checked={data.content_viewed} onChange={v => update({ content_viewed: v })}
          label="Reviewer watched content independently before checking declarations" />
        <Textarea value={data.elements_identified} onChange={v => update({ elements_identified: v })} rows={2}
          placeholder="Copyrighted elements identified by reviewer (or 'none identified')" />
      </div>
    )

    case 'I02': return (
      <div className="space-y-2">
        {section2 && (
          <S2Banner items={[
            { label: 'Audio present', value: section2.has_audio ? 'Yes' : (section2.has_audio === false ? 'No' : undefined) },
            { label: 'Music heard', value: section2.music_heard, warn: !!section2.music_heard && section2.music_heard !== 'None' },
            { label: 'Speech heard', value: section2.speech_heard ? 'Yes' : undefined },
          ]} />
        )}
        <Check checked={data.audio_reviewed} onChange={v => update({ audio_reviewed: v })} label="Audio reviewed by reviewer" />
        <Textarea value={data.audio_source} onChange={v => update({ audio_source: v })} rows={2}
          placeholder="Audio source as declared (tool, platform, licensed track, original)" />
        <Sel value={data.license_provided} onChange={v => update({ license_provided: v })} className="w-full"
          options={['License documentation provided', 'Not required (original / AI-generated no-rights)', 'Missing']}
          placeholder="Audio license status…" />
      </div>
    )

    case 'I03': return (
      <div className="space-y-2">
        {section2 && (
          <S2Banner items={[
            { label: 'Logos', value: section2.logos_observed, warn: !!section2.logos_observed && section2.logos_observed !== 'No' },
            { label: 'Trademarks', value: section2.trademarks_observed, warn: !!section2.trademarks_observed && section2.trademarks_observed !== 'No' },
            ...(section2.trademarks_description ? [{ label: 'TM notes', value: section2.trademarks_description }] : []),
          ]} />
        )}
        <Textarea value={data.trademark_elements} onChange={v => update({ trademark_elements: v })} rows={2}
          placeholder="Trademark/brand elements noted by reviewer (or 'none observed')" />
      </div>
    )

    case 'L01': return (
      <div className="space-y-2">
        {section2 && (
          <S2Banner items={[
            { label: 'Synthetic humans', value: section2.synthetic_humans },
            { label: 'Likeness suspected', value: section2.real_likeness_suspected, warn: !!section2.real_likeness_suspected && section2.real_likeness_suspected !== 'No' },
            ...(section2.real_likeness_description ? [{ label: 'Likeness notes', value: section2.real_likeness_description, warn: true }] : []),
          ]} />
        )}
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
        {data.real_person_confirmed && (
          <>
            <Text value={data.documentation_type} onChange={v => update({ documentation_type: v })} className="w-full"
              placeholder="Type of documentation required (talent release, right of publicity license, etc.)" />
            <Sel value={data.documentation_provided} onChange={v => update({ documentation_provided: v })} className="w-full"
              options={['Documentation provided and confirmed', 'Documentation not provided', 'Unclear']}
              placeholder="Documentation status…" />
          </>
        )}
      </div>
    )

    case 'T01': return (
      <div className="space-y-3">
        <div>
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Evidence documentation</div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-36 flex-shrink-0">Workflow description</span>
              <Sel value={data.workflow_provided} onChange={v => update({ workflow_provided: v })} className="flex-1"
                options={['Provided', 'Partially provided', 'Not provided']} placeholder="Status…" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-36 flex-shrink-0">Prompt logs</span>
              <Sel value={data.prompt_logs} onChange={v => update({ prompt_logs: v })} className="flex-1"
                options={['Provided', 'Partially provided', 'Not provided']} placeholder="Status…" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-36 flex-shrink-0">Output file metadata</span>
              <Sel value={data.metadata_provided} onChange={v => update({ metadata_provided: v })} className="flex-1"
                options={['Provided', 'Partially provided', 'Not provided']} placeholder="Status…" />
            </div>
          </div>
        </div>
        <div className="pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Workflow coherence</div>
          <Sel value={data.workflow_coherence} onChange={v => update({ workflow_coherence: v })} className="w-full"
            options={['Coherent', 'Minor inconsistencies', 'Notable inconsistencies', 'Incoherent']}
            placeholder="Coherence assessment…" />
        </div>
      </div>
    )

    case 'D01': return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-36 flex-shrink-0">Date consistency</span>
          <Sel value={data.date_consistency} onChange={v => update({ date_consistency: v })} className="flex-1"
            options={['Consistent', 'Minor issues', 'Inconsistent']} placeholder="Assessment…" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-36 flex-shrink-0">Version consistency</span>
          <Sel value={data.version_consistency} onChange={v => update({ version_consistency: v })} className="flex-1"
            options={['Consistent', 'Minor issues', 'Inconsistent']} placeholder="Assessment…" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-36 flex-shrink-0">Receipt dates</span>
          <Sel value={data.receipt_date_consistency} onChange={v => update({ receipt_date_consistency: v })} className="flex-1"
            options={['Consistent', 'Receipt postdates generation', 'Unclear']} placeholder="Assessment…" />
        </div>
      </div>
    )

    case 'D02': return (
      <div className="space-y-3">
        <Textarea value={data.retroactive_indicators} onChange={v => update({ retroactive_indicators: v })} rows={3}
          placeholder="Specific indicators observed (inconsistent timestamps, print dates, reconstructed-sounding descriptions)" />
        <Sel value={data.retroactive_basis} onChange={v => update({ retroactive_basis: v })} className="w-full"
          options={[
            'None — documentation appears contemporaneous',
            'Suspected — note indicators above',
            'Confirmed — clear evidence of retroactive documentation',
          ]}
          placeholder="Overall retroactive documentation assessment…" />
      </div>
    )

    default: return null
  }
}

// ── Single control row ────────────────────────────────────────────────────────

function ControlRow({ id, data, onChange, section2 }: {
  id: ControlId; data: S3; onChange: (updates: Partial<S3>) => void; section2?: S2
}) {
  const ctrl = (data as any)[id] ?? {}
  const update = (updates: any) => onChange({ [id]: { ...ctrl, ...updates } } as any)
  const judged = !!(ctrl.judgment)

  const notesHelper = ctrl.judgment === 'Partially Verified'
    ? 'Explain what was verified and what uncertainty remains.'
    : ctrl.judgment === 'Not Provided'
    ? 'Note what evidence was missing and whether the gap is addressable.'
    : null

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2" style={{ backgroundColor: judged ? 'rgba(0,0,0,0.015)' : 'white' }}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-mono text-gray-400">{id}</span>
          {judged && (
            <span className={`text-[11px] font-semibold ${judgmentColor(ctrl.judgment)}`}>
              {ctrl.judgment}
            </span>
          )}
        </div>
        <div className="text-sm font-semibold" style={{ color: '#1a1918' }}>{CONTROL_DESCRIPTIONS[id]}</div>
        <div className="text-[12px] text-gray-500 mt-0.5 italic">{CONTROL_OBJECTIVES[id]}</div>
      </div>

      <div className="px-4 pb-4 pt-2 space-y-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>

        {/* Domain-specific evidence fields (includes S2 context where relevant) */}
        <ControlExtras id={id} data={ctrl} update={update} section2={section2} />

        {/* Free-text evidence summary (controls that have it in schema) */}
        {'evidence' in ctrl && (
          <Textarea
            value={ctrl.evidence ?? ''}
            onChange={v => update({ evidence: v })}
            rows={2}
            placeholder={`Evidence reviewed for ${id}…`}
          />
        )}

        {/* Judgment */}
        <div>
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Judgment</div>
          <select
            value={ctrl.judgment ?? ''}
            onChange={e => update({ judgment: e.target.value })}
            className={`w-full text-sm border rounded px-2 py-2 font-medium ${judgmentColor(ctrl.judgment ?? '')}`}
            style={{ borderColor: 'rgba(0,0,0,0.15)' }}
          >
            <option value="">— Select judgment —</option>
            {JUDGMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Assessment notes */}
        <div>
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Assessment notes</div>
          <textarea
            value={ctrl.notes ?? ''}
            onChange={e => update({ notes: e.target.value })}
            rows={2}
            placeholder="Discrepancies, uncertainty, and reasoning a future reviewer should know"
            className="w-full text-xs border rounded px-2 py-1.5 resize-none text-gray-600"
            style={{ borderColor: 'rgba(0,0,0,0.10)' }}
          />
          {notesHelper && (
            <div className="text-[11px] text-amber-700 mt-1">{notesHelper}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Domain judgment summary for collapsed header ──────────────────────────────

function domainSummary(controls: ControlId[], data: S3): string {
  const judgments = controls.map(id => (data as any)[id]?.judgment).filter(Boolean) as string[]
  if (judgments.length === 0) return ''
  const counts: Record<string, number> = {}
  for (const j of judgments) counts[j] = (counts[j] || 0) + 1
  return Object.entries(counts).map(([j, n]) => `${n} ${j}`).join(' · ')
}

// ── Domain accordion section ──────────────────────────────────────────────────

function DomainSection({ domain, controls, data, section2, onChange, onDomainFocus, initialOpen }: {
  domain: string; controls: ControlId[]
  data: S3; section2?: S2
  onChange: (u: Partial<S3>) => void
  onDomainFocus?: (d: string) => void
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(initialOpen ?? false)
  const done = controls.filter(id => !!(data as any)[id]?.judgment).length
  const complete = done === controls.length
  const summary = domainSummary(controls, data)

  return (
    <div className="border rounded-lg overflow-hidden mb-3" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => {
          const opening = !open
          setOpen(opening)
          if (opening) onDomainFocus?.(domain)
        }}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
      >
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
        <span className="font-mono text-sm font-bold flex-shrink-0" style={{ color: '#C8900A' }}>{domain}</span>
        <span className="text-sm font-medium flex-1 text-left" style={{ color: '#1a1918' }}>
          {DOMAIN_LABELS[domain]}
        </span>

        {complete ? (
          <span className="flex items-center gap-1.5 text-xs text-green-700 flex-shrink-0">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{summary}</span>
          </span>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
            done > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {done === 0 ? `${controls.length} to review` : `${done} of ${controls.length}`}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-4 space-y-3">
            {controls.map(id => (
              <ControlRow key={id} id={id} data={data} onChange={onChange} section2={section2} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section root ──────────────────────────────────────────────────────────────

export function Section3Evidence({ data, section2, onChange, onDomainFocus }: Props) {
  const totalDone = Object.keys(data).filter(id => !!(data as any)[id]?.judgment).length

  // First incomplete domain opens by default; all others start collapsed
  const firstIncompleteDomain = Object.entries(DOMAIN_CONTROLS)
    .find(([, controls]) => controls.some(id => !(data as any)[id]?.judgment))?.[0]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#1a1918' }}>§ 3  Evidence Review</h2>
        <p className="text-sm text-gray-500">
          16 controls across 7 domains. Compare submitted evidence against your observations. Assign a judgment to each.
          All 16 must be completed to unlock Sections 4 and 5.
        </p>
        <div className={`mt-2 text-xs px-3 py-1.5 rounded inline-block ${
          totalDone === 16 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
        }`}>
          {totalDone === 16
            ? '✓ All 16 controls complete'
            : `Assessment progress: ${totalDone} of 16 controls completed`}
        </div>
      </div>

      <div>
        {Object.entries(DOMAIN_CONTROLS).map(([domain, controls]) => (
          <DomainSection
            key={domain}
            domain={domain}
            controls={controls}
            data={data}
            section2={section2}
            onChange={onChange}
            onDomainFocus={onDomainFocus}
            initialOpen={domain === firstIncompleteDomain}
          />
        ))}
      </div>
    </div>
  )
}
