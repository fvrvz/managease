import { createSignal, Show, For, createMemo, onMount } from 'solid-js';
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
  X,
  Calendar,
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
  projectMembers,
  fetchProjectMembers,
} from '@/stores/project.store';
import { user as currentUser } from '@/stores/auth.store';
import { StatusBadge } from '@/components/issue/StatusBadge';
import { PriorityBadge } from '@/components/issue/PriorityBadge';
import { IssueModal } from '@/components/issue/IssueModal';
import { IssueForm } from '@/components/issue/IssueForm';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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
  const [filterAssignee, setFilterAssignee] = createSignal<string | null>(null);

  // Start Sprint Modal State
  const [startSprintModal, setStartSprintModal] = createSignal<Sprint | null>(null);
  const [modalSprintName, setModalSprintName] = createSignal('');
  const [modalDuration, setModalDuration] = createSignal('2_weeks');
  const [modalStartDate, setModalStartDate] = createSignal('');
  const [modalEndDate, setModalEndDate] = createSignal('');
  const [modalGoal, setModalGoal] = createSignal('');
  const [startingSprint, setStartingSprint] = createSignal(false);

  onMount(() => {
    fetchProjectMembers(props.projectId);
  });

  const toggleSprint = (sprintId: string) => {
    setCollapsedSprints((prev) => ({ ...prev, [sprintId]: !prev[sprintId] }));
  };

  const activeOrPlanningSprints = createMemo(() =>
    sprints.filter((s) => s.status === 'active' || s.status === 'planning')
  );

  const filterMatches = (i: Issue) => {
    const q = (globalSearchQuery() || '').toLowerCase().trim();
    if (q) {
      const matches =
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.key && i.key.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (filterAssignee() && String(i.assigneeId) !== String(filterAssignee())) {
      return false;
    }
    return true;
  };

  const calculateEndDate = (startDateStr: string, duration: string) => {
    if (duration === 'custom') return modalEndDate();
    const start = startDateStr ? new Date(startDateStr) : new Date();
    let days = 14;
    if (duration === '1_week') days = 7;
    else if (duration === '2_weeks') days = 14;
    else if (duration === '3_weeks') days = 21;
    else if (duration === '4_weeks') days = 28;
    const end = new Date(start.getTime() + days * 86400000);
    return end.toISOString().slice(0, 10);
  };

  const openStartSprintModal = (sprint: Sprint) => {
    const now = new Date();
    const startStr = sprint.startDate ? sprint.startDate.slice(0, 10) : now.toISOString().slice(0, 10);
    const endStr = sprint.endDate ? sprint.endDate.slice(0, 10) : calculateEndDate(startStr, '2_weeks');

    setModalSprintName(sprint.name);
    setModalDuration('2_weeks');
    setModalStartDate(startStr);
    setModalEndDate(endStr);
    setModalGoal(sprint.goal || '');
    setStartSprintModal(sprint);
  };

  const handleDurationChange = (dur: string) => {
    setModalDuration(dur);
    if (dur !== 'custom') {
      setModalEndDate(calculateEndDate(modalStartDate(), dur));
    }
  };

  const handleStartDateChange = (dateStr: string) => {
    setModalStartDate(dateStr);
    if (modalDuration() !== 'custom') {
      setModalEndDate(calculateEndDate(dateStr, modalDuration()));
    }
  };

  const handleConfirmStartSprint = async () => {
    const sprint = startSprintModal();
    if (!sprint) return;
    setStartingSprint(true);
    try {
      await startSprint(props.projectId, sprint.id, {
        name: modalSprintName().trim() || sprint.name,
        start_date: modalStartDate(),
        end_date: modalEndDate(),
        goal: modalGoal(),
      });
      toast.addToast(`Started sprint ${modalSprintName()}`, 'success');
      setStartSprintModal(null);
    } catch (err: any) {
      toast.addToast(err?.response?.data?.error || 'Failed to start sprint', 'error');
    } finally {
      setStartingSprint(false);
    }
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
      {/* Search & Actions Bar with Jira-style filters */}
      <div class="flex items-center justify-between gap-4 flex-wrap bg-white p-3 rounded-xl border border-slate-200">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="relative w-64">
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              class="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-slate-400 transition"
              placeholder="Search backlog issues…"
              value={globalSearchQuery()}
              onInput={(e) => setGlobalSearchQuery(e.currentTarget.value)}
            />
          </div>

          {/* Jira-style User / Assignee Quick Filter */}
          <div class="flex items-center gap-2 pl-2 border-l border-slate-200">
            <button
              type="button"
              onClick={() => {
                const myId = currentUser()?.id;
                if (myId) {
                  setFilterAssignee((prev) => (String(prev) === String(myId) ? null : String(myId)));
                }
              }}
              class={`px-2.5 py-1 text-xs rounded-lg transition-colors border ${
                String(filterAssignee()) === String(currentUser()?.id)
                  ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Only my issues
            </button>

            {/* Member Avatars */}
            <div class="flex items-center -space-x-1.5 ml-1">
              <For each={projectMembers}>
                {(member) => {
                  const isSelected = () => String(filterAssignee()) === String(member.id);
                  return (
                    <button
                      type="button"
                      title={member.name || member.email || 'Team Member'}
                      onClick={() => {
                        setFilterAssignee((prev) =>
                          String(prev) === String(member.id) ? null : String(member.id)
                        );
                      }}
                      class={`relative rounded-full transition-transform hover:z-10 hover:scale-105 ${
                        isSelected()
                          ? 'ring-2 ring-blue-600 ring-offset-2 z-10'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      <Avatar
                        name={member.name || member.email}
                        src={member.avatarUrl}
                        size="sm"
                        class="border-2 border-white shadow-xs"
                      />
                    </button>
                  );
                }}
              </For>
            </div>

            <Show when={filterAssignee() || globalSearchQuery()}>
              <button
                type="button"
                onClick={() => {
                  setFilterAssignee(null);
                  setGlobalSearchQuery('');
                }}
                class="text-xs text-slate-500 hover:text-slate-800 ml-1 flex items-center gap-1 hover:underline"
              >
                <X class="w-3 h-3" />
                <span>Clear</span>
              </button>
            </Show>
          </div>
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
                      onClick={() => openStartSprintModal(sprint)}
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

      {/* Start Sprint Modal */}
      <Show when={startSprintModal()}>
        <Modal
          open={!!startSprintModal()}
          onClose={() => setStartSprintModal(null)}
          title={`Start Sprint: ${startSprintModal()?.name}`}
          size="md"
        >
          <div class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Sprint Name *</label>
              <input
                type="text"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={modalSprintName()}
                onInput={(e) => setModalSprintName(e.currentTarget.value)}
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Duration</label>
                <select
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                  value={modalDuration()}
                  onChange={(e) => handleDurationChange(e.currentTarget.value)}
                >
                  <option value="1_week">1 week</option>
                  <option value="2_weeks">2 weeks</option>
                  <option value="3_weeks">3 weeks</option>
                  <option value="4_weeks">4 weeks</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                  value={modalStartDate()}
                  onInput={(e) => handleStartDateChange(e.currentTarget.value)}
                />
              </div>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                value={modalEndDate()}
                disabled={modalDuration() !== 'custom'}
                onInput={(e) => setModalEndDate(e.currentTarget.value)}
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Sprint Goal</label>
              <textarea
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 resize-none h-20"
                placeholder="What is this sprint aiming to deliver?"
                value={modalGoal()}
                onInput={(e) => setModalGoal(e.currentTarget.value)}
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setStartSprintModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={startingSprint()}
                onClick={handleConfirmStartSprint}
              >
                Start Sprint
              </Button>
            </div>
          </div>
        </Modal>
      </Show>
    </div>
  );
}
