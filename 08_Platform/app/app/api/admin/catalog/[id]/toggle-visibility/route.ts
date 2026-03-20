import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    // Verify admin auth
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (!user?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current visibility
    const { data: entry } = await supabaseAdmin
      .from('opt_ins')
      .select('visible')
      .eq('id', params.id)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Toggle visibility
    const { error: updateError } = await supabaseAdmin
      .from('opt_ins')
      .update({ visible: !entry.visible })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating visibility:', updateError)
      return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 })
    }

    return NextResponse.json({ success: true, visible: !entry.visible })
  } catch (error) {
    console.error('Error in toggle-visibility route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
