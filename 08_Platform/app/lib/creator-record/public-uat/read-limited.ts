/**
 * CR-V2-WORK-UAT-HARNESS-2 — reads a request body up to `limit` bytes and
 * stops as soon as it is exceeded (no unbounded buffering). Web APIs only.
 */

export type LimitedRead = { ok: true; text: string } | { ok: false; status: 400 | 413 }

export async function readLimitedText(body: ReadableStream<Uint8Array> | null, limit: number): Promise<LimitedRead> {
  if (!body) return { ok: false, status: 400 }
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => undefined)
      return { ok: false, status: 413 }
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(out) }
  } catch {
    return { ok: false, status: 400 }
  }
}
