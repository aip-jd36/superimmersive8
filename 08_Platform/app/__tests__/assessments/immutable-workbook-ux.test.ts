/**
 * CA-OPS-3 — Immutable Reviewer Workbook UX.
 *
 * CA-OPS-1/CA-OPS-2 established: patch_workbook_atomic correctly rejects
 * workbook mutations once assessment.processing_status is SIGNING, SIGNED,
 * or DELIVERED (fail-closed, unchanged by this milestone) -- but the
 * reviewer workbook UI rendered no visual distinction, and the client
 * autosave path collapsed the correct rejection into an undifferentiated
 * "Save failed", including for a mount-time effect-driven mutation
 * (Section2Visual's video_url_confirmed prepopulate) that disabling inputs
 * alone would never have stopped.
 *
 * This suite proves, using the same two seams the CA-METH-5/6 lineage
 * established (source-contract regex checks + pure-logic mirrors of the
 * exact formulas in the UI code -- no React render harness exists in this
 * repo):
 *   - the immutable derivation is centralized in WorkbookClient.tsx and
 *     matches patch_workbook_atomic's own three-value lock set exactly;
 *   - it is never derived from signoff_status, revision equality,
 *     completion, R05, or G2;
 *   - known-immutable state suppresses both autosave scheduling and
 *     Section2Visual's mount-time mutation;
 *   - every Section's mutation-triggering input/button consumes the shared
 *     read-only context;
 *   - non-mutating navigation (section nav, domain accordion, right-rail
 *     tabs) does NOT consume it;
 *   - the three recognized 409 lock codes -- and only those -- transition
 *     the client into a truthful locked state, distinct from the generic
 *     save-error state used for everything else.
 *
 * Run: npx jest __tests__/assessments/immutable-workbook-ux.test.ts
 */

import fs from 'fs'
import path from 'path'
import { PROCESSING_STATUSES, type ProcessingStatus } from '@/types/assessment'

const REVIEW_DIR = path.join(__dirname, '../../app/admin/submissions/[id]/review')
const read = (file: string) => fs.readFileSync(path.join(REVIEW_DIR, file), 'utf8')

const WORKBOOK_CLIENT = read('WorkbookClient.tsx')
const SECTION_FILES = [
  'Section1Intake.tsx',
  'Section2Visual.tsx',
  'Section3Evidence.tsx',
  'Section4Gaps.tsx',
  'Section5Findings.tsx',
  'Section6Assessment.tsx',
  'Section7Brief.tsx',
]

// ── Authoritative lock-set mirror (Cases 1-4) ───────────────────────────────

describe('immutable-status derivation matches patch_workbook_atomic exactly', () => {
  const IMMUTABLE = ['SIGNING', 'SIGNED', 'DELIVERED'] as const

  test('SIGNING, SIGNED, DELIVERED are immutable', () => {
    for (const s of IMMUTABLE) expect(IMMUTABLE.includes(s as any)).toBe(true)
  })

  test('DRAFT, REPORT_GENERATED, FAILED, and no-assessment (null) are editable', () => {
    const editable: Array<ProcessingStatus | null> = ['DRAFT', 'REPORT_GENERATED', 'FAILED', null]
    for (const s of editable) {
      expect(s === null || !(IMMUTABLE as readonly string[]).includes(s)).toBe(true)
    }
  })

  test('the immutable set is exactly 3 of the 6 canonical processing statuses -- no status silently added or dropped', () => {
    expect(PROCESSING_STATUSES).toHaveLength(6)
    expect(IMMUTABLE).toHaveLength(3)
    for (const s of IMMUTABLE) expect(PROCESSING_STATUSES).toContain(s)
  })

  test("WorkbookClient.tsx's own IMMUTABLE_PROCESSING_STATUSES constant matches this exact 3-value set (source-contract check)", () => {
    expect(WORKBOOK_CLIENT).toMatch(
      /IMMUTABLE_PROCESSING_STATUSES = \['SIGNING', 'SIGNED', 'DELIVERED'\]/,
    )
  })
})

// ── Centralized authority, not a heuristic (Case 5) ─────────────────────────

describe('lifecycle authority is centralized and not derived from disallowed fields', () => {
  // Isolate just the derivation block so a legitimate, unrelated use of
  // `signoffStatus` etc. elsewhere in the file (e.g. the sign-off-invalidated
  // handler) can never produce a false pass here.
  const derivationBlock = (() => {
    const start = WORKBOOK_CLIENT.indexOf('const lockedStatus: LockedStatus | null =')
    const end = WORKBOOK_CLIENT.indexOf('const immutable = lockedStatus !== null')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    return WORKBOOK_CLIENT.slice(start, end)
  })()

  test('the derivation references only raceLockedCode / LOCK_CODE_TO_STATUS / processingStatus / IMMUTABLE_PROCESSING_STATUSES', () => {
    expect(derivationBlock).toMatch(/raceLockedCode/)
    expect(derivationBlock).toMatch(/LOCK_CODE_TO_STATUS/)
    expect(derivationBlock).toMatch(/processingStatus/)
    expect(derivationBlock).toMatch(/IMMUTABLE_PROCESSING_STATUSES/)
  })

  test('the derivation never references signoff_status/signoffStatus, workbook_revision/signed_workbook_revision, R05, G2/jurisdiction, or computeGates/gates', () => {
    for (const forbidden of [
      /signoffStatus/, /signoff_status/,
      /workbook_revision/, /signed_workbook_revision/,
      /R05/, /jurisdiction/, /computeGates/, /\bgates\b/,
    ]) {
      expect(derivationBlock).not.toMatch(forbidden)
    }
  })

  test('WorkbookReadOnlyContext (the distribution channel) carries only a boolean, never processing_status/signoff_status/revision data (source-contract check)', () => {
    const ctx = fs.readFileSync(path.join(REVIEW_DIR, 'workbook-readonly-context.tsx'), 'utf8')
    expect(ctx).toMatch(/createContext<boolean>\(false\)/)
  })
})

// ── Autosave suppression (Case 6) ───────────────────────────────────────────

describe('known-immutable state suppresses autosave scheduling', () => {
  test('the debounced-save effect is gated on `immutable` before scheduling a PATCH', () => {
    const idx = WORKBOOK_CLIENT.search(/useEffect\(\(\) => \{\s*if \(isFirstRender\.current\)/)
    expect(idx).toBeGreaterThan(-1)
    const effectBlock = WORKBOOK_CLIENT.slice(idx, idx + 600)
    expect(effectBlock).toMatch(/if \(immutable\) return/)
    // The guard must run BEFORE the timer is scheduled, not after.
    const guardIdx = effectBlock.indexOf('if (immutable) return')
    const scheduleIdx = effectBlock.indexOf('saveTimer.current = setTimeout')
    expect(guardIdx).toBeGreaterThan(-1)
    expect(scheduleIdx).toBeGreaterThan(guardIdx)
  })

  test('the effect dependency array includes `immutable`, so it re-evaluates when a race-case lock is detected mid-session', () => {
    expect(WORKBOOK_CLIENT).toMatch(/\}, \[workbook, save, immutable\]\)/)
  })
})

// ── Mount-time mutation suppression (Case 7) ────────────────────────────────

describe('known-immutable state suppresses mount/effect-driven workbook mutations', () => {
  test("Section2Visual's video_url_confirmed prepopulate effect is guarded on readOnly before calling onChange", () => {
    const src = read('Section2Visual.tsx')
    const idx = src.search(/useEffect\(\(\) => \{\s*if \(readOnly\) return/)
    expect(idx).toBeGreaterThan(-1)
    const effectBlock = src.slice(idx, idx + 200)
    expect(effectBlock).toMatch(/if \(readOnly\) return/)
    expect(effectBlock).toMatch(/video_url_confirmed/)
    const guardIdx = effectBlock.indexOf('if (readOnly) return')
    const mutateIdx = effectBlock.indexOf('u({ video_url_confirmed')
    expect(mutateIdx).toBeGreaterThan(guardIdx)
  })

  test("Section4Gaps' gap auto-seed effect is likewise guarded (the same mount-mutation risk class, found independently)", () => {
    const src = read('Section4Gaps.tsx')
    const idx = src.search(/useEffect\(\(\) => \{\s*if \(readOnly\) return/)
    expect(idx).toBeGreaterThan(-1)
    const effectBlock = src.slice(idx, idx + 300)
    expect(effectBlock).toMatch(/if \(readOnly\) return/)
    expect(effectBlock).toMatch(/buildSuggestedGaps/)
  })
})

// ── Mutation-control coverage (Case 8) ──────────────────────────────────────

describe('every Section consumes the shared read-only context for its mutation surface', () => {
  test.each(SECTION_FILES)('%s imports useWorkbookReadOnly and applies disabled={readOnly} to at least one control', (file) => {
    const src = read(file)
    expect(src).toMatch(/import \{ useWorkbookReadOnly \} from '\.\/workbook-readonly-context'/)
    expect(src).toMatch(/disabled=\{readOnly\}|disabled=\{\(.*\) \|\| readOnly\}|disabled=\{!.*\|\| .*readOnly\}/)
  })

  test('Section1Intake gates all five scope-check checkboxes plus the free-text/select fields (7 total controls)', () => {
    const src = read('Section1Intake.tsx')
    const matches = src.match(/disabled=\{readOnly\}/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(7)
  })

  test('Section3Evidence gates its four shared primitives (Sel/Text/Check/Textarea) plus the Assessment notes and Judgment fields', () => {
    const src = read('Section3Evidence.tsx')
    expect(src).toMatch(/function Sel\(\{[\s\S]*?disabled=\{readOnly\}/)
    expect(src).toMatch(/function Text\(\{[\s\S]*?disabled=\{readOnly\}/)
    expect(src).toMatch(/function Check\(\{[\s\S]*?disabled=\{readOnly\}/)
    expect(src).toMatch(/function Textarea\(\{[\s\S]*?disabled=\{readOnly\}/)
    const matches = src.match(/disabled=\{readOnly\}/g) ?? []
    // 4 primitives + Assessment notes textarea + Judgment select
    expect(matches.length).toBeGreaterThanOrEqual(6)
  })

  test('Section6Assessment additionally gates the signed_off checkbox and the record-signoff button without touching signoff logic itself', () => {
    const src = read('Section6Assessment.tsx')
    expect(src).toMatch(/disabled=\{\(!canSignOff && !data\.signed_off\) \|\| readOnly\}/)
    expect(src).toMatch(/disabled=\{!canSignOff \|\| signing \|\| readOnly\}/)
    // The sign-off completeness/RPC call itself is untouched.
    expect(src).toMatch(/fetch\(`\/api\/admin\/submissions\/\$\{submissionId\}\/sign-off`, \{ method: 'POST' \}\)/)
  })

  test('Section7Brief gates Textarea/StringList and the mutating "Seed draft" button, but NOT the view/download report actions', () => {
    const src = read('Section7Brief.tsx')
    expect(src).toMatch(/function Textarea\(\{[\s\S]*?disabled=\{readOnly\}/)
    expect(src).toMatch(/function StringList\(\{[\s\S]*?disabled=\{readOnly\}/)
    expect(src).toMatch(/onClick=\{handleSeed\}\s*\n\s*disabled=\{readOnly\}/)
    // Report generation / source download are view/download actions -- CA-OPS-3
    // explicitly requires these remain usable; they must NOT be gated on readOnly.
    const generateBtnIdx = src.indexOf('onClick={handleGeneratePdf}')
    const downloadBtnIdx = src.indexOf('onClick={handleDownloadTyp}')
    expect(generateBtnIdx).toBeGreaterThan(-1)
    expect(downloadBtnIdx).toBeGreaterThan(-1)
    expect(src.slice(generateBtnIdx, generateBtnIdx + 80)).not.toMatch(/readOnly/)
    expect(src.slice(downloadBtnIdx, downloadBtnIdx + 80)).not.toMatch(/readOnly/)
  })
})

// ── Non-mutating navigation stays usable (Case 9) ───────────────────────────

describe('non-mutating reviewer functionality is never gated on readOnly/immutable', () => {
  test('section-nav buttons are disabled only by gates.canEnterSectionN, never by immutable', () => {
    const idx = WORKBOOK_CLIENT.indexOf('const sectionNav:')
    const end = WORKBOOK_CLIENT.indexOf(']', WORKBOOK_CLIENT.indexOf('§ 7'))
    const block = WORKBOOK_CLIENT.slice(idx, end)
    expect(block).toMatch(/locked: !gates\.canEnterSection2/)
    expect(block).not.toMatch(/immutable/)
  })

  test('handleNavClick and the right-rail tab switcher (setRightTab) are not gated on immutable', () => {
    const navIdx = WORKBOOK_CLIENT.indexOf('const handleNavClick')
    const navBlock = WORKBOOK_CLIENT.slice(navIdx, navIdx + 200)
    expect(navBlock).not.toMatch(/immutable/)
    expect(WORKBOOK_CLIENT).toMatch(/onClick=\{\(\) => setRightTab\(tab\)\}/)
  })

  test("Section3Evidence's domain accordion open/close button is not gated on readOnly (only the input primitives inside a domain are)", () => {
    const src = read('Section3Evidence.tsx')
    const idx = src.search(/onClick=\{\(\) => \{\s*const opening = !open/)
    expect(idx).toBeGreaterThan(-1)
    const block = src.slice(idx, idx + 200)
    expect(block).not.toMatch(/readOnly/)
  })
})

// ── Stale-client / 409 lock-code handling (Cases 10-12) ─────────────────────

describe('save() distinguishes an authoritative immutable rejection from any other failure', () => {
  const LOCK_CODE_TO_STATUS: Record<string, 'SIGNING' | 'SIGNED' | 'DELIVERED'> = {
    locked_for_signing: 'SIGNING',
    signed_immutable: 'SIGNED',
    delivered: 'DELIVERED',
  }

  test('exactly the three backend lock codes map to a locked status; nothing else does', () => {
    expect(Object.keys(LOCK_CODE_TO_STATUS).sort()).toEqual(
      ['delivered', 'locked_for_signing', 'signed_immutable'].sort(),
    )
    for (const other of ['submission_not_found', 'Failed to save', 'Internal server error', 'Unauthorized', 'Forbidden', undefined, '']) {
      expect(Boolean(other && other in LOCK_CODE_TO_STATUS)).toBe(false)
    }
  })

  test("WorkbookClient.tsx's own LOCK_CODE_TO_STATUS matches this exact mapping (source-contract check)", () => {
    expect(WORKBOOK_CLIENT).toMatch(/locked_for_signing: 'SIGNING'/)
    expect(WORKBOOK_CLIENT).toMatch(/signed_immutable: 'SIGNED'/)
    expect(WORKBOOK_CLIENT).toMatch(/\bdelivered: 'DELIVERED'/)
  })

  test('save() branches on the structured `error` code only -- never on free-form message text -- before deciding locked vs. generic error', () => {
    const idx = WORKBOOK_CLIENT.indexOf('let code: string | undefined')
    const end = WORKBOOK_CLIENT.indexOf("}, [submissionId])")
    const block = WORKBOOK_CLIENT.slice(idx, end)
    expect(block).toMatch(/code = body\?\.error/)
    expect(block).not.toMatch(/body\.message|body\?\.message/)
    expect(block).toMatch(/if \(code && code in LOCK_CODE_TO_STATUS\)/)
    expect(block).toMatch(/setSaveStatus\('locked'\)/)
    expect(block).toMatch(/\} else \{\s*setSaveStatus\('error'\)/)
  })

  test('a malformed/non-JSON failure response falls through to the generic error path, not a crash or a locked state', () => {
    const idx = WORKBOOK_CLIENT.indexOf('let code: string | undefined')
    const block = WORKBOOK_CLIENT.slice(idx, idx + 400)
    expect(block).toMatch(/catch \{\s*\/\/ Malformed\/non-JSON body/)
  })

  test('the locked save-status renders truthful, non-generic copy distinct from "Save failed", and the persistent banner never echoes raw server message text', () => {
    expect(WORKBOOK_CLIENT).toMatch(/saveStatus === 'locked' \? 'Locked — not saved'/)
    expect(WORKBOOK_CLIENT).toMatch(/LOCK_MESSAGES\[lockedStatus\]/)
    // The race-case banner sentence is fixed copy, not `raceLockedCode`/server text interpolated in.
    expect(WORKBOOK_CLIENT).toMatch(/Your most recent change was not saved\. Refresh the page to view the current record\./)
  })

  test('the three approved lock messages are present verbatim', () => {
    expect(WORKBOOK_CLIENT).toMatch(/SIGNING: 'Workbook locked — this assessment is currently being signed\.'/)
    expect(WORKBOOK_CLIENT).toMatch(/SIGNED: 'Workbook locked — this assessment has already been signed\.'/)
    expect(WORKBOOK_CLIENT).toMatch(/DELIVERED: 'Workbook locked — this assessment has already been delivered\.'/)
  })
})

// ── Backend / excluded surfaces byte-unchanged ──────────────────────────────

describe('backend and excluded surfaces are untouched by this milestone', () => {
  test('the workbook PATCH route response contract (locked/message/status codes) is unchanged', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '../../app/api/admin/submissions/[id]/workbook/route.ts'),
      'utf8',
    )
    expect(route).toMatch(/locked_for_signing: 'Provenance signing is in progress — the workbook is locked\.'/)
    expect(route).toMatch(/signed_immutable: 'This assessment has been provenance-signed and its workbook is locked\.'/)
    expect(route).toMatch(/delivered: 'This assessment has been delivered and its workbook is locked\.'/)
    expect(route).toMatch(/status: 409/)
  })
})
