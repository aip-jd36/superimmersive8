'use client'

import { WorkbookData } from './workbook-schema'

type S1 = WorkbookData['section_1']

interface Props {
  data: S1
  submission: Record<string, any>
  toolsUsed: Array<{ tool_name?: string; tool?: string; plan_type?: string }>
  onChange: (updates: Partial<S1>) => void
}

const CHECK_LABELS: Record<keyof S1['scope_checks'], string> = {
  no_list_reviewed:           'No List reviewed — none of the 8 exclusions apply to this submission',
  custodian_declaration:      'Evidence Custodian Declaration confirmed signed in submission record',
  indemnification_confirmed:  'Indemnification warranty confirmed signed in submission record',
  video_accessible:           'Video URL is accessible and playable',
  certified_tier:             'Submission is SI8 Certified tier ($499)',
}

export function Section1Intake({ data, submission, toolsUsed, onChange }: Props) {
  const tools = toolsUsed.map(t => `${t.tool_name || t.tool}${t.plan_type ? ` (${t.plan_type})` : ''}`).join(', ')

  const handleCheck = (key: keyof S1['scope_checks'], value: boolean) => {
    onChange({ scope_checks: { ...data.scope_checks, [key]: value } })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#1a1918' }}>§ 1  Intake & Scope</h2>
        <p className="text-sm text-gray-500">Confirm scope before beginning evidence review. All five checks must be complete to unlock Section 2.</p>
      </div>

      {/* Submission context */}
      <div className="p-4 rounded-lg border text-sm space-y-2" style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#f5f3f0' }}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div><span className="text-gray-500">Title: </span><span className="font-medium">{submission.title || '—'}</span></div>
          <div><span className="text-gray-500">Creator: </span><span className="font-medium">{submission.filmmaker_name || '—'}</span></div>
          <div><span className="text-gray-500">Intended use: </span><span>{submission.intended_use || '—'}</span></div>
          <div><span className="text-gray-500">Territory: </span><span>{submission.territory_preferences || 'Global'}</span></div>
          {tools && <div className="col-span-2"><span className="text-gray-500">AI tools: </span><span>{tools}</span></div>}
        </div>
        {submission.video_url && (
          <a href={submission.video_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline block mt-1">
            {submission.video_url}
          </a>
        )}
      </div>

      {/* Assessment start */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>
          Assessment start time
        </label>
        <input
          type="datetime-local"
          value={data.assessment_start || new Date().toISOString().slice(0, 16)}
          onChange={e => onChange({ assessment_start: e.target.value })}
          className="text-sm border rounded px-3 py-1.5"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
        />
        <p className="text-xs text-gray-400 mt-1">Used for time-on-task tracking in the post-assessment review.</p>
      </div>

      {/* Campaign / context description */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>
          Campaign / use-case description
          <span className="text-gray-400 font-normal ml-1">(optional — helps contextualize the assessment)</span>
        </label>
        <textarea
          value={data.campaign_description}
          onChange={e => onChange({ campaign_description: e.target.value })}
          rows={3}
          placeholder="e.g. 30-sec social ad for a finserv brand in the UK, submitted by Singapore agency on behalf of client"
          className="w-full text-sm border rounded px-3 py-2 resize-none"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
        />
      </div>

      {/* Scope checks */}
      <div>
        <div className="text-sm font-medium mb-3" style={{ color: '#1a1918' }}>Scope checks</div>
        <div className="space-y-3">
          {(Object.keys(CHECK_LABELS) as Array<keyof S1['scope_checks']>).map(key => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.scope_checks[key]}
                onChange={e => handleCheck(key, e.target.checked)}
                className="mt-0.5 flex-shrink-0"
                style={{ accentColor: '#C8900A' }}
              />
              <span className="text-sm text-gray-700">{CHECK_LABELS[key]}</span>
            </label>
          ))}
        </div>

        {/* No List warning */}
        {!data.scope_checks.no_list_reviewed && (
          <div className="mt-3 p-3 rounded border text-xs" style={{ borderColor: '#fbbf24', backgroundColor: '#fffbeb', color: '#92400e' }}>
            Review the No List before proceeding. If any exclusion applies (celebrity likeness, voice cloning, explicit IP imitation, political content, deepfakes, adult content, missing intake form) — stop and document in Scope Limitations below.
          </div>
        )}
      </div>

      {/* Scope limitations */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#1a1918' }}>
          Scope limitations
          <span className="text-gray-400 font-normal ml-1">(optional — but be specific)</span>
        </label>
        <textarea
          value={data.scope_limitations}
          onChange={e => onChange({ scope_limitations: e.target.value })}
          rows={4}
          placeholder="Record anything that will affect assessment reliability: incomplete evidence, video access issues, unusual commercial context. Leave blank if none."
          className="w-full text-sm border rounded px-3 py-2 resize-none"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
        />
      </div>

      {/* Gate status */}
      <div className={`p-3 rounded text-xs font-medium ${
        Object.values(data.scope_checks).every(Boolean)
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-gray-50 text-gray-500 border border-gray-200'
      }`}>
        {Object.values(data.scope_checks).every(Boolean)
          ? '✓ All scope checks complete — Section 2 is unlocked'
          : `${Object.values(data.scope_checks).filter(Boolean).length}/5 checks complete`}
      </div>
    </div>
  )
}
