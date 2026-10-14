import { onMount, createSignal, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  CalendarDays,
  Play,
  CheckCircle2,
  Clock,
  Plus,
  TrendingDown,
} from 'lucide-solid';
import {
  currentProject,
  fetchProject,
  sprints,
  fetchSprints,
  issues,
  fetchIssues,
  startSprint,
  completeSprint,
  createSprint,
} from '@/stores/project.store';
import { BurndownChart } from '@/components/sprint/BurndownChart';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function SprintsPage() {
  const params = useParams();
  const toast = useToast();
  const [createOpen, setCreateOpen] = createSignal(false);
  const [name, setName] = createSignal('');
  const [goal, setGoal] = createSignal('');
  const [startDate, setStartDate] = createSignal('');
  const [endDate, setEndDate] = createSignal('');
  const [saving, setSaving] = createSignal(false);

  onMount(async () => {
    if (params.projectKey) {
      await fetchProject(params.projectKey);
      const proj = currentProject();
      if (proj) {
        await Promise.all([fetchSprints(proj.id), fetchIssues(proj.id)]);
      }
    }
  });

  const activeSprint = () => sprints.find((s) => s.status === 'active');

  const getSprintIssues = (sprintId: string) => issues.filter((i) => i.sprintId === sprintId);

  const getSprintPoints = (sprintId: string) => {
    const list = getSprintIssues(sprintId);
    const completed = list.filter((i) => i.status === 'done').reduce((acc, i) => acc + (i.storyPoints || 0), 0);
    const total = list.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
    return { completed, total, count: list.length };
  };

  const handleCreate = async () => {
    if (!name().trim()) return;
    const proj = currentProject();
    if (!proj) return;
    setSaving(true);
    try {
      await createSprint(proj.id, {
        name: name().trim(),
        goal: goal().trim(),
        startDate: startDate() || undefined,
        endDate: endDate() || undefined,
        status: 'planning',
      });
      toast.addToast('Sprint created successfully', 'success');
      setCreateOpen(false);
      setName('');
      setGoal('');
    } catch {
      toast.addToast('Failed to create sprint', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="space-y-6 pb-12">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Sprints</h1>
          <p class="text-sm text-slate-500">Plan iterations, monitor progress, and review burndowns</p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition"
        >
          <Plus class="w-4 h-4" />
          <span>New Sprint</span>
        </button>
      </div>

      {/* Active Sprint Burndown Hero */}
      <Show when={activeSprint()}>
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <TrendingDown class="w-5 h-5 text-blue-600" />
              <h2 class="font-bold text-slate-900 text-base">
                Active Sprint Burndown: {activeSprint()!.name}
              </h2>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
              Active Sprint
            </span>
          </div>

          <BurndownChart
            projectId={currentProject()?.id || '1'}
            sprintId={activeSprint()!.id}
          />
        </div>
      </Show>

      {/* Sprints List Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <For each={sprints}>
          {(sprint) => {
            const stats = () => getSprintPoints(sprint.id);
            const progress = () => (stats().total > 0 ? Math.round((stats().completed / stats().total) * 100) : 0);

            return (
              <div class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span
                      class={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        sprint.status === 'active'
                          ? 'bg-blue-100 text-blue-700'
                          : sprint.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {sprint.status}
                    </span>
                    <span class="text-xs text-slate-400 font-mono">
                      {stats().count} issues
                    </span>
                  </div>

                  <h3 class="font-bold text-slate-900 text-base">{sprint.name}</h3>
                  <p class="text-xs text-slate-500 mt-1 line-clamp-2">
                    {sprint.goal || 'No goal set for this sprint'}
                  </p>

                  {/* Progress Bar */}
                  <div class="mt-4">
                    <div class="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Progress</span>
                      <span class="font-mono font-semibold">
                        {stats().completed} / {stats().total} pts ({progress()}%)
                      </span>
                    </div>
                    <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${progress()}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-xs text-slate-400 flex items-center gap-1">
                    <CalendarDays class="w-3.5 h-3.5" />
                    <span>{sprint.startDate?.slice(0, 10) || 'Flexible'}</span>
                  </span>

                  <Show when={sprint.status === 'planning'}>
                    <button
                      onClick={() => startSprint(currentProject()!.id, sprint.id)}
                      class="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition"
                    >
                      <Play class="w-3 h-3 fill-white" />
                      <span>Start</span>
                    </button>
                  </Show>

                  <Show when={sprint.status === 'active'}>
                    <button
                      onClick={() => completeSprint(currentProject()!.id, sprint.id)}
                      class="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition"
                    >
                      <CheckCircle2 class="w-3 h-3" />
                      <span>Complete</span>
                    </button>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>

      {/* Create Sprint Modal */}
      <Modal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
        title="Create Sprint"
      >
        <div class="p-6 space-y-4">
          <Input
            label="Sprint Name *"
            placeholder="e.g. Sprint 3 - User Settings"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            fullWidth
          />

          <div>
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">
              Sprint Goal
            </label>
            <textarea
              class="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none min-h-[70px]"
              placeholder="What do we want to achieve in this sprint?"
              value={goal()}
              onInput={(e) => setGoal(e.currentTarget.value)}
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate()}
              onInput={(e) => setStartDate(e.currentTarget.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate()}
              onInput={(e) => setEndDate(e.currentTarget.value)}
            />
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={saving()}>
            Create Sprint
          </Button>
        </div>
      </Modal>
    </div>
  );
}
export default SprintsPage;

