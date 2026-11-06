/**
 * Test fixture only: minimal synthetic PDFs with a real page tree, for the live-examination page bound (CR-V2-DOC-LIVE-1C-A). Plain, and
 * with the page objects in a compressed object stream. Each takes a salt so documents with the same structure have different digests.
 */
import { deflateSync } from 'node:zlib'

const PAGE = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>'

/** A catalog, one /Pages node and `pages` page objects, uncompressed, with a trailer naming the catalog. */
export function syntheticPdf(pages: number, salt = 'synthetic-test', opts: { count?: number; extra?: string } = {}): Uint8Array {
  const kids = Array.from({ length: pages }, (_, i) => `${i + 3} 0 R`).join(' ')
  const objs = Array.from({ length: pages }, (_, i) => `${i + 3} 0 obj\n${PAGE}\nendobj\n`).join('')
  return new Uint8Array(Buffer.from(`%PDF-1.4\n%${salt}\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${opts.count ?? pages} >>\nendobj\n${objs}${opts.extra ?? ''}trailer\n<< /Root 1 0 R >>\n%%EOF\n`, 'latin1'))
}

/**
 * The same, with the page objects packed in one compressed object stream. `declared` is the /N and header the stream claims, and the tree
 * links that many; `held` is how many page dictionaries the stream actually holds. With `tree: false` there is no catalog or trailer.
 */
export function syntheticObjStmPdf(declared: number, held = declared, opts: { tree?: boolean; salt?: string } = {}): Uint8Array {
  const one = `${PAGE} `
  const head = Array.from({ length: declared }, (_, i) => `${i + 10} ${i * one.length} `).join('')
  const packed = deflateSync(Buffer.from(head + one.repeat(held), 'latin1'))
  const kids = Array.from({ length: declared }, (_, i) => `${i + 10} 0 R`).join(' ')
  const tree = opts.tree === false ? '' : `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${declared} >>\nendobj\n`
  const trailer = opts.tree === false ? '' : 'trailer\n<< /Root 1 0 R >>\n'
  return new Uint8Array(Buffer.concat([
    Buffer.from(`%PDF-1.5\n%${opts.salt ?? 'synthetic-test'}\n${tree}9 0 obj\n<< /Type /ObjStm /N ${declared} /First ${head.length} /Filter /FlateDecode /Length ${packed.length} >>\nstream\n`, 'latin1'),
    packed,
    Buffer.from(`\nendstream\nendobj\n${trailer}%%EOF\n`, 'latin1'),
  ]))
}

/**
 * CR-V2-DOC-LIVE-1C-A-FIX: a PDF with a correct cross-reference table. Objects are written in order, duplicates included, and the table
 * points each number at its FIRST definition, as a real reader would follow it. `raw` text is written verbatim; with `defines`, the table
 * points that number at the first `<n> 0 obj` inside it (a definition hidden inside a stream, or an object stream itself).
 */
export function xrefPdf(objects: ({ num: number; body: string } | { raw: string; defines?: number })[]): Uint8Array {
  let out = '%PDF-1.4\n'
  const first = new Map<number, number>()
  for (const o of objects) {
    if ('raw' in o) {
      if (o.defines !== undefined && !first.has(o.defines)) first.set(o.defines, Buffer.byteLength(out, 'latin1') + Buffer.byteLength(o.raw.slice(0, o.raw.indexOf(`${o.defines} 0 obj`)), 'latin1'))
      out += o.raw
      continue
    }
    if (!first.has(o.num)) first.set(o.num, Buffer.byteLength(out, 'latin1'))
    out += `${o.num} 0 obj\n${o.body}\nendobj\n`
  }
  const size = Math.max(...Array.from(first.keys())) + 1
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 ${size}\n0000000000 65535 f \n`
  for (let n = 1; n < size; n++) out += first.has(n) ? `${String(first.get(n)).padStart(10, '0')} 00000 n \n` : '0000000000 65535 f \n'
  out += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new Uint8Array(Buffer.from(out, 'latin1'))
}
