import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { ApproveRejectButtons } from './ApproveRejectButtons'
import { GenerateRightsPackageButton } from './GenerateRightsPackageButton'
import { notFound } from 'next/navigation'

type PageProps = {
  params: {
    id: string
  }
}

export default async function SubmissionDetailPage({ params }: PageProps) {
  await requireAdmin()

  console.log('🔍 Fetching submission:', params.id)

  // Fetch submission with user data
  // Use explicit foreign key (!user_id) to avoid ambiguous relationship error
  const { data: submission, error } = await supabaseAdmin
    .from('submissions')
    .select(`
      *,
      user:users!user_id (
        email,
        name
      )
    `)
    .eq('id', params.id)
    .single()

  console.log('📊 Query result:', {
    found: !!submission,
    error: error?.message,
    submissionId: submission?.id
  })

  if (error || !submission) {
    console.log('❌ Submission not found, calling notFound()')
    notFound()
  }

  console.log('✅ Submission found:', submission.title)

  // Check if opt-in exists
  const { data: optIn } = await supabaseAdmin
    .from('opt_ins')
    .select('*')
    .eq('submission_id', params.id)
    .single()

  // Check if Rights Package (Chain of Title PDF) exists
  const { data: rightsPackage } = await supabaseAdmin
    .from('rights_packages')
    .select('id, document_url, document_path, generated_at, format')
    .eq('submission_id', params.id)
    .single()

  // Parse JSONB fields
  const toolsUsed = submission.tools_used ? JSON.parse(submission.tools_used) : []
  const audioDisclosure = submission.audio_disclosure ? JSON.parse(submission.audio_disclosure) : {}
  const likenessConfirmation = submission.likeness_confirmation ? JSON.parse(submission.likeness_confirmation) : {}
  const ipConfirmation = submission.ip_confirmation ? JSON.parse(submission.ip_confirmation) : {}

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      under_review: 'bg-blue-100 text-blue-800 border-blue-200',
      needs_info: 'bg-orange-100 text-orange-800 border-orange-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  return (
    <div>
      {/* Page header */}
      <div className="bg-white border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Queue
              </Link>
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{submission.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>By {submission.filmmaker_name}</span>
                <span>•</span>
                <span>{submission.user?.email}</span>
                <span>•</span>
                <span>Submitted {formatDate(submission.created_at)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`px-4 py-2 rounded-lg border font-medium ${getStatusColor(submission.status)}`}>
                {submission.status.replace('_', ' ').toUpperCase()}
              </div>
              {submission.payment_status === 'paid' && (
                <div className="text-sm text-green-600 font-medium">
                  ✓ Paid {submission.amount_paid ? formatCurrency(submission.amount_paid / 100) : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Production Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Production Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Runtime</div>
                    <div className="text-lg">{submission.runtime ? `${Math.floor(submission.runtime / 60)}:${(submission.runtime % 60).toString().padStart(2, '0')}` : 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Genre</div>
                    <div className="text-lg">{submission.genre || 'Not specified'}</div>
                  </div>
                </div>
                {submission.logline && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Logline</div>
                    <p className="text-gray-700">{submission.logline}</p>
                  </div>
                )}
                {submission.intended_use && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Intended Use</div>
                    <p className="text-gray-700">{submission.intended_use}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tools Used */}
            <Card>
              <CardHeader>
                <CardTitle>Tool Disclosure</CardTitle>
              </CardHeader>
              <CardContent>
                {toolsUsed.length > 0 ? (
                  <div className="space-y-2">
                    {toolsUsed.map((tool: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium">{tool.tool || 'Unknown tool'}</div>
                        {tool.version && <div className="text-sm text-gray-600">Version: {tool.version}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No tools specified</p>
                )}
              </CardContent>
            </Card>

            {/* Authorship Statement */}
            <Card>
              <CardHeader>
                <CardTitle>Human Authorship Declaration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{submission.authorship_statement}</p>
              </CardContent>
            </Card>

            {/* Likeness & IP Confirmations */}
            <Card>
              <CardHeader>
                <CardTitle>Rights Confirmations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {likenessConfirmation.confirmed ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium">Likeness & Identity Confirmation</span>
                </div>
                <div className="flex items-center gap-2">
                  {ipConfirmation.confirmed ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium">IP & Brand Confirmation</span>
                </div>
              </CardContent>
            </Card>

            {/* Audio Disclosure */}
            <Card>
              <CardHeader>
                <CardTitle>Audio & Music</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-gray-500 mb-1">Source Type</div>
                <div className="text-gray-700 capitalize">
                  {audioDisclosure.source_type?.replace('_', ' ') || 'Not specified'}
                </div>
                {audioDisclosure.documentation && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-gray-500 mb-1">Documentation</div>
                    <p className="text-gray-700">{audioDisclosure.documentation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Catalog Opt-In */}
            {optIn && (
              <Card>
                <CardHeader>
                  <CardTitle>Catalog Opt-In</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Opted in to public catalog</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Video URL</div>
                    <a
                      href={optIn.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {optIn.video_url}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  {optIn.public_description && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Public Description</div>
                      <p className="text-gray-700">{optIn.public_description}</p>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Catalog Status</div>
                    <div className="text-gray-700">
                      {optIn.visible ? (
                        <span className="text-green-600 font-medium">✓ Visible in catalog</span>
                      ) : (
                        <span className="text-gray-500">Not visible (pending approval)</span>
                      )}
                    </div>
                  </div>
                  {optIn.catalog_id && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Catalog ID</div>
                      <div className="font-mono text-blue-600">{optIn.catalog_id}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">
            <ApproveRejectButtons
              submissionId={params.id}
              currentStatus={submission.status}
              hasOptIn={!!optIn}
            />

            <GenerateRightsPackageButton
              submissionId={params.id}
              catalogId={optIn?.catalog_id || null}
              currentStatus={submission.status}
              existingRightsPackage={rightsPackage}
            />

            {/* Review Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Review Notes</CardTitle>
                <CardDescription>Internal notes (not visible to creator)</CardDescription>
              </CardHeader>
              <CardContent>
                {submission.review_notes ? (
                  <p className="text-sm text-gray-700">{submission.review_notes}</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">No notes yet</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Submission ID</div>
                  <div className="font-mono text-xs text-gray-700">{params.id}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Creator</div>
                  <div className="text-gray-700">{submission.filmmaker_name}</div>
                  <div className="text-gray-500 text-xs">{submission.user?.email}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Territory</div>
                  <div className="text-gray-700">{submission.territory_preferences || 'Global'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Modification Rights</div>
                  <div className="text-gray-700">
                    {submission.modification_authorized ? (
                      <span className="text-green-600">✓ Authorized</span>
                    ) : (
                      <span className="text-gray-500">Not authorized</span>
                    )}
                  </div>
                  {submission.modification_scope && (
                    <div className="text-xs text-gray-500 mt-1">Scope: {submission.modification_scope}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
