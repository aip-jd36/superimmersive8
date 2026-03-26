'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import AddToolModal, { Tool } from '@/components/AddToolModal'
import ToolCard from '@/components/ToolCard'
import { CheckCircle, FileText, AlertTriangle } from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

const SECTION_NAMES: Record<number, string> = {
  1: 'Production Details',
  2: 'Tool Disclosure',
  3: 'Third-party Assets',
  4: 'Human Authorship',
  5: 'Likeness & Identity',
  6: 'IP & Brand',
  7: 'Audio & Music',
  8: 'Production Evidence',
  9: 'Territory / Client Info',
  10: 'Video & Showcase',
  11: 'Review & Submit',
}

const DISTRIBUTION_CHANNELS = [
  'TV Broadcast', 'Streaming Platform', 'Online / Social Media',
  'Cinema', 'Out-of-Home (OOH)', 'Internal / Unreleased',
]

const BUDGET_RANGES = [
  { value: 'under_10k', label: 'Under $10,000' },
  { value: '10k_50k', label: '$10,000 – $50,000' },
  { value: '50k_200k', label: '$50,000 – $200,000' },
  { value: 'over_200k', label: 'Over $200,000' },
  { value: 'undisclosed', label: 'Prefer not to say' },
]

const SUITABLE_CATEGORIES = [
  'Consumer Goods', 'Technology & Software', 'Automotive',
  'Financial Services', 'Healthcare & Wellness', 'Food & Beverage',
  'Fashion & Luxury', 'Entertainment & Media', 'Sports & Fitness',
  'Travel & Tourism', 'Education', 'Real Estate',
]
const EXCLUDED_CATEGORIES = [
  'Alcohol & Tobacco', 'Gambling', 'Adult Content',
  'Political Advertising', 'Pharmaceutical (Rx)', 'Firearms & Weapons',
]

const THIRD_PARTY_TYPES = ['Stock Footage', '3D Model', 'Freelance-Generated Element', 'Music / SFX', 'Other']
const THIRD_PARTY_LICENSES = ['Licensed', 'Purchased Outright', 'Public Domain', 'Unclear']
const POST_GEN_SOFTWARE = ['After Effects', 'DaVinci Resolve', 'Premiere Pro', 'Final Cut Pro', 'CapCut', 'Other']

// ─── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  runtime_minutes: z.number().min(0).optional(),
  runtime_seconds: z.number().min(0).max(59).optional(),
  genre: z.string().optional(),
  logline: z.string().max(500).optional(),
  primary_use: z.string().optional(),
  authorship_statement: z.string().refine(
    (v) => countWords(v) >= 150,
    { message: 'Must be at least 150 words' }
  ),
  likeness_no_real_faces: z.boolean().optional(),
  likeness_no_real_voices: z.boolean().optional(),
  likeness_no_lookalikes: z.boolean().optional(),
  likeness_no_synthetic_people: z.boolean().optional(),
  ip_no_copyrighted_characters: z.boolean().optional(),
  ip_no_brand_imitation: z.boolean().optional(),
  ip_no_trademarked_ip: z.boolean().optional(),
  audio_source: z.enum(['ai_generated', 'licensed', 'silent']),
  territory: z.enum(['Global', 'North America', 'Europe', 'Asia', 'Other']).default('Global'),
  territory_other: z.string().optional(),
  video_url: z.string().url('Must be a valid YouTube or Vimeo URL').min(1, 'Video URL is required'),
  thumbnail_url: z.string().url().optional().or(z.literal('')),
  public_description: z.string().max(500).optional(),
  catalog_opt_in: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

// ─── Third-party Asset Item ──────────────────────────────────────────────────

interface ThirdPartyItem {
  id: string
  type: string
  description: string
  license_status: string
  file_path?: string
}

const EVIDENCE_TYPES = [
  'Generation Screenshot',
  'Session Export',
  'Iteration Sample',
  'Timeline Export',
  'Prompt Log',
  'Other',
]

interface ProductionEvidenceItem {
  id: string
  type: string
  title: string
  path: string
}

// ─── Evidence Uploader Component ────────────────────────────────────────────

interface EvidenceUploaderProps {
  onAdd: (item: ProductionEvidenceItem) => void
  uploadFile: (file: File, folder: string) => Promise<string | null>
}

function EvidenceUploader({ onAdd, uploadFile }: EvidenceUploaderProps) {
  const [type, setType] = useState('')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!type) { setError('Select an evidence type first'); return }
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return }
    setError(null)
    setUploading(true)
    const path = await uploadFile(file, 'production-evidence')
    setUploading(false)
    if (!path) { setError('Upload failed — please try again'); return }
    onAdd({ id: crypto.randomUUID(), type, title: title || file.name, path })
    setType('')
    setTitle('')
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600 font-medium">Evidence Type *</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
            <option value="">Select type...</option>
            {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium">Label / Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Opening scene iteration 3"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
          />
        </div>
      </div>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.zip"
        disabled={uploading}
        onChange={handleFile}
        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 disabled:opacity-50"
      />
      {uploading && <p className="text-xs text-blue-600">Uploading...</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Scene Attribution Row ───────────────────────────────────────────────────

interface SceneRow {
  id: string
  scene: string
  tool: string
  prompt_summary: string
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CertifyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentSection, setCurrentSection] = useState(1)
  const [submissionMode, setSubmissionMode] = useState<'creator' | 'agency'>('creator')
  const [userId, setUserId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Tool state ────
  const [tools, setTools] = useState<Tool[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const [toolsError, setToolsError] = useState<string | null>(null)

  // ── Commercial context (Section 1) ────
  const [isLiveCampaign, setIsLiveCampaign] = useState<boolean | null>(null)
  const [budgetRange, setBudgetRange] = useState('')
  const [distributionChannels, setDistributionChannels] = useState<string[]>([])
  const [clientName, setClientName] = useState('')

  // ── Third-party assets (Section 3) ────
  const [hasThirdParty, setHasThirdParty] = useState(false)
  const [thirdPartyItems, setThirdPartyItems] = useState<ThirdPartyItem[]>([])

  // ── Authorship extras (Section 4) ────
  const [aiPercentage, setAiPercentage] = useState<number>(80)
  const [hasPostGenEditing, setHasPostGenEditing] = useState(false)
  const [postGenSoftware, setPostGenSoftware] = useState<string[]>([])
  const [postGenDescription, setPostGenDescription] = useState('')
  const [sceneRows, setSceneRows] = useState<SceneRow[]>([])
  const [evidenceCustodian, setEvidenceCustodian] = useState(false)
  const [evidenceCustodianError, setEvidenceCustodianError] = useState<string | null>(null)

  // ── Likeness (Section 5) ────
  const [likenessPath, setLikenessPath] = useState<'a' | 'b' | null>(null)
  const [likenessUploadPath, setLikenessUploadPath] = useState<string | null>(null)
  const [likenessUploading, setLikenessUploading] = useState(false)
  const [likenessError, setLikenessError] = useState<string | null>(null)

  // ── IP (Section 6) ────
  const [ipPath, setIpPath] = useState<'a' | 'b' | 'c' | null>(null)
  const [ipUploadPath, setIpUploadPath] = useState<string | null>(null)
  const [ipUploading, setIpUploading] = useState(false)
  const [fairUseArgument, setFairUseArgument] = useState('')
  const [fairUseDocPath, setFairUseDocPath] = useState<string | null>(null)
  const [fairUseDocUploading, setFairUseDocUploading] = useState(false)
  const [ipError, setIpError] = useState<string | null>(null)

  // ── Audio (Section 7) ────
  const [audioLicensePath, setAudioLicensePath] = useState<string | null>(null)
  const [audioLicenseUploading, setAudioLicenseUploading] = useState(false)

  // ── Production evidence (Section 8) ────
  const [hasProductionEvidence, setHasProductionEvidence] = useState(false)
  const [productionEvidenceItems, setProductionEvidenceItems] = useState<ProductionEvidenceItem[]>([])
  const [productionEvidenceNotes, setProductionEvidenceNotes] = useState('')
  const [evidenceUploading, setEvidenceUploading] = useState(false)

  // ── Third-party asset upload tracking ────
  const [uploadingThirdPartyId, setUploadingThirdPartyId] = useState<string | null>(null)

  // ── Review checkboxes (Section 11) ────
  const [indemnificationAccepted, setIndemnificationAccepted] = useState(false)
  const [contentIntegrityAccepted, setContentIntegrityAccepted] = useState(false)
  const [scopeAcknowledged, setScopeAcknowledged] = useState(false)

  // ── Brand safety (Section 10, creator mode) ────
  const [suitableCategories, setSuitableCategories] = useState<string[]>([])
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])

  // ── Agency licensing auth (Section 10, agency mode) ────
  const [agencyLicensingAuth, setAgencyLicensingAuth] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      territory: 'Global',
      catalog_opt_in: false,
      likeness_no_real_faces: false,
      likeness_no_real_voices: false,
      likeness_no_lookalikes: false,
      likeness_no_synthetic_people: false,
      ip_no_copyrighted_characters: false,
      ip_no_brand_imitation: false,
      ip_no_trademarked_ip: false,
    },
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setUserId(session.user.id)
    })
  }, [supabase])

  const hasPrimaryTool = tools.some((t) => t.isPrimary)
  const authorshipText = watch('authorship_statement') || ''
  const wordCount = countWords(authorshipText)
  const wordCountColor = wordCount === 0 ? 'text-gray-400' : wordCount < 150 ? 'text-red-500 font-semibold' : wordCount < 300 ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'
  const wordCountLabel = wordCount < 150 ? `${wordCount} / 150 words minimum` : wordCount < 300 ? `${wordCount} words — Good` : `${wordCount} words — Strong`

  const handleAddTool = () => { setEditingTool(null); setIsModalOpen(true) }
  const handleEditTool = (tool: Tool) => { setEditingTool(tool); setIsModalOpen(true) }
  const handleSaveTool = (tool: Tool) => {
    let updated = editingTool ? tools.map((t) => t.id === tool.id ? tool : t) : [...tools, tool]
    if (tool.isPrimary) updated = updated.map((t) => t.id === tool.id ? t : { ...t, isPrimary: false })
    setTools(updated)
    setToolsError(null)
  }
  const handleRemoveTool = (toolId: string) => {
    const remaining = tools.filter((t) => t.id !== toolId)
    const removedWasPrimary = tools.find((t) => t.id === toolId)?.isPrimary
    if (removedWasPrimary && remaining.length > 0) remaining[0] = { ...remaining[0], isPrimary: true }
    setTools(remaining)
  }

  const toggleChannel = (c: string) => setDistributionChannels((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])
  const toggleSoftware = (s: string) => setPostGenSoftware((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])
  const toggleCat = (c: string, list: string[], set: (v: string[]) => void) => set(list.includes(c) ? list.filter((x) => x !== c) : [...list, c])

  const addThirdPartyItem = () => setThirdPartyItems((p) => [...p, { id: crypto.randomUUID(), type: '', description: '', license_status: '' }])
  const updateThirdPartyItem = (id: string, field: keyof ThirdPartyItem, value: string) =>
    setThirdPartyItems((p) => p.map((item) => item.id === id ? { ...item, [field]: value } : item))
  const removeThirdPartyItem = (id: string) => setThirdPartyItems((p) => p.filter((item) => item.id !== id))

  const addSceneRow = () => setSceneRows((p) => [...p, { id: crypto.randomUUID(), scene: '', tool: '', prompt_summary: '' }])
  const updateSceneRow = (id: string, field: keyof SceneRow, value: string) =>
    setSceneRows((p) => p.map((r) => r.id === id ? { ...r, [field]: value } : r))
  const removeSceneRow = (id: string) => setSceneRows((p) => p.filter((r) => r.id !== id))

  // ── File upload helper ────
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) return null
    const data = await res.json()
    return data.path || null
  }

  const onSubmit = async (data: FormData) => {
    if (tools.length === 0) { setToolsError('At least one tool is required'); setCurrentSection(2); return }
    if (!hasPrimaryTool) { setToolsError('Mark one tool as primary'); setCurrentSection(2); return }
    if (submissionMode === 'agency' && data.catalog_opt_in && !agencyLicensingAuth) {
      setError('Confirm licensing authorization to list in Showcase, or uncheck the Showcase option.')
      setCurrentSection(10)
      return
    }
    if (!indemnificationAccepted || !contentIntegrityAccepted || !scopeAcknowledged) { return }

    try {
      setIsSubmitting(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const runtime = (data.runtime_minutes || 0) * 60 + (data.runtime_seconds || 0)

      const submissionData: Record<string, any> = {
        user_id: session.user.id,
        filmmaker_name: session.user.user_metadata?.full_name || session.user.email || 'Unknown',
        filmmaker_contact: session.user.email || null,
        title: data.title,
        runtime,
        genre: data.genre || null,
        logline: data.logline || null,
        intended_use: JSON.stringify({
          primary_use: data.primary_use || null,
          suitable_categories: suitableCategories,
          excluded_categories: excludedCategories,
        }),
        tools_used: JSON.stringify(tools.map((t) => ({
          tool_name: t.toolName === 'Other' ? t.toolNameOther : t.toolName,
          version: t.version,
          plan_type: t.planType,
          start_date: t.startDate,
          end_date: t.endDate,
          receipt_url: t.receipt?.url || null,
          receipt_path: t.receipt?.path || null,
          is_primary: t.isPrimary,
        }))),
        authorship_statement: data.authorship_statement,
        likeness_confirmation: JSON.stringify(
          likenessPath === 'a'
            ? {
                no_real_faces: data.likeness_no_real_faces || false,
                no_real_voices: data.likeness_no_real_voices || false,
                no_lookalikes: data.likeness_no_lookalikes || false,
                no_synthetic_people: data.likeness_no_synthetic_people || false,
                path: 'a',
              }
            : { has_licensed_content: true, release_on_file: true, path: 'b' }
        ),
        likeness_release_path: likenessUploadPath || null,
        ip_confirmation: JSON.stringify(
          ipPath === 'a'
            ? {
                no_copyrighted_characters: data.ip_no_copyrighted_characters || false,
                no_brand_imitation: data.ip_no_brand_imitation || false,
                no_trademarked_ip: data.ip_no_trademarked_ip || false,
                path: 'a',
              }
            : ipPath === 'b'
            ? { has_licensed_content: true, license_on_file: true, path: 'b' }
            : { fair_use_claimed: true, path: 'c' }
        ),
        ip_license_path: ipUploadPath || null,
        fair_use_argument: fairUseArgument || null,
        fair_use_doc_path: fairUseDocPath || null,
        audio_disclosure: JSON.stringify({
          source_type: data.audio_source,
          license_path: audioLicensePath || null,
        }),
        territory_preferences: data.territory === 'Other' ? data.territory_other : data.territory,
        modification_authorized: false,
        modification_scope: null,
        supporting_materials: JSON.stringify([]),
        tier: 'si8_certified',
        submission_mode: submissionMode,
        status: 'pending',
        payment_status: 'unpaid',
        // New CertForm fields
        campaign_context: JSON.stringify({
          is_live_campaign: isLiveCampaign,
          budget_range: budgetRange || null,
          distribution_channels: distributionChannels,
        }),
        third_party_assets: JSON.stringify({
          has_third_party: hasThirdParty,
          items: hasThirdParty ? thirdPartyItems : [],
        }),
        post_gen_editing: JSON.stringify({
          has_post_gen_editing: hasPostGenEditing,
          tools_used: hasPostGenEditing ? postGenSoftware : [],
          description: hasPostGenEditing ? postGenDescription : '',
        }),
        scene_attribution: JSON.stringify({
          provided: sceneRows.length > 0,
          scenes: sceneRows,
        }),
        ai_percentage: aiPercentage,
        production_evidence_paths: JSON.stringify({ items: productionEvidenceItems, notes: productionEvidenceNotes }),
        client_name: submissionMode === 'agency' ? clientName : null,
        content_integrity_accepted: contentIntegrityAccepted,
        scope_acknowledged: scopeAcknowledged,
      }

      const catalogData = data.catalog_opt_in ? {
        catalog_opt_in: true,
        video_url: data.video_url,
        thumbnail_url: data.thumbnail_url || null,
        public_description: data.public_description || data.logline || null,
      } : null

      const subRes = await fetch('/api/submissions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionData, userId: session.user.id, catalogData }),
      })
      if (!subRes.ok) {
        const err = await subRes.json()
        throw new Error(err.error || 'Failed to create submission')
      }
      const { submission } = await subRes.json()

      const checkoutRes = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, creatorEmail: session.user.email, tier: 'si8_certified' }),
      })
      if (!checkoutRes.ok) throw new Error('Failed to create checkout session')
      const { url } = await checkoutRes.json()
      window.location.href = url
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>SI8 Certified — $499</CardTitle>
                <CardDescription className="mt-1">
                  90-minute human review · SI8 VERIFIED · COMMERCIAL AUDIT PASSED
                </CardDescription>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                SI8 CERTIFIED
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span className="font-medium">{SECTION_NAMES[currentSection]}</span>
                <span className="text-xs text-gray-400">Section {currentSection} of 11</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${(currentSection / 11) * 100}%` }} />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit, () => alert('Please fill out all required fields.'))} className="space-y-8">

              {/* ── Section 1: Production Details ── */}
              {currentSection === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">1. Production Details</h3>

                  {/* Submission mode */}
                  <div className="space-y-2">
                    <Label>Submission Mode *</Label>
                    <div className="flex gap-3">
                      {(['creator', 'agency'] as const).map((mode) => (
                        <button key={mode} type="button"
                          onClick={() => setSubmissionMode(mode)}
                          className={`flex-1 rounded-lg border-2 p-3 text-left text-sm transition-all ${submissionMode === mode ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="font-medium">{mode === 'creator' ? 'Individual Creator' : 'Agency / Production House'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{mode === 'creator' ? "I'm submitting my own work" : 'Submitting on behalf of a client'}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {submissionMode === 'agency' && (
                    <div>
                      <Label htmlFor="client_name">Client Name *</Label>
                      <Input id="client_name" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Brand or company name" />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="title">Film Title *</Label>
                    <Input id="title" {...register('title')} />
                    {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Runtime — Minutes</Label>
                      <Input type="number" {...register('runtime_minutes', { valueAsNumber: true })} />
                    </div>
                    <div>
                      <Label>Runtime — Seconds</Label>
                      <Input type="number" max="59" {...register('runtime_seconds', { valueAsNumber: true })} />
                    </div>
                  </div>

                  <div>
                    <Label>Genre</Label>
                    <select {...register('genre')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select genre...</option>
                      {['Narrative', 'Documentary', 'Experimental', 'Commercial', 'Music Video', 'Other'].map((g) => (
                        <option key={g} value={g.toLowerCase().replace(' ', '_')}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Logline (max 500 characters)</Label>
                    <textarea {...register('logline')} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" maxLength={500} />
                  </div>

                  <div>
                    <Label>Primary Intended Use</Label>
                    <select {...register('primary_use')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                      <option value="">Select...</option>
                      <option value="brand_commercial">Brand Commercial / Advertisement</option>
                      <option value="agency_deliverable">Agency Deliverable / Client Work</option>
                      <option value="streaming_submission">Streaming Platform Submission</option>
                      <option value="licensing_marketplace">Licensing Marketplace (Showcase)</option>
                      <option value="festival">Film Festival</option>
                      <option value="social_media">Social Media / YouTube</option>
                      <option value="portfolio">Portfolio / Personal Project</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Commercial context */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Commercial Context</p>
                    <p className="text-xs text-blue-700">Helps our reviewer understand how thorough to be. All fields optional.</p>

                    <div>
                      <Label className="text-sm">Is this for a live or active campaign?</Label>
                      <div className="flex gap-3 mt-2">
                        {[{ v: true, l: 'Yes — live campaign' }, { v: false, l: 'No — speculative / pre-launch' }].map(({ v, l }) => (
                          <button key={String(v)} type="button"
                            onClick={() => setIsLiveCampaign(v)}
                            className={`flex-1 text-sm rounded-lg border-2 p-2 transition-all ${isLiveCampaign === v ? 'border-blue-400 bg-blue-50 text-blue-800 font-medium' : 'border-gray-200 text-gray-700'}`}
                          >{l}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Campaign budget range (optional)</Label>
                      <select value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                        <option value="">Select...</option>
                        {BUDGET_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <Label className="text-sm">Distribution channels (check all that apply)</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {DISTRIBUTION_CHANNELS.map((c) => (
                          <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={distributionChannels.includes(c)} onChange={() => toggleChannel(c)} className="h-4 w-4" />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button type="button" onClick={() => setCurrentSection(2)}>Continue →</Button>
                </div>
              )}

              {/* ── Section 2: Tool Disclosure ── */}
              {currentSection === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">2. Tool Disclosure</h3>
                  <p className="text-sm text-gray-600">
                    Add all AI tools used in production. <strong>Receipts are required</strong> (proof of paid commercial plan). Free-plan tools will be flagged in the reviewer's report.
                  </p>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <strong>SI8 Certified requirement:</strong> Every tool must have a receipt showing you held a commercial plan during production. Tools without receipts will be flagged and may affect your risk rating.
                  </div>

                  <Button type="button" onClick={handleAddTool} variant="outline" className="w-full border-2 border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50">
                    + Add Tool
                  </Button>

                  {tools.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">Added Tools ({tools.length}):</p>
                      {tools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} onEdit={handleEditTool} onRemove={handleRemoveTool} />
                      ))}
                      {!hasPrimaryTool && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                          ⚠ No primary tool marked. Edit a tool and mark it as primary.
                        </p>
                      )}
                    </div>
                  )}
                  {toolsError && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">{toolsError}</div>}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(1)}>← Back</Button>
                    <Button type="button" onClick={() => {
                      if (tools.length === 0) { setToolsError('Please add at least one tool'); return }
                      if (!hasPrimaryTool) { setToolsError('Mark one tool as primary'); return }
                      setToolsError(null)
                      setCurrentSection(3)
                    }}>Continue →</Button>
                  </div>
                </div>
              )}

              {/* ── Section 3: Third-party Assets ── */}
              {currentSection === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">3. Third-party Assets</h3>
                  <p className="text-sm text-gray-600">Disclose any non-AI assets incorporated into the final film — stock footage, purchased 3D models, music from freelancers, etc.</p>

                  <div className="flex gap-3">
                    {[{ v: false, l: 'No — 100% AI-generated or original' }, { v: true, l: 'Yes — includes third-party assets' }].map(({ v, l }) => (
                      <button key={String(v)} type="button"
                        onClick={() => setHasThirdParty(v)}
                        className={`flex-1 text-sm rounded-lg border-2 p-3 text-left transition-all ${hasThirdParty === v ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  {hasThirdParty && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">List each third-party asset:</p>
                      {thirdPartyItems.map((item) => (
                        <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Asset Type</Label>
                              <select value={item.type} onChange={(e) => updateThirdPartyItem(item.id, 'type', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                                <option value="">Select type...</option>
                                {THIRD_PARTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs">License Status</Label>
                              <select value={item.license_status} onChange={(e) => updateThirdPartyItem(item.id, 'license_status', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                                <option value="">Select status...</option>
                                {THIRD_PARTY_LICENSES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Description</Label>
                            <Input value={item.description} onChange={(e) => updateThirdPartyItem(item.id, 'description', e.target.value)} placeholder="Brief description of the asset and its use in the film" className="mt-1 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">License document (optional — PDF, JPG, PNG, max 10MB)</Label>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              className="mt-1 block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                if (file.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return }
                                setUploadingThirdPartyId(item.id)
                                const path = await uploadFile(file, 'ip-licenses')
                                if (path) updateThirdPartyItem(item.id, 'file_path' as any, path)
                                setUploadingThirdPartyId(null)
                              }}
                            />
                            {uploadingThirdPartyId === item.id && <p className="text-xs text-blue-600 mt-1">Uploading...</p>}
                            {item.file_path && <p className="text-xs text-green-600 mt-1">✓ Document uploaded</p>}
                          </div>
                          <button type="button" onClick={() => removeThirdPartyItem(item.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addThirdPartyItem} className="w-full text-sm">+ Add Asset</Button>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(2)}>← Back</Button>
                    <Button type="button" onClick={() => setCurrentSection(4)}>Continue →</Button>
                  </div>
                </div>
              )}

              {/* ── Section 4: Human Authorship ── */}
              {currentSection === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">4. Human Authorship Declaration</h3>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                    <p className="font-semibold">What makes a strong authorship statement:</p>
                    <ul className="list-disc ml-4 space-y-0.5">
                      <li>Which specific scenes or sequences were AI-generated</li>
                      <li>What prompts, styles, or references you used (without exact prompt text)</li>
                      <li>How you iterated — what you rejected and why</li>
                      <li>What editorial decisions shaped the final output</li>
                      <li>Post-production work (color, edit, sound design)</li>
                    </ul>
                  </div>

                  <div>
                    <Label>Your Statement *</Label>
                    <textarea {...register('authorship_statement')} className="flex min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="Describe your creative process in detail..." />
                    <div className="flex justify-between mt-1">
                      {errors.authorship_statement && <p className="text-sm text-red-500">{errors.authorship_statement.message}</p>}
                      <p className={`text-xs ml-auto ${wordCountColor}`}>{wordCountLabel}</p>
                    </div>
                  </div>

                  {/* AI percentage */}
                  <div>
                    <Label className="text-sm">Estimated AI-generated content: <strong>{aiPercentage}%</strong></Label>
                    <input type="range" min={0} max={100} value={aiPercentage} onChange={(e) => setAiPercentage(Number(e.target.value))} className="w-full mt-2" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0% (all human)</span><span>100% (all AI)</span></div>
                  </div>

                  {/* Post-gen editing */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <Label className="text-sm font-semibold">Post-generation editing</Label>
                    <p className="text-xs text-gray-500">Did you add or composite any elements after AI generation? (color grading, text, graphics, composited footage)</p>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setHasPostGenEditing(false)} className={`flex-1 text-sm rounded-lg border-2 p-2 transition-all ${!hasPostGenEditing ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>No post-gen editing</button>
                      <button type="button" onClick={() => setHasPostGenEditing(true)} className={`flex-1 text-sm rounded-lg border-2 p-2 transition-all ${hasPostGenEditing ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>Yes — I added elements after generation</button>
                    </div>
                    {hasPostGenEditing && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <Label className="text-xs">Software used</Label>
                          <div className="grid grid-cols-3 gap-2 mt-1">
                            {POST_GEN_SOFTWARE.map((s) => (
                              <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <input type="checkbox" checked={postGenSoftware.includes(s)} onChange={() => toggleSoftware(s)} className="h-3.5 w-3.5" />
                                {s}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Description of what was added or changed</Label>
                          <textarea value={postGenDescription} onChange={(e) => setPostGenDescription(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="e.g., Added title cards in After Effects, color graded in DaVinci Resolve, composited lower-thirds..." />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scene attribution */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <Label className="text-sm font-semibold">Scene Attribution <span className="text-gray-400 font-normal">(optional but recommended)</span></Label>
                    <p className="text-xs text-gray-500">Map specific scenes or segments to the AI tool used and a brief prompt summary. Helps the reviewer assess risk by section — highly recommended for films over 3 minutes.</p>
                    {sceneRows.length === 0 ? (
                      <Button type="button" variant="outline" onClick={addSceneRow} className="text-sm">+ Add Scene Attribution</Button>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {sceneRows.map((row) => (
                            <div key={row.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <Input value={row.scene} onChange={(e) => updateSceneRow(row.id, 'scene', e.target.value)} placeholder="Scene / segment (e.g. Opening sequence)" className="text-xs" />
                                <div className="flex gap-1">
                                  <Input value={row.tool} onChange={(e) => updateSceneRow(row.id, 'tool', e.target.value)} placeholder="Tool used (e.g. Runway Gen-3)" className="text-xs flex-1" />
                                  <button type="button" onClick={() => removeSceneRow(row.id)} className="text-red-400 text-xs px-1.5">✕</button>
                                </div>
                              </div>
                              <div>
                                <textarea
                                  value={row.prompt_summary}
                                  onChange={(e) => {
                                    if (e.target.value.length <= 500) updateSceneRow(row.id, 'prompt_summary', e.target.value)
                                  }}
                                  placeholder="Prompt summary — describe the visual direction, style reference, or key prompt elements (no need to share exact prompts)"
                                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 min-h-[72px] focus:outline-none focus:border-amber-400 resize-y"
                                />
                                <div className="text-right text-xs text-gray-400">{row.prompt_summary.length}/500</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button type="button" variant="outline" onClick={addSceneRow} className="text-sm">+ Add Row</Button>
                      </>
                    )}
                  </div>

                  {/* Evidence Custodian */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="evidence_custodian" checked={evidenceCustodian} onChange={(e) => { setEvidenceCustodian(e.target.checked); if (e.target.checked) setEvidenceCustodianError(null) }} className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <Label htmlFor="evidence_custodian" className="cursor-pointer font-medium text-amber-900">Evidence Custodian Declaration *</Label>
                        <p className="text-xs text-amber-800 mt-1">I confirm that I retain my prompt logs, iteration records, and production notes internally. I will produce these records if legally challenged or requested by a distributor or E&O insurer. SI8 does not collect raw prompts.</p>
                      </div>
                    </div>
                    {evidenceCustodianError && <p className="text-sm text-red-500 mt-2 ml-7">{evidenceCustodianError}</p>}
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(3)}>← Back</Button>
                    <Button type="button" onClick={() => {
                      if (!evidenceCustodian) { setEvidenceCustodianError('You must confirm you retain your production records'); return }
                      setEvidenceCustodianError(null)
                      setCurrentSection(5)
                    }}>Continue →</Button>
                  </div>
                </div>
              )}

              {/* ── Section 5: Likeness & Identity ── */}
              {currentSection === 5 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">5. Likeness & Identity</h3>
                  <p className="text-sm text-gray-600">Choose the option that best describes your film:</p>

                  <div className="space-y-3">
                    {/* Path A */}
                    <div className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${likenessPath === 'a' ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`} onClick={() => setLikenessPath('a')}>
                      <div className="font-medium text-sm mb-3">All AI-generated — no real people</div>
                      {likenessPath === 'a' && (
                        <div className="space-y-2">
                          {[
                            ['likeness_no_real_faces', 'No real person faces without consent'],
                            ['likeness_no_real_voices', 'No real person voices without consent'],
                            ['likeness_no_lookalikes', 'No lookalikes or impersonation of real people'],
                            ['likeness_no_synthetic_people', 'No synthetic versions of real people (deepfakes)'],
                          ].map(([name, label]) => (
                            <div key={name} className="flex items-start gap-2">
                              <input type="checkbox" id={name} {...register(name as any)} className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <Label htmlFor={name} className="cursor-pointer text-sm font-normal">{label}</Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Path B */}
                    <div className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${likenessPath === 'b' ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`} onClick={() => setLikenessPath('b')}>
                      <div className="font-medium text-sm mb-1">I have a signed release on file</div>
                      <div className="text-xs text-gray-500 mb-3">Upload your signed release or consent agreement (required)</div>
                      {likenessPath === 'b' && (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs text-gray-600">Upload your release or consent document (PDF, DOC, JPG, PNG — max 10MB)</p>
                          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return }
                              setLikenessUploading(true)
                              const path = await uploadFile(file, 'likeness-releases')
                              setLikenessUploadPath(path)
                              setLikenessUploading(false)
                            }}
                          />
                          {likenessUploading && <p className="text-xs text-blue-600">Uploading...</p>}
                          {likenessUploadPath && <p className="text-xs text-green-600">✓ Release document uploaded</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  {likenessError && <p className="text-sm text-red-500">{likenessError}</p>}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(4)}>← Back</Button>
                    <Button type="button" onClick={() => {
                      if (!likenessPath) { setLikenessError('Please choose a path'); return }
                      if (likenessPath === 'a') {
                        const noneChecked = !watch('likeness_no_real_faces') && !watch('likeness_no_real_voices') && !watch('likeness_no_lookalikes') && !watch('likeness_no_synthetic_people')
                        if (noneChecked) { setLikenessError('Check at least one box to confirm'); return }
                      }
                      if (likenessPath === 'b' && !likenessUploadPath) { setLikenessError('Upload your release document to continue'); return }
                      setLikenessError(null)
                      setCurrentSection(6)
                    }}>Continue →</Button>
                  </div>
                </div>
              )}

              {/* ── Section 6: IP & Brand ── */}
              {currentSection === 6 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">6. IP & Brand</h3>
                  <p className="text-sm text-gray-600">Choose the option that best describes your film:</p>

                  <div className="space-y-3">
                    {/* Path A */}
                    <div className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${ipPath === 'a' ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`} onClick={() => setIpPath('a')}>
                      <div className="font-medium text-sm mb-3">All AI-generated — no licensed or third-party IP</div>
                      {ipPath === 'a' && (
                        <div className="space-y-2">
                          {[
                            ['ip_no_copyrighted_characters', 'No copyrighted characters (Marvel, Disney, anime, etc.)'],
                            ['ip_no_brand_imitation', 'No recognizable brand imitation (logos, trade dress, packaging)'],
                            ['ip_no_trademarked_ip', 'No trademarked intellectual property without authorization'],
                          ].map(([name, label]) => (
                            <div key={name} className="flex items-start gap-2">
                              <input type="checkbox" id={name} {...register(name as any)} className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <Label htmlFor={name} className="cursor-pointer text-sm font-normal">{label}</Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Path B */}
                    <div className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${ipPath === 'b' ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`} onClick={() => setIpPath('b')}>
                      <div className="font-medium text-sm mb-1">I have a license or authorization on file</div>
                      <div className="text-xs text-gray-500 mb-3">Upload your IP license or written authorization (required)</div>
                      {ipPath === 'b' && (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs text-gray-600">Upload your IP license or authorization document (PDF, DOC, JPG, PNG — max 10MB)</p>
                          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return }
                              setIpUploading(true)
                              const path = await uploadFile(file, 'ip-licenses')
                              setIpUploadPath(path)
                              setIpUploading(false)
                            }}
                          />
                          {ipUploading && <p className="text-xs text-blue-600">Uploading...</p>}
                          {ipUploadPath && <p className="text-xs text-green-600">✓ License document uploaded</p>}
                        </div>
                      )}
                    </div>

                    {/* Path C — Fair Use */}
                    <div className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${ipPath === 'c' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`} onClick={() => setIpPath('c')}>
                      <div className="font-medium text-sm mb-1">Fair use applies</div>
                      <div className="text-xs text-gray-500 mb-3">I believe this use qualifies as fair use (commentary, parody, transformative work)</div>
                      {ipPath === 'c' && (
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-yellow-800">
                                <strong>Fair use is not a guarantee of clearance.</strong> SI8 will document your argument in the Chain of Title, but fair use is a fact-specific legal determination. We strongly recommend obtaining a legal opinion letter from a media attorney before commercial deployment.
                              </p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Describe your fair use argument *</Label>
                            <textarea value={fairUseArgument} onChange={(e) => setFairUseArgument(e.target.value)} className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="Describe the transformative nature of your use, how it qualifies as commentary or parody, and why you believe it falls within fair use..." />
                          </div>
                          <div>
                            <Label className="text-xs">Supporting documentation (optional)</Label>
                            <p className="text-xs text-gray-500 mb-1">Upload a legal opinion letter or supporting analysis if you have one</p>
                            <input type="file" accept=".pdf,.doc,.docx"
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                setFairUseDocUploading(true)
                                const path = await uploadFile(file, 'fair-use-docs')
                                setFairUseDocPath(path)
                                setFairUseDocUploading(false)
                              }}
                            />
                            {fairUseDocUploading && <p className="text-xs text-blue-600">Uploading...</p>}
                            {fairUseDocPath && <p className="text-xs text-green-600">✓ Document uploaded</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {ipError && <p className="text-sm text-red-500">{ipError}</p>}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(5)}>← Back</Button>
                    <Button type="button" onClick={() => {
                      if (!ipPath) { setIpError('Please choose a path'); return }
                      if (ipPath === 'a') {
                        const noneChecked = !watch('ip_no_copyrighted_characters') && !watch('ip_no_brand_imitation') && !watch('ip_no_trademarked_ip')
                        if (noneChecked) { setIpError('Check at least one box in Path A'); return }
                      }
                      if (ipPath === 'b' && !ipUploadPath) { setIpError('Upload your license document to continue'); return }
                      if (ipPath === 'c' && !fairUseArgument.trim()) { setIpError('Describe your fair use argument to continue'); return }
                      setIpError(null)
                      setCurrentSection(7)
                    }}>Continue →</Button>
                  </div>
                </div>
              )}

              {/* ── Section 7: Audio & Music ── */}
              {currentSection === 7 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">7. Audio & Music</h3>
                  <div>
                    <Label>Audio Source *</Label>
                    <select {...register('audio_source')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                      <option value="ai_generated">AI-generated audio (original, commercial license)</option>
                      <option value="licensed">Licensed audio (sync license or library — documentation required)</option>
                      <option value="silent">Silent / no audio</option>
                    </select>
                  </div>
                  {watch('audio_source') === 'licensed' && (
                    <div className="space-y-2">
                      <Label>License Documentation *</Label>
                      <p className="text-xs text-gray-500">Upload your music/audio license, sync license, or permission letter (PDF, JPG, PNG — max 10MB)</p>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return }
                          setAudioLicenseUploading(true)
                          const path = await uploadFile(file, 'audio-docs')
                          setAudioLicensePath(path)
                          setAudioLicenseUploading(false)
                        }}
                      />
                      {audioLicenseUploading && <p className="text-xs text-blue-600">Uploading...</p>}
                      {audioLicensePath && <p className="text-xs text-green-600">✓ Audio license uploaded</p>}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(6)}>← Back</Button>
                    <Button type="button" onClick={() => {
                      if (watch('audio_source') === 'licensed' && !audioLicensePath) { alert('Upload your audio license documentation before continuing'); return }
                      setCurrentSection(8)
                    }}>Continue →</Button>
                  </div>
                </div>
              )}

              {/* ── Section 8: Production Evidence (optional) ── */}
              {currentSection === 8 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">8. Production Evidence <span className="text-gray-400 font-normal text-sm">(optional)</span></h3>
                  <p className="text-sm text-gray-600">
                    Upload generation screenshots, session exports, iteration samples, or other production documentation.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    <strong>Why provide evidence?</strong> Production evidence helps our reviewer assess your workflow rigorously, may reduce reviewer questions, and is highly recommended if you plan to submit to E&O insurers. It does not affect your approval — it supplements the reviewer's analysis.
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setHasProductionEvidence(false)} className={`flex-1 text-sm rounded-lg border-2 p-2 transition-all ${!hasProductionEvidence ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>Skip</button>
                    <button type="button" onClick={() => setHasProductionEvidence(true)} className={`flex-1 text-sm rounded-lg border-2 p-2 transition-all ${hasProductionEvidence ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>Yes — upload production evidence</button>
                  </div>

                  {hasProductionEvidence && (
                    <div className="space-y-4">
                      {/* Per-file items */}
                      {productionEvidenceItems.length > 0 && (
                        <div className="space-y-2">
                          {productionEvidenceItems.map((item, i) => (
                            <div key={item.id} className="flex items-center justify-between text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-green-700 font-medium">✓</span>
                                <span className="text-gray-700 font-medium truncate">{item.title || `File ${i + 1}`}</span>
                                <span className="text-gray-400">·</span>
                                <span className="text-gray-500">{item.type}</span>
                              </div>
                              <button type="button" onClick={() => setProductionEvidenceItems((prev) => prev.filter((x) => x.id !== item.id))} className="text-red-400 hover:underline ml-2 flex-shrink-0">Remove</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new file */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700">Add a file</p>
                        <EvidenceUploader
                          onAdd={(item) => setProductionEvidenceItems((p) => [...p, item])}
                          uploadFile={uploadFile}
                        />
                      </div>

                      {/* General notes */}
                      <div>
                        <Label className="text-xs">General production notes (optional)</Label>
                        <textarea
                          value={productionEvidenceNotes}
                          onChange={(e) => setProductionEvidenceNotes(e.target.value)}
                          placeholder="Any context that helps the reviewer understand your production workflow, tools used, iteration process, or anything not captured in the files above..."
                          className="w-full text-sm border border-gray-200 rounded px-3 py-2 mt-1 min-h-[80px] focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(7)}>← Back</Button>
                    <Button type="button" onClick={() => setCurrentSection(9)}>Continue →</Button>
                  </div>
                </div>
              )}

              {/* ── Section 9: Territory (creator) / Client Info (agency) ── */}
              {currentSection === 9 && (
                <div className="space-y-4">
                  {submissionMode === 'creator' ? (
                    <>
                      <h3 className="text-lg font-semibold">9. Territory</h3>
                      <div>
                        <Label>Territory *</Label>
                        <select {...register('territory')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                          <option value="Global">Global (Worldwide)</option>
                          <option value="North America">North America</option>
                          <option value="Europe">Europe</option>
                          <option value="Asia">Asia</option>
                          <option value="Other">Other (specify below)</option>
                        </select>
                      </div>
                      {watch('territory') === 'Other' && (
                        <div>
                          <Label>Specify Territory *</Label>
                          <Input {...register('territory_other')} placeholder="e.g., South America, Middle East, Taiwan..." />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold">9. Commercial Context</h3>
                      <div>
                        <Label>Client Name *</Label>
                        <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Brand or company name" />
                        <p className="text-xs text-gray-500 mt-1">Documented in Chain of Title. Used to identify the end client for this submission.</p>
                      </div>
                      <div>
                        <Label>Intended territory for this campaign (optional)</Label>
                        <select {...register('territory')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                          <option value="Global">Global (Worldwide)</option>
                          <option value="North America">North America</option>
                          <option value="Europe">Europe</option>
                          <option value="Asia">Asia</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(8)}>← Back</Button>
                    <Button type="button" onClick={() => {
                      if (submissionMode === 'agency' && !clientName.trim()) { alert('Client name is required for agency submissions'); return }
                      setCurrentSection(10)
                    }}>Continue →</Button>
                  </div>
                </div>
              )}

              {/* ── Section 10: Video & Showcase ── */}
              {currentSection === 10 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">10. Video & Showcase</h3>
                  <div>
                    <Label>Video Screening Link *</Label>
                    <Input placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." {...register('video_url')} />
                    {errors.video_url && <p className="text-sm text-red-500 mt-1">{errors.video_url.message}</p>}
                    <p className="text-xs text-gray-500 mt-1">YouTube or Vimeo. Unlisted or public — do not set to private.</p>
                  </div>
                  <div>
                    <Label>Thumbnail URL (optional)</Label>
                    <Input placeholder="https://..." {...register('thumbnail_url')} />
                  </div>
                  <div>
                    <Label>Showcase Description (optional)</Label>
                    <textarea className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md" placeholder="Brief description for Showcase (max 500 characters)" {...register('public_description')} />
                    <p className="text-xs text-gray-500 mt-1">If not provided, we'll use your logline.</p>
                  </div>

                  {/* Showcase opt-in — available for all submission modes */}
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="catalog_opt_in" {...register('catalog_opt_in')} className="mt-1" />
                      <div>
                        <Label htmlFor="catalog_opt_in" className="cursor-pointer font-medium">List in Showcase (after approval)</Label>
                        <p className="text-xs text-gray-600 mt-1">
                          {submissionMode === 'creator'
                            ? 'Your film appears in SI8 Showcase with a Rights Verified badge. Brands can discover and license your work — you keep 80%.'
                            : 'The film appears in SI8 Showcase with a Rights Verified badge. Brands can discover and license the content — the rights holder keeps 80%.'}
                        </p>
                      </div>
                    </div>

                    {/* Agency licensing auth — required when agency opts in */}
                    {submissionMode === 'agency' && watch('catalog_opt_in') && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="agency_licensing_auth"
                            checked={agencyLicensingAuth}
                            onChange={(e) => setAgencyLicensingAuth(e.target.checked)}
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                          />
                          <Label htmlFor="agency_licensing_auth" className="cursor-pointer text-xs font-normal text-blue-900">
                            I confirm I hold the rights (or have written client authorization) to license this content through SI8 Showcase. The client has been informed.
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Brand suitability — shown whenever showcase is opted in */}
                  {watch('catalog_opt_in') && (
                    <>
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <Label className="text-sm font-semibold">Brand Suitability (Showcase)</Label>
                        <p className="text-xs text-gray-500">Check all brand categories this content is appropriate for. Documented in your Chain of Title.</p>
                        <div className="grid grid-cols-2 gap-2">
                          {SUITABLE_CATEGORIES.map((cat) => (
                            <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" checked={suitableCategories.includes(cat)} onChange={() => toggleCat(cat, suitableCategories, setSuitableCategories)} className="h-4 w-4" />
                              <span>{cat}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 bg-red-50 p-4 rounded-lg border border-red-100">
                        <Label className="text-sm font-semibold text-red-800">Do NOT Use With</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {EXCLUDED_CATEGORIES.map((cat) => (
                            <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" checked={excludedCategories.includes(cat)} onChange={() => toggleCat(cat, excludedCategories, setExcludedCategories)} className="h-4 w-4" />
                              <span>{cat}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(9)}>← Back</Button>
                    <Button type="button" onClick={() => setCurrentSection(11)}>Continue →</Button>
                  </div>
                </div>
              )}

              {/* ── Section 11: Review & Submit ── */}
              {currentSection === 11 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">11. Review & Submit</h3>

                  {/* What's included */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-900">SI8 Certified — $499</p>
                    <div className="space-y-1 text-sm">
                      {[
                        '90-minute human review by SI8',
                        'Chain of Title PDF: SI8 VERIFIED · COMMERCIAL AUDIT PASSED',
                        'Risk Rating output (Low / Standard / Elevated / High)',
                        'Accepted by brand legal teams and E&O underwriters',
                        'Delivery within 5 business days',
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-2">
                    <p className="font-medium text-gray-900">Your submission</p>
                    <div className="flex justify-between text-gray-700"><span>Film</span><span className="font-medium">{watch('title') || '—'}</span></div>
                    <div className="flex justify-between text-gray-700"><span>Mode</span><span className="capitalize">{submissionMode}</span></div>
                    <div className="flex justify-between text-gray-700"><span>Tools</span><span>{tools.length} tool{tools.length !== 1 ? 's' : ''}</span></div>
                    <div className="flex justify-between text-gray-700"><span>Audio</span><span className="capitalize">{watch('audio_source')?.replace('_', ' ') || '—'}</span></div>
                  </div>

                  {/* Legal checkboxes */}
                  <div className="space-y-4">
                    {/* Evidence Custodian (if not done in S4) */}
                    {!evidenceCustodian && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <input type="checkbox" id="ec2" checked={evidenceCustodian} onChange={(e) => setEvidenceCustodian(e.target.checked)} className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <Label htmlFor="ec2" className="cursor-pointer font-medium text-amber-900">Evidence Custodian Declaration *</Label>
                            <p className="text-xs text-amber-800 mt-1">I confirm that I retain my prompt logs, iteration records, and production notes internally and will produce them if legally challenged.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Indemnification */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" id="indemnification" checked={indemnificationAccepted} onChange={(e) => setIndemnificationAccepted(e.target.checked)} className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <Label htmlFor="indemnification" className="cursor-pointer font-medium">Indemnification Warranty *</Label>
                          <p className="text-xs text-gray-700 mt-1">I warrant the accuracy of all information provided. I agree to indemnify SuperImmersive 8 (PMF Strategy Inc. d/b/a SuperImmersive 8) from any third-party claims arising from inaccurate or incomplete disclosures.</p>
                        </div>
                      </div>
                    </div>

                    {/* Content Integrity */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" id="content_integrity" checked={contentIntegrityAccepted} onChange={(e) => setContentIntegrityAccepted(e.target.checked)} className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <Label htmlFor="content_integrity" className="cursor-pointer font-medium">Content Integrity Declaration *</Label>
                          <p className="text-xs text-gray-700 mt-1">I confirm that the version submitted for review is the final intended version. I understand that material modifications to the film after review will require a new submission and review fee.</p>
                        </div>
                      </div>
                    </div>

                    {/* Scope of Review */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" id="scope_ack" checked={scopeAcknowledged} onChange={(e) => setScopeAcknowledged(e.target.checked)} className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <Label htmlFor="scope_ack" className="cursor-pointer font-medium">Scope of Review Acknowledgment *</Label>
                          <p className="text-xs text-gray-700 mt-1">I understand that SI8 provides structured documentation and a structured audit process. SI8 is not a law firm and this review does not constitute legal advice or a guarantee against third-party claims.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(!indemnificationAccepted || !contentIntegrityAccepted || !scopeAcknowledged || !evidenceCustodian) && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      All four declarations must be accepted to proceed to payment.
                    </p>
                  )}

                  {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">{error}</div>}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(10)}>← Back</Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !indemnificationAccepted || !contentIntegrityAccepted || !scopeAcknowledged || !evidenceCustodian}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40"
                    >
                      {isSubmitting ? 'Processing...' : 'Proceed to Payment — $499'}
                    </Button>
                  </div>
                </div>
              )}

            </form>
          </CardContent>
        </Card>
      </div>

      {/* AddToolModal */}
      <AddToolModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTool}
        editTool={editingTool}
        userId={userId}
        requireReceipt={true}
      />
    </div>
  )
}
