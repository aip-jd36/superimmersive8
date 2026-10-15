import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { buildIntakeInsert } from '@/lib/submissions/build-intake-insert'

// CAA-SECURITY-3A: the insert below uses the service role (bypasses RLS), so
// this route is the authorization boundary for submission creation:
//   - the creator is the authenticated session user (never the request body);
//   - only allowlisted intake fields are written (lib/submissions/build-intake-insert.ts);
//   - status / payment_status are set server-side;
//   - database error details are logged server-side, never returned.

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const submissionData = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).submissionData : undefined
    const built = buildIntakeInsert(submissionData, user.id)
    if (!built.ok) {
      return NextResponse.json({ error: 'Invalid submission', reason: built.reason }, { status: 400 })
    }
    if (built.discarded_fields.length > 0) {
      // Field names only — never values.
      console.warn('[submissions/create] discarded non-intake fields', { userId: user.id, fields: built.discarded_fields })
    }

    const { data: submission, error } = await supabaseAdmin
      .from('submissions')
      .insert(built.row)
      .select('id') // both intake forms only read `submission.id`
      .single()

    if (error || !submission) {
      console.error('[submissions/create] insert failed', { userId: user.id, code: error?.code, message: error?.message })
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 400 })
    }

    // CATALOG DISABLED: opt_in record creation removed (catalogData is ignored).
    // Video URL now lives on submissions.video_url directly.

    return NextResponse.json({ submission }, { status: 200 })
  } catch (error) {
    console.error('[submissions/create] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
