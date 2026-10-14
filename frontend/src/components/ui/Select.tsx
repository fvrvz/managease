import { splitProps, For, type JSX } from 'solid-js';
import { ChevronDown } from 'lucide-solid';
import { clsx } from 'clsx';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, [
    'label',
    'error',
    'options',
    'placeholder',
    'fullWidth',
    'class',
    'id',
  ]);
  const id = local.id ?? `select-${Math.random().toString(36).slice(2)}`;

  return (
    <div class={clsx('flex flex-col gap-1', local.fullWidth && 'w-full')}>
      {local.label && (
        <label for={id} class="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {local.label}
        </label>
      )}
      <div class="relative w-full">
        <select
          id={id}
          {...rest}
          class={clsx(
            'block w-full px-3 py-2 text-sm bg-white border rounded-lg outline-none appearance-none cursor-pointer pr-9 transition-colors',
            local.error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-400',
            local.class,
          )}
        >
          {local.placeholder && (
            <option value="" disabled>
              {local.placeholder}
            </option>
          )}
          <For each={local.options}>
            {(opt) => <option value={opt.value}>{opt.label}</option>}
          </For>
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
          <ChevronDown class="w-4 h-4" />
        </div>
      </div>
      {local.error && <p class="text-xs text-red-500">{local.error}</p>}
    </div>
  );
}
