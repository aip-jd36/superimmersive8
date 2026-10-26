/**
 * CR-V2-VERTICAL-SLICE-1 — the AUTHORITATIVE Creator Record governance sources.
 *
 * These are the only sources a customer-facing Creator Record may ever read.
 * Today every one of them is empty, because no Creator Record question,
 * Observation Map entry, dependency label or publication ledger entry has been
 * approved (PRD v0.3 §4.3: "zero entries exist today"). An empty source fails
 * closed: no question is shown and no governed claim is published.
 *
 * The internal prototype's pilot data lives in `../pilot/` and is NEVER merged
 * into these sources. `__tests__/creator-record/vertical-slice-boundaries.test.ts`
 * asserts that nothing here carries a pilot marker and that this file does not
 * import the pilot module.
 */

import type { PublicationLedgerEntry } from '../contract/publication-ledger'
import type { RegistryInput } from '../contract/question-registry'

/** Approved Question Registry and Observation Map entries. None approved yet. */
export const CREATOR_RECORD_REGISTRY_INPUT: RegistryInput = Object.freeze({ questions: [], observation_map: [] }) as RegistryInput

/** Approved Creator Record publication ledger. None approved yet. */
export const CREATOR_RECORD_PUBLICATION_LEDGER: readonly PublicationLedgerEntry[] = Object.freeze([])

/** Approved Creator Record dependency display labels. None approved yet. */
export const CREATOR_RECORD_DEPENDENCY_LABELS: Readonly<Record<string, string>> = Object.freeze({})
