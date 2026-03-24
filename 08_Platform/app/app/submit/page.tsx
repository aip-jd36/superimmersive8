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

// Simplified schema for MVP - covers all 10 sections
const submissionSchema = z.object({
  // Section 2: Production Overview
  title: z.string().min(1, 'Title is required'),
  runtime_minutes: z.number().min(0).optional(),
  runtime_seconds: z.number().min(0).max(59).optional(),
  genre: z.string().optional(),
  logline: z.string().max(500).optional(),
  intended_use: z.string().optional(),

  // Section 3: Tool Disclosure - handled separately with state

  // Section 4: Human Authorship Declaration
  authorship_statement: z.string().min(150, 'Must be at least 150 words'),

  // Section 5: Likeness & Identity (4 individual checkboxes)
  likeness_no_real_faces: z.boolean().optional(),
  likeness_no_real_voices: z.boolean().optional(),
  likeness_no_lookalikes: z.boolean().optional(),
  likeness_no_synthetic_people: z.boolean().optional(),
  likeness_has_licensed_content: z.boolean().optional(),
  likeness_license_notes: z.string().optional(),

  // Section 6: IP & Brand (3 individual checkboxes)
  ip_no_copyrighted_characters: z.boolean().optional(),
  ip_no_brand_imitation: z.boolean().optional(),
  ip_no_trademarked_ip: z.boolean().optional(),
  ip_has_licensed_content: z.boolean().optional(),
  ip_license_notes: z.string().optional(),

  // Section 7: Audio & Music
  audio_source: z.enum(['ai_generated', 'licensed', 'silent']),
  audio_documentation: z.string().optional(),

  // Section 8: Territory
  territory: z.enum(['Global', 'North America', 'Europe', 'Asia', 'Other'], {
    required_error: 'Please select a territory',
  }),
  territory_other: z.string().optional(),
  existing_restrictions: z.string().optional(),

  // Section 9: Supporting Materials + Catalog Opt-In
  video_url: z.string().url('Must be a valid URL (YouTube or Vimeo)').min(1, 'Video URL is required'),
  thumbnail_url: z.string().url().optional(),
  public_description: z.string().max(500).optional(),
  catalog_opt_in: z.boolean().default(false),
})

type SubmissionFormData = z.infer<typeof submissionSchema>

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
  // Tier & mode selection
  const [selectedTier, setSelectedTier] = useState<'creator_record' | 'certified' | null>(null)
  const [submissionMode, setSubmissionMode] = useState<'creator' | 'agency'>('creator')
  const [tierError, setTierError] = useState<string | null>(null)
  // Section 4: Evidence Custodian
  const [evidenceCustodian, setEvidenceCustodian] = useState(false)
  const [evidenceCustodianError, setEvidenceCustodianError] = useState<string | null>(null)
  // Section 5: Likeness error
  const [likenessError, setLikenessError] = useState<string | null>(null)
  // Section 6: IP error
  const [ipError, setIpError] = useState<string | null>(null)
  // Section 7: Audio license upload
  const [audioLicensePath, setAudioLicensePath] = useState<string | null>(null)
  const [audioLicenseUploading, setAudioLicenseUploading] = useState(false)
  // Section 10 (was 11): Indemnification
  const [indemnificationAccepted, setIndemnificationAccepted] = useState(false)
  const [indemnificationError, setIndemnificationError] = useState<string | null>(null)
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

  // Get user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setUserId(session.user.id)
      }
    }
    getUserId()
  }, [supabase])

  // Auto-save draft to localStorage
  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem('submission-draft', JSON.stringify(value))
    })
    return () => subscription.unsubscribe()
  }, [watch])

  // Restore draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('submission-draft')
    if (draft) {
      const parsed = JSON.parse(draft)
      Object.keys(parsed).forEach((key) => {
        setValue(key as any, parsed[key])
      })
    }
  }, [setValue])

  // Tool management handlers
  const handleAddTool = () => {
    setEditingTool(null)
    setIsModalOpen(true)
  }

  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool)
    setIsModalOpen(true)
  }

  const handleSaveTool = (tool: Tool) => {
    if (editingTool) {
      // Update existing tool
      setTools(tools.map(t => t.id === tool.id ? tool : t))
    } else {
      // Add new tool
      setTools([...tools, tool])
    }
    setToolsError(null)
  }

  const handleRemoveTool = (toolId: string) => {
    setTools(tools.filter(t => t.id !== toolId))
  }

  const onSubmit = async (data: SubmissionFormData) => {
    console.log('🚀 Form submitted! Data:', data)

    // Validate tools before submission
    if (tools.length === 0) {
      setToolsError('At least one tool must be added')
      setCurrentSection(3) // Go back to Tool Disclosure section
      return
    }

    // Validate indemnification
    if (!indemnificationAccepted) {
      setIndemnificationError('You must accept the accuracy warranty to proceed')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Get current user session
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Use session.user.id directly (matches public.users.id)
      const user_id = session.user.id

      // Calculate total runtime in seconds
      const runtime_seconds =
        (data.runtime_minutes || 0) * 60 + (data.runtime_seconds || 0)

      // Create submission in database (without payment initially)
      // Map form data to match actual database schema
      const submissionData = {
        user_id: user_id,

        // Filmmaker Profile (auto-filled from session)
        filmmaker_name: session.user.user_metadata?.full_name || session.user.email || 'Unknown',
        filmmaker_location: null, // Will be added to form in future version
        filmmaker_contact: session.user.email || null,
        filmmaker_portfolio_links: null, // Will be added to form in future version

        // Production Overview
        title: data.title,
        runtime: runtime_seconds, // Schema uses 'runtime', not 'runtime_seconds'
        genre: data.genre || null,
        logline: data.logline || null,
        intended_use: data.intended_use || null,

        // Tool Disclosure (JSONB array of tool objects)
        tools_used: JSON.stringify(tools.map(tool => ({
          tool_name: tool.toolName === 'Other' ? tool.toolNameOther : tool.toolName,
          version: tool.version,
          plan_type: tool.planType,
          start_date: tool.startDate,
          end_date: tool.endDate,
          receipt_url: tool.receipt?.url || null,
          receipt_path: tool.receipt?.path || null,
        }))),

        // Human Authorship
        authorship_statement: data.authorship_statement,

        // Likeness & IP (JSONB with individual confirmations)
        likeness_confirmation: JSON.stringify({
          no_real_faces: data.likeness_no_real_faces || false,
          no_real_voices: data.likeness_no_real_voices || false,
          no_lookalikes: data.likeness_no_lookalikes || false,
          no_synthetic_people: data.likeness_no_synthetic_people || false,
          all_confirmed: data.likeness_no_real_faces && data.likeness_no_real_voices && data.likeness_no_lookalikes && data.likeness_no_synthetic_people,
          has_licensed_content: watch('likeness_has_licensed_content') || false,
          license_notes: watch('likeness_license_notes') || null,
        }),
        ip_confirmation: JSON.stringify({
          no_copyrighted_characters: data.ip_no_copyrighted_characters || false,
          no_brand_imitation: data.ip_no_brand_imitation || false,
          no_trademarked_ip: data.ip_no_trademarked_ip || false,
          all_confirmed: data.ip_no_copyrighted_characters && data.ip_no_brand_imitation && data.ip_no_trademarked_ip,
          has_licensed_content: watch('ip_has_licensed_content') || false,
          license_notes: watch('ip_license_notes') || null,
        }),

        // Audio (JSONB with source_type and documentation)
        audio_disclosure: JSON.stringify({
          source_type: data.audio_source || 'not_specified',
          documentation: data.audio_documentation || null,
          license_path: audioLicensePath || null,
        }),

        // Modification Rights (removed — defaulting to false)
        modification_authorized: false,
        modification_scope: null,

        // Territory
        territory_preferences: data.territory === 'Other' ? data.territory_other : data.territory,

        // Supporting Materials (JSONB array)
        supporting_materials: JSON.stringify([]),

        // Tier & submission mode
        tier: selectedTier || 'certified',
        submission_mode: submissionMode,

        // Status
        status: 'pending',
        payment_status: 'unpaid',
      }

      // Prepare catalog opt-in data (if opted in)
      const catalogData = data.catalog_opt_in ? {
        catalog_opt_in: true,
        video_url: data.video_url,
        thumbnail_url: data.thumbnail_url || null,
        public_description: data.public_description || data.logline || null,
      } : null

      // Create submission via API route (uses service role to bypass RLS)
      console.log('📤 Calling /api/submissions/create')
      console.log('📤 User ID:', user_id)
      console.log('📤 Submission data:', submissionData)
      console.log('📤 Catalog data:', catalogData)

      const submissionResponse = await fetch('/api/submissions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionData,
          userId: user_id,
          catalogData,
        }),
      })

      console.log('📥 API response status:', submissionResponse.status)

      if (!submissionResponse.ok) {
        const error = await submissionResponse.json()
        console.error('❌ API error response:', error)
        throw new Error(error.error || 'Failed to create submission')
      }

      const { submission } = await submissionResponse.json()

      // Create Stripe Checkout session
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

      // Clear draft from localStorage
      localStorage.removeItem('submission-draft')

      // Redirect to Stripe Checkout
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
            <CardTitle>Submit for Rights Verified</CardTitle>
            <CardDescription>
              {selectedTier === 'creator_record'
                ? 'Creator Record — $29 · Self-attested documentation, instant automated delivery'
                : selectedTier === 'certified'
                ? 'SI8 Certified — $499 · 90-minute human review, cleared for commercial use'
                : 'Complete all sections to submit your AI video for verification'}
            </CardDescription>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progress: Section {currentSection} of 10</span>
                <span>{Math.round((currentSection / 10) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(currentSection / 10) * 100}%` }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit, (errors) => {
              console.log('❌ Form validation errors:', errors)
              alert('Please fill out all required fields. Check the console for details.')
            })} className="space-y-8">
              {/* Section 1: Tier Selection + Filmmaker Profile */}
              {currentSection === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">1. Choose Your Verification Tier</h3>

                  {/* Tier selection */}
                  <div className="space-y-3">
                    <Label>Which verification do you need? *</Label>
                    <div
                      onClick={() => { setSelectedTier('creator_record'); setSubmissionMode('creator') }}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${selectedTier === 'creator_record' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">Creator Record — $29</div>
                          <div className="text-sm text-gray-600 mt-1">Self-attested documentation. Automated, instant delivery. <strong>Not for commercial use.</strong></div>
                          <div className="text-xs text-gray-500 mt-1">For: indie creators, social media, YouTube, portfolio, festivals</div>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 ${selectedTier === 'creator_record' ? 'border-primary bg-primary' : 'border-gray-300'}`} />
                      </div>
                    </div>

                    <div
                      onClick={() => setSelectedTier('certified')}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${selectedTier === 'certified' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">SI8 Certified — $499 <span className="text-xs font-normal text-primary ml-1">Most Popular</span></div>
                          <div className="text-sm text-gray-600 mt-1">90-minute human review. Cleared for commercial use. Satisfies brand legal teams and E&O insurers.</div>
                          <div className="text-xs text-gray-500 mt-1">For: agencies, brands, production houses, streaming submissions</div>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 ${selectedTier === 'certified' ? 'border-primary bg-primary' : 'border-gray-300'}`} />
                      </div>
                    </div>
                  </div>

                  {/* Submission mode (only show if SI8 Certified selected) */}
                  {selectedTier === 'certified' && (
                    <div className="space-y-3">
                      <Label>How are you submitting? *</Label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setSubmissionMode('creator')}
                          className={`flex-1 rounded-lg border-2 p-3 text-left text-sm transition-all ${submissionMode === 'creator' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="font-medium">Individual Creator</div>
                          <div className="text-xs text-gray-500 mt-0.5">I'm submitting my own work</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmissionMode('agency')}
                          className={`flex-1 rounded-lg border-2 p-3 text-left text-sm transition-all ${submissionMode === 'agency' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="font-medium">Agency / Production House</div>
                          <div className="text-xs text-gray-500 mt-0.5">Submitting on behalf of a client</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {tierError && <p className="text-sm text-red-500">{tierError}</p>}

                  <p className="text-sm text-gray-600">
                    Your profile information is automatically filled from your account settings.
                  </p>

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

              {/* Section 2: Production Overview */}
              {currentSection === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">2. Production Overview</h3>

                  <div>
                    <Label htmlFor="title">Film Title *</Label>
                    <Input id="title" {...register('title')} />
                    {errors.title && (
                      <p className="text-sm text-red-500">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="runtime_minutes">Runtime (Minutes)</Label>
                      <Input
                        id="runtime_minutes"
                        type="number"
                        {...register('runtime_minutes', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="runtime_seconds">Runtime (Seconds)</Label>
                      <Input
                        id="runtime_seconds"
                        type="number"
                        max="59"
                        {...register('runtime_seconds', { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="genre">Genre</Label>
                    <select
                      id="genre"
                      {...register('genre')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
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
                    <textarea
                      id="logline"
                      {...register('logline')}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      maxLength={500}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(1)}>
                      ← Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentSection(3)}>
                      Continue →
                    </Button>
                  </div>
                </div>
              )}

              {/* Section 3: Tool Disclosure */}
              {currentSection === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">3. Tool Disclosure</h3>
                  <p className="text-sm text-gray-600">
                    Add all AI tools used in production. For each tool, provide the model version, plan type, and production dates.
                    {selectedTier === 'certified' && ' Receipt upload (proof of paid commercial plan) is required for SI8 Certified.'}
                    {selectedTier === 'creator_record' && ' Receipts are optional for Creator Record but required if you later upgrade to SI8 Certified.'}
                  </p>

                  {/* Add Tool Button */}
                  <div>
                    <Button
                      type="button"
                      onClick={handleAddTool}
                      variant="outline"
                      className="w-full border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5"
                    >
                      + Add Tool
                    </Button>
                  </div>

                  {/* Tools List */}
                  {tools.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Added Tools ({tools.length}):
                      </p>
                      <div className="space-y-3">
                        {tools.map((tool) => (
                          <ToolCard
                            key={tool.id}
                            tool={tool}
                            onEdit={handleEditTool}
                            onRemove={handleRemoveTool}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {toolsError && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                      {toolsError}
                    </div>
                  )}

                  {/* Requirement Message */}
                  {tools.length === 0 && (
                    <div className="p-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded">
                      ⚠️ At least one tool must be added to proceed
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(2)}>
                      ← Back
                    </Button>
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

              {/* Section 4: Human Authorship Declaration */}
              {currentSection === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">4. Human Authorship Declaration</h3>
                  <p className="text-sm text-gray-600">
                    Describe your creative process in detail. This statement is critical for establishing human authorship and copyright protection.
                  </p>

                  <div>
                    <Label htmlFor="authorship_statement">Your Statement *</Label>
                    <textarea
                      id="authorship_statement"
                      {...register('authorship_statement')}
                      className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Describe your creative process: What prompts did you use? How did you iterate on outputs? What editorial decisions did you make? How did you use post-generation editing?"
                      maxLength={2000}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        {errors.authorship_statement && (
                          <p className="text-sm text-red-500">{errors.authorship_statement.message}</p>
                        )}
                      </div>
                      <p className={`text-xs ${(watch('authorship_statement')?.length || 0) < 150 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                        {watch('authorship_statement')?.length || 0} / 150 characters minimum (2000 max)
                      </p>
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
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(3)}>
                      ← Back
                    </Button>
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

              {/* Section 5: Likeness & Identity */}
              {currentSection === 5 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">5. Likeness & Identity Confirmation</h3>
                  <p className="text-sm text-gray-600">
                    Confirm that your work does not contain unlicensed real person likenesses, or declare your licensed content below.
                  </p>

                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="likeness_no_real_faces"
                        {...register('likeness_no_real_faces')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="likeness_no_real_faces" className="cursor-pointer">
                        No real person faces without consent
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="likeness_no_real_voices"
                        {...register('likeness_no_real_voices')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="likeness_no_real_voices" className="cursor-pointer">
                        No real person voices without consent
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="likeness_no_lookalikes"
                        {...register('likeness_no_lookalikes')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="likeness_no_lookalikes" className="cursor-pointer">
                        No lookalikes or impersonation of real people
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="likeness_no_synthetic_people"
                        {...register('likeness_no_synthetic_people')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="likeness_no_synthetic_people" className="cursor-pointer">
                        No synthetic versions of real people (deepfakes)
                      </Label>
                    </div>

                    <div className="border-t border-gray-300 my-3 flex items-center"><span className="px-3 text-xs text-gray-400 bg-gray-50">OR</span></div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="likeness_has_licensed_content"
                        {...register('likeness_has_licensed_content')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
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
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(4)}>
                      ← Back
                    </Button>
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

              {/* Section 6: IP & Brand */}
              {currentSection === 6 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">6. IP & Brand Confirmation</h3>
                  <p className="text-sm text-gray-600">
                    Confirm that your work does not contain unlicensed intellectual property, or declare your licensed content below.
                  </p>

                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="ip_no_copyrighted_characters"
                        {...register('ip_no_copyrighted_characters')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="ip_no_copyrighted_characters" className="cursor-pointer">
                        No copyrighted characters (e.g., Marvel, Disney, anime characters)
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="ip_no_brand_imitation"
                        {...register('ip_no_brand_imitation')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="ip_no_brand_imitation" className="cursor-pointer">
                        No recognizable brand imitation (logos, trade dress, packaging)
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="ip_no_trademarked_ip"
                        {...register('ip_no_trademarked_ip')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="ip_no_trademarked_ip" className="cursor-pointer">
                        No trademarked intellectual property without authorization
                      </Label>
                    </div>

                    <div className="border-t border-gray-300 my-3 flex items-center"><span className="px-3 text-xs text-gray-400 bg-gray-50">OR</span></div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="ip_has_licensed_content"
                        {...register('ip_has_licensed_content')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
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
                          placeholder="e.g., Written consent signed by [Name] on [date], covering [scope]. License documentation retained internally."
                        />
                      </div>
                    )}

                    {ipError && <p className="text-sm text-red-500">{ipError}</p>}
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(5)}>
                      ← Back
                    </Button>
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

              {/* Section 7: Audio & Music */}
              {currentSection === 7 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">7. Audio & Music Disclosure</h3>

                  <div>
                    <Label>Audio Source *</Label>
                    <select
                      {...register('audio_source')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="ai_generated">AI-generated (original)</option>
                      <option value="licensed">Licensed (have documentation)</option>
                      <option value="silent">Silent</option>
                    </select>
                  </div>

                  {watch('audio_source') === 'licensed' && (
                    <div className="space-y-2">
                      <Label>License Documentation *</Label>
                      <p className="text-xs text-gray-500">Upload your music/audio license, sync license, or permission letter (PDF, JPG, PNG — max 10MB)</p>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 10 * 1024 * 1024) {
                            alert('File must be under 10MB')
                            return
                          }
                          setAudioLicenseUploading(true)
                          const path = `${userId}/audio-license-${Date.now()}.${file.name.split('.').pop()}`
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
                      {audioLicensePath && <p className="text-xs text-green-600">License uploaded successfully.</p>}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(6)}>
                      ← Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (watch('audio_source') === 'licensed' && !audioLicensePath) {
                          alert('Please upload your audio license documentation before continuing.')
                          return
                        }
                        setCurrentSection(submissionMode === 'agency' ? 9 : 8)
                      }}
                    >
                      Continue →
                    </Button>
                  </div>
                </div>
              )}

              {/* Section 8: Territory (creator mode only) */}
              {currentSection === 8 && submissionMode === 'creator' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">8. Territory & Exclusivity Preferences</h3>
                  <p className="text-sm text-gray-600">
                    Specify the geographic territory for licensing rights.
                  </p>

                  <div>
                    <Label htmlFor="territory">Territory *</Label>
                    <select
                      id="territory"
                      {...register('territory')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="Global">Global (Worldwide)</option>
                      <option value="North America">North America</option>
                      <option value="Europe">Europe</option>
                      <option value="Asia">Asia</option>
                      <option value="Other">Other (specify below)</option>
                    </select>
                    {errors.territory && (
                      <p className="text-sm text-red-500 mt-1">{errors.territory.message}</p>
                    )}
                  </div>

                  {watch('territory') === 'Other' && (
                    <div>
                      <Label htmlFor="territory_other">Specify Territory *</Label>
                      <Input
                        id="territory_other"
                        {...register('territory_other')}
                        placeholder="e.g., South America, Middle East, specific countries..."
                      />
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
                    <p className="text-xs text-gray-500 mt-1">
                      Let us know if you've already licensed this work elsewhere or have territorial restrictions.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(7)}>
                      ← Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentSection(9)}>
                      Continue →
                    </Button>
                  </div>
                </div>
              )}

              {/* Section 9: Video & Catalog */}
              {currentSection === 9 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">9. Video & Catalog Listing</h3>
                  <p className="text-sm text-gray-600">
                    Provide a link to your video (YouTube or Vimeo) and optionally list it in our public catalog after approval.
                  </p>

                  <div>
                    <Label htmlFor="video_url">Video Screening Link *</Label>
                    <Input
                      id="video_url"
                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                      {...register('video_url')}
                    />
                    {errors.video_url && (
                      <p className="text-sm text-red-500 mt-1">{errors.video_url.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      YouTube or Vimeo only. Make sure the video is unlisted or public.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="thumbnail_url">Thumbnail URL (optional)</Label>
                    <Input
                      id="thumbnail_url"
                      placeholder="https://..."
                      {...register('thumbnail_url')}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If not provided, we'll use the video platform's default thumbnail.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="public_description">Public Catalog Description (optional)</Label>
                    <textarea
                      id="public_description"
                      className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md"
                      placeholder="Brief description for public catalog (max 500 characters)"
                      {...register('public_description')}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If not provided, we'll use your logline from Section 2.
                    </p>
                  </div>

                  {submissionMode === 'creator' && (
                    <div className="bg-blue-50 p-4 rounded-md">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="catalog_opt_in"
                          className="mt-1"
                          {...register('catalog_opt_in')}
                        />
                        <div>
                          <Label htmlFor="catalog_opt_in" className="cursor-pointer font-medium">
                            List in Public Catalog (after approval)
                          </Label>
                          <p className="text-xs text-gray-600 mt-1">
                            After your submission is processed, it will appear in our public catalog for licensing opportunities. You keep 80% of any licensing fees. Creator Record submissions are listed with a self-attested badge. You can opt out at any time from your dashboard.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {submissionMode === 'agency' && (
                    <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-500">
                      Catalog listing not available for agency submissions. The Chain of Title document is delivered directly to you.
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(submissionMode === 'agency' ? 7 : 8)}>
                      ← Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentSection(10)}>
                      Continue →
                    </Button>
                  </div>
                </div>
              )}

              {/* Section 10: Review & Payment */}
              {currentSection === 10 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">10. Review & Submit</h3>

                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="font-medium mb-2">Summary:</h4>
                    <ul className="text-sm space-y-1">
                      <li><strong>Tier:</strong> {selectedTier === 'creator_record' ? 'Creator Record — $29 (self-attested)' : 'SI8 Certified — $499 (human review)'}</li>
                      <li><strong>Film Title:</strong> {watch('title')}</li>
                      <li><strong>Tools Used:</strong> {tools.length} tool{tools.length !== 1 ? 's' : ''} added</li>
                      {submissionMode === 'creator' && <li><strong>Territory:</strong> {watch('territory')}</li>}
                      <li><strong>Submission Mode:</strong> {submissionMode === 'agency' ? 'Agency / Production House' : 'Individual Creator'}</li>
                    </ul>
                  </div>

                  {/* Indemnification checkbox — required for all tiers */}
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
                    <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(9)}>
                      ← Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1"
                      onClick={() => {
                        if (!indemnificationAccepted) {
                          setIndemnificationError('You must accept the accuracy warranty to proceed')
                        }
                      }}
                    >
                      {isSubmitting
                        ? 'Creating submission...'
                        : `Submit & Pay ${selectedTier === 'creator_record' ? '$29' : '$499'}`}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Add Tool Modal */}
        <AddToolModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingTool(null)
          }}
          onSave={handleSaveTool}
          editTool={editingTool}
          userId={userId}
          requireReceipt={selectedTier === 'certified'}
        />
      </div>
    </div>
  )
}
