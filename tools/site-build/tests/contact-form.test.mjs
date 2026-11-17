// SI8-WEB-LAUNCH-2 — unit tests for the website contact endpoint (07_Website/api/contact-form.js).
// Run: node --test tools/site-build/tests/
// Every external call is a mock: no email is sent and no Kit subscriber is created.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createHandler, createRateLimiter, validateEnquiry, buildNotification,
  SENDER, DESTINATION, LIMITS, MAILING_LIST_CONSENT_VERSION,
} from '../../../07_Website/api/contact-form.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..')
const NOW = 1_800_000_000_000
const ENV = { CONTACT_FORM_ENABLED: 'true', RESEND_API_KEY: 're_test_key' }
const KIT_ENV = { ...ENV, KIT_OPT_IN_ENABLED: 'true', KIT_API_SECRET: 'kit_test_secret', KIT_OPT_IN_TAG_ID: '123' }
const VALID = { name: 'Ada Example', email: 'Ada@Example.test', inquiry: 'assurance', description: 'A short campaign question.', website: '', formLoadedAt: NOW - 10_000 }

function setup({ env = ENV, responses = {}, limiter } = {}) {
  const calls = [], logs = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers })
    const r = Object.entries(responses).find(([k]) => url.includes(k))
    if (r && r[1] === 'throw') throw new Error('network down')
    return { ok: r ? r[1] : true, json: async () => ({}) }
  }
  const handler = createHandler({ fetchImpl, env, now: () => NOW, log: (c) => logs.push(c), limiter: limiter ?? createRateLimiter() })
  return { handler, calls, logs }
}

async function call(handler, { method = 'POST', body = VALID, headers = {} } = {}) {
  const res = { statusCode: 0, payload: null, status(c) { this.statusCode = c; return this }, json(p) { this.payload = p; return this } }
  const req = { method, body, headers: { origin: 'https://www.superimmersive8.com', 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers } }
  await handler(req, res)
  return res
}

test('valid enquiry: delivered once by email from SI8 to SI8, reply-to the visitor, no Kit call', async () => {
  const { handler, calls } = setup()
  const res = await call(handler)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.payload, { ok: true, mailingList: 'not_requested' })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.resend.com/emails')
  assert.equal(calls[0].headers.Authorization, 'Bearer re_test_key')
  assert.equal(calls[0].body.from, SENDER)
  assert.equal(SENDER, 'SI8 Website <noreply@superimmersive8.com>')
  assert.deepEqual(calls[0].body.to, [DESTINATION])
  assert.equal(calls[0].body.reply_to, 'ada@example.test')
  assert.match(calls[0].body.text, /Inquiry type: Commercial Assurance/)
  assert.match(calls[0].body.text, /Mailing list: not requested\. Do not add this address to any mailing list\./)
  assert.ok(!calls.some((c) => c.url.includes('kit.com')))
})

test('the visitor text is escaped in the HTML email', async () => {
  const { handler, calls } = setup()
  await call(handler, { body: { ...VALID, name: '<script>x</script>', description: '<img src=x onerror=1> & "q"' } })
  assert.ok(!calls[0].body.html.includes('<script>'))
  assert.ok(!calls[0].body.html.includes('<img'))
  assert.match(calls[0].body.html, /&lt;script&gt;/)
})

test('invalid email, missing fields and unknown inquiry types are refused server-side, naming fields only', async () => {
  for (const [body, fields] of [
    [{ ...VALID, email: 'not-an-email' }, ['email']],
    [{ ...VALID, email: 'a@b' }, ['email']],
    [{ ...VALID, name: '   ' }, ['name']],
    [{ ...VALID, description: '' }, ['description']],
    [{ ...VALID, inquiry: 'sales' }, ['inquiry']],
    [{ ...VALID, inquiry: '__proto__' }, ['inquiry']],
    [{ formLoadedAt: VALID.formLoadedAt }, ['name', 'email', 'inquiry', 'description']],
  ]) {
    const { handler, calls } = setup()
    const res = await call(handler, { body })
    assert.equal(res.statusCode, 400)
    assert.deepEqual(res.payload, { ok: false, code: 'invalid_fields', fields })
    assert.equal(calls.length, 0)
    assert.ok(!JSON.stringify(res.payload).includes('not-an-email'))
  }
})

test('field length limits: over-long values are refused', async () => {
  assert.deepEqual(validateEnquiry({ ...VALID, name: 'x'.repeat(LIMITS.name + 1) }).fields, ['name'])
  assert.deepEqual(validateEnquiry({ ...VALID, description: 'x'.repeat(LIMITS.description + 1) }).fields, ['description'])
  assert.equal(validateEnquiry({ ...VALID, description: 'x'.repeat(LIMITS.description) }).ok, true)
})

test('oversized submissions are refused before parsing (413), by header or by body', async () => {
  const big = { ...VALID, description: 'x'.repeat(LIMITS.bodyBytes) }
  for (const opts of [{ headers: { 'content-length': String(LIMITS.bodyBytes + 1) } }, { body: JSON.stringify(big) }, { body: big }]) {
    const { handler, calls } = setup()
    const res = await call(handler, opts)
    assert.equal(res.statusCode, 413)
    assert.equal(calls.length, 0)
  }
})

test('method, origin, content type and malformed JSON are refused', async () => {
  const { handler } = setup()
  assert.equal((await call(handler, { method: 'GET' })).statusCode, 405)
  assert.equal((await call(handler, { headers: { origin: 'https://evil.example' } })).statusCode, 403)
  assert.equal((await call(handler, { headers: { origin: undefined } })).statusCode, 403)
  assert.equal((await call(handler, { headers: { 'content-type': 'text/plain' } })).statusCode, 415)
  assert.equal((await call(handler, { body: '{not json' })).statusCode, 400)
  assert.equal((await call(handler, { body: '[1]' })).statusCode, 400)
})

test('a string body (unparsed) is accepted when valid JSON', async () => {
  const { handler, calls } = setup()
  const res = await call(handler, { body: JSON.stringify(VALID) })
  assert.equal(res.statusCode, 200)
  assert.equal(calls.length, 1)
})

test('extra origins (e.g. a preview) are accepted only when configured', async () => {
  const preview = 'https://si8-preview.vercel.app'
  assert.equal((await call(setup().handler, { headers: { origin: preview } })).statusCode, 403)
  assert.equal((await call(setup({ env: { ...ENV, CONTACT_FORM_EXTRA_ORIGINS: preview } }).handler, { headers: { origin: preview } })).statusCode, 200)
})

test('fails closed when not configured: no flag, wrong flag or no key -> 503, nothing sent', async () => {
  for (const env of [{}, { RESEND_API_KEY: 'k' }, { CONTACT_FORM_ENABLED: 'TRUE', RESEND_API_KEY: 'k' }, { CONTACT_FORM_ENABLED: 'true' }]) {
    const { handler, calls } = setup({ env })
    const res = await call(handler)
    assert.equal(res.statusCode, 503)
    assert.equal(res.payload.code, 'not_configured')
    assert.equal(calls.length, 0)
  }
})

test('spam: a filled hidden field gets a quiet success and nothing is sent', async () => {
  const { handler, calls, logs } = setup()
  const res = await call(handler, { body: { ...VALID, website: 'http://spam.example' } })
  assert.equal(res.statusCode, 200)
  assert.equal(calls.length, 0)
  assert.deepEqual(logs, ['spam_honeypot'])
})

test('spam: missing, too-fast or stale form timing is refused', async () => {
  for (const formLoadedAt of [undefined, 'abc', NOW - 1000, NOW + 5000, NOW - LIMITS.maxFormAgeMs - 1]) {
    const { handler, calls } = setup()
    const res = await call(handler, { body: { ...VALID, formLoadedAt } })
    assert.equal(res.statusCode, 400)
    assert.equal(res.payload.code, 'retry')
    assert.equal(calls.length, 0)
  }
})

test('rate limit: the 6th submission from one connection within 10 minutes is refused; another connection is not', async () => {
  const { handler, calls } = setup()
  for (let i = 0; i < 5; i++) assert.equal((await call(handler)).statusCode, 200)
  const res = await call(handler)
  assert.equal(res.statusCode, 429)
  assert.equal(res.payload.code, 'rate_limited')
  assert.equal(calls.length, 5)
  assert.equal((await call(handler, { headers: { 'x-forwarded-for': '198.51.100.2' } })).statusCode, 200)
})

test('rate limiter forgets a connection after the window', () => {
  const limited = createRateLimiter({ windowMs: 1000, max: 1 })
  assert.equal(limited('k', 0), false)
  assert.equal(limited('k', 500), true)
  assert.equal(limited('k', 1501), false)
})

test('delivery failure or network error -> 502, no Kit call even if opted in', async () => {
  for (const r of [false, 'throw']) {
    const { handler, calls } = setup({ env: KIT_ENV, responses: { 'resend.com': r } })
    const res = await call(handler, { body: { ...VALID, mailingList: true } })
    assert.equal(res.statusCode, 502)
    assert.equal(res.payload.code, 'delivery_failed')
    assert.ok(!calls.some((c) => c.url.includes('kit.com')))
  }
})

test('Kit: no subscription without explicit consent, even when the opt-in is fully configured', async () => {
  for (const mailingList of [undefined, false, 'true', 'on', 1, 'yes']) {
    const { handler, calls } = setup({ env: KIT_ENV })
    const res = await call(handler, { body: { ...VALID, mailingList } })
    assert.equal(res.statusCode, 200)
    assert.equal(res.payload.mailingList, 'not_requested')
    assert.ok(!calls.some((c) => c.url.includes('kit.com')))
  }
})

test('Kit: an explicit opt-in is ignored while the opt-in is not enabled (no call, enquiry still sent)', async () => {
  for (const env of [ENV, { ...KIT_ENV, KIT_OPT_IN_ENABLED: 'false' }, { ...KIT_ENV, KIT_OPT_IN_TAG_ID: '' }, { ...KIT_ENV, KIT_API_SECRET: '' }]) {
    const { handler, calls } = setup({ env })
    const res = await call(handler, { body: { ...VALID, mailingList: true } })
    assert.equal(res.statusCode, 200)
    assert.equal(res.payload.mailingList, 'unavailable')
    assert.equal(calls.length, 1)
    assert.match(calls[0].body.text, /Mailing list: not requested/)
  }
})

test('Kit: explicit opt-in with the opt-in enabled subscribes once, after delivery, and records consent evidence', async () => {
  const { handler, calls } = setup({ env: KIT_ENV })
  const res = await call(handler, { body: { ...VALID, mailingList: true } })
  assert.deepEqual(res.payload, { ok: true, mailingList: 'subscribed' })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, 'https://api.resend.com/emails')
  assert.equal(calls[1].url, 'https://api.kit.com/v3/tags/123/subscribe')
  assert.deepEqual(calls[1].body, { api_secret: 'kit_test_secret', email: 'ada@example.test', first_name: 'Ada Example' })
  assert.match(calls[0].body.text, new RegExp(`ticked the optional mailing-list box \\(wording ${MAILING_LIST_CONSENT_VERSION}\\) at ${new Date(NOW).toISOString()}`))
})

test('Kit failure does not fail the enquiry', async () => {
  const { handler } = setup({ env: KIT_ENV, responses: { 'kit.com': false } })
  const res = await call(handler, { body: { ...VALID, mailingList: true } })
  assert.deepEqual(res.payload, { ok: true, mailingList: 'failed' })
})

test('logs carry outcome codes only: no name, email, message or IP', async () => {
  const { handler, logs } = setup({ env: KIT_ENV })
  await call(handler, { body: { ...VALID, mailingList: true } })
  await call(handler, { body: { ...VALID, email: 'bad' } })
  const all = logs.join(' ')
  for (const secret of ['Ada', 'example.test', 'campaign question', '203.0.113.7']) assert.ok(!all.includes(secret), secret)
  assert.deepEqual(logs, ['delivered:subscribed', 'invalid_fields:email'])
})

test('the handler source never logs request data', () => {
  const src = readFileSync(join(ROOT, '07_Website', 'api', 'contact-form.js'), 'utf8')
  assert.equal((src.match(/console\.(log|error|warn|info)/g) ?? []).length, 1)
  assert.match(src, /log = \(code\) => console\.log\(`contact-form: \$\{code\}`\)/)
})

test('buildNotification never echoes a mailing-list request when the opt-in is off', () => {
  const n = buildNotification({ name: 'A', email: 'a@b.co', inquiry: 'general', description: 'x', mailingList: true }, { receivedAt: 'T', mailingList: 'not_requested' })
  assert.match(n.text, /Mailing list: not requested/)
})

test('the generated contact page has no mailing-list box while the opt-in is disabled in site.config.json', () => {
  const config = JSON.parse(readFileSync(join(ROOT, 'tools', 'site-build', 'site.config.json'), 'utf8'))
  const page = readFileSync(join(ROOT, '07_Website', 'contact', 'index.html'), 'utf8')
  assert.equal(config.contactForm.mailingListOptIn, false)
  assert.ok(!page.includes('contact-mailing-list'))
  const partial = readFileSync(join(ROOT, 'tools', 'site-build', 'partials', 'mailing-list-optin.html'), 'utf8')
  assert.match(partial, /type="checkbox">/)
  assert.ok(!/checked/.test(partial), 'the opt-in box must never be pre-ticked')
})
