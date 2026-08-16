/**
 * Typed topic-claims fixture (CRC Living Knowledge Phase 1, 2026-08-16).
 * Same discipline as matrix-fixture.ts: NOT a live parser of
 * GOVERNED-CLAIMS.md -- no markdown-parsing precedent exists anywhere in
 * this repository, so a live parser would be new, unjustified
 * infrastructure. Hand-synced mirror; a small CI consistency check
 * (__tests__/retrieval-engine/topic-claims-fixture-consistency.test.ts)
 * catches claim-ID drift between this file and the real markdown.
 *
 * Phase A (structural skeleton): zero claims. Deliberately empty --
 * proves Topic Retrieval is wired end-to-end with no behavior change to
 * existing CRC output before any real governed knowledge exists. Wave 1
 * copyright claims are added here only after passing through the full
 * human governance workflow (Candidate -> Under Review -> Adopted ->
 * separately-approved CRC eligibility) -- see GOVERNED-CLAIMS.md.
 */

import type { TopicClaim } from './types'

export const TOPIC_CLAIMS_FIXTURE: TopicClaim[] = []
