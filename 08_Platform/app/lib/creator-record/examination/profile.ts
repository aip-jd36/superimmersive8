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

/**
 * VERSIONING CONTRACT (CR-V2-DOC-2B-IDENTITY-1).
 *
 * The RULE: `ref.version` is the profile's adapter AND mapping version, and it is part of every examination
 * key. It MUST be raised, as an explicit reviewed change, whenever the profile's reading of the same bytes and
 * recorded output can differ in any case: engine behaviour (input checks, retry, validation), the mapping to
 * observations, or the limitations. The rule applies whether or not any test notices the change.
 *
 * The SAFETY NET (corpus-limited regression protection, NOT a code fingerprint): each profile pins, per
 * version, the SHA-256 of `profileOutputCanonical` over a fixed corpus (the committed replay set plus fixed
 * failure cases). A pin mismatch proves the readings changed for that corpus. A pin MATCH proves nothing about
 * inputs outside the corpus: a behaviour change that only affects other inputs passes the pin and is caught
 * only by the rule above. A version bump adds a new pin and never edits an old one (append-only).
 */
export interface ProfileFingerprintCase {
  id: string
  bytes: Uint8Array
  recorded_output: unknown
}

/** Canonical JSON of the profile identity and its readings over `cases`, in the given order. Hashed by the caller. */
export async function profileOutputCanonical(profile: ExaminationProfile, cases: readonly ProfileFingerprintCase[]): Promise<{ ref: ProfileRef; media_types: readonly EvidenceMediaType[]; readings: { id: string; reading: ProfileReading }[] }> {
  const readings: { id: string; reading: ProfileReading }[] = []
  for (const c of cases) readings.push({ id: c.id, reading: await profile.readRecorded(c.bytes, c.recorded_output) })
  return { ref: { ...profile.ref }, media_types: [...profile.media_types], readings }
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
