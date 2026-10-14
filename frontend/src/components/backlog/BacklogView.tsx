import { createSignal, Show, For, createMemo } from 'solid-js';
import {
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Plus,
  Bookmark,
  Bug,
  CheckSquare,
  Layers,
  Search,
} from 'lucide-solid';
import {
  sprints,
  issues,
  epics,
  startSprint,
  completeSprint,
  createSprint,
  moveIssueOptimistic,
  globalSearchQuery,
  setGlobalSearchQuery,
} from '@/stores/project.store';
import { StatusBadge } from '@/components/issue/StatusBadge';
import { PriorityBadge } from '@/components/issue/PriorityBadge';
import { IssueModal } from '@/components/issue/IssueModal';
import { IssueForm } from '@/components/issue/IssueForm';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import type { Issue, Sprint, IssueType } from '@/types';

interface BacklogViewProps {
  projectId: string;
  projectKey: string;
}

export function BacklogView(props: BacklogViewProps) {
  const toast = useToast();
  const [selectedIssue, setSelectedIssue] = createSignal<Issue | null>(null);
  const [createModalOpen, setCreateModalOpen] = createSignal(false);
  const [targetSprintId, setTargetSprintId] = createSignal<string | undefined>(undefined);
  const [newSprintName, setNewSprintName] = createSignal('');
  const [creatingSprint, setCreatingSprint] = createSignal(false);
  const [collapsedSprints, setCollapsedSprints] = createSignal<Record<string, boolean>>({});
  const [dragOverSprintId, setDragOverSprintId] = createSignal<string | null>(null);
  const [dragOverBacklog, setDragOverBacklog] = createSignal(false);

  const toggleSprint = (sprintId: string) => {
    setCollapsedSprints((prev) => ({ ...prev, [sprintId]: !prev[sprintId] }));
  };

  const activeOrPlanningSprints = createMemo(() =>
    sprints.filter((s) => s.status === 'active' || s.status === 'planning')
  );

  const filterMatches = (i: Issue) => {
    const q = (globalSearchQuery() || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.key && i.key.toLowerCase().includes(q)) ||
      (i.description && i.description.toLowerCase().includes(q))
    );
  };

  const getSprintIssues = (sprintId: string) => {
    return issues.filter((i) => i.sprintId === sprintId && filterMatches(i));
  };

  const backlogIssues = createMemo(() => {
    return issues.filter((i) => !i.sprintId && filterMatches(i));
  });

  const getPoints = (sprintIssueList: Issue[]) => {
    const todo = sprintIssueList.filter((i) => i.status === 'todo').reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    const inProgress = sprintIssueList.filter((i) => i.status === 'in_progress' || i.status === 'in_review').reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    const done = sprintIssueList.filter((i) => i.status === 'done').reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    return { todo, inProgress, done, total: todo + inProgress + done };
  };

  const handleCreateSprint = async () => {
    const num = sprints.length + 1;
    const name = newSprintName().trim() || `${props.projectKey} Sprint ${num}`;
    try {
      await createSprint(props.projectId, {
        name,
        status: 'planning',
        goal: 'Sprint planned goals and deliverables',
      });
      setNewSprintName('');
      setCreatingSprint(false);
      toast.addToast(`Created ${name}`, 'success');
    } catch {
      toast.addToast('Failed to create sprint', 'error');
    }
  };

  const renderTypeIcon = (type: IssueType) => {
    switch (type) {
      case 'story':
        return <Bookmark class="w-4 h-4 text-emerald-600 fill-emerald-500/20 shrink-0" />;
      case 'bug':
        return <Bug class="w-4 h-4 text-red-600 fill-red-500/20 shrink-0" />;
      case 'subtask':
        return <Layers class="w-4 h-4 text-slate-500 fill-slate-500/20 shrink-0" />;
      default:
        return <CheckSquare class="w-4 h-4 text-blue-600 fill-blue-500/20 shrink-0" />;
    }
  };

  const handleDragStart = (e: DragEvent, issue: Issue) => {
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', String(issue.id));
      e.dataTransfer.effectAllowed = 'move';
    }
    setTimeout(() => {
      const target = e.target as HTMLElement;
      if (target) target.classList.add('drag-ghost');
    }, 0);
  };

  const handleDragEnd = (e: DragEvent) => {
    const target = e.target as HTMLElement;
    if (target) target.classList.remove('drag-ghost');
  };

  // Drop onto a sprint
  const handleDropOnSprint = async (e: DragEvent, sprintId: string) => {
    e.preventDefault();
    setDragOverSprintId(null);
    const issueId = e.dataTransfer?.getData('text/plain');
    if (!issueId) return;
    try {
      await moveIssueOptimistic(props.projectId, issueId, 'todo', sprintId);
      toast.addToast('Moved issue to sprint', 'info');
    } catch {
      toast.addToast('Failed to move issue to sprint', 'error');
    }
  };

  // Drop onto backlog
  const handleDropOnBacklog = async (e: DragEvent) => {
    e.preventDefault();
    setDragOverBacklog(false);
    const issueId = e.dataTransfer?.getData('text/plain');
    if (!issueId) return;
    try {
      await moveIssueOptimistic(props.projectId, issueId, 'todo', null);
      toast.addToast('Moved issue to backlog', 'info');
    } catch {
      toast.addToast('Failed to move issue to backlog', 'error');
    }
  };

  return (
    <div class="space-y-6 pb-12">
      {/* Search & Actions Bar */}
      <div class="flex items-center justify-between gap-4 flex-wrap bg-white p-3 rounded-xl border border-slate-200">
        <div class="relative w-72">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            class="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-slate-400 transition"
            placeholder="Search backlog issues…"
            value={globalSearchQuery()}
            onInput={(e) => setGlobalSearchQuery(e.currentTarget.value)}
          />
        </div>

        <button
          onClick={() => {
            setTargetSprintId(undefined);
            setCreateModalOpen(true);
          }}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition"
        >
          <Plus class="w-4 h-4" />
          <span>Create Issue</span>
        </button>
      </div>

      {/* Sprints Sections */}
      <For each={activeOrPlanningSprints()}>
        {(sprint) => {
          const sprintIssues = () => getSprintIssues(sprint.id);
          const points = () => getPoints(sprintIssues());
          const isCollapsed = () => !!collapsedSprints()[sprint.id];
          const isOver = () => dragOverSprintId() === sprint.id;

          return (
            <div
              class={`bg-white rounded-xl border transition-all duration-150 overflow-hidden ${
                isOver()
                  ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                  : 'border-slate-200 shadow-xs'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                setDragOverSprintId(sprint.id);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOverSprintId(sprint.id);
              }}
              onDragLeave={(e) => {
                if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                  setDragOverSprintId(null);
                }
              }}
              onDrop={(e) => handleDropOnSprint(e, sprint.id)}
            >
              {/* Sprint Header */}
              <div class="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                  <button
                    onClick={() => toggleSprint(sprint.id)}
                    class="p-1 rounded hover:bg-slate-200 text-slate-500 transition"
                  >
                    {isCollapsed() ? <ChevronRight class="w-4 h-4" /> : <ChevronDown class="w-4 h-4" />}
                  </button>

                  <div>
                    <div class="flex items-center gap-2">
                      <h2 class="font-bold text-slate-900 text-sm">{sprint.name}</h2>
                      <span
                        class={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          sprint.status === 'active'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {sprint.status}
                      </span>
                    </div>
                    <Show when={sprint.goal}>
                      <p class="text-xs text-slate-500 mt-0.5">{sprint.goal}</p>
                    </Show>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  {/* Story Points Pills */}
                  <div class="flex items-center gap-1.5 font-mono text-xs font-semibold">
                    <span class="px-2 py-0.5 rounded bg-slate-200 text-slate-700" title="To Do points">
                      {points().todo}
                    </span>
                    <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-700" title="In Progress points">
                      {points().inProgress}
                    </span>
                    <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700" title="Done points">
                      {points().done}
                    </span>
                  </div>

                  {/* Actions */}
                  <Show when={sprint.status === 'planning'}>
                    <button
                      onClick={() => startSprint(props.projectId, sprint.id)}
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition shadow-xs"
                    >
                      <Play class="w-3.5 h-3.5 fill-white" />
                      <span>Start Sprint</span>
                    </button>
                  </Show>

                  <Show when={sprint.status === 'active'}>
                    <button
                      onClick={() => completeSprint(props.projectId, sprint.id)}
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition shadow-xs"
                    >
                      <CheckCircle2 class="w-3.5 h-3.5" />
                      <span>Complete Sprint</span>
                    </button>
                  </Show>
                </div>
              </div>

              {/* Issues List in Sprint */}
              <Show when={!isCollapsed()}>
                <div class="divide-y divide-slate-100">
                  <Show
                    when={sprintIssues().length > 0}
                    fallback={
                      <div class="p-8 text-center text-slate-400 text-xs italic bg-slate-50/40">
                        {isOver() ? (
                          <span class="text-blue-600 font-medium">Drop issue here to add to sprint</span>
                        ) : (
                          'Plan a sprint by dragging issues here from the backlog or clicking "+ Create issue" below.'
                        )}
                      </div>
                    }
                  >
                    <For each={sprintIssues()}>
                      {(issue) => {
                        const epic = () => epics.find((e) => e.id === issue.epicId);
                        const issueKey = () =>
                          issue.key || (props.projectKey ? `${props.projectKey}-${issue.number || issue.id}` : `#${issue.id}`);

                        return (
                          <div
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, issue)}
                            onDragEnd={handleDragEnd}
                            onClick={() => setSelectedIssue(issue)}
                            class="px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 cursor-grab active:cursor-grabbing transition gap-4 group select-none"
                          >
                            <div class="flex items-center gap-3 min-w-0">
                              {renderTypeIcon(issue.type)}
                              <span class="text-xs font-bold text-slate-500 font-mono shrink-0 group-hover:text-blue-600">
                                {issueKey()}
                              </span>
                              <span class="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition">
                                {issue.title}
                              </span>
                              <Show when={epic()}>
                                <span
                                  class="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                                  style={{
                                    'background-color': `${epic()!.color}20`,
                                    color: epic()!.color,
                                    border: `1px solid ${epic()!.color}40`,
                                  }}
                                >
                                  {epic()!.name}
                                </span>
                              </Show>
                            </div>

                            <div class="flex items-center gap-3 shrink-0">
                              <StatusBadge status={issue.status} />
                              <PriorityBadge priority={issue.priority} />
                              <Show when={issue.storyPoints !== undefined && issue.storyPoints !== null}>
                                <span class="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-bold flex items-center justify-center">
                                  {issue.storyPoints}
                                </span>
                              </Show>
                              <Avatar name={issue.assignee?.name} src={issue.assignee?.avatarUrl} size="sm" />
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </Show>

                  {/* Add issue button */}
                  <div class="p-3 bg-slate-50/50">
                    <button
                      onClick={() => {
                        setTargetSprintId(sprint.id);
                        setCreateModalOpen(true);
                      }}
                      class="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-blue-600 p-1.5 rounded-lg transition"
                    >
                      <Plus class="w-4 h-4" />
                      <span>Create issue in this sprint</span>
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          );
        }}
      </For>

      {/* Backlog Section */}
      <div
        class={`bg-white rounded-xl border transition-all duration-150 overflow-hidden ${
          dragOverBacklog()
            ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
            : 'border-slate-200 shadow-xs'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          setDragOverBacklog(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOverBacklog(true);
        }}
        onDragLeave={(e) => {
          if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
            setDragOverBacklog(false);
          }
        }}
        onDrop={handleDropOnBacklog}
      >
        <div class="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="font-bold text-slate-900 text-sm">Backlog</h2>
            <span class="text-xs text-slate-500 font-medium">
              ({backlogIssues().length} issues · {getPoints(backlogIssues()).total} pts)
            </span>
          </div>

          <div class="flex items-center gap-3">
            <Show
              when={creatingSprint()}
              fallback={
                <button
                  onClick={() => setCreatingSprint(true)}
                  class="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs transition"
                >
                  + Create Sprint
                </button>
              }
            >
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Sprint name..."
                  class="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  value={newSprintName()}
                  onInput={(e) => setNewSprintName(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSprint()}
                />
                <button
                  onClick={handleCreateSprint}
                  class="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-xs"
                >
                  Save
                </button>
                <button
                  onClick={() => setCreatingSprint(false)}
                  class="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            </Show>
          </div>
        </div>

        <div class="divide-y divide-slate-100">
          <Show
            when={backlogIssues().length > 0}
            fallback={
              <div class="p-8 text-center text-slate-400 text-xs italic bg-slate-50/40">
                {dragOverBacklog() ? (
                  <span class="text-blue-600 font-medium">Drop issue here to move to backlog</span>
                ) : (
                  'Your backlog is empty. Drag issues here or click "+ Create issue" below.'
                )}
              </div>
            }
          >
            <For each={backlogIssues()}>
              {(issue) => {
                const epic = () => epics.find((e) => e.id === issue.epicId);
                const issueKey = () =>
                  issue.key || (props.projectKey ? `${props.projectKey}-${issue.number || issue.id}` : `#${issue.id}`);

                return (
                  <div
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, issue)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedIssue(issue)}
                    class="px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 cursor-grab active:cursor-grabbing transition gap-4 group select-none"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      {renderTypeIcon(issue.type)}
                      <span class="text-xs font-bold text-slate-500 font-mono shrink-0 group-hover:text-blue-600">
                        {issueKey()}
                      </span>
                      <span class="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition">
                        {issue.title}
                      </span>
                      <Show when={epic()}>
                        <span
                          class="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            'background-color': `${epic()!.color}20`,
                            color: epic()!.color,
                            border: `1px solid ${epic()!.color}40`,
                          }}
                        >
                          {epic()!.name}
                        </span>
                      </Show>
                    </div>

                    <div class="flex items-center gap-3 shrink-0">
                      <StatusBadge status={issue.status} />
                      <PriorityBadge priority={issue.priority} />
                      <Show when={issue.storyPoints !== undefined && issue.storyPoints !== null}>
                        <span class="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-bold flex items-center justify-center">
                          {issue.storyPoints}
                        </span>
                      </Show>
                      <Avatar name={issue.assignee?.name} src={issue.assignee?.avatarUrl} size="sm" />
                    </div>
                  </div>
                );
              }}
            </For>
          </Show>

          {/* Add issue button */}
          <div class="p-3 bg-slate-50/50">
            <button
              onClick={() => {
                setTargetSprintId(undefined);
                setCreateModalOpen(true);
              }}
              class="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-blue-600 p-1.5 rounded-lg transition"
            >
              <Plus class="w-4 h-4" />
              <span>Create issue in backlog</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Issue Detail Modal */}
      <Show when={selectedIssue()}>
        <IssueModal
          issue={selectedIssue()!}
          projectKey={props.projectKey}
          onClose={() => setSelectedIssue(null)}
          onUpdated={(updated) => setSelectedIssue(updated)}
        />
      </Show>

      {/* Create Issue Modal */}
      <IssueForm
        open={createModalOpen()}
        onClose={() => setCreateModalOpen(false)}
        projectId={props.projectId}
        sprintId={targetSprintId()}
        defaultStatus="todo"
      />
    </div>
  );
}
