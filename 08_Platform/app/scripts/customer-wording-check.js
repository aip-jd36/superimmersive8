/**
 * CR-V2-APPROVAL-AUTHORITY-FIX-1 — the build-time half of the customer wording approval (`lib/creator-record-flow/customer-wording.ts`).
 *
 * The customer wording identity the Source Text Approval names is derived at RUNTIME from every customer string (stable in every
 * build). Two things cannot be checked at runtime and are checked here, on every production build (`next.config.js`, phase
 * PHASE_PRODUCTION_BUILD, so it runs whatever build command a host uses, including Vercel):
 *   1. the presentation template FUNCTIONS: their source text is not available at runtime, so the identity carries a pinned
 *      fingerprint of their source module (`CUSTOMER_WORDING_TEMPLATES_SHA256`), verified here against the source on disk;
 *   2. no customer wording typed directly into the guarded customer surfaces, outside the wording set.
 * Any failure stops the build, so no deployment can carry wording the identity does not describe.
 *
 * Plain CommonJS with no dependencies beyond Node, so the build and the test suite run exactly the same code.
 */
const { createHash } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

/** Source modules whose customer wording includes functions. Fingerprinted whole (any edit there is a wording change). */
const TEMPLATE_SOURCES = ['lib/creator-record/presentation/templates.ts']
const IDENTITY_MODULE = 'lib/creator-record-flow/customer-wording.ts'

/** Customer surfaces that must take every string from the wording set. `region` limits a shared file to its v2 part. */
const GUARDED = [
  { file: 'components/creator-record/CreatorRecordQuestionnaire.tsx' },
  { file: 'components/creator-record/DocumentReviewPanel.tsx' },
  { file: 'components/creator-record/EvidencePanel.tsx' },
  { file: 'components/creator-record/ExaminationReview.tsx' },
  { file: 'components/creator-record/ConsentWithdrawalControl.tsx' },
  { file: 'app/creator-record/CreatorRecordV2Client.tsx' },
  { file: 'app/creator-record/page.tsx' },
  { file: 'lib/emails.ts', region: { from: 'export async function sendCreatorRecordV2ReadyPaymentEmail', to: '\n}\n' } },
  { file: 'app/dashboard/submissions/[id]/page.tsx', region: { from: 'const v2 = v2DashboardView(', to: '\n  }\n' } },
  { file: 'app/dashboard/page.tsx', region: { from: "{ href: '/creator-record'", to: '}' } },
]

const lf = (s) => s.replace(/\r\n/g, '\n')
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex')

function templatesSha256(appRoot) {
  return sha256(TEMPLATE_SOURCES.map((f) => `${f}\n${lf(readFileSync(join(appRoot, f), 'utf8'))}`).join('\n\u0000\n'))
}

function pinnedTemplatesSha256(appRoot) {
  const m = /CUSTOMER_WORDING_TEMPLATES_SHA256\s*=\s*'([0-9a-f]{64})'/.exec(readFileSync(join(appRoot, IDENTITY_MODULE), 'utf8'))
  return m ? m[1] : null
}

function regionOf(text, region) {
  if (!region) return text
  const a = text.indexOf(region.from)
  if (a < 0) return null
  const b = text.indexOf(region.to, a + region.from.length)
  return b < 0 ? null : text.slice(a, b + region.to.length)
}

const stripExpressions = (t) => { let x = t; for (let i = 0; i < 6; i++) x = x.replace(/\{[^{}]*\}/g, ''); return x }

/** Customer wording typed directly into a guarded surface: JSX text, labelling attributes, capitalised templates and sentences. */
function inlineWording(source) {
  const jsxText = (source.match(/(?<=>)[^<>]*(?=<)/g) || [])
    .map(stripExpressions)
    .filter((m) => /[A-Za-z]{2,}/.test(m) && !/=>|===|!==|\|\||&&|;|\(|Record|Promise|Readonly|useState|: [a-zA-Z]/.test(m))
    .map((m) => m.replace(/\s+/g, ' ').trim())
  const attributes = source.match(/\b(aria-label|title|placeholder|alt)="[^"]*[A-Za-z]{2,}[^"]*"/g) || []
  const templates = source.match(/`[A-Z][a-z][^`]*`/g) || []
  const sentences = (source.match(/'\s?[A-Z][a-z][^'\n]{6,}'|'\([a-z]+\)'/g) || []).filter((m) => !/^'(use client|Content-Type)/.test(m))
  return [...jsxText, ...attributes, ...templates, ...sentences]
}

/** Every reason the customer wording on disk is not what the identity describes. Empty = consistent. */
function checkCustomerWording(appRoot) {
  const errors = []
  const pinned = pinnedTemplatesSha256(appRoot)
  const actual = templatesSha256(appRoot)
  if (!pinned) errors.push(`${IDENTITY_MODULE}: CUSTOMER_WORDING_TEMPLATES_SHA256 not found`)
  else if (pinned !== actual) errors.push(`presentation templates changed: CUSTOMER_WORDING_TEMPLATES_SHA256 is ${pinned}, the source is ${actual}. A wording change needs a new Source Text Approval; re-pinning alone voids the current one.`)
  for (const g of GUARDED) {
    const region = regionOf(lf(readFileSync(join(appRoot, g.file), 'utf8')), g.region)
    if (region === null) { errors.push(`${g.file}: guarded region not found`); continue }
    for (const w of inlineWording(region)) errors.push(`${g.file}: inline customer wording outside the wording set: ${w}`)
  }
  return errors
}

module.exports = { GUARDED, TEMPLATE_SOURCES, checkCustomerWording, inlineWording, pinnedTemplatesSha256, templatesSha256 }
