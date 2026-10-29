import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * CR-PDF-CLAIMS-1B — the legacy Certified Chain of Title generator is retired.
 *
 * This route used to auto-populate a rights package from the submission and render a public
 * Chain of Title PDF stating receipt verification, commercial clearance and a passed audit that
 * no workflow performed. Its admin UI was removed on 2026-07-13 (217cbbb8); the route stayed live.
 * It now answers 410 to an authorized admin and does nothing else: it does not read the request
 * body or the submission, render a PDF, write the database, upload to storage or send email.
 * The human-reviewed Commercial Assurance Assessment workflow (workbook → sign → Assessment
 * Report) is separate and does not use this route.
 *
 * Authorization is checked first, unchanged, so an unauthenticated or non-admin caller learns
 * nothing from the retirement response.
 */
const LEGACY_CHAIN_OF_TITLE_RETIRED = {
  error: 'Legacy Chain of Title generation is retired. Nothing was generated or changed. Certified submissions use the Commercial Assurance Assessment workflow.',
  status: 'retired',
}

export async function POST(_request: NextRequest, _context: RouteContext) {
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

    return NextResponse.json(LEGACY_CHAIN_OF_TITLE_RETIRED, { status: 410 })
  } catch (error) {
    console.error('Error in generate-rights-package route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
