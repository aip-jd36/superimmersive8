/**
 * /admin/crc-leads -- internal Sales contact list (CAH-3B).
 *
 * Under the existing /admin shell (auth = requireAdmin() in the layout;
 * routes additionally self-check). A distinct sub-tree: NOTHING here is
 * imported by app/admin/submissions/** or lib/assessments/**.
 * Functional only -- no visual redesign, no new design system.
 */

import { requireAdmin } from '@/lib/auth/admin'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { listSalesContacts } from '@/lib/crc-sales/repository'
import type { SalesStatus } from '@/lib/crc-sales/workflow'

export const dynamic = 'force-dynamic'

function statusChips(summary: Record<SalesStatus, number>) {
  const order: SalesStatus[] = ['NEW', 'CONTACTED', 'CONVERTING', 'CLOSED']
  return order
    .filter((s) => summary[s] > 0)
    .map((s) => `${summary[s]} ${s}`)
    .join(' · ')
}

export default async function CrcLeadsPage() {
  await requireAdmin()

  let contacts: Awaited<ReturnType<typeof listSalesContacts>> = []
  let loadError = false
  try {
    contacts = await listSalesContacts()
  } catch {
    loadError = true
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold" style={{ color: '#1a1918' }}>
          CRC Leads
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8C8A82' }}>
          Contactable completed Commercial Readiness Checks. Self-described customer context — not verified, not an assessment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>One row per contact with at least one eligible CRC session. Most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <p className="text-sm text-red-600 py-6">Could not load leads. Try again.</p>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-gray-500 py-6">No contactable completed CRC leads yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-gray-700">
                    <th className="py-2 px-3 font-semibold">Email</th>
                    <th className="py-2 px-3 font-semibold">Eligible sessions</th>
                    <th className="py-2 px-3 font-semibold">Most recent</th>
                    <th className="py-2 px-3 font-semibold">Sales state</th>
                    <th className="py-2 px-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.contact_id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{c.email}</td>
                      <td className="py-2 px-3">{c.eligible_session_count}</td>
                      <td className="py-2 px-3 text-gray-600">{formatDate(c.most_recent_eligible_at)}</td>
                      <td className="py-2 px-3 text-gray-600">{statusChips(c.status_summary) || '—'}</td>
                      <td className="py-2 px-3">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/crc-leads/${c.contact_id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
