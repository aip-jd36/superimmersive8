/**
 * /admin/creator-record-v2/uat — the real persisted Creator Record v2 journey for an existing administrator, on synthetic
 * inputs and committed fixtures only. The admin layout and this page both check `users.is_admin`.
 * Payment is never offered, and no purchase route exists for this page.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CreatorRecordV2Client } from '@/app/creator-record/CreatorRecordV2Client'
import { getPrepared, type PreparedView } from '@/lib/creator-record/customer-flow/service'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { checkApprovedSources } from '@/lib/creator-record/customer-record/sources'
import { CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { EVIDENCE_CONSENT_DRAFT_VERSION } from '@/lib/creator-record/evidence-intake/contract'
import { ADMIN_UAT_API_BASE, adminUatFlowDeps, adminUatVersions } from '@/lib/creator-record-flow/admin-uat'
import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Creator Record UAT', robots: { index: false, follow: false, nocache: true } }

export default async function AdminCreatorRecordUatPage({ searchParams }: { searchParams: { version?: string | string[] } }) {
  const access = await checkReviewerContextAccess()
  if (!access.ok) redirect(access.status === 401 ? '/auth/login' : '/dashboard')

  const deps = adminUatFlowDeps(access.userId)
  const inputs = syntheticUatInputs()
  const today = deps.now().toISOString().slice(0, 10)
  const available = inputs.source_text !== null
    && checkApprovedSources(inputs.sources, inputs.source_text, TOPIC_CLAIMS_FIXTURE, today, { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION }).ok
    && checkApprovedSources(inputs.sources, inputs.source_text_examination ?? inputs.source_text, TOPIC_CLAIMS_FIXTURE, today, { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION }).ok
  if (!available) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-2xl font-bold mb-3" style={{ color: '#1a1918' }}>Creator Record UAT</h1>
        <p className="text-sm" role="status" style={{ color: '#6b6560' }}>The synthetic test inputs are not available. Their test approvals may have passed their refresh date.</p>
      </div>
    )
  }

  const requested = typeof searchParams.version === 'string' ? searchParams.version : null
  let initialView: PreparedView | null = null
  let openError = false
  if (requested) {
    const r = await getPrepared(deps, access.userId, requested)
    if (r.ok) initialView = r.view
    else openError = true
  }
  const versions = await adminUatVersions(access.userId)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <section className="mb-6 rounded-lg border bg-white p-4 text-sm" style={{ borderColor: '#e5e2dc' }} aria-labelledby="uat-versions" data-uat-versions>
        <h2 id="uat-versions" className="font-semibold mb-2" style={{ color: '#1a1918' }}>Your synthetic versions</h2>
        <p className="mb-2"><Link className="underline" href="/admin/creator-record-v2/uat" data-uat-new-draft>Start a new draft</Link></p>
        {openError && <p className="mb-2 font-medium" role="alert" style={{ color: '#b42318' }}>That version could not be opened.</p>}
        {versions.length === 0
          ? <p style={{ color: '#6b6560' }}>No versions yet.</p>
          : (
            <ul className="space-y-1">
              {versions.map((v) => (
                <li key={v.id} data-uat-version={v.id}>
                  <Link className="underline" href={`/admin/creator-record-v2/uat?version=${v.id}`}>Version {v.version}</Link>
                  <span style={{ color: '#6b6560' }}> · {v.status === 'reviewed' ? 'confirmed' : 'not confirmed'} · schema {v.schema_version} · {v.created_at.slice(0, 16).replace('T', ' ')} UTC · draft {v.draft_id.slice(0, 8)}</span>
                </li>
              ))}
            </ul>
          )}
      </section>
      <CreatorRecordV2Client
        key={initialView?.id ?? 'new'}
        registryInput={inputs.sources.registry_input}
        presentation={inputs.sources.presentation}
        acknowledgements={inputs.source_text!.acknowledgements}
        maxTools={inputs.sources.max_tools}
        paymentOpen={false}
        syntheticUat
        apiBase={ADMIN_UAT_API_BASE}
        initialView={initialView}
        examination={{ consentVersion: EVIDENCE_CONSENT_DRAFT_VERSION }}
      />
    </div>
  )
}
