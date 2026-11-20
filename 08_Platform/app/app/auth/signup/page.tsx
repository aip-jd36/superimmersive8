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
import { Turnstile } from '@marsidev/react-turnstile'
import { CREATOR_RECORD_V1_NEW_SALES } from '@/lib/submissions/build-intake-insert'
import { SignupProductContext, SIGNUP_COPY } from '@/components/auth/SignupProductContext'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [nextPath, setNextPath] = useState<string>('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const supabase = createClient()
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next') || ''
    // CR-V2-CUTOVER-1: the retired v1 form is never a sign-up destination (or shown as a product).
    setNextPath(next === '/record' && CREATOR_RECORD_V1_NEW_SALES !== 'open' ? '/creator-record' : next)
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

      if (turnstileSiteKey && !captchaToken) {
        setError('Please complete the verification check.')
        return
      }

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
          captchaToken: captchaToken ?? undefined,
        },
      })

      if (authError) throw authError

      // CR-PUBLIC-2A-FIX: the admin notification is sent server-side from /auth/callback once Supabase confirms the email
      // (lib/auth/signup-notification.ts). The browser no longer calls a public notification endpoint.

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
    : 'Create your account'

  // SI8-SIGNUP-COPY-1: '/record' never reaches here while v1 sales are retired (see the redirect above).
  const pageDescription = nextPath === '/certify'
    ? SIGNUP_COPY.subtitle.certify
    : SIGNUP_COPY.subtitle.generic

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupProductContext nextPath={nextPath} />

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

            {turnstileSiteKey && (
              <div className="flex justify-center">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{ theme: 'light' }}
                />
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || (!!turnstileSiteKey && !captchaToken)}
            >
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
