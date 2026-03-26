import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: { id: string }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', authUser.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, any> = {}

    if (body.reviewer_checklist !== undefined) {
      updates.reviewer_checklist = body.reviewer_checklist
    }
    if (body.risk_rating !== undefined) {
      updates.risk_rating = body.risk_rating
    }
    if (body.risk_notes !== undefined) {
      updates.risk_notes = body.risk_notes
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update(updates)
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating review state:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in review-state route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
