import { createSignal, createContext, useContext, For, Show, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { clsx } from 'clsx';

// ── Types ─────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

// ── Context ───────────────────────────────────
const ToastContext = createContext<ToastContextValue>();

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ── Toast icons ───────────────────────────────
const icons: Record<ToastType, JSX.Element> = {
  success: (
    <svg class="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  error: (
    <svg class="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round" />
    </svg>
  ),
  warning: (
    <svg class="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" stroke-linecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke-linecap="round" />
    </svg>
  ),
  info: (
    <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" stroke-linecap="round" />
      <line x1="12" y1="8" x2="12.01" y2="8" stroke-linecap="round" />
    </svg>
  ),
};

const borderMap: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-yellow-500',
  info: 'border-l-blue-500',
};

// ── Provider ──────────────────────────────────
export function ToastProvider(props: { children: JSX.Element }) {
  const [toasts, setToasts] = createSignal<Toast[]>([]);

  const removeToast = (id: string) =>
    setToasts((ts) => ts.filter((t) => t.id !== id));

  const addToast = (message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, type, message, duration }]);
    setTimeout(() => removeToast(id), duration);
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {props.children}
      <Portal>
        <div class="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
          <For each={toasts()}>
            {(toast) => (
              <div
                class={clsx(
                  'toast-enter pointer-events-auto flex items-start gap-3 bg-white border border-slate-200 border-l-4 rounded-lg shadow-lg px-4 py-3 min-w-[280px] max-w-sm',
                  borderMap[toast.type],
                )}
              >
                <span class="mt-0.5 flex-shrink-0">{icons[toast.type]}</span>
                <p class="flex-1 text-sm text-slate-700">{toast.message}</p>
                <button
                  class="text-slate-400 hover:text-slate-600 transition-colors ml-2"
                  onClick={() => removeToast(toast.id)}
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
                  </svg>
                </button>
              </div>
            )}
          </For>
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}
