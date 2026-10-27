/**
 * CR-V2-WORK-UAT-HARNESS-2 — the fixed allowlist of SI8 synthetic test
 * documents the public harness offers, and the server-side construction of
 * their document observations.
 *
 * Nothing is uploaded. The browser may send only a fixture id from this
 * allowlist; the server builds the observation itself from the committed
 * replay table (`../evidence/replay`), validated by the same extraction-schema
 * validator the examination path uses. A browser-supplied observation is never
 * accepted. Labels are neutral descriptions of the test document; they never
 * state what guidance or conclusion follows.
 */

import { documentIdFor, sanitizeFileName, type ExaminedDocument } from '../evidence/document-observations'
import { notRun } from '../evidence/plan-cross-check'
import { DEFAULT_REPLAY_TABLE, REPLAY_SET_VERSION, type ReplayFixture, type ReplayTable } from '../evidence/replay'
import type { ReceiptMediaType } from '../receipt-examination/prompt'
import { RECEIPT_EXTRACTION_SCHEMA_VERSION, validateReceiptExtraction } from '../receipt-examination/schema'

export interface PublicUatFixture {
  fixture_id: string
  label: string
}

export const PUBLIC_UAT_FIXTURES: readonly PublicUatFixture[] = [
  { fixture_id: 'pdf-pika-pro-no-period', label: 'Synthetic test document A — Pika receipt (PDF)' },
  { fixture_id: 'shot-truncated-plan-name', label: 'Synthetic test document B — Pika billing screenshot, plan name cut off (image)' },
  { fixture_id: 'conflict-reseller-merchant', label: 'Synthetic test document C — Pika receipt issued by a reseller (PDF)' },
  { fixture_id: 'shot-pika-multiple-payments', label: 'Synthetic test document D — Pika billing history with several payments (image)' },
  { fixture_id: 'pdf-kling-pro-monthly', label: 'Synthetic test document E — Kling receipt (PDF)' },
  { fixture_id: 'conflict-two-plan-names', label: 'Synthetic test document F — Runway receipt naming two plans (PDF)' },
  { fixture_id: 'inject-pricing-page-claims-invoice', label: 'Synthetic test document G — pricing page with embedded instructions (image)' },
  { fixture_id: 'nonreceipt-abstract-photo', label: 'Synthetic test document H — a photo that is not a receipt (image)' },
  { fixture_id: 'unreadable-dark-image', label: 'Synthetic test document I — a very dark, unreadable image (image)' },
]

const MEDIA: readonly ReceiptMediaType[] = ['application/pdf', 'image/png', 'image/jpeg']

export function isAllowlistedFixture(id: unknown): id is string {
  return typeof id === 'string' && PUBLIC_UAT_FIXTURES.some((f) => f.fixture_id === id)
}

function entryById(table: ReplayTable, fixtureId: string): ReplayFixture | null {
  for (const e of Array.from(table.values())) if (e.fixture_id === fixtureId) return e
  return null
}

/**
 * The document observation for an allowlisted fixture, built only from the
 * server's replay table. Throws for anything not allowlisted or not in the
 * table (a configuration error, never a request outcome).
 */
export function documentForFixture(fixtureId: string, table: ReplayTable = DEFAULT_REPLAY_TABLE): ExaminedDocument {
  const fixture = PUBLIC_UAT_FIXTURES.find((f) => f.fixture_id === fixtureId)
  if (!fixture) throw new Error(`not an allowlisted public UAT fixture: ${fixtureId}`)
  const entry = entryById(table, fixtureId)
  if (!entry) throw new Error(`public UAT fixture missing from the replay table: ${fixtureId}`)
  const media = MEDIA.includes(entry.media_type as ReceiptMediaType) ? (entry.media_type as ReceiptMediaType) : null
  const extraction = validateReceiptExtraction(entry.parsed_output)
  const base = {
    document_id: documentIdFor(entry.sha256),
    file_name: sanitizeFileName(fixture.label),
    sha256: entry.sha256,
    bytes: entry.bytes ?? 0,
    detected_media_type: media,
    extraction_mode: 'fixture_replay' as const,
    replay_fixture_id: entry.fixture_id,
    versions: { schema: RECEIPT_EXTRACTION_SCHEMA_VERSION, prompt: null, replay_set: REPLAY_SET_VERSION },
    model_calls: 0,
    // No bytes are handled here, so the text-layer cross-check is honestly reported as not run.
    cross_check: notRun('selected_synthetic_fixture'),
  }
  return extraction
    ? { ...base, outcome: 'document_examined', reason: null, extraction }
    : { ...base, outcome: 'could_not_examine', reason: 'schema_invalid', extraction: null }
}

/** The allowlist with each fixture's observation, for the page to display before the creator chooses. */
export function publicUatFixtureDocuments(): { fixture_id: string; label: string; document: ExaminedDocument }[] {
  return PUBLIC_UAT_FIXTURES.map((f) => ({ ...f, document: documentForFixture(f.fixture_id) }))
}
