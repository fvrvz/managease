import { createSignal, Show, For } from 'solid-js';
import { A, useLocation, useParams } from '@solidjs/router';
import { Search, Bell, LogOut, Plus, ExternalLink, GitBranch } from 'lucide-solid';
import { user, logout } from '@/stores/auth.store';
import { currentProject, globalSearchQuery, setGlobalSearchQuery, issues } from '@/stores/project.store';
import { useClickOutside } from '@/hooks/useClickOutside';

interface TopbarProps {
  sidebarCollapsed: boolean;
  onCreateIssueClick: () => void;
}

export const Topbar = (props: TopbarProps) => {
  const location = useLocation();
  const params = useParams();
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const [searchFocused, setSearchFocused] = createSignal(false);

  const containerRef = useClickOutside<HTMLElement>(() => {
    setDropdownOpen(false);
    setSearchFocused(false);
  });

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/board')) return 'Kanban Board';
    if (path.includes('/backlog')) return 'Backlog';
    if (path.includes('/sprints')) return 'Sprint Management';
    if (path.includes('/roadmap')) return 'Roadmap';
    if (path.includes('/workflow')) return 'Workflow Editor';
    if (path.includes('/reports')) return 'Reports & Burndown';
    if (path.includes('/import')) return 'Import Excel Plan';
    if (path.includes('/settings')) return 'Project Settings';
    if (path.includes('/projects')) return 'Projects';
    return 'Dashboard';
  };

  const matchingIssues = () => {
    const q = (globalSearchQuery() || '').toLowerCase().trim();
    if (!q || q.length < 2) return [];
    return issues
      .filter(
        (i) =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.key && i.key.toLowerCase().includes(q))
      )
      .slice(0, 5);
  };

  const githubUrl = () => {
    const repo = currentProject()?.githubRepo;
    if (!repo) return null;
    return repo.startsWith('http') ? repo : `https://github.com/${repo}`;
  };

  return (
    <header
      ref={containerRef}
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
      <div class="flex items-center gap-3.5">
        {/* Search Input with Autocomplete Preview */}
        <div class="relative hidden sm:block">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search issues, keys…"
            value={globalSearchQuery()}
            onInput={(e) => setGlobalSearchQuery(e.currentTarget.value)}
            onFocus={() => setSearchFocused(true)}
            class="pl-9 pr-3 py-1.5 bg-slate-100 hover:bg-slate-200/60 focus:bg-white text-xs text-slate-800 rounded-lg border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none w-64 transition"
          />

          {/* Quick Search Results Dropdown */}
          <Show when={searchFocused() && matchingIssues().length > 0}>
            <div class="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in">
              <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Matching Issues
              </div>
              <For each={matchingIssues()}>
                {(issue) => (
                  <div
                    onClick={() => {
                      setSearchFocused(false);
                    }}
                    class="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div class="flex items-center gap-2 truncate">
                      <span class="text-xs font-mono font-bold text-slate-500">{issue.key}</span>
                      <span class="text-xs text-slate-700 truncate">{issue.title}</span>
                    </div>
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                      {issue.status}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* GitHub Link (if configured on current project) */}
        <Show when={githubUrl()}>
          <a
            href={githubUrl()!}
            target="_blank"
            rel="noopener noreferrer"
            class="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition shadow-2xs"
            title="Open GitHub Repository"
          >
            <GitBranch class="w-3.5 h-3.5 text-slate-800" />
            <span class="font-mono text-[11px] truncate max-w-[120px]">
              {currentProject()?.githubRepo?.replace(/^https?:\/\/github\.com\//, '')}
            </span>
            <ExternalLink class="w-3 h-3 text-slate-400" />
          </a>
        </Show>

        {/* Quick Issue Create Button */}
        <button
          onClick={props.onCreateIssueClick}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition"
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
            <div class="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center border-2 border-white shadow-xs">
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
