import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { ToggleVisibilityButton } from './ToggleVisibilityButton'

type CatalogEntry = {
  id: string
  submission_id: string
  catalog_id: string | null
  video_url: string
  visible: boolean
  created_at: string
  submission: {
    title: string
    filmmaker_name: string
    status: string
  }
}

export default async function CatalogManagementPage() {
  await requireAdmin()

  // Fetch all opt-ins (catalog entries)
  const { data: entries } = await supabaseAdmin
    .from('opt_ins')
    .select(`
      id,
      submission_id,
      catalog_id,
      video_url,
      visible,
      created_at,
      submission:submissions!inner (
        title,
        filmmaker_name,
        status
      )
    `)
    .order('created_at', { ascending: false })

  const catalogEntries = (entries || []) as CatalogEntry[]

  const totalEntries = catalogEntries.length
  const visibleEntries = catalogEntries.filter(e => e.visible).length
  const hiddenEntries = totalEntries - visibleEntries

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Catalog Management</h1>
              <p className="text-gray-600 mt-1">Manage public catalog visibility and metadata</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/catalog" target="_blank">
                View Public Catalog
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Catalog Entries</CardDescription>
              <CardTitle className="text-4xl">{totalEntries}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700">Visible (Public)</CardDescription>
              <CardTitle className="text-4xl text-green-600">{visibleEntries}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-gray-200 bg-gray-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-700">Hidden</CardDescription>
              <CardTitle className="text-4xl text-gray-600">{hiddenEntries}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Catalog Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Catalog Entries</CardTitle>
            <CardDescription>
              Toggle visibility, manage catalog IDs, and view submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {catalogEntries.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No catalog entries yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Approved submissions with catalog opt-in will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Catalog ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Film Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Filmmaker</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Visibility</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Added</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          {entry.catalog_id ? (
                            <span className="font-mono text-sm text-blue-600">{entry.catalog_id}</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Not assigned</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{entry.submission.title}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-600">{entry.submission.filmmaker_name}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.submission.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.submission.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {entry.visible ? (
                            <div className="flex items-center gap-1.5 text-green-600 text-sm">
                              <Eye className="w-4 h-4" />
                              <span className="font-medium">Public</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                              <EyeOff className="w-4 h-4" />
                              <span>Hidden</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-600">
                            {formatDate(entry.created_at)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <ToggleVisibilityButton
                              entryId={entry.id}
                              currentVisibility={entry.visible}
                            />
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/admin/submissions/${entry.submission_id}`}>
                                View
                              </Link>
                            </Button>
                          </div>
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
    </div>
  )
}
