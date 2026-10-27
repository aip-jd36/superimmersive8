/**
 * /uat/creator-record-v2 — CR-V2-WORK-UAT-HARNESS-2 public UAT harness.
 *
 * PUBLIC, TEMPORARY, SYNTHETIC-ONLY. Outside `/admin` (no admin layout) and
 * outside the auth middleware matcher. Closed (404) unless the fail-closed
 * window in `lib/creator-record/public-uat/config.ts` is open; evaluated per
 * request (`force-dynamic`), never frozen at build time. `noindex`.
 *
 * Server-computed props only: the governed plan suggestions and the
 * allowlisted synthetic fixtures with their server-built observations. No
 * auth, session, database, storage, email, payment, upload, examination or
 * AI-model capability is imported (test-enforced).
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { planSuggestionsByTool } from '@/lib/creator-record/integration/plan-suggestions'
import { publicUatStatus } from '@/lib/creator-record/public-uat/config'
import { publicUatFixtureDocuments } from '@/lib/creator-record/public-uat/fixtures'
import { PublicUatClient } from './PublicUatClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Creator Record — public UAT harness (synthetic test data)',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function PublicUatPage() {
  const status = publicUatStatus()
  if (!status.open) notFound()
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <PublicUatClient planSuggestions={planSuggestionsByTool(TOPIC_CLAIMS_FIXTURE)} fixtureDocuments={publicUatFixtureDocuments()} closesAt={status.closes_at} />
    </main>
  )
}
