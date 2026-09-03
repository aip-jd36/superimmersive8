/**
 * CAH-3D -- structural architecture boundaries (§25, §26, §29 tests 30-34,
 * §30). Scans the ACTUAL lib/crc-assurance-handoff/ file tree (not a sample)
 * so a file added later is automatically covered.
 *
 * Structural guarantees first (import graph, call graph); a supplementary
 * forbidden-word scan is defence-in-depth, not the proof.
 */

import * as fs from 'fs'
import * as path from 'path'

const APP_ROOT = path.join(__dirname, '..', '..')
const LIB_DIR = 'lib/crc-assurance-handoff'

function listTs(relDir: string): string[] {
  const full = path.join(APP_ROOT, relDir)
  if (!fs.existsSync(full)) return []
  const out: string[] = []
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    const p = path.join(relDir, e.name)
    if (e.isDirectory()) out.push(...listTs(p))
    else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out.push(p)
  }
  return out
}

function read(rel: string): string {
  return fs.readFileSync(path.join(APP_ROOT, rel), 'utf8')
}

/** Source with block + line comments stripped -- so a comment that legitimately
 *  NAMES a forbidden concept while forbidding it does not trip a scan. */
function codeOnly(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Just the `import ... from '...'` statements. */
function importLines(rel: string): string {
  return (read(rel).match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')
}

const FILES = listTs(LIB_DIR)

describe('CAH-3D module tree', () => {
  test('the association core exists and is non-trivial', () => {
    expect(FILES.length).toBeGreaterThanOrEqual(4)
    expect(FILES.some((f) => f.endsWith('service.ts'))).toBe(true)
    expect(FILES.some((f) => f.endsWith('state-binding.ts'))).toBe(true)
    expect(FILES.some((f) => f.endsWith('repository.ts'))).toBe(true)
  })
})

describe('30: no dependency on CRC Sales', () => {
  test.each(FILES)('%s does not import crc-sales', (rel) => {
    expect(importLines(rel)).not.toMatch(/crc-sales/)
    expect(codeOnly(rel)).not.toMatch(/crc_sales_state|crc_sales_events/)
  })
})

describe('31: no Bounded Interpretation constructor / reconstruction', () => {
  test.each(FILES)('%s does not import or call a BI constructor', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/bounded-interpretation/)
    expect(imp).not.toMatch(/build-bounded-interpretation/)
    const code = codeOnly(rel)
    expect(code).not.toMatch(/buildBoundedInterpretation/)
  })
})

describe('32: no Projection / Composition builders; no runCRCConversation', () => {
  test.each(FILES)('%s does not import Projection/Composition or call the CRC pipeline', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/projection-layer/)
    expect(imp).not.toMatch(/assemble-projection-output/)
    expect(imp).not.toMatch(/consultative/)
    expect(imp).not.toMatch(/run-crc-conversation/)
    expect(imp).not.toMatch(/retrieval-engine\/retrieve/)
    const code = codeOnly(rel)
    expect(code).not.toMatch(/runCRCConversation/)
    expect(code).not.toMatch(/assembleProjectionOutput/)
    expect(code).not.toMatch(/\bretrieve\s*\(/)
  })
})

describe('33: no provider / topic / Living-Knowledge-domain branching', () => {
  test.each(FILES)('%s contains no domain-specific dispatch', (rel) => {
    const code = codeOnly(rel).toLowerCase()
    for (const token of ['kling', 'runway', 'suno', 'luma', 'midjourney', 'pika', 'elevenlabs', 'veo', 'firefly', 'sora']) {
      expect(code).not.toContain(token)
    }
    // no branching on a governed topic / claim value
    expect(code).not.toMatch(/commercial_use|copyright_ownership|likeness|third_party_source_rights/)
    expect(code).not.toMatch(/claim_id|matrix_identifier|topic_claim/)
  })
})

describe('34: no Commercial Assurance evidence / findings types', () => {
  test.each(FILES)('%s imports no reviewer/assessment outcome logic', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/lib\/assessments/)
    expect(imp).not.toMatch(/reviewer-workbook|workbook-schema/)
    const code = codeOnly(rel)
    // No evidence/finding/outcome/risk vocabulary as identifiers.
    expect(code).not.toMatch(/reviewer_checklist|risk_rating|risk_notes/)
    expect(code).not.toMatch(/\boutcome\b/)
    expect(code).not.toMatch(/EVIDENCE_SUPPORTS|MATERIAL_RISKS|INSUFFICIENT_EVIDENCE/)
  })
})

describe('no LLM / model dependency', () => {
  test.each(FILES)('%s imports no anthropic/openai/llm adapter', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/anthropic/i)
    expect(imp).not.toMatch(/openai/i)
    expect(imp).not.toMatch(/\bllm\b/i)
  })
})

describe('the only DB module is repository.ts', () => {
  test.each(FILES)('%s -- supabase admin import only in repository.ts', (rel) => {
    const importsAdmin = /@\/lib\/supabase\/admin/.test(importLines(rel))
    if (rel.endsWith('repository.ts')) expect(importsAdmin).toBe(true)
    else expect(importsAdmin).toBe(false)
  })
})

describe('no customer / reviewer / Sales route or UI was added', () => {
  test('no crc-assurance-handoff route directory exists', () => {
    expect(fs.existsSync(path.join(APP_ROOT, 'app/api/crc-assurance-handoff'))).toBe(false)
    expect(fs.existsSync(path.join(APP_ROOT, 'app/api/admin/crc-associations'))).toBe(false)
    expect(fs.existsSync(path.join(APP_ROOT, 'app/admin/crc-associations'))).toBe(false)
  })

  test('the service is not referenced by any route or page', () => {
    const roots = ['app/api', 'app/admin', 'app/dashboard']
    const hits: string[] = []
    for (const r of roots) {
      const full = path.join(APP_ROOT, r)
      if (!fs.existsSync(full)) continue
      const stack = [full]
      while (stack.length) {
        const d = stack.pop()!
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name)
          if (e.isDirectory()) stack.push(p)
          else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
            if (/crc-assurance-handoff/.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(APP_ROOT, p))
          }
        }
      }
    }
    expect(hits).toEqual([])
  })
})
