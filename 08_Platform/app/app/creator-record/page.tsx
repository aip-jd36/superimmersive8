/**
 * /creator-record — CR-V2-MVP-M2 Creator Record v2 for invited, signed-in creators.
 *
 * Shows the questionnaire only when every server-side condition holds: signed in,
 * new submissions open, the creator is invited, and the approved sources pass
 * `checkApprovedSources`. Otherwise it explains that Creator Record is not
 * available. No pilot or unapproved source is ever read here; uploads and
 * document examination are not offered.
 * CR-V2-MVP-M3: payment is offered after review only while v2 issuance is enabled
 * (default: stopped); the purchase and checkout routes re-check every condition.
 * CR-V2-EXAM-INTEGRATION-X3: documents and examination are offered only when the approved inputs also approve the
 * examination-bearing record (schema 8). Otherwise the page has no examination.
 * CR-V2-DECL-1B-2: the contract's digest goes to the client in this same render as the questions it identifies.
 * This page never serves synthetic content. Administrator testing has its own page: /admin/creator-record-v2/uat.
 */
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { checkApprovedSources } from '@/lib/creator-record/customer-record/sources'
import { CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { aiExaminationPermissionVersion, evidenceConsentVersion } from '@/lib/creator-record-flow/authorization-versions'
import { legalPoliciesApproved } from '@/lib/legal/policies'
import { customerLiveOffered } from '@/lib/creator-record-flow/live-offer'
import { productionFlowDeps } from '@/lib/creator-record-flow/production'
import { sessionUserId } from '@/lib/creator-record-flow/http'
import { PAGE_TEXT } from '@/lib/creator-record-flow/wording'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { CreatorRecordV2Client } from './CreatorRecordV2Client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: PAGE_TEXT.title,
  robots: { index: false, follow: false, nocache: true },
}

function Unavailable({ message }: { message: string }) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold mb-3" style={{ color: '#1a1918' }}>Creator Record</h1>
      <p className="text-sm" style={{ color: '#6b6560' }} role="status">{message}</p>
    </main>
  )
}

export default async function CreatorRecordPage() {
  const userId = await sessionUserId()
  if (!userId) redirect('/auth/login')

  const deps = productionFlowDeps()
  if (deps.submissions !== 'open') return <Unavailable message="Creator Record is not taking new submissions right now." />
  if (!(await deps.hasPilotAccess(userId))) return <Unavailable message="Creator Record is currently available by invitation only." />

  const inputs = deps.inputs()
  const today = deps.now().toISOString().slice(0, 10)
  const check = checkApprovedSources(inputs.sources, inputs.source_text, TOPIC_CLAIMS_FIXTURE, today, { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION })
  if (!check.ok || !inputs.source_text) return <Unavailable message="Creator Record is not available yet." />
  // CR-V2-EXAM-INTEGRATION-X3: offered only with an approval for the examination-bearing record.
  // CR-V2-SCHEMA8-PATH-1 (E7): the identifiers the creator agrees to now (wording + approved policy versions).
  const aiPermissionVersion = customerLiveOffered() ? aiExaminationPermissionVersion() : null
  const examinationOffered = checkApprovedSources(inputs.sources, inputs.source_text_examination ?? inputs.source_text, TOPIC_CLAIMS_FIXTURE, today, { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION }).ok

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <CreatorRecordV2Client
        registryInput={inputs.sources.registry_input}
        presentation={inputs.sources.presentation}
        acknowledgements={inputs.source_text.acknowledgements}
        maxTools={inputs.sources.max_tools}
        questionnaireContractSha256={check.approved.questionnaire_contract.contract_sha256}
        // E4: payment is offered only with issuance enabled AND both legal policies published (the server decides either way).
        paymentOpen={CREATOR_RECORD_V2_ISSUANCE === 'enabled' && legalPoliciesApproved()}
        {...(examinationOffered
          ? { examination: { consentVersion: evidenceConsentVersion(), ...(aiPermissionVersion ? { aiPermissionVersion } : {}) } }
          : {})}
      />
    </main>
  )
}
