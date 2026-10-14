import { splitProps, type JSX } from 'solid-js';
import { clsx } from 'clsx';

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  color?: string;   // hex or tailwind class
  variant?: 'solid' | 'outline' | 'subtle';
}

export function Badge(props: BadgeProps) {
  const [local, rest] = splitProps(props, ['color', 'variant', 'class', 'children', 'style']);
  const variant = () => local.variant ?? 'subtle';

  const inlineStyle = () => {
    if (!local.color) return local.style as JSX.CSSProperties | undefined;
    if (variant() === 'solid') {
      return { 'background-color': local.color, color: '#fff', ...(local.style as object) };
    }
    if (variant() === 'outline') {
      return { 'border-color': local.color, color: local.color, ...(local.style as object) };
    }
    // subtle
    return { 'background-color': local.color + '22', color: local.color, ...(local.style as object) };
  };

  return (
    <span
      {...rest}
      style={inlineStyle()}
      class={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variant() === 'outline' && 'border',
        !local.color && 'bg-slate-100 text-slate-600',
        local.class,
      )}
    >
      {local.children}
    </span>
  );
}
