/**
 * SI8-UX-2 — the browser harness's copy of the reference rules agrees with the real `parseEvidenceReferences` on every case, so
 * the harness accepts and refuses exactly what the server would. (The harness is test support only; it is never served.)
 */
import { parseEvidenceReferences } from '@/lib/creator-record/evidence-intake/contract'
import { parseEvidenceReferencesForHarness } from '@/test-support/si8-ux-2/references'

const D = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const r = (n: number, tool_index: unknown, category: unknown = 'billing_receipt') => ({ document_id: D(n), category, tool_index })
const CASES: [unknown, number][] = [
  [undefined, 1], [[], 1], [[r(1, 0)], 1], [[r(1, null)], 0], [[r(1, 1)], 1], [[r(1, -1)], 2], [[r(1, 0.5)], 2], [[r(1, '0')], 2],
  [[r(1, 0), r(2, 0)], 1], [[r(1, 0), r(2, 0), r(3, 0)], 1], [[r(1, 0), r(1, 1)], 2], [[r(1, 0, 'verified_rights')], 1],
  [[{ document_id: D(1), category: 'licence', tool_index: 0, extra: 1 }], 1], [[{ document_id: 'not-a-uuid', category: 'licence', tool_index: 0 }], 1],
  [Array.from({ length: 13 }, (_, i) => r(i + 1, null)), 3], [Array.from({ length: 12 }, (_, i) => r(i + 1, null)), 3], ['x', 1], [[null], 1], [[[1]], 1],
]

test.each(CASES.map((c, i) => [i, ...c]))('case %i: harness and server rules agree', (_i, v, toolCount) => {
  const real = parseEvidenceReferences(v, toolCount as number)
  const copy = parseEvidenceReferencesForHarness(v, toolCount as number)
  expect(copy).toEqual(real === null ? null : real.map((x) => ({ document_id: x.document_id, category: x.category, tool_index: x.tool_index })))
})
