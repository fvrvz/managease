import { onMount, Show, createSignal } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  currentProject,
  fetchProject,
  fetchSprints,
  fetchEpics,
  fetchIssues,
  fetchLabels,
} from '@/stores/project.store';
import { BacklogView } from '@/components/backlog/BacklogView';

export function BacklogPage() {
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
          fetchIssues(proj.id),
          fetchLabels(proj.id),
        ]);
      }
    }
    setInit(true);
  });

  return (
    <div class="h-full">
      <Show
        when={init()}
        fallback={
          <div class="text-center py-20 text-slate-400 text-sm">
            Loading backlog...
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
          <BacklogView
            projectId={currentProject()!.id}
            projectKey={currentProject()!.key}
          />
        </Show>
      </Show>
    </div>
  );
}
export default BacklogPage;

