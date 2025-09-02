// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

function parseHashParams(hash: string) {
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  return {
    access_token: h.get('access_token'),
    refresh_token: h.get('refresh_token'),
    error: h.get('error_description') || h.get('error'),
  };
}

export default function CallbackPage() {
  const supabase = createClient();
  const [status, setStatus] = useState('Processing…');
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {

    (async () => {
      const url = new URL(window.location.href);

      // 0) If we already have a session, don’t try to exchange again
      const { data: sess0 } = await supabase.auth.getSession();
      if (sess0.session) {
        setStatus('Session already active.');
      } else {
        // 1) Try implicit/hash first
        const { access_token, refresh_token, error: hashErr } = parseHashParams(url.hash);
        if (hashErr) {
          setStatus(`Auth error: ${hashErr}`);
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            setStatus(`Auth error: ${error.message}`);
          } else {
            setStatus('Signed in via implicit flow.');
          }
        } else if (url.searchParams.get('code')) {
          // 2) Try PKCE exchange only if we don't have a session yet
          const { error } = await supabase.auth.exchangeCodeForSession(url.toString());
          if (error) {
            // If the session gets established by other means, this can throw.
            // We’ll check again below and only surface the error if still unauthenticated.
            setStatus(`Auth exchange warning: ${error.message}`);
          } else {
            setStatus('Signed in via PKCE flow.');
          }
        } else {
          setStatus('No auth params found.');
        }
      }

      // 3) Re-check session and fetch role
      const { data: sess1 } = await supabase.auth.getSession();
      if (sess1.session) {
        const { data: appRole, error: rErr } = await supabase.rpc('app_role');
        if (!rErr) setRole((appRole as any) ?? null);
        setStatus((s) => (s.startsWith('Auth error') ? s : 'Done.'));
        // 4) Clean the URL (remove tokens/code)
        const clean = `${location.origin}/auth/callback`;
        window.history.replaceState({}, '', clean);
      } else {
        // Still no session -> leave whatever error/status we set earlier
      }
    })();
  }, [supabase]);

  return (
    <main style={{ maxWidth: 480, margin: '48px auto', display: 'grid', gap: 12 }}>
      <h1>Callback</h1>
      <div>{status}</div>
      <div>Your role: <b>{role ?? 'anon'}</b></div>
      <a href="/canvas">Go home</a>
    </main>
  );
}
