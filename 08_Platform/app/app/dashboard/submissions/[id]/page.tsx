import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import {
  ArrowLeft, CheckCircle, Clock, XCircle, FileText,
  Download, ExternalLink, AlertCircle, Play
} from 'lucide-react'

type PageProps = { params: { id: string } }

function formatRuntime(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function StatusBanner({ status, reviewNotes }: { status: string; reviewNotes: string | null }) {
  if (status === 'approved') return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-green-900">Approved — Rights Verified</p>
        <p className="text-sm text-green-700 mt-0.5">Your Chain of Title document is ready to download below.</p>
      </div>
    </div>
  )

  if (status === 'rejected') return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
      <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-red-900">Not Approved</p>
        {reviewNotes && <p className="text-sm text-red-700 mt-0.5">{reviewNotes}</p>}
        <p className="text-sm text-red-700 mt-1">Contact <a href="mailto:jd@superimmersive8.com" className="underline">jd@superimmersive8.com</a> with questions.</p>
      </div>
    </div>
  )

  if (status === 'under_review') return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
      <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-blue-900">Under Review</p>
        <p className="text-sm text-blue-700 mt-0.5">SI8 is reviewing your submission. You'll receive an email when it's complete (typically within 5 business days).</p>
      </div>
    </div>
  )

  if (status === 'needs_info') return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-yellow-900">Additional Information Required</p>
        {reviewNotes && <p className="text-sm text-yellow-700 mt-0.5">{reviewNotes}</p>}
        <p className="text-sm text-yellow-700 mt-1">Reply to the email from SI8 with the requested information.</p>
      </div>
    </div>
  )

  // pending
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
      <Clock className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-gray-800">Pending Review</p>
        <p className="text-sm text-gray-600 mt-0.5">Your submission has been received and payment confirmed. SI8 will begin review shortly.</p>
      </div>
    </div>
  )
}

export default async function SubmissionDetailPage({ params }: PageProps) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) redirect('/auth/login')

  // Fetch submission — verify ownership
  const { data: submission, error } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !submission) notFound()

  // Fetch rights package (Chain of Title PDF)
  const { data: rightsPackage } = await supabaseAdmin
    .from('rights_packages')
    .select('id, catalog_id, document_url, document_path, generated_at')
    .eq('submission_id', params.id)
    .maybeSingle()

  // Fetch catalog opt-in
  const { data: optIn } = await supabaseAdmin
    .from('opt_ins')
    .select('id, catalog_id, video_url, visible, opted_in')
    .eq('submission_id', params.id)
    .maybeSingle()

  // Parse JSONB fields
  let tools: any[] = []
  try { tools = JSON.parse(submission.tools_used as string || '[]') } catch {}

  let likenessConfirmation: any = {}
  try { likenessConfirmation = JSON.parse(submission.likeness_confirmation as string || '{}') } catch {}

  let ipConfirmation: any = {}
  try { ipConfirmation = JSON.parse(submission.ip_confirmation as string || '{}') } catch {}

  let audioInfo: any = {}
  try { audioInfo = JSON.parse(submission.audio_information as string || '{}') } catch {}

  const statusLabel: Record<string, string> = {
    pending: 'PENDING',
    under_review: 'UNDER REVIEW',
    approved: 'APPROVED',
    rejected: 'NOT APPROVED',
    needs_info: 'INFO NEEDED',
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    under_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    needs_info: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Back nav */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{submission.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submitted {formatDate(submission.created_at)}
            {submission.filmmaker_name && ` · ${submission.filmmaker_name}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${statusColor[submission.status] || statusColor.pending}`}>
            {statusLabel[submission.status] || 'PENDING'}
          </span>
          {submission.payment_status === 'paid' && (
            <span className="text-sm text-green-600 font-medium">✓ Paid</span>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className="mb-6">
        <StatusBanner status={submission.status} reviewNotes={submission.review_notes} />
      </div>

      <div className="space-y-6">

        {/* Chain of Title Download — only shown when approved + PDF ready */}
        {submission.status === 'approved' && (
          <Card className={rightsPackage?.document_url ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <FileText className="w-5 h-5" />
                Chain of Title Document
              </CardTitle>
              <CardDescription>
                {rightsPackage?.document_url
                  ? `Generated ${rightsPackage.generated_at ? formatDate(rightsPackage.generated_at) : 'recently'} · Catalog ID: ${rightsPackage.catalog_id || optIn?.catalog_id || '—'}`
                  : 'Your submission is approved. The Chain of Title document will be generated shortly.'}
              </CardDescription>
            </CardHeader>
            {rightsPackage?.document_url && (
              <CardContent>
                <Button asChild className="w-full sm:w-auto bg-green-700 hover:bg-green-800">
                  <a href={rightsPackage.document_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download Chain of Title PDF
                  </a>
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {/* Catalog Status */}
        {optIn && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Catalog Listing
              </CardTitle>
              <CardDescription>
                {optIn.catalog_id
                  ? `Listed as ${optIn.catalog_id}`
                  : 'Opted in — pending admin approval'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optIn.visible && optIn.catalog_id ? (
                <Button asChild variant="outline">
                  <Link href={`/catalog`}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in Public Catalog
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-gray-500">Your film will appear in the public catalog once approved by SI8.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Production Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Production Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Runtime</p>
              <p className="text-sm text-gray-900">{formatRuntime(submission.runtime)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Genre</p>
              <p className="text-sm text-gray-900">{submission.genre || '—'}</p>
            </div>
            {submission.logline && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Logline</p>
                <p className="text-sm text-gray-900">{submission.logline}</p>
              </div>
            )}
            {submission.intended_use && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Intended Use</p>
                <p className="text-sm text-gray-900">{submission.intended_use}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tool Disclosure */}
        <Card>
          <CardHeader>
            <CardTitle>Tool Disclosure</CardTitle>
            <CardDescription>{tools.length} AI tool{tools.length !== 1 ? 's' : ''} declared</CardDescription>
          </CardHeader>
          <CardContent>
            {tools.length === 0 ? (
              <p className="text-sm text-gray-500">No tools recorded.</p>
            ) : (
              <div className="space-y-3">
                {tools.map((tool: any, i: number) => (
                  <div key={i} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{tool.tool_name || tool.toolName || 'Unknown tool'}</p>
                      <span className="text-xs bg-white border rounded px-2 py-0.5 text-gray-600">
                        {tool.plan_type || tool.planType || '—'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Version: {tool.version || '—'}
                      {(tool.start_date || tool.startDate) && ` · ${tool.start_date || tool.startDate}`}
                      {(tool.end_date || tool.endDate) && ` – ${tool.end_date || tool.endDate}`}
                    </p>
                    {(tool.receipt_url) && (
                      <a href={tool.receipt_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                        <ExternalLink className="w-3 h-3" />
                        View Receipt
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Human Authorship Declaration */}
        {submission.authorship_statement && (
          <Card>
            <CardHeader>
              <CardTitle>Human Authorship Declaration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed">{submission.authorship_statement}</p>
            </CardContent>
          </Card>
        )}

        {/* Rights Confirmations */}
        <Card>
          <CardHeader>
            <CardTitle>Rights Confirmations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Likeness */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Likeness & Identity</p>
              <div className="space-y-1.5">
                {[
                  ['No real faces', likenessConfirmation.no_real_faces],
                  ['No real voices', likenessConfirmation.no_real_voices],
                  ['No lookalikes', likenessConfirmation.no_lookalikes],
                  ['No synthetic people intended to deceive', likenessConfirmation.no_synthetic_people],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`w-4 h-4 ${val ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className="text-gray-700">{label as string}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* IP */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">IP & Brand</p>
              <div className="space-y-1.5">
                {[
                  ['No copyrighted characters', ipConfirmation.no_copyrighted_characters],
                  ['No brand imitation', ipConfirmation.no_brand_imitation],
                  ['No trademarked IP', ipConfirmation.no_trademarked_ip],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`w-4 h-4 ${val ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className="text-gray-700">{label as string}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audio */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Audio Source</p>
              <p className="text-sm text-gray-900 capitalize">
                {audioInfo.source_type?.replace('_', ' ') || submission.audio_source?.replace('_', ' ') || '—'}
              </p>
            </div>

            {/* Modification */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Modification Rights</p>
              <p className="text-sm text-gray-900">
                {submission.modification_authorized
                  ? `Authorized${submission.modification_scope ? ` — ${submission.modification_scope}` : ''}`
                  : 'Not authorized (Tier 1 licensing only)'}
              </p>
            </div>

            {/* Territory */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Territory</p>
              <p className="text-sm text-gray-900">{submission.territory_preferences || submission.territory || 'Global'}</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
