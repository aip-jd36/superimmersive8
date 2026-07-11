import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

const WORK_DIR = path.join(os.tmpdir(), 'si8-typst')

function ensureWorkspace() {
  if (!fs.existsSync(WORK_DIR)) {
    fs.mkdirSync(WORK_DIR, { recursive: true })
  }
  // Copy template to workspace if not already there (reused across warm invocations)
  const dest = path.join(WORK_DIR, 'si8-report-template.typ')
  if (!fs.existsSync(dest)) {
    const src = path.join(process.cwd(), 'public', 'si8-report-template.typ')
    fs.copyFileSync(src, dest)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin auth
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

    const { typContent, assessId } = await req.json()
    if (!typContent || !assessId) {
      return NextResponse.json({ error: 'Missing typContent or assessId' }, { status: 400 })
    }

    // Set up workspace with template
    ensureWorkspace()

    // Write the generated .typ file
    const typFile = path.join(WORK_DIR, `${assessId}.typ`)
    fs.writeFileSync(typFile, typContent, 'utf-8')

    // Compile to PDF with Typst
    const { NodeCompiler } = await import('@myriaddreamin/typst-ts-node-compiler')
    const compiler = NodeCompiler.create({ workspace: WORK_DIR + path.sep })
    const pdfBytes = compiler.pdf({ mainFilePath: typFile })

    // Clean up per-assessment .typ (template stays for warm reuse)
    try { fs.unlinkSync(typFile) } catch { /* ignore */ }

    if (!pdfBytes) {
      return NextResponse.json({ error: 'Typst compilation produced no output — check .typ content for errors' }, { status: 500 })
    }

    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
    return new NextResponse(blob, {
      headers: {
        'Content-Disposition': `attachment; filename="${assessId}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[generate-report]', error)
    return NextResponse.json(
      { error: error?.message ?? 'PDF generation failed' },
      { status: 500 }
    )
  }
}
