/**
 * /admin/crc-leads/[lead_id] -- one contact, its eligible CRC sessions,
 * bounded structured context per session, on-demand transcript, optional
 * current-LK answer context, and the minimal Sales status control (CAH-3B).
 */

import { requireAdmin } from '@/lib/auth/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { getSalesContactDetail } from '@/lib/crc-sales/repository'
import { SessionStatusControl } from '../SessionStatusControl'
import { TranscriptViewer } from '../TranscriptViewer'
import { AnswerContextViewer } from '../AnswerContextViewer'

export const dynamic = 'force-dynamic'

export default async function CrcLeadDetailPage({ params }: { params: { lead_id: string } }) {
  await requireAdmin()

  let detail: Awaited<ReturnType<typeof getSalesContactDetail>>
  try {
    detail = await getSalesContactDetail(params.lead_id)
  } catch {
    detail = null
  }
  if (!detail) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/admin/crc-leads" className="text-sm text-gray-500 hover:underline">
          ← CRC Leads
        </Link>
        <h1 className="text-2xl font-display font-bold mt-2" style={{ color: '#1a1918' }}>
          {detail.email}
        </h1>
        <p className="text-sm mt-1 text-gray-500">
          {detail.sessions.length} eligible CRC session{detail.sessions.length === 1 ? '' : 's'}. Self-described customer context — not verified, not an assessment.
        </p>
      </div>

      <div className="space-y-6">
        {detail.sessions.map((s) => (
          <Card key={s.session_id}>
            <CardHeader>
              <CardTitle className="text-base">
                Session {s.session_id.slice(0, 8)} · {formatDate(s.completion_proxy_at)}
              </CardTitle>
              <p className="text-xs text-gray-500">
                completion: {s.completion_reason} · results email: {s.results_email_status ?? 'not sent / unknown'} · traffic: {s.traffic_type} · repeat CRCs by contact: {s.repeat_crc_count}
              </p>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <SessionStatusControl sessionId={s.session_id} initial={s.workflow} />

              <section>
                <h3 className="font-semibold mb-1">What the customer asked</h3>
                {s.project == null ? (
                  <p className="text-gray-500">Project context unavailable for this session.</p>
                ) : s.project.goals.length === 0 ? (
                  <p className="text-gray-500">No explicit goal captured.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {s.project.goals.map((g, i) => (
                      <li key={i}>
                        <span className="text-gray-800">“{g.raw_text}”</span>{' '}
                        <span className="text-gray-400">[{g.category} · {g.scope} · {g.state}]</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {s.project && s.project.assertions.length > 0 && (
                <section>
                  <h3 className="font-semibold mb-1">Project state (as the customer described it)</h3>
                  <ul className="space-y-1">
                    {s.project.assertions.map((a, i) => (
                      <li key={i}>
                        <span className="text-gray-400">{a.kind}:</span> <span className="text-gray-800">{a.stated}</span>{' '}
                        <span className="text-gray-400 text-xs">[{a.state}{a.canonical_id ? ` · ${a.canonical_id}` : ''}]</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {s.project && s.project.correction_history.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-gray-600">Correction history ({s.project.correction_history.length})</summary>
                  <ul className="mt-1 space-y-1 pl-4">
                    {s.project.correction_history.map((h, i) => (
                      <li key={i} className="text-gray-500">
                        {h.kind}: “{h.stated}” <span className="text-xs">(superseded)</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <AnswerContextViewer sessionId={s.session_id} />
              <TranscriptViewer sessionId={s.session_id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
