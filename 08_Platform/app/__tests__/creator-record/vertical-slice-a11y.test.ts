/**
 * CR-V2-PROD-UAT-1 — browser-automation readiness of the prototype, checked at
 * source level (the Jest setup does not render TSX). This is CODE-LEVEL
 * compatibility only; it is not evidence of a successful ChatGPT Work run.
 *
 * CR-V2-EVIDENCE-SLICE-1: native <select> dropdowns, the plan question and the
 * document panel are held to the same rules (visible labels, standard
 * controls, visible status and errors, no hover- or drag-only interaction).
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PILOT_QUESTION_META } from '@/lib/creator-record/pilot/pilot-registry'

const APP = path.resolve(__dirname, '..', '..')
const src = (f: string) => readFileSync(path.join(APP, f), 'utf8')
const Q = src('components/creator-record/CreatorRecordQuestionnaire.tsx')
const D = src('components/creator-record/DocumentReviewPanel.tsx')
const V = src('components/creator-record/DraftRecordView.tsx')
const C = src('app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx')

test('every question has visible text and uses a standard control', () => {
  for (const m of Object.values(PILOT_QUESTION_META)) {
    expect(m.text.trim().length).toBeGreaterThan(5)
    expect(['text', 'textarea', 'single', 'multi', 'select', 'plan']).toContain(m.input)
    if (m.input === 'single' || m.input === 'multi' || m.input === 'select') for (const v of Object.values(m.option_labels)) expect(v.trim().length).toBeGreaterThan(1)
  }
  expect(Q).toMatch(/type="radio"/)
  expect(Q).toMatch(/type="checkbox"/)
  expect(Q).toMatch(/type="text"/)
  expect(Q).toMatch(/<select/)
  for (const s of [Q, D]) expect(s).not.toMatch(/contentEditable|onDrag|onDrop|onMouseEnter|onMouseOver|<canvas|datalist/i)
})

test('inputs and dropdowns are labelled by the visible question legend; options are wrapped in <label>', () => {
  // text, textarea, select and the plan dropdown
  expect((Q.match(/aria-labelledby=\{`\$\{id\}-legend`\}/g) ?? []).length).toBe(4)
  expect(Q).toMatch(/<legend id=\{`\$\{id\}-legend`\}/)
  expect((Q.match(/<label key=\{o\}/g) ?? []).length).toBe(2)
  expect(Q).toMatch(/Tool \{tool_index \+ 1\}: /)
  expect(Q).toMatch(/\(required\)/)
  expect(Q).toMatch(/<option value="">Choose…<\/option>/)
  // The plan dropdown always offers a way out of the suggestions.
  expect(Q).toMatch(/Another plan \(type its name\)/)
  expect(Q).toMatch(/aria-label=\{`Tool \$\{tool_index \+ 1\}: plan name`\}/)
})

test('validation errors are visible text, summarised in an alert, and tied to their field', () => {
  expect(Q).toMatch(/role="alert"/)
  expect(Q).toMatch(/Some answers need attention/)
  expect(Q).toMatch(/id=\{`\$\{id\}-error`\}/)
  expect(Q).toMatch(/aria-invalid=\{!!issue\}/)
  expect(Q).toMatch(/Error: \{ISSUE_TEXT/)
})

test('the document panel uses a file input and buttons, with visible status and errors (CR-V2-MVP-6: no choice to adopt)', () => {
  expect(D).toMatch(/type="file"/)
  expect(D).toMatch(/accept="application\/pdf,image\/png,image\/jpeg"/)
  expect(D).toMatch(/Read document for Tool \$\{n\}/)
  expect(D).toMatch(/role="status"/)
  expect(D).toMatch(/role="alert"/)
  expect(D).not.toMatch(/type="radio"|<legend|<fieldset/)
  expect(D).toMatch(/Remove document for Tool \{n\}/)
  // The consent statement is a visible checkbox before any document can be added.
  expect(Q).toMatch(/Before you add a document/)
})

test('submission produces a clear completion state and Start new test is always visible', () => {
  expect(C).toMatch(/role="status"/)
  expect(C).toMatch(/Draft record prepared/)
  expect((C.match(/>Start new test</g) ?? []).length).toBe(3)
  expect(C).toMatch(/const startNewTest = \(\) => \{\s*setView\(null\)\s*setLastState\(undefined\)\s*setLastDocuments\(\[\]\)\s*setIssues\(\[\]\)/)
})

test('the record is plain page text with labelled, distinguishable sections', () => {
  for (const id of ['summary', 'declarations', 'documents', 'reconciliation', 'guidance', 'open-items', 'not-included', 'independent-review', 'not-done', 'method']) {
    expect(V).toContain(`<Section id="${id}"`)
  }
  expect(V).toMatch(/aria-labelledby=\{`record-\$\{id\}`\}/)
  expect(V).toMatch(/Guidance: \{c.subject\}/)
  expect(V).toMatch(/Open item: \{o.label\}/)
  for (const label of ['Relevance', 'Guidance', 'Based on what you told us', 'Caveat']) expect(V).toContain(`label="${label}"`)
  expect(V).not.toMatch(/<canvas|<img|<svg/i)
})
