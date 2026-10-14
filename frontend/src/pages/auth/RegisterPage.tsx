import { createSignal, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { register, authLoading, authError } from '@/stores/auth.store';
import { UserPlus } from 'lucide-solid';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [localError, setLocalError] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLocalError(null);

    if (password() !== confirmPassword()) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await register(name(), email(), password());
      navigate('/projects');
    } catch {
      // error handled in store
    }
  };

  return (
    <div class="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div class="text-center mb-8">
          <div class="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
            ME
          </div>
          <h1 class="text-2xl font-bold text-slate-900">Create an Account</h1>
          <p class="text-sm text-slate-500 mt-1">Get started with ManagEase</p>
        </div>

        <Show when={localError() || authError()}>
          <div class="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
            {localError() || authError()}
          </div>
        </Show>

        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder="Jane Doe"
            />
          </div>

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
              minlength="6"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              minlength="6"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading()}
            class="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
          >
            <Show when={authLoading()} fallback={<UserPlus class="w-4 h-4" />}>
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </Show>
            <span>{authLoading() ? 'Creating account...' : 'Create Account'}</span>
          </button>
        </form>

        <div class="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <A href="/login" class="font-semibold text-blue-600 hover:underline">
            Sign in
          </A>
        </div>
      </div>
    </div>
  );
}
export default RegisterPage;
