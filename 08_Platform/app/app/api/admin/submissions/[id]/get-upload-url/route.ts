import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: { id: string } }

const VALID_BUCKETS = ['source-videos', 'report-pdfs'] as const
type Bucket = typeof VALID_BUCKETS[number]

const BUCKET_MIME: Record<Bucket, string[]> = {
  'source-videos': ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  'report-pdfs': ['application/pdf'],
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: userData } = await supabaseAdmin
      .from('users').select('is_admin').eq('id', authUser.id).single()
    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { bucket, fileExt } = body as { bucket: string; fileExt?: string }

    if (!VALID_BUCKETS.includes(bucket as Bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }

    const safeBucket = bucket as Bucket
    const filePath = safeBucket === 'source-videos'
      ? `${params.id}/original.${(fileExt || 'mp4').toLowerCase()}`
      : `${params.id}/report.pdf`

    const { data, error } = await supabaseAdmin.storage
      .from(safeBucket)
      .createSignedUploadUrl(filePath)

    if (error || !data) {
      console.error('Failed to create signed upload URL:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: filePath,
    })
  } catch (err) {
    console.error('Error in get-upload-url route:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
