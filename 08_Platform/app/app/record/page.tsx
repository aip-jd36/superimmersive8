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
import { CheckCircle, Clock, FileText, Star } from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length

const getDeliveryDate = (): string => {
  const date = new Date()
  let daysAdded = 0
  while (daysAdded < 5) {
    date.setDate(date.getDate() + 1)
    if (date.getDay() !== 0 && date.getDay() !== 6) daysAdded++
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

const SECTION_NAMES: Record<number, string> = {
  1: 'Tier Selection',
  2: 'Production Details',
  3: 'Tool Disclosure',
  4: 'Human Authorship',
  5: 'Likeness & Identity',
  6: 'IP & Brand',
  7: 'Audio & Music',
  8: 'Territory',
  9: 'Video & Showcase',
  10: 'Review & Payment',
}

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

// ─── Chain of Title Callout ──────────────────────────────────────────────────

function ChainOfTitleCallout({
  fieldNumber,
  fieldName,
  description,
}: {
  fieldNumber: number
  fieldName: string
  description: string
}) {
  return (
    <div className="flex items-start gap-2 mt-1 mb-4 bg-amber-50 border-l-4 border-amber-400 px-3 py-2 rounded-r text-xs">
      <span className="font-bold text-amber-700 whitespace-nowrap flex-shrink-0">
        Field {fieldNumber}:
      </span>
      <span className="text-amber-800">
        <span className="font-semibold">{fieldName}</span> — {description}
      </span>
    </div>
  )
}

// ─── Chain of Title Sidebar ───────────────────────────────────────────────────

function COTSidebar({
  currentSection,
  tools,
  territory,
  suitableCategories,
  excludedCategories,
  primaryUse,
}: {
  currentSection: number
  tools: Tool[]
  territory: string
  suitableCategories: string[]
  excludedCategories: string[]
  primaryUse: string
}) {
  const primaryTool = tools.find(t => t.isPrimary) || tools[0]

  const fields = [
    {
      num: 1,
      name: 'Tool Provenance Log',
      populatedBy: 3,
      value: tools.length > 0
        ? `${tools.length} tool${tools.length !== 1 ? 's' : ''} documented${primaryTool ? ` — primary: ${primaryTool.toolName === 'Other' ? primaryTool.toolNameOther : primaryTool.toolName}` : ''}`
        : null,
    },
    {
      num: 2,
      name: 'Model Disclosure',
      populatedBy: 3,
      value: tools.length > 0 ? 'Training data status: under review' : null,
    },
    {
      num: 3,
      name: 'Rights Verified Sign-off',
      populatedBy: null,
      value: 'Pending human review (5 business days)',
    },
    {
      num: 4,
      name: 'Commercial Use Authorization',
      populatedBy: null,
      value: 'Issued on approval: CLEARED FOR COMMERCIAL USE',
    },
    {
      num: 5,
      name: 'Modification Rights',
      populatedBy: null,
      value: 'Not authorized — creator retains control',
    },
    {
      num: 6,
      name: 'Category Conflict Log',
      populatedBy: 2,
      value:
        suitableCategories.length > 0 || excludedCategories.length > 0
          ? `${suitableCategories.length} suitable, ${excludedCategories.length} excluded`
          : null,
    },
    {
      num: 7,
      name: 'Territory Log',
      populatedBy: 8,
      value: territory && territory !== 'Global' ? territory : territory === 'Global' ? 'Global (worldwide)' : null,
    },
    {
      num: 8,
      name: 'Regeneration Rights',
      populatedBy: null,
      value: 'Not authorized (standard)',
    },
    {
      num: 9,
      name: 'Version History',
      populatedBy: null,
      value: `V1.0 — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-gray-900">Your Chain of Title</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        This document is built from your answers. Fields fill in as you complete each section.
      </p>
      <div className="space-y-2">
        {fields.map((field) => {
          const isActiveSection = field.populatedBy === currentSection
          const isComplete = !!field.value && field.populatedBy !== null && currentSection > (field.populatedBy || 0)
          const isAuto = field.populatedBy === null

          return (
            <div
              key={field.num}
              className={`p-2 rounded text-xs border transition-all ${
                isActiveSection
                  ? 'bg-amber-50 border-amber-300'
                  : isComplete
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className={`font-semibold ${isActiveSection ? 'text-amber-800' : isComplete ? 'text-green-800' : 'text-gray-600'}`}>
                {field.num}. {field.name}
                {isActiveSection && <span className="ml-1 text-amber-600">← now</span>}
              </div>
              {field.value && (
                <div className={`mt-0.5 ${isAuto ? 'text-gray-500 italic' : isComplete ? 'text-green-700' : 'text-gray-500 italic'}`}>
                  {!isAuto && isComplete && '✓ '}{field.value}
                </div>
              )}
              {!field.value && field.populatedBy && (
                <div className="mt-0.5 text-gray-400 italic">
                  Complete section {field.populatedBy}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const submissionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  runtime_minutes: z.number().min(0).optional(),
  runtime_seconds: z.number().min(0).max(59).optional(),
  genre: z.string().optional(),
  logline: z.string().max(500).optional(),

  // Section 2 — Intended Use
  primary_use: z.enum([
    'brand_commercial', 'streaming_submission', 'festival', 'social_media',
    'licensing_marketplace', 'agency_deliverable', 'portfolio', 'other',
  ]).optional(),

  // Section 4 — Authorship (150 WORDS minimum)
  authorship_statement: z.string().refine(
    (val) => countWords(val) >= 150,
    { message: 'Must be at least 150 words — describe your creative process in detail' }
  ),

  // Section 5 — Likeness
  likeness_no_real_faces: z.boolean().optional(),
  likeness_no_real_voices: z.boolean().optional(),
  likeness_no_lookalikes: z.boolean().optional(),
  likeness_no_synthetic_people: z.boolean().optional(),
  likeness_has_licensed_content: z.boolean().optional(),
  likeness_license_notes: z.string().optional(),

  // Section 6 — IP
  ip_no_copyrighted_characters: z.boolean().optional(),
  ip_no_brand_imitation: z.boolean().optional(),
  ip_no_trademarked_ip: z.boolean().optional(),
  ip_has_licensed_content: z.boolean().optional(),
  ip_license_notes: z.string().optional(),

  // Section 7 — Audio
  audio_source: z.enum(['ai_generated', 'licensed', 'silent']),
  audio_documentation: z.string().optional(),

  // Section 8 — Territory
  territory: z.enum(['Global', 'North America', 'Europe', 'Asia', 'Other'], {
    required_error: 'Please select a territory',
  }),
  territory_other: z.string().optional(),
  existing_restrictions: z.string().optional(),

  // Section 9 — Video & Showcase
  video_url: z.string().url('Must be a valid URL (YouTube or Vimeo)').min(1, 'Video URL is required'),
  thumbnail_url: z.string().url().optional(),
  public_description: z.string().max(500).optional(),
  catalog_opt_in: z.boolean().default(false),
})

type SubmissionFormData = z.infer<typeof submissionSchema>

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SubmitPage() {
  const router = useRouter()
  const [currentSection, setCurrentSection] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tools, setTools] = useState<Tool[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const [toolsError, setToolsError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [selectedTier, setSelectedTier] = useState<'creator_record' | 'certified' | null>(null)
  const [submissionMode, setSubmissionMode] = useState<'creator' | 'agency'>('creator')
  const [tierError, setTierError] = useState<string | null>(null)
  const [evidenceCustodian, setEvidenceCustodian] = useState(false)
  const [evidenceCustodianError, setEvidenceCustodianError] = useState<string | null>(null)
  const [likenessError, setLikenessError] = useState<string | null>(null)
  const [ipError, setIpError] = useState<string | null>(null)
  const [audioLicensePath, setAudioLicensePath] = useState<string | null>(null)
  const [audioLicenseUploading, setAudioLicenseUploading] = useState(false)
  const [indemnificationAccepted, setIndemnificationAccepted] = useState(false)
  const [indemnificationError, setIndemnificationError] = useState<string | null>(null)
  // Brand safety state
  const [suitableCategories, setSuitableCategories] = useState<string[]>([])
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      territory: 'Global',
      likeness_no_real_faces: false,
      likeness_no_real_voices: false,
      likeness_no_lookalikes: false,
      likeness_no_synthetic_people: false,
      ip_no_copyrighted_characters: false,
      ip_no_brand_imitation: false,
      ip_no_trademarked_ip: false,
      catalog_opt_in: false,
    },
  })

  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) setUserId(session.user.id)
    }
    getUserId()
  }, [supabase])

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'checkout_started', {
        event_category: 'Conversion',
        event_label: 'Creator Record $29',
        value: 29
      })
    }
  }, [])

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem('submission-draft', JSON.stringify(value))
    })
    return () => subscription.unsubscribe()
  }, [watch])

  useEffect(() => {
    const draft = localStorage.getItem('submission-draft')
    if (draft) {
      const parsed = JSON.parse(draft)
      Object.keys(parsed).forEach((key) => {
        setValue(key as any, parsed[key])
      })
    }
  }, [setValue])

  // Tool management
  const hasPrimaryTool = tools.some(t => t.isPrimary)

  const handleAddTool = () => { setEditingTool(null); setIsModalOpen(true) }
  const handleEditTool = (tool: Tool) => { setEditingTool(tool); setIsModalOpen(true) }

  const handleSaveTool = (tool: Tool) => {
    // If new tool is marked primary, unmark all others
    let updated = editingTool
      ? tools.map(t => t.id === tool.id ? tool : t)
      : [...tools, tool]
    if (tool.isPrimary) {
      updated = updated.map(t => t.id === tool.id ? t : { ...t, isPrimary: false })
    }
    setTools(updated)
    setToolsError(null)
  }

  const handleRemoveTool = (toolId: string) => {
    const remaining = tools.filter(t => t.id !== toolId)
    // If removed tool was primary and others exist, auto-assign first as primary
    const removedWasPrimary = tools.find(t => t.id === toolId)?.isPrimary
    if (removedWasPrimary && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isPrimary: true }
    }
    setTools(remaining)
  }

  const toggleCategory = (
    category: string,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    setList(list.includes(category) ? list.filter(c => c !== category) : [...list, category])
  }

  // Word count helpers
  const authorshipText = watch('authorship_statement') || ''
  const wordCount = countWords(authorshipText)
  const wordCountColor =
    wordCount === 0 ? 'text-gray-400'
    : wordCount < 150 ? 'text-red-500 font-semibold'
    : wordCount < 300 ? 'text-amber-600 font-medium'
    : 'text-green-600 font-medium'
  const wordCountLabel =
    wordCount < 150 ? `${wordCount} / 150 words minimum`
    : wordCount < 300 ? `${wordCount} words — Good`
    : `${wordCount} words — Strong`

  const onSubmit = async (data: SubmissionFormData) => {
    if (tools.length === 0) {
      setToolsError('At least one tool must be added')
      setCurrentSection(3)
      return
    }
    if (!indemnificationAccepted) {
      setIndemnificationError('You must accept the accuracy warranty to proceed')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const user_id = session.user.id

      const runtime_seconds = (data.runtime_minutes || 0) * 60 + (data.runtime_seconds || 0)

      const submissionData = {
        user_id,
        filmmaker_name: session.user.user_metadata?.full_name || session.user.email || 'Unknown',
        filmmaker_location: null,
        filmmaker_contact: session.user.email || null,
        filmmaker_portfolio_links: null,
        title: data.title,
        runtime: runtime_seconds,
        genre: data.genre || null,
        logline: data.logline || null,
        // Store brand safety + intended use as structured JSON
        intended_use: JSON.stringify({
          primary_use: data.primary_use || null,
          suitable_categories: suitableCategories,
          excluded_categories: excludedCategories,
        }),
        tools_used: JSON.stringify(tools.map(tool => ({
          tool_name: tool.toolName === 'Other' ? tool.toolNameOther : tool.toolName,
          version: tool.version,
          plan_type: tool.planType,
          start_date: tool.startDate,
          end_date: tool.endDate,
          receipt_url: tool.receipt?.url || null,
          receipt_path: tool.receipt?.path || null,
          is_primary: tool.isPrimary,
        }))),
        authorship_statement: data.authorship_statement,
        likeness_confirmation: JSON.stringify({
          no_real_faces: data.likeness_no_real_faces || false,
          no_real_voices: data.likeness_no_real_voices || false,
          no_lookalikes: data.likeness_no_lookalikes || false,
          no_synthetic_people: data.likeness_no_synthetic_people || false,
          all_confirmed: !!(data.likeness_no_real_faces && data.likeness_no_real_voices && data.likeness_no_lookalikes && data.likeness_no_synthetic_people),
          has_licensed_content: watch('likeness_has_licensed_content') || false,
          license_notes: watch('likeness_license_notes') || null,
        }),
        ip_confirmation: JSON.stringify({
          no_copyrighted_characters: data.ip_no_copyrighted_characters || false,
          no_brand_imitation: data.ip_no_brand_imitation || false,
          no_trademarked_ip: data.ip_no_trademarked_ip || false,
          all_confirmed: !!(data.ip_no_copyrighted_characters && data.ip_no_brand_imitation && data.ip_no_trademarked_ip),
          has_licensed_content: watch('ip_has_licensed_content') || false,
          license_notes: watch('ip_license_notes') || null,
        }),
        audio_disclosure: JSON.stringify({
          source_type: data.audio_source || 'not_specified',
          documentation: data.audio_documentation || null,
          license_path: audioLicensePath || null,
        }),
        modification_authorized: false,
        modification_scope: null,
        territory_preferences: data.territory === 'Other' ? data.territory_other : data.territory,
        supporting_materials: JSON.stringify([]),
        tier: selectedTier || 'certified',
        submission_mode: submissionMode,
        status: 'pending',
        payment_status: 'unpaid',
      }

      const catalogData = data.catalog_opt_in ? {
        catalog_opt_in: true,
        video_url: data.video_url,
        thumbnail_url: data.thumbnail_url || null,
        public_description: data.public_description || data.logline || null,
      } : null

      const submissionResponse = await fetch('/api/submissions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionData, userId: user_id, catalogData }),
      })

      if (!submissionResponse.ok) {
        const err = await submissionResponse.json()
        throw new Error(err.error || 'Failed to create submission')
      }

      const { submission } = await submissionResponse.json()

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          creatorEmail: session.user.email,
          tier: selectedTier || 'certified',
        }),
      })

      if (!response.ok) throw new Error('Failed to create checkout session')
      const { url } = await response.json()
      localStorage.removeItem('submission-draft')
      window.location.href = url
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setIsSubmitting(false)
    }
  }

  const isCertified = selectedTier === 'certified'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className={`mx-auto px-4 ${isCertified ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <div className={isCertified ? 'grid grid-cols-1 lg:grid-cols-3 gap-8' : ''}>

          {/* ── Form ── */}
          <div className={isCertified ? 'lg:col-span-2' : ''}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Submit for Rights Verified</CardTitle>
                    <CardDescription className="mt-1">
                      {selectedTier === 'creator_record'
                        ? 'Creator Record — $29 · Self-attested documentation, automated delivery'
                        : selectedTier === 'certified'
                        ? 'SI8 Certified — $499 · 90-minute human review, cleared for commercial use'
                        : 'Complete all sections to submit your AI video for verification'}
                    </CardDescription>
                  </div>
                  {selectedTier && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      selectedTier === 'certified'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedTier === 'certified' ? 'SI8 CERTIFIED' : 'CREATOR RECORD'}
                    </span>
                  )}
                </div>
                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span className="font-medium">{SECTION_NAMES[currentSection]}</span>
                    <span className="text-xs text-gray-400">Section {currentSection} of 10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${(currentSection / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit(onSubmit, (errs) => {
                  console.log('❌ Validation errors:', errs)
                  alert('Please fill out all required fields.')
                })} className="space-y-8">

                  {/* ── Section 1: Tier Selection ── */}
                  {currentSection === 1 && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold">1. Choose Your Verification Tier</h3>

                      <div className="space-y-3">
                        <Label>Which verification do you need? *</Label>

                        <div
                          onClick={() => { setSelectedTier('creator_record'); setSubmissionMode('creator') }}
                          className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${selectedTier === 'creator_record' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">Creator Record — $29</div>
                              <div className="text-sm text-gray-600 mt-1">Self-attested documentation. Automated, instant delivery. <strong>NOT for commercial use.</strong></div>
                              <div className="text-xs text-gray-500 mt-1">Indie creators, social media, YouTube, portfolio, festivals</div>
                            </div>
                            <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 ${selectedTier === 'creator_record' ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`} />
                          </div>
                        </div>

                        <div
                          onClick={() => setSelectedTier('certified')}
                          className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${selectedTier === 'certified' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold flex items-center gap-2">
                                SI8 Certified — $499
                                <span className="text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">COMMERCIAL USE</span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">90-minute human review. Cleared for commercial use. Satisfies brand legal teams and E&O insurers.</div>
                              <div className="text-xs text-gray-500 mt-1">Agencies, brands, production houses, streaming submissions</div>
                            </div>
                            <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 ${selectedTier === 'certified' ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`} />
                          </div>
                        </div>
                      </div>

                      {selectedTier === 'certified' && (
                        <div className="space-y-3">
                          <Label>How are you submitting? *</Label>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setSubmissionMode('creator')}
                              className={`flex-1 rounded-lg border-2 p-3 text-left text-sm transition-all ${submissionMode === 'creator' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                              <div className="font-medium">Individual Creator</div>
                              <div className="text-xs text-gray-500 mt-0.5">I'm submitting my own work</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSubmissionMode('agency')}
                              className={`flex-1 rounded-lg border-2 p-3 text-left text-sm transition-all ${submissionMode === 'agency' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                              <div className="font-medium">Agency / Production House</div>
                              <div className="text-xs text-gray-500 mt-0.5">Submitting on behalf of a client</div>
                            </button>
                          </div>
                        </div>
                      )}

                      {tierError && <p className="text-sm text-red-500">{tierError}</p>}
                      <p className="text-sm text-gray-500">Your profile information is automatically filled from your account settings.</p>

                      <Button
                        type="button"
                        onClick={() => {
                          if (!selectedTier) {
                            setTierError('Please select a verification tier to continue')
                          } else {
                            setTierError(null)
                            setCurrentSection(2)
                          }
                        }}
                      >
                        Continue →
                      </Button>
                    </div>
                  )}

                  {/* ── Section 2: Production Details + Brand Safety ── */}
                  {currentSection === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">2. Production Details & Intended Use</h3>

                      <ChainOfTitleCallout
                        fieldNumber={6}
                        fieldName="Category Conflict Log"
                        description="Your intended use and brand suitability answers populate this field. Buyers and legal teams use it to assess licensing eligibility."
                      />

                      <div>
                        <Label htmlFor="title">Film Title *</Label>
                        <Input id="title" {...register('title')} />
                        {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="runtime_minutes">Runtime (Minutes)</Label>
                          <Input id="runtime_minutes" type="number" {...register('runtime_minutes', { valueAsNumber: true })} />
                        </div>
                        <div>
                          <Label htmlFor="runtime_seconds">Runtime (Seconds)</Label>
                          <Input id="runtime_seconds" type="number" max="59" {...register('runtime_seconds', { valueAsNumber: true })} />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="genre">Genre</Label>
                        <select id="genre" {...register('genre')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="">Select genre...</option>
                          <option value="narrative">Narrative</option>
                          <option value="documentary">Documentary</option>
                          <option value="experimental">Experimental</option>
                          <option value="commercial">Commercial</option>
                          <option value="music_video">Music Video</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="logline">Logline (max 500 characters)</Label>
                        <textarea id="logline" {...register('logline')} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" maxLength={500} />
                      </div>

                      {/* Intended Use */}
                      <div>
                        <Label htmlFor="primary_use">Primary Intended Use</Label>
                        <select id="primary_use" {...register('primary_use')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                          <option value="">Select intended use...</option>
                          <option value="brand_commercial">Brand Commercial / Advertisement</option>
                          <option value="agency_deliverable">Agency Deliverable / Client Work</option>
                          <option value="streaming_submission">Streaming Platform Submission</option>
                          <option value="licensing_marketplace">Licensing Marketplace (Showcase)</option>
                          <option value="festival">Film Festival</option>
                          <option value="social_media">Social Media / YouTube</option>
                          <option value="portfolio">Portfolio / Personal Project</option>
                          <option value="other">Other</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Used to assess appropriate licensing categories and brand safety requirements.</p>
                      </div>

                      {/* Brand Safety — Suitable Categories */}
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <Label className="text-sm font-semibold">Brand Categories — Suitable For</Label>
                        <p className="text-xs text-gray-500">Check all brand categories this content is appropriate for.</p>
                        <div className="grid grid-cols-2 gap-2">
                          {SUITABLE_CATEGORIES.map((cat) => (
                            <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={suitableCategories.includes(cat)}
                                onChange={() => toggleCategory(cat, suitableCategories, setSuitableCategories)}
                                className="h-4 w-4 flex-shrink-0"
                              />
                              <span className={suitableCategories.includes(cat) ? 'text-green-700 font-medium' : 'text-gray-700'}>{cat}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Brand Safety — Excluded Categories */}
                      <div className="space-y-3 bg-red-50 p-4 rounded-lg border border-red-100">
                        <Label className="text-sm font-semibold text-red-800">Brand Categories — Do NOT Use With</Label>
                        <p className="text-xs text-red-600">If you have concerns about your content being used with any of these categories, check them here. This is documented in your Chain of Title.</p>
                        <div className="grid grid-cols-2 gap-2">
                          {EXCLUDED_CATEGORIES.map((cat) => (
                            <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={excludedCategories.includes(cat)}
                                onChange={() => toggleCategory(cat, excludedCategories, setExcludedCategories)}
                                className="h-4 w-4 flex-shrink-0"
                              />
                              <span className={excludedCategories.includes(cat) ? 'text-red-700 font-medium' : 'text-gray-700'}>{cat}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentSection(1)}>← Back</Button>
                        <Button type="button" onClick={() => setCurrentSection(3)}>Continue →</Button>
                      </div>
                    </div>
                  )}

                  {/* ── Section 3: Tool Disclosure ── */}
                  {currentSection === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">3. Tool Disclosure</h3>

                      <ChainOfTitleCallout
                        fieldNumber={1}
                        fieldName="Tool Provenance Log"
                        description="Every tool you add here is documented with version, plan type, commercial license status, and production dates. This is the core of your Chain of Title."
                      />

                      <p className="text-sm text-gray-600">
                        Add all AI tools used in production. Mark your <strong>primary generation tool</strong> — the one responsible for the majority of AI generation.
                        {selectedTier === 'certified' && ' Receipt upload (proof of paid commercial plan) is required.'}
                        {selectedTier === 'creator_record' && ' Receipts are optional for Creator Record.'}
                      </p>

                      <Button
                        type="button"
                        onClick={handleAddTool}
                        variant="outline"
                        className="w-full border-2 border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50"
                      >
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

                      {toolsError && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">{toolsError}</div>
                      )}
                      {tools.length === 0 && (
                        <div className="p-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded">
                          ⚠ At least one tool must be added to proceed
                        </div>
                      )}

                      <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentSection(2)}>← Back</Button>
                        <Button
                          type="button"
                          onClick={() => {
                            if (tools.length === 0) {
                              setToolsError('Please add at least one tool before continuing')
                            } else {
                              setToolsError(null)
                              setCurrentSection(4)
                            }
                          }}
                        >
                          Continue →
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Section 4: Human Authorship ── */}
                  {currentSection === 4 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">4. Human Authorship Declaration</h3>

                      <ChainOfTitleCallout
                        fieldNumber={3}
                        fieldName="Rights Verified Sign-off"
                        description="Your authorship statement is the primary evidence our reviewer uses to assess human creative direction. Quality and specificity directly affect your approval outcome."
                      />

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                        <p className="font-semibold">What makes a strong authorship statement:</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          <li>Which specific scenes or sequences were AI-generated</li>
                          <li>What prompts, styles, or references you used (without revealing exact prompts)</li>
                          <li>How you iterated — what you rejected and why</li>
                          <li>What editorial choices you made post-generation</li>
                          <li>How you structured the narrative or visual arc</li>
                          <li>Any post-production work (color, edit, sound design)</li>
                        </ul>
                      </div>

                      <div>
                        <Label htmlFor="authorship_statement">Your Statement *</Label>
                        <textarea
                          id="authorship_statement"
                          {...register('authorship_statement')}
                          className="flex min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Describe your creative process: What was your original concept? Which AI tools generated which elements? What creative decisions shaped the final output? How did you iterate and refine the work?"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <div>
                            {errors.authorship_statement && (
                              <p className="text-sm text-red-500">{errors.authorship_statement.message}</p>
                            )}
                          </div>
                          <p className={`text-xs ${wordCountColor}`}>{wordCountLabel}</p>
                        </div>
                      </div>

                      {/* Evidence Custodian */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="evidence_custodian"
                            checked={evidenceCustodian}
                            onChange={(e) => {
                              setEvidenceCustodian(e.target.checked)
                              if (e.target.checked) setEvidenceCustodianError(null)
                            }}
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <Label htmlFor="evidence_custodian" className="cursor-pointer font-medium text-amber-900">
                              Evidence Custodian Declaration *
                            </Label>
                            <p className="text-xs text-amber-800 mt-1">
                              I confirm that I retain my prompt logs, iteration records, and production notes internally. I will produce these records if legally challenged or requested by a distributor or E&O insurer. SI8 does not collect raw prompts.
                            </p>
                          </div>
                        </div>
                        {evidenceCustodianError && (
                          <p className="text-sm text-red-500 mt-2 ml-7">{evidenceCustodianError}</p>
                        )}
                      </div>

                      <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentSection(3)}>← Back</Button>
                        <Button
                          type="button"
                          onClick={() => {
                            if (!evidenceCustodian) {
                              setEvidenceCustodianError('You must confirm you retain your production records')
                            } else {
                              setEvidenceCustodianError(null)
                              setCurrentSection(5)
                            }
                          }}
                        >
                          Continue →
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Section 5: Likeness ── */}
                  {currentSection === 5 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">5. Likeness & Identity Confirmation</h3>

                      <ChainOfTitleCallout
                        fieldNumber={3}
                        fieldName="Rights Verified Sign-off"
                        description="Likeness confirmations are a required pass/fail threshold. Any real person face, voice, or identity without documented consent is a hard rejection."
                      />

                      <p className="text-sm text-gray-600">Confirm your work contains no unlicensed real person likenesses, or declare your licensed content below.</p>

                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" id="likeness_no_real_faces" {...register('likeness_no_real_faces')} className="h-4 w-4 mt-1 flex-shrink-0" />
                          <Label htmlFor="likeness_no_real_faces" className="cursor-pointer">No real person faces without consent</Label>
                        </div>
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" id="likeness_no_real_voices" {...register('likeness_no_real_voices')} className="h-4 w-4 mt-1 flex-shrink-0" />
                          <Label htmlFor="likeness_no_real_voices" className="cursor-pointer">No real person voices without consent</Label>
                        </div>
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" id="likeness_no_lookalikes" {...register('likeness_no_lookalikes')} className="h-4 w-4 mt-1 flex-shrink-0" />
                          <Label htmlFor="likeness_no_lookalikes" className="cursor-pointer">No lookalikes or impersonation of real people</Label>
                        </div>
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" id="likeness_no_synthetic_people" {...register('likeness_no_synthetic_people')} className="h-4 w-4 mt-1 flex-shrink-0" />
                          <Label htmlFor="likeness_no_synthetic_people" className="cursor-pointer">No synthetic versions of real people (deepfakes)</Label>
                        </div>

                        <div className="border-t border-gray-300 my-3 flex items-center">
                          <span className="px-3 text-xs text-gray-400 bg-gray-50">OR</span>
                        </div>

                        <div className="flex items-start space-x-3">
                          <input type="checkbox" id="likeness_has_licensed_content" {...register('likeness_has_licensed_content')} className="h-4 w-4 mt-1 flex-shrink-0" />
                          <Label htmlFor="likeness_has_licensed_content" className="cursor-pointer">
                            This work contains real person faces, voices, or likenesses — I have written consent or a signed license on file
                          </Label>
                        </div>

                        {watch('likeness_has_licensed_content') && (
                          <div className="ml-7 mt-2">
                            <Label htmlFor="likeness_license_notes">Describe the consent/license arrangement *</Label>
                            <textarea
                              id="likeness_license_notes"
                              {...register('likeness_license_notes')}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                              placeholder="e.g., Written consent signed by [Name] on [date], covering [scope]. License documentation retained internally."
                            />
                          </div>
                        )}

                        {likenessError && <p className="text-sm text-red-500">{likenessError}</p>}
                      </div>

                      <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentSection(4)}>← Back</Button>
                        <Button
                          type="button"
                          onClick={() => {
                            const noneChecked = !watch('likeness_no_real_faces') && !watch('likeness_no_real_voices') && !watch('likeness_no_lookalikes') && !watch('likeness_no_synthetic_people')
                            const hasLicensed = watch('likeness_has_licensed_content')
                            if (noneChecked && !hasLicensed) {
                              setLikenessError('Please confirm your likeness commitments or declare your licensed content')
                            } else {
                              setLikenessError(null)
                              setCurrentSection(6)
                            }
                          }}
                        >
                          Continue →
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Section 6: IP & Brand ── */}
                  {currentSection === 6 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">6. IP & Brand Confirmation</h3>

                      <ChainOfTitleCallout
                        fieldNumber={3}
                        fieldName="Rights Verified Sign-off"
                        description="IP conflicts are a hard rejection category. Copyrighted characters, protected trade dress, or trademarked identifiers without authorization will block approval."
                      />

                      <p className="text-sm text-gray-600">Confirm your work contains no unlicensed intellectual property, or declare your licensed content below.</p>

                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" id="ip_no_copyrighted_characters" {...register('ip_no_copyrighted_characters')} className="h-4 w-4 mt-1 flex-shrink-0" />
                          <Label htmlFor="ip_no_copyrighted_characters" className="cursor-pointer">No copyrighted characters (e.g., Marvel, Disney, anime characters)</Label>
                        </div>
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" id="ip_no_brand_imitation" {...register('ip_no_brand_imitation')} className="h-4 w-4 mt-1 flex-shrink-0" />
                          <Label htmlFor="ip_no_brand_imitation" className="cursor-pointer">No recognizable brand imitation (logos, trade dress, packaging)</Label>
                        </div>
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" id="ip_no_trademarked_ip" {...register('ip_no_trademarked_ip')} className="h-4 w-4 mt-1 flex-shrink-0" />
                          <Label htmlFor="ip_no_trademarked_ip" className="cursor-pointer">No trademarked intellectual property without authorization</Label>
                        </div>

                        <div className="border-t border-gray-300 my-3 flex items-center">
                          <span className="px-3 text-xs text-gray-400 bg-gray-50">OR</span>
                        </div>

                        <div className="flex items-start space-x-3">
                          <input type="checkbox" id="ip_has_licensed_content" {...register('ip_has_licensed_content')} className="h-4 w-4 mt-1 flex-shrink-0" />
                          <Label htmlFor="ip_has_licensed_content" className="cursor-pointer">
                            This work contains licensed brand or IP elements — I have written authorization on file
                          </Label>
                        </div>

                        {watch('ip_has_licensed_content') && (
                          <div className="ml-7 mt-2">
                            <Label htmlFor="ip_license_notes">Describe the consent/license arrangement *</Label>
                            <textarea
                              id="ip_license_notes"
                              {...register('ip_license_notes')}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                              placeholder="e.g., Written authorization from [Brand] covering [scope]. Documentation retained internally."
                            />
                          </div>
                        )}

                        {ipError && <p className="text-sm text-red-500">{ipError}</p>}
                      </div>

                      <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentSection(5)}>← Back</Button>
                        <Button
                          type="button"
                          onClick={() => {
                            const noneChecked = !watch('ip_no_copyrighted_characters') && !watch('ip_no_brand_imitation') && !watch('ip_no_trademarked_ip')
                            const hasLicensed = watch('ip_has_licensed_content')
                            if (noneChecked && !hasLicensed) {
                              setIpError('Please confirm your IP commitments or declare your licensed content')
                            } else {
                              setIpError(null)
                              setCurrentSection(7)
                            }
                          }}
                        >
                          Continue →
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Section 7: Audio ── */}
                  {currentSection === 7 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">7. Audio & Music Disclosure</h3>

                      <ChainOfTitleCallout
                        fieldNumber={3}
                        fieldName="Rights Verified Sign-off"
                        description="Audio rights are one of the most common rejection causes. Every audio element must be original AI-generated with a commercial license, third-party licensed with documentation, or absent."
                      />

                      <div>
                        <Label>Audio Source *</Label>
                        <select
                          {...register('audio_source')}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                        >
                          <option value="ai_generated">AI-generated audio (original, commercial license)</option>
                          <option value="licensed">Licensed audio (sync license, library — documentation required)</option>
                          <option value="silent">Silent / no audio</option>
                        </select>
                      </div>

                      {watch('audio_source') === 'licensed' && (
                        <div className="space-y-2">
                          <Label>License Documentation *</Label>
                          <p className="text-xs text-gray-500">Upload your music/audio license, sync license, or permission letter (PDF, JPG, PNG — max 10MB)</p>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return }
                              setAudioLicenseUploading(true)
                              const { data: { session: uploadSession } } = await supabase.auth.getSession()
                              if (!uploadSession?.user?.id) { alert('Session expired. Please refresh the page and try again.'); setAudioLicenseUploading(false); return }
                              const path = `${uploadSession.user.id}/audio-license-${Date.now()}.${file.name.split('.').pop()}`
                              const { error } = await supabase.storage.from('submission-files').upload(path, file)
                              if (!error) {
                                setAudioLicensePath(path)
                              } else {
                                alert('Upload failed. Please try again.')
                              }
                              setAudioLicenseUploading(false)
                            }}
                          />
                          {audioLicenseUploading && <p className="text-xs text-blue-600">Uploading...</p>}
                          {audioLicensePath && <p className="text-xs text-green-600">✓ License uploaded successfully.</p>}
                        </div>
                      )}

                      <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentSection(6)}>← Back</Button>
                        <Button
                          type="button"
                          onClick={() => {
                            if (watch('audio_source') === 'licensed' && !audioLicensePath) {
                              alert('Please upload your audio license documentation before continuing.')
                              return
                            }
                            setCurrentSection(submissionMode === 'agency' || selectedTier === 'creator_record' ? 9 : 8)
                          }}
                        >
                          Continue →
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Section 8: Territory ── */}
                  {currentSection === 8 && submissionMode === 'creator' && selectedTier !== 'creator_record' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">8. Territory & Exclusivity Preferences</h3>

                      <ChainOfTitleCallout
                        fieldNumber={7}
                        fieldName="Territory Log"
                        description="Your territory selection is documented in the Chain of Title and governs the geographic scope of any licensing deals negotiated through the Showcase."
                      />

                      <div>
                        <Label htmlFor="territory">Territory *</Label>
                        <select id="territory" {...register('territory')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                          <option value="Global">Global (Worldwide)</option>
                          <option value="North America">North America</option>
                          <option value="Europe">Europe</option>
                          <option value="Asia">Asia</option>
                          <option value="Other">Other (specify below)</option>
                        </select>
                        {errors.territory && <p className="text-sm text-red-500 mt-1">{errors.territory.message}</p>}
                      </div>

                      {watch('territory') === 'Other' && (
                        <div>
                          <Label htmlFor="territory_other">Specify Territory *</Label>
                          <Input id="territory_other" {...register('territory_other')} placeholder="e.g., South America, Middle East, Taiwan..." />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="existing_restrictions">Existing Licensing Restrictions (optional)</Label>
                        <textarea
                          id="existing_restrictions"
                          {...register('existing_restrictions')}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Do you have any existing licensing agreements that restrict territory or exclusivity?"
                        />
                        <p className="text-xs text-gray-500 mt-1">Note any existing deals that may limit licensing scope.</p>
                      </div>

                      <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentSection(7)}>← Back</Button>
                        <Button type="button" onClick={() => setCurrentSection(9)}>Continue →</Button>
                      </div>
                    </div>
                  )}

                  {/* ── Section 9: Video & Showcase ── */}
                  {currentSection === 9 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">9. Video & Showcase Listing</h3>

                      <ChainOfTitleCallout
                        fieldNumber={9}
                        fieldName="Version History"
                        description="The video URL is attached to your Chain of Title as the canonical reference for this version of the work. Keep it accessible (unlisted is fine)."
                      />

                      <div>
                        <Label htmlFor="video_url">Video Screening Link *</Label>
                        <Input id="video_url" placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." {...register('video_url')} />
                        {errors.video_url && <p className="text-sm text-red-500 mt-1">{errors.video_url.message}</p>}
                        <p className="text-xs text-gray-500 mt-1">YouTube or Vimeo only. Unlisted or public — do not set to private.</p>
                      </div>

                      <div>
                        <Label htmlFor="thumbnail_url">Thumbnail URL (optional)</Label>
                        <Input id="thumbnail_url" placeholder="https://..." {...register('thumbnail_url')} />
                        <p className="text-xs text-gray-500 mt-1">If not provided, we'll use the video platform's default thumbnail.</p>
                      </div>

                      <div>
                        <Label htmlFor="public_description">Showcase Description (optional)</Label>
                        <textarea
                          id="public_description"
                          className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md"
                          placeholder="Brief description for Showcase (max 500 characters)"
                          {...register('public_description')}
                        />
                        <p className="text-xs text-gray-500 mt-1">If not provided, we'll use your logline.</p>
                      </div>

                      {submissionMode === 'creator' && (
                        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                          <div className="flex items-start gap-3">
                            <input type="checkbox" id="catalog_opt_in" className="mt-1" {...register('catalog_opt_in')} />
                            <div>
                              <Label htmlFor="catalog_opt_in" className="cursor-pointer font-medium">List in Showcase (after approval)</Label>
                              <p className="text-xs text-gray-600 mt-1">
                                Your film appears in our Showcase with a Rights Verified badge. When brands license your work, you keep 80% of the fee. You can opt out at any time from your dashboard.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {submissionMode === 'agency' && (
                        <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-500 border border-gray-200">
                          Showcase listing is not available for agency submissions. The Chain of Title is delivered directly to you.
                        </div>
                      )}

                      <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentSection(submissionMode === 'agency' || selectedTier === 'creator_record' ? 7 : 8)}>← Back</Button>
                        <Button type="button" onClick={() => setCurrentSection(10)}>Continue →</Button>
                      </div>
                    </div>
                  )}

                  {/* ── Section 10: Review & Payment ── */}
                  {currentSection === 10 && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold">10. Review & Submit</h3>

                      {/* What you're getting */}
                      {selectedTier === 'certified' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Your Chain of Title — 9-Field Preview
                          </h4>

                          <div className="space-y-2 text-xs">
                            {/* Field 1 */}
                            <div className="bg-white border border-amber-100 rounded p-2.5">
                              <div className="font-semibold text-gray-700 mb-1">1. Tool Provenance Log</div>
                              {tools.length > 0 ? (
                                <div className="space-y-1">
                                  {tools.map((t, i) => {
                                    const name = t.toolName === 'Other' ? t.toolNameOther : t.toolName
                                    return (
                                      <div key={i} className="flex items-center gap-2 text-gray-600">
                                        {t.isPrimary && <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
                                        <span>{name} — {t.version} — {t.planType} plan</span>
                                        {t.receipt && <span className="text-green-600">✓ Receipt on file</span>}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : <span className="text-gray-400">No tools added</span>}
                            </div>

                            {/* Field 2 */}
                            <div className="bg-white border border-amber-100 rounded p-2.5">
                              <div className="font-semibold text-gray-700 mb-1">2. Model Disclosure</div>
                              <span className="text-gray-500 italic">Training data transparency status — assessed by SI8 reviewer</span>
                            </div>

                            {/* Field 3 */}
                            <div className="bg-white border border-blue-100 rounded p-2.5">
                              <div className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                3. Rights Verified Sign-off
                                <span className="flex items-center gap-1 text-blue-600 font-normal">
                                  <Clock className="h-3 w-3" /> Pending review
                                </span>
                              </div>
                              <span className="text-gray-500 italic">Human review covers: authorship, likeness, IP, audio, brand safety — 90 minutes</span>
                            </div>

                            {/* Field 4 */}
                            <div className="bg-white border border-green-100 rounded p-2.5">
                              <div className="font-semibold text-gray-700 mb-1">4. Commercial Use Authorization</div>
                              <span className="text-green-700 font-medium">Will be stamped on approval: "CLEARED FOR COMMERCIAL USE"</span>
                            </div>

                            {/* Field 5 */}
                            <div className="bg-white border border-amber-100 rounded p-2.5">
                              <div className="font-semibold text-gray-700 mb-1">5. Modification Rights Status</div>
                              <span className="text-gray-600">Not authorized — creator retains full creative control (standard)</span>
                            </div>

                            {/* Field 6 */}
                            <div className="bg-white border border-amber-100 rounded p-2.5">
                              <div className="font-semibold text-gray-700 mb-1">6. Category Conflict Log</div>
                              {suitableCategories.length > 0 || excludedCategories.length > 0 ? (
                                <div className="space-y-0.5 text-gray-600">
                                  {suitableCategories.length > 0 && <div>Suitable: {suitableCategories.join(', ')}</div>}
                                  {excludedCategories.length > 0 && <div className="text-red-600">Excluded: {excludedCategories.join(', ')}</div>}
                                </div>
                              ) : (
                                <span className="text-gray-500 italic">Not specified — reviewer will assess brand safety during review</span>
                              )}
                            </div>

                            {/* Field 7 */}
                            <div className="bg-white border border-amber-100 rounded p-2.5">
                              <div className="font-semibold text-gray-700 mb-1">7. Territory Log</div>
                              <span className="text-gray-600">
                                {watch('territory') === 'Other'
                                  ? watch('territory_other') || 'Other (specify above)'
                                  : watch('territory') || 'Global (default)'}
                              </span>
                            </div>

                            {/* Field 8 */}
                            <div className="bg-white border border-amber-100 rounded p-2.5">
                              <div className="font-semibold text-gray-700 mb-1">8. Regeneration Rights Status</div>
                              <span className="text-gray-600">Not authorized (standard)</span>
                            </div>

                            {/* Field 9 */}
                            <div className="bg-white border border-amber-100 rounded p-2.5">
                              <div className="font-semibold text-gray-700 mb-1">9. Version History</div>
                              <span className="text-gray-600">
                                V1.0 — Initial submission, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </span>
                              {watch('title') && <span className="ml-2 text-gray-500 italic">"{watch('title')}"</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Delivery timeline */}
                      {selectedTier === 'certified' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            What Happens After Payment
                          </h4>
                          <ol className="text-sm text-green-800 space-y-1.5 list-none">
                            <li className="flex items-start gap-2">
                              <span className="font-bold text-green-700 flex-shrink-0">1.</span>
                              You receive a confirmation email with your submission reference number.
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="font-bold text-green-700 flex-shrink-0">2.</span>
                              An SI8 reviewer begins your 90-minute expert review within 1 business day.
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="font-bold text-green-700 flex-shrink-0">3.</span>
                              Your Chain of Title PDF is delivered by email and available in your dashboard.
                            </li>
                          </ol>
                          <div className="mt-3 pt-3 border-t border-green-200 text-sm font-semibold text-green-800">
                            Estimated delivery: {getDeliveryDate()}
                          </div>
                        </div>
                      )}

                      {selectedTier === 'creator_record' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium mb-2">Summary</h4>
                          <ul className="text-sm space-y-1">
                            <li><strong>Tier:</strong> Creator Record — $29 (self-attested)</li>
                            <li><strong>Film Title:</strong> {watch('title')}</li>
                            <li><strong>Tools Used:</strong> {tools.length} tool{tools.length !== 1 ? 's' : ''} added</li>
                            <li><strong>Delivery:</strong> Automated — your PDF will be emailed immediately after payment</li>
                          </ul>
                        </div>
                      )}

                      {/* Indemnification */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="indemnification"
                            checked={indemnificationAccepted}
                            onChange={(e) => {
                              setIndemnificationAccepted(e.target.checked)
                              if (e.target.checked) setIndemnificationError(null)
                            }}
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <Label htmlFor="indemnification" className="cursor-pointer font-medium">
                              Accuracy Warranty & Indemnification *
                            </Label>
                            <p className="text-xs text-gray-600 mt-1">
                              I warrant that all information submitted is accurate and complete to the best of my knowledge. I agree to indemnify and hold harmless SI8 / PMF Strategy Inc. against any claims arising from inaccurate or incomplete information I have provided. I understand that SI8's verification is not a legal certification and does not replace independent legal advice.
                            </p>
                          </div>
                        </div>
                        {indemnificationError && (
                          <p className="text-sm text-red-500 mt-2 ml-7">{indemnificationError}</p>
                        )}
                      </div>

                      {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">{error}</div>
                      )}

                      <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentSection(9)}>← Back</Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 bg-amber-600 hover:bg-amber-700"
                          onClick={() => {
                            if (!indemnificationAccepted) {
                              setIndemnificationError('You must accept the accuracy warranty to proceed')
                            }
                          }}
                        >
                          {isSubmitting
                            ? 'Creating submission...'
                            : `Submit & Pay ${selectedTier === 'creator_record' ? '$29' : '$499'} →`}
                        </Button>
                      </div>
                    </div>
                  )}

                </form>
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar (SI8 Certified only, desktop) ── */}
          {isCertified && (
            <div className="hidden lg:block">
              <COTSidebar
                currentSection={currentSection}
                tools={tools}
                territory={watch('territory') || 'Global'}
                suitableCategories={suitableCategories}
                excludedCategories={excludedCategories}
                primaryUse={watch('primary_use') || ''}
              />
            </div>
          )}

        </div>
      </div>

      {/* Add Tool Modal */}
      <AddToolModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTool(null) }}
        onSave={handleSaveTool}
        editTool={editingTool}
        userId={userId}
        requireReceipt={selectedTier === 'certified'}
        hasPrimaryTool={hasPrimaryTool}
        currentToolId={editingTool?.id}
      />
    </div>
  )
}
