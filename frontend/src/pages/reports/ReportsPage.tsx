import { onMount, createSignal, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  BarChart3,
  TrendingDown,
  PieChart,
  CheckCircle2,
  AlertCircle
} from 'lucide-solid';
import {
  currentProject,
  fetchProject,
  sprints,
  fetchSprints,
  issues,
  fetchIssues,
} from '@/stores/project.store';
import { BurndownChart } from '@/components/sprint/BurndownChart';

export function ReportsPage() {
  const params = useParams();
  const [selectedSprintId, setSelectedSprintId] = createSignal<string>('');

  onMount(async () => {
    if (params.projectKey) {
      await fetchProject(params.projectKey);
      const proj = currentProject();
      if (proj) {
        await Promise.all([fetchSprints(proj.id), fetchIssues(proj.id)]);
        const active = sprints.find((s) => s.status === 'active') || sprints[0];
        if (active) setSelectedSprintId(active.id);
      }
    }
  });

  const selectedSprint = () => sprints.find((s) => s.id === selectedSprintId());

  // Statistics
  const totalIssues = () => issues.length;
  const doneIssues = () => issues.filter((i) => i.status === 'done').length;
  const inProgressIssues = () => issues.filter((i) => i.status === 'in_progress' || i.status === 'in_review').length;
  const todoIssues = () => issues.filter((i) => i.status === 'todo').length;

  const totalPoints = () => issues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
  const donePoints = () => issues.filter((i) => i.status === 'done').reduce((acc, i) => acc + (i.storyPoints || 0), 0);

  return (
    <div class="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
        <p class="text-sm text-slate-500">Track sprint burndowns, team velocity, and issue distribution</p>
      </div>

      {/* KPI Stats Grid */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold text-slate-500 uppercase">Total Story Points</div>
          <div class="text-2xl font-black text-slate-900 mt-2 font-mono">{totalPoints()}</div>
          <div class="text-xs text-emerald-600 mt-1 font-medium">{donePoints()} pts delivered</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold text-slate-500 uppercase">Total Issues</div>
          <div class="text-2xl font-black text-slate-900 mt-2 font-mono">{totalIssues()}</div>
          <div class="text-xs text-blue-600 mt-1 font-medium">{doneIssues()} completed</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold text-slate-500 uppercase">In Progress</div>
          <div class="text-2xl font-black text-blue-600 mt-2 font-mono">{inProgressIssues()}</div>
          <div class="text-xs text-slate-400 mt-1">Active in development</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold text-slate-500 uppercase">Completion Rate</div>
          <div class="text-2xl font-black text-emerald-600 mt-2 font-mono">
            {totalIssues() > 0 ? Math.round((doneIssues() / totalIssues()) * 100) : 0}%
          </div>
          <div class="text-xs text-slate-400 mt-1">Across all sprints</div>
        </div>
      </div>

      {/* Sprint Burndown Section */}
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-2">
            <TrendingDown class="w-5 h-5 text-blue-600" />
            <h2 class="font-bold text-slate-900 text-base">Sprint Burndown Chart</h2>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-slate-500">Select Sprint:</span>
            <select
              class="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white outline-none focus:border-blue-500"
              value={selectedSprintId()}
              onChange={(e) => setSelectedSprintId(e.currentTarget.value)}
            >
              <For each={sprints}>
                {(sprint) => (
                  <option value={sprint.id}>
                    {sprint.name} ({sprint.status})
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>

        <Show
          when={selectedSprintId()}
          fallback={
            <div class="py-12 text-center text-slate-400 text-sm">
              Please select or create a sprint to view its burndown chart.
            </div>
          }
        >
          <BurndownChart
            projectId={currentProject()?.id || '1'}
            sprintId={selectedSprintId()}
          />
        </Show>
      </div>

      {/* Velocity and Issue Breakdown Section */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sprint Velocity Comparison */}
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div class="flex items-center gap-2 mb-4">
            <BarChart3 class="w-5 h-5 text-indigo-600" />
            <h2 class="font-bold text-slate-900 text-base">Sprint Velocity Breakdown</h2>
          </div>

          <div class="space-y-4">
            <For
              each={sprints}
              fallback={
                <div class="text-xs text-slate-400 py-6 text-center">No sprints available</div>
              }
            >
              {(sprint) => {
                const sprintIssues = issues.filter((i) => i.sprintId === sprint.id);
                const totalPts = sprintIssues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
                const donePts = sprintIssues.filter((i) => i.status === 'done').reduce((acc, i) => acc + (i.storyPoints || 0), 0);

                return (
                  <div>
                    <div class="flex items-center justify-between text-xs mb-1">
                      <span class="font-semibold text-slate-800">{sprint.name}</span>
                      <span class="font-mono text-slate-600">
                        {donePts} / {totalPts} pts delivered
                      </span>
                    </div>
                    <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        class="bg-emerald-500 h-full"
                        style={{
                          width: `${totalPts > 0 ? (donePts / totalPts) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        {/* Status Distribution */}
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div class="flex items-center gap-2 mb-4">
            <PieChart class="w-5 h-5 text-blue-600" />
            <h2 class="font-bold text-slate-900 text-base">Status Distribution</h2>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span class="text-xs font-semibold text-slate-600">To Do</span>
              <span class="text-xs font-mono font-bold text-slate-800">{todoIssues()} issues</span>
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 border border-blue-100">
              <span class="text-xs font-semibold text-blue-700">In Progress</span>
              <span class="text-xs font-mono font-bold text-blue-900">{inProgressIssues()} issues</span>
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <span class="text-xs font-semibold text-emerald-700">Done</span>
              <span class="text-xs font-mono font-bold text-emerald-900">{doneIssues()} issues</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ReportsPage;

