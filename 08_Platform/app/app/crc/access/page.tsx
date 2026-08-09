'use client'

/**
 * /crc/access -- the pilot access-code gate (CRC Limited Pilot, Part 6).
 * No accounts, no auth system: a single shared code, validated
 * server-side by POST /api/crc/pilot-access, which sets the httpOnly
 * cookie middleware.ts checks. This page never sees or stores the code
 * itself beyond the one submit call.
 */

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function CrcAccessPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [redirectedFrom, setRedirectedFrom] = useState('')

  // Same pattern as auth/login/page.tsx -- reading window.location.search in
  // an effect avoids the Suspense-boundary requirement useSearchParams()
  // would otherwise impose on this page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRedirectedFrom(params.get('redirectedFrom') || '')
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed || status === 'submitting') return
    setStatus('submitting')

    const res = await fetch('/api/crc/pilot-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmed }),
    })

    if (res.ok) {
      router.push(redirectedFrom.startsWith('/crc') ? redirectedFrom : '/crc')
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Commercial Readiness Check</CardTitle>
          <CardDescription>This is a limited pilot. Enter your access code to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code" disabled={status === 'submitting'} autoFocus />
            {status === 'error' && <p className="text-sm text-red-600">That code isn&apos;t valid.</p>}
            <Button type="submit" disabled={status === 'submitting' || code.trim().length === 0} className="w-full">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
