import { createSignal, Show, For, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useClickOutside } from '@/hooks/useClickOutside';
import { clsx } from 'clsx';

export interface DropdownItem {
  label: string;
  icon?: JSX.Element;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: JSX.Element;
  items: DropdownItem[];
  align?: 'left' | 'right';
  class?: string;
}

export function Dropdown(props: DropdownProps) {
  const [open, setOpen] = createSignal(false);
  const [pos, setPos] = createSignal({ top: 0, left: 0, right: 0 });
  let triggerRef!: HTMLDivElement;

  const toggle = () => {
    if (!open()) {
      const rect = triggerRef.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        right: window.innerWidth - rect.right - window.scrollX,
      });
    }
    setOpen((v) => !v);
  };

  const containerRef = useClickOutside<HTMLDivElement>(() => setOpen(false));

  return (
    <div class={clsx('relative inline-block', props.class)} ref={containerRef}>
      <div ref={triggerRef!} onClick={toggle} class="cursor-pointer">
        {props.trigger}
      </div>
      <Show when={open()}>
        <Portal>
          <div
            class="fixed z-[9998] bg-white border border-slate-200 rounded-xl shadow-modal py-1 min-w-[160px]"
            style={{
              top: `${pos().top}px`,
              ...(props.align === 'right'
                ? { right: `${pos().right}px` }
                : { left: `${pos().left}px` }),
            }}
          >
            <For each={props.items}>
              {(item) => (
                <Show
                  when={!item.divider}
                  fallback={<hr class="my-1 border-slate-100" />}
                >
                  <button
                    disabled={item.disabled}
                    class={clsx(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                      item.danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-slate-700 hover:bg-slate-50',
                      item.disabled && 'opacity-50 cursor-not-allowed',
                    )}
                    onClick={() => {
                      item.onClick?.();
                      setOpen(false);
                    }}
                  >
                    {item.icon && (
                      <span class="w-4 h-4 flex-shrink-0">{item.icon}</span>
                    )}
                    {item.label}
                  </button>
                </Show>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
