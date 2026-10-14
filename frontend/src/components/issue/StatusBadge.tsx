import type { IssueStatus } from '@/types';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: IssueStatus;
  class?: string;
}

const statusConfig: Record<IssueStatus, { label: string; bg: string; text: string }> = {
  todo: {
    label: 'To Do',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
  },
  in_review: {
    label: 'In Review',
    bg: 'bg-violet-100',
    text: 'text-violet-700',
  },
  done: {
    label: 'Done',
    bg: 'bg-green-100',
    text: 'text-green-700',
  },
};

export function StatusBadge(props: StatusBadgeProps) {
  const cfg = () => statusConfig[props.status] ?? statusConfig.todo;

  return (
    <span
      class={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        cfg().bg,
        cfg().text,
        props.class,
      )}
    >
      {cfg().label}
    </span>
  );
}

export { statusConfig };
