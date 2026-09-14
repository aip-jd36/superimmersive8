'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, CheckCircle, Circle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkbookData, EMPTY_WORKBOOK, computeGates, DOMAIN_LABELS, ALL_CONTROLS } from './workbook-schema'
import { GUIDANCE } from './guidance'
import { Section1Intake, formatIntendedUse } from './Section1Intake'
import { Section2Visual } from './Section2Visual'
import { Section3Evidence } from './Section3Evidence'
import { Section4Gaps } from './Section4Gaps'
import { Section5Findings } from './Section5Findings'
import { Section6Assessment } from './Section6Assessment'
import { Section7Brief } from './Section7Brief'
import { useWorkspaceLayout } from './workspace-layout-context'
import { WorkbookReadOnlyProvider } from './workbook-readonly-context'
import type { ProcessingStatus } from '@/types/assessment'

type Section = '1' | '2' | '3' | '4' | '5' | '6' | '7'
type RightTab = 'submission' | 'evidence' | 'guidance'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'locked'

interface WorkbookClientProps {
  submissionId: string
  assessmentNumber: string | null
  initialSignoffStatus: 'active' | 'invalidated' | null
  /** CA-OPS-3: assessments.processing_status, or null if no assessment row exists yet. */
  processingStatus: ProcessingStatus | null
  initialWorkbook: WorkbookData
  submission: Record<string, any>
  evidenceFiles: Array<{ name: string; url: string }>
}

// CA-OPS-3 — the ONE authoritative derivation of "this workbook is
// immutable," mirroring patch_workbook_atomic's own lock check exactly
// (migration 20260907000000: `processing_status IN ('SIGNING','SIGNED',
// 'DELIVERED')`). Every recognized PATCH-route lock code maps 1:1 to the
// processing_status value that produces it, so both the page-load-known case
// and the stale-client/race case (a 409 arriving mid-session) resolve
// through this same three-value lookup -- never a second, independently
// re-derived notion of "locked."
const IMMUTABLE_PROCESSING_STATUSES = ['SIGNING', 'SIGNED', 'DELIVERED'] as const
type LockedStatus = (typeof IMMUTABLE_PROCESSING_STATUSES)[number]

const LOCK_CODE_TO_STATUS: Record<string, LockedStatus> = {
  locked_for_signing: 'SIGNING',
  signed_immutable: 'SIGNED',
  delivered: 'DELIVERED',
}

const LOCK_MESSAGES: Record<LockedStatus, string> = {
  SIGNING: 'Workbook locked — this assessment is currently being signed.',
  SIGNED: 'Workbook locked — this assessment has already been signed.',
  DELIVERED: 'Workbook locked — this assessment has already been delivered.',
}

function formatSavedAt(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin === 1) return '1 min ago'
  return `${diffMin} min ago`
}

export function WorkbookClient({
  submissionId, assessmentNumber: initialAssessmentNumber, initialSignoffStatus, processingStatus, initialWorkbook, submission, evidenceFiles,
}: WorkbookClientProps) {
  const [signoffStatus, setSignoffStatus] = useState<'active' | 'invalidated' | null>(initialSignoffStatus)
  const [workbook, setWorkbook] = useState<WorkbookData>(
    Object.keys(initialWorkbook).length > 1 ? initialWorkbook : EMPTY_WORKBOOK
  )
  // Lifted so the header badge and § 6 both reflect a newly created
  // assessment number immediately after Generate Report runs, without a
  // page reload — Section7Brief reports it up via onAssessmentNumberChange.
  const [assessmentNumber, setAssessmentNumber] = useState<string | null>(initialAssessmentNumber)
  const [activeSection, setActiveSection] = useState<Section>('1')
  const [rightTab, setRightTab] = useState<RightTab>('guidance')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [activeDomain, setActiveDomain] = useState<string | null>(null)
  const [savedAtDisplay, setSavedAtDisplay] = useState('')
  const saveTimer = useRef<NodeJS.Timeout>()
  const isFirstRender = useRef(true)

  // CA-OPS-3: the stale-client/race case. A workbook that was editable when
  // this page loaded can become immutable elsewhere while the reviewer is
  // still on this page; the server's 409 (locked_for_signing / signed_immutable
  // / delivered) is what sets this, never a client guess. Once set, `immutable`
  // below is true for the rest of this page's lifetime -- the same one-way
  // transition the backend itself enforces (SIGNING/SIGNED/DELIVERED is not
  // something a workbook edit can undo).
  const [raceLockedCode, setRaceLockedCode] = useState<string | null>(null)

  // Single authoritative derivation, reused for both the known-at-load case
  // and the race case -- see the module-level comment above.
  const lockedStatus: LockedStatus | null =
    (raceLockedCode && LOCK_CODE_TO_STATUS[raceLockedCode]) ||
    (processingStatus && (IMMUTABLE_PROCESSING_STATUSES as readonly string[]).includes(processingStatus)
      ? (processingStatus as LockedStatus)
      : null)
  const immutable = lockedStatus !== null

  // CAH-4F.2: one layout-only fact from the page-frame shell. When true,
  // Reviewer Resources occupies the adjacent contextual rail and this
  // component's own context aside is CSS-hidden — it stays mounted, keeps
  // `rightTab`, and reappears unchanged when this goes back to false. Not a
  // workbook value, never a save/autosave/gating input, never persisted.
  const { workbookContextAsideHidden } = useWorkspaceLayout()

  const gates = computeGates(workbook)

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const save = useCallback(async (data: WorkbookData) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}/workbook`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workbook_data: data }),
      })
      if (res.ok) {
        const body = await res.json()
        setSavedAt(body.savedAt)
        setSaveStatus('saved')
        // CA-RLK-2a: a save that invalidated an active durable sign-off.
        if (body.signoffInvalidated) setSignoffStatus('invalidated')
        return
      }
      // CA-OPS-3: distinguish an authoritative immutable-state rejection from
      // any other failure, using ONLY the structured `error` code the route
      // already returns -- never free-form message text (route.ts's `locked`
      // map: locked_for_signing / signed_immutable / delivered, all HTTP 409).
      // This never expands what the backend can reject; it only decides how
      // the client PRESENTS a rejection the server already made.
      let code: string | undefined
      try {
        const body = await res.json()
        code = body?.error
      } catch {
        // Malformed/non-JSON body — fall through to the generic error path.
      }
      if (code && code in LOCK_CODE_TO_STATUS) {
        setRaceLockedCode(code)
        setSaveStatus('locked')
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }, [submissionId])

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    // CA-OPS-3: a known-immutable workbook never schedules a write attempt —
    // the backend would reject it anyway (see patch_workbook_atomic), so this
    // is purely to avoid a doomed request, not a second enforcement point.
    if (immutable) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(workbook), 600)
    return () => clearTimeout(saveTimer.current)
  }, [workbook, save, immutable])

  // Update "N min ago" display every 30s
  useEffect(() => {
    if (!savedAt) return
    const id = setInterval(() => setSavedAtDisplay(formatSavedAt(savedAt)), 30000)
    setSavedAtDisplay(formatSavedAt(savedAt))
    return () => clearInterval(id)
  }, [savedAt])

  // Update section data
  const updateSection = useCallback(<K extends keyof WorkbookData>(
    key: K,
    updates: Partial<WorkbookData[K]>,
  ) => {
    setWorkbook(prev => ({
      ...prev,
      [key]: { ...(prev[key] as any), ...(updates as any) },
    }))
  }, [])

  // ── Nav section items ─────────────────────────────────────────────────────
  const sectionNav: Array<{ id: Section; label: string; complete: boolean; locked: boolean }> = [
    { id: '1', label: '§ 1  Intake & Scope',     complete: gates.section1Complete,  locked: false },
    { id: '2', label: '§ 2  Observation',          complete: gates.section2Complete,  locked: !gates.canEnterSection2 },
    { id: '3', label: '§ 3  Evidence Review',     complete: gates.section3Complete,  locked: !gates.canEnterSection3 },
    { id: '4', label: '§ 4  Gap Log',             complete: false,                   locked: !gates.canEnterSection4 },
    { id: '5', label: '§ 5  Findings',            complete: gates.section5Complete,  locked: !gates.canEnterSection5 },
    { id: '6', label: '§ 6  Overall Assessment',  complete: gates.section6Complete,  locked: !gates.canEnterSection6 },
    { id: '7', label: '§ 7  Report Draft',        complete: false,                   locked: !gates.canEnterSection7 },
  ]

  // Evidence count per section for nav badges
  const s3 = workbook.section_3 as Record<string, any>
  const controlCounts = ALL_CONTROLS.reduce((acc, id) => {
    acc[id] = s3[id]?.judgment ? 'done' : 'open'
    return acc
  }, {} as Record<string, string>)
  const s3DoneCounts = {
    A: ['A01'].filter(id => controlCounts[id] === 'done').length,
    R: ['R01','R02','R03','R04','R05'].filter(id => controlCounts[id] === 'done').length,
    H: ['H01','H02'].filter(id => controlCounts[id] === 'done').length,
    I: ['I01','I02','I03'].filter(id => controlCounts[id] === 'done').length,
    L: ['L01','L02','L03'].filter(id => controlCounts[id] === 'done').length,
    T: ['T01'].filter(id => controlCounts[id] === 'done').length,
    D: ['D01','D02'].filter(id => controlCounts[id] === 'done').length,
  }

  const guidanceKey = activeSection === '3'
    ? (activeDomain ?? '3')
    : activeSection

  const handleNavClick = (section: Section, locked: boolean) => {
    if (locked) return
    setActiveSection(section)
    if (section !== '3') setActiveDomain(null)
  }

  // ── Progress dots ─────────────────────────────────────────────────────────
  const progressDots = [
    gates.section1Complete,
    gates.section2Complete,
    gates.section3Complete,
    gates.section5Complete || workbook.section_4.gaps.length > 0,
    gates.section6Complete,
    false, // section 7
  ]

  const parseJsonb = (val: any, fallback: any) => {
    if (!val) return fallback
    if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback } }
    return val
  }
  const toolsUsed = parseJsonb(submission.tools_used, [])
  const likenessConf = parseJsonb(submission.likeness_confirmation, {})
  const ipConf = parseJsonb(submission.ip_confirmation, {})
  const audioDisc = parseJsonb(submission.audio_disclosure, {})

  return (
    // CA-OPS-3: WorkbookReadOnlyProvider carries the one derived `immutable`
    // fact to every Section's input primitives — see
    // workbook-readonly-context.tsx. It is presentation-only and grants no
    // write authority; patch_workbook_atomic remains the sole enforcement
    // point regardless of this value.
    <WorkbookReadOnlyProvider value={immutable}>
    {/* CAH-4F.1: viewport height is now owned by the page shell that wraps this
        component. This outer container is `h-full` (100% of the shell's
        workspace cell) instead of `h-screen`. The internal 3-zone layout,
        sticky header, section navigation, and nested scroll regions below are
        byte-unchanged. */}
    <div className="flex flex-col h-full" style={{ backgroundColor: '#FAFAF7' }}>

      {/* ── Sticky Header ──────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b"
        style={{ backgroundColor: '#1a1918', borderColor: 'rgba(255,255,255,0.1)', height: 56 }}
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white">
            <Link href={`/admin/submissions/${submissionId}`}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Link>
          </Button>
          <span className="text-xs font-mono text-amber-400">{assessmentNumber ?? 'Not yet generated'}</span>
          <span className="text-sm text-gray-200 font-medium truncate max-w-xs">
            {submission.title}
          </span>
        </div>

        <div className="flex items-center gap-5">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {progressDots.map((done, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{ backgroundColor: done ? '#C8900A' : 'rgba(255,255,255,0.2)' }}
              />
            ))}
          </div>

          {/* Video link */}
          {submission.video_url && (
            <a
              href={submission.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-300 hover:text-white flex items-center gap-1"
            >
              Open Video
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Auto-save indicator */}
          <span className="text-xs" style={{
            color: saveStatus === 'error' ? '#f87171'
              : saveStatus === 'locked' ? '#f59e0b'
              : saveStatus === 'saving' ? '#9ca3af'
              : saveStatus === 'saved' ? '#6ee7b7'
              : '#6b7280'
          }}>
            {saveStatus === 'saving' ? 'Saving…'
              : saveStatus === 'locked' ? 'Locked — not saved'
              : saveStatus === 'error' ? 'Save failed'
              : saveStatus === 'saved' ? `Saved ${savedAtDisplay}`
              : ''}
          </span>
        </div>
      </div>

      {/* ── Three-Zone Body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left Nav */}
        <nav
          className="flex-shrink-0 flex flex-col border-r overflow-y-auto py-4"
          style={{ width: 200, borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#f5f3f0' }}
        >
          {sectionNav.map(({ id, label, complete, locked }) => {
            const isActive = activeSection === id
            return (
              <button
                key={id}
                type="button"
                disabled={locked}
                onClick={() => handleNavClick(id, locked)}
                className={`
                  w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2
                  ${isActive ? 'font-semibold' : 'font-normal'}
                  ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-black/5'}
                `}
                style={{
                  color: isActive ? '#C8900A' : '#1a1918',
                  backgroundColor: isActive ? 'rgba(200,144,10,0.08)' : 'transparent',
                }}
              >
                {locked ? (
                  <Lock className="w-3 h-3 flex-shrink-0 text-gray-400" />
                ) : complete ? (
                  <CheckCircle className="w-3 h-3 flex-shrink-0 text-green-500" />
                ) : (
                  <Circle className="w-3 h-3 flex-shrink-0 text-gray-300" />
                )}
                {label}
              </button>
            )
          })}

          {/* Section 3 domain breakdown (when in section 3) */}
          {activeSection === '3' && (
            <div className="mt-1 border-t pt-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              {Object.entries(DOMAIN_LABELS).map(([domain, name]) => {
                const counts = { A: 1, R: 5, H: 2, I: 3, L: 3, T: 1, D: 2 }
                const total = counts[domain as keyof typeof counts]
                const done = s3DoneCounts[domain as keyof typeof s3DoneCounts]
                return (
                  <div
                    key={domain}
                    className="px-6 py-1.5 text-xs text-gray-500 flex items-center justify-between"
                  >
                    <span>{domain} — {name.split(' ')[0]}</span>
                    <span className={done === total ? 'text-green-600 font-medium' : ''}>
                      {done}/{total}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </nav>

        {/* Center — Workbook Form */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-8">
            {/* CA-OPS-3: persistent locked-state banner — visible regardless of
                active section, so it survives section navigation rather than
                being tied to any one Section's own render. */}
            {immutable && lockedStatus && (
              <div
                className="mb-6 px-4 py-3 rounded border text-sm flex items-start gap-2"
                style={{ borderColor: 'rgba(200,144,10,0.3)', backgroundColor: '#fffbf0', color: '#7a5b00' }}
              >
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{LOCK_MESSAGES[lockedStatus]}</div>
                  {raceLockedCode && (
                    <div className="text-xs mt-1" style={{ color: '#92702a' }}>
                      Your most recent change was not saved. Refresh the page to view the current record.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === '1' && (
              <Section1Intake
                data={workbook.section_1}
                submission={submission}
                toolsUsed={toolsUsed}
                onChange={updates => updateSection('section_1', updates)}
              />
            )}
            {activeSection === '2' && (
              <Section2Visual
                data={workbook.section_2}
                submission={submission}
                onChange={updates => updateSection('section_2', updates)}
              />
            )}
            {activeSection === '3' && (
              <Section3Evidence
                data={workbook.section_3}
                section2={workbook.section_2}
                onChange={updates => updateSection('section_3', updates)}
                onDomainFocus={domain => { setActiveDomain(domain); setRightTab('guidance') }}
              />
            )}
            {activeSection === '4' && (
              <Section4Gaps
                data={workbook.section_4}
                section3={workbook.section_3}
                onChange={updates => updateSection('section_4', updates)}
              />
            )}
            {activeSection === '5' && (
              <Section5Findings
                data={workbook.section_5}
                onChange={updates => updateSection('section_5', updates)}
              />
            )}
            {activeSection === '6' && (
              <Section6Assessment
                data={workbook.section_6}
                findings={workbook.section_5.findings}
                gaps={workbook.section_4.gaps}
                assessmentNumber={assessmentNumber}
                submissionId={submissionId}
                signoffStatus={signoffStatus}
                onChange={updates => updateSection('section_6', updates)}
                onSignoffChange={setSignoffStatus}
              />
            )}
            {activeSection === '7' && (
              <Section7Brief
                data={workbook.section_7}
                section6={workbook.section_6}
                section5={workbook.section_5}
                section4={workbook.section_4}
                section3={workbook.section_3}
                section2={workbook.section_2}
                section1={workbook.section_1}
                assessmentNumber={assessmentNumber}
                onAssessmentNumberChange={setAssessmentNumber}
                submission={submission}
                onChange={updates => updateSection('section_7', updates)}
              />
            )}

            {/* Section navigation footer */}
            <div className="flex justify-between mt-10 pt-6 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
              {activeSection !== '1' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const sections: Section[] = ['1','2','3','4','5','6','7']
                    const idx = sections.indexOf(activeSection)
                    if (idx > 0) setActiveSection(sections[idx - 1])
                  }}
                >
                  ← Previous
                </Button>
              )}
              <div className="flex-1" />
              {activeSection !== '7' && (
                <Button
                  size="sm"
                  style={{ backgroundColor: '#C8900A', color: 'white' }}
                  onClick={() => {
                    const sections: Section[] = ['1','2','3','4','5','6','7']
                    const idx = sections.indexOf(activeSection)
                    const next = sections[idx + 1] as Section | undefined
                    if (next) setActiveSection(next)
                  }}
                >
                  Next →
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Right Context Panel — the Workbook's own Guidance / Submission /
            Evidence surface. CAH-4F.2: at adjacent widths it CSS-yields the
            rail (`hidden`) while Reviewer Resources occupies it — it stays
            mounted, so `rightTab` and scroll survive, and it returns unchanged
            on close. `rightTab` remains owned entirely by this component. */}
        <aside
          className={`flex-shrink-0 ${workbookContextAsideHidden ? 'hidden' : 'flex'} flex-col border-l overflow-hidden`}
          style={{ width: 280, borderColor: 'rgba(0,0,0,0.08)' }}
        >
          {/* Tabs */}
          <div className="flex border-b flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            {(['guidance', 'submission', 'evidence'] as RightTab[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setRightTab(tab)}
                className={`flex-1 text-xs py-2.5 capitalize transition-colors ${
                  rightTab === tab ? 'font-semibold border-b-2' : 'text-gray-500 hover:text-gray-700'
                }`}
                style={rightTab === tab ? { borderBottomColor: '#C8900A', color: '#C8900A' } : {}}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 text-xs text-gray-700 leading-relaxed space-y-3">
            {rightTab === 'guidance' && (
              <div className="whitespace-pre-wrap text-xs leading-5 text-gray-600">
                {GUIDANCE[guidanceKey] || GUIDANCE['1']}
              </div>
            )}

            {rightTab === 'submission' && (
              <div className="space-y-4">

                {/* Identity */}
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Title</div>
                  <div className="font-medium">{submission.title}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Creator</div>
                  <div>{submission.filmmaker_name}</div>
                  <div className="text-gray-500">{submission.user?.email}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Intended Use</div>
                  <div>{formatIntendedUse(submission.intended_use)}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Territory</div>
                  <div>{submission.territory_preferences || 'Global'}</div>
                </div>
                {submission.logline && (
                  <div>
                    <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Logline</div>
                    <div>{submission.logline}</div>
                  </div>
                )}

                {/* AI Tools — with dates */}
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">AI Tools</div>
                  {toolsUsed.length > 0 ? toolsUsed.map((t: any, i: number) => (
                    <div key={i} className="mb-1.5">
                      <div className="text-gray-800 text-[11px] font-medium">
                        {t.tool_name || t.tool}{t.plan_type ? ` (${t.plan_type})` : ''}
                      </div>
                      {(t.start_date || t.end_date) && (
                        <div className="text-gray-400 text-[11px]">
                          {t.start_date}{t.end_date ? ` – ${t.end_date}` : ''}
                        </div>
                      )}
                    </div>
                  )) : <div className="text-gray-400">None declared</div>}
                </div>

                {/* Audio */}
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Audio</div>
                  <div className="text-[11px] text-gray-700">
                    {audioDisc.source_type
                      ? audioDisc.source_type.replace(/_/g, ' ')
                      : <span className="text-gray-400">Not specified</span>}
                  </div>
                  {audioDisc.documentation && (
                    <div className="text-[11px] text-gray-500 mt-0.5">{audioDisc.documentation}</div>
                  )}
                </div>

                {/* Likeness declarations */}
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Likeness</div>
                  <div className="space-y-0.5">
                    {([
                      ['No real faces', likenessConf.no_real_faces],
                      ['No real voices', likenessConf.no_real_voices],
                      ['No lookalikes', likenessConf.no_lookalikes],
                      ['No synthetic people to deceive', likenessConf.no_synthetic_people],
                    ] as [string, boolean | undefined][]).map(([label, val]) => (
                      <div key={label} className={`flex items-center gap-1.5 text-[11px] ${val === false ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>
                        <span className={val ? 'text-green-500' : val === false ? 'text-red-400' : 'text-gray-300'}>
                          {val ? '✓' : val === false ? '✗' : '—'}
                        </span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* IP declarations */}
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">IP & Brand</div>
                  <div className="space-y-0.5">
                    {([
                      ['No copyrighted characters', ipConf.no_copyrighted_characters],
                      ['No brand imitation', ipConf.no_brand_imitation],
                      ['No trademarked IP', ipConf.no_trademarked_ip],
                    ] as [string, boolean | undefined][]).map(([label, val]) => (
                      <div key={label} className={`flex items-center gap-1.5 text-[11px] ${val === false ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>
                        <span className={val ? 'text-green-500' : val === false ? 'text-red-400' : 'text-gray-300'}>
                          {val ? '✓' : val === false ? '✗' : '—'}
                        </span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Authorship */}
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Authorship</div>
                  <div className="text-gray-600 text-[11px] leading-relaxed whitespace-pre-wrap">{submission.authorship_statement || '—'}</div>
                </div>

                {/* Links */}
                <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  {submission.video_url && (
                    <a href={submission.video_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                      <ExternalLink className="w-3 h-3" />
                      Open submission video
                    </a>
                  )}
                  <Link href={`/admin/submissions/${submissionId}`} target="_blank"
                    className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    View full submission
                  </Link>
                </div>

              </div>
            )}

            {rightTab === 'evidence' && (
              <div className="space-y-2">
                {evidenceFiles.length === 0 ? (
                  <div className="text-gray-400">No evidence files uploaded.</div>
                ) : (
                  evidenceFiles.map(file => (
                    <a
                      key={file.name}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-white border rounded text-xs hover:bg-gray-50 transition-colors"
                      style={{ borderColor: 'rgba(0,0,0,0.08)' }}
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-400" />
                      <span className="truncate text-blue-600">{file.name}</span>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
    </WorkbookReadOnlyProvider>
  )
}
