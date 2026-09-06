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

/**
 * CAH-3F architectural split:
 *   - CORE_FILES  -- the mechanism-agnostic association core. Must contain NO
 *     email/cookie/token/Sales/discovery logic and NO authorization decision.
 *   - repository.ts -- the single DB-access module. CAH-3F extended it with
 *     plain email->lead->session read helpers (generic-shaped, no decision).
 *   - CAPABILITY_FILES -- lib/crc-assurance-handoff/capabilities/** -- reviewed
 *     capability modules. THIS is where mechanism-specific logic (e.g. email
 *     correlation) is SUPPOSED to live. They own their fixed authorization
 *     basis and invoke the core; they never re-implement generic invariants.
 */
const CAPABILITY_FILES = FILES.filter((f) => f.replace(/\\/g, '/').includes('/capabilities/'))
const CORE_FILES = FILES.filter((f) => !CAPABILITY_FILES.includes(f) && !f.endsWith('repository.ts'))

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

  test('no route or page imports the association CORE primitive or the raw RPC directly (capabilities/ is the only allowed entry)', () => {
    const roots = ['app/api', 'app/admin', 'app/dashboard']
    const violations: string[] = []
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
            const src = fs.readFileSync(p, 'utf8')
            const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
            // Forbidden from any customer/admin route/page:
            if (/createAssociationAfterAuthorization|removeCrcAssuranceAssociation/.test(code)) violations.push(`${path.relative(APP_ROOT, p)}: core primitive`)
            if (/crc-assurance-handoff\/(service|repository|state-binding)\b/.test(code)) violations.push(`${path.relative(APP_ROOT, p)}: core module`)
            if (/create_crc_assurance_association|remove_crc_assurance_association/.test(code)) violations.push(`${path.relative(APP_ROOT, p)}: raw RPC`)
          }
        }
      }
    }
    expect(violations).toEqual([])
  })
})

describe('CAH-3E.2: the association core is non-authorizing', () => {
  test('no generic authorization-decision machinery exists in lib/ (removed, not emptied)', () => {
    for (const rel of FILES) {
      const code = codeOnly(rel)
      // The CAH-3D.1 enablement gate is gone entirely.
      expect(code).not.toMatch(/\bAuthorizationPolicy\b/)
      expect(code).not.toMatch(/\bPRODUCTION_AUTHORIZATION_POLICY\b/)
      expect(code).not.toMatch(/\bCURRENTLY_ENABLED_AUTHORIZATION_BASES\b/)
      expect(code).not.toMatch(/\.isEnabled\s*\(/)
    }
    expect(fs.existsSync(path.join(APP_ROOT, 'lib/crc-assurance-handoff/authorization-policy.ts'))).toBe(false)
  })

  test('no AuthorizationGrant / branded-authority-object / Symbol-brand mechanism was introduced (CAH-3E.1 rejection)', () => {
    for (const rel of FILES) {
      const code = codeOnly(rel)
      expect(code).not.toMatch(/AuthorizationGrant/)
      expect(code).not.toMatch(/issueAuthorizationGrant|isAuthorizationGrant/)
      // No module-private brand symbol used as an authority marker.
      expect(code).not.toMatch(/GRANT_BRAND|_brand|Symbol\(['"][^'"]*grant/i)
    }
  })

  test('the primitive is non-authorizing: no generic "authorize-and-create" entry point on the package surface', () => {
    const idx = codeOnly('lib/crc-assurance-handoff/index.ts')
    // The renamed creation primitive is NOT re-exported from index.ts.
    expect(idx).not.toMatch(/createAssociationAfterAuthorization/)
    expect(idx).not.toMatch(/associateCrcSessionWithSubmission/)
    // Removal (ownership-only, non-authorizing) may be exported.
    expect(idx).toMatch(/removeCrcAssuranceAssociation/)
    // No authorization-policy export.
    expect(idx).not.toMatch(/AuthorizationPolicy|CURRENTLY_ENABLED/)
  })

  test('CreateAssociationResult no longer carries an enablement failure code', () => {
    const t = read('lib/crc-assurance-handoff/types.ts')
    expect(t).not.toMatch(/authorization_basis_not_enabled/)
    // KNOWN-basis vocabulary validation is retained.
    expect(t).toMatch(/unknown_authorization_basis/)
    expect(t).toMatch(/isKnownAuthorizationBasis/)
  })

  test('service.ts states its non-authorizing contract and its honest trust-boundary limits', () => {
    const src = read('lib/crc-assurance-handoff/service.ts')
    expect(src).toMatch(/NON-AUTHORIZING/)
    expect(src).toMatch(/not a security boundary|NOT a security boundary/i)
    expect(src).toMatch(/service_role/)
  })

  test('authorization_basis is retained as persisted provenance (domain + record type)', () => {
    const t = read('lib/crc-assurance-handoff/types.ts')
    expect(t).toMatch(/authorization_basis:\s*AuthorizationBasis/)
    expect(t).toMatch(/authorizationBasis:\s*AuthorizationBasis/)
  })

  test('no removed placeholder / older-milestone symbols survive in lib/', () => {
    for (const rel of FILES) {
      const code = codeOnly(rel)
      expect(code).not.toMatch(/'core_internal_uninferred'|"core_internal_uninferred"/)
      expect(code).not.toMatch(/SUPPORTED_AUTHORIZATION_BASES|isSupportedAuthorizationBasis/)
    }
  })

  test('no front-door authorization mechanism logic in the CORE (cookie / email / token / reference / delegated)', () => {
    for (const rel of CORE_FILES) {
      const code = codeOnly(rel)
      expect(code).not.toMatch(/cookies?\s*\(|getCookie|readCookie/i)
      expect(code).not.toMatch(/redeemToken|verifyToken|consumeToken|matchEmail|emailMatches|delegationGrant/i)
      expect(code).not.toMatch(/crc_leads|email_normalized|attribution_token/i)
    }
  })

  test('NO file in lib/crc-assurance-handoff (core, repository, or capability) reads a cookie or Sales state', () => {
    for (const rel of FILES) {
      const code = codeOnly(rel)
      // "crc_sessions" table / "crc_session_id" column are fine; the
      // "crc_session" *cookie* is not.
      expect(code).not.toMatch(/cookies?\s*\(|getCookie|readCookie|(['"])crc_session\1/i)
      expect(code).not.toMatch(/crc_sales_state|crc_sales_events|CONVERTING|attribution_token/i)
    }
  })
})

// ── CAH-3F: email-correlation capability structural authority tests ───────

describe('CAH-3F email-correlation capability', () => {
  const CAP = 'lib/crc-assurance-handoff/capabilities/email-correlation.ts'

  test('the capability module exists in the capabilities/ subtree', () => {
    expect(fs.existsSync(path.join(APP_ROOT, CAP))).toBe(true)
    expect(CAPABILITY_FILES.some((f) => f.replace(/\\/g, '/').endsWith('capabilities/email-correlation.ts'))).toBe(true)
  })

  test('1: the capability owns the FIXED basis authenticated_email_candidate_confirmation as a const, not a parameter', () => {
    const src = read(CAP)
    expect(src).toMatch(/EMAIL_CORRELATION_AUTHORIZATION_BASIS\s*=\s*['"]authenticated_email_candidate_confirmation['"]\s*as const/)
    const code = codeOnly(CAP)
    // It passes that constant to the core -- never a value it received.
    expect(code).toMatch(/authorizationBasis:\s*EMAIL_CORRELATION_AUTHORIZATION_BASIS/)
    // The public INPUT contracts (DiscoverInput / AssociateInput) carry NO
    // authorizationBasis and NO crcSessionId field -- the client cannot
    // choose either. (Internal resolved-candidate types may carry crcSessionId.)
    const discoverInput = src.slice(src.indexOf('interface DiscoverInput'), src.indexOf('}', src.indexOf('interface DiscoverInput')) + 1)
    const associateInput = src.slice(src.indexOf('interface AssociateInput'), src.indexOf('}', src.indexOf('interface AssociateInput')) + 1)
    for (const block of [discoverInput, associateInput]) {
      expect(block).not.toMatch(/authorizationBasis/)
      expect(block).not.toMatch(/crcSessionId/)
    }
    expect(associateInput).toMatch(/candidateHandle:\s*string/)
  })

  test('5 + 6: generic core stays non-authorizing; AuthorizationPolicy / grant machinery still absent', () => {
    for (const rel of FILES) {
      const code = codeOnly(rel)
      expect(code).not.toMatch(/\bAuthorizationPolicy\b|\bPRODUCTION_AUTHORIZATION_POLICY\b|\bCURRENTLY_ENABLED_AUTHORIZATION_BASES\b/)
      expect(code).not.toMatch(/AuthorizationGrant|issueAuthorizationGrant|GRANT_BRAND/)
    }
    expect(fs.existsSync(path.join(APP_ROOT, 'lib/crc-assurance-handoff/authorization-policy.ts'))).toBe(false)
  })

  test('9: the capability imports no Sales / Retrieval / BI / Projection / Composition / runCRCConversation', () => {
    const imp = importLines(CAP)
    expect(imp).not.toMatch(/crc-sales/)
    expect(imp).not.toMatch(/retrieval-engine|lib\/retrieve|discovered-relevance/)
    expect(imp).not.toMatch(/bounded-interpretation/)
    expect(imp).not.toMatch(/projection-layer|assemble-projection-output|consultative/)
    expect(imp).not.toMatch(/run-crc-conversation/)
    expect(codeOnly(CAP)).not.toMatch(/runCRCConversation|buildBoundedInterpretation|assembleProjectionOutput/)
  })

  test('10: no provider / topic / domain branching', () => {
    const code = codeOnly(CAP).toLowerCase()
    for (const t of ['kling', 'runway', 'suno', 'luma', 'midjourney', 'pika', 'veo', 'firefly', 'sora']) {
      expect(code).not.toContain(t)
    }
    expect(code).not.toMatch(/commercial_use|copyright_ownership|likeness|third_party_source_rights/)
  })

  test('11: same-browser cookie is not required or read by this capability', () => {
    const code = codeOnly(CAP)
    // "crcSessionId" / "CorrelatedCrcSessionRow" are fine; the "crc_session"
    // cookie name and same-browser basis are not.
    expect(code).not.toMatch(/cookies?\s*\(|getCookie|(['"])crc_session\1|same_browser/i)
    // no HTTP request / headers plumbing -- the capability takes only
    // (actorUserId, verifiedEmail, submissionId[, candidateHandle]).
    expect(code).not.toMatch(/\bNextRequest\b|headers\s*\(\s*\)|import.*next\/headers/)
  })

  test('12: the discovery response type is an explicit allow-list (no substantive CRC field names)', () => {
    const src = read(CAP)
    const typeBlock = src.slice(src.indexOf('EmailCorrelatedCandidateDiscovery'), src.indexOf('EmailCorrelatedCandidateDiscovery') + 900)
    for (const forbidden of ['structured_understanding', 'transcript', 'user_goals', 'goal_text', 'provider', 'tool_mentions', 'jurisdiction', 'RetrievalResult', 'BoundedInterpretation', 'projection', 'composition', 'crc_sales']) {
      expect(typeBlock).not.toContain(forbidden)
    }
    // the only permitted shape fields:
    expect(typeBlock).toMatch(/available:\s*true;\s*candidateHandle:\s*string/)
  })

  test('13 + 14: customer routes reach persistence ONLY via the capability, never the raw RPC or the core primitive directly', () => {
    const routeDir = path.join(APP_ROOT, 'app/api/dashboard/submissions')
    const routeFiles: string[] = []
    if (fs.existsSync(routeDir)) {
      const stack = [routeDir]
      while (stack.length) {
        const d = stack.pop()!
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name)
          if (e.isDirectory()) stack.push(p)
          else if (e.isFile() && e.name.endsWith('.ts')) routeFiles.push(p)
        }
      }
    }
    expect(routeFiles.length).toBeGreaterThanOrEqual(2)
    for (const f of routeFiles) {
      const code = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      // never the raw RPC
      expect(code).not.toMatch(/\.rpc\s*\(|create_crc_assurance_association|remove_crc_assurance_association/)
      // never supabaseAdmin directly
      expect(code).not.toMatch(/supabase\/admin|supabaseAdmin/)
      // never the core primitive directly
      expect(code).not.toMatch(/createAssociationAfterAuthorization|crc-assurance-handoff\/service|crc-assurance-handoff\/repository/)
      // only via the reviewed capability
      expect(code).toMatch(/crc-assurance-handoff\/capabilities\/email-correlation/)
    }
  })

  test('2/3/4: the customer routes derive actor + verified email + submissionId server-side; the client cannot supply them', () => {
    const routeDir = path.join(APP_ROOT, 'app/api/dashboard/submissions')
    const stack = [routeDir]
    const codes: string[] = []
    while (stack.length) {
      const d = stack.pop()!
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) stack.push(p)
        else if (e.isFile() && e.name.endsWith('route.ts')) codes.push(fs.readFileSync(p, 'utf8'))
      }
    }
    for (const code of codes) {
      // actor + email come from supabase.auth.getUser(), not the body
      expect(code).toMatch(/supabase\.auth\.getUser\(\)/)
      expect(code).toMatch(/user\.id/)
      expect(code).toMatch(/user\.email/)
      // the request body is only ever read for { confirm, candidateHandle }
      const bodyReads = code.match(/body\??\.\w+/g) ?? []
      for (const b of bodyReads) expect(['body?.confirm', 'body.confirm', 'body?.candidateHandle', 'body.candidateHandle']).toContain(b)
      expect(code).not.toMatch(/body\??\.(actorUserId|authorizationBasis|crcSessionId|email|verifiedEmail)/)
    }
  })
})
