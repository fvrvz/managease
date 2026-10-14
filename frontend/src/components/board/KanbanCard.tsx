import { createSignal, Show, For } from 'solid-js';
import { clsx } from 'clsx';
import { IssueModal } from '@/components/issue/IssueModal';
import { PriorityBadge } from '@/components/issue/PriorityBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { Issue, IssueType } from '@/types';

interface KanbanCardProps {
  issue: Issue;
  projectKey: string;
  onDragStart?: (e: DragEvent, issue: Issue) => void;
}

const typeColors: Record<IssueType, string> = {
  story: '#22c55e',
  bug: '#ef4444',
  task: '#3b82f6',
  subtask: '#6b7280',
};

const typeIcons: Record<IssueType, string> = {
  story: '🔖',
  bug: '🐛',
  task: '✅',
  subtask: '⬡',
};

const priorityBorderColor: Record<string, string> = {
  highest: 'border-l-red-600',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-400',
  low: 'border-l-blue-400',
  lowest: 'border-l-gray-300',
};

export function KanbanCard(props: KanbanCardProps) {
  const [showModal, setShowModal] = createSignal(false);

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer?.setData('text/plain', props.issue.id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    props.onDragStart?.(e, props.issue);
    // Add ghost class after tick
    setTimeout(() => (e.target as HTMLElement).classList.add('drag-ghost'), 0);
  };

  const handleDragEnd = (e: DragEvent) => {
    (e.target as HTMLElement).classList.remove('drag-ghost');
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={() => setShowModal(true)}
        class={clsx(
          'kanban-card bg-white rounded-lg shadow-card p-3 cursor-pointer border-l-4 select-none',
          priorityBorderColor[props.issue.priority] ?? 'border-l-gray-300',
        )}
      >
        {/* Issue key & type */}
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-mono text-slate-400">{props.issue.key}</span>
          <span
            class="text-sm"
            title={props.issue.type}
            style={{ color: typeColors[props.issue.type] }}
          >
            {typeIcons[props.issue.type]}
          </span>
        </div>

        {/* Title */}
        <p class="text-sm font-medium text-slate-800 line-clamp-2 leading-snug mb-2">
          {props.issue.title}
        </p>

        {/* Bottom row */}
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 flex-wrap">
            {/* Epic badge */}
            <Show when={props.issue.epicId}>
              <Badge color="#6366f1" variant="subtle" class="text-[10px]">
                Epic
              </Badge>
            </Show>
            {/* Labels */}
            <For each={props.issue.labels?.slice(0, 2)}>
              {(label) => (
                <Badge color={label.color} variant="subtle" class="text-[10px]">
                  {label.name}
                </Badge>
              )}
            </For>
            {/* Story points */}
            <Show when={props.issue.storyPoints != null}>
              <span class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                {props.issue.storyPoints}
              </span>
            </Show>
          </div>

          {/* Assignee */}
          <Show when={props.issue.assignee}>
            <Avatar
              name={props.issue.assignee!.name}
              src={props.issue.assignee!.avatarUrl}
              size="xs"
            />
          </Show>
        </div>
      </div>

      <Show when={showModal()}>
        <IssueModal
          issue={props.issue}
          projectKey={props.projectKey}
          onClose={() => setShowModal(false)}
        />
      </Show>
    </>
  );
}
