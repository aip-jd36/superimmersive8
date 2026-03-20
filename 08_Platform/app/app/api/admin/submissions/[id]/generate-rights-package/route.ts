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
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_admin, name, email')
      .eq('id', authUser.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { catalogId, modelDisclosure, tier, categoryConflicts, territory } = body

    if (!catalogId) {
      return NextResponse.json({ error: 'Catalog ID required' }, { status: 400 })
    }

    // Fetch submission with all data
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', params.id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check if Rights Package already exists
    const { data: existing } = await supabaseAdmin
      .from('rights_packages')
      .select('id')
      .eq('submission_id', params.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Rights Package already exists' }, { status: 400 })
    }

    // Parse submission JSONB fields
    const toolsUsed = submission.tools_used ? JSON.parse(submission.tools_used) : []

    // Build 9-field Rights Package data
    const rightsPackageData = {
      submission_id: params.id,
      catalog_id: catalogId,

      // Field 1: Tool Provenance Log (JSONB)
      tool_provenance_log: {
        tools: toolsUsed.map((tool: any) => ({
          name: tool.tool || 'Unknown',
          version: tool.version || 'Not specified',
          plan_type: tool.plan_type || 'commercial',
          dates: tool.dates || 'Not specified',
          receipt_verified: true,
        })),
        verification_date: new Date().toISOString(),
      },

      // Field 2: Model Disclosure (TEXT)
      model_disclosure: modelDisclosure || 'See tool provenance log',

      // Field 3: Rights Verified Sign-off (JSONB)
      rights_verified_signoff: {
        reviewer: userData.name || userData.email,
        reviewer_email: userData.email,
        date: new Date().toISOString(),
        tier: tier || 'Standard',
        status: 'verified',
      },

      // Field 4: Commercial Use Authorization (JSONB)
      commercial_use_authorization: {
        authorized: true,
        basis: 'Paid commercial plan receipts verified',
        tools_verified: toolsUsed.map((t: any) => t.tool || 'Unknown'),
        verification_date: new Date().toISOString(),
      },

      // Field 5: Modification Rights Status (JSONB)
      modification_rights_status: {
        authorized: submission.modification_authorized || false,
        scope: submission.modification_scope || 'Not authorized',
        tier_2_eligible: submission.modification_authorized,
      },

      // Field 6: Category Conflict Log (TEXT[])
      category_conflict_log: categoryConflicts || [],

      // Field 7: Territory Log (TEXT)
      territory_log: territory || submission.territory_preferences || 'Global',

      // Field 8: Regeneration Rights Status (JSONB)
      regeneration_rights_status: {
        authorized: submission.modification_authorized || false,
        scenes: submission.modification_scope || 'N/A',
        ai_regeneration_permitted: submission.modification_authorized,
      },

      // Field 9: Version History (JSONB)
      version_history: {
        current_version: 'v1.0',
        created_date: new Date().toISOString(),
        changes: [
          {
            version: 'v1.0',
            date: new Date().toISOString(),
            description: 'Initial Rights Package generation',
            reviewer: userData.name || userData.email,
          },
        ],
      },

      // PDF will be generated separately
      pdf_url: null,
      pdf_generated_at: null,
    }

    // Insert Rights Package record
    const { data: rightsPackage, error: insertError } = await supabaseAdmin
      .from('rights_packages')
      .insert(rightsPackageData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating Rights Package:', insertError)
      return NextResponse.json({ error: 'Failed to create Rights Package' }, { status: 500 })
    }

    console.log(`Rights Package created for submission ${params.id}, catalog ID: ${catalogId}`)

    // TODO: Generate PDF in background or next step
    // For MVP, we'll generate a simple markdown/text version
    // Later: Use react-pdf or puppeteer for styled PDF

    return NextResponse.json({
      success: true,
      rightsPackageId: rightsPackage.id,
      catalogId: catalogId,
      message: 'Rights Package generated successfully. PDF generation coming soon.',
    })
  } catch (error) {
    console.error('Error in generate-rights-package route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
