#!/usr/bin/env node
// CR-V2-PROD-UAT-B — offline comparison of a pasted U3 result with expected/u3_post_doc1.json. No connection.
//   node compare.js <path to the pasted u3 JSON>
// A function body may differ from the expected md5 only by line endings (how the DOC-1 file was pasted): the LF and
// CRLF md5 of the body taken from the committed DOC-1 migration are both accepted, nothing else.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex')
const DOC1 = path.join(__dirname, '..', '..', 'migrations', '20261103000000_creator_record_v2_evidence.sql')

/** The source PostgreSQL stores for a function: the text between `AS $$` and the closing `$$;`. */
function functionBody(sql, name) {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`)
  if (start < 0) throw new Error(`function ${name} not found in DOC-1`)
  const open = sql.indexOf('AS $$', start) + 'AS $$'.length
  return sql.slice(open, sql.indexOf('$$;', open))
}
function bodyMd5s(name) {
  const lf = functionBody(fs.readFileSync(DOC1, 'utf8').replace(/\r\n/g, '\n'), name)
  return [md5(lf), md5(lf.replace(/\n/g, '\r\n'))]
}
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v)

function compare(actual, expected) {
  const problems = []
  for (const key of Object.keys(expected)) {
    if (key === 'functions') continue
    if (JSON.stringify(sortKeys(actual[key])) !== JSON.stringify(sortKeys(expected[key]))) problems.push(`${key} differs`)
  }
  for (const [name, exp] of Object.entries(expected.functions)) {
    const act = (actual.functions || {})[name]
    if (!act) { problems.push(`function ${name} missing`); continue }
    for (const f of ['definer', 'config', 'owner']) if (JSON.stringify(act[f]) !== JSON.stringify(exp[f])) problems.push(`function ${name}.${f} differs`)
    if (!bodyMd5s(name).includes(act.md5)) problems.push(`function ${name} body differs from DOC-1 (beyond line endings)`)
  }
  return problems
}

module.exports = { compare, functionBody, bodyMd5s }
if (require.main === module) {
  const actual = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected', 'u3_post_doc1.json'), 'utf8'))
  const problems = compare(actual.u3 || actual, expected)
  console.log(problems.length ? `MISMATCH:\n  ${problems.join('\n  ')}` : 'MATCH: the DOC-1 objects are as committed')
  process.exit(problems.length ? 1 : 0)
}
