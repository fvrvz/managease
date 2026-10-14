import { createSignal, Show } from 'solid-js';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Dropdown } from '@/components/ui/Dropdown';
import { startSprint, completeSprint, updateSprint, deleteSprint } from '@/stores/project.store';
import { format } from 'date-fns';
import type { Sprint } from '@/types';

interface SprintHeaderProps {
  sprint: Sprint;
  projectId: string;
  onRefresh?: () => void;
}

export function SprintHeader(props: SprintHeaderProps) {
  const toast = useToast();
  const [editing, setEditing] = createSignal(false);
  const [name, setName] = createSignal(props.sprint.name);
  const [goal, setGoal] = createSignal(props.sprint.goal ?? '');
  const [saving, setSaving] = createSignal(false);

  const progress = () => {
    const total = props.sprint.totalPoints ?? 0;
    const done = props.sprint.completedPoints ?? 0;
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  const handleStart = async () => {
    try {
      await startSprint(props.projectId, props.sprint.id);
      toast.addToast('Sprint started!', 'success');
      props.onRefresh?.();
    } catch {
      toast.addToast('Failed to start sprint', 'error');
    }
  };

  const handleComplete = async () => {
    try {
      await completeSprint(props.projectId, props.sprint.id);
      toast.addToast('Sprint completed!', 'success');
      props.onRefresh?.();
    } catch {
      toast.addToast('Failed to complete sprint', 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSprint(props.projectId, props.sprint.id, { name: name(), goal: goal() });
      setEditing(false);
      toast.addToast('Sprint updated', 'success');
    } catch {
      toast.addToast('Failed to update sprint', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this sprint? Issues will be moved to backlog.')) return;
    try {
      await deleteSprint(props.projectId, props.sprint.id);
      toast.addToast('Sprint deleted', 'success');
      props.onRefresh?.();
    } catch {
      toast.addToast('Failed to delete sprint', 'error');
    }
  };

  const formatDate = (iso?: string) =>
    iso ? format(new Date(iso), 'MMM d, yyyy') : '—';

  const statusColors = {
    planning: 'bg-slate-100 text-slate-600',
    active: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  };

  return (
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <Show
            when={editing()}
            fallback={
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h2 class="text-base font-bold text-slate-900 truncate">{props.sprint.name}</h2>
                  <span class={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', statusColors[props.sprint.status])}>
                    {props.sprint.status.charAt(0).toUpperCase() + props.sprint.status.slice(1)}
                  </span>
                </div>
                <p class="text-xs text-slate-500">
                  {formatDate(props.sprint.startDate)} → {formatDate(props.sprint.endDate)}
                </p>
                <Show when={props.sprint.goal}>
                  <p class="text-sm text-slate-600 mt-1 italic">"{props.sprint.goal}"</p>
                </Show>
              </div>
            }
          >
            <div class="space-y-2">
              <input
                class="text-base font-bold border border-indigo-400 rounded px-2 py-0.5 outline-none w-full"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
              />
              <input
                class="text-sm border border-slate-300 rounded px-2 py-1 outline-none w-full"
                placeholder="Sprint goal…"
                value={goal()}
                onInput={(e) => setGoal(e.currentTarget.value)}
              />
              <div class="flex gap-2">
                <Button size="sm" onClick={handleSave} loading={saving()}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          </Show>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          {/* Action button */}
          <Show when={props.sprint.status === 'planning'}>
            <Button size="sm" onClick={handleStart}>Start Sprint</Button>
          </Show>
          <Show when={props.sprint.status === 'active'}>
            <Button size="sm" variant="secondary" onClick={handleComplete}>Complete Sprint</Button>
          </Show>

          {/* Dropdown menu */}
          <Dropdown
            trigger={
              <button class="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="5" r="1" fill="currentColor" />
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                  <circle cx="12" cy="19" r="1" fill="currentColor" />
                </svg>
              </button>
            }
            items={[
              { label: 'Edit Sprint', onClick: () => setEditing(true) },
              { label: 'Delete Sprint', danger: true, onClick: handleDelete },
            ]}
            align="right"
          />
        </div>
      </div>

      {/* Progress bar */}
      <div class="mt-3">
        <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>{props.sprint.completedPoints ?? 0} / {props.sprint.totalPoints ?? 0} points</span>
          <span>{progress()}%</span>
        </div>
        <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${progress()}%` }}
          />
        </div>
      </div>
    </div>
  );
}
