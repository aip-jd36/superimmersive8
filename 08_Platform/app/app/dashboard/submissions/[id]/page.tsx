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

const BUDGET_LABELS: Record<string, string> = {
  under_10k: 'Under $10,000',
  '10k_50k': '$10,000 – $50,000',
  '50k_200k': '$50,000 – $200,000',
  over_200k: 'Over $200,000',
  undisclosed: 'Prefer not to say',
}

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

  // Parse JSONB fields — handle both string (legacy) and already-parsed (JSONB) cases
  const parseJsonb = (val: any, fallback: any) => {
    if (!val) return fallback
    if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback } }
    return val
  }

  const tools: any[] = parseJsonb(submission.tools_used, [])
  const likenessConfirmation: any = parseJsonb(submission.likeness_confirmation, {})
  const ipConfirmation: any = parseJsonb(submission.ip_confirmation, {})
  const audioInfo: any = parseJsonb(submission.audio_disclosure, {})

  // CertForm-specific fields
  const tier = (submission as any).tier || 'creator_record'
  const submissionMode = (submission as any).submission_mode || 'creator'
  const isCertified = tier === 'si8_certified'
  const campaignContext: any = parseJsonb((submission as any).campaign_context, {})
  const thirdPartyAssets: any = parseJsonb((submission as any).third_party_assets, {})
  const postGenEditing: any = parseJsonb((submission as any).post_gen_editing, {})
  const sceneAttribution: any = parseJsonb((submission as any).scene_attribution, {})
  const productionEvidence: any = parseJsonb((submission as any).production_evidence_paths, {})
  const aiPercentage: number | null = (submission as any).ai_percentage ?? null
  const likenessReleasePath: string | null = (submission as any).likeness_release_path || null
  const ipLicensePath: string | null = (submission as any).ip_license_path || null
  const fairUseArgument: string | null = (submission as any).fair_use_argument || null
  const clientName: string | null = (submission as any).client_name || null
  const contentIntegrityAccepted: boolean = (submission as any).content_integrity_accepted || false
  const scopeAcknowledged: boolean = (submission as any).scope_acknowledged || false

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
                  : tier === 'creator_record'
                    ? 'Your Creator Record is approved. Self-attested PDF generation is being set up — check back shortly or contact us if you need it urgently.'
                    : 'Your submission is approved. Your Chain of Title PDF will be generated by our team shortly.'}
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
                <p className="text-sm text-gray-900 break-words">{submission.logline}</p>
              </div>
            )}
            {submission.intended_use && (() => {
              const iu = parseJsonb(submission.intended_use, null)
              if (!iu) return null
              const primaryLabels: Record<string, string> = {
                agency_deliverable: 'Agency Deliverable / Client Work',
                personal_showcase: 'Personal Showcase',
                licensing_marketplace: 'Licensing / Marketplace',
                film_festival: 'Film Festival Submission',
                internal_use: 'Internal Use',
              }
              return (
                <div className="col-span-2 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Intended Use</p>
                  {iu.primary_use && (
                    <p className="text-sm text-gray-900">{primaryLabels[iu.primary_use] || iu.primary_use.replace(/_/g, ' ')}</p>
                  )}
                  {iu.suitable_categories?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Suitable for</p>
                      <div className="flex flex-wrap gap-1">
                        {iu.suitable_categories.map((c: string) => (
                          <span key={c} className="inline-block text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {iu.excluded_categories?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Do not use with</p>
                      <div className="flex flex-wrap gap-1">
                        {iu.excluded_categories.map((c: string) => (
                          <span key={c} className="inline-block text-xs bg-red-50 text-red-700 border border-red-200 rounded px-2 py-0.5">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Commercial Context — CertForm only */}
        {isCertified && (
          <Card>
            <CardHeader>
              <CardTitle>Commercial Context</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submission Mode</p>
                <p className="text-sm text-gray-900">{submissionMode === 'agency' ? 'Agency / Production House' : 'Individual Creator'}</p>
              </div>
              {campaignContext.is_live_campaign !== null && campaignContext.is_live_campaign !== undefined && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Live Campaign</p>
                  <p className="text-sm text-gray-900">{campaignContext.is_live_campaign ? 'Yes' : 'No'}</p>
                </div>
              )}
              {campaignContext.budget_range && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Budget Range</p>
                  <p className="text-sm text-gray-900">{BUDGET_LABELS[campaignContext.budget_range] || campaignContext.budget_range}</p>
                </div>
              )}
              {campaignContext.distribution_channels?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Distribution Channels</p>
                  <div className="flex flex-wrap gap-1">
                    {campaignContext.distribution_channels.map((c: string) => (
                      <span key={c} className="inline-block text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {submissionMode === 'agency' && clientName && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client Name</p>
                  <p className="text-sm text-gray-900">{clientName}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                    {tool.receipt_url && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                        ✓ Receipt uploaded
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Human Authorship Declaration */}
        <Card>
          <CardHeader>
            <CardTitle>Human Authorship Declaration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCertified && aiPercentage !== null && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">AI Content Estimate</p>
                <p className="text-sm text-gray-900">{aiPercentage}% AI-generated</p>
              </div>
            )}
            {submission.authorship_statement && (
              <div>
                {isCertified && <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Authorship Statement</p>}
                <p className="text-sm text-gray-700 leading-relaxed break-words">{submission.authorship_statement}</p>
              </div>
            )}
            {isCertified && postGenEditing.has_post_gen_editing && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Post-Generation Editing</p>
                {postGenEditing.tools_used?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {postGenEditing.tools_used.map((t: string) => (
                      <span key={t} className="inline-block text-xs bg-gray-100 text-gray-700 border border-gray-200 rounded px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                )}
                {postGenEditing.description && (
                  <p className="text-sm text-gray-700">{postGenEditing.description}</p>
                )}
              </div>
            )}
            {isCertified && !postGenEditing.has_post_gen_editing && postGenEditing.has_post_gen_editing === false && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Post-Generation Editing</p>
                <p className="text-sm text-gray-500">None declared</p>
              </div>
            )}
            {isCertified && sceneAttribution.scenes?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Scene Attribution</p>
                <div className="space-y-2">
                  {sceneAttribution.scenes.map((s: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg bg-gray-50 text-sm">
                      <p className="font-medium text-gray-800">{s.scene}</p>
                      <p className="text-gray-500 text-xs mt-0.5">Tool: {s.tool}</p>
                      {s.prompt_summary && <p className="text-gray-600 mt-1 italic text-xs">"{s.prompt_summary}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Third-party Assets — CertForm only */}
        {isCertified && (
          <Card>
            <CardHeader>
              <CardTitle>Third-party Assets</CardTitle>
              <CardDescription>
                {thirdPartyAssets.has_third_party
                  ? `${thirdPartyAssets.items?.length || 0} item(s) declared`
                  : 'No third-party assets declared'}
              </CardDescription>
            </CardHeader>
            {thirdPartyAssets.has_third_party && thirdPartyAssets.items?.length > 0 && (
              <CardContent>
                <div className="space-y-2">
                  {thirdPartyAssets.items.map((item: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm text-gray-800">{item.type}</p>
                        <span className="text-xs bg-white border rounded px-2 py-0.5 text-gray-600 ml-2 shrink-0">{item.license_status}</span>
                      </div>
                      {item.description && <p className="text-xs text-gray-600 mt-1">{item.description}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
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
              {likenessConfirmation.has_licensed_content ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700">Licensed content confirmed</span>
                  </div>
                  {likenessConfirmation.license_notes && (
                    <p className="text-xs text-gray-500 pl-6">{likenessConfirmation.license_notes}</p>
                  )}
                  {likenessReleasePath && (
                    <p className="text-xs text-green-600 pl-6">✓ Release document uploaded</p>
                  )}
                </div>
              ) : (
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
              )}
            </div>

            {/* IP */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">IP & Brand</p>
              {ipConfirmation.has_licensed_content ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700">Licensed content confirmed</span>
                  </div>
                  {ipConfirmation.license_notes && (
                    <p className="text-xs text-gray-500 pl-6">{ipConfirmation.license_notes}</p>
                  )}
                  {ipLicensePath && (
                    <p className="text-xs text-green-600 pl-6">✓ License document uploaded</p>
                  )}
                </div>
              ) : ipConfirmation.fair_use_claimed ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-700">Fair use claimed (Path C)</span>
                  </div>
                  {fairUseArgument && (
                    <p className="text-xs text-gray-600 pl-6 italic">"{fairUseArgument}"</p>
                  )}
                  {(submission as any).fair_use_doc_path && (
                    <p className="text-xs text-green-600 pl-6">✓ Supporting document uploaded</p>
                  )}
                </div>
              ) : (
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
              )}
            </div>

            {/* Audio */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Audio Source</p>
              <p className="text-sm text-gray-900 capitalize">
                {audioInfo.source_type?.replace('_', ' ') || submission.audio_source?.replace('_', ' ') || '—'}
              </p>
              {audioInfo.license_path && (
                <p className="text-xs text-green-600 mt-0.5">✓ Audio license uploaded</p>
              )}
            </div>

            {/* Territory */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Territory</p>
              <p className="text-sm text-gray-900">{submission.territory_preferences || submission.territory || 'Global'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Production Evidence — CertForm only */}
        {isCertified && (
          <Card>
            <CardHeader>
              <CardTitle>Production Evidence</CardTitle>
              <CardDescription>
                {productionEvidence.items?.length > 0
                  ? `${productionEvidence.items.length} file(s) uploaded`
                  : 'No production evidence uploaded'}
              </CardDescription>
            </CardHeader>
            {productionEvidence.items?.length > 0 && (
              <CardContent>
                <div className="space-y-2">
                  {productionEvidence.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                      <span className="text-xs bg-gray-200 text-gray-700 rounded px-1.5 py-0.5 shrink-0">{item.type}</span>
                      <span className="text-sm text-gray-800">{item.title}</span>
                    </div>
                  ))}
                </div>
                {productionEvidence.notes && (
                  <p className="text-sm text-gray-500 mt-3">{productionEvidence.notes}</p>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Legal Acknowledgments — CertForm only */}
        {isCertified && (
          <Card>
            <CardHeader>
              <CardTitle>Legal Acknowledgments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className={`w-4 h-4 ${contentIntegrityAccepted ? 'text-green-500' : 'text-gray-300'}`} />
                <span className="text-gray-700">Content integrity confirmed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className={`w-4 h-4 ${scopeAcknowledged ? 'text-green-500' : 'text-gray-300'}`} />
                <span className="text-gray-700">Review scope acknowledged</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">Evidence custodian declaration confirmed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">Indemnification warranty accepted</span>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
