#!/usr/bin/env node
// Browser checks for the generated marketing site (headless Chrome over the DevTools protocol; no dependencies).
//   node tools/site-build/browser-check.mjs [screenshotDir] [chromePath]
// Serves 07_Website/ on localhost. Requests to Google Analytics / Tag Manager are always blocked, so nothing is sent.
// Exits 1 if any check fails.
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, mkdtempSync, readdirSync } from 'node:fs'
import { join, resolve, extname, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SITE = resolve(HERE, '..', '..', '07_Website')
const [shotDir, chromeArg] = process.argv.slice(2)
const CHROME = chromeArg ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function localFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0])
  if (p.endsWith('/')) p += 'index.html'
  const f = join(SITE, p)
  if (!f.startsWith(SITE)) return null
  if (existsSync(f) && statSync(f).isFile()) return f
  if (existsSync(join(f, 'index.html'))) return join(f, 'index.html')
  return null
}
const server = createServer((req, res) => {
  const f = localFile(req.url)
  if (!f) { res.writeHead(404); res.end('not found'); return }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const BASE = `http://127.0.0.1:${server.address().port}`

const PORT = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'si8-site-check-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
let ws
for (let i = 0; i < 60 && !ws; i++) { await sleep(200); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); const p = l.find((t) => t.type === 'page'); if (p) ws = p.webSocketDebuggerUrl } catch {} }
if (!ws) { server.close(); chrome.kill(); throw new Error('Chrome did not start') }
const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r))
let id = 0; const pend = new Map(); const exceptions = []; const requests = []; let prodHost = false
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result))); sock.send(JSON.stringify({ id: i, method, params })) })
sock.addEventListener('message', async (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
  if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url)
  if (m.method === 'Fetch.requestPaused') {
    const { requestId, request } = m.params
    const u = new URL(request.url)
    if (/google-analytics\.com|googletagmanager\.com/.test(u.hostname)) return send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' })
    if (prodHost && u.hostname === 'www.superimmersive8.com') {
      const f = localFile(u.pathname)
      if (!f) return send('Fetch.fulfillRequest', { requestId, responseCode: 404, body: '' })
      return send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: TYPES[extname(f)] ?? 'application/octet-stream' }], body: readFileSync(f).toString('base64') })
    }
    return send('Fetch.continueRequest', { requestId })
  }
})
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result.value
const results = []; const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); }
async function open(url, w = 1440, h = 900) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 })
  await send('Page.navigate', { url: 'about:blank' }); await sleep(150)
  await send('Page.navigate', { url }); await sleep(900); await ev('document.fonts.ready.then(()=>true)')
}

// Pages: every generated page (routes read from the page sources)
const ROUTES = readdirSync(join(HERE, 'pages')).filter((f) => f.endsWith('.html')).map((f) => JSON.parse(readFileSync(join(HERE, 'pages', f), 'utf8').match(/^<!--page\s*([\s\S]*?)-->/)[1]).route).sort()

// 1. Layout and header across widths, on every page
const widths = [360, 390, 600, 601, 900, 901, 1024, 1180, 1181, 1280, 1366, 1440, 1920]
const layout = []
for (const route of ROUTES) for (const w of widths) {
  await open(`${BASE}${route}`, w, 900)
  layout.push({ route, w, ...(await ev(`(()=>{const row=document.querySelector('.nav-row');const items=[...document.querySelectorAll('.nav-links a,.nav-right .link,.nav-right .btn')].filter(e=>e.offsetParent);
    const heroEl=document.querySelector('.hero .hero-cta .btn-primary'); const hero=heroEl?heroEl.getBoundingClientRect():{bottom:null};
    const wide=[...document.querySelectorAll('main *')].filter(e=>e.offsetParent&&e.getBoundingClientRect().right>innerWidth+0.5&&!e.closest('[style*="overflow-x:auto"]')).length;
    return {pageOverflow:document.documentElement.scrollWidth>innerWidth,rowOverflow:row.scrollWidth>row.clientWidth,wideElements:wide,wrapped:items.filter(e=>e.getBoundingClientRect().height>44).map(e=>e.textContent.trim()),
      menuButton:getComputedStyle(document.getElementById('burger')).display!=='none',ctaBottom:hero.bottom==null?null:Math.round(hero.bottom),h1Lines:Math.round(document.querySelector('h1').getBoundingClientRect().height/parseFloat(getComputedStyle(document.querySelector('h1')).lineHeight)),
      h1:document.querySelectorAll('h1').length,main:document.querySelectorAll('main#main').length,current:[...document.querySelectorAll('.nav-links a[aria-current="page"]')].map(a=>a.getAttribute('href'))}})()`)) })
}
check(`no overflow or wrapping 360-1920px on ${ROUTES.length} page(s)`, layout.every((l) => !l.pageOverflow && !l.rowOverflow && l.wideElements === 0 && l.wrapped.length === 0), layout.filter((l) => l.pageOverflow || l.rowOverflow || l.wideElements || l.wrapped.length))
check('one h1 and one main landmark per page', layout.every((l) => l.h1 === 1 && l.main === 1), layout.filter((l) => l.h1 !== 1 || l.main !== 1))
check('current page marked in the main nav (aria-current)', layout.every((l) => (['/creator-record', '/commercial-assurance', '/pricing', '/enterprise'].includes(l.route) ? l.current.length === 1 && l.current[0] === l.route : l.current.length === 0)), [...new Set(layout.map((l) => l.route + ':' + l.current.join(',')))])
check('full nav from 1181px, menu at 1180px and below', layout.every((l) => l.menuButton === (l.w <= 1180)), layout.map((l) => [l.w, l.menuButton]))

// 2. Keyboard and mobile menu
await open(`${BASE}/`, 390, 844)
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
const firstFocus = await ev('document.activeElement.textContent.trim()')
check('first Tab reaches "Skip to content"', firstFocus === 'Skip to content', firstFocus)
const menu = await ev(`(async()=>{const b=document.getElementById('burger');const m=document.getElementById('mobile-menu');const r={};b.focus();b.click();await new Promise(r=>setTimeout(r,50));
  r.openAfterClick=m.classList.contains('open');r.ariaOpen=b.getAttribute('aria-expanded');r.items=[...m.querySelectorAll('a')].map(a=>a.textContent.trim());r.itemsVisible=[...m.querySelectorAll('a')].every(a=>a.offsetParent);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await new Promise(r=>setTimeout(r,50));r.closedAfterEscape=!m.classList.contains('open');r.ariaClosed=b.getAttribute('aria-expanded');r.focusReturned=document.activeElement===b;return r})()`)
check('mobile menu opens, lists every destination, closes on Escape with focus returned', menu.openAfterClick && menu.ariaOpen === 'true' && menu.itemsVisible && menu.items.length === 7 && menu.closedAfterEscape && menu.ariaClosed === 'false' && menu.focusReturned, menu)
const focusables = await ev(`[...document.querySelectorAll('a[href],button')].filter(e=>!e.hasAttribute('disabled')&&e.tabIndex>=0).length`)
check('all links and buttons are keyboard-focusable elements', focusables > 0 && (await ev(`[...document.querySelectorAll('[onclick],[data-go]')].length`)) === 0, { focusables })

// 2b. No purchase, sign-up or payment journey linked from any page
const purchase = []
for (const route of ROUTES) {
  await open(`${BASE}${route}`)
  const hrefs = await ev(`[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))`)
  purchase.push(...hrefs.filter((h) => /auth\/signup|signup|register|checkout|stripe\.com|\/pay\b|\/record$|\/certify/i.test(h)).map((h) => `${route}: ${h}`))
}
check('no link to sign-up, checkout or payment', purchase.length === 0, purchase)

// 2c. Contact: inquiry preselection is validated; the inactive form sends nothing
if (ROUTES.includes('/contact')) {
  const cases = [['assurance', 'assurance'], ['enterprise', 'enterprise'], ['creator_record_access', 'creator_record_access'], ['general', 'general'],
    ['unknown-value', 'general'], ['', 'general'], ['ASSURANCE', 'general'], ['"><img src=x onerror=window.__si8pwned=1>', 'general']]
  const got = []
  for (const [value, expected] of cases) {
    await open(`${BASE}/contact?inquiry=${encodeURIComponent(value)}`)
    got.push({ value, expected, selected: await ev(`document.getElementById('inquiry-type').value`), pwned: await ev('window.__si8pwned === 1'), injectedImgs: await ev(`document.querySelectorAll('img[src="x"]').length`) })
  }
  await open(`${BASE}/contact`)
  got.push({ value: '(none)', expected: 'general', selected: await ev(`document.getElementById('inquiry-type').value`), pwned: false, injectedImgs: 0 })
  check('inquiry preselection: valid values selected, anything else falls back to general, nothing injected', got.every((g) => g.selected === g.expected && !g.pwned && g.injectedImgs === 0), got)

  requests.length = 0
  const inactive = await ev(`(async()=>{const btn=[...document.querySelectorAll('#contact-card button')]; const forms=document.querySelectorAll('form').length;
    document.getElementById('contact-name').value='Test'; document.getElementById('contact-email').value='test@example.com';
    btn.forEach(b=>b.click()); const e=document.getElementById('contact-email'); e.focus();
    e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await new Promise(r=>setTimeout(r,400));
    return {forms, buttons:btn.length, allDisabled:btn.every(b=>b.disabled), describedBy:btn.map(b=>b.getAttribute('aria-describedby')), status:(document.getElementById('contact-status')||{}).textContent, url:location.href}})()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(400)
  inactive.requestsAfter = requests.filter((u) => !/fonts\.(googleapis|gstatic)\.com/.test(u))
  inactive.urlAfter = await ev('location.href')
  check('contact form inactive: no <form>, Send disabled and explained, no request or navigation on interaction', inactive.forms === 0 && inactive.buttons === 1 && inactive.allDisabled && inactive.describedBy[0] === 'contact-status' && /Not yet available/.test(inactive.status) && inactive.requestsAfter.length === 0 && inactive.urlAfter === inactive.url, inactive)
}

// 3. Local resources load; no JavaScript exceptions
requests.length = 0
await open(`${BASE}/`)
const local = requests.filter((u) => u.startsWith(BASE))
const statuses = []
for (const u of new Set(local)) statuses.push([u.replace(BASE, ''), (await fetch(u)).status])
check('local resources load (200)', statuses.every(([, s]) => s === 200), statuses)

// 4. CRC attribution: approved keys only
await open(`${BASE}/?utm_source=s&utm_medium=m&utm_campaign=c&utm_content=t&ref=r&gclid=g&email=x%40y.z&utm_term=k`)
const crc = await ev(`[...document.querySelectorAll('a[href^="https://app.superimmersive8.com/crc"]')].map(a=>a.getAttribute('href'))`)
const expected = 'https://app.superimmersive8.com/crc?utm_source=s&utm_medium=m&utm_campaign=c&utm_content=t&ref=r'
check('CRC links forward only utm_source/medium/campaign/content and ref', crc.length >= 1 && crc.every((h) => h === expected), crc)
await open(`${BASE}/`)
const crcPlain = await ev(`[...document.querySelectorAll('a[href^="https://app.superimmersive8.com/crc"]')].map(a=>a.getAttribute('href'))`)
check('CRC links unchanged without parameters', crcPlain.every((h) => h === 'https://app.superimmersive8.com/crc'), crcPlain)

// 5. Analytics off on localhost
requests.length = 0
await open(`${BASE}/`); await sleep(500)
const gaLocal = { enabled: await ev('window.si8AnalyticsEnabled'), dataLayer: await ev('Array.isArray(window.dataLayer)'), gaRequests: requests.filter((u) => /googletagmanager|google-analytics/.test(u)) }
check('GA4 disabled on localhost (no script, no dataLayer, no requests)', gaLocal.enabled === false && gaLocal.dataLayer === false && gaLocal.gaRequests.length === 0, gaLocal)

// 6. Analytics on the Production hostname (simulated; Google requests blocked, nothing transmitted)
prodHost = true; requests.length = 0
await open('https://www.superimmersive8.com/'); await sleep(500)
const gaProd = { enabled: await ev('window.si8AnalyticsEnabled'), config: await ev(`(window.dataLayer||[]).map(a=>Array.from(a)).filter(a=>a[0]==='config').map(a=>a[1])`), tagRequested: requests.filter((u) => /googletagmanager\.com\/gtag\/js\?id=G-628BLE9N15/.test(u)).length, calendlyLinks: await ev(`document.querySelectorAll('a[href*="calendly.com"]').length`) }
check('GA4 enabled only on www.superimmersive8.com with G-628BLE9N15 (request blocked)', gaProd.enabled === true && gaProd.config.includes('G-628BLE9N15') && gaProd.tagRequested >= 1, gaProd)
prodHost = false

// 7. No JavaScript exceptions
check('no JavaScript exceptions', exceptions.length === 0, exceptions)

// Screenshots
if (shotDir) {
  mkdirSync(shotDir, { recursive: true })
  for (const route of ROUTES) for (const [kind, w, h, scale] of [['desktop', 1440, 900, 1], ['mobile', 390, 844, 2]]) {
    const name = `${kind}-${route === '/' ? 'home' : route.replace(/^\//, '')}`
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: w < 600 })
    await send('Page.navigate', { url: 'about:blank' }); await sleep(150); await send('Page.navigate', { url: `${BASE}${route}` }); await sleep(1200); await ev('document.fonts.ready.then(()=>true)')
    const H = await ev('document.documentElement.scrollHeight')
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: H, scale: 1 } })
    writeFileSync(join(shotDir, `${name}.png`), Buffer.from(shot.data, 'base64'))
  }
}

sock.close(); chrome.kill(); server.close()
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '  ' + JSON.stringify(r.detail)}`)
console.log(JSON.stringify({ routes: ROUTES, homeHero: layout.filter((l) => l.route === '/').map((l) => ({ w: l.w, ctaBottom: l.ctaBottom, h1Lines: l.h1Lines })), gaLocal, gaProd, crc, statuses }))
process.exit(results.every((r) => r.ok) ? 0 : 1)
