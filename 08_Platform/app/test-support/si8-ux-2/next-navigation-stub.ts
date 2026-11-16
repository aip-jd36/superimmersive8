/** SI8-UX-2 harness: the one `next/navigation` export the client uses. `refresh` records the call; nothing navigates. */
export function useRouter() {
  return { refresh: () => { (window as any).__ux2?.requests.push({ method: 'ROUTER', path: 'refresh', body: null }) }, push: () => undefined, replace: () => undefined }
}
