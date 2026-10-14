import { Show, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { clsx } from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: JSX.Element;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-5xl',
};

export function Modal(props: ModalProps) {
  const size = () => props.size ?? 'md';

  const handleBackdrop = (e: MouseEvent) => {
    if (e.target === e.currentTarget) props.onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose();
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleBackdrop}
          onKeyDown={handleKeyDown}
        >
          <div
            class={clsx(
              'relative w-full bg-white rounded-xl shadow-modal overflow-hidden',
              sizeMap[size()],
            )}
            role="dialog"
            aria-modal="true"
          >
            {props.title && (
              <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 class="text-base font-semibold text-slate-900">{props.title}</h2>
                <button
                  onClick={props.onClose}
                  class="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            )}
            <div class="overflow-y-auto max-h-[85vh]">{props.children}</div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
