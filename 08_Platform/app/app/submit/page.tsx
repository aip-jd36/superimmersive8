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

// Simplified schema for MVP - covers all 10 sections
const submissionSchema = z.object({
  // Section 2: Production Overview
  title: z.string().min(1, 'Title is required'),
  runtime_minutes: z.number().min(0).optional(),
  runtime_seconds: z.number().min(0).max(59).optional(),
  genre: z.string().optional(),
  logline: z.string().max(500).optional(),
  intended_use: z.string().optional(),

  // Section 3: Tool Disclosure
  tools_used: z.string().min(1, 'At least one tool must be listed'),

  // Section 4: Human Authorship Declaration
  authorship_statement: z.string().min(150, 'Must be at least 150 words'),

  // Section 5: Likeness & Identity (4 individual checkboxes - all required)
  likeness_no_real_faces: z.boolean().refine((val) => val === true, 'Required'),
  likeness_no_real_voices: z.boolean().refine((val) => val === true, 'Required'),
  likeness_no_lookalikes: z.boolean().refine((val) => val === true, 'Required'),
  likeness_no_synthetic_people: z.boolean().refine((val) => val === true, 'Required'),

  // Section 6: IP & Brand (3 individual checkboxes - all required)
  ip_no_copyrighted_characters: z.boolean().refine((val) => val === true, 'Required'),
  ip_no_brand_imitation: z.boolean().refine((val) => val === true, 'Required'),
  ip_no_trademarked_ip: z.boolean().refine((val) => val === true, 'Required'),

  // Section 7: Audio & Music
  audio_source: z.enum(['ai_generated', 'licensed', 'silent']),
  audio_documentation: z.string().optional(),

  // Section 8: Modification Rights
  modification_rights: z.enum(['full', 'scenes', 'no'], {
    required_error: 'Please select an option',
  }),
  modification_scope: z.string().optional(),

  // Section 9: Territory
  territory: z.enum(['Global', 'North America', 'Europe', 'Asia', 'Other'], {
    required_error: 'Please select a territory',
  }),
  territory_other: z.string().optional(),
  existing_restrictions: z.string().optional(),

  // Section 10: Supporting Materials + Catalog Opt-In
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
      modification_rights: 'no',
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

  const onSubmit = async (data: SubmissionFormData) => {
    console.log('🚀 Form submitted! Data:', data)
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

        // Tool Disclosure (JSONB)
        tools_used: JSON.stringify([{ tool: data.tools_used || 'Not specified' }]),

        // Human Authorship
        authorship_statement: data.authorship_statement,

        // Likeness & IP (JSONB with individual confirmations)
        likeness_confirmation: JSON.stringify({
          no_real_faces: data.likeness_no_real_faces || false,
          no_real_voices: data.likeness_no_real_voices || false,
          no_lookalikes: data.likeness_no_lookalikes || false,
          no_synthetic_people: data.likeness_no_synthetic_people || false,
          all_confirmed: data.likeness_no_real_faces && data.likeness_no_real_voices && data.likeness_no_lookalikes && data.likeness_no_synthetic_people
        }),
        ip_confirmation: JSON.stringify({
          no_copyrighted_characters: data.ip_no_copyrighted_characters || false,
          no_brand_imitation: data.ip_no_brand_imitation || false,
          no_trademarked_ip: data.ip_no_trademarked_ip || false,
          all_confirmed: data.ip_no_copyrighted_characters && data.ip_no_brand_imitation && data.ip_no_trademarked_ip
        }),

        // Audio (JSONB with source_type and documentation)
        audio_disclosure: JSON.stringify({
          source_type: data.audio_source || 'not_specified',
          documentation: data.audio_documentation || null
        }),

        // Modification Rights
        modification_authorized: data.modification_rights === 'full' || data.modification_rights === 'scenes',
        modification_scope: data.modification_rights === 'scenes' ? data.modification_scope : null,

        // Territory
        territory_preferences: data.territory === 'Other' ? data.territory_other : data.territory,

        // Supporting Materials (JSONB array)
        supporting_materials: JSON.stringify([]),

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
              Complete all sections to submit your AI video for verification ($499)
            </CardDescription>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progress: Section {currentSection} of 11</span>
                <span>{Math.round((currentSection / 11) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(currentSection / 11) * 100}%` }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit, (errors) => {
              console.log('❌ Form validation errors:', errors)
              alert('Please fill out all required fields. Check the console for details.')
            })} className="space-y-8">
              {/* Section 1: Filmmaker Profile (auto-filled) */}
              {currentSection === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">1. Filmmaker Profile</h3>
                  <p className="text-sm text-gray-600">
                    Your profile information is automatically filled from your account settings.
                  </p>
                  <Button type="button" onClick={() => setCurrentSection(2)}>
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
                    List all AI tools used (simplified for MVP - enter as comma-separated list)
                  </p>

                  <div>
                    <Label htmlFor="tools_used">
                      AI Tools Used * (e.g., "Runway Gen-3, Midjourney, ElevenLabs")
                    </Label>
                    <Input id="tools_used" {...register('tools_used')} />
                    {errors.tools_used && (
                      <p className="text-sm text-red-500">{errors.tools_used.message}</p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(2)}>
                      ← Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentSection(4)}>
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

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(3)}>
                      ← Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentSection(5)}>
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
                    All checkboxes must be checked to proceed. We cannot accept content with real person likenesses without proper authorization.
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
                        No real person faces without consent *
                      </Label>
                    </div>
                    {errors.likeness_no_real_faces && (
                      <p className="text-sm text-red-500 ml-7">{errors.likeness_no_real_faces.message}</p>
                    )}

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="likeness_no_real_voices"
                        {...register('likeness_no_real_voices')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="likeness_no_real_voices" className="cursor-pointer">
                        No real person voices without consent *
                      </Label>
                    </div>
                    {errors.likeness_no_real_voices && (
                      <p className="text-sm text-red-500 ml-7">{errors.likeness_no_real_voices.message}</p>
                    )}

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="likeness_no_lookalikes"
                        {...register('likeness_no_lookalikes')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="likeness_no_lookalikes" className="cursor-pointer">
                        No lookalikes or impersonation of real people *
                      </Label>
                    </div>
                    {errors.likeness_no_lookalikes && (
                      <p className="text-sm text-red-500 ml-7">{errors.likeness_no_lookalikes.message}</p>
                    )}

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="likeness_no_synthetic_people"
                        {...register('likeness_no_synthetic_people')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="likeness_no_synthetic_people" className="cursor-pointer">
                        No synthetic versions of real people (deepfakes) *
                      </Label>
                    </div>
                    {errors.likeness_no_synthetic_people && (
                      <p className="text-sm text-red-500 ml-7">{errors.likeness_no_synthetic_people.message}</p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(4)}>
                      ← Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentSection(6)}>
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
                    All checkboxes must be checked to proceed. We cannot accept content that infringes on existing intellectual property.
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
                        No copyrighted characters (e.g., Marvel, Disney, anime characters) *
                      </Label>
                    </div>
                    {errors.ip_no_copyrighted_characters && (
                      <p className="text-sm text-red-500 ml-7">{errors.ip_no_copyrighted_characters.message}</p>
                    )}

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="ip_no_brand_imitation"
                        {...register('ip_no_brand_imitation')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="ip_no_brand_imitation" className="cursor-pointer">
                        No recognizable brand imitation (logos, trade dress, packaging) *
                      </Label>
                    </div>
                    {errors.ip_no_brand_imitation && (
                      <p className="text-sm text-red-500 ml-7">{errors.ip_no_brand_imitation.message}</p>
                    )}

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="ip_no_trademarked_ip"
                        {...register('ip_no_trademarked_ip')}
                        className="h-4 w-4 mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="ip_no_trademarked_ip" className="cursor-pointer">
                        No trademarked intellectual property without authorization *
                      </Label>
                    </div>
                    {errors.ip_no_trademarked_ip && (
                      <p className="text-sm text-red-500 ml-7">{errors.ip_no_trademarked_ip.message}</p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(5)}>
                      ← Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentSection(7)}>
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

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(6)}>
                      ← Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentSection(8)}>
                      Continue →
                    </Button>
                  </div>
                </div>
              )}

              {/* Section 8: Modification Rights */}
              {currentSection === 8 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">8. Modification Rights Authorization</h3>
                  <p className="text-sm text-gray-600">
                    Do you authorize SI8 to commission AI-regenerated brand-integrated versions for Custom AI Placement deals?
                  </p>

                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        id="modification_full"
                        value="full"
                        {...register('modification_rights')}
                        className="h-4 w-4 mt-1"
                      />
                      <Label htmlFor="modification_full" className="cursor-pointer">
                        <div>
                          <div className="font-medium">Yes, full work</div>
                          <div className="text-sm text-gray-600">
                            SI8 can regenerate any part of this work for brand placement
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        id="modification_scenes"
                        value="scenes"
                        {...register('modification_rights')}
                        className="h-4 w-4 mt-1"
                      />
                      <Label htmlFor="modification_scenes" className="cursor-pointer">
                        <div>
                          <div className="font-medium">Yes, specific scenes only</div>
                          <div className="text-sm text-gray-600">
                            I'll specify which scenes can be regenerated (describe below)
                          </div>
                        </div>
                      </Label>
                    </div>

                    {watch('modification_rights') === 'scenes' && (
                      <div className="ml-7 mt-2">
                        <Label htmlFor="modification_scope">
                          Describe which scenes can be modified *
                        </Label>
                        <textarea
                          id="modification_scope"
                          {...register('modification_scope')}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                          placeholder="e.g., 'Scene 2 (0:15-0:45) where the protagonist walks through the city'"
                        />
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        id="modification_no"
                        value="no"
                        {...register('modification_rights')}
                        className="h-4 w-4 mt-1"
                      />
                      <Label htmlFor="modification_no" className="cursor-pointer">
                        <div>
                          <div className="font-medium">No</div>
                          <div className="text-sm text-gray-600">
                            I do not authorize modifications (catalog licensing only)
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>

                  {errors.modification_rights && (
                    <p className="text-sm text-red-500">{errors.modification_rights.message}</p>
                  )}

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

              {/* Section 9: Territory */}
              {currentSection === 9 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">9. Territory & Exclusivity Preferences</h3>
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
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(8)}>
                      ← Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentSection(10)}>
                      Continue →
                    </Button>
                  </div>
                </div>
              )}

              {/* Section 10: Video & Catalog */}
              {currentSection === 10 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">10. Video & Catalog Listing</h3>
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
                          After your work is approved, it will appear in our public catalog for licensing opportunities.
                          You can opt out at any time from your dashboard.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(9)}>
                      ← Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentSection(11)}>
                      Continue →
                    </Button>
                  </div>
                </div>
              )}

              {/* Section 11: Review & Payment */}
              {currentSection === 11 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">11. Review & Submit</h3>
                  <p className="text-sm text-gray-600">
                    Please review your submission. Clicking "Submit & Pay $499" will redirect you to Stripe for payment.
                  </p>

                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="font-medium mb-2">Summary:</h4>
                    <ul className="text-sm space-y-1">
                      <li>Film Title: {watch('title')}</li>
                      <li>Tools Used: {watch('tools_used')}</li>
                      <li>Territory: {watch('territory')}</li>
                    </ul>
                  </div>

                  {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(10)}>
                      ← Back
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? 'Creating submission...' : 'Submit & Pay $499'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
