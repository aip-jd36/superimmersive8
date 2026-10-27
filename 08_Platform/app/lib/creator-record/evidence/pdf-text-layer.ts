/**
 * CR-V2-MVP-3 — independent read of a PDF's own text layer (for the G-R2
 * plan cross-check). Deterministic, no model, no dependency beyond `node:zlib`.
 *
 * Scope is deliberately narrow and FAILS CLOSED: it reads the page content
 * streams of an unencrypted PDF whose streams are uncompressed or FlateDecode,
 * mapping glyph codes to text through each font's ToUnicode CMap (or, for
 * simple single-byte fonts without one, printable ASCII). Anything else —
 * encryption, other filters, too many pages or objects, fonts whose codes
 * cannot be mapped, no text at all — returns `unavailable` with a reason.
 * `unavailable` never means "nothing else is printed": callers must treat it
 * as "could not be checked".
 */

import { inflateSync } from 'node:zlib'

export const PDF_TEXT_LAYER_VERSION = 'pdf-text-layer-v1'
const MAX_PAGES = 5
const MAX_OBJECTS = 20_000
const MAX_INFLATED_BYTES = 8 * 1024 * 1024
const MAX_UNMAPPED_RATIO = 0.05

export type TextLayerUnavailableReason = 'not_pdf' | 'encrypted' | 'unsupported_structure' | 'unsupported_filter' | 'too_large' | 'unmapped_font' | 'no_text'
export type TextLayer = { status: 'extracted'; text: string; pages: number } | { status: 'unavailable'; reason: TextLayerUnavailableReason }

// ───────────────────────────────────────────── minimal PDF object model

type PdfValue = number | boolean | null | string | PdfName | PdfRef | PdfString | PdfValue[] | PdfDict
interface PdfName { name: string }
interface PdfRef { ref: number }
interface PdfString { bytes: number[] }
type PdfDict = { [key: string]: PdfValue }
interface PdfObject { dict: PdfValue; stream: Uint8Array | null }

const isName = (v: unknown): v is PdfName => typeof v === 'object' && v !== null && 'name' in v
const isRef = (v: unknown): v is PdfRef => typeof v === 'object' && v !== null && 'ref' in v
const isStr = (v: unknown): v is PdfString => typeof v === 'object' && v !== null && 'bytes' in v
const isDict = (v: unknown): v is PdfDict => typeof v === 'object' && v !== null && !Array.isArray(v) && !isName(v) && !isRef(v) && !isStr(v)

class Fail extends Error {
  constructor(public reason: TextLayerUnavailableReason) {
    super(reason)
  }
}

const WS = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20])
const DELIM = new Set('()<>[]{}/%'.split('').map((c) => c.charCodeAt(0)))

/** Recursive-descent parser over a latin1 string (objects, dictionaries, content-stream operands). */
class Parser {
  i = 0
  constructor(readonly s: string) {}
  ws() {
    for (;;) {
      while (this.i < this.s.length && WS.has(this.s.charCodeAt(this.i))) this.i++
      if (this.s[this.i] === '%') {
        while (this.i < this.s.length && this.s[this.i] !== '\n' && this.s[this.i] !== '\r') this.i++
        continue
      }
      return
    }
  }
  regular(): string {
    const start = this.i
    while (this.i < this.s.length && !WS.has(this.s.charCodeAt(this.i)) && !DELIM.has(this.s.charCodeAt(this.i))) this.i++
    return this.s.slice(start, this.i)
  }
  literal(): PdfString {
    // assumes s[i] === '('
    this.i++
    const out: number[] = []
    let depth = 1
    while (this.i < this.s.length) {
      const c = this.s[this.i++]
      if (c === '\\') {
        const n = this.s[this.i++]
        const map: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 }
        if (n in map) out.push(map[n])
        else if (n >= '0' && n <= '7') {
          let oct = n
          for (let k = 0; k < 2 && this.s[this.i] >= '0' && this.s[this.i] <= '7'; k++) oct += this.s[this.i++]
          out.push(parseInt(oct, 8) & 0xff)
        } else if (n === '\r') {
          if (this.s[this.i] === '\n') this.i++
        } else if (n !== '\n') out.push(n.charCodeAt(0))
      } else if (c === '(') {
        depth++
        out.push(40)
      } else if (c === ')') {
        if (--depth === 0) break
        out.push(41)
      } else out.push(c.charCodeAt(0) & 0xff)
    }
    return { bytes: out }
  }
  hex(): PdfString {
    // assumes s[i] === '<' and s[i+1] !== '<'
    this.i++
    let h = ''
    while (this.i < this.s.length && this.s[this.i] !== '>') {
      const c = this.s[this.i++]
      if (/[0-9a-fA-F]/.test(c)) h += c
    }
    this.i++
    if (h.length % 2) h += '0'
    const out: number[] = []
    for (let k = 0; k < h.length; k += 2) out.push(parseInt(h.slice(k, k + 2), 16))
    return { bytes: out }
  }
  /** Parses one value; returns undefined at an operator keyword (left unconsumed in `lastKeyword`). */
  lastKeyword: string | null = null
  value(): PdfValue | undefined {
    this.ws()
    this.lastKeyword = null
    if (this.i >= this.s.length) return undefined
    const c = this.s[this.i]
    if (c === '/') {
      this.i++
      return { name: this.regular().replace(/#([0-9a-fA-F]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16))) }
    }
    if (c === '(') return this.literal()
    if (c === '<') {
      if (this.s[this.i + 1] === '<') {
        this.i += 2
        const d: PdfDict = {}
        for (;;) {
          this.ws()
          if (this.s.startsWith('>>', this.i)) {
            this.i += 2
            return d
          }
          const k = this.value()
          if (!isName(k)) throw new Fail('unsupported_structure')
          const v = this.value()
          if (v === undefined) throw new Fail('unsupported_structure')
          d[k.name] = v
        }
      }
      return this.hex()
    }
    if (c === '[') {
      this.i++
      const a: PdfValue[] = []
      for (;;) {
        this.ws()
        if (this.s[this.i] === ']') {
          this.i++
          return a
        }
        const v = this.value()
        if (v === undefined) {
          if (this.lastKeyword === null) throw new Fail('unsupported_structure')
          continue // operator keywords inside arrays are not expected; skip
        }
        a.push(v)
      }
    }
    if (c === ']' || c === '>' || c === ')' || c === '{' || c === '}') {
      this.i++
      return this.value()
    }
    const tok = this.regular()
    if (tok === '') {
      this.i++
      return this.value()
    }
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(tok)) {
      // indirect reference "n g R"
      const save = this.i
      this.ws()
      const g = this.regular()
      if (/^\d+$/.test(tok) && /^\d+$/.test(g)) {
        this.ws()
        if (this.s[this.i] === 'R' && (this.i + 1 >= this.s.length || WS.has(this.s.charCodeAt(this.i + 1)) || DELIM.has(this.s.charCodeAt(this.i + 1)))) {
          this.i++
          return { ref: Number(tok) }
        }
      }
      this.i = save
      return Number(tok)
    }
    if (tok === 'true') return true
    if (tok === 'false') return false
    if (tok === 'null') return null
    this.lastKeyword = tok
    return undefined
  }
}

function decodeStream(dict: PdfValue, raw: Uint8Array, budget: { inflated: number }): Uint8Array {
  const d = isDict(dict) ? dict : {}
  const f = d.Filter
  const filters = f === undefined ? [] : Array.isArray(f) ? f : [f]
  let data: Uint8Array = raw
  for (const x of filters) {
    if (!isName(x) || x.name !== 'FlateDecode') throw new Fail('unsupported_filter')
    try {
      data = inflateSync(data, { maxOutputLength: MAX_INFLATED_BYTES })
    } catch {
      throw new Fail('unsupported_filter')
    }
    budget.inflated += data.length
    if (budget.inflated > MAX_INFLATED_BYTES) throw new Fail('too_large')
  }
  if (isDict(d.DecodeParms) && typeof d.DecodeParms.Predictor === 'number' && d.DecodeParms.Predictor > 1) throw new Fail('unsupported_filter')
  return data
}

function loadObjects(bytes: Uint8Array): Map<number, PdfObject> {
  const s = Buffer.from(bytes).toString('latin1')
  const objects = new Map<number, PdfObject>()
  const re = /(\d+)\s+(\d+)\s+obj\b/g
  const budget = { inflated: 0 }
  let m: RegExpExecArray | null
  const streamObjs: { num: number; dict: PdfValue; raw: Uint8Array }[] = []
  while ((m = re.exec(s))) {
    if (objects.size > MAX_OBJECTS) throw new Fail('too_large')
    const num = Number(m[1])
    const start = re.lastIndex
    const p = new Parser(s)
    p.i = start
    let dict: PdfValue | undefined
    try {
      dict = p.value()
    } catch {
      continue
    }
    if (dict === undefined) continue
    p.ws()
    let stream: Uint8Array | null = null
    if (s.startsWith('stream', p.i)) {
      let ds = p.i + 6
      if (s[ds] === '\r') ds++
      if (s[ds] === '\n') ds++
      const len = isDict(dict) && typeof dict.Length === 'number' ? dict.Length : -1
      let de = len >= 0 && s.startsWith('endstream', ds + len) ? ds + len : -1
      if (de < 0 || (len >= 0 && !/^\s*endstream/.test(s.slice(ds + len, ds + len + 12)))) {
        const e = s.indexOf('endstream', ds)
        if (e < 0) continue
        de = e
        while (de > ds && (s[de - 1] === '\n' || s[de - 1] === '\r')) de--
      }
      stream = bytes.subarray(ds, de)
      re.lastIndex = de
    }
    objects.set(num, { dict, stream })
    if (stream && isDict(dict) && isName(dict.Type) && dict.Type.name === 'ObjStm') streamObjs.push({ num, dict, raw: stream })
  }
  // Compressed object streams (PDF 1.5+).
  for (const os of streamObjs) {
    const d = os.dict as PdfDict
    const data = Buffer.from(decodeStream(d, os.raw, budget)).toString('latin1')
    const n = typeof d.N === 'number' ? d.N : 0
    const first = typeof d.First === 'number' ? d.First : 0
    const head = data.slice(0, first).trim().split(/\s+/).map(Number)
    for (let k = 0; k < n && 2 * k + 1 < head.length; k++) {
      const num = head[2 * k]
      if (objects.has(num)) continue
      const p = new Parser(data)
      p.i = first + head[2 * k + 1]
      try {
        const v = p.value()
        if (v !== undefined) objects.set(num, { dict: v, stream: null })
      } catch {
        /* skip one unreadable object */
      }
    }
  }
  return objects
}

// ───────────────────────────────────────────── fonts

interface FontMap {
  codeBytes: 1 | 2
  map: Map<number, string> | null
}

function parseCMap(text: string): { map: Map<number, string>; codeBytes: 1 | 2 } {
  const map = new Map<number, string>()
  const hexToStr = (h: string) => {
    let out = ''
    for (let k = 0; k + 4 <= h.length; k += 4) out += String.fromCharCode(parseInt(h.slice(k, k + 4), 16))
    if (h.length === 2) out = String.fromCharCode(parseInt(h, 16))
    return out
  }
  let codeBytes: 1 | 2 = 2
  const cs = /begincodespacerange([\s\S]*?)endcodespacerange/.exec(text)
  if (cs) {
    const first = /<([0-9a-fA-F]+)>/.exec(cs[1])
    if (first && first[1].length <= 2) codeBytes = 1
  }
  for (const block of Array.from(text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))) {
    for (const p of Array.from(block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g))) map.set(parseInt(p[1], 16), hexToStr(p[2]))
  }
  for (const block of Array.from(text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))) {
    for (const p of Array.from(block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]+)>|\[([^\]]*)\])/g))) {
      const lo = parseInt(p[1], 16)
      const hi = parseInt(p[2], 16)
      if (hi < lo || hi - lo > 0xffff) continue
      if (p[4] !== undefined) {
        const base = hexToStr(p[4])
        for (let c = lo; c <= hi; c++) map.set(c, base.slice(0, -1) + String.fromCharCode(base.charCodeAt(base.length - 1) + (c - lo)))
      } else {
        const items = Array.from((p[5] ?? '').matchAll(/<([0-9a-fA-F]+)>/g)).map((x) => hexToStr(x[1]))
        items.forEach((v, k) => map.set(lo + k, v))
      }
    }
  }
  return { map, codeBytes }
}

// ───────────────────────────────────────────── extraction

export function extractPdfTextLayer(bytes: Uint8Array): TextLayer {
  try {
    const head = Buffer.from(bytes.subarray(0, 1024)).toString('latin1')
    if (!head.startsWith('%PDF-')) return { status: 'unavailable', reason: 'not_pdf' }
    const all = Buffer.from(bytes).toString('latin1')
    if (/\/Encrypt[\s/<]/.test(all)) return { status: 'unavailable', reason: 'encrypted' }
    const objects = loadObjects(bytes)
    const budget = { inflated: 0 }
    const resolve = (v: PdfValue | undefined): PdfValue | undefined => {
      let x = v
      for (let k = 0; k < 8 && isRef(x); k++) x = objects.get(x.ref)?.dict
      return x
    }
    const pages = Array.from(objects.values()).filter((o) => isDict(o.dict) && isName(o.dict.Type) && o.dict.Type.name === 'Page')
    if (pages.length === 0) return { status: 'unavailable', reason: 'unsupported_structure' }
    if (pages.length > MAX_PAGES) return { status: 'unavailable', reason: 'too_large' }

    const fontCache = new Map<PdfValue, FontMap>()
    const fontFor = (fontVal: PdfValue | undefined): FontMap => {
      const key = isRef(fontVal) ? `ref:${fontVal.ref}` : fontVal
      if (key !== undefined && fontCache.has(key as PdfValue)) return fontCache.get(key as PdfValue)!
      const fd = resolve(fontVal)
      let fm: FontMap = { codeBytes: 1, map: null }
      if (isDict(fd)) {
        const type0 = isName(fd.Subtype) && fd.Subtype.name === 'Type0'
        fm = { codeBytes: type0 ? 2 : 1, map: null }
        const tu = fd.ToUnicode
        if (isRef(tu)) {
          const o = objects.get(tu.ref)
          if (o?.stream) {
            const cmap = parseCMap(Buffer.from(decodeStream(o.dict, o.stream, budget)).toString('latin1'))
            fm = { codeBytes: type0 ? 2 : cmap.codeBytes, map: cmap.map }
          }
        }
      }
      if (key !== undefined) fontCache.set(key as PdfValue, fm)
      return fm
    }

    let out = ''
    let mapped = 0
    let unmapped = 0
    const visitedForms = new Set<number>()

    /** Runs one content stream with its resources; Form XObjects (`Do`) recurse, bounded. */
    const run = (stream: string, resources: PdfValue | undefined, depth: number) => {
      const res = resolve(resources)
      const fonts = isDict(res) ? resolve(res.Font) : undefined
      const xobjects = isDict(res) ? resolve(res.XObject) : undefined
      const p = new Parser(stream)
      const operands: PdfValue[] = []
      let font: FontMap = { codeBytes: 1, map: null }
      const show = (sv: PdfValue) => {
        if (!isStr(sv)) return
        const b = sv.bytes
        for (let k = 0; k + font.codeBytes <= b.length; k += font.codeBytes) {
          const code = font.codeBytes === 2 ? (b[k] << 8) | b[k + 1] : b[k]
          const ch = font.map?.get(code)
          if (ch !== undefined) {
            out += ch
            mapped++
          } else if (font.codeBytes === 1 && !font.map && code >= 0x20 && code < 0x7f) {
            out += String.fromCharCode(code)
            mapped++
          } else unmapped++
        }
      }
      for (;;) {
        const v = p.value()
        if (v !== undefined) {
          operands.push(v)
          continue
        }
        const op = p.lastKeyword
        if (op === null) break
        switch (op) {
          case 'BI': {
            const e = stream.indexOf('EI', p.i)
            p.i = e < 0 ? stream.length : e + 2
            break
          }
          case 'Tf': {
            const n = operands[operands.length - 2]
            if (isName(n)) font = fontFor(isDict(fonts) ? fonts[n.name] : undefined)
            break
          }
          case 'Tj':
            show(operands[operands.length - 1])
            break
          case "'":
          case '"':
            out += '\n'
            show(operands[operands.length - 1])
            break
          case 'TJ': {
            const arr = operands[operands.length - 1]
            if (Array.isArray(arr)) for (const x of arr) typeof x === 'number' ? x < -200 && (out += ' ') : show(x)
            break
          }
          case 'Td':
          case 'TD': {
            const ty = operands[operands.length - 1]
            out += typeof ty === 'number' && ty !== 0 ? '\n' : ' '
            break
          }
          case 'T*':
          case 'Tm':
          case 'ET':
            out += '\n'
            break
          case 'Do': {
            const n = operands[operands.length - 1]
            const ref = isName(n) && isDict(xobjects) ? xobjects[n.name] : undefined
            if (depth < 4 && isRef(ref) && !visitedForms.has(ref.ref)) {
              const o = objects.get(ref.ref)
              if (o?.stream && isDict(o.dict) && isName(o.dict.Subtype) && o.dict.Subtype.name === 'Form') {
                visitedForms.add(ref.ref)
                run(Buffer.from(decodeStream(o.dict, o.stream, budget)).toString('latin1'), o.dict.Resources ?? resources, depth + 1)
                out += '\n'
              }
            }
            break
          }
        }
        operands.length = 0
      }
    }

    for (const page of pages) {
      const pd = page.dict as PdfDict
      let res: PdfValue | undefined = pd.Resources
      let parent = resolve(pd.Parent)
      for (let k = 0; k < 8 && !isDict(resolve(res)) && isDict(parent); k++) {
        res = parent.Resources
        parent = resolve(parent.Parent)
      }
      const contents = resolve(pd.Contents)
      const refs = Array.isArray(contents) ? contents : [pd.Contents]
      let stream = ''
      for (const r of refs) {
        if (!isRef(r)) continue
        const o = objects.get(r.ref)
        if (!o?.stream) continue
        stream += Buffer.from(decodeStream(o.dict, o.stream, budget)).toString('latin1') + '\n'
      }
      run(stream, res, 0)
    }
    if (unmapped > 0 && unmapped / (mapped + unmapped) > MAX_UNMAPPED_RATIO) return { status: 'unavailable', reason: 'unmapped_font' }
    if (mapped === 0) return { status: 'unavailable', reason: 'no_text' }
    const text = out.normalize('NFKC').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()
    if (text.replace(/\s/g, '').length < 3) return { status: 'unavailable', reason: 'no_text' }
    return { status: 'extracted', text, pages: pages.length }
  } catch (err) {
    return { status: 'unavailable', reason: err instanceof Fail ? err.reason : 'unsupported_structure' }
  }
}
