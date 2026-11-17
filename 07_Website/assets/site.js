/* SI8 marketing site: shared behaviour (mobile menu, analytics, CRC attribution). No dependencies. */
(function () {
  'use strict';

  /* ---- Analytics: GA4 only on the Production marketing hostnames ---- */
  var GA_ID = 'G-628BLE9N15';
  var ANALYTICS_HOSTS = ['www.superimmersive8.com', 'superimmersive8.com'];
  var analyticsEnabled = ANALYTICS_HOSTS.indexOf(window.location.hostname) !== -1;
  window.si8AnalyticsEnabled = analyticsEnabled;

  if (analyticsEnabled) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  function track(name, params) {
    if (analyticsEnabled && typeof window.gtag === 'function') window.gtag('event', name, params);
  }

  /* ---- CRC attribution: forward only the approved parameters to the Commercial Readiness Check ---- */
  function forwardCrcAttribution() {
    try {
      var CRC_URL = 'https://app.superimmersive8.com/crc';
      var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'];
      var current = new URLSearchParams(window.location.search);
      var forward = new URLSearchParams();
      KEYS.forEach(function (key) {
        var value = current.get(key);
        if (value) forward.set(key, value);
      });
      var query = forward.toString();
      if (!query) return;
      document.querySelectorAll('a[href="' + CRC_URL + '"]').forEach(function (el) {
        el.setAttribute('href', CRC_URL + '?' + query);
      });
    } catch (e) {}
  }

  /* ---- Existing event: book_call_click on Calendly links (where present) ---- */
  function trackBookCall() {
    document.querySelectorAll('a[href*="calendly.com"]').forEach(function (el) {
      el.addEventListener('click', function () {
        var label = 'final_cta';
        if (el.closest('nav')) label = 'nav';
        else if (el.closest('.hero')) label = 'hero';
        track('book_call_click', { event_category: 'CTA', event_label: label });
      });
    });
  }

  /* ---- Mobile menu ---- */
  function mobileMenu() {
    var button = document.getElementById('burger');
    var menu = document.getElementById('mobile-menu');
    if (!button || !menu) return;
    function setOpen(open) {
      menu.classList.toggle('open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    button.addEventListener('click', function () { setOpen(!menu.classList.contains('open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) { setOpen(false); button.focus(); }
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  }

  /* ---- Contact: preselect the inquiry type from ?inquiry=, only if it matches an existing option ---- */
  function preselectInquiry() {
    var select = document.getElementById('inquiry-type');
    if (!select) return;
    var requested = new URLSearchParams(window.location.search).get('inquiry');
    var allowed = Array.prototype.map.call(select.options, function (o) { return o.value; });
    select.value = requested && allowed.indexOf(requested) !== -1 ? requested : 'general';
  }

  /* ---- Contact form (SI8-WEB-LAUNCH-2): validate, POST JSON to /api/contact-form, announce the outcome ---- */
  var CONTACT_FALLBACK = 'You can also email jd@superimmersive8.com or ';
  var CONTACT_ERRORS = {
    rate_limited: 'Too many messages have been sent from this connection. Please try again later.',
    retry: 'Please wait a few seconds and send again.',
    invalid_fields: 'Please check the highlighted fields.',
    not_configured: 'Online sending is not available right now.',
    generic: 'Your message could not be sent. Please try again.'
  };
  var EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

  function contactForm() {
    var form = document.getElementById('contact-card');
    if (!form || form.tagName !== 'FORM') return;
    var loadedAt = Date.now();
    var status = document.getElementById('contact-status');
    var sent = document.getElementById('contact-sent');
    var button = form.querySelector('button[type="submit"]');
    var fields = {
      name: { el: document.getElementById('contact-name'), ok: function (v) { return v.length > 0 && v.length <= 120; } },
      email: { el: document.getElementById('contact-email'), ok: function (v) { return v.length <= 254 && EMAIL_PATTERN.test(v); } },
      description: { el: document.getElementById('contact-description'), ok: function (v) { return v.length > 0 && v.length <= 4000; } }
    };
    function mark(name, invalid) {
      var f = fields[name];
      if (!f) return;
      f.el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      var err = document.getElementById(f.el.id + '-error');
      if (err) err.hidden = !invalid;
    }
    function showStatus(message, isError) {
      status.textContent = '';
      status.setAttribute('role', isError ? 'alert' : 'status');
      status.appendChild(document.createTextNode(message + (isError ? ' ' + CONTACT_FALLBACK : '')));
      if (isError) {
        var a = document.createElement('a');
        a.href = 'https://calendly.com/aipenguins/superimmersive8';
        a.textContent = 'book a call';
        status.appendChild(a);
        status.appendChild(document.createTextNode('.'));
      }
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var values = {};
      var firstInvalid = null;
      Object.keys(fields).forEach(function (name) {
        var v = fields[name].el.value.trim();
        values[name] = v;
        var bad = !fields[name].ok(v);
        mark(name, bad);
        if (bad && !firstInvalid) firstInvalid = fields[name].el;
      });
      if (firstInvalid) { showStatus(CONTACT_ERRORS.invalid_fields, false); firstInvalid.focus(); return; }
      var optIn = document.getElementById('contact-mailing-list');
      var payload = {
        name: values.name,
        email: values.email,
        inquiry: document.getElementById('inquiry-type').value,
        description: values.description,
        mailingList: !!(optIn && optIn.checked),
        website: document.getElementById('contact-website').value,
        formLoadedAt: loadedAt
      };
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      showStatus('Sending…', false);
      fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok && data.ok === true, data: data }; }); })
        .then(function (r) {
          if (r.ok) {
            form.hidden = true;
            sent.hidden = false;
            var heading = sent.querySelector('h2');
            if (heading) heading.focus();
            return;
          }
          var code = r.data && r.data.code;
          if (code === 'invalid_fields' && r.data.fields) r.data.fields.forEach(function (n) { mark(n, true); });
          showStatus(CONTACT_ERRORS[code] || CONTACT_ERRORS.generic, true);
        })
        .catch(function () { showStatus(CONTACT_ERRORS.generic, true); })
        .then(function () { button.disabled = false; button.removeAttribute('aria-busy'); });
    });
  }

  function init() { forwardCrcAttribution(); trackBookCall(); mobileMenu(); preselectInquiry(); contactForm(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
