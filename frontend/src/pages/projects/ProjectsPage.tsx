import { createSignal, onMount, For, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-solid';
import {
  projects,
  fetchProjects,
  createProject,
  projectLoading,
} from '@/stores/project.store';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { Project } from '@/types';

export function ProjectsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = createSignal('');
  const [createOpen, setCreateOpen] = createSignal(false);
  const [name, setName] = createSignal('');
  const [key, setKey] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [saving, setSaving] = createSignal(false);

  onMount(async () => {
    await fetchProjects();
  });

  const filteredProjects = () => {
    const q = search().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!key() || key().length <= 4) {
      // Auto suggest uppercase key
      const suggested = val
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase();
      if (suggested) setKey(suggested);
    }
  };

  const handleCreate = async () => {
    if (!name().trim() || !key().trim()) return;
    setSaving(true);
    try {
      const newProj = await createProject({
        name: name().trim(),
        key: key().trim().toUpperCase(),
        description: description().trim(),
        color: '#3B82F6',
      });
      toast.addToast('Project created successfully', 'success');
      setCreateOpen(false);
      setName('');
      setKey('');
      setDescription('');
      navigate(`/projects/${newProj.key}/board`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { details?: string[]; error?: string } } };
      const msg = axiosErr?.response?.data?.details?.join(', ') || axiosErr?.response?.data?.error || 'Failed to create project';
      toast.addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
          <p class="text-sm text-slate-500 mt-0.5">Manage your agile team boards and workspaces</p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition"
        >
          <Plus class="w-4 h-4" />
          <span>Create Project</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <Search class="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter projects by name or key..."
          class="text-sm text-slate-800 outline-none w-full bg-transparent"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
      </div>

      {/* Projects Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Show
          when={!projectLoading()}
          fallback={
            <div class="col-span-full text-center py-12 text-slate-400 text-sm">
              Loading projects...
            </div>
          }
        >
          <For
            each={filteredProjects()}
            fallback={
              <div class="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
                <FolderKanban class="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 class="font-bold text-slate-700">No projects found</h3>
                <p class="text-xs text-slate-400 mt-1 mb-4">Create your first agile workspace to get started</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Create Project
                </button>
              </div>
            }
          >
            {(project) => (
              <div class="bg-white rounded-xl border border-slate-200/90 hover:border-blue-400/80 shadow-sm hover:shadow-md transition group p-5 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center">
                      {project.key.slice(0, 3)}
                    </div>
                    <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {project.key}
                    </span>
                  </div>

                  <h3 class="font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {project.name}
                  </h3>
                  <p class="text-xs text-slate-500 mt-1 line-clamp-2">
                    {project.description || 'Agile Kanban board with sprint planning and burndown analytics'}
                  </p>
                </div>

                <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div class="flex items-center gap-3 text-xs text-slate-400">
                    <span class="flex items-center gap-1">
                      <Users class="w-3.5 h-3.5" />
                      <span>Team</span>
                    </span>
                    <span class="flex items-center gap-1">
                      <CheckCircle2 class="w-3.5 h-3.5" />
                      <span>Kanban</span>
                    </span>
                  </div>

                  <A
                    href={`/projects/${project.key}/board`}
                    class="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition"
                  >
                    <span>Open</span>
                    <ArrowRight class="w-3.5 h-3.5" />
                  </A>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Create Project Modal */}
      <Modal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
        title="Create New Project"
      >
        <div class="p-6 space-y-4">
          <Input
            label="Project Name *"
            placeholder="e.g. Mobile Application"
            value={name()}
            onInput={(e) => handleNameChange(e.currentTarget.value)}
            fullWidth
          />

          <Input
            label="Project Key (2-10 uppercase letters) *"
            placeholder="e.g. MOB"
            value={key()}
            onInput={(e) => setKey(e.currentTarget.value.toUpperCase())}
            fullWidth
          />

          <div>
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">
              Description
            </label>
            <textarea
              class="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none min-h-[80px]"
              placeholder="What is this project about?"
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
            />
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={saving()}>
            Create Project
          </Button>
        </div>
      </Modal>
    </div>
  );
}
export default ProjectsPage;

