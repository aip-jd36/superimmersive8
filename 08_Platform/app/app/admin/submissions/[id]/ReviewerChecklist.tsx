'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, AlertCircle } from 'lucide-react'

interface ChecklistState {
  pre_screen_complete: boolean
  pre_screen_notes: string
  video_watched: boolean
  video_flags: string
  tool_receipts_verified: boolean
  tool_receipts_notes: string
  authorship_reviewed: boolean
  authorship_notes: string
  rights_docs_reviewed: boolean
  rights_docs_notes: string
  risk_assessed: boolean
  reviewer_notes: string
}

interface ReviewerChecklistProps {
  submissionId: string
  initialChecklist?: Partial<ChecklistState> | null
  initialRiskRating?: string | null
  initialRiskNotes?: string | null
  onChecklistChange?: (isComplete: boolean) => void
}

const RISK_RATINGS = [
  { value: 'low', label: 'Low', description: 'Clean audit, all receipts verified, no flags', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  { value: 'standard', label: 'Standard', description: 'Solid with minor notes, nothing blocking commercial use', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  { value: 'elevated', label: 'Elevated', description: 'Reviewable concerns, buyer\'s legal team should review flags', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  { value: 'high', label: 'High', description: 'Significant unresolved questions, recommend legal clearance', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
]

const STEPS = [
  {
    key: 'pre_screen_complete' as keyof ChecklistState,
    notesKey: 'pre_screen_notes' as keyof ChecklistState,
    title: 'Step 1: Pre-screen',
    time: '~5 min',
    items: [
      'Confirm submission is complete (all required fields present)',
      'Receipt files are attached and openable',
      'No obviously missing declarations',
    ],
    notesPlaceholder: 'Any incomplete fields or missing documents...',
  },
  {
    key: 'video_watched' as keyof ChecklistState,
    notesKey: 'video_flags' as keyof ChecklistState,
    title: 'Step 2: Video Watch',
    time: '~15 min',
    items: [
      'Watched complete video from start to finish',
      'Visually scanned for real faces or recognizable people',
      'Scanned for logos, brand identifiers, or trademarked elements',
      'Checked recognizable real-world settings or copyrighted environments',
    ],
    notesPlaceholder: 'Visual flags observed during watch (faces, logos, brands)...',
  },
  {
    key: 'tool_receipts_verified' as keyof ChecklistState,
    notesKey: 'tool_receipts_notes' as keyof ChecklistState,
    title: 'Step 3: Tool Receipt Verification',
    time: '~30 min',
    items: [
      'All receipts reviewed — match declared tools, versions, and production dates',
      'Plan type confirmed as commercial (Pro/Plus/Team/Enterprise)',
      'Free-plan tools flagged (if any)',
      'Unverifiable or suspicious receipts noted',
    ],
    notesPlaceholder: 'Receipt verification notes, free-plan flags, unverifiable items...',
  },
  {
    key: 'authorship_reviewed' as keyof ChecklistState,
    notesKey: 'authorship_notes' as keyof ChecklistState,
    title: 'Step 4: Authorship Review',
    time: '~15 min',
    items: [
      'Authorship statement reviewed — minimum 150 words met',
      'Statement is specific and credible (not generic or templated)',
      'AI percentage estimate reviewed',
      'Post-generation editing disclosure reviewed (if applicable)',
      'Scene attribution reviewed (if provided)',
    ],
    notesPlaceholder: 'Authorship quality notes, generic statement concerns, scene flags...',
  },
  {
    key: 'rights_docs_reviewed' as keyof ChecklistState,
    notesKey: 'rights_docs_notes' as keyof ChecklistState,
    title: 'Step 5: Rights Documentation Review',
    time: '~15 min',
    items: [
      'Likeness section reviewed (Path A checkboxes or uploaded release document)',
      'IP section reviewed (Path A checkboxes, license doc, or fair use argument)',
      'Audio license reviewed and file confirmed (if licensed audio declared)',
      'Third-party assets disclosure reviewed (if applicable)',
      'Fair use advisory noted if Path C was selected',
    ],
    notesPlaceholder: 'Rights documentation concerns, missing files, fair use notes...',
  },
  {
    key: 'risk_assessed' as keyof ChecklistState,
    notesKey: 'reviewer_notes' as keyof ChecklistState,
    title: 'Step 6: Risk Assessment & Output',
    time: '~15 min',
    items: [
      'Overall risk rating assigned (see below)',
      'All per-category concerns documented in notes',
      'Ready to approve or reject',
    ],
    notesPlaceholder: 'Overall reviewer notes — summarize the audit findings for the Chain of Title PDF...',
  },
]

let saveTimeout: ReturnType<typeof setTimeout> | null = null

export function ReviewerChecklist({
  submissionId,
  initialChecklist,
  initialRiskRating,
  initialRiskNotes,
  onChecklistChange,
}: ReviewerChecklistProps) {
  const router = useRouter()
  const hasRefreshedOnComplete = useRef(false)
  const [checklist, setChecklist] = useState<ChecklistState>({
    pre_screen_complete: initialChecklist?.pre_screen_complete || false,
    pre_screen_notes: initialChecklist?.pre_screen_notes || '',
    video_watched: initialChecklist?.video_watched || false,
    video_flags: initialChecklist?.video_flags || '',
    tool_receipts_verified: initialChecklist?.tool_receipts_verified || false,
    tool_receipts_notes: initialChecklist?.tool_receipts_notes || '',
    authorship_reviewed: initialChecklist?.authorship_reviewed || false,
    authorship_notes: initialChecklist?.authorship_notes || '',
    rights_docs_reviewed: initialChecklist?.rights_docs_reviewed || false,
    rights_docs_notes: initialChecklist?.rights_docs_notes || '',
    risk_assessed: initialChecklist?.risk_assessed || false,
    reviewer_notes: initialChecklist?.reviewer_notes || '',
  })
  const [riskRating, setRiskRating] = useState<string>(initialRiskRating || '')
  const [riskNotes, setRiskNotes] = useState<string>(initialRiskNotes || '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const allStepsComplete =
    checklist.pre_screen_complete &&
    checklist.video_watched &&
    checklist.tool_receipts_verified &&
    checklist.authorship_reviewed &&
    checklist.rights_docs_reviewed &&
    checklist.risk_assessed &&
    !!riskRating

  const debouncedSave = useCallback(
    (updatedChecklist: ChecklistState, updatedRating: string, updatedNotes: string) => {
      if (saveTimeout) clearTimeout(saveTimeout)
      saveTimeout = setTimeout(async () => {
        setSaveStatus('saving')
        try {
          const res = await fetch(`/api/admin/submissions/${submissionId}/review-state`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reviewer_checklist: updatedChecklist,
              risk_rating: updatedRating || null,
              risk_notes: updatedNotes || null,
            }),
          })
          if (res.ok) {
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 2000)
            // Refresh page when all steps become complete for the first time
            // so ApproveRejectButtons re-renders with checklistComplete=true
            const nowComplete =
              updatedChecklist.pre_screen_complete &&
              updatedChecklist.video_watched &&
              updatedChecklist.tool_receipts_verified &&
              updatedChecklist.authorship_reviewed &&
              updatedChecklist.rights_docs_reviewed &&
              updatedChecklist.risk_assessed &&
              !!updatedRating
            if (nowComplete && !hasRefreshedOnComplete.current) {
              hasRefreshedOnComplete.current = true
              router.refresh()
            }
          } else {
            setSaveStatus('error')
          }
        } catch {
          setSaveStatus('error')
        }
      }, 600)
    },
    [submissionId, router]
  )

  const handleCheckboxChange = (key: keyof ChecklistState, value: boolean) => {
    const updated = { ...checklist, [key]: value }
    setChecklist(updated)
    const isNowComplete = allStepsComplete
    onChecklistChange?.(isNowComplete)
    debouncedSave(updated, riskRating, riskNotes)
  }

  const handleNotesChange = (key: keyof ChecklistState, value: string) => {
    const updated = { ...checklist, [key]: value }
    setChecklist(updated)
    debouncedSave(updated, riskRating, riskNotes)
  }

  const handleRiskRatingChange = (value: string) => {
    setRiskRating(value)
    debouncedSave(checklist, value, riskNotes)
  }

  const handleRiskNotesChange = (value: string) => {
    setRiskNotes(value)
    debouncedSave(checklist, riskRating, value)
  }

  const completedSteps = STEPS.filter(s => checklist[s.key as keyof ChecklistState]).length

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-900">Reviewer Checklist</CardTitle>
            <CardDescription className="text-blue-700 mt-1">
              Complete all 6 steps and assign a Risk Rating before Approve/Reject becomes available
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">{completedSteps}/6</div>
            <div className="text-xs text-blue-600">steps done</div>
          </div>
        </div>
        <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(completedSteps / 6) * 100}%` }}
          />
        </div>
        {saveStatus === 'saving' && <p className="text-xs text-blue-500 mt-1">Saving...</p>}
        {saveStatus === 'saved' && <p className="text-xs text-green-600 mt-1">✓ Saved</p>}
        {saveStatus === 'error' && <p className="text-xs text-red-500 mt-1">⚠ Save failed — try again</p>}
      </CardHeader>

      <CardContent className="space-y-6">
        {STEPS.map((step) => {
          const isComplete = checklist[step.key as keyof ChecklistState] as boolean
          return (
            <div key={step.key} className={`rounded-lg border p-4 ${isComplete ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleCheckboxChange(step.key as keyof ChecklistState, !isComplete)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {isComplete
                    ? <CheckCircle className="w-5 h-5 text-green-600" />
                    : <Circle className="w-5 h-5 text-gray-400" />
                  }
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-gray-900">{step.title}</div>
                    <div className="text-xs text-gray-400">{step.time}</div>
                  </div>
                  <ul className="space-y-1 mb-3">
                    {step.items.map((item, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-gray-400 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <textarea
                    value={checklist[step.notesKey as keyof ChecklistState] as string}
                    onChange={(e) => handleNotesChange(step.notesKey as keyof ChecklistState, e.target.value)}
                    placeholder={step.notesPlaceholder}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 min-h-[60px] bg-white focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* Risk Rating */}
        <div className="rounded-lg border-2 border-blue-300 bg-white p-4">
          <div className="font-semibold text-sm text-gray-900 mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            Risk Rating *
          </div>
          <p className="text-xs text-gray-500 mb-3">Required — appears in Chain of Title PDF and creator approval email</p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {RISK_RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleRiskRatingChange(r.value)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  riskRating === r.value
                    ? `${r.bg} ${r.border} ${r.text}`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`font-bold text-sm ${riskRating === r.value ? r.text : 'text-gray-700'}`}>
                  {r.label}
                </div>
                <div className={`text-xs mt-0.5 ${riskRating === r.value ? r.text : 'text-gray-500'}`}>
                  {r.description}
                </div>
              </button>
            ))}
          </div>

          <textarea
            value={riskNotes}
            onChange={(e) => handleRiskNotesChange(e.target.value)}
            placeholder="Risk notes — appears in Chain of Title PDF. Summarize the audit outcome, flag any elevated risks, note any items the buyer's legal team should review..."
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 min-h-[80px] focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Completion status */}
        {allStepsComplete ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-green-800">Checklist complete</div>
              <div className="text-xs text-green-700">Approve and Reject buttons are now active above</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-600">
                {completedSteps < 6
                  ? `${6 - completedSteps} step${6 - completedSteps !== 1 ? 's' : ''} remaining`
                  : 'Risk rating required'
                }
              </div>
              <div className="text-xs text-gray-500">Complete all 6 steps and select a Risk Rating to unlock Approve/Reject</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
