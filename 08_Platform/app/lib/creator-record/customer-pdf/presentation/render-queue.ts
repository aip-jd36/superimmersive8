/**
 * CR-DESIGN-2C — the serialisation of presentation renders (see `../InstitutionalTrustPDF` `primeGlyphCharacters`). Pure: no PDF
 * library, so it is unit-tested directly.
 *
 * Renders run one at a time, in arrival order. The next render starts when the previous one settles (resolves OR rejects), or after
 * `holdMs`, whichever is first. The hold bounds the wait: a render that never settles cannot block later renders in a reused process
 * (a server instance outlives one request). The late render's own result is unaffected; if it does finish after the hold, only its
 * own text layer could be affected, and only for characters that share a glyph with the next document's.
 */
export interface RenderQueue {
  run<T>(work: () => Promise<T>): Promise<T>
  /** Renders waiting or running (for observation and tests). */
  readonly depth: number
}

export function createRenderQueue(holdMs: number): RenderQueue {
  if (!(holdMs > 0)) throw new Error('render_queue_hold_invalid')
  let tail: Promise<void> = Promise.resolve()
  let depth = 0
  return {
    get depth() { return depth },
    run<T>(work: () => Promise<T>): Promise<T> {
      depth++
      const turn = tail
      let release!: () => void
      const released = new Promise<void>((r) => { release = r })
      tail = released
      const result = turn.then(() => {
        const timer = setTimeout(release, holdMs)
        // An unref'd timer never keeps a process alive on its own.
        ;(timer as { unref?: () => void }).unref?.()
        const settle = () => { clearTimeout(timer); release() }
        let p: Promise<T>
        try { p = Promise.resolve(work()) } catch (e) { p = Promise.reject(e) }
        p.then(settle, settle)
        return p
      })
      result.then(() => { depth-- }, () => { depth-- })
      return result
    },
  }
}

/**
 * The process's presentation render queue. 30 s: far above a normal render (0.13–0.37 s warm, 0.42 s cold, measured locally in
 * CR-DESIGN-2C) and below the
 * issuing routes' 60 s limit, so a stuck render delays the next one by at most 30 s and never blocks it for good.
 */
export const PRESENTATION_RENDER_HOLD_MS = 30_000
export const presentationRenderQueue: RenderQueue = createRenderQueue(PRESENTATION_RENDER_HOLD_MS)
