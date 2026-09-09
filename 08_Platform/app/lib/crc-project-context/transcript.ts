/**
 * CRC transcript shaping — neutral primitive (CAH-4C, extracted verbatim from
 * `lib/crc-sales/repository.ts`'s `getEligibleSessionTranscript` shaping loop).
 *
 * Turns a raw persisted `crc_sessions.transcript` value into the minimum
 * verbatim reviewer/Sales representation: user/assistant entries only, in
 * sequence, no rewriting, no correction/contradiction resolution, no
 * classification of any entry as evidence / attestation / verified / finding /
 * conclusion / risk / control satisfaction.
 *
 * Pure. No DB, no LLM, no interpretation. Consumed by BOTH `lib/crc-sales`
 * (behind its Sales-eligibility gate) and `lib/reviewer-context` (behind its
 * active-association gate) — neither imports the other. The Sales
 * `SalesTranscriptEntry` type is a structural alias of `CrcTranscriptEntry`.
 */

export interface CrcTranscriptEntry {
  role: 'user' | 'assistant'
  text: string
  timestamp: string | null
}

/**
 * Verbatim, sequence-preserving. Anything that is not a user/assistant entry
 * (internal/system metadata, malformed rows) is dropped. A missing/non-string
 * `text` becomes `''`; a missing/non-string `timestamp` becomes `null`. Never
 * throws — a non-array input yields `[]`.
 */
export function shapeCrcTranscript(rawTranscript: unknown): CrcTranscriptEntry[] {
  const raw = Array.isArray(rawTranscript) ? (rawTranscript as Array<Record<string, unknown>>) : []
  const entries: CrcTranscriptEntry[] = []
  for (const e of raw) {
    const role = e.role
    if (role !== 'user' && role !== 'assistant') continue
    const text = typeof e.text === 'string' ? e.text : ''
    const timestamp = typeof e.timestamp === 'string' ? e.timestamp : null
    entries.push({ role, text, timestamp })
  }
  return entries
}
