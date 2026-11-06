/**
 * CR-V2-2F — customer PDF layout grouping. @react-pdf/renderer is ESM-only and
 * cannot load under this Jest setup, so its primitives are stubbed: only the
 * pure grouping function is exercised here (rendering is checked with synthetic
 * PDFs in the review tooling).
 */
jest.mock('@react-pdf/renderer', () => ({
  Document: () => null, Page: () => null, Text: () => null, View: () => null,
  Font: { register: () => undefined },
  StyleSheet: { create: (s: unknown) => s },
  renderToStream: async () => { throw new Error('not available in unit tests') },
}))

import { groupHeadings } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import type { Block } from '@/lib/creator-record/customer-pdf/document-model'

const h = (text: string): Block => ({ kind: 'heading', text, from: 'template' })
const sh = (text: string): Block => ({ kind: 'subheading', text, from: 'template' })
const lb = (text: string): Block => ({ kind: 'label', text, from: 'template' })
const p = (text: string): Block => ({ kind: 'paragraph', text, from: 'record' })
const row = (label: string, value: string): Block => ({ kind: 'row', label, value, label_from: 'template', value_from: 'record' })

describe('groupHeadings', () => {
  const blocks: Block[] = [h('1. About'), p('intro'), p('more'), sh('Tool 1'), lb('Which tool?'), p('Pika'), row('Status', 'Open'), h('2. Next'), p('x'.repeat(401)), lb('trailing label')]

  test('no block is added, dropped or reordered', () => {
    expect(groupHeadings(blocks).flat()).toEqual(blocks)
  })

  test('a heading or run of headings stays with the short block after it', () => {
    const groups = groupHeadings(blocks)
    expect(groups[0]).toEqual([h('1. About'), p('intro')])
    expect(groups).toContainEqual([sh('Tool 1'), lb('Which tool?'), p('Pika')])
  })

  test('a long following block is not grouped (it may still break across pages)', () => {
    const groups = groupHeadings(blocks)
    expect(groups).toContainEqual([h('2. Next')])
    expect(groups).toContainEqual([p('x'.repeat(401))])
  })

  test('only headings and labels lead a group; content blocks stand alone', () => {
    for (const g of groupHeadings(blocks)) {
      if (g.length > 1) expect(g.slice(0, -1).every((b) => b.kind === 'heading' || b.kind === 'subheading' || b.kind === 'label')).toBe(true)
    }
  })
})
