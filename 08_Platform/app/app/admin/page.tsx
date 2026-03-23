import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

type Submission = {
  id: string
  title: string
  status: string
  payment_status: string
  created_at: string
  filmmaker_name: string
  amount_paid: number | null
  user_id: string
}

export default async function AdminDashboard() {
  // Require admin authentication
  await requireAdmin()

  // Fetch all submissions
  const { data: submissions } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })

  // Calculate summary stats
  const totalSubmissions = submissions?.length || 0
  const pendingReview = submissions?.filter(
    s => s.status === 'pending' || s.status === 'under_review' || s.status === 'needs_info'
  ).length || 0
  const approved = submissions?.filter(s => s.status === 'approved').length || 0
  const rejected = submissions?.filter(s => s.status === 'rejected').length || 0

  // Get this week's approved
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const approvedThisWeek = submissions?.filter(
    s => s.status === 'approved' && new Date(s.created_at) > oneWeekAgo
  ).length || 0

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: Eye, label: 'Under Review' },
      needs_info: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Needs Info' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
    }
    const { color, icon: Icon, label } = config[status as keyof typeof config] || config.pending
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    )
  }

  const getPaymentBadge = (status: string, amount: number | null) => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
          ✓ Paid {amount ? formatCurrency(amount) : ''}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
        Unpaid
      </span>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="bg-white border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold" style={{ color: '#1a1918' }}>Review Queue</h1>
              <p className="text-sm mt-1" style={{ color: '#8C8A82' }}>Review submissions and manage catalog</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/admin/catalog">Manage Catalog</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Creator View</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Submissions</CardDescription>
              <CardTitle className="text-4xl">{totalSubmissions}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-yellow-700">Pending Review</CardDescription>
              <CardTitle className="text-4xl text-yellow-600">{pendingReview}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-yellow-600">Action required</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700">Approved (Total)</CardDescription>
              <CardTitle className="text-4xl text-green-600">{approved}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-green-600">{approvedThisWeek} this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-4xl text-gray-600">{rejected}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Submission Queue</CardTitle>
            <CardDescription>
              Review and approve submissions. Oldest first = highest priority.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!submissions || submissions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No submissions yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Film Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Creator</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Payment</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Submitted</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{submission.title}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-600">{submission.filmmaker_name}</div>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(submission.status)}
                        </td>
                        <td className="py-4 px-4">
                          {getPaymentBadge(submission.payment_status, submission.amount_paid)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-600">
                            {formatDate(submission.created_at)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Button size="sm" asChild>
                            <Link href={`/admin/submissions/${submission.id}`}>
                              Review
                            </Link>
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

        {pendingReview === 0 && totalSubmissions > 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-700 font-medium">
              🎉 No submissions pending review. Great work!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
