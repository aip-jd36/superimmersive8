/**
 * Client-side elapsed-wait indicator for a pending CRC turn (CRC Wait-State
 * UX). Pure, no React -- kept separate from app/crc/page.tsx so the timer
 * mechanism and copy are directly unit-testable, same discipline as
 * rate-limit-copy.ts / results-gate-copy.ts.
 *
 * This is NOT model reasoning telemetry. The elapsed number means only:
 * client-side time since the CRC turn's pending state began. It never
 * represents pipeline stage, retrieval/BI/composition progress, percentage
 * complete, or model thinking duration -- there is no backend timing
 * instrumentation behind it at all.
 */

/**
 * At or above this many elapsed seconds, the label shifts from "Thinking…"
 * to the more restrained "Still working…" -- matches the product
 * direction's own example ("Still working… 10s").
 */
export const STILL_WORKING_THRESHOLD_SECONDS = 10

/**
 * elapsedSeconds === 0 -> plain "Thinking…", shown immediately, before any
 * tick has occurred. >= 1 -> the whole-second count is appended. >=
 * STILL_WORKING_THRESHOLD_SECONDS -> "Still working…" replaces "Thinking…",
 * same number format. No fractional seconds, no percentage, no stage name.
 */
export function formatWaitIndicator(elapsedSeconds: number): string {
  if (elapsedSeconds <= 0) return 'Thinking…'
  const verb = elapsedSeconds >= STILL_WORKING_THRESHOLD_SECONDS ? 'Still working…' : 'Thinking…'
  return `${verb} ${elapsedSeconds}s`
}

/**
 * Starts a fresh, self-contained whole-second ticker. Each call creates an
 * independent counter starting at 0 -- there is no shared/reused state
 * across separate turns, so a later turn's ticker can never inherit a
 * prior turn's elapsed count. `onTick` fires with the new elapsed-seconds
 * value once per whole second (1000ms resolution, deliberately coarse --
 * no sub-second/high-frequency updates). Call the returned `stop()` the
 * moment the pending state ends, for any reason (success, failure, or
 * otherwise), to clear the interval immediately -- it is never left
 * running past the pending window.
 */
export function startElapsedSecondsTicker(onTick: (elapsedSeconds: number) => void): { stop: () => void } {
  let elapsedSeconds = 0
  const intervalId = setInterval(() => {
    elapsedSeconds += 1
    onTick(elapsedSeconds)
  }, 1000)
  return {
    stop: () => clearInterval(intervalId),
  }
}
