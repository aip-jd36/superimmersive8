# Contact Form Spam Protection

**Status:** Active (deployed March 4, 2026)
**Cost:** $0/month
**Expected effectiveness:** 80-95% spam reduction

---

## Problem

Contact form was receiving bot spam submissions with random generated names (mtmsozmwnd, fpygymxlho, etc.). No CAPTCHA or validation in place.

---

## Solution: Two-Layer Defense

### Layer 1: Honeypot Field

**How it works:**
- Hidden field named `website` added to contact form
- Invisible to humans (CSS: `display: none`, `tabindex="-1"`, `autocomplete="off"`)
- Bots auto-fill ALL fields → they fill the honeypot
- API checks: if honeypot has any value → reject as spam (400 error)

**Implementation:**
```html
<!-- In index.html and index-zh.html -->
<input type="text" name="website" style="display: none;" tabindex="-1" autocomplete="off">
```

**API validation** (in `/api/contact-form.js`):
```javascript
if (website && website.trim() !== '') {
  console.log('🚫 SPAM DETECTED: Honeypot field filled:', website);
  return res.status(400).json({
    error: 'Invalid submission',
    message: 'Please try again'
  });
}
```

### Layer 2: Time-Based Validation

**How it works:**
- Hidden timestamp field set when page loads
- Tracks time between page load and form submission
- Bots submit instantly → detected
- Minimum threshold: 3 seconds
- API checks: if submission < 3 seconds → reject as spam (400 error)

**Implementation:**
```html
<!-- Hidden field in form -->
<input type="hidden" name="formLoadTime" id="formLoadTime">
```

**JavaScript** (in `script.js`):
```javascript
// Set timestamp on page load
document.addEventListener('DOMContentLoaded', function() {
    const timestampField = document.getElementById('formLoadTime');
    if (timestampField) {
        timestampField.value = Date.now();
    }
});
```

**API validation** (in `/api/contact-form.js`):
```javascript
if (formLoadTime) {
  const timeElapsed = Date.now() - parseInt(formLoadTime);
  const minTime = 3000; // 3 seconds minimum

  if (timeElapsed < minTime) {
    console.log(`🚫 SPAM DETECTED: Submitted too quickly (${timeElapsed}ms < ${minTime}ms)`);
    return res.status(400).json({
      error: 'Invalid submission',
      message: 'Please try again'
    });
  }
  console.log(`✓ Time check passed: ${timeElapsed}ms elapsed`);
}
```

---

## Flow

### Legitimate User
1. Page loads → timestamp recorded
2. User reads, fills form (takes >3 seconds)
3. User doesn't see honeypot field (leaves empty)
4. Form submits → both checks pass ✅
5. Email sent + added to Kit

### Bot Spam
1. Bot auto-fills ALL fields including hidden honeypot
2. OR bot submits instantly (<3 seconds)
3. API detects spam → returns 400 error 🚫
4. Never reaches email/Kit integration

---

## Files Modified

| File | Changes |
|------|---------|
| `07_Website/script.js` | Added spam protection validation to form handler; sends JSON with honeypot + timestamp fields |
| `07_Website/index.html` | Added honeypot + timestamp hidden fields; removed duplicate inline form handler |
| `07_Website/index-zh.html` | Added honeypot + timestamp hidden fields; removed duplicate inline form handler |
| `07_Website/api/contact-form.js` | Added spam detection logic before email/Kit processing |

---

## Git History

- `437dba0` - Initial spam protection implementation (had form handler conflict)
- `734335f` - Fixed multipart/JSON conflict by consolidating handlers

---

## Monitoring

**Check effectiveness:**
- Monitor email inbox for spam reduction over 7-14 days
- Check Vercel function logs for spam blocks: `🚫 SPAM DETECTED`
- Compare spam volume before/after deployment

**If spam persists:**
- Add email domain validation (block disposable domains)
- Add rate limiting (max submissions per IP)
- Consider Cloudflare Turnstile (free CAPTCHA alternative)

---

## Trade-offs

**Why not CAPTCHA?**
- Adds friction for legitimate users
- Requires external service (Google reCAPTCHA, Cloudflare Turnstile)
- Honeypot + time checks catch 80-95% of spam with zero UX impact

**Why 3 seconds minimum?**
- Balance between catching bots (instant submission) and not blocking fast humans
- 3 seconds = enough time to read "Tell us more" field and type a few words
- Can adjust if false positives occur

**Limitations:**
- Sophisticated bots with JavaScript execution can bypass both checks
- If spam evolves, can add additional layers (email validation, rate limiting)
- Not a replacement for backend email verification

---

## Future Enhancements (if needed)

1. **Email domain validation** - block known disposable email domains
2. **Rate limiting** - max 3 submissions per IP per hour
3. **Cloudflare Turnstile** - invisible CAPTCHA as final layer
4. **IP reputation checking** - block known spam IPs
5. **Custom error messages** - different messages for honeypot vs. time violations

---

**Status as of March 4, 2026:** Deployed and active. Monitoring spam reduction over next 7 days.
