import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UsersTable } from './UsersTable'

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

  // Flatten into serializable rows for client component
  const userRows = authUsers.map(u => ({
    id: u.id,
    email: u.email || '',
    fullName: u.user_metadata?.full_name || '—',
    createdAt: u.created_at,
    verified: !!u.email_confirmed_at,
    isAdmin: !!adminFlags[u.id],
    submissionCount: submissionStats[u.id]?.count || 0,
    totalRevenue: submissionStats[u.id]?.totalRevenue || 0,
  }))

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
            <CardDescription>Admins pinned first. Click any column header to sort.</CardDescription>
          </CardHeader>
          <CardContent>
            <UsersTable users={userRows} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
