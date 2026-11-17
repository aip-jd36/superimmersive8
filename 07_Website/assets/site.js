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

  function init() { forwardCrcAttribution(); trackBookCall(); mobileMenu(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
