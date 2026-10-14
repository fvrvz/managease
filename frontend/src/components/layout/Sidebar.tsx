import { createSignal, Show, For } from 'solid-js';
import { A, useLocation, useParams } from '@solidjs/router';
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Milestone,
  BarChart3,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Plus
} from 'lucide-solid';
import { currentProject, projects } from '@/stores/project.store';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onCreateIssueClick: () => void;
}

export const Sidebar = (props: SidebarProps) => {
  const location = useLocation();
  const params = useParams();

  const projectKey = () => params.projectKey || currentProject()?.key || (projects.length > 0 ? projects[0].key : '');

  const navItems = () => [
    {
      label: 'Kanban Board',
      icon: LayoutDashboard,
      href: `/projects/${projectKey()}/board`,
    },
    {
      label: 'Backlog',
      icon: ListTodo,
      href: `/projects/${projectKey()}/backlog`,
    },
    {
      label: 'Sprints',
      icon: CalendarDays,
      href: `/projects/${projectKey()}/sprints`,
    },
    {
      label: 'Roadmap',
      icon: Milestone,
      href: `/projects/${projectKey()}/roadmap`,
    },
    {
      label: 'Reports & Burndown',
      icon: BarChart3,
      href: `/projects/${projectKey()}/reports`,
    },
    {
      label: 'Excel Plan Import',
      icon: FileSpreadsheet,
      href: `/projects/${projectKey()}/import`,
    },
  ];

  return (
    <aside
      class={`fixed left-0 top-0 bottom-0 bg-[#0F172A] border-r border-slate-800 text-slate-300 z-30 transition-all duration-300 flex flex-col justify-between ${
        props.collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header & Project Switcher */}
      <div>
        <div class="h-16 flex items-center px-4 border-b border-slate-800/80 gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 shrink-0">
            ME
          </div>
          <Show when={!props.collapsed}>
            <div class="overflow-hidden">
              <span class="font-bold text-slate-100 text-base tracking-tight block truncate">ManagEase</span>
              <span class="text-xs text-slate-400 block truncate font-medium">Agile Workspace</span>
            </div>
          </Show>
        </div>

        {/* Current Project Pill */}
        <Show when={projectKey()}>
          <div class="p-3">
            <A
              href={`/projects/${projectKey()}/board`}
              class={`flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition ${
                props.collapsed ? 'justify-center' : ''
              }`}
              title={currentProject()?.name || projectKey()}
            >
              <div class="w-7 h-7 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-semibold text-xs border border-indigo-500/30 shrink-0">
                {projectKey()?.slice(0, 3)}
              </div>
              <Show when={!props.collapsed}>
                <div class="overflow-hidden leading-tight">
                  <div class="text-xs font-semibold text-slate-200 truncate">{currentProject()?.name || `Project ${projectKey()}`}</div>
                  <div class="text-[10px] text-slate-400">{projectKey()} · Software</div>
                </div>
              </Show>
            </A>
          </div>
        </Show>

        {/* Quick Create Action */}
        <div class="px-3 mb-2">
          <button
            onClick={() => props.onCreateIssueClick()}
            class={`w-full flex items-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow transition ${
              props.collapsed ? 'justify-center' : ''
            }`}
            title="Create Issue"
          >
            <Plus class="w-4 h-4 shrink-0" />
            <Show when={!props.collapsed}>
              <span>Create Issue</span>
            </Show>
          </button>
        </div>

        {/* Navigation Links */}
        <nav class="px-2 space-y-1 mt-3">
          <For each={navItems()}>
            {(item) => {
              const Icon = item.icon;
              const isActive = () => location.pathname === item.href;
              return (
                <A
                  href={item.href}
                  class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition group ${
                    isActive()
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  } ${props.collapsed ? 'justify-center px-0' : ''}`}
                  title={item.label}
                >
                  <Icon class={`w-5 h-5 shrink-0 ${isActive() ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <Show when={!props.collapsed}>
                    <span class="truncate">{item.label}</span>
                  </Show>
                </A>
              );
            }}
          </For>

          <div class="pt-3 border-t border-slate-800/80 my-2">
            <A
              href="/projects"
              class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 ${
                props.collapsed ? 'justify-center px-0' : ''
              }`}
              title="All Projects"
            >
              <FolderKanban class="w-5 h-5 shrink-0 text-slate-400" />
              <Show when={!props.collapsed}>
                <span class="truncate">All Projects</span>
              </Show>
            </A>
          </div>
        </nav>
      </div>

      {/* Footer / Collapse Button */}
      <div class="p-3 border-t border-slate-800/80 flex items-center justify-between">
        <Show when={!props.collapsed}>
          <div class="text-[11px] text-slate-500 font-mono">v1.0 · SolidJS + Rails</div>
        </Show>
        <button
          onClick={props.onToggle}
          class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition mx-auto"
          title={props.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {props.collapsed ? <ChevronRight class="w-4 h-4" /> : <ChevronLeft class="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;

