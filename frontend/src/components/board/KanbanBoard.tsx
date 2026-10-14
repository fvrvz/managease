import { createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { Search, Plus, Calendar, Filter, ChevronsUp, ChevronUp, Minus, ChevronDown, ChevronsDown } from 'lucide-solid';
import { KanbanColumn } from './KanbanColumn';
import { IssueForm } from '@/components/issue/IssueForm';
import { RichSelect, RichSelectOption } from '@/components/ui/RichSelect';
import { ColumnSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  issues,
  sprints,
  fetchIssues,
  moveIssueOptimistic,
  globalSearchQuery,
  setGlobalSearchQuery,
  currentProject,
} from '@/stores/project.store';
import type { Issue, IssueStatus, Sprint, WorkflowStatus } from '@/types';

interface KanbanBoardProps {
  projectId: string;
  projectKey: string;
}

const DEFAULT_COLUMNS: { id: IssueStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: '#94a3b8' },
  { id: 'in_progress', title: 'In Progress', color: '#3b82f6' },
  { id: 'in_review', title: 'In Review', color: '#8b5cf6' },
  { id: 'done', title: 'Done', color: '#22c55e' },
];

const priorityFilterOptions: RichSelectOption[] = [
  { value: '', label: 'All Priorities' },
  {
    value: 'highest',
    label: 'Highest',
    icon: <ChevronsUp class="w-3.5 h-3.5 text-red-600 stroke-[2.5]" />,
  },
  {
    value: 'high',
    label: 'High',
    icon: <ChevronUp class="w-3.5 h-3.5 text-orange-500 stroke-[2.5]" />,
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: <Minus class="w-3.5 h-3.5 text-yellow-500 stroke-[2.5]" />,
  },
  {
    value: 'low',
    label: 'Low',
    icon: <ChevronDown class="w-3.5 h-3.5 text-blue-500 stroke-[2.5]" />,
  },
  {
    value: 'lowest',
    label: 'Lowest',
    icon: <ChevronsDown class="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />,
  },
];

export function KanbanBoard(props: KanbanBoardProps) {
  const toast = useToast();
  const [activeSprint, setActiveSprint] = createSignal<Sprint | null>(null);
  const [showForm, setShowForm] = createSignal(false);
  const [defaultStatus, setDefaultStatus] = createSignal<IssueStatus>('todo');
  const [filterAssignee, setFilterAssignee] = createSignal<string | null>(null);
  const [filterPriority, setFilterPriority] = createSignal<string>('');
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

  const columns = createMemo(() => {
    const custom = currentProject()?.workflowStatuses;
    if (custom && custom.length > 0) {
      return custom.map((c) => ({
        id: c.id as IssueStatus,
        title: c.title,
        color: c.color,
      }));
    }
    return DEFAULT_COLUMNS;
  });

  const filteredIssues = createMemo(() => {
    let list = [...issues];
    const q = (globalSearchQuery() || '').toLowerCase().trim();
    if (q) {
      list = list.filter(
        (i) =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.key && i.key.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q)),
      );
    }
    if (filterAssignee()) list = list.filter((i) => i.assigneeId === filterAssignee());
    if (filterPriority()) list = list.filter((i) => i.priority === filterPriority());
    return list;
  });

  const issuesForColumn = (status: IssueStatus) =>
    filteredIssues()
      .filter((i) => i.status === status)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

  const handleDrop = async (issueId: string, newStatus: IssueStatus) => {
    const issue = issues.find((i) => String(i.id) === String(issueId));
    if (!issue || issue.status === newStatus) return;
    try {
      await moveIssueOptimistic(props.projectId, issueId, newStatus, activeSprint()?.id);
    } catch {
      toast.addToast('Failed to move issue', 'error');
    }
  };

  const handleAddIssue = (status: IssueStatus) => {
    setDefaultStatus(status || 'todo');
    setShowForm(true);
  };

  const activeSprints = () => sprints.filter((s) => s.status === 'active' || s.status === 'planning');

  const sprintSelectOptions = (): RichSelectOption[] => [
    { value: '', label: 'All Issues' },
    ...activeSprints().map((s) => ({
      value: s.id,
      label: s.name,
      badge: s.status.toUpperCase(),
      icon: <Calendar class="w-3.5 h-3.5 text-blue-500" />,
    })),
  ];

  return (
    <div class="flex flex-col h-full">
      {/* Toolbar */}
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        {/* Sprint selector with RichSelect */}
        <Show when={activeSprints().length > 0}>
          <div class="w-52">
            <RichSelect
              size="sm"
              options={sprintSelectOptions()}
              value={activeSprint()?.id ?? ''}
              onChange={(val) => {
                const s = sprints.find((sp) => sp.id === val);
                setActiveSprint(s ?? null);
                fetchIssues(props.projectId, val || undefined);
              }}
            />
          </div>
        </Show>

        {/* Search */}
        <div class="relative w-56">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            class="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white placeholder-slate-400 transition"
            placeholder="Search issues, keys…"
            value={globalSearchQuery()}
            onInput={(e) => setGlobalSearchQuery(e.currentTarget.value)}
          />
        </div>

        {/* Priority filter with RichSelect */}
        <div class="w-44">
          <RichSelect
            size="sm"
            options={priorityFilterOptions}
            value={filterPriority()}
            onChange={setFilterPriority}
          />
        </div>

        {/* Create button */}
        <button
          onClick={() => handleAddIssue('todo')}
          class="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus class="w-4 h-4" />
          <span>Add issue</span>
        </button>
      </div>

      {/* Columns Container */}
      <div class="flex gap-4 flex-1 overflow-x-auto pb-4 items-start">
        <Show
          when={!loading()}
          fallback={
            <For each={columns()}>
              {() => <ColumnSkeleton />}
            </For>
          }
        >
          <For each={columns()}>
            {(col) => (
              <KanbanColumn
                id={col.id}
                title={col.title}
                color={col.color}
                issues={issuesForColumn(col.id)}
                projectKey={props.projectKey}
                onDrop={handleDrop}
                onAddIssue={handleAddIssue}
                onDragStart={() => {}}
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
