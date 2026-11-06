/**
 * CR-V2-PDF-7B — a declaration prints exactly as recorded, or refuses.
 *
 * The first block runs the real PDF component and the real layout engine, in a child process because @react-pdf/renderer does not
 * load under Jest (`test-support/customer-pdf-layout-check.tsx`), so restoring the corruption or the truncation fails here.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lineBreakOpportunities, pdfText, unsupportedCharacters } from '@/lib/creator-record/customer-pdf/text-layout'

const APP = process.cwd()
const CASES: Record<string, string> = {
  traditional: '台灣影片測試：這是一段很長的繁體中文敘述，用來確認換行時不會遺失任何字元，也不會在頁面邊界被截斷。'.repeat(4) + '繁體結束',
  simplified: '简体中文测试：这是一段很长的简体中文叙述，用来确认换行时不会丢失任何字符，也不会被页面边界截断。'.repeat(4) + '简体结束',
  vietnamese: 'ĐẶNG Thị Hồng Nguyễn, Việt Nam: Ế Ố Ữ ư ơ đ — kết thúc',
  vietnamese_decomposed: 'Ặ NG và Việt',
  identifier: 'X'.repeat(480) + 'END',
  wide_identifier: 'W'.repeat(480) + 'END',
  url: 'https://example.test/' + 'path-segment/'.repeat(30) + 'END',
  mixed: 'Mixed English 與中文 answer: use Runway 和 Kling 製作 commercial video 廣告, ending here',
  multiline: 'Line one of a normal answer.\nLine two of a normal answer.\nLine three.',
  latin: 'Café Ñandú “quoted” — a normal answer with internationalization and responsibilities',
  emoji: 'Video 😀 here',
  rare_astral: 'Rare 𠀀 character',
  thai: 'ภาษาไทย',
  unattached_mark: 'x̣ y',
}
interface Block { text: string; lines: string[]; missingGlyphs: number; fonts: string[]; overflow: boolean }
type Result = { rendered: true; bytes: number; pages: number; blocks: Block[] } | { rendered: false; refusal: { code: string; ref: string | null } | string }

let results: Record<string, Result>
beforeAll(() => {
  const out = execFileSync(process.execPath, [join(APP, 'node_modules', 'tsx', 'dist', 'cli.mjs'), '--tsconfig', 'tsconfig.json', join('test-support', 'customer-pdf-layout-check.tsx'), JSON.stringify(CASES)], { cwd: APP, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  results = JSON.parse(out.slice(out.indexOf('@@RESULT@@') + '@@RESULT@@'.length))
}, 180_000)

const rendered = (name: string) => {
  const r = results[name]
  if (!r.rendered) throw new Error(`${name}: ${JSON.stringify(r.refusal)}`)
  return r
}
const blockOf = (name: string) => {
  const want = pdfText(CASES[name]).split('\n')[0]
  const b = rendered(name).blocks.find((x) => x.text.replace(/\s/g, '').startsWith(want.replace(/\s/g, '').slice(0, 12)))
  if (!b) throw new Error(`${name}: answer not in the layout`)
  return b
}
const faithful = ['traditional', 'simplified', 'vietnamese', 'vietnamese_decomposed', 'identifier', 'wide_identifier', 'url', 'mixed', 'multiline', 'latin']

describe('the real layout keeps every character', () => {
  test.each(faithful)('%s: complete, unchanged, with no inserted character', (name) => {
    expect(blockOf(name).text.replace(/\s/g, '')).toBe(pdfText(CASES[name]).replace(/\s/g, ''))
  })

  test.each(faithful)('%s: every glyph exists in the font that draws it, in the whole document', (name) => {
    for (const b of rendered(name).blocks) expect([b.text.slice(0, 40), b.missingGlyphs]).toEqual([b.text.slice(0, 40), 0])
  })

  test.each(faithful)('%s: nothing passes the page edge', (name) => {
    for (const b of rendered(name).blocks) expect([b.text.slice(0, 40), b.overflow]).toEqual([b.text.slice(0, 40), false])
  })

  test.each(['traditional', 'simplified', 'identifier', 'wide_identifier', 'url'])('%s: wraps onto several lines, and no line gains a hyphen', (name) => {
    const b = blockOf(name)
    expect(b.lines.length).toBeGreaterThan(1)
    if (name !== 'url') for (const l of b.lines) expect(l.trim().endsWith('-')).toBe(false)
    if (name === 'url') expect(b.lines.join('')).toBe(CASES[name])
  })

  test('Latin text stays in Helvetica; only other characters use the fallback font', () => {
    expect(blockOf('latin').fonts.every((f) => f.startsWith('Helvetica'))).toBe(true)
    expect(blockOf('mixed').fonts.some((f) => f.startsWith('Helvetica'))).toBe(true)
    expect(blockOf('mixed').fonts.some((f) => /Noto Sans CJK/.test(f))).toBe(true)
  })

  test('ordinary words are not broken, and a digest stays on one line', () => {
    expect(blockOf('latin').lines.join('')).toContain('internationalization and responsibilities')
    const digests = rendered('latin').blocks.filter((b) => /^[0-9a-f]{64}$/.test(b.text))
    expect(digests.length).toBeGreaterThan(0)
    for (const d of digests) expect(d.lines).toHaveLength(1)
  })
})

describe('what the fonts cannot print refuses, and is never printed wrongly', () => {
  test.each([
    ['emoji', 'U+1F600'],
    ['rare_astral', 'U+20000'],
    ['thai', 'U+0E20'],
    ['unattached_mark', 'U+0323'],
  ])('%s', (name, codePoint) => {
    const r = results[name]
    expect(r.rendered).toBe(false)
    if (r.rendered || typeof r.refusal === 'string') throw new Error(JSON.stringify(r))
    expect(r.refusal.code).toBe('text_unsupported')
    expect(r.refusal.ref).toContain(codePoint)
    // Code points only: a refusal is logged, and an answer's text must not be.
    expect(r.refusal.ref).not.toContain(CASES[name].slice(0, 2))
  })
})

describe('line breaks add nothing', () => {
  test.each(Object.values(CASES).flatMap((c) => c.split(/\s+/)))('%s', (word) => {
    expect(lineBreakOpportunities(word).join('')).toBe(word)
  })

  test('a break is an empty part, which the layout turns into a break with no hyphen', () => {
    expect(lineBreakOpportunities('表中')).toEqual(['表', '', '中'])
    expect(lineBreakOpportunities('X'.repeat(17)).filter((p) => p === '')).toHaveLength(16)
  })

  test('short words and digests stay whole', () => {
    expect(lineBreakOpportunities('responsibility')).toEqual(['responsibility'])
    expect(lineBreakOpportunities('a'.repeat(64))).toEqual(['a'.repeat(64)])
  })

  test('a character is never split from its mark, or across a surrogate pair', () => {
    expect(lineBreakOpportunities(`${'Ặ'.repeat(9)}`).filter((p) => p !== '')).toEqual(Array(9).fill('Ặ'))
    expect(lineBreakOpportunities('😀'.repeat(9)).filter((p) => p !== '')).toEqual(Array(9).fill('😀'))
  })
})

describe('the check itself', () => {
  const none = () => false
  test('reports code points, sorted and once each, and passes layout controls', () => {
    expect(unsupportedCharacters('ab\ta\nb', none)).toEqual(['U+0061', 'U+0062'])
    expect(unsupportedCharacters('\n\t\r', none)).toEqual([])
  })
  test('composes before it checks: a decomposed letter is the composed one', () => {
    expect(unsupportedCharacters('Ặ', (cp) => cp === 0x1eb6)).toEqual([])
    expect(pdfText('Ặ')).toBe('Ặ')
  })
  test('outside the Basic Multilingual Plane refuses whatever a font claims', () => {
    expect(unsupportedCharacters('𠀀', () => true)).toEqual(['U+20000'])
  })
})

describe('the source keeps these properties', () => {
  const src = readFileSync(join(APP, 'lib', 'creator-record', 'customer-pdf', 'CustomerRecordPDF.tsx'), 'utf8')
  test('no text bypasses the wrapper, and the unbreakable callback is gone', () => {
    expect(src).not.toMatch(/registerHyphenationCallback/)
    expect(Array.from(src.matchAll(/<Text\b/g))).toHaveLength(3) // the wrapper, the bullet mark and the page number
    expect(src).toMatch(/<Text \{\.\.\.props\} hyphenationCallback=\{lineBreakOpportunities\}>\{pdfText\(text\)\}<\/Text>/)
  })
  test('every route that can issue is deployed with the font: it is read at render time, so tracing cannot see it', () => {
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
    const issuing = walk(join(APP, 'app')).filter((f) => /route\.tsx?$/.test(f) && /runPaymentFulfillment\(|issueCreatorRecordArtifact\(/.test(readFileSync(f, 'utf8')))
      .map((f) => `/${f.slice(join(APP, 'app').length + 1).split(/[\\/]/).join('/').replace(/\/route\.tsx?$/, '')}`).sort()
    expect(issuing.length).toBeGreaterThan(0)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const includes = require(join(APP, 'next.config.js')).experimental.outputFileTracingIncludes as Record<string, string[]>
    expect(Object.keys(includes).sort()).toEqual(issuing)
    for (const globs of Object.values(includes)) expect(globs).toEqual(['./lib/creator-record/customer-pdf/fonts/**'])
  })

  test('the font is exactly the one its README names, and its licence ships with it', () => {
    const dir = join(APP, 'lib', 'creator-record', 'customer-pdf', 'fonts')
    const sha = createHash('sha256').update(readFileSync(join(dir, 'NotoSansCJKtc-Regular.otf'))).digest('hex')
    expect(sha).toBe('dce08bd4fd91aa8aa76ed8fea4b694c2dfb8550f67871e326843212ddbeb88b4')
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toContain(sha)
    expect(readFileSync(join(dir, 'LICENSE'), 'utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1')
  })
})
