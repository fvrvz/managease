import { createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { KanbanColumn } from './KanbanColumn';
import { IssueForm } from '@/components/issue/IssueForm';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { ColumnSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  issues,
  sprints,
  epics,
  fetchIssues,
  moveIssueOptimistic,
  projectLoading,
} from '@/stores/project.store';
import type { Issue, IssueStatus, Sprint } from '@/types';

interface KanbanBoardProps {
  projectId: string;
  projectKey: string;
}

const COLUMNS: { id: IssueStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: '#94a3b8' },
  { id: 'in_progress', title: 'In Progress', color: '#3b82f6' },
  { id: 'in_review', title: 'In Review', color: '#8b5cf6' },
  { id: 'done', title: 'Done', color: '#22c55e' },
];

export function KanbanBoard(props: KanbanBoardProps) {
  const toast = useToast();
  const [activeSprint, setActiveSprint] = createSignal<Sprint | null>(null);
  const [draggingIssue, setDraggingIssue] = createSignal<Issue | null>(null);
  const [showForm, setShowForm] = createSignal(false);
  const [defaultStatus, setDefaultStatus] = createSignal<IssueStatus>('todo');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterAssignee, setFilterAssignee] = createSignal<string | null>(null);
  const [filterPriority, setFilterPriority] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    const active = sprints.find((s) => s.status === 'active');
    if (active) {
      setActiveSprint(active);
      await fetchIssues(props.projectId, active.id);
    } else {
      await fetchIssues(props.projectId);
    }
    setLoading(false);
  });

  const filteredIssues = createMemo(() => {
    let list = [...issues];
    const q = searchQuery().toLowerCase();
    if (q) list = list.filter((i) => i.title.toLowerCase().includes(q) || i.key.toLowerCase().includes(q));
    if (filterAssignee()) list = list.filter((i) => i.assigneeId === filterAssignee());
    if (filterPriority()) list = list.filter((i) => i.priority === filterPriority());
    return list;
  });

  const issuesForColumn = (status: IssueStatus) =>
    filteredIssues()
      .filter((i) => i.status === status)
      .sort((a, b) => a.position - b.position);

  const handleDragStart = (_: DragEvent, issue: Issue) => {
    setDraggingIssue(issue);
  };

  const handleDrop = async (issueId: string, newStatus: IssueStatus) => {
    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.status === newStatus) return;
    try {
      await moveIssueOptimistic(props.projectId, issueId, newStatus);
    } catch {
      toast.addToast('Failed to move issue', 'error');
    }
    setDraggingIssue(null);
  };

  const handleAddIssue = (status: IssueStatus) => {
    setDefaultStatus(status);
    setShowForm(true);
  };

  const activeSprints = () => sprints.filter((s) => s.status === 'active' || s.status === 'planning');

  return (
    <div class="flex flex-col h-full">
      {/* Toolbar */}
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        {/* Sprint selector */}
        <Show when={activeSprints().length > 0}>
          <select
            class="text-sm border border-slate-300 rounded-md px-3 py-1.5 outline-none bg-white focus:border-indigo-400"
            value={activeSprint()?.id ?? ''}
            onChange={(e) => {
              const s = sprints.find((sp) => sp.id === e.currentTarget.value);
              setActiveSprint(s ?? null);
              fetchIssues(props.projectId, e.currentTarget.value || undefined);
            }}
          >
            <option value="">All Issues</option>
            <For each={activeSprints()}>
              {(s) => <option value={s.id}>{s.name}</option>}
            </For>
          </select>
        </Show>

        {/* Search */}
        <div class="relative">
          <svg class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" stroke-linecap="round" />
          </svg>
          <input
            class="pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-md outline-none focus:border-indigo-400 bg-white w-48"
            placeholder="Search issues…"
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </div>

        {/* Priority filter */}
        <select
          class="text-sm border border-slate-300 rounded-md px-2 py-1.5 outline-none bg-white focus:border-indigo-400"
          value={filterPriority() ?? ''}
          onChange={(e) => setFilterPriority(e.currentTarget.value || null)}
        >
          <option value="">All Priorities</option>
          <option value="highest">Highest</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="lowest">Lowest</option>
        </select>

        {/* Create button */}
        <button
          onClick={() => { setDefaultStatus('todo'); setShowForm(true); }}
          class="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white text-sm font-semibold rounded-md hover:bg-indigo-800 transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          Create
        </button>
      </div>

      {/* Board columns */}
      <div class="flex gap-4 flex-1 overflow-x-auto pb-4">
        <Show
          when={!loading()}
          fallback={
            <For each={COLUMNS}>
              {() => <ColumnSkeleton />}
            </For>
          }
        >
          <For each={COLUMNS}>
            {(col) => (
              <KanbanColumn
                id={col.id}
                title={col.title}
                color={col.color}
                issues={issuesForColumn(col.id)}
                projectKey={props.projectKey}
                onDrop={handleDrop}
                onAddIssue={handleAddIssue}
                onDragStart={handleDragStart}
              />
            )}
          </For>
        </Show>
      </div>

      <IssueForm
        open={showForm()}
        onClose={() => setShowForm(false)}
        projectId={props.projectId}
        sprintId={activeSprint()?.id}
        defaultStatus={defaultStatus()}
      />
    </div>
  );
}
