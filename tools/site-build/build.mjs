#!/usr/bin/env node
// SI8 marketing site generator. Dependency-free; generated HTML is committed to 07_Website/.
//
//   node tools/site-build/build.mjs            write every page
//   node tools/site-build/build.mjs --check    exit 1 if any committed page differs from a fresh build
//   node tools/site-build/build.mjs --links    check links (pending routes allowed, reported)
//   node tools/site-build/build.mjs --links --release   check links; pending or missing routes fail
//
// Page sources: pages/*.html, each starting with <!--page {json} --> (route, pageId, title, ogTitle, description).
// Shared partials: partials/head.html, header.html, footer.html. Placeholders: {{name}}, {{CRC_URL}}, {{SIGNIN_URL}},
// and {{current:/route}} (becomes aria-current="page" on the matching nav link). Output is deterministic: LF, no timestamps.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..', '..')
const config = JSON.parse(readFileSync(join(HERE, 'site.config.json'), 'utf8'))
const OUT = join(ROOT, config.outDir)
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const partial = (name) => read(join(HERE, 'partials', `${name}.html`))
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function outputPath(route) {
  return route === '/' ? join(OUT, 'index.html') : join(OUT, route.replace(/^\/|\/$/g, ''), 'index.html')
}

function render(file) {
  const src = read(join(HERE, 'pages', file))
  const m = src.match(/^<!--page\s*([\s\S]*?)-->\n/)
  if (!m) throw new Error(`${file}: missing <!--page {json} --> header`)
  const meta = JSON.parse(m[1])
  for (const k of ['route', 'pageId', 'title', 'ogTitle', 'description']) if (!meta[k]) throw new Error(`${file}: missing "${k}"`)
  const body = src.slice(m[0].length)
  const vars = {
    title: esc(meta.title), ogTitle: esc(meta.ogTitle), description: esc(meta.description),
    canonical: meta.route === '/' ? config.origin : config.origin + meta.route,
    CRC_URL: config.crcUrl, SIGNIN_URL: config.signInUrl,
  }
  const fill = (t) => t
    .replace(/\{\{current:([^}]+)\}\}/g, (_, r) => (r === meta.route ? ' aria-current="page" class="active"' : ''))
    .replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in vars)) throw new Error(`${file}: unknown placeholder {{${k}}}`); return vars[k] })
  const html = fill(partial('head')) + '<body>\n' + fill(partial('header')) +
    `\n<main id="main" data-page="${esc(meta.pageId)}">\n` + fill(body).replace(/\s+$/, '') + '\n</main>\n\n' +
    fill(partial('footer')) + '</body>\n</html>\n'
  return { route: meta.route, path: outputPath(meta.route), html }
}

const pages = readdirSync(join(HERE, 'pages')).filter((f) => f.endsWith('.html')).sort().map(render)
const args = new Set(process.argv.slice(2))

if (args.has('--check')) {
  const stale = pages.filter((p) => !existsSync(p.path) || read(p.path) !== p.html).map((p) => p.route)
  console.log(stale.length ? `STALE: ${stale.join(', ')} (run: node tools/site-build/build.mjs)` : `OK: ${pages.length} generated page(s) up to date`)
  process.exit(stale.length ? 1 : 0)
}

if (args.has('--links')) {
  const release = args.has('--release')
  const known = new Set(pages.map((p) => p.route))
  const pending = new Set(config.pendingRoutes)
  const problems = [], pendingUsed = new Set(), external = new Set()
  for (const p of pages) {
    for (const [, href] of p.html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (/^https?:\/\//.test(href)) {
        external.add(href)
        if (!config.allowedExternal.some((a) => href === a || href.startsWith(a + '/') || href.startsWith(a + '?'))) problems.push(`${p.route}: unlisted external ${href}`)
        continue
      }
      if (href.startsWith('#')) { if (!p.html.includes(`id="${href.slice(1)}"`)) problems.push(`${p.route}: missing anchor ${href}`); continue }
      const path = href.split(/[?#]/)[0]
      if (known.has(path)) continue
      const file = join(OUT, path.replace(/^\//, ''))
      if (existsSync(file) && !path.endsWith('/')) continue
      if (pending.has(path)) { pendingUsed.add(path); continue }
      problems.push(`${p.route}: broken link ${href}`)
    }
  }
  console.log(`external destinations: ${[...external].sort().join(', ')}`)
  if (pendingUsed.size) console.log(`${release ? 'FAIL' : 'PENDING'}: not yet built: ${[...pendingUsed].sort().join(', ')}`)
  for (const x of problems) console.log(`FAIL: ${x}`)
  const failed = problems.length > 0 || (release && pendingUsed.size > 0)
  console.log(failed ? 'LINKS: FAIL' : `LINKS: OK${pendingUsed.size ? ' (pending routes allowed outside --release)' : ''}`)
  process.exit(failed ? 1 : 0)
}

for (const p of pages) { mkdirSync(dirname(p.path), { recursive: true }); writeFileSync(p.path, p.html) }
console.log(`wrote ${pages.length} page(s): ${pages.map((p) => p.route).join(', ')}`)
