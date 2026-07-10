'use client'

import { WorkbookData } from './workbook-schema'

type S1 = WorkbookData['section_1']

interface Props {
  data: S1
  submission: Record<string, any>
  toolsUsed: Array<{ tool_name?: string; tool?: string; plan_type?: string }>
  onChange: (updates: Partial<S1>) => void
}

const NO_LIST_ITEMS = [
  "Celebrity likeness — real person's face used without documented consent",
  'Voice cloning of a real, identifiable person',
  'Explicit IP imitation — copyrighted characters, brand mascots, or protected marks',
  'Political persuasion content',
  'Deepfakes or content designed to deceive',
  'Adult or explicit content',
  'Submission without completed intake form (project brief)',
  'No confirmed creator bench / production capacity',
]

function DeclarationBadge({ value }: { value: any }) {
  if (value === true) return <span className="text-xs text-green-600 font-medium">✓ confirmed at submission</span>
  if (value === false) return <span className="text-xs text-red-500 font-medium">✗ NOT confirmed — do not proceed</span>
  return <span className="text-xs text-amber-600 font-medium">? not in platform record — check submission history before proceeding</span>
}

function TierBadge({ tier, paymentStatus }: { tier: any; paymentStatus: any }) {
  const isCertified = !tier || tier === 'si8_certified'
  const isPaid = paymentStatus === 'paid' || paymentStatus === 'completed'
  const tierLabel = isCertified ? 'SI8 Certified ($499)' : tier === 'creator_record' ? 'Creator Record ($29) — not eligible for this workbook' : `tier: ${tier || 'unknown'}`
  const payLabel = isPaid ? 'payment confirmed' : `payment: ${paymentStatus || 'not recorded'}`
  const ok = isCertified && isPaid
  return (
    <span className={`text-xs font-medium ${ok ? 'text-green-600' : 'text-red-500'}`}>
      {tierLabel} · {payLabel}
    </span>
  )
}

const PRIMARY_USE_LABELS: Record<string, string> = {
  brand_commercial:      'Brand Commercial / Advertisement',
  agency_deliverable:    'Agency Deliverable / Client Work',
  streaming_submission:  'Streaming Platform Submission',
  licensing_marketplace: 'Licensing Marketplace',
  festival:              'Film Festival',
  social_media:          'Social Media / YouTube',
  portfolio:             'Portfolio / Personal Project',
  other:                 'Other',
}

export function formatIntendedUse(raw: any): string {
  if (!raw) return '—'
  let obj: any = raw
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw) } catch { return raw }
  }
  const parts: string[] = []
  if (obj.primary_use) parts.push(PRIMARY_USE_LABELS[obj.primary_use] || obj.primary_use.replace(/_/g, ' '))
  if (obj.suitable_categories?.length) parts.push(`Suitable: ${obj.suitable_categories.join(', ')}`)
  if (obj.excluded_categories?.length) parts.push(`Excluded: ${obj.excluded_categories.join(', ')}`)
  return parts.length ? parts.join(' · ') : '—'
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
          <div><span className="text-gray-500">Intended use: </span><span>{formatIntendedUse(submission.intended_use)}</span></div>
          <div><span className="text-gray-500">Territory: </span><span>{submission.territory_preferences || 'Global'}</span></div>
          {tools && <div className="col-span-2"><span className="text-gray-500">AI tools: </span><span>{tools}</span></div>}
        </div>

        {submission.video_url && (
          <a href={submission.video_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline block">
            {submission.video_url}
          </a>
        )}
        {!submission.video_url && (
          <div className="text-xs text-amber-600">
            ⚠ No video URL on file — note in Scope Limitations below before proceeding to Visual Review.
          </div>
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
        <div className="space-y-5">

          {/* 1. No List */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={data.scope_checks.no_list_reviewed}
                onChange={e => handleCheck('no_list_reviewed', e.target.checked)}
                className="mt-0.5 flex-shrink-0" style={{ accentColor: '#C8900A' }} />
              <span className="text-sm text-gray-700">No List reviewed — none of the 8 exclusions apply to this submission</span>
            </label>
            <div className="ml-6 mt-2 p-3 rounded border text-xs space-y-1.5" style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#f5f3f0' }}>
              <div className="text-gray-500 font-medium mb-1">Stop and document in Scope Limitations if any of these apply:</div>
              {NO_LIST_ITEMS.map((item, i) => (
                <div key={i} className="flex gap-2 text-gray-600">
                  <span className="text-red-400 flex-shrink-0 font-medium">{i + 1}.</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Custodian Declaration */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={data.scope_checks.custodian_declaration}
              onChange={e => handleCheck('custodian_declaration', e.target.checked)}
              className="mt-0.5 flex-shrink-0" style={{ accentColor: '#C8900A' }} />
            <div>
              <div className="text-sm text-gray-700">Evidence Custodian Declaration confirmed signed in submission record</div>
              <div className="mt-0.5"><DeclarationBadge value={submission.custodian_declaration} /></div>
            </div>
          </label>

          {/* 3. Indemnification */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={data.scope_checks.indemnification_confirmed}
              onChange={e => handleCheck('indemnification_confirmed', e.target.checked)}
              className="mt-0.5 flex-shrink-0" style={{ accentColor: '#C8900A' }} />
            <div>
              <div className="text-sm text-gray-700">Indemnification warranty confirmed signed in submission record</div>
              <div className="mt-0.5"><DeclarationBadge value={submission.indemnification_confirmed} /></div>
            </div>
          </label>

          {/* 4. Video accessible */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={data.scope_checks.video_accessible}
              onChange={e => handleCheck('video_accessible', e.target.checked)}
              className="mt-0.5 flex-shrink-0" style={{ accentColor: '#C8900A' }} />
            <span className="text-sm text-gray-700">Video URL is accessible and playable</span>
          </label>

          {/* 5. SI8 Certified tier */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={data.scope_checks.certified_tier}
              onChange={e => handleCheck('certified_tier', e.target.checked)}
              className="mt-0.5 flex-shrink-0" style={{ accentColor: '#C8900A' }} />
            <div>
              <div className="text-sm text-gray-700">Submission is SI8 Certified tier ($499)</div>
              <div className="mt-0.5"><TierBadge tier={submission.tier} paymentStatus={submission.payment_status} /></div>
            </div>
          </label>

        </div>
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
