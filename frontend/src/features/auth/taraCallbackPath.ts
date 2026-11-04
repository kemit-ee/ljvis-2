/**
 * Which frontend path TARA redirects back to differs between environments:
 * some TARA clients are registered with `/auth/callback`, others with
 * `/auth/tara-callback`. The redirect_uri we send must match the registered
 * one exactly, so the path is runtime config served from `/config.json`
 * (written by the container entrypoint from TARA_CALLBACK_PATH).
 * Both paths are always handled by the SPA (see App.tsx).
 */
export const TARA_CALLBACK_PATHS = ['/auth/callback', '/auth/tara-callback'];
export const DEFAULT_TARA_CALLBACK_PATH = TARA_CALLBACK_PATHS[0];

export async function getTaraCallbackPath(): Promise<string> {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (!res.ok) return DEFAULT_TARA_CALLBACK_PATH;
    const cfg = await res.json();
    const path = cfg?.taraCallbackPath;
    return typeof path === 'string' && TARA_CALLBACK_PATHS.includes(path)
      ? path
      : DEFAULT_TARA_CALLBACK_PATH;
  } catch {
    // dev server / missing file (index.html fallback) → default
    return DEFAULT_TARA_CALLBACK_PATH;
  }
}
