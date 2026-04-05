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
import Link from 'next/link'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
})

type SignupForm = z.infer<typeof signupSchema>

function ProductContext({ nextPath }: { nextPath: string }) {
  if (nextPath === '/record') {
    return (
      <div style={{
        background: '#FFFBF5',
        border: '1px solid #C8900A',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{
            background: '#1a1918',
            color: '#aaa',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '1px',
            padding: '3px 8px',
            borderRadius: '3px',
            textTransform: 'uppercase',
          }}>Pre-Commercial Record</span>
          <span style={{ color: '#C8900A', fontWeight: 700, fontSize: '15px' }}>Creator Record — $29</span>
        </div>
        <p style={{ color: '#5a3e00', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
          Self-attested Chain of Title documentation. You fill out the form — SI8 generates and files your PDF with a permanent record ID. Instant automated delivery.
        </p>
        <p style={{ color: '#999', fontSize: '12px', margin: '8px 0 0', fontStyle: 'italic' }}>
          Not accepted by brand legal teams or E&amp;O underwriters for commercial use.
        </p>
      </div>
    )
  }

  if (nextPath === '/certify') {
    return (
      <div style={{
        background: '#FFFBF5',
        border: '1px solid #C8900A',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{
            background: '#C8900A',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '1px',
            padding: '3px 8px',
            borderRadius: '3px',
            textTransform: 'uppercase',
          }}>SI8 Certified</span>
          <span style={{ color: '#C8900A', fontWeight: 700, fontSize: '15px' }}>SI8 Certified — $499</span>
        </div>
        <p style={{ color: '#5a3e00', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
          90-minute human review. SI8 issues a Chain of Title document stamped <strong>SI8 VERIFIED · COMMERCIAL AUDIT PASSED</strong> — accepted by brand legal teams and E&amp;O underwriters for commercial campaigns.
        </p>
        <p style={{ color: '#888', fontSize: '12px', margin: '8px 0 0' }}>
          Used to unlock $5K–$50K brand campaigns. 3–5 day turnaround.
        </p>
      </div>
    )
  }

  // No next param — show both products briefly
  return (
    <div style={{
      background: '#FFFBF5',
      border: '1px solid #e8d5a3',
      borderRadius: '8px',
      padding: '14px 18px',
      marginBottom: '24px',
    }}>
      <p style={{ color: '#5a3e00', fontSize: '13px', margin: '0 0 10px', fontWeight: 600 }}>
        Two ways to document your AI video:
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <div style={{ color: '#1a1918', fontWeight: 700, fontSize: '13px' }}>Creator Record — $29</div>
          <div style={{ color: '#777', fontSize: '12px', marginTop: '2px' }}>Self-attested · Automated · Pre-commercial</div>
        </div>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <div style={{ color: '#C8900A', fontWeight: 700, fontSize: '13px' }}>SI8 Certified — $499</div>
          <div style={{ color: '#777', fontSize: '12px', marginTop: '2px' }}>Human review · Cleared for commercial use</div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [nextPath, setNextPath] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setNextPath(params.get('next') || '')
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    try {
      setError(null)

      const callbackUrl = nextPath
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
        : `${window.location.origin}/auth/callback`

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: 'creator',
          },
          emailRedirectTo: callbackUrl,
        },
      })

      if (authError) throw authError

      // Notify admin of new signup (non-blocking — don't await)
      fetch('/api/notify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: data.fullName, email: data.email, nextPath }),
      }).catch(() => {}) // silently ignore if notification fails

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup')
    }
  }

  const loginHref = nextPath ? `/auth/login?next=${encodeURIComponent(nextPath)}` : '/auth/login'

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We've sent you an email verification link. Please check your inbox and click the link to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={loginHref}>Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pageTitle = nextPath === '/certify'
    ? 'Create your account to get started'
    : nextPath === '/record'
    ? 'Create your account to get started'
    : 'Create your account'

  const pageDescription = nextPath === '/certify'
    ? 'You\'ll be taken to the SI8 Certified submission form after signing up.'
    : nextPath === '/record'
    ? 'You\'ll be taken to the Creator Record form after signing up.'
    : 'Join SI8 to submit your AI video for Chain of Title documentation.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductContext nextPath={nextPath} />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href={loginHref} className="text-primary hover:underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
