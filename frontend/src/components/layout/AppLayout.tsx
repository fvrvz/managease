import { createSignal, JSX, Show } from 'solid-js';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { IssueForm } from '@/components/issue/IssueForm';
import { currentProject } from '@/stores/project.store';
import { ToastProvider } from '@/components/ui/Toast';

export const AppLayout = (props: { children?: JSX.Element }) => {
  const [collapsed, setCollapsed] = createSignal(false);
  const [createIssueOpen, setCreateIssueOpen] = createSignal(false);

  return (
    <ToastProvider>
      <div class="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        {/* Sidebar */}
        <Sidebar
          collapsed={collapsed()}
          onToggle={() => setCollapsed(!collapsed())}
          onCreateIssueClick={() => setCreateIssueOpen(true)}
        />

        {/* Topbar */}
        <Topbar
          sidebarCollapsed={collapsed()}
          onCreateIssueClick={() => setCreateIssueOpen(true)}
        />

        {/* Main Content Area */}
        <main
          class={`mt-16 flex-1 p-6 transition-all duration-300 ${
            collapsed() ? 'ml-16' : 'ml-64'
          }`}
        >
          <div class="max-w-7xl mx-auto">
            {props.children}
          </div>
        </main>

        {/* Global Quick Create Issue Modal */}
        <Show when={createIssueOpen()}>
          <IssueForm
            open={createIssueOpen()}
            onClose={() => setCreateIssueOpen(false)}
            projectId={currentProject()?.id || '1'}
          />
        </Show>
      </div>
    </ToastProvider>
  );
};
export default AppLayout;

