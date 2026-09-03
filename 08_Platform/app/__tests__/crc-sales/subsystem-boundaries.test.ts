/**
 * CAH-3B — structural subsystem boundaries (§11, §16, §18, §23.C, §23.G).
 *
 * Scans the ACTUAL file trees (not a sample) so a file added later is
 * automatically covered.
 */

import * as fs from 'fs'
import * as path from 'path'

const APP_ROOT = path.join(__dirname, '..', '..')

function listFiles(dir: string, exts: string[]): string[] {
  const full = path.join(APP_ROOT, dir)
  if (!fs.existsSync(full)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFiles(p, exts))
    else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e)) && !entry.name.endsWith('.test.ts')) out.push(p)
  }
  return out
}

function read(rel: string): string {
  return fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
}

/** Source with block + line comments removed -- so a comment that legitimately
 *  NAMES a prohibited concept while explaining it is not implemented (e.g.
 *  "this module never infers materiality") does not itself trip a scan.
 *  Same discipline as project-knowledge-items.test.ts's import-scoped check. */
function codeOnly(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const CRC_SALES_LIB = listFiles('lib/crc-sales', ['.ts'])
const CRC_SALES_ROUTES = listFiles('app/api/admin/crc-leads', ['.ts'])
const CRC_SALES_UI = listFiles('app/admin/crc-leads', ['.tsx'])
const CRC_SALES_ALL = [...CRC_SALES_LIB, ...CRC_SALES_ROUTES, ...CRC_SALES_UI]

const ASSURANCE_FILES = [...listFiles('lib/assessments', ['.ts']), ...listFiles('app/admin/submissions', ['.ts', '.tsx']), ...listFiles('app/api/admin/submissions', ['.ts'])]

describe('crc-sales exists and is non-trivial', () => {
  test('the module tree is present', () => {
    expect(CRC_SALES_LIB.length).toBeGreaterThan(3)
    expect(CRC_SALES_ROUTES.length).toBeGreaterThanOrEqual(5)
  })
})

describe('no LLM / model dependency anywhere in crc-sales', () => {
  test.each(CRC_SALES_ALL)('%s imports no anthropic/openai/llm adapter', (rel) => {
    const src = read(rel)
    const importLines = (src.match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')
    expect(importLines).not.toMatch(/anthropic/i)
    expect(importLines).not.toMatch(/openai/i)
    expect(importLines).not.toMatch(/\/(mock|anthropic)-(extractor|candidate-question|decision)/i)
    expect(importLines).not.toMatch(/\bllm\b/i)
  })
})

describe('no provider / tool / topic / domain-specific branching in crc-sales', () => {
  test.each(CRC_SALES_LIB)('%s has no domain-value branch', (rel) => {
    const src = codeOnly(rel).toLowerCase()
    // The Sales layer consumes GENERIC governed representations. It must not
    // branch on specific providers/tools/topics/domains.
    for (const token of ['kling', 'runway', 'suno', 'midjourney', 'istock', 'getty', 'shutterstock', 'pond5', 'artlist', 'editorial designation', "=== 'stock'", "=== 'music'", "=== 'likeness'", "=== 'copyright'", 'client_asset']) {
      expect(src).not.toContain(token)
    }
  })
})

describe('crc-sales never imports Commercial Assurance code, and vice versa', () => {
  test.each(CRC_SALES_ALL)('%s does not import lib/assessments or the submissions surface', (rel) => {
    const src = read(rel)
    expect(src).not.toMatch(/from\s+['"]@\/lib\/assessments/)
    expect(src).not.toMatch(/from\s+['"]@\/app\/admin\/submissions/)
    expect(src).not.toMatch(/from\s+['"]@\/app\/api\/admin\/submissions/)
  })

  test.each(ASSURANCE_FILES)('%s does not import crc-sales', (rel) => {
    const src = read(rel)
    expect(src).not.toMatch(/from\s+['"]@\/lib\/crc-sales/)
    expect(src).not.toMatch(/crc-leads/)
  })
})

describe('crc-sales never writes CRC conversational state or any Assurance table', () => {
  test.each(CRC_SALES_LIB)('%s only ever mutates crc_sales_state / crc_sales_events', (rel) => {
    const src = read(rel)
    // Any .from('<table>').insert/update/upsert/delete must target an
    // allowed operational table. crc_sessions / crc_leads / submissions /
    // assessments are READ-only for this layer.
    const writeTargets = [...src.matchAll(/\.from\(\s*['"]([a-z_]+)['"]\s*\)[\s\S]{0,120}?\.(insert|update|upsert|delete)\b/g)].map((m) => m[1])
    for (const t of writeTargets) {
      expect(['crc_sales_state', 'crc_sales_events']).toContain(t)
    }
  })
})

describe('answer-context CONSUMES the unchanged pipeline; owns neither Retrieval nor BI (CAH-3B.1)', () => {
  test('imports runCRCConversation, never a Retrieval LOGIC internal, never a BI constructor', () => {
    const src = read('lib/crc-sales/answer-context.ts')
    expect(src).toMatch(/from\s+['"]@\/lib\/crc-engine\/run-crc-conversation['"]/)
    // BI is CONSUMED from the pipeline result, not constructed here.
    expect(src).not.toMatch(/from\s+['"]@\/lib\/bounded-interpretation\/build-bounded-interpretation['"]/)
    expect(src).not.toMatch(/buildBoundedInterpretations?\s*\(/)
    expect(src).not.toMatch(/@\/lib\/retrieval-engine\/(retrieve|lookup-rows|enumerate-eligible-claims|assemble-result|lookup-topic-claims)['"]/)
    // and it reads the authoritative BI field.
    expect(src).toMatch(/\.bounded_interpretations\b/)
  })
})

describe('no risk / materiality / scoring / prohibited-authority concept in crc-sales CODE', () => {
  test.each(CRC_SALES_LIB)('%s', (rel) => {
    const src = codeOnly(rel).toLowerCase()
    for (const token of ['materiality', 'risk_rating', 'risk_score', 'readiness_score', 'lead_score', 'next_best_action', 'triage_score', 'crc_eligible', 'consultativeanswerplan', 'projectionoutput', 'assembleprojectionoutput', 'buildconsultativeanswerplan']) {
      expect(src).not.toContain(token)
    }
  })
})
