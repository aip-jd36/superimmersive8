/**
 * CR-V2-DOC-2B — the generic examination PROFILE interface.
 *
 * A profile is the only type-specific part of an examination: its engine (schema, prompt, validator, retry
 * rule) and the mapping of a valid reading to generic observations. The core (`./examine-document.ts`)
 * selects a profile by its exact identity and knows nothing else about it. There is no document-type
 * orchestration: one interface, registered profiles, and nothing chosen from a document's content.
 *
 * Replay only: `readRecorded` receives SI8's recorded output for a synthetic document in place of a model
 * response and runs it through the profile's own unchanged engine. The interface has no way to reach a
 * model.
 */

import type { EvidenceMediaType } from '../evidence-intake/vocabulary'
import type { ExaminationFailureReason, ExaminationLimitation, ExaminationObservation, ProfileRef } from './envelope'

/** An observation as the profile produces it; the core adds identity, source, verification and origin. */
export type ProfileObservation = Pick<ExaminationObservation, 'field' | 'qualifier' | 'basis' | 'status' | 'value' | 'excerpt'>

export type ProfileReading =
  | { status: 'examined'; observations: ProfileObservation[]; limitations: ExaminationLimitation[]; engine_attempts: number }
  | { status: 'could_not_examine'; reason: ExaminationFailureReason; engine_attempts: number }

export interface ExaminationProfile {
  readonly ref: ProfileRef
  readonly media_types: readonly EvidenceMediaType[]
  /** Runs `recordedOutput` through the profile's own engine as if it were the model's response. Never calls a model. */
  readRecorded(bytes: Uint8Array, recordedOutput: unknown): Promise<ProfileReading>
}

export type ProfileRegistry = ReadonlyMap<string, ExaminationProfile>

export const profileKey = (p: { id: string; version: number }) => `${p.id}@${p.version}`

export function buildProfileRegistry(profiles: readonly ExaminationProfile[]): ProfileRegistry {
  const m = new Map<string, ExaminationProfile>()
  for (const p of profiles) {
    const k = profileKey(p.ref)
    if (m.has(k)) throw new Error(`duplicate examination profile ${k}`)
    m.set(k, p)
  }
  return m
}
