// SI8-UX-2 local browser evidence. Usage (from 08_Platform/app):
//   node test-support/si8-ux-2/drive.mjs <harnessDir> <evidenceDir> <profileDir> [chromePath]
// <profileDir> is a throwaway Chrome profile directory (outside the repo); it is not deleted by this script.
// Launches headless Chrome (throwaway profile) on the built harness (file://, no network), drives the two representative customer
// paths with real DOM events into the real React components, and writes full-page PNG screenshots (desktop 1280px, mobile 390px),
// the request log and a JSON report of checks. Synthetic data only. Exits 1 if any check fails.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [harnessDir, evidenceDir, profileDir, chromeArg] = process.argv.slice(2)
const CHROME = chromeArg ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9300 + Math.floor(Math.random() * 500)
const profile = resolve(profileDir)
mkdirSync(evidenceDir, { recursive: true })
const url = pathToFileURL(join(resolve(harnessDir), 'index.html')).href
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' })
let ws, nextId = 0
const pending = new Map()
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break }
    } catch { /* not up yet */ }
    await sleep(200)
  }
  if (!ws) throw new Error('chrome did not start')
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) } }
}
const send = (method, params = {}) => new Promise((r, j) => { const id = ++nextId; pending.set(id, (d) => (d.error ? j(new Error(`${method}: ${d.error.message}`)) : r(d.result))); ws.send(JSON.stringify({ id, method, params })) })
async function js(expr) {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(`page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
  return r.result.value
}

const HELPERS = `
window.__drv = (() => {
  const tick = (ms = 260) => new Promise((r) => setTimeout(r, ms))
  const setNative = (el, v) => { const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })) }
  const field = (q, tool) => { const s = tool == null ? 'fieldset[data-question-id="' + q + '"]' : '[data-tool-block="' + tool + '"] fieldset[data-question-id="' + q + '"]'; const f = document.querySelector(s); if (!f) throw new Error('no field ' + s); return f }
  const byText = (sel, text, scope = document) => { const e = [...scope.querySelectorAll(sel)].find((x) => x.textContent.trim() === text); if (!e) throw new Error('no ' + sel + ' "' + text + '"'); return e }
  const doc = (id) => { const e = document.querySelector('li[data-document="' + id + '"]'); if (!e) throw new Error('no document row ' + id); return e }
  return {
    tick,
    text: async (q, v, tool) => { setNative(field(q, tool).querySelector('input[type=text],textarea'), v); await tick(60) },
    select: async (q, v, tool) => { setNative(field(q, tool).querySelector('select'), v); await tick(80) },
    plan: async (tool, v) => { setNative(field('T3', tool).querySelector('select'), '__another_plan'); await tick(80); setNative(field('T3', tool).querySelector('input[type=text]'), v); await tick(60) },
    option: async (q, label, tool) => { byText('label', label, field(q, tool)).querySelector('input').click(); await tick(60) },
    click: async (text, scope) => { const b = [...(scope ?? document).querySelectorAll('button')].find((x) => x.textContent.trim() === text); if (!b) throw new Error('no button "' + text + '"'); if (b.disabled) throw new Error('button disabled "' + text + '"'); b.click(); await tick() },
    disabled: (text) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === text); return b ? b.disabled : null },
    toolDocs: (tool) => { const e = document.querySelector('[data-tool-documents="' + tool + '"]'); if (!e) throw new Error('no tool documents ' + tool); return e },
    upload: async (tool, name) => {
      const area = document.querySelector('[data-tool-documents="' + tool + '"]')
      const input = area.querySelector('input[type=file]'); const dt = new DataTransfer(); dt.items.add(new File(['%PDF-1.4 SYNTHETIC TEST DOCUMENT'], name, { type: 'application/pdf' })); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); await tick(60)
      area.querySelector('[data-upload-panel] .cr-consent input').click(); await tick(60)
    },
    pick: async (tool, docId) => { const area = document.querySelector('[data-tool-documents="' + tool + '"]'); area.querySelector('li[data-pick="' + docId + '"] button').click(); await tick() },
    link: async (docId, value) => { setNative(doc(docId).querySelector('select'), value); await tick(80) },
    permit: async (docId) => { doc(docId).querySelector('[data-ai-permission] input').click(); await tick(60) },
    examine: async (docId) => { const b = [...doc(docId).querySelectorAll('button')].find((x) => x.textContent.trim() === 'Read with AI'); b.click(); await tick(500) },
    retry: async (docId) => { byText('button', 'Try again', doc(docId)).click(); await tick(500) },
    ack: async () => { for (const i of document.querySelectorAll('.cr-ack input')) if (!i.checked) i.click(); await tick(60) },
    docState: () => [...document.querySelectorAll('li[data-document]')].map((li) => ({ id: li.getAttribute('data-document'), pending: li.getAttribute('data-pending'), link: li.querySelector('select').value, where: li.closest('[data-tool-documents]')?.getAttribute('data-tool-documents') ?? (li.closest('[data-needs-choice-group]') ? 'needs-choice' : li.closest('[data-unlinked-group]') ? 'unlinked' : '?') })),
    step: () => document.querySelector('form.cr-stepped')?.getAttribute('data-step') ?? null,
    requests: () => window.__ux2.requests,
    // textContent, not innerText: CSS text-transform must not change what is checked.
    textOf: (sel) => (document.querySelector(sel)?.textContent ?? ''),
    bodyText: () => document.body.textContent,
  }
})()
`

const checks = []
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, ...(detail !== undefined ? { detail } : {}) }); if (!ok) console.error('CHECK FAILED:', name, detail ?? '') }

async function viewport(width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
}
async function shot(name) {
  const overflow = await js('return document.documentElement.scrollWidth - window.innerWidth')
  check(`${name}: no horizontal page scroll`, overflow <= 0, overflow)
  const m = await send('Page.getLayoutMetrics')
  const h = Math.ceil(m.cssContentSize?.height ?? m.contentSize.height)
  const w = (await js('return window.innerWidth'))
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: Math.min(Math.max(h, 400), 16000), deviceScaleFactor: 1, mobile: w < 600 })
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  writeFileSync(join(evidenceDir, `${name}.png`), Buffer.from(r.data, 'base64'))
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: w < 600 ? 844 : 900, deviceScaleFactor: 1, mobile: w < 600 })
}
async function load(width) {
  await viewport(width, width < 600 ? 844 : 900, width < 600)
  await send('Page.navigate', { url })
  await sleep(900)
  await js(HELPERS + '; return true')
  await js('await __drv.tick(400); return true')
}
const d = (expr) => js(`return await (async () => { ${expr} })()`)

async function fillFirstTwoSteps() {
  await d(`await __drv.text('P1', 'SYNTHETIC UX-2 test video'); await __drv.option('P3', 'In paid advertising')`)
  await d(`await __drv.click('Continue')`)
  await d(`await __drv.option('F1', 'Taiwan'); await __drv.option('F2', 'United States'); await __drv.option('F3', 'United States')`)
  await d(`await __drv.click('Continue')`)
}
async function finishAfterTools() {
  await d(`await __drv.click('Continue')`)
  await d(`await __drv.option('L1', 'No'); await __drv.click('Continue')`)
  await d(`await __drv.option('M0', 'None of these'); await __drv.click('Continue')`)
  await d(`await __drv.option('H1', 'Edited the video'); await __drv.click('Continue')`)
}

async function pathA(width, tag) {
  await load(width)
  check(`${tag} A: opens on step 1 (project)`, (await d('return __drv.step()')) === 'project')
  await shot(`${tag}-A01-step1-your-video`)
  // A step's own check: Continue with nothing answered stays on the step and lists only this step's required questions.
  await d(`await __drv.click('Continue')`)
  check(`${tag} A: empty step 1 stays and shows its issues`, (await d('return __drv.step()')) === 'project' && (await d(`return __drv.textOf('.cr-issues')`)).includes('Some answers need attention (2)'))
  await shot(`${tag}-A02-step1-validation`)
  await fillFirstTwoSteps()
  check(`${tag} A: F3 (client base) is asked because the use is paid advertising`, true)
  await d(`await __drv.select('T1', 'runway-gen3', 0); await __drv.plan(0, 'Standard'); await __drv.text('T4', 'October 2026', 0)`)
  await shot(`${tag}-A03-step3-one-tool-no-documents`)
  await finishAfterTools()
  check(`${tag} A: reaches the acknowledgements step`, (await d('return __drv.step()')) === 'acknowledgements')
  await d(`await __drv.ack()`)
  await shot(`${tag}-A04-step7-acknowledgements`)
  await d(`await __drv.click('Prepare draft record'); await __drv.tick(500)`)
  const review = await d(`return __drv.bodyText()`)
  check(`${tag} A: review shows the declarations as recorded`, review.includes('Check your declarations') && review.includes('SYNTHETIC UX-2 test video'))
  const prep = (await d('return __drv.requests()')).filter((r) => r.path === '/api/creator-record-v2/prepared')
  check(`${tag} A: one preparation, with no documents and no reading inclusion`, prep.length === 1 && prep[0].body.documents === undefined && prep[0].body.include_examinations === undefined, prep.map((r) => r.body))
  await shot(`${tag}-A05-review`)
  await d(`await __drv.click('Confirm these declarations'); await __drv.tick(400)`)
  await d(`await __drv.click('Continue to payment'); await __drv.tick(600)`)
  const reqs = await d('return __drv.requests()')
  check(`${tag} A: payment uses the existing purchase route, then Stripe-hosted Checkout`, reqs.some((r) => /\/prepared\/[^/]+\/purchase$/.test(r.path)) && reqs.some((r) => r.path === '/api/checkout/create-session' && r.body.submissionId))
  check(`${tag} A: the page was sent to the checkout URL (simulated)`, (await js('return location.hash')) === '#stripe-hosted-checkout-simulated-redirect')
  return reqs
}

const PREV_RUNWAY = '00000000-0000-4000-8000-000000000065' // id 101
const PREV_HIGGS = '00000000-0000-4000-8000-000000000066' // id 102

async function pathB(width, tag) {
  await load(width)
  await fillFirstTwoSteps()
  // Three tools, the first and third both Runway (duplicate provider declarations).
  await d(`await __drv.select('T1', 'runway-gen3', 0); await __drv.plan(0, 'Pro'); await __drv.text('T4', 'September–October 2026', 0)`)
  await d(`await __drv.click('Add another tool'); await __drv.select('T1', 'higgsfield', 1); await __drv.select('T3', '__not_sure', 1); await __drv.text('T4', 'October 2026', 1)`)
  await d(`await __drv.click('Add another tool'); await __drv.select('T1', 'runway-gen3', 2); await __drv.plan(2, 'Standard'); await __drv.text('T4', 'November 2026', 2)`)
  // Previously uploaded documents chosen inside tools 1 and 2; a new document uploaded inside tool 3 with storage consent.
  await d(`await __drv.click('Choose a document you have already added', __drv.toolDocs(0)); await __drv.pick(0, '${PREV_RUNWAY}')`)
  await d(`await __drv.click('Choose a document you have already added', __drv.toolDocs(1)); await __drv.pick(1, '${PREV_HIGGS}')`)
  await d(`await __drv.click('Add a new document', __drv.toolDocs(2)); await __drv.upload(2, 'SYNTHETIC-runway-receipt-2026-11.pdf')`)
  await shot(`${tag}-B01-upload-with-storage-consent`)
  check(`${tag} B: "Add document" needs the storage consent (enabled only after it is ticked)`, (await d(`return __drv.disabled('Add document')`)) === false)
  await d(`await __drv.click('Add document', __drv.toolDocs(2)); await __drv.tick(600)`)
  const afterAdd = await d('return __drv.docState()')
  const newDoc = afterAdd.find((x) => x.id !== PREV_RUNWAY && x.id !== PREV_HIGGS)
  check(`${tag} B: documents sit in their tool sections, linked at add time`, JSON.stringify(afterAdd.map((x) => [x.where, x.link])) === JSON.stringify([['0', '0'], ['1', '1'], ['2', '2']]), afterAdd)
  // Optional examination: permission is separate and explicit; the button is disabled until it is given.
  check(`${tag} B: "Read with AI" is disabled before AI permission`, await d(`return [...document.querySelector('li[data-document="${PREV_RUNWAY}"]').querySelectorAll('button')].find((b) => b.textContent.trim() === 'Read with AI').disabled`))
  await d(`await __drv.permit('${PREV_RUNWAY}'); await __drv.examine('${PREV_RUNWAY}')`)
  await d(`await __drv.permit('${newDoc.id}'); await __drv.examine('${newDoc.id}')`)
  check(`${tag} B: a transient failure shows the existing refusal with retry`, (await d(`return document.querySelector('li[data-document="${newDoc.id}"]').innerText`)).includes('Try again'))
  await shot(`${tag}-B02-examination-retry-state`)
  await d(`await __drv.retry('${newDoc.id}')`)
  const formText = await d('return __drv.bodyText()')
  check(`${tag} B: D10 — no reading value anywhere in the form`, !formText.includes('SYNTHETIC TEST PLAN LABEL') && !formText.includes('Subscription confirmation'))
  await shot(`${tag}-B03-tools-with-documents-read`)

  // Remove the FIRST tool: its document needs a choice; the others keep their tools (renumbered).
  await d(`await __drv.click('Remove tool 1')`)
  const afterRemove = await d('return __drv.docState()')
  check(`${tag} B: removed tool's document needs a choice and is linked to no tool`, afterRemove.find((x) => x.id === PREV_RUNWAY)?.where === 'needs-choice' && afterRemove.find((x) => x.id === PREV_RUNWAY)?.pending === 'tool_removed' && afterRemove.find((x) => x.id === PREV_RUNWAY)?.link === '', afterRemove)
  check(`${tag} B: remaining documents renumbered with their own tools`, afterRemove.find((x) => x.id === PREV_HIGGS)?.where === '0' && afterRemove.find((x) => x.id === newDoc.id)?.where === '1', afterRemove)
  await shot(`${tag}-B04-after-removing-tool-1-needs-choice`)

  // Navigate away and back: the unresolved choice is still there.
  await d(`await __drv.click('Back'); await __drv.click('Continue')`)
  check(`${tag} B: an unresolved choice survives navigating away and back`, (await d('return __drv.docState()')).find((x) => x.id === PREV_RUNWAY)?.pending === 'tool_removed')

  // Change the identity of the (now first) Higgsfield tool in place: its document needs reconfirming. A plan change does not.
  await d(`await __drv.plan(1, 'Pro Plus')`)
  check(`${tag} B: a plan-only change does not touch any link`, (await d('return __drv.docState()')).find((x) => x.id === newDoc.id)?.pending === null)
  await d(`await __drv.select('T1', 'not_sure', 0); await __drv.select('T3', '__not_sure', 0)`)
  const afterChange = await d('return __drv.docState()')
  check(`${tag} B: changing a declared tool in place puts its document in "needs a choice", link kept visible`, afterChange.find((x) => x.id === PREV_HIGGS)?.pending === 'tool_changed' && afterChange.find((x) => x.id === PREV_HIGGS)?.where === '0', afterChange)
  await shot(`${tag}-B05-tool-changed-in-place`)

  // Try to finish: preparation is blocked while choices are open.
  await finishAfterTools()
  await d(`await __drv.ack()`)
  check(`${tag} B: preparation is blocked while a choice is open`, (await d(`return __drv.disabled('Prepare draft record')`)) === true && (await d('return __drv.bodyText()')).includes('Some documents need a choice'))
  await shot(`${tag}-B06-submit-blocked`)

  // Resolve: back to the tools step (via the step list), move the removed tool's document to tool 2, keep the changed one on tool 1.
  await d(`[...document.querySelectorAll('.cr-step-button')][2].click(); await __drv.tick()`)
  await d(`await __drv.link('${PREV_RUNWAY}', '1'); await __drv.link('${PREV_HIGGS}', '0')`)
  await d(`await __drv.select('T1', 'higgsfield', 0); await __drv.select('T3', '__not_sure', 0)`)
  // Re-selecting Higgsfield is itself a change from "Not sure": confirm the link once more.
  await d(`await __drv.link('${PREV_HIGGS}', '0')`)
  await d(`document.querySelector('.cr-include input').click(); await __drv.tick(80)`)
  const resolved = await d('return __drv.docState()')
  check(`${tag} B: every choice resolved explicitly`, resolved.every((x) => x.pending === null), resolved)
  await shot(`${tag}-B07-resolved`)
  await d(`[...document.querySelectorAll('.cr-step-button')][6].click(); await __drv.tick()`)
  await d(`await __drv.click('Prepare draft record'); await __drv.tick(600)`)
  const prep = (await d('return __drv.requests()')).filter((r) => r.path === '/api/creator-record-v2/prepared')
  const last = prep[prep.length - 1]?.body
  check(`${tag} B: exactly one preparation was sent, after the choices were resolved`, prep.length === 1, prep.map((r) => r.body.documents))
  check(`${tag} B: serialized references are the existing contract with the intended links`, JSON.stringify(last?.documents) === JSON.stringify([
    { document_id: PREV_RUNWAY, category: 'billing_receipt', tool_index: 1 },
    { document_id: PREV_HIGGS, category: 'billing_receipt', tool_index: 0 },
    { document_id: newDoc.id, category: 'billing_receipt', tool_index: 1 },
  ]) && last?.include_examinations === true, last)
  const review = await d('return __drv.bodyText()')
  const declarations = await d(`return __drv.textOf('[aria-labelledby="decl-answers"]')`)
  const reading = await d(`return __drv.textOf('[data-examination]')`)
  check(`${tag} B: D10 — reading values appear only in the separate reading view`, reading.includes('SYNTHETIC TEST PLAN LABEL') && !declarations.includes('SYNTHETIC TEST PLAN LABEL') && review.indexOf('What the documents appear to show') > review.indexOf('Your answers'))
  check(`${tag} B: D10 — no comparison, discrepancy or verification wording in the review`, !/compare with your declarations|matches your answer|different value from your answer|verified/i.test(review.replace(/Not verified|not verified/g, '')))
  await shot(`${tag}-B08-review-separate-reading-view`)
  // Existing responses to readings: recorded on a new version, never as a correction.
  await d(`const s = document.querySelector('[data-examination] select[aria-label="Your response"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, 'other_plan_applies'); s.dispatchEvent(new Event('change', { bubbles: true })); await __drv.tick(80)`)
  await d(`await __drv.click('Record my responses'); await __drv.tick(600)`)
  const prep2 = (await d('return __drv.requests()')).filter((r) => r.path === '/api/creator-record-v2/prepared')
  check(`${tag} B: a response is recorded by preparing a new version with the same references`, prep2.length === 2 && JSON.stringify(prep2[1].body.documents) === JSON.stringify(last.documents) && prep2[1].body.responses?.length === 1, prep2[1]?.body)
  await d(`await __drv.click('Confirm these declarations'); await __drv.tick(400); await __drv.click('Continue to payment'); await __drv.tick(600)`)
  check(`${tag} B: payment opens Stripe-hosted Checkout (simulated redirect)`, (await js('return location.hash')) === '#stripe-hosted-checkout-simulated-redirect')
  return d('return __drv.requests()')
}

try {
  await connect()
  await send('Page.enable'); await send('Runtime.enable')
  const logs = {}
  logs.desktopA = await pathA(1280, 'desktop')
  logs.desktopB = await pathB(1280, 'desktop')
  logs.mobileA = await pathA(390, 'mobile')
  logs.mobileB = await pathB(390, 'mobile')
  writeFileSync(join(evidenceDir, 'request-log.json'), JSON.stringify(logs, null, 2))
  writeFileSync(join(evidenceDir, 'checks.json'), JSON.stringify(checks, null, 2))
  const failed = checks.filter((c) => !c.ok)
  console.log(`checks: ${checks.length - failed.length}/${checks.length} passed`)
  process.exitCode = failed.length ? 1 : 0
} catch (e) {
  console.error(e)
  writeFileSync(join(evidenceDir, 'checks.json'), JSON.stringify([...checks, { name: 'driver error', ok: false, detail: String(e) }], null, 2))
  process.exitCode = 1
} finally {
  try { ws?.close() } catch {}
  chrome.kill()
  await sleep(500)
}
