import { createSignal, createEffect, For, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  GitFork,
  Plus,
  ArrowRight,
  MoveLeft,
  MoveRight,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
  Check,
} from 'lucide-solid';
import { currentProject, updateProject } from '@/stores/project.store';
import { projectsApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RichSelect, RichSelectOption } from '@/components/ui/RichSelect';
import type { WorkflowStatus } from '@/types';

const DEFAULT_WORKFLOW: WorkflowStatus[] = [
  { id: 'todo', title: 'To Do', category: 'todo', color: '#94a3b8', description: 'Work ready to be picked up' },
  { id: 'in_progress', title: 'In Progress', category: 'in_progress', color: '#3b82f6', description: 'Actively being worked on' },
  { id: 'in_review', title: 'In Review', category: 'in_progress', color: '#8b5cf6', description: 'Code review or QA testing' },
  { id: 'done', title: 'Done', category: 'done', color: '#22c55e', description: 'Completed and verified' },
];

const categoryOptions: RichSelectOption[] = [
  { value: 'todo', label: 'To Do (Open)', color: '#94a3b8', description: 'Items not yet started' },
  { value: 'in_progress', label: 'In Progress (Active)', color: '#3b82f6', description: 'Items being worked on' },
  { value: 'done', label: 'Done (Completed)', color: '#22c55e', description: 'Completed items' },
];

const colorPresets = [
  '#94a3b8', // Slate
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#ef4444', // Red
];

export function WorkflowPage() {
  const params = useParams();
  const toast = useToast();
  const [statuses, setStatuses] = createSignal<WorkflowStatus[]>(DEFAULT_WORKFLOW);
  const [addModalOpen, setAddModalOpen] = createSignal(false);
  const [newTitle, setNewTitle] = createSignal('');
  const [newCategory, setNewCategory] = createSignal<'todo' | 'in_progress' | 'done'>('in_progress');
  const [newColor, setNewColor] = createSignal('#3b82f6');
  const [newDescription, setNewDescription] = createSignal('');
  const [saving, setSaving] = createSignal(false);

  createEffect(() => {
    const proj = currentProject();
    if (proj?.workflowStatuses && proj.workflowStatuses.length > 0) {
      setStatuses(proj.workflowStatuses);
    } else {
      setStatuses(DEFAULT_WORKFLOW);
    }
  });

  const handleSave = async (updatedList?: WorkflowStatus[]) => {
    const listToSave = updatedList || statuses();
    const proj = currentProject();
    if (!proj) return;
    setSaving(true);
    try {
      await projectsApi.updateWorkflow(proj.id, listToSave);
      await updateProject(proj.id, { workflowStatuses: listToSave });
      toast.addToast('Workflow statuses saved successfully', 'success');
    } catch {
      toast.addToast('Failed to save workflow changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStatus = async () => {
    if (!newTitle().trim()) return;
    const slug = newTitle()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    const newStatus: WorkflowStatus = {
      id: slug,
      title: newTitle().trim(),
      category: newCategory(),
      color: newColor(),
      description: newDescription().trim() || undefined,
    };
    const updated = [...statuses(), newStatus];
    setStatuses(updated);
    setAddModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    await handleSave(updated);
  };

  const moveStatus = (index: number, direction: 'left' | 'right') => {
    const list = [...statuses()];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setStatuses(list);
    handleSave(list);
  };

  const removeStatus = (index: number) => {
    if (statuses().length <= 2) {
      toast.addToast('Workflow must have at least 2 statuses', 'error');
      return;
    }
    const list = statuses().filter((_, i) => i !== index);
    setStatuses(list);
    handleSave(list);
  };

  return (
    <div class="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <GitFork class="w-5 h-5 text-blue-600" />
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">Workflow Editor</h1>
          </div>
          <p class="text-xs text-slate-500">
            Customize the statuses and progression stages for project{' '}
            <span class="font-semibold text-slate-700">{params.projectKey}</span>. Changes update Kanban columns automatically.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            onClick={() => setAddModalOpen(true)}
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition"
          >
            <Plus class="w-4 h-4" />
            <span>Add Status</span>
          </button>
        </div>
      </div>

      {/* Visual Workflow Pipeline Diagram */}
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 class="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>Kanban Lifecycle Pipeline</span>
          <span class="text-xs font-normal text-slate-400">({statuses().length} stages)</span>
        </h2>

        <div class="flex items-center gap-3 overflow-x-auto pb-6 pt-2">
          <For each={statuses()}>
            {(status, idx) => (
              <>
                {/* Status Card */}
                <div class="w-60 shrink-0 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all shadow-xs group">
                  <div class="flex items-center justify-between mb-3">
                    <span
                      class="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs shrink-0"
                      style={{ 'background-color': status.color }}
                    />
                    <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        disabled={idx() === 0}
                        onClick={() => moveStatus(idx(), 'left')}
                        class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-20"
                        title="Move left"
                      >
                        <MoveLeft class="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={idx() === statuses().length - 1}
                        onClick={() => moveStatus(idx(), 'right')}
                        class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-20"
                        title="Move right"
                      >
                        <MoveRight class="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeStatus(idx())}
                        class="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete status"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 class="font-bold text-slate-900 text-sm mb-1">{status.title}</h3>
                  <p class="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                    {status.description || `Category: ${status.category.replace('_', ' ')}`}
                  </p>

                  <div class="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span class="font-mono text-slate-400">ID: {status.id}</span>
                    <span
                      class="px-2 py-0.5 rounded-full font-semibold uppercase text-[10px]"
                      style={{
                        'background-color': `${status.color}15`,
                        color: status.color,
                      }}
                    >
                      {status.category}
                    </span>
                  </div>
                </div>

                {/* Arrow Connector */}
                <Show when={idx() < statuses().length - 1}>
                  <div class="shrink-0 text-slate-300">
                    <ArrowRight class="w-5 h-5" />
                  </div>
                </Show>
              </>
            )}
          </For>
        </div>
      </div>

      {/* Info Tip */}
      <div class="flex items-start gap-3 p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900">
        <Info class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span class="font-bold">Agile Board Synchronization:</span> The Kanban board columns reflect the statuses defined above in real time. Dragging issues on the Kanban board updates the issue status according to this workflow.
        </div>
      </div>

      {/* Add Status Modal */}
      <Modal
        open={addModalOpen()}
        onClose={() => setAddModalOpen(false)}
        title="Add Workflow Status"
        size="md"
      >
        <div class="px-6 py-5 space-y-4">
          <Input
            label="Status Name *"
            placeholder="e.g. QA Testing, Blocked, Ready to Deploy"
            value={newTitle()}
            onInput={(e) => setNewTitle(e.currentTarget.value)}
            fullWidth
          />

          <RichSelect
            label="Category"
            options={categoryOptions}
            value={newCategory()}
            onChange={(val) => setNewCategory(val as any)}
            fullWidth
          />

          <div>
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
              Color Accent
            </label>
            <div class="flex items-center gap-3">
              <For each={colorPresets}>
                {(color) => (
                  <button
                    type="button"
                    onClick={() => setNewColor(color)}
                    class="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
                    style={{ 'background-color': color }}
                  >
                    <Show when={newColor() === color}>
                      <Check class="w-4 h-4 text-white stroke-[3]" />
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              placeholder="Brief explanation of this stage"
              value={newDescription()}
              onInput={(e) => setNewDescription(e.currentTarget.value)}
              class="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50/50 rounded-b-xl">
          <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddStatus} loading={saving()}>
            Add Status
          </Button>
        </div>
      </Modal>
    </div>
  );
}
export default WorkflowPage;
