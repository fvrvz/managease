import { onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { setToken } from '@/api/client';
import { setAuthUser } from '@/stores/auth.store';

export function CallbackPage() {
  const navigate = useNavigate();

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userJson = urlParams.get('user');

    if (token) {
      localStorage.setItem('access_token', token);
      if (userJson) {
        try {
          const parsed = JSON.parse(decodeURIComponent(userJson));
          setAuthUser(parsed);
        } catch (e) {
          console.error('Failed to parse user payload', e);
        }
      }
      navigate('/projects');
    } else {
      navigate('/login');
    }
  });

  return (
    <div class="min-h-screen bg-slate-900 flex items-center justify-center">
      <div class="text-center text-white space-y-4">
        <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p class="text-sm font-medium text-slate-300">Completing SSO authentication...</p>
      </div>
    </div>
  );
}
export default CallbackPage;
