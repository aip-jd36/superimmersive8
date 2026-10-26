/**
 * /admin/creator-record-v2 — CR-V2-VERTICAL-SLICE-1 internal prototype.
 *
 * Admin-only: `app/admin/layout.tsx` runs `requireAdmin()` for every admin
 * page, and the draft API route re-checks admin access on every request.
 * Uses INTERNAL, UNAPPROVED pilot questions and publication entries; nothing
 * is saved, uploaded, charged, emailed or sent to an AI model.
 */

import { CreatorRecordPrototypeClient } from './CreatorRecordPrototypeClient'

export const dynamic = 'force-dynamic'

export default function CreatorRecordV2PrototypePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <CreatorRecordPrototypeClient />
    </main>
  )
}
