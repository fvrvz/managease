import { createSignal, For, Show } from 'solid-js';
import { clsx } from 'clsx';
import { KanbanCard } from './KanbanCard';
import type { Issue, IssueStatus } from '@/types';

interface KanbanColumnProps {
  id: IssueStatus;
  title: string;
  color: string;
  issues: Issue[];
  projectKey: string;
  onDrop: (issueId: string, newStatus: IssueStatus) => void;
  onAddIssue: (status: IssueStatus) => void;
  onDragStart: (e: DragEvent, issue: Issue) => void;
}

export function KanbanColumn(props: KanbanColumnProps) {
  const [dragOver, setDragOver] = createSignal(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    // Only reset if leaving the column container itself
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const issueId = e.dataTransfer?.getData('text/plain');
    if (issueId) props.onDrop(issueId, props.id);
  };

  return (
    <div class="flex flex-col w-64 flex-shrink-0">
      {/* Column header */}
      <div class="flex items-center gap-2 mb-3 px-1">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ 'background-color': props.color }} />
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-600">{props.title}</h3>
        <span class="ml-auto bg-slate-200 text-slate-600 text-xs font-semibold rounded-full px-2 py-0.5">
          {props.issues.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        class={clsx(
          'flex-1 rounded-xl p-2 flex flex-col gap-2 min-h-[120px] transition-colors duration-150',
          dragOver() ? 'drop-active' : 'bg-slate-100',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <For each={props.issues}>
          {(issue) => (
            <KanbanCard
              issue={issue}
              projectKey={props.projectKey}
              onDragStart={props.onDragStart}
            />
          )}
        </For>

        <Show when={props.issues.length === 0 && !dragOver()}>
          <div class="flex-1 flex items-center justify-center">
            <p class="text-xs text-slate-400 italic">Drop issues here</p>
          </div>
        </Show>
      </div>

      {/* Add issue */}
      <button
        onClick={() => props.onAddIssue(props.id)}
        class="mt-2 flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Add issue
      </button>
    </div>
  );
}
