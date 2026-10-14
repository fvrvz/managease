import { createSignal, For, Show } from 'solid-js';
import { clsx } from 'clsx';
import { Plus } from 'lucide-solid';
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

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const issueId = e.dataTransfer?.getData('text/plain');
    if (issueId) {
      props.onDrop(issueId, props.id);
    }
  };

  return (
    <div class="flex flex-col flex-1 min-w-[220px] max-w-sm">
      {/* Column header */}
      <div class="flex items-center gap-2 mb-3 px-1">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ 'background-color': props.color }} />
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">{props.title}</h3>
        <span class="ml-auto bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-full px-2 py-0.5">
          {props.issues.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        class={clsx(
          'flex-1 rounded-xl p-2.5 flex flex-col gap-2.5 min-h-[160px] transition-all duration-150 border-2',
          dragOver()
            ? 'bg-blue-50/60 border-blue-400 border-dashed ring-4 ring-blue-100'
            : 'bg-slate-100/80 border-transparent',
        )}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
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
          <div class="flex-1 flex items-center justify-center min-h-[80px]">
            <p class="text-xs text-slate-400 italic">Drop issues here</p>
          </div>
        </Show>
      </div>

      {/* Add issue */}
      <button
        type="button"
        onClick={() => props.onAddIssue(props.id)}
        class="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Add issue</span>
      </button>
    </div>
  );
}
