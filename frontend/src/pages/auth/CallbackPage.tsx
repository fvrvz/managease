import { createSignal, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { setToken } from '@/api/client';
import { setAuthUser } from '@/stores/auth.store';
import { handleOidcCallback } from '@/services/oidc.service';
import { ShieldAlert, ArrowLeft } from 'lucide-solid';
import type { User } from '@/types';

export function CallbackPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    // Check for query or hash error from IdP
    const queryError = urlParams.get('error') || hashParams.get('error');
    if (queryError) {
      const description = urlParams.get('error_description') || hashParams.get('error_description') || queryError;
      setErrorMessage(decodeURIComponent(description));
      return;
    }

    // 1. Direct Backend-mediated OAuth / OmniAuth token (?token=...&user=...)
    const token = urlParams.get('token');
    const userJson = urlParams.get('user');

    if (token) {
      setToken(token);
      if (userJson) {
        try {
          const parsed = JSON.parse(decodeURIComponent(userJson)) as User;
          setAuthUser(parsed);
        } catch (e) {
          console.error('Failed to parse user payload', e);
        }
      }
      navigate('/projects');
      return;
    }

    // 2. Client-side OIDC Authorization Code Flow with PKCE (?code=...&state=...)
    const code = urlParams.get('code') || hashParams.get('code');
    const state = urlParams.get('state') || hashParams.get('state');

    if (code && state) {
      try {
        const oidcUser = await handleOidcCallback();
        if (oidcUser && oidcUser.access_token) {
          setToken(oidcUser.access_token);
          const profile = oidcUser.profile || {};
          const fallbackName =
            (profile.name as string) ||
            (profile.preferred_username as string) ||
            ((profile.email as string)?.split('@')[0]) ||
            'SSO User';

          const appUser: User = {
            id: (profile.sub as string) || String(Date.now()),
            name: fallbackName,
            email: (profile.email as string) || 'user@sso.local',
            role: 'member',
            avatarUrl: (profile.picture as string) || undefined,
            createdAt: new Date().toISOString(),
          };

          setAuthUser(appUser);
          navigate('/projects');
          return;
        }
      } catch (err: unknown) {
        console.error('OIDC callback failed', err);
        const msg = err instanceof Error ? err.message : 'Failed to complete OIDC sign-in with Identity Provider.';
        setErrorMessage(msg);
        return;
      }
    }

    // Neither token nor OIDC response was present
    navigate('/login');
  });

  return (
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Show
        when={errorMessage()}
        fallback={
          <div class="text-center text-white space-y-4">
            <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p class="text-sm font-medium text-slate-300">Completing SSO authentication...</p>
          </div>
        }
      >
        <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-red-100 text-center space-y-5">
          <div class="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900">Authentication Failed</h2>
            <p class="text-xs text-red-600 mt-2 bg-red-50 p-3 rounded-lg border border-red-200 text-left font-mono break-words">
              {errorMessage()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            class="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition flex items-center justify-center gap-2"
          >
            <ArrowLeft class="w-4 h-4" />
            <span>Return to Sign In</span>
          </button>
        </div>
      </Show>
    </div>
  );
}
export default CallbackPage;
