/**
 * Returns the backend base URL.
 *
 * Priority:
 * 1. NEXT_PUBLIC_BACKEND_URL  – set on Vercel as `/api/backend`
 * 2. At runtime on the browser (non-localhost) → relative /api/backend path
 * 3. Local development fallback → http://localhost:4000
 *
 * IMPORTANT: call this function INSIDE components / event handlers, never at
 * module-level, because module-level runs during SSR where window is undefined.
 */
export function getBackendUrl(): string {
  // Build-time or runtime env override (works in both SSR and browser)
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }

  // Browser runtime – detect if running on a real domain
  if (typeof window !== 'undefined') {
    const { hostname, protocol, host } = window.location;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
    if (!isLocal) {
      return `${protocol}//${host}/api/backend`;
    }
  }

  // Local development
  return 'http://localhost:4000';
}
