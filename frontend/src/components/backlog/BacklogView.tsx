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
  Calendar,
  Sparkles
} from 'lucide-solid';
import {
  sprints,
  issues,
  epics,
  startSprint,
  completeSprint,
  createSprint,
  moveIssueOptimistic,
} from '@/stores/project.store';
import { StatusBadge } from '@/components/issue/StatusBadge';
import { PriorityBadge } from '@/components/issue/PriorityBadge';
import { IssueModal } from '@/components/issue/IssueModal';
import { IssueForm } from '@/components/issue/IssueForm';
import { Avatar } from '@/components/ui/Avatar';
import type { Issue, Sprint, IssueType } from '@/types';

interface BacklogViewProps {
  projectId: string;
  projectKey: string;
}

export function BacklogView(props: BacklogViewProps) {
  const [selectedIssue, setSelectedIssue] = createSignal<Issue | null>(null);
  const [createModalOpen, setCreateModalOpen] = createSignal(false);
  const [targetSprintId, setTargetSprintId] = createSignal<string | undefined>(undefined);
  const [newSprintName, setNewSprintName] = createSignal('');
  const [creatingSprint, setCreatingSprint] = createSignal(false);
  const [collapsedSprints, setCollapsedSprints] = createSignal<Record<string, boolean>>({});

  const toggleSprint = (sprintId: string) => {
    setCollapsedSprints((prev) => ({ ...prev, [sprintId]: !prev[sprintId] }));
  };

  const activeOrPlanningSprints = createMemo(() =>
    sprints.filter((s) => s.status === 'active' || s.status === 'planning')
  );

  const getSprintIssues = (sprintId: string) => {
    return issues.filter((i) => i.sprintId === sprintId);
  };

  const backlogIssues = createMemo(() => {
    return issues.filter((i) => !i.sprintId || i.status === 'todo');
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
    await createSprint(props.projectId, {
      name,
      status: 'planning',
      goal: 'Sprint planned goals and deliverables',
    });
    setNewSprintName('');
    setCreatingSprint(false);
  };

  const renderTypeIcon = (type: IssueType) => {
    switch (type) {
      case 'story':
        return <Bookmark class="w-4 h-4 text-emerald-500 fill-emerald-500/20 shrink-0" />;
      case 'bug':
        return <Bug class="w-4 h-4 text-red-500 fill-red-500/20 shrink-0" />;
      default:
        return <CheckSquare class="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />;
    }
  };

  return (
    <div class="space-y-6 pb-12">
      {/* Sprints Sections */}
      <For each={activeOrPlanningSprints()}>
        {(sprint) => {
          const sprintIssues = () => getSprintIssues(sprint.id);
          const points = () => getPoints(sprintIssues());
          const isCollapsed = () => !!collapsedSprints()[sprint.id];

          return (
            <div class="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
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
                  {/* Story Points Pills (Jira style: grey=todo, blue=in_progress, green=done) */}
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
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition shadow-sm"
                    >
                      <Play class="w-3.5 h-3.5 fill-white" />
                      <span>Start Sprint</span>
                    </button>
                  </Show>

                  <Show when={sprint.status === 'active'}>
                    <button
                      onClick={() => completeSprint(props.projectId, sprint.id)}
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition shadow-sm"
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
                      <div class="p-8 text-center text-slate-400 text-xs italic">
                        Plan a sprint by dragging issues here from the backlog or clicking "+ Create issue" below.
                      </div>
                    }
                  >
                    <For each={sprintIssues()}>
                      {(issue) => {
                        const epic = () => epics.find((e) => e.id === issue.epicId);
                        return (
                          <div
                            onClick={() => setSelectedIssue(issue)}
                            class="px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition gap-4 group"
                          >
                            <div class="flex items-center gap-3 min-w-0">
                              {renderTypeIcon(issue.type)}
                              <span class="text-xs font-semibold text-slate-400 font-mono shrink-0">
                                {issue.key || `${props.projectKey}-#`}
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
                              <Show when={issue.storyPoints !== undefined}>
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
                      class="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-blue-600 p-1.5 rounded transition"
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
      <div class="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
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
                  class="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                  value={newSprintName()}
                  onInput={(e) => setNewSprintName(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSprint()}
                />
                <button
                  onClick={handleCreateSprint}
                  class="px-2 py-1 text-xs bg-blue-600 text-white rounded font-medium"
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
              <div class="p-8 text-center text-slate-400 text-xs italic">
                Your backlog is empty. Add issues to plan future work.
              </div>
            }
          >
            <For each={backlogIssues()}>
              {(issue) => {
                const epic = () => epics.find((e) => e.id === issue.epicId);
                return (
                  <div
                    onClick={() => setSelectedIssue(issue)}
                    class="px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition gap-4 group"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      {renderTypeIcon(issue.type)}
                      <span class="text-xs font-semibold text-slate-400 font-mono shrink-0">
                        {issue.key || `${props.projectKey}-#`}
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
                      <Show when={issue.storyPoints !== undefined}>
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

          <div class="p-3 bg-slate-50/50">
            <button
              onClick={() => {
                setTargetSprintId(undefined);
                setCreateModalOpen(true);
              }}
              class="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-blue-600 p-1.5 rounded transition"
            >
              <Plus class="w-4 h-4" />
              <span>Create issue in backlog</span>
            </button>
          </div>
        </div>
      </div>

      {/* Issue Detail Sliding Modal */}
      <Show when={selectedIssue()}>
        <IssueModal
          issue={selectedIssue()!}
          projectKey={props.projectKey}
          onClose={() => setSelectedIssue(null)}
        />
      </Show>

      {/* Create Issue Modal */}
      <Show when={createModalOpen()}>
        <IssueForm
          open={createModalOpen()}
          onClose={() => setCreateModalOpen(false)}
          projectId={props.projectId}
          sprintId={targetSprintId()}
        />
      </Show>
    </div>
  );
}
export default BacklogView;
