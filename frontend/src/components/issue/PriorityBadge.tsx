import type { IssuePriority } from '@/types';

interface PriorityBadgeProps {
  priority: IssuePriority;
  showLabel?: boolean;
}

const priorityConfig: Record<IssuePriority, { label: string; color: string; icon: string }> = {
  highest: {
    label: 'Highest',
    color: '#dc2626',
    icon: '↑↑',
  },
  high: {
    label: 'High',
    color: '#f97316',
    icon: '↑',
  },
  medium: {
    label: 'Medium',
    color: '#eab308',
    icon: '→',
  },
  low: {
    label: 'Low',
    color: '#60a5fa',
    icon: '↓',
  },
  lowest: {
    label: 'Lowest',
    color: '#9ca3af',
    icon: '↓↓',
  },
};

export function PriorityBadge(props: PriorityBadgeProps) {
  const cfg = () => priorityConfig[props.priority];

  return (
    <span
      class="inline-flex items-center gap-1 text-xs font-bold"
      style={{ color: cfg().color }}
      title={cfg().label}
    >
      <span class="font-mono leading-none">{cfg().icon}</span>
      {props.showLabel && <span>{cfg().label}</span>}
    </span>
  );
}

export { priorityConfig };
