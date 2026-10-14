import { onMount, createSignal, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  BarChart3,
  TrendingDown,
  PieChart,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-solid';
import {
  currentProject,
  fetchProject,
  sprints,
  fetchSprints,
  issues,
  fetchIssues,
} from '@/stores/project.store';
import { reportsApi } from '@/api/endpoints';
import { BurndownChart } from '@/components/sprint/BurndownChart';
import { Avatar } from '@/components/ui/Avatar';

interface TimeReportData {
  total_estimated_hours: number;
  total_logged_hours: number;
  by_user: {
    user_id: number | string;
    name: string;
    email: string;
    logged_hours: number;
  }[];
  by_date: {
    date: string;
    hours: number;
  }[];
  issues: {
    id: number | string;
    key: string;
    title: string;
    status: string;
    estimated_hours: number;
    logged_hours: number;
    assignee?: { id: number | string; name: string; email: string };
    work_logs?: {
      id: number | string;
      hours: number;
      date: string;
      description?: string;
      user?: { name: string; email: string };
    }[];
  }[];
}

export function ReportsPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = createSignal<'agile' | 'time'>('agile');
  const [selectedSprintId, setSelectedSprintId] = createSignal<string>('');
  const [timeSprintId, setTimeSprintId] = createSignal<string>('');
  const [timeReport, setTimeReport] = createSignal<TimeReportData | null>(null);
  const [loadingTime, setLoadingTime] = createSignal(false);

  const loadTimeReport = async (projectId: string, sprintId?: string) => {
    setLoadingTime(true);
    try {
      const res = await reportsApi.timeTracking(projectId, sprintId || undefined);
      setTimeReport(res.data as unknown as TimeReportData);
    } catch (e) {
      console.error('Failed to load time report', e);
    } finally {
      setLoadingTime(false);
    }
  };

  onMount(async () => {
    if (params.projectKey) {
      await fetchProject(params.projectKey);
      const proj = currentProject();
      if (proj) {
        await Promise.all([fetchSprints(proj.id), fetchIssues(proj.id)]);
        const active = sprints.find((s) => s.status === 'active') || sprints[0];
        if (active) {
          setSelectedSprintId(active.id);
          setTimeSprintId(active.id);
        }
        await loadTimeReport(proj.id, active?.id);
      }
    }
  });

  const handleTimeSprintChange = (sprintId: string) => {
    setTimeSprintId(sprintId);
    const proj = currentProject();
    if (proj) {
      loadTimeReport(proj.id, sprintId || undefined);
    }
  };

  // Agile Statistics
  const totalIssues = () => issues.length;
  const doneIssues = () => issues.filter((i) => i.status === 'done').length;
  const inProgressIssues = () => issues.filter((i) => i.status === 'in_progress' || i.status === 'in_review').length;
  const todoIssues = () => issues.filter((i) => i.status === 'todo').length;

  const totalPoints = () => issues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
  const donePoints = () => issues.filter((i) => i.status === 'done').reduce((acc, i) => acc + (i.storyPoints || 0), 0);

  return (
    <div class="space-y-6 pb-12">
      {/* Header & Tabs */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p class="text-sm text-slate-500">Track sprint burndowns, velocity, and comprehensive time logs</p>
        </div>

        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('agile')}
            class={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab() === 'agile'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown class="w-4 h-4" />
            <span>Agile & Burndown</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('time');
              const proj = currentProject();
              if (proj && !timeReport()) {
                loadTimeReport(proj.id, timeSprintId());
              }
            }}
            class={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab() === 'time'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock class="w-4 h-4" />
            <span>Time Tracking Report</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: Agile & Burndown ── */}
      <Show when={activeTab() === 'agile'}>
        {/* KPI Stats Grid */}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div class="text-xs font-semibold text-slate-500 uppercase">Total Story Points</div>
            <div class="text-2xl font-black text-slate-900 mt-2 font-mono">{totalPoints()}</div>
            <div class="text-xs text-emerald-600 mt-1 font-medium">{donePoints()} pts delivered</div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div class="text-xs font-semibold text-slate-500 uppercase">Total Issues</div>
            <div class="text-2xl font-black text-slate-900 mt-2 font-mono">{totalIssues()}</div>
            <div class="text-xs text-blue-600 mt-1 font-medium">{doneIssues()} completed</div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div class="text-xs font-semibold text-slate-500 uppercase">In Progress</div>
            <div class="text-2xl font-black text-blue-600 mt-2 font-mono">{inProgressIssues()}</div>
            <div class="text-xs text-slate-400 mt-1">Active in development</div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div class="text-xs font-semibold text-slate-500 uppercase">Completion Rate</div>
            <div class="text-2xl font-black text-emerald-600 mt-2 font-mono">
              {totalIssues() > 0 ? Math.round((doneIssues() / totalIssues()) * 100) : 0}%
            </div>
            <div class="text-xs text-slate-400 mt-1">Across all sprints</div>
          </div>
        </div>

        {/* Sprint Burndown Section */}
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
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
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
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
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
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
      </Show>

      {/* ── TAB 2: Time Tracking Report ── */}
      <Show when={activeTab() === 'time'}>
        <div class="space-y-6">
          {/* Sprint Filter for Time Tracking */}
          <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <Clock class="w-5 h-5 text-blue-600" />
              <div>
                <h3 class="font-bold text-slate-900 text-sm">Sprint Time Report</h3>
                <p class="text-xs text-slate-500">Detailed overview of estimated vs actual hours logged</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-slate-500">Filter by Sprint:</span>
              <select
                class="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white outline-none focus:border-blue-500"
                value={timeSprintId()}
                onChange={(e) => handleTimeSprintChange(e.currentTarget.value)}
              >
                <option value="">All Project Issues</option>
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

          {/* Time Tracking KPI Cards */}
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div class="text-xs font-semibold text-slate-500 uppercase">Estimated Hours</div>
              <div class="text-2xl font-black text-slate-900 mt-2 font-mono">
                {timeReport()?.total_estimated_hours ?? 0}h
              </div>
              <div class="text-xs text-slate-400 mt-1">Planned total effort</div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div class="text-xs font-semibold text-slate-500 uppercase">Logged Hours</div>
              <div class="text-2xl font-black text-blue-600 mt-2 font-mono">
                {timeReport()?.total_logged_hours ?? 0}h
              </div>
              <div class="text-xs text-blue-600 mt-1 font-medium">Actual time recorded</div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div class="text-xs font-semibold text-slate-500 uppercase">Remaining Hours</div>
              <div class="text-2xl font-black text-slate-900 mt-2 font-mono">
                {Math.max(
                  0,
                  (timeReport()?.total_estimated_hours ?? 0) -
                    (timeReport()?.total_logged_hours ?? 0),
                ).toFixed(1)}
                h
              </div>
              <div class="text-xs text-slate-400 mt-1">Based on initial estimates</div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div class="text-xs font-semibold text-slate-500 uppercase">Progress</div>
              <div class="text-2xl font-black text-emerald-600 mt-2 font-mono">
                {(timeReport()?.total_estimated_hours ?? 0) > 0
                  ? Math.round(
                      ((timeReport()?.total_logged_hours ?? 0) /
                        (timeReport()?.total_estimated_hours ?? 1)) *
                        100,
                    )
                  : 0}
                %
              </div>
              <div class="text-xs text-slate-400 mt-1">Logged / Estimated</div>
            </div>
          </div>

          {/* Member Time Breakdown */}
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 class="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <User class="w-4 h-4 text-blue-600" />
              <span>Time Logged by Team Member</span>
            </h3>

            <div class="space-y-4">
              <For
                each={timeReport()?.by_user || []}
                fallback={
                  <div class="text-xs text-slate-400 py-6 text-center italic">
                    No time logs recorded by team members yet.
                  </div>
                }
              >
                {(u) => {
                  const total = timeReport()?.total_logged_hours || 1;
                  const pct = Math.round((u.logged_hours / total) * 100);
                  return (
                    <div>
                      <div class="flex items-center justify-between text-xs mb-1.5">
                        <div class="flex items-center gap-2">
                          <Avatar name={u.name || u.email} size="sm" />
                          <span class="font-semibold text-slate-800">{u.name || u.email}</span>
                        </div>
                        <span class="font-mono text-slate-700 font-bold">
                          {u.logged_hours}h ({pct}%)
                        </span>
                      </div>
                      <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          class="bg-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>

          {/* Issue Timesheet Table */}
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div class="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileSpreadsheet class="w-4 h-4 text-blue-600" />
                <span>Issue Timesheet</span>
              </h3>
              <span class="text-xs text-slate-500 font-medium">
                {timeReport()?.issues?.length || 0} issues with tracked time
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th class="px-4 py-3">Issue Key</th>
                    <th class="px-4 py-3">Title</th>
                    <th class="px-4 py-3">Assignee</th>
                    <th class="px-4 py-3">Status</th>
                    <th class="px-4 py-3 text-right">Estimated</th>
                    <th class="px-4 py-3 text-right">Logged</th>
                    <th class="px-4 py-3 text-right">Progress</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <For
                    each={timeReport()?.issues || []}
                    fallback={
                      <tr>
                        <td colspan="7" class="px-4 py-8 text-center text-slate-400 italic">
                          No issues with time logged in this scope.
                        </td>
                      </tr>
                    }
                  >
                    {(iss) => {
                      const est = iss.estimated_hours || 0;
                      const log = iss.logged_hours || 0;
                      const pct = est > 0 ? Math.round((log / est) * 100) : log > 0 ? 100 : 0;
                      return (
                        <tr class="hover:bg-slate-50/60 transition-colors">
                          <td class="px-4 py-3 font-mono font-bold text-blue-600">
                            {iss.key}
                          </td>
                          <td class="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                            {iss.title}
                          </td>
                          <td class="px-4 py-3">
                            <div class="flex items-center gap-1.5">
                              <Avatar name={iss.assignee?.name || iss.assignee?.email} size="sm" />
                              <span class="text-slate-700">
                                {iss.assignee?.name || iss.assignee?.email || 'Unassigned'}
                              </span>
                            </div>
                          </td>
                          <td class="px-4 py-3">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              {iss.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td class="px-4 py-3 text-right font-mono text-slate-600">
                            {est > 0 ? `${est}h` : '—'}
                          </td>
                          <td class="px-4 py-3 text-right font-mono font-bold text-blue-600">
                            {log > 0 ? `${log}h` : '0h'}
                          </td>
                          <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end gap-2">
                              <div class="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  class={`h-full rounded-full ${
                                    pct > 100 ? 'bg-red-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <span class="font-mono text-[11px] font-semibold text-slate-700 w-8 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
export default ReportsPage;
