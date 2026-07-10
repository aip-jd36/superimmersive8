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

type Section = '1' | '2' | '3' | '4' | '5' | '6' | '7'
type RightTab = 'submission' | 'evidence' | 'guidance'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface WorkbookClientProps {
  submissionId: string
  assessId: string
  initialWorkbook: WorkbookData
  submission: Record<string, any>
  evidenceFiles: Array<{ name: string }>
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
  submissionId, assessId, initialWorkbook, submission, evidenceFiles,
}: WorkbookClientProps) {
  const [workbook, setWorkbook] = useState<WorkbookData>(
    Object.keys(initialWorkbook).length > 1 ? initialWorkbook : EMPTY_WORKBOOK
  )
  const [activeSection, setActiveSection] = useState<Section>('1')
  const [rightTab, setRightTab] = useState<RightTab>('guidance')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [savedAtDisplay, setSavedAtDisplay] = useState('')
  const saveTimer = useRef<NodeJS.Timeout>()
  const isFirstRender = useRef(true)

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
        const { savedAt: ts } = await res.json()
        setSavedAt(ts)
        setSaveStatus('saved')
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }, [submissionId])

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(workbook), 600)
    return () => clearTimeout(saveTimer.current)
  }, [workbook, save])

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
    { id: '7', label: '§ 7  Report Brief',        complete: false,                   locked: !gates.canEnterSection7 },
  ]

  // Evidence count per section for nav badges
  const s3 = workbook.section_3 as Record<string, any>
  const controlCounts = ALL_CONTROLS.reduce((acc, id) => {
    acc[id] = s3[id]?.judgment ? 'done' : 'open'
    return acc
  }, {} as Record<string, string>)
  const s3DoneCounts = {
    A: ['A01'].filter(id => controlCounts[id] === 'done').length,
    R: ['R01','R02','R03','R04'].filter(id => controlCounts[id] === 'done').length,
    H: ['H01','H02'].filter(id => controlCounts[id] === 'done').length,
    I: ['I01','I02','I03'].filter(id => controlCounts[id] === 'done').length,
    L: ['L01','L02','L03'].filter(id => controlCounts[id] === 'done').length,
    T: ['T01'].filter(id => controlCounts[id] === 'done').length,
    D: ['D01','D02'].filter(id => controlCounts[id] === 'done').length,
  }

  const guidanceKey = activeSection === '3'
    ? 'R'  // default to first domain; updates as user scrolls
    : activeSection

  const handleNavClick = (section: Section, locked: boolean) => {
    if (locked) return
    setActiveSection(section)
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

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#FAFAF7' }}>

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
          <span className="text-xs font-mono text-amber-400">{assessId}</span>
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
              : saveStatus === 'saving' ? '#9ca3af'
              : saveStatus === 'saved' ? '#6ee7b7'
              : '#6b7280'
          }}>
            {saveStatus === 'saving' ? 'Saving…'
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
                const counts = { A: 1, R: 4, H: 2, I: 3, L: 3, T: 1, D: 2 }
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
                onChange={updates => updateSection('section_3', updates)}
                onDomainFocus={domain => setRightTab('guidance')}
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
                assessId={assessId}
                onChange={updates => updateSection('section_6', updates)}
              />
            )}
            {activeSection === '7' && (
              <Section7Brief
                data={workbook.section_7}
                section6={workbook.section_6}
                section5={workbook.section_5}
                section3={workbook.section_3}
                assessId={assessId}
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

        {/* Right Context Panel */}
        <aside
          className="flex-shrink-0 flex flex-col border-l overflow-hidden"
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
              <div className="space-y-3">
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
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">AI Tools</div>
                  {toolsUsed.length > 0 ? toolsUsed.map((t: any, i: number) => (
                    <div key={i} className="text-gray-600">
                      {t.tool_name || t.tool} {t.plan_type ? `(${t.plan_type})` : ''}
                    </div>
                  )) : <div className="text-gray-400">None declared</div>}
                </div>
                <div>
                  <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Authorship</div>
                  <div className="text-gray-600 text-[11px] leading-relaxed whitespace-pre-wrap">{submission.authorship_statement || '—'}</div>
                </div>
                {submission.video_url && (
                  <a
                    href={submission.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open submission video
                  </a>
                )}
              </div>
            )}

            {rightTab === 'evidence' && (
              <div className="space-y-2">
                {evidenceFiles.length === 0 ? (
                  <div className="text-gray-400">No evidence files uploaded.</div>
                ) : (
                  evidenceFiles.map(file => (
                    <div key={file.name} className="flex items-center gap-2 p-2 bg-white border rounded text-xs"
                      style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                      <span className="truncate">{file.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
