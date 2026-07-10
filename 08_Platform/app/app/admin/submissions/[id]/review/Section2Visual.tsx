'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { WorkbookData } from './workbook-schema'

type S2 = WorkbookData['section_2']

interface Props {
  data: S2
  submission: Record<string, any>
  onChange: (updates: Partial<S2>) => void
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  )
}

function Sel({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void
  options: string[]; placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full text-sm border rounded px-3 py-1.5"
      style={{ borderColor: 'rgba(0,0,0,0.15)' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Text({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm border rounded px-3 py-1.5"
      style={{ borderColor: 'rgba(0,0,0,0.15)' }}
    />
  )
}

function Num({ value, onChange, placeholder }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      min={0}
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      placeholder={placeholder}
      className="w-32 text-sm border rounded px-3 py-1.5"
      style={{ borderColor: 'rgba(0,0,0,0.15)' }}
    />
  )
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: '#C8900A' }} />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

function Textarea({ value, onChange, rows = 3, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full text-sm border rounded px-3 py-2 resize-none"
      style={{ borderColor: 'rgba(0,0,0,0.15)' }}
    />
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-2 border-t"
        style={{ borderColor: 'rgba(0,0,0,0.06)' }}>{title}</div>
      {children}
    </div>
  )
}

function SubGroup({ title }: { title: string }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 pt-3 pb-0.5 mt-1 border-t"
      style={{ borderColor: 'rgba(0,0,0,0.04)' }}>{title}</div>
  )
}

const PRESENCE = ['None observed', 'Possible', 'Confirmed'] as const

const DEFAULT_PASSES = { first_complete: false, second_viewing: false, frame_by_frame: false }

export function Section2Visual({ data, submission, onChange }: Props) {
  const u = (updates: Partial<S2>) => onChange(updates)

  // Safe read — existing workbooks saved before this schema change have viewing_passes undefined
  const passes = data.viewing_passes ?? DEFAULT_PASSES

  // landmarks_observed was a boolean in the old schema; normalize to string for the new Select
  const landmarksValue = typeof data.landmarks_observed === 'boolean'
    ? (data.landmarks_observed ? 'Confirmed' : '')
    : (data.landmarks_observed as string)

  // Pre-populate URL field on first open if still empty
  useEffect(() => {
    if (!data.video_url_confirmed && submission.video_url) {
      u({ video_url_confirmed: submission.video_url })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const firstViewingDone = passes.first_complete
  const freeformOk = data.freeform_observations.trim().length >= 20
  const sectionComplete = firstViewingDone && freeformOk

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#1a1918' }}>§ 2  Independent Video Observation</h2>
        <p className="text-sm text-gray-500">Watch the video in full at least once before recording observations. Do not consult the submitter's declarations first.</p>
        {submission.video_url && (
          <a href={submission.video_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline mt-1 block">
            Open video ↗
          </a>
        )}
      </div>

      {/* First Impression */}
      <Group title="First Impression">
        <Field label="Video URL watched" hint="Confirm this matches what you watched. Edit if you used a mirror or download.">
          <Text value={data.video_url_confirmed} onChange={v => u({ video_url_confirmed: v })}
            placeholder="Pre-populated from submission record" />
        </Field>

        <div>
          <div className="text-sm font-medium mb-2" style={{ color: '#1a1918' }}>Viewing passes</div>
          <div className="space-y-2">
            <Check
              checked={passes.first_complete}
              onChange={v => u({ viewing_passes: { ...passes, first_complete: v } })}
              label="First complete viewing (required before proceeding)"
            />
            <Check
              checked={passes.second_viewing}
              onChange={v => u({ viewing_passes: { ...passes, second_viewing: v } })}
              label="Second viewing — targeted review"
            />
            <Check
              checked={passes.frame_by_frame}
              onChange={v => u({ viewing_passes: { ...passes, frame_by_frame: v } })}
              label="Frame-by-frame review (at least one segment)"
            />
          </div>
          {!firstViewingDone && (
            <p className="text-xs text-amber-600 mt-1.5">Complete the first full viewing before recording observations.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Runtime observed (seconds)">
            <Num value={data.runtime_observed} onChange={v => u({ runtime_observed: v })} placeholder="e.g. 6" />
          </Field>
          <Field label="Scene count (approximate)">
            <Num value={data.scene_count} onChange={v => u({ scene_count: v })} placeholder="e.g. 2" />
          </Field>
          <Field label="Aspect ratio">
            <Sel value={data.aspect_ratio} onChange={v => u({ aspect_ratio: v })}
              options={['16:9', '9:16', '1:1', '4:5', '4:3', 'Other']} placeholder="Select…" />
          </Field>
          <Field label="Pacing">
            <Sel value={data.pacing} onChange={v => u({ pacing: v })}
              options={['Slow', 'Medium', 'Fast', 'Variable']} placeholder="Select…" />
          </Field>
        </div>

        <Field label="Color treatment / visual style">
          <Text value={data.color_treatment} onChange={v => u({ color_treatment: v })}
            placeholder="e.g. warm pastels, high contrast, muted, monochromatic" />
        </Field>
      </Group>

      {/* Content Observed */}
      <Group title="Content Observed">

        <SubGroup title="Humans & Likeness" />

        <Field label="Synthetic humans visible">
          <Sel value={data.synthetic_humans} onChange={v => u({ synthetic_humans: v })}
            options={['None', '1–2', 'Several (3–10)', 'Many (10+)']} placeholder="Select…" />
        </Field>
        <Field label="Real person likeness">
          <Sel value={data.real_likeness_suspected} onChange={v => u({ real_likeness_suspected: v })}
            options={['None identified', 'Possible', 'Confirmed']} placeholder="Select…" />
        </Field>
        {(data.real_likeness_suspected === 'Possible' || data.real_likeness_suspected === 'Confirmed') && (
          <Field label="Describe the resemblance" hint="Be specific — who or what the figure resembles and why.">
            <Textarea value={data.real_likeness_description} onChange={v => u({ real_likeness_description: v })}
              placeholder="e.g. Figure at 0:04 resembles [name] in facial structure and hair — indeterminate but notable" />
          </Field>
        )}
        <div className="flex gap-6">
          <Check checked={data.animals_present} onChange={v => u({ animals_present: v })} label="Animals present" />
          <Check checked={data.children_present} onChange={v => u({ children_present: v })} label="Children / minors visible" />
        </div>

        <SubGroup title="Audio" />

        <Check checked={data.has_audio} onChange={v => u({ has_audio: v })} label="Video has audio" />
        {data.has_audio && (
          <div className="space-y-4 pl-4 border-l-2" style={{ borderColor: 'rgba(200,144,10,0.3)' }}>
            <Field label="Music heard">
              <Sel value={data.music_heard} onChange={v => u({ music_heard: v })}
                options={['None', 'Generic / royalty-free', 'Identifiable track', 'Possibly identifiable']}
                placeholder="Select…" />
            </Field>
            <div className="flex gap-6">
              <Check checked={data.speech_heard} onChange={v => u({ speech_heard: v })} label="Speech / voiceover heard" />
              <Check checked={data.sound_effects} onChange={v => u({ sound_effects: v })} label="Sound effects present" />
            </div>
            <Field label="Audio quality issues">
              <Text value={data.audio_quality_issues} onChange={v => u({ audio_quality_issues: v })}
                placeholder="e.g. sync issue at 0:22 — or leave blank if none" />
            </Field>
          </div>
        )}

        <SubGroup title="Text & Brands" />

        <Check checked={data.text_visible} onChange={v => u({ text_visible: v })} label="Text visible in video (titles, captions, signs)" />
        {data.text_visible && (
          <Textarea value={data.text_description} onChange={v => u({ text_description: v })} rows={2}
            placeholder="What text is visible? Any brand or IP references?" />
        )}

        <Field label="Logos observed">
          <Sel value={data.logos_observed} onChange={v => u({ logos_observed: v })}
            options={[...PRESENCE]} placeholder="Select…" />
        </Field>
        {data.logos_observed !== '' && data.logos_observed !== 'None observed' && (
          <Field label="Logo description">
            <Textarea value={data.logos_description} onChange={v => u({ logos_description: v })} rows={2}
              placeholder="Describe what you saw and at which timestamp" />
          </Field>
        )}

        <Field label="Trademarks observed">
          <Sel value={data.trademarks_observed} onChange={v => u({ trademarks_observed: v })}
            options={[...PRESENCE]} placeholder="Select…" />
        </Field>
        {data.trademarks_observed !== '' && data.trademarks_observed !== 'None observed' && (
          <Field label="Trademark description">
            <Textarea value={data.trademarks_description} onChange={v => u({ trademarks_description: v })} rows={2}
              placeholder="Describe what you saw and at which timestamp" />
          </Field>
        )}

        <Field label="Real-world landmarks or locations">
          <Sel value={landmarksValue} onChange={v => u({ landmarks_observed: v as any })}
            options={[...PRESENCE]} placeholder="Select…" />
        </Field>
        {landmarksValue !== '' && landmarksValue !== 'None observed' && (
          <Textarea value={data.landmarks_description} onChange={v => u({ landmarks_description: v })} rows={2}
            placeholder="Which landmarks? Could they trigger location clearance requirements?" />
        )}

        <Field label="Copyrighted artwork or set design">
          <Sel value={data.copyrighted_artwork} onChange={v => u({ copyrighted_artwork: v })}
            options={[...PRESENCE]} placeholder="Select…" />
        </Field>
        {data.copyrighted_artwork !== '' && data.copyrighted_artwork !== 'None observed' && (
          <Textarea value={data.copyrighted_artwork_description} onChange={v => u({ copyrighted_artwork_description: v })} rows={2}
            placeholder="Describe what you saw" />
        )}

      </Group>

      {/* Technical Observations */}
      <Group title="Technical Observations">
        <div className="grid grid-cols-3 gap-4">
          <Field label="AI artifacts">
            <Sel value={data.ai_artifacts} onChange={v => u({ ai_artifacts: v })}
              options={['None observed', 'Minor', 'Moderate', 'Significant']} placeholder="Select…" />
          </Field>
          <Field label="Temporal consistency">
            <Sel value={data.temporal_consistency} onChange={v => u({ temporal_consistency: v })}
              options={['Consistent', 'Minor inconsistencies', 'Moderate inconsistencies', 'Significant inconsistencies']}
              placeholder="Select…" />
          </Field>
          <Field label="Visual quality">
            <Sel value={data.visual_quality} onChange={v => u({ visual_quality: v })}
              options={['High', 'Good', 'Fair', 'Poor']} placeholder="Select…" />
          </Field>
        </div>
        <Check checked={data.unexpected_content} onChange={v => u({ unexpected_content: v })}
          label="Unexpected content (anything that surprised you or wasn't declared)" />
        {data.unexpected_content && (
          <Textarea value={data.unexpected_description} onChange={v => u({ unexpected_description: v })} rows={3}
            placeholder="Describe specifically what was unexpected and why it matters for the assessment" />
        )}
      </Group>

      {/* Reviewer Notes */}
      <Group title="Reviewer Notes">
        <Field
          label="Freeform observations"
          hint="If another SI8 reviewer took over this assessment tomorrow, what would they need to know from watching this video? Include timestamps. (minimum 20 characters required to unlock Section 3)"
        >
          <div className="border-l-2 pl-3" style={{ borderColor: '#C8900A' }}>
            <Textarea
              value={data.freeform_observations}
              onChange={v => u({ freeform_observations: v })}
              rows={8}
              placeholder="What was notable? What caught your attention? What would matter if the submitter's declarations turned out to be wrong?"
            />
          </div>
        </Field>
        <div className={`text-xs ${freeformOk ? 'text-green-600' : 'text-gray-400'}`}>
          {freeformOk ? '✓ Freeform complete' : `${data.freeform_observations.trim().length}/20 characters`}
        </div>

        <Field label="Overall first impression" hint="Internal calibration only — not surfaced to client or used in outcome determination.">
          <Sel value={data.overall_first_impression} onChange={v => u({ overall_first_impression: v })}
            options={['Routine', 'Some concerns', 'Significant concerns']} placeholder="Select…" />
        </Field>
      </Group>

      {/* Gate status */}
      <div className={`p-3 rounded text-xs font-medium ${
        sectionComplete
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-gray-50 text-gray-500 border border-gray-200'
      }`}>
        {sectionComplete
          ? '✓ Section 2 complete — Section 3 is unlocked'
          : !firstViewingDone
          ? 'Check "First complete viewing" and write freeform observations to unlock Section 3'
          : `Freeform observations: ${data.freeform_observations.trim().length}/20 characters`}
      </div>
    </div>
  )
}
