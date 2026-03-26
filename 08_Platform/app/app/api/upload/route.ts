import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated via server-side session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const validFolders = [
      'receipts', 'screenshots', 'audio-docs',
      'likeness-releases', 'ip-licenses', 'fair-use-docs', 'production-evidence',
    ]
    if (!folder || !validFolders.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Build file path scoped to user
    const timestamp = new Date().toISOString().split('T')[0]
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}-${timestamp}-${randomSuffix}.${fileExt}`
    const filePath = `${user.id}/${folder}/${fileName}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload using service role key (bypasses RLS)
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('submission-files')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL (will be a signed URL since bucket is private)
    const { data: urlData } = supabaseAdmin.storage
      .from('submission-files')
      .getPublicUrl(filePath)

    return NextResponse.json({
      path: filePath,
      url: urlData.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    })

  } catch (error) {
    console.error('Upload route error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
