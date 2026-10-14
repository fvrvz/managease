import { Show } from 'solid-js';
import { clsx } from 'clsx';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  class?: string;
}

const sizeMap = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const colorMap = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-pink-500',
];

const getColor = (name = 'U'): string => {
  const idx = name.charCodeAt(0) % colorMap.length;
  return colorMap[idx];
};

const initials = (name = 'U'): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export function Avatar(props: AvatarProps) {
  const size = () => props.size ?? 'md';

  return (
    <div
      class={clsx(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden font-semibold text-white flex-shrink-0 select-none',
        sizeMap[size()],
        !props.src && getColor(props.name),
        props.class,
      )}
      title={props.name}
    >
      <Show when={props.src} fallback={<span>{initials(props.name)}</span>}>
        <img src={props.src} alt={props.name ?? 'avatar'} class="w-full h-full object-cover" />
      </Show>
    </div>
  );
}
