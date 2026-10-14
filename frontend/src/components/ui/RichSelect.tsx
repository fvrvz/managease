import { createSignal, Show, For, type JSX } from 'solid-js';
import { ChevronDown, Check } from 'lucide-solid';
import { useClickOutside } from '@/hooks/useClickOutside';
import { clsx } from 'clsx';

export interface RichSelectOption {
  value: string;
  label: string;
  icon?: JSX.Element;
  color?: string;
  badge?: string;
  description?: string;
}

interface RichSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: RichSelectOption[];
  label?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  class?: string;
  error?: string;
}

export function RichSelect(props: RichSelectProps) {
  const [open, setOpen] = createSignal(false);
  const containerRef = useClickOutside<HTMLDivElement>(() => setOpen(false));

  const selectedOption = () => props.options.find((opt) => opt.value === props.value);

  const handleSelect = (val: string) => {
    props.onChange(val);
    setOpen(false);
  };

  const isSmall = () => props.size === 'sm';

  return (
    <div
      ref={containerRef}
      class={clsx('relative flex flex-col gap-1', props.fullWidth && 'w-full', props.class)}
    >
      <Show when={props.label}>
        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {props.label}
        </label>
      </Show>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open())}
        class={clsx(
          'w-full flex items-center justify-between gap-2 bg-white border rounded-lg transition-all text-left outline-none',
          isSmall() ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
          open()
            ? 'border-blue-500 ring-2 ring-blue-100'
            : props.error
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-300 hover:border-slate-400 focus:border-blue-500',
        )}
      >
        <div class="flex items-center gap-2 min-w-0 truncate">
          <Show
            when={selectedOption()}
            fallback={<span class="text-slate-400 truncate">{props.placeholder ?? 'Select an option…'}</span>}
          >
            {(opt) => (
              <>
                <Show when={opt().icon}>
                  <span class="shrink-0 flex items-center justify-center">{opt().icon}</span>
                </Show>
                <Show when={opt().color && !opt().icon}>
                  <span
                    class="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ 'background-color': opt().color }}
                  />
                </Show>
                <span class="font-medium text-slate-800 truncate">{opt().label}</span>
                <Show when={opt().badge}>
                  <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                    {opt().badge}
                  </span>
                </Show>
              </>
            )}
          </Show>
        </div>

        {/* Chevron Icon - Perfectly aligned */}
        <ChevronDown
          class={clsx(
            'shrink-0 text-slate-400 transition-transform duration-200',
            isSmall() ? 'w-3.5 h-3.5' : 'w-4 h-4',
            open() && 'transform rotate-180 text-blue-600',
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <Show when={open()}>
        <div class="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 max-h-60 overflow-y-auto animate-in fade-in duration-100">
          <For each={props.options}>
            {(option) => {
              const isSelected = () => option.value === props.value;
              return (
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  class={clsx(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors',
                    isSelected() ? 'bg-blue-50/70 text-blue-900 font-medium' : 'text-slate-700 hover:bg-slate-50',
                    isSmall() ? 'text-xs' : 'text-sm',
                  )}
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <Show when={option.icon}>
                      <span class="shrink-0 flex items-center justify-center">{option.icon}</span>
                    </Show>
                    <Show when={option.color && !option.icon}>
                      <span
                        class="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ 'background-color': option.color }}
                      />
                    </Show>
                    <div class="min-w-0">
                      <div class="truncate font-medium">{option.label}</div>
                      <Show when={option.description}>
                        <div class="text-[10px] text-slate-400 truncate">{option.description}</div>
                      </Show>
                    </div>
                  </div>

                  <Show when={isSelected()}>
                    <Check class="w-4 h-4 text-blue-600 shrink-0" />
                  </Show>
                </button>
              );
            }}
          </For>
        </div>
      </Show>

      <Show when={props.error}>
        <p class="text-xs text-red-500">{props.error}</p>
      </Show>
    </div>
  );
}
