import { splitProps, For, type JSX } from 'solid-js';
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
      <select
        id={id}
        {...rest}
        class={clsx(
          'block px-3 py-2 text-sm bg-white border rounded-md outline-none appearance-none bg-no-repeat cursor-pointer transition-colors',
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3E%3Cpath fill=%27none%27 stroke=%27%23475569%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m2 5 6 6 6-6%27/%3E%3C/svg%3E")]',
          'bg-[length:16px] bg-[right_10px_center] pr-9',
          local.error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100',
          local.fullWidth && 'w-full',
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
      {local.error && <p class="text-xs text-red-500">{local.error}</p>}
    </div>
  );
}
