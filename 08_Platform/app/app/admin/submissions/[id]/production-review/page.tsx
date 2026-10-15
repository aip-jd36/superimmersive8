import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadProductionReviewPreview } from './load-production-review'
import type { PreviewCondition } from '@/lib/production-review/project-production-review'

// INTERNAL PRODUCT A PREVIEW (CAA-PRODUCT-A-2). Admin-only, read-only, never
// linked from customer-facing pages. Authorization happens in the loader,
// before any data access.
export const dynamic = 'force-dynamic'

type PageProps = { params: { id: string } }

function ConditionCard({ c }: { c: PreviewCondition }) {
  return (
    <div className="border rounded-lg p-4 space-y-2 bg-white" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-mono text-xs text-gray-600">
          {c.claim_id} · version {c.claim_version ?? '—'} · last verified {c.last_verified ?? '—'}
        </div>
        <div className="text-xs text-gray-500">{c.topic_label}{c.tools.length > 0 ? ` · ${c.tools.join(', ')}` : ''}</div>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-gray-500">Applicability</dt>
        <dd className="font-medium text-gray-900">{c.applicability_label}</dd>
        <dt className="text-gray-500">Fact basis</dt>
        <dd className="text-gray-800">{c.fact_basis_label}</dd>
        <dt className="text-gray-500">Governed statement</dt>
        <dd className="text-gray-800">{c.governed_statement ?? '— (no governed statement recorded)'}</dd>
        {c.unresolved.length > 0 && (
          <>
            <dt className="text-gray-500">Unresolved</dt>
            <dd className="text-gray-800"><ul className="list-disc ml-4">{c.unresolved.map((u) => <li key={u}>{u}</li>)}</ul></dd>
          </>
        )}
        {c.open_dependencies.length > 0 && (
          <>
            <dt className="text-gray-500">Open dependencies</dt>
            <dd className="text-gray-800 font-mono text-xs"><ul className="list-disc ml-4">{c.open_dependencies.map((d) => <li key={d}>{d}</li>)}</ul></dd>
          </>
        )}
        <dt className="text-gray-500">What can be said</dt>
        <dd className="text-gray-900">{c.permitted_conclusion}</dd>
      </dl>
    </div>
  )
}

export default async function ProductionReviewPreviewPage({ params }: PageProps) {
  const data = await loadProductionReviewPreview(params.id)
  if (!data) notFound()
  const { submission, preview } = data

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-bold tracking-wide text-red-800">
        {preview.banner}
      </div>

      <div>
        <Link href={`/admin/submissions/${submission.id}`} className="text-sm text-gray-500 hover:underline">← Back to submission</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Production Rights &amp; Provenance Review — preview</h1>
        <p className="text-sm text-gray-500 mt-1">
          {submission.title ?? 'Untitled'} · <span className="font-mono">{submission.id}</span>
        </p>
      </div>

      <section className="rounded-lg bg-gray-50 border p-4 text-sm text-gray-700 space-y-1" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        {preview.disclaimer.map((d) => <p key={d}>{d}</p>)}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Declared AI tools</h2>
        {preview.tools.length === 0 ? (
          <p className="text-sm text-gray-500">No tools declared.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Declared name</th>
                  <th className="py-2 pr-3">Identity</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Account status</th>
                  <th className="py-2 pr-3">Window</th>
                  <th className="py-2">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {preview.tools.map((t) => (
                  <tr key={t.position} className="border-b align-top">
                    <td className="py-2 pr-3">{t.position}{t.primary ? ' (primary)' : ''}</td>
                    <td className="py-2 pr-3">{t.declared_name}</td>
                    <td className="py-2 pr-3">{t.identity}</td>
                    <td className="py-2 pr-3">{t.plan}</td>
                    <td className="py-2 pr-3">{t.account_status}</td>
                    <td className="py-2 pr-3">{t.window}</td>
                    <td className="py-2">{t.receipt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-500">
          Declared distribution territory: {preview.declared_distribution_territory ?? 'not declared'} (context only — not an assessment jurisdiction)
        </p>
      </section>

      {preview.topic_ceilings.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Topics reviewed</h2>
          <ul className="text-sm text-gray-700 list-disc ml-5">
            {preview.topic_ceilings.map((t) => <li key={t.topic_label}><span className="font-medium">{t.topic_label}:</span> {t.ceiling}</li>)}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Governed conditions</h2>
        {preview.conditions.length === 0 ? (
          <p className="text-sm text-gray-500">No governed condition matched the declared production.</p>
        ) : (
          preview.conditions.map((c) => <ConditionCard key={c.claim_id} c={c} />)
        )}
      </section>

      {preview.not_applying.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Not treated as applying on the declared facts</h2>
          {preview.not_applying.map((c) => <ConditionCard key={c.claim_id} c={c} />)}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Missing information and evidence</h2>
        <ul className="text-sm text-gray-700 list-disc ml-5">{preview.missing_information.map((m) => <li key={m}>{m}</li>)}</ul>
      </section>

      {preview.coverage_limitations.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Coverage limitations</h2>
          <ul className="text-sm text-gray-700 list-disc ml-5">{preview.coverage_limitations.map((m) => <li key={m}>{m}</li>)}</ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Knowledge provenance</h2>
        {preview.knowledge_provenance.length === 0 ? (
          <p className="text-sm text-gray-500">No governed claims were considered.</p>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-1 pr-3">Claim</th>
                <th className="py-1 pr-3">Version</th>
                <th className="py-1 pr-3">Last verified</th>
                <th className="py-1 pr-3">Lifecycle</th>
                <th className="py-1">Disposition</th>
              </tr>
            </thead>
            <tbody>
              {preview.knowledge_provenance.map((k) => (
                <tr key={k.claim_id} className="border-b">
                  <td className="py-1 pr-3">{k.claim_id}</td>
                  <td className="py-1 pr-3">{k.claim_version ?? '—'}</td>
                  <td className="py-1 pr-3">{k.last_verified ?? '—'}</td>
                  <td className="py-1 pr-3">{k.lifecycle ?? '—'}</td>
                  <td className="py-1">{k.disposition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
