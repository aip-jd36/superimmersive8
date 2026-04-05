import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { DeleteUserButton } from './DeleteUserButton'

export default async function AdminUsersPage() {
  await requireAdmin()

  // Fetch all auth users
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = authData?.users || []

  // Fetch public.users for admin flags
  const { data: publicUsers } = await supabaseAdmin
    .from('users')
    .select('id, is_admin')

  const adminFlags = Object.fromEntries(
    (publicUsers || []).map(u => [u.id, u.is_admin])
  )

  // Fetch submissions: count + total paid per user
  const { data: submissions } = await supabaseAdmin
    .from('submissions')
    .select('user_id, payment_status, amount_paid, tier')

  const submissionStats: Record<string, { count: number; paid: number; totalRevenue: number }> = {}
  for (const s of submissions || []) {
    if (!submissionStats[s.user_id]) {
      submissionStats[s.user_id] = { count: 0, paid: 0, totalRevenue: 0 }
    }
    submissionStats[s.user_id].count++
    if (s.payment_status === 'paid') {
      submissionStats[s.user_id].paid++
      submissionStats[s.user_id].totalRevenue += s.amount_paid || 0
    }
  }

  // Sort: admins first, then by signup date desc
  const sorted = [...authUsers].sort((a, b) => {
    const aAdmin = adminFlags[a.id] ? 1 : 0
    const bAdmin = adminFlags[b.id] ? 1 : 0
    if (bAdmin !== aAdmin) return bAdmin - aAdmin
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const totalUsers = authUsers.length
  const verifiedUsers = authUsers.filter(u => u.email_confirmed_at).length
  const pendingVerification = totalUsers - verifiedUsers

  return (
    <div>
      {/* Page header */}
      <div className="bg-white border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: '#1a1918' }}>Users</h1>
            <p className="text-sm mt-1" style={{ color: '#8C8A82' }}>All registered accounts</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-4xl">{totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700">Email Verified</CardDescription>
              <CardTitle className="text-4xl text-green-600">{verifiedUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-yellow-700">Pending Verification</CardDescription>
              <CardTitle className="text-4xl text-yellow-600">{pendingVerification}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Admins shown first, then newest signups.</CardDescription>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No users yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name / Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Signed Up</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Verified</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Submissions</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Paid</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((user) => {
                      const isAdmin = adminFlags[user.id]
                      const stats = submissionStats[user.id] || { count: 0, paid: 0, totalRevenue: 0 }
                      const verified = !!user.email_confirmed_at
                      const fullName = user.user_metadata?.full_name || '—'
                      const signupDate = new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })

                      return (
                        <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">

                          {/* Name / Email */}
                          <td className="py-4 px-4">
                            <div className="font-medium text-sm text-gray-900">{fullName}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                          </td>

                          {/* Signed up */}
                          <td className="py-4 px-4 text-sm text-gray-600">{signupDate}</td>

                          {/* Verified */}
                          <td className="py-4 px-4">
                            {verified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                ✓ Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                                ⏳ Pending
                              </span>
                            )}
                          </td>

                          {/* Submissions */}
                          <td className="py-4 px-4">
                            {stats.count > 0 ? (
                              <Link
                                href={`/admin?user=${user.id}`}
                                className="text-sm font-medium hover:underline"
                                style={{ color: '#C8900A' }}
                              >
                                {stats.count} submission{stats.count !== 1 ? 's' : ''}
                              </Link>
                            ) : (
                              <span className="text-sm text-gray-400">None</span>
                            )}
                          </td>

                          {/* Total paid */}
                          <td className="py-4 px-4">
                            {stats.totalRevenue > 0 ? (
                              <span className="text-sm font-semibold text-gray-800">
                                ${stats.totalRevenue.toFixed(0)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">$0</span>
                            )}
                          </td>

                          {/* Role */}
                          <td className="py-4 px-4">
                            {isAdmin ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold"
                                style={{ background: '#FEF3C7', color: '#92400E' }}>
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                Creator
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4">
                            {!isAdmin && (
                              <DeleteUserButton userId={user.id} userEmail={user.email || ''} />
                            )}
                          </td>

                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
