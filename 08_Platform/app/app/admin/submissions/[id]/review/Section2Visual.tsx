'use client'

import type { ReactNode } from 'react'
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

export function Section2Visual({ data, submission, onChange }: Props) {
  const u = (updates: Partial<S2>) => onChange(updates)

  const freeformOk = data.freeform_observations.trim().length >= 20

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#1a1918' }}>§ 2  Visual Review</h2>
        <p className="text-sm text-gray-500">Watch the video in full at least once before recording observations. Do not consult the submitter's declarations first.</p>
        {submission.video_url && (
          <a href={submission.video_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline mt-1 block">
            Open video ↗
          </a>
        )}
      </div>

      <Group title="General">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Video URL confirmed">
            <Text value={data.video_url_confirmed} onChange={v => u({ video_url_confirmed: v })}
              placeholder="Paste URL you actually watched" />
          </Field>
          <Field label="Watches completed">
            <Num value={data.watches_completed} onChange={v => u({ watches_completed: v ?? 0 })} placeholder="0" />
          </Field>
          <Field label="Runtime observed (seconds)">
            <Num value={data.runtime_observed} onChange={v => u({ runtime_observed: v })} placeholder="e.g. 30" />
          </Field>
          <Field label="Scene count (approximate)">
            <Num value={data.scene_count} onChange={v => u({ scene_count: v })} placeholder="e.g. 8" />
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
        <Field label="Color treatment">
          <Text value={data.color_treatment} onChange={v => u({ color_treatment: v })}
            placeholder="e.g. muted / saturated / monochromatic / warm tones" />
        </Field>
      </Group>

      <Group title="Humans & Likeness">
        <Field label="Synthetic humans visible">
          <Sel value={data.synthetic_humans} onChange={v => u({ synthetic_humans: v })}
            options={['None', '1–2', 'Several (3–10)', 'Many (10+)']} placeholder="Select…" />
        </Field>
        <Field label="Real person likeness suspected or observed">
          <Sel value={data.real_likeness_suspected} onChange={v => u({ real_likeness_suspected: v })}
            options={['None identified', 'Suspected', 'Confirmed']} placeholder="Select…" />
        </Field>
        {(data.real_likeness_suspected === 'Suspected' || data.real_likeness_suspected === 'Confirmed') && (
          <Field label="Describe the resemblance" hint="Be specific — who or what the figure resembles and why.">
            <Textarea value={data.real_likeness_description} onChange={v => u({ real_likeness_description: v })}
              placeholder="e.g. Figure at 0:12 resembles [name] in facial structure and hair — indeterminate but notable" />
          </Field>
        )}
        <div className="flex gap-6">
          <Check checked={data.animals_present} onChange={v => u({ animals_present: v })} label="Animals present" />
          <Check checked={data.children_present} onChange={v => u({ children_present: v })} label="Children/minors visible" />
        </div>
      </Group>

      <Group title="Audio">
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
                placeholder="e.g. sync issue at 0:22 — or leave blank" />
            </Field>
          </div>
        )}
      </Group>

      <Group title="Brands, Logos & IP">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Logos observed">
            <Sel value={data.logos_observed} onChange={v => u({ logos_observed: v })}
              options={['None', 'Possible / unclear', 'Visible']} placeholder="Select…" />
          </Field>
          <Field label="Trademarks observed">
            <Sel value={data.trademarks_observed} onChange={v => u({ trademarks_observed: v })}
              options={['None', 'Possible / unclear', 'Visible']} placeholder="Select…" />
          </Field>
        </div>
        {(data.logos_observed !== '' && data.logos_observed !== 'None') && (
          <Field label="Logo description">
            <Textarea value={data.logos_description} onChange={v => u({ logos_description: v })} rows={2}
              placeholder="Describe what you saw and at which timestamp" />
          </Field>
        )}
        {(data.trademarks_observed !== '' && data.trademarks_observed !== 'None') && (
          <Field label="Trademark description">
            <Textarea value={data.trademarks_description} onChange={v => u({ trademarks_description: v })} rows={2}
              placeholder="Describe what you saw and at which timestamp" />
          </Field>
        )}
        <Check checked={data.text_visible} onChange={v => u({ text_visible: v })} label="Text visible in video (titles, captions, signs)" />
        {data.text_visible && (
          <Textarea value={data.text_description} onChange={v => u({ text_description: v })} rows={2}
            placeholder="What text is visible? Any brand or IP references?" />
        )}
        <Check checked={data.landmarks_observed} onChange={v => u({ landmarks_observed: v })} label="Recognizable real-world landmarks or locations" />
        {data.landmarks_observed && (
          <Textarea value={data.landmarks_description} onChange={v => u({ landmarks_description: v })} rows={2}
            placeholder="Which landmarks? Could they trigger location clearance requirements?" />
        )}
        <Field label="Copyrighted artwork or set design">
          <Sel value={data.copyrighted_artwork} onChange={v => u({ copyrighted_artwork: v })}
            options={['None', 'Possible', 'Visible']} placeholder="Select…" />
        </Field>
        {(data.copyrighted_artwork !== '' && data.copyrighted_artwork !== 'None') && (
          <Textarea value={data.copyrighted_artwork_description} onChange={v => u({ copyrighted_artwork_description: v })} rows={2}
            placeholder="Describe what you saw" />
        )}
      </Group>

      <Group title="Technical Quality">
        <div className="grid grid-cols-3 gap-4">
          <Field label="AI artifacts">
            <Sel value={data.ai_artifacts} onChange={v => u({ ai_artifacts: v })}
              options={['None', 'Minor', 'Notable', 'Significant']} placeholder="Select…" />
          </Field>
          <Field label="Temporal consistency">
            <Sel value={data.temporal_consistency} onChange={v => u({ temporal_consistency: v })}
              options={['Consistent', 'Minor issues', 'Notable issues']} placeholder="Select…" />
          </Field>
          <Field label="Visual quality">
            <Sel value={data.visual_quality} onChange={v => u({ visual_quality: v })}
              options={['Professional', 'Acceptable', 'Rough', 'Poor']} placeholder="Select…" />
          </Field>
        </div>
        <Check checked={data.unexpected_content} onChange={v => u({ unexpected_content: v })}
          label="Unexpected content (anything that surprised you or wasn't declared)" />
        {data.unexpected_content && (
          <Textarea value={data.unexpected_description} onChange={v => u({ unexpected_description: v })} rows={3}
            placeholder="Describe specifically what was unexpected and why it matters for the assessment" />
        )}
      </Group>

      {/* Required freeform — gates Section 3 */}
      <div>
        <Field
          label="Freeform observations"
          hint="Write what you would tell another reviewer in a handover note. What caught your attention? What would matter if the submitter's declarations turned out to be wrong? (minimum 20 characters required to unlock Section 3)"
        >
          <Textarea
            value={data.freeform_observations}
            onChange={v => u({ freeform_observations: v })}
            rows={6}
            placeholder="What was notable about watching this video? Include timestamps. What would you want a colleague to know before they started the evidence review?"
          />
        </Field>
        <div className={`mt-2 text-xs ${freeformOk ? 'text-green-600' : 'text-gray-400'}`}>
          {freeformOk ? '✓ Section 3 unlocked' : `${data.freeform_observations.trim().length}/20 characters`}
        </div>
      </div>
    </div>
  )
}
