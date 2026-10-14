import { splitProps, type JSX } from 'solid-js';
import { clsx } from 'clsx';

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ['label', 'error', 'hint', 'fullWidth', 'class', 'id']);
  const id = local.id ?? `input-${Math.random().toString(36).slice(2)}`;

  return (
    <div class={clsx('flex flex-col gap-1', local.fullWidth && 'w-full')}>
      {local.label && (
        <label for={id} class="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {local.label}
        </label>
      )}
      <input
        id={id}
        {...rest}
        class={clsx(
          'block px-3 py-2 text-sm bg-white border rounded-md placeholder:text-slate-400 transition-colors',
          local.error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100',
          'outline-none',
          local.fullWidth && 'w-full',
          local.class,
        )}
      />
      {local.error && <p class="text-xs text-red-500">{local.error}</p>}
      {!local.error && local.hint && <p class="text-xs text-slate-400">{local.hint}</p>}
    </div>
  );
}
