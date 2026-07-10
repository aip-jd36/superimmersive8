// CATALOG DISABLED: Public catalog/Showcase is not active in this phase.
// Kept for potential future reactivation. Returns empty list so any
// stale client code doesn't break.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ entries: [] }, { status: 200 })
}

/* CATALOG DISABLED - original implementation preserved below

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET_disabled(request: NextRequest) {
  const { data: entries, error } = await supabaseAdmin
    .from('opt_ins')
    .select(`
      id, catalog_id, video_url, thumbnail_url, public_description,
      submission:submissions!inner (title, genre, filmmaker_name, status, tier, runtime)
    `)
    .eq('opted_in', true)
    .eq('visible', true)
    .eq('submission.status', 'approved')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ entries: entries || [] }, { status: 200 })
}

*/
