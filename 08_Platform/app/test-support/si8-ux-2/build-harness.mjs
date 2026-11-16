// SI8-UX-2 local browser harness build. Usage (from 08_Platform/app): node test-support/si8-ux-2/build-harness.mjs <outDir>
// Bundles the harness entry with esbuild (next/navigation stubbed), compiles the app's Tailwind over the Creator Record files, and
// appends the scoped Institutional Trust stylesheet. Output: <outDir>/index.html, app.js, app.css. Nothing is written in the repo.
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const out = resolve(process.argv[2] ?? '.ux2-harness')
mkdirSync(out, { recursive: true })
const here = resolve('test-support/si8-ux-2')

// The Production props, exported by tsx (server modules), injected as data.
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const props = execFileSync(npx, ['tsx', join(here, 'export-props.ts')], { encoding: 'utf8', shell: process.platform === 'win32' })
writeFileSync(join(out, 'props.js'), `window.__UX2_PROPS__ = ${props};
`)

await build({
  entryPoints: [join(here, 'harness-entry.tsx')],
  bundle: true,
  outfile: join(out, 'app.js'),
  format: 'iife',
  platform: 'browser',
  jsx: 'automatic',
  tsconfig: 'tsconfig.json',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { 'next/navigation': join(here, 'next-navigation-stub.ts') },
  logLevel: 'warning',
})

const content = ['app/creator-record/**/*.tsx', 'components/creator-record/**/*.tsx', 'test-support/si8-ux-2/**/*.tsx'].join(',')
execFileSync(process.execPath, [resolve('node_modules/tailwindcss/lib/cli.js'), '-c', 'tailwind.config.ts', '-i', 'app/globals.css', '-o', join(out, 'app.css'), '--content', content], { stdio: 'inherit' })
appendFileSync(join(out, 'app.css'), '\n' + readFileSync('app/creator-record/institutional-trust.css', 'utf8'))

writeFileSync(join(out, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SI8-UX-2 harness (synthetic)</title><link rel="stylesheet" href="app.css"></head>
<body><div id="root"></div><script src="props.js"></script><script src="app.js"></script></body></html>
`)
console.log(`harness built: ${out}`)
