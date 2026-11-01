#!/usr/bin/env node
// CR-V2-PROD-2 — diff Production's Q1-Q3 results against the schema the repository expects.
//
//   node compare.js expected/pre-m2 <dir with q1.json, q2.json, q3.json pasted from Production>
//   node compare.js expected/post-m3 <dir>      (after M2 + M3 have been applied)
//
// Local and offline: reads files only, connects to nothing. Prints every difference; exit 0 only when
// the only differences are the KNOWN ones listed below.
'use strict'
const fs = require('fs')
const path = require('path')

const [expDir, prodDir] = process.argv.slice(2)
if (!expDir || !prodDir) {
  console.error('usage: node compare.js <expected dir> <production dir>')
  process.exit(2)
}

/** A pasted cell may be raw JSON, a JSON string, or wrapped as {"q1": ...}. */
function load(dir, q) {
  const raw = fs.readFileSync(path.join(dir, `${q}.json`), 'utf8').trim()
  let v = JSON.parse(raw)
  if (typeof v === 'string') v = JSON.parse(v)
  return v && typeof v === 'object' && q in v ? v[q] : v
}
const FILES = { q1: 'q1_table_columns', q2: 'q2_constraints_triggers_indexes', q3: 'q3_functions_buckets' }
const exp = {}, prod = {}
for (const [q, file] of Object.entries(FILES)) {
  Object.assign(exp, load(expDir, file))
  Object.assign(prod, load(prodDir, q))
}

// Differences already known and explained (CR-V2-PROD-1 / 2). Anything else is unexplained drift.
const KNOWN = [
  // Only these two exact definitions: the repository's, and Production's with si8_certified added.
  { where: /^constraints\.submissions$/, text: /^\["submissions_tier_check","CHECK \(\(tier = ANY \(ARRAY\['creator_record'::text, 'certified'::text(, 'si8_certified'::text)?\]\)\)\)"\]$/,
    why: 'Production allows si8_certified; no migration adds it (2026-10-21 check)' },
  // Only a PRIVATE documents bucket is known; a public one is drift.
  { where: /^buckets$/, text: /^\["documents",false,/, why: 'documents bucket was created by hand in Production (private since CR-ARTIFACT-1)' },
  { where: /^server_version$/, text: /./, why: 'server version' },
]
const key = (x) => JSON.stringify(x)
let unexplained = 0, known = 0
function report(where, kind, v) {
  const text = typeof v === 'string' ? v : key(v)
  const k = KNOWN.find((x) => x.where.test(where) && x.text.test(text))
  if (k) known++
  else unexplained++
  console.log(`${k ? 'KNOWN    ' : 'DRIFT    '}${kind.padEnd(10)} ${where}: ${text}${k ? `   [${k.why}]` : ''}`)
}
function cmpList(where, a, b) {
  const A = new Map((a ?? []).map((x) => [key(x), x])), B = new Map((b ?? []).map((x) => [key(x), x]))
  for (const [k, v] of A) if (!B.has(k)) report(where, 'expected', v)
  for (const [k, v] of B) if (!A.has(k)) report(where, 'prod-only', v)
}

if (exp.server_version !== prod.server_version) report('server_version', 'differs', `${exp.server_version} -> ${prod.server_version}`)
cmpList('tables_present', exp.tables_present, prod.tables_present)
for (const sec of ['columns', 'constraints', 'triggers', 'indexes', 'table_grants']) {
  const tables = new Set([...Object.keys(exp[sec] ?? {}), ...Object.keys(prod[sec] ?? {})])
  for (const t of [...tables].sort()) cmpList(`${sec}.${t}`, exp[sec]?.[t], prod[sec]?.[t])
}
for (const t of new Set([...Object.keys(exp.rls_enabled ?? {}), ...Object.keys(prod.rls_enabled ?? {})]))
  if (exp.rls_enabled?.[t] !== prod.rls_enabled?.[t]) report(`rls_enabled.${t}`, 'differs', `${exp.rls_enabled?.[t]} -> ${prod.rls_enabled?.[t]}`)
const fe = exp.functions ?? {}, fp = prod.functions ?? {}
for (const f of Object.keys(fe).sort()) {
  if (!(f in fp)) report('functions', 'expected', f)
  else if (key(fe[f]) !== key(fp[f])) report(`functions.${f}`, 'differs', `${key(fe[f])} -> ${key(fp[f])}`)
}
for (const f of Object.keys(fp).sort()) if (!(f in fe)) report('functions', 'prod-only', f)
cmpList('buckets', exp.buckets, prod.buckets)

console.log(`\n${known} known difference(s), ${unexplained} unexplained.`)
console.log(unexplained === 0 ? 'RESULT: MATCHES THE REPOSITORY (known differences only)' : 'RESULT: UNEXPLAINED DRIFT — resolve before applying M2/M3')
process.exit(unexplained === 0 ? 0 : 1)
