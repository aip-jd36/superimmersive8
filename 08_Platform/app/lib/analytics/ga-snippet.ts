/**
 * GA4 inline bootstrap for the creator portal's root layout.
 *
 * Unchanged for every page, except one guard (CR-V2-WORK-UAT-HARNESS-2): on
 * the public UAT harness (`/uat` and `/uat/...`) it sets Google's documented
 * opt-out flag `window['ga-disable-<ID>'] = true` BEFORE `config`, so no hit is
 * sent for UAT traffic. All other paths run exactly the same calls as before.
 */

export const GA_MEASUREMENT_ID = 'G-628BLE9N15'
/** Paths whose traffic is excluded from GA4 measurement. */
export const GA_EXCLUDED_PATH_PREFIX = '/uat'

export function isGaExcludedPath(pathname: string): boolean {
  return pathname === GA_EXCLUDED_PATH_PREFIX || pathname.startsWith(`${GA_EXCLUDED_PATH_PREFIX}/`)
}

export const GA_INLINE_SNIPPET = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          if (location.pathname === '${GA_EXCLUDED_PATH_PREFIX}' || location.pathname.indexOf('${GA_EXCLUDED_PATH_PREFIX}/') === 0) { window['ga-disable-${GA_MEASUREMENT_ID}'] = true; }
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `
