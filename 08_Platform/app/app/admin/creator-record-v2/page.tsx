/**
 * /admin/creator-record-v2 — CR-V2-VERTICAL-SLICE-1 internal prototype
 * (+ CR-V2-EVIDENCE-SLICE-1 governed selection and document examination).
 *
 * Admin-only: `app/admin/layout.tsx` runs `requireAdmin()` for every admin
 * page, and both API routes re-check admin access on every request.
 * Uses INTERNAL, UNAPPROVED pilot questions and publication entries; nothing
 * is saved, charged or emailed. Uploaded documents are examined and discarded;
 * no AI model is called unless the disabled-by-default live-extraction gate is
 * turned on in the server environment.
 *
 * Server-computed props: the partial plan suggestions (governed plan values,
 * so the browser never loads the claim fixtures) and the examination mode, so
 * the page states accurately how a document will be read.
 */

import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { extractionMode } from '@/lib/creator-record/evidence/config'
import { planSuggestionsByTool } from '@/lib/creator-record/integration/plan-suggestions'
import { CreatorRecordPrototypeClient } from './CreatorRecordPrototypeClient'

export const dynamic = 'force-dynamic'

export default function CreatorRecordV2PrototypePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <CreatorRecordPrototypeClient planSuggestions={planSuggestionsByTool(TOPIC_CLAIMS_FIXTURE)} examinationMode={extractionMode()} />
    </main>
  )
}
