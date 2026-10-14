import { JSX } from 'solid-js';
import {
  ChevronsUp,
  ChevronUp,
  Minus,
  ChevronDown,
  ChevronsDown,
} from 'lucide-solid';
import type { IssuePriority } from '@/types';

interface PriorityBadgeProps {
  priority: IssuePriority;
  showLabel?: boolean;
}

export const priorityConfig: Record<
  IssuePriority,
  { label: string; color: string; icon: () => JSX.Element }
> = {
  highest: {
    label: 'Highest',
    color: '#dc2626',
    icon: () => <ChevronsUp class="w-3.5 h-3.5 text-red-600 stroke-[2.5]" />,
  },
  high: {
    label: 'High',
    color: '#f97316',
    icon: () => <ChevronUp class="w-3.5 h-3.5 text-orange-500 stroke-[2.5]" />,
  },
  medium: {
    label: 'Medium',
    color: '#eab308',
    icon: () => <Minus class="w-3.5 h-3.5 text-yellow-500 stroke-[2.5]" />,
  },
  low: {
    label: 'Low',
    color: '#3b82f6',
    icon: () => <ChevronDown class="w-3.5 h-3.5 text-blue-500 stroke-[2.5]" />,
  },
  lowest: {
    label: 'Lowest',
    color: '#94a3b8',
    icon: () => <ChevronsDown class="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />,
  },
};

export function PriorityBadge(props: PriorityBadgeProps) {
  const cfg = () => priorityConfig[props.priority] || priorityConfig.medium;

  return (
    <span
      class="inline-flex items-center gap-1.5 text-xs font-semibold"
      style={{ color: cfg().color }}
      title={cfg().label}
    >
      <span class="inline-flex items-center justify-center">{cfg().icon()}</span>
      {props.showLabel && <span>{cfg().label}</span>}
    </span>
  );
}
