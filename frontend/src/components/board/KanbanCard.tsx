import { createSignal, Show, For } from 'solid-js';
import { clsx } from 'clsx';
import { Bookmark, Bug, CheckSquare, Layers } from 'lucide-solid';
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

const priorityBorderColor: Record<string, string> = {
  highest: 'border-l-red-600',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-400',
  low: 'border-l-blue-400',
  lowest: 'border-l-slate-300',
};

export function KanbanCard(props: KanbanCardProps) {
  const [showModal, setShowModal] = createSignal(false);

  const displayKey = () =>
    props.issue.key || (props.projectKey ? `${props.projectKey}-${props.issue.number || props.issue.id}` : `#${props.issue.id}`);

  const handleDragStart = (e: DragEvent) => {
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', String(props.issue.id));
      e.dataTransfer.effectAllowed = 'move';
    }
    props.onDragStart?.(e, props.issue);
    setTimeout(() => {
      const target = e.target as HTMLElement;
      if (target) target.classList.add('drag-ghost');
    }, 0);
  };

  const handleDragEnd = (e: DragEvent) => {
    const target = e.target as HTMLElement;
    if (target) target.classList.remove('drag-ghost');
  };

  const renderTypeIcon = (type: IssueType) => {
    switch (type) {
      case 'story':
        return <Bookmark class="w-3.5 h-3.5 text-emerald-600 fill-emerald-500/20 shrink-0" />;
      case 'bug':
        return <Bug class="w-3.5 h-3.5 text-red-600 fill-red-500/20 shrink-0" />;
      case 'subtask':
        return <Layers class="w-3.5 h-3.5 text-slate-500 fill-slate-500/20 shrink-0" />;
      default:
        return <CheckSquare class="w-3.5 h-3.5 text-blue-600 fill-blue-500/20 shrink-0" />;
    }
  };

  return (
    <>
      <div
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={() => setShowModal(true)}
        class={clsx(
          'kanban-card bg-white rounded-lg shadow-card p-3 cursor-grab active:cursor-grabbing border-l-4 select-none hover:shadow-md transition-shadow group',
          priorityBorderColor[props.issue.priority] ?? 'border-l-slate-300',
        )}
      >
        {/* Issue key & type */}
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-1.5">
            {renderTypeIcon(props.issue.type)}
            <span class="text-xs font-mono font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
              {displayKey()}
            </span>
          </div>
          <PriorityBadge priority={props.issue.priority} />
        </div>

        {/* Title */}
        <p class="text-sm font-medium text-slate-800 line-clamp-2 leading-snug mb-2">
          {props.issue.title}
        </p>

        {/* Bottom row */}
        <div class="flex items-center justify-between mt-auto pt-1">
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
              <span class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
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
