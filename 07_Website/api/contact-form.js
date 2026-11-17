// SI8-WEB-LAUNCH-2 — website contact form endpoint (POST /api/contact-form).
//
// Replaces the earlier handler, which sent from Resend's shared sandbox sender, logged names and email addresses, and added
// every submitter to the Kit mailing list. This version:
//   - is off unless CONTACT_FORM_ENABLED is exactly "true" and RESEND_API_KEY is set (503 otherwise: fail closed);
//   - accepts JSON from the SI8 website origins only, bounded in size, with server-side validation of every field;
//   - rejects bots with a hidden field and a minimum fill time, and limits repeated submissions per connection;
//   - delivers each enquiry by email from SI8's own domain to SI8's inbox, with the visitor's address as reply-to;
//   - subscribes to Kit ONLY when the visitor ticked the separate, unticked-by-default option AND the opt-in is enabled
//     (KIT_OPT_IN_ENABLED, KIT_API_SECRET, KIT_OPT_IN_TAG_ID); never otherwise;
//   - logs outcome codes only: never a name, address, message or IP.
// Nothing is stored by the website itself. Rate limiting keeps a one-way hash of the connection's IP address in this server
// instance's memory for at most RATE_LIMIT.windowMs; it is never written anywhere.
import { createHash } from 'node:crypto'

export const SENDER = 'SI8 Website <noreply@superimmersive8.com>'
export const DESTINATION = 'jd@superimmersive8.com'
export const ALLOWED_ORIGINS = ['https://www.superimmersive8.com', 'https://superimmersive8.com']
export const INQUIRY_TYPES = Object.freeze({
  assurance: 'Commercial Assurance',
  enterprise: 'Enterprise / Platform',
  creator_record_access: 'Creator Record access',
  general: 'General Inquiry',
})
export const LIMITS = Object.freeze({ bodyBytes: 8192, name: 120, email: 254, description: 4000, minFillMs: 3000, maxFormAgeMs: 24 * 60 * 60 * 1000 })
export const RATE_LIMIT = Object.freeze({ windowMs: 10 * 60 * 1000, max: 5 })
/** Identifies the wording of the optional mailing-list checkbox shown to the visitor (recorded as consent evidence). */
export const MAILING_LIST_CONSENT_VERSION = 'contact-optin-1'
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/
const SEND_TIMEOUT_MS = 10000

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const clean = (v) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim() : '')
const oneLine = (v) => clean(v).replace(/\s+/g, ' ')

/** Server-side validation. Returns the cleaned enquiry, or the names (never the values) of the invalid fields. */
export function validateEnquiry(body) {
  const value = {
    name: oneLine(body.name),
    email: oneLine(body.email).toLowerCase(),
    inquiry: typeof body.inquiry === 'string' ? body.inquiry : '',
    description: clean(body.description),
    mailingList: body.mailingList === true,
  }
  const fields = []
  if (!value.name || value.name.length > LIMITS.name) fields.push('name')
  if (!value.email || value.email.length > LIMITS.email || !EMAIL_PATTERN.test(value.email)) fields.push('email')
  if (!Object.prototype.hasOwnProperty.call(INQUIRY_TYPES, value.inquiry)) fields.push('inquiry')
  if (!value.description || value.description.length > LIMITS.description) fields.push('description')
  return fields.length ? { ok: false, fields } : { ok: true, value }
}

/** Per-instance, in-memory limiter keyed by a one-way hash of the connection's IP address. Best effort only. */
export function createRateLimiter({ windowMs = RATE_LIMIT.windowMs, max = RATE_LIMIT.max } = {}) {
  const hits = new Map()
  return function limited(key, now) {
    for (const [k, times] of hits) if (times[times.length - 1] <= now - windowMs) hits.delete(k)
    const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs)
    if (recent.length >= max) { hits.set(key, recent); return true }
    recent.push(now)
    hits.set(key, recent)
    return false
  }
}

function connectionKey(headers) {
  const forwarded = String(headers['x-forwarded-for'] ?? '').split(',')[0].trim()
  const ip = forwarded || String(headers['x-real-ip'] ?? '').trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

export function buildNotification(enquiry, { receivedAt, mailingList }) {
  const label = INQUIRY_TYPES[enquiry.inquiry]
  const listLine = mailingList === 'requested'
    ? `Mailing list: the visitor ticked the optional mailing-list box (wording ${MAILING_LIST_CONSENT_VERSION}) at ${receivedAt}.`
    : 'Mailing list: not requested. Do not add this address to any mailing list.'
  const text = [
    `New website enquiry: ${label}`,
    '',
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Inquiry type: ${label}`,
    '',
    enquiry.description,
    '',
    listLine,
    `Received: ${receivedAt}`,
    'Reply to this email to respond to the visitor.',
  ].join('\n')
  const html = `<div style="font-family:system-ui,sans-serif;max-width:600px">
<h2 style="margin:0 0 12px">New website enquiry: ${escapeHtml(label)}</h2>
<p style="margin:4px 0"><strong>Name:</strong> ${escapeHtml(enquiry.name)}</p>
<p style="margin:4px 0"><strong>Email:</strong> ${escapeHtml(enquiry.email)}</p>
<p style="margin:4px 0"><strong>Inquiry type:</strong> ${escapeHtml(label)}</p>
<p style="margin:16px 0;white-space:pre-wrap">${escapeHtml(enquiry.description)}</p>
<p style="margin:4px 0;color:#555">${escapeHtml(listLine)}</p>
<p style="margin:4px 0;color:#555">Received: ${escapeHtml(receivedAt)}. Reply to this email to respond to the visitor.</p>
</div>`
  return { from: SENDER, to: [DESTINATION], reply_to: enquiry.email, subject: `Website enquiry: ${label}`, text, html }
}

async function postJson(fetchImpl, url, headers, body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export function createHandler({ fetchImpl = (...a) => fetch(...a), env = process.env, now = () => Date.now(), log = (code) => console.log(`contact-form: ${code}`), limiter = createRateLimiter() } = {}) {
  return async function handler(req, res) {
    const reply = (status, payload, code) => { log(code); return res.status(status).json(payload) }
    if (req.method !== 'POST') return reply(405, { ok: false, code: 'method_not_allowed' }, 'method_not_allowed')
    if (env.CONTACT_FORM_ENABLED !== 'true' || !env.RESEND_API_KEY) return reply(503, { ok: false, code: 'not_configured' }, 'not_configured')

    const headers = req.headers ?? {}
    const extraOrigins = String(env.CONTACT_FORM_EXTRA_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    if (![...ALLOWED_ORIGINS, ...extraOrigins].includes(headers.origin)) return reply(403, { ok: false, code: 'forbidden' }, 'forbidden_origin')
    if (!String(headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) return reply(415, { ok: false, code: 'unsupported' }, 'unsupported_media_type')
    const declared = Number(headers['content-length'] ?? 0)
    const raw = typeof req.body === 'string' ? req.body : null
    if (declared > LIMITS.bodyBytes || (raw !== null && Buffer.byteLength(raw) > LIMITS.bodyBytes)) return reply(413, { ok: false, code: 'too_large' }, 'too_large')

    let body = req.body
    if (raw !== null) { try { body = JSON.parse(raw) } catch { return reply(400, { ok: false, code: 'invalid' }, 'invalid_json') } }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { ok: false, code: 'invalid' }, 'invalid_body')
    if (raw === null && Buffer.byteLength(JSON.stringify(body)) > LIMITS.bodyBytes) return reply(413, { ok: false, code: 'too_large' }, 'too_large')

    // Bots: a filled hidden field gets a quiet success and nothing is sent; an implausibly fast or stale form is refused.
    if (clean(body.website)) return reply(200, { ok: true }, 'spam_honeypot')
    const t = now()
    const loadedAt = Number(body.formLoadedAt)
    if (!Number.isFinite(loadedAt) || t - loadedAt < LIMITS.minFillMs || t - loadedAt > LIMITS.maxFormAgeMs) return reply(400, { ok: false, code: 'retry' }, 'spam_timing')
    if (limiter(connectionKey(headers), t)) return reply(429, { ok: false, code: 'rate_limited' }, 'rate_limited')

    const checked = validateEnquiry(body)
    if (!checked.ok) return reply(400, { ok: false, code: 'invalid_fields', fields: checked.fields }, `invalid_fields:${checked.fields.join(',')}`)
    const enquiry = checked.value

    const optInEnabled = env.KIT_OPT_IN_ENABLED === 'true' && !!env.KIT_API_SECRET && !!env.KIT_OPT_IN_TAG_ID
    const listRequested = enquiry.mailingList && optInEnabled
    const receivedAt = new Date(t).toISOString()
    const message = buildNotification(enquiry, { receivedAt, mailingList: listRequested ? 'requested' : 'not_requested' })
    const delivered = await postJson(fetchImpl, 'https://api.resend.com/emails', { Authorization: `Bearer ${env.RESEND_API_KEY}` }, message)
    if (!delivered) return reply(502, { ok: false, code: 'delivery_failed' }, 'delivery_failed')

    let mailingList = 'not_requested'
    if (enquiry.mailingList) {
      if (!optInEnabled) mailingList = 'unavailable'
      else {
        const subscribed = await postJson(fetchImpl, `https://api.kit.com/v3/tags/${encodeURIComponent(env.KIT_OPT_IN_TAG_ID)}/subscribe`, {}, { api_secret: env.KIT_API_SECRET, email: enquiry.email, first_name: enquiry.name })
        mailingList = subscribed ? 'subscribed' : 'failed'
      }
    }
    return reply(200, { ok: true, mailingList }, `delivered:${mailingList}`)
  }
}

export default createHandler()
