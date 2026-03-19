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

  // Section 5: Likeness & Identity
  likeness_confirmed: z.boolean().refine((val) => val === true, 'You must confirm'),

  // Section 6: IP & Brand
  ip_confirmed: z.boolean().refine((val) => val === true, 'You must confirm'),

  // Section 7: Audio & Music
  audio_source: z.enum(['ai_generated', 'licensed', 'silent']),
  audio_documentation: z.string().optional(),

  // Section 8: Modification Rights
  modification_authorized: z.boolean(),
  modification_scope: z.string().optional(),

  // Section 9: Territory
  territory: z.string().default('Global'),
  existing_restrictions: z.string().optional(),

  // Section 10: Supporting Materials (handled separately with file uploads)
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
      modification_authorized: false,
      likeness_confirmed: false,
      ip_confirmed: false,
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
      const submissionData = {
        user_id: user_id,
        title: data.title,
        runtime_seconds,
        genre: data.genre,
        logline: data.logline,
        intended_use: data.intended_use,
        tools_used: data.tools_used, // In production, this would be JSONB array
        authorship_statement: data.authorship_statement,
        likeness_confirmed: data.likeness_confirmed,
        ip_confirmed: data.ip_confirmed,
        audio_source: data.audio_source,
        audio_documentation: data.audio_documentation,
        modification_authorized: data.modification_authorized,
        modification_scope: data.modification_scope,
        territory: data.territory,
        existing_restrictions: data.existing_restrictions,
        status: 'pending',
        payment_status: 'unpaid',
      }

      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .insert(submissionData)
        .select()
        .single()

      if (submissionError) throw submissionError

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
                    Describe your creative process (minimum 150 words)
                  </p>

                  <div>
                    <Label htmlFor="authorship_statement">Your Statement *</Label>
                    <textarea
                      id="authorship_statement"
                      {...register('authorship_statement')}
                      className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Describe your creative process: What prompts did you use? How did you iterate on outputs? What editorial decisions did you make?"
                    />
                    {errors.authorship_statement && (
                      <p className="text-sm text-red-500">{errors.authorship_statement.message}</p>
                    )}
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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="likeness_confirmed"
                      {...register('likeness_confirmed')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="likeness_confirmed">
                      I confirm this work contains no real person faces, voices, or likenesses without proper consent *
                    </Label>
                  </div>
                  {errors.likeness_confirmed && (
                    <p className="text-sm text-red-500">{errors.likeness_confirmed.message}</p>
                  )}

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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ip_confirmed"
                      {...register('ip_confirmed')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="ip_confirmed">
                      I confirm this work contains no copyrighted characters, brand imitation, or trademarked IP *
                    </Label>
                  </div>
                  {errors.ip_confirmed && (
                    <p className="text-sm text-red-500">{errors.ip_confirmed.message}</p>
                  )}

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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="modification_authorized"
                      {...register('modification_authorized')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="modification_authorized">
                      Yes, I authorize modification rights
                    </Label>
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

              {/* Section 9: Territory */}
              {currentSection === 9 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">9. Territory & Exclusivity</h3>

                  <div>
                    <Label htmlFor="territory">Territory</Label>
                    <Input id="territory" {...register('territory')} defaultValue="Global" />
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

              {/* Section 10: Review & Payment */}
              {currentSection === 10 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">10. Review & Submit</h3>
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
                    <Button type="button" variant="outline" onClick={() => setCurrentSection(9)}>
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
