/**
 * CR-LEGACY-DOCUMENT-SECURITY-1C — historical (pre-artifact) Creator Record PDFs are served only through the
 * authenticated delivery route; no active UI renders a raw storage URL; serving reads and never issues.
 * Behaviour is exercised in precedence-and-delivery.test.ts; this suite pins the wiring.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = join(__dirname, '..', '..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = join(dir, name)
    if (statSync(join(ROOT, rel)).isDirectory()) return sources(rel)
    return /\.(tsx|ts)$/.test(name) ? [rel] : []
  })
}

describe('no active UI download consumer uses a raw storage URL', () => {
  test.each(sources('app').filter((f) => f.endsWith('.tsx')).map((f) => [relative('.', f)]))('%s', (file) => {
    const src = read(file)
    expect(src).not.toMatch(/href=\{[^}]*document_url/)
    expect(src).not.toMatch(/storage\/v1\/object\/public/)
  })

  test('the customer dashboard links legacy Creator Records to the delivery route only', () => {
    const src = read('app/dashboard/submissions/[id]/page.tsx')
    expect(src).toContain("const hasLegacyCreatorRecord = (submission as any).tier === 'creator_record' && !!rightsPackage?.document_url")
    expect(src).toContain('const pdfLink: string | null = artifactError ? null : (issuedArtifact || hasLegacyCreatorRecord) ? deliveryPathFor(params.id) : null')
    expect(src).not.toMatch(/rightsPackage\?\.document_url \?\?/)
  })

  test('the admin download button uses the delivery route', () => {
    expect(read('app/admin/submissions/[id]/GenerateRightsPackageButton.tsx')).toContain('<a href={deliveryPathFor(submissionId)}')
  })
})

describe('legacy delivery wiring reads, never issues', () => {
  test('the delivery contract imports nothing that can render, upload or record an issuance', () => {
    const imports = read('lib/creator-record-artifacts/deliver.ts').match(/^import .*$/gm) ?? []
    expect(imports).toEqual(["import { sha256Hex, type ArtifactRow } from './issue'"])
  })

  test('the route returns every reference (ambiguity is detectable) and reads objects only through the legacy store', () => {
    const src = read('app/api/creator-record/[id]/pdf/route.ts')
    expect(src).toContain(".from('rights_packages').select('submission_id, document_path, document_url').eq('submission_id', submissionId)")
    const lookup = src.slice(src.indexOf('async legacyReferences'), src.indexOf('getLegacyObject:'))
    expect(lookup).not.toContain('maybeSingle')
    expect(lookup).toContain("if (error) throw new Error('creator_record_legacy_reference_lookup_failed')")
    expect(src).toMatch(/^\s*getLegacyObject,\r?$/m)
    expect(src).not.toMatch(/legacyUrl|Location|redirect/)
  })

  test('the legacy read is read-only, bound to the legacy bucket, and lives outside the private artifact module', () => {
    const src = read('app/api/creator-record/[id]/pdf/route.ts')
    expect(src).toContain("const LEGACY_DOCUMENTS_BUCKET = 'documents'")
    expect(src).toContain('supabaseAdmin.storage.from(LEGACY_DOCUMENTS_BUCKET).download(path)')
    expect(src.match(/supabaseAdmin\.storage/g)).toHaveLength(1)
    expect(src).not.toMatch(/\.upload\(|\.remove\(|\.move\(|\.copy\(|createSignedUrl|getPublicUrl|\.insert\(|\.update\(|\.upsert\(/)
  })
})
