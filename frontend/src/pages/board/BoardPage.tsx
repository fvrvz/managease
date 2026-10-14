import { onMount, Show, createSignal } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  currentProject,
  fetchProject,
  fetchSprints,
  fetchEpics,
  fetchLabels,
  projectLoading,
} from '@/stores/project.store';
import { KanbanBoard } from '@/components/board/KanbanBoard';

export function BoardPage() {
  const params = useParams();
  const [init, setInit] = createSignal(false);

  onMount(async () => {
    if (params.projectKey) {
      await fetchProject(params.projectKey);
      const proj = currentProject();
      if (proj) {
        await Promise.all([
          fetchSprints(proj.id),
          fetchEpics(proj.id),
          fetchLabels(proj.id),
        ]);
      }
    }
    setInit(true);
  });

  return (
    <div class="h-full flex flex-col">
      <Show
        when={init()}
        fallback={
          <div class="text-center py-20 text-slate-400 text-sm">
            Loading board...
          </div>
        }
      >
        <Show
          when={currentProject()}
          fallback={
            <div class="text-center py-20 text-slate-400 text-sm">
              Project not found.
            </div>
          }
        >
          <KanbanBoard
            projectId={currentProject()!.id}
            projectKey={currentProject()!.key}
          />
        </Show>
      </Show>
    </div>
  );
}
export default BoardPage;

