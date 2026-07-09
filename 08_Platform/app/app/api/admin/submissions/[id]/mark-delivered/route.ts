import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: { id: string } }

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

    // Verify signed before marking delivered
    const { data: sub } = await supabaseAdmin
      .from('submissions')
      .select('provenance_status')
      .eq('id', params.id)
      .single()
    if (sub?.provenance_status !== 'signed') {
      return NextResponse.json({ error: 'Must be signed before marking delivered' }, { status: 400 })
    }

    await supabaseAdmin
      .from('submissions')
      .update({ provenance_status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', params.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in mark-delivered route:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
