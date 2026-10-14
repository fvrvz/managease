import { onMount, createSignal, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import { Milestone, Plus, Calendar, CheckCircle2 } from 'lucide-solid';
import {
  currentProject,
  fetchProject,
  epics,
  fetchEpics,
  createEpic,
  issues,
  fetchIssues,
} from '@/stores/project.store';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function RoadmapPage() {
  const params = useParams();
  const toast = useToast();
  const [createOpen, setCreateOpen] = createSignal(false);
  const [name, setName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [color, setColor] = createSignal('#3B82F6');
  const [startDate, setStartDate] = createSignal('');
  const [dueDate, setDueDate] = createSignal('');
  const [saving, setSaving] = createSignal(false);

  onMount(async () => {
    if (params.projectKey) {
      await fetchProject(params.projectKey);
      const proj = currentProject();
      if (proj) {
        await Promise.all([fetchEpics(proj.id), fetchIssues(proj.id)]);
      }
    }
  });

  const getEpicStats = (epicId: string) => {
    const epicIssues = issues.filter((i) => i.epicId === epicId);
    const total = epicIssues.length;
    const done = epicIssues.filter((i) => i.status === 'done').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, progress };
  };

  const handleCreate = async () => {
    if (!name().trim()) return;
    const proj = currentProject();
    if (!proj) return;
    setSaving(true);
    try {
      await createEpic(proj.id, {
        name: name().trim(),
        description: description().trim(),
        color: color(),
        startDate: startDate() || undefined,
        dueDate: dueDate() || undefined,
        status: 'todo',
      });
      toast.addToast('Epic created successfully', 'success');
      setCreateOpen(false);
      setName('');
      setDescription('');
    } catch {
      toast.addToast('Failed to create epic', 'error');
    } finally {
      setSaving(false);
    }
  };

  const colorPalette = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
    '#06B6D4', // Cyan
  ];

  return (
    <div class="space-y-6 pb-12">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Roadmap</h1>
          <p class="text-sm text-slate-500">Timeline and epic progress tracking</p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition"
        >
          <Plus class="w-4 h-4" />
          <span>New Epic</span>
        </button>
      </div>

      {/* Epics Gantt/Timeline View */}
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">
            Epics & Deliverables ({epics.length})
          </span>
          <span class="text-xs text-slate-400">Quarterly Timeline View</span>
        </div>

        <div class="divide-y divide-slate-100">
          <For
            each={epics}
            fallback={
              <div class="p-12 text-center text-slate-400 text-sm">
                No epics created yet. Click "+ New Epic" to outline your initiatives.
              </div>
            }
          >
            {(epic) => {
              const stats = () => getEpicStats(epic.id);
              return (
                <div class="p-5 hover:bg-slate-50/50 transition">
                  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex items-start gap-3">
                      <div
                        class="w-3.5 h-3.5 rounded-full mt-1 shrink-0"
                        style={{ 'background-color': epic.color || '#3B82F6' }}
                      />
                      <div>
                        <div class="flex items-center gap-2">
                          <h3 class="font-bold text-slate-900 text-sm">{epic.name}</h3>
                          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-slate-100 text-slate-600">
                            {epic.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p class="text-xs text-slate-500 mt-0.5 line-clamp-1">{epic.description}</p>
                      </div>
                    </div>

                    {/* Progress & Timeline Bar */}
                    <div class="w-full md:w-80 space-y-1.5">
                      <div class="flex items-center justify-between text-xs text-slate-500">
                        <span>{stats().done} of {stats().total} issues completed</span>
                        <span class="font-mono font-bold text-slate-700">{stats().progress}%</span>
                      </div>
                      <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${stats().progress}%`,
                            'background-color': epic.color || '#3B82F6',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* Create Epic Modal */}
      <Modal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
        title="Create Epic"
      >
        <div class="p-6 space-y-4">
          <Input
            label="Epic Name *"
            placeholder="e.g. Infrastructure Modernization"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            fullWidth
          />

          <div>
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">
              Description
            </label>
            <textarea
              class="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none min-h-[70px]"
              placeholder="What high-level deliverable is this epic tracking?"
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
            />
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
              Color Theme
            </label>
            <div class="flex items-center gap-3">
              <For each={colorPalette}>
                {(hex) => (
                  <button
                    type="button"
                    onClick={() => setColor(hex)}
                    class={`w-7 h-7 rounded-full border-2 transition ${
                      color() === hex ? 'border-slate-800 scale-110 shadow' : 'border-transparent'
                    }`}
                    style={{ 'background-color': hex }}
                  />
                )}
              </For>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate()}
              onInput={(e) => setStartDate(e.currentTarget.value)}
            />
            <Input
              label="Target Due Date"
              type="date"
              value={dueDate()}
              onInput={(e) => setDueDate(e.currentTarget.value)}
            />
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={saving()}>
            Create Epic
          </Button>
        </div>
      </Modal>
    </div>
  );
}
export default RoadmapPage;
