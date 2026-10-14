import { createSignal, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { login, authLoading, authError } from '@/stores/auth.store';
import { ShieldCheck, LogIn, KeyRound } from 'lucide-solid';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal('admin@managease.local');
  const [password, setPassword] = createSignal('password123');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    try {
      await login(email(), password());
      navigate('/projects');
    } catch {
      // error handled in store
    }
  };

  const handleOidcLogin = () => {
    // Redirects to backend OIDC OAuth endpoint
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/auth/oidc/callback`;
  };

  return (
    <div class="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        {/* Logo / Header */}
        <div class="text-center mb-8">
          <div class="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
            ME
          </div>
          <h1 class="text-2xl font-bold text-slate-900">Sign in to ManagEase</h1>
          <p class="text-sm text-slate-500 mt-1">Jira-style agile planning & execution</p>
        </div>

        {/* Error message */}
        <Show when={authError()}>
          <div class="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
            {authError()}
          </div>
        </Show>

        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading()}
            class="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
          >
            <Show when={authLoading()} fallback={<LogIn class="w-4 h-4" />}>
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </Show>
            <span>{authLoading() ? 'Signing in...' : 'Sign in'}</span>
          </button>
        </form>

        {/* Enterprise SSO Divider */}
        <div class="my-6 flex items-center gap-3">
          <div class="h-px bg-slate-200 flex-1" />
          <span class="text-xs text-slate-400 font-medium uppercase tracking-wider">or</span>
          <div class="h-px bg-slate-200 flex-1" />
        </div>

        {/* SSO Button */}
        <button
          type="button"
          onClick={handleOidcLogin}
          class="w-full py-2.5 px-4 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium text-sm transition flex items-center justify-center gap-2"
        >
          <ShieldCheck class="w-4 h-4 text-blue-600" />
          <span>Sign in with Enterprise SSO (OIDC)</span>
        </button>

        {/* Quick Demo Credentials */}
        <div class="mt-6 p-3 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2">
          <KeyRound class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span class="font-bold">Default Demo Account:</span>
            <div class="text-blue-800 font-mono mt-0.5">admin@managease.local / password123</div>
          </div>
        </div>

        <div class="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <A href="/register" class="font-semibold text-blue-600 hover:underline">
            Sign up
          </A>
        </div>
      </div>
    </div>
  );
}
export default LoginPage;

