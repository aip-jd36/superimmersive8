/**
 * CR-V2-MVP-M3A — a schema 8 record through the real PDF component and the real layout engine (in a child process, because
 * @react-pdf/renderer does not load under Jest: `test-support/customer-pdf-schema8-layout-check.tsx`). Synthetic fixtures and
 * synthetic test templates only.
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { pdfText } from '@/lib/creator-record/customer-pdf/text-layout'

const APP = process.cwd()
const CJK_NAME = '收據與授權文件——這是一個很長的繁體中文檔案名稱，用來確認換行時不會遺失任何字元'.repeat(2) + '.png'
const LONG_NAME = `${'receipt-'.repeat(14)}END.png`
const CASES: Record<string, { title?: string; fileNames?: string[] }> = {
  plain: {},
  unicode: { title: '台灣影片測試：繁體中文標題', fileNames: [CJK_NAME, 'Café Ñandú “quoted” — reçu.png', 'ĐẶNG Thị Hồng — giấy phép.png'] },
  long: { fileNames: [LONG_NAME, LONG_NAME, LONG_NAME] },
}
interface Block { text: string; lines: string[]; missingGlyphs: number; overflow: boolean }
type Result = { rendered: true; bytes: number; header: string; pages: number; blocks: Block[] } | { rendered: false; refusal: unknown }

let results: Record<string, Result>
beforeAll(() => {
  const out = execFileSync(process.execPath, [join(APP, 'node_modules', 'tsx', 'dist', 'cli.mjs'), '--tsconfig', 'tsconfig.json', join('test-support', 'customer-pdf-schema8-layout-check.tsx'), JSON.stringify(CASES)], { cwd: APP, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  results = JSON.parse(out.slice(out.indexOf('@@RESULT@@') + '@@RESULT@@'.length))
}, 240_000)

const rendered = (name: string) => {
  const r = results[name]
  if (!r.rendered) throw new Error(`${name}: ${JSON.stringify(r.refusal)}`)
  return r
}
const joined = (name: string) => rendered(name).blocks.map((b) => b.text.replace(/\s/g, '')).join('\n')

describe('schema 8 renders to real PDF bytes', () => {
  test.each(Object.keys(CASES))('%s: a PDF, laid out on more than one page, with no missing glyph and nothing past the page edge', (name) => {
    const r = rendered(name)
    expect(r.header).toBe('%PDF-')
    expect(r.bytes).toBeGreaterThan(10_000)
    expect(r.pages).toBeGreaterThan(1)
    for (const b of r.blocks) expect([b.text.slice(0, 40), b.missingGlyphs, b.overflow]).toEqual([b.text.slice(0, 40), 0, false])
  })

  test('the documents section and its readings are in the laid-out document', () => {
    const t = joined('plain')
    for (const s of ['5.Documentsandwhatwasreadfromthem', 'Readings', 'Limitationsofthisexamination', 'Examinationsource', 'Thisrecorddoesnotsaywhetheradocumentmatcheswhatyoutoldus']) expect(t).toContain(s)
  })

  test('long Unicode and long unbroken file names print complete', () => {
    const u = joined('unicode')
    expect(u).toContain(pdfText(CJK_NAME).replace(/\s/g, ''))
    expect(u).toContain('CaféÑandú“quoted”—reçu.png')
    expect(u).toContain('ĐẶNGThịHồng—giấyphép.png')
    expect(joined('long')).toContain(LONG_NAME)
  })
})
