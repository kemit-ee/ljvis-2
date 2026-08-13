import { useEffect, useRef } from 'react';

/**
 * Handles the OAuth2 callback from TARA.
 *
 * Flow (per TIM-on-Rust API-first design):
 * 1. TARA redirects browser here with ?code=...&state=...
 * 2. This component sends code+state to our Ruuter DSL
 * 3. Ruuter calls TIM /auth/callback/tara (exchange code → session)
 * 4. Ruuter calls TIM /jwt/custom/generate (session → JWT)
 * 5. Ruuter returns Set-Cookie: customJwtCookie=...
 * 6. Browser sets the HttpOnly cookie, we redirect to /
 */
export function AuthCallback() {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state) {
      window.location.href = '/';
      return;
    }

    fetch('/api/auth/oauth-callback', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`callback failed: ${res.status}`);
        window.location.href = '/';
      })
      .catch(() => {
        window.location.href = '/';
      });
  }, []);

  return <div>Autentimine...</div>;
}
