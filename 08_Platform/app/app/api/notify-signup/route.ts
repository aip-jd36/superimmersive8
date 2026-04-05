import { NextResponse } from 'next/server'
import { sendNewUserSignupEmail } from '@/lib/emails'

export async function POST(request: Request) {
  try {
    const { fullName, email, nextPath } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    await sendNewUserSignupEmail(fullName || 'Unknown', email, nextPath || '')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('notify-signup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
