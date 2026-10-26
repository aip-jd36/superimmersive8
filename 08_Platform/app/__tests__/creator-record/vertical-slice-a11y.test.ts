/**
 * CR-V2-PROD-UAT-1 — browser-automation readiness of the prototype, checked at
 * source level (the Jest setup does not render TSX). This is CODE-LEVEL
 * compatibility only; it is not evidence of a successful ChatGPT Work run.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PILOT_QUESTION_META } from '@/lib/creator-record/pilot/pilot-registry'

const APP = path.resolve(__dirname, '..', '..')
const src = (f: string) => readFileSync(path.join(APP, f), 'utf8')
const Q = src('components/creator-record/CreatorRecordQuestionnaire.tsx')
const V = src('components/creator-record/DraftRecordView.tsx')
const C = src('app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx')

test('every question has visible text and uses a standard control', () => {
  for (const m of Object.values(PILOT_QUESTION_META)) {
    expect(m.text.trim().length).toBeGreaterThan(5)
    expect(['text', 'textarea', 'single', 'multi']).toContain(m.input)
    if (m.input === 'single' || m.input === 'multi') for (const v of Object.values(m.option_labels)) expect(v.trim().length).toBeGreaterThan(1)
  }
  expect(Q).toMatch(/type="radio"/)
  expect(Q).toMatch(/type="checkbox"/)
  expect(Q).toMatch(/type="text"/)
  expect(Q).not.toMatch(/contentEditable|onDrag|onDrop|onMouseEnter|onMouseOver|<canvas/i)
})

test('text inputs are labelled by the visible question legend; options are wrapped in <label>', () => {
  expect((Q.match(/aria-labelledby=\{`\$\{id\}-legend`\}/g) ?? []).length).toBe(2)
  expect(Q).toMatch(/<legend id=\{`\$\{id\}-legend`\}/)
  expect((Q.match(/<label key=\{o\}/g) ?? []).length).toBe(2)
  expect(Q).toMatch(/Tool \{tool_index \+ 1\}: /)
  expect(Q).toMatch(/\(required\)/)
})

test('validation errors are visible text, summarised in an alert, and tied to their field', () => {
  expect(Q).toMatch(/role="alert"/)
  expect(Q).toMatch(/Some answers need attention/)
  expect(Q).toMatch(/id=\{`\$\{id\}-error`\}/)
  expect(Q).toMatch(/aria-invalid=\{!!issue\}/)
  expect(Q).toMatch(/Error: \{ISSUE_TEXT/)
})

test('submission produces a clear completion state and Start new test is always visible', () => {
  expect(C).toMatch(/role="status"/)
  expect(C).toMatch(/Draft record prepared/)
  expect((C.match(/>Start new test</g) ?? []).length).toBe(3)
  expect(C).toMatch(/const startNewTest = \(\) => \{\s*setView\(null\)\s*setLastState\(undefined\)\s*setIssues\(\[\]\)/)
})

test('the record is plain page text with labelled, distinguishable sections', () => {
  for (const id of ['summary', 'declarations', 'guidance', 'open-items', 'not-included', 'independent-review', 'not-done', 'method']) {
    expect(V).toContain(`<Section id="${id}"`)
  }
  expect(V).toMatch(/aria-labelledby=\{`record-\$\{id\}`\}/)
  expect(V).toMatch(/Guidance: \{c.subject\}/)
  expect(V).toMatch(/Open item: \{o.label\}/)
  for (const label of ['Relevance', 'Guidance', 'Based on what you told us', 'Caveat']) expect(V).toContain(`label="${label}"`)
  expect(V).not.toMatch(/<canvas|<img|<svg/i)
})
