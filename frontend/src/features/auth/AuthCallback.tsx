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
 * 6. If the user clicked "Kodanikule" (intent=citizen), we immediately
 *    switch the active role to citizen-self so they land in the right view.
 * 7. Browser sets the HttpOnly cookie, we redirect to /
 */

/** Switch active role immediately after a fresh login.
 *  Only called when intent is 'citizen'; officer is the default for
 *  users with an officer account, and citizen-self is the fallback
 *  for everyone else, so no explicit switch is needed for 'officer'. */
async function switchToCitizenSelf(): Promise<void> {
  await fetch('/api/auth/representation/switch', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'citizen-self' }),
  });
  // Ignore errors — if the switch fails the user still lands in
  // whatever the default role is (officer or citizen-self).
}

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

    const intent = sessionStorage.getItem('loginIntent');
    sessionStorage.removeItem('loginIntent');

    fetch('/api/auth/oauth-callback', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`callback failed: ${res.status}`);
        if (intent === 'citizen') {
          await switchToCitizenSelf();
        }
        window.location.href = '/';
      })
      .catch(() => {
        window.location.href = '/';
      });
  }, []);

  return <div>Autentimine...</div>;
}
