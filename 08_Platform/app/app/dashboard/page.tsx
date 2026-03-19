import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cookies } from 'next/headers'

async function getSubmissions() {
  const cookieStore = cookies()
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return []

  try {
    // Call API route instead of direct Supabase query
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/submissions`, {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Failed to fetch submissions:', response.status)
      return []
    }

    const data = await response.json()
    return data.submissions || []
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return []
  }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  // Get user's submissions via API route
  const submissions = await getSubmissions()

  // Get user's opt-ins
  const { data: optIns } = await supabase
    .from('opt_ins')
    .select('*')
    .eq('user_id', session.user.id)

  // Get user's licensing deals
  const { data: deals } = await supabase
    .from('licensing_deals')
    .select('*')
    .eq('creator_id', session.user.id)

  const approvedCount = submissions.filter((s) => s.status === 'approved').length
  const catalogCount = optIns?.length || 0
  const totalEarnings = deals?.reduce((sum, deal) => sum + (deal.creator_payout || 0), 0) || 0

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      needs_info: 'bg-yellow-100 text-yellow-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here's an overview of your submissions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Submissions</CardDescription>
            <CardTitle className="text-3xl">{submissions.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600">{approvedCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Catalog Listings</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{catalogCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Earnings</CardDescription>
            <CardTitle className="text-3xl text-purple-600">
              {formatCurrency(totalEarnings)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Your Submissions</CardTitle>
              <CardDescription>Track the status of your video submissions</CardDescription>
            </div>
            <Button asChild>
              <Link href="/submit">Submit New Video</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You haven't submitted any videos yet.</p>
              <Button asChild>
                <Link href="/submit">Submit Your First Video</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Film Title</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Submitted</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{submission.title}</td>
                      <td className="py-3 px-4">{getStatusBadge(submission.status)}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/submissions/${submission.id}`}>View Details</Link>
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
