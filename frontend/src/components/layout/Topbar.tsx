import { createSignal, Show } from 'solid-js';
import { A, useLocation, useParams } from '@solidjs/router';
import { Search, Bell, LogOut, User as UserIcon, Plus } from 'lucide-solid';
import { user, logout } from '@/stores/auth.store';
import { currentProject } from '@/stores/project.store';

interface TopbarProps {
  sidebarCollapsed: boolean;
  onCreateIssueClick: () => void;
}

export const Topbar = (props: TopbarProps) => {
  const location = useLocation();
  const params = useParams();
  const [dropdownOpen, setDropdownOpen] = createSignal(false);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/board')) return 'Kanban Board';
    if (path.includes('/backlog')) return 'Backlog';
    if (path.includes('/sprints')) return 'Sprint Management';
    if (path.includes('/roadmap')) return 'Roadmap';
    if (path.includes('/reports')) return 'Reports & Burndown';
    if (path.includes('/import')) return 'Import Excel Plan';
    if (path.includes('/projects')) return 'Projects';
    return 'Dashboard';
  };

  return (
    <header
      class={`fixed top-0 right-0 h-16 bg-white border-b border-slate-200 z-20 flex items-center justify-between px-6 transition-all duration-300 ${
        props.sidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* Left: Breadcrumb / Page Title */}
      <div class="flex items-center gap-3">
        <Show when={params.projectKey}>
          <A
            href={`/projects/${params.projectKey}/board`}
            class="text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
          >
            {currentProject()?.name || params.projectKey}
          </A>
          <span class="text-slate-300 text-xs">/</span>
        </Show>
        <h1 class="text-lg font-bold text-slate-800 tracking-tight">{getPageTitle()}</h1>
      </div>

      {/* Right: Search + Quick Action + Profile */}
      <div class="flex items-center gap-4">
        {/* Search */}
        <div class="relative hidden sm:block">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search issues, epics..."
            class="pl-9 pr-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-xs text-slate-800 rounded-lg border border-transparent focus:border-blue-500 focus:outline-none w-56 transition"
          />
        </div>

        {/* Quick Issue Create Button */}
        <button
          onClick={props.onCreateIssueClick}
          class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition"
        >
          <Plus class="w-4 h-4" />
          <span>Create</span>
        </button>

        {/* Notifications */}
        <button class="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition relative">
          <Bell class="w-4 h-4" />
          <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
        </button>

        {/* User Avatar & Dropdown */}
        <div class="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen())}
            class="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-blue-400/50 transition focus:outline-none"
          >
            <div class="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center border-2 border-white shadow-sm">
              {user()?.name ? user()!.name.slice(0, 2).toUpperCase() : 'ME'}
            </div>
          </button>

          <Show when={dropdownOpen()}>
            <div
              class="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-1"
              onClick={() => setDropdownOpen(false)}
            >
              <div class="px-4 py-2 border-b border-slate-100">
                <div class="text-xs font-semibold text-slate-800 truncate">{user()?.name || 'User'}</div>
                <div class="text-[11px] text-slate-500 truncate">{user()?.email || 'user@managease.local'}</div>
              </div>

              <div class="py-1">
                <button
                  onClick={() => logout()}
                  class="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut class="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
};
export default Topbar;

