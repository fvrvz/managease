import { createSignal, Show } from 'solid-js';
import {
  Sparkles,
  Layers,
  ArrowRight,
  Github,
  Zap,
  ShieldCheck,
  Cpu,
  BarChart3,
  Bot,
  ChevronRight,
  Terminal,
  FileSpreadsheet,
  Workflow,
  Check,
  X,
  Play,
} from 'lucide-solid';

export function ShowcaseApp() {
  const [activeFeatureTab, setActiveFeatureTab] = createSignal<'ai' | 'kanban' | 'workflow' | 'github'>('ai');
  const [activeBoardColumn, setActiveBoardColumn] = createSignal<'todo' | 'inprogress' | 'review' | 'done'>('inprogress');
  const [copiedDockerCmd, setCopiedDockerCmd] = createSignal(false);

  const copyDockerCommand = () => {
    navigator.clipboard.writeText('git clone https://github.com/fvrvz/managease.git && cd managease && docker compose up -d');
    setCopiedDockerCmd(true);
    setTimeout(() => setCopiedDockerCmd(false), 2500);
  };

  return (
    <div class="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* ── Background Gradients ── */}
      <div class="fixed inset-0 pointer-events-none z-0">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-blue-600/20 via-purple-600/10 to-transparent blur-[120px] opacity-70" />
        <div class="absolute top-[600px] -left-40 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] opacity-40" />
        <div class="absolute top-[1200px] -right-40 w-[600px] h-[600px] bg-purple-600/10 blur-[140px] opacity-40" />
        <div class="absolute inset-0 bg-grid-pattern opacity-40" />
      </div>

      {/* ── Navbar ── */}
      <header class="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0D14]/80 border-b border-white/5 transition">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/25">
              ME
            </div>
            <span class="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
              ManagEase
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v2.0
              </span>
            </span>
          </div>

          <nav class="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#features" class="hover:text-white transition">Features</a>
            <a href="#ai-smart-import" class="hover:text-white transition flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-purple-400" />
              <span>AI Smart Import</span>
            </a>
            <a href="#interactive-preview" class="hover:text-white transition">Interactive Demo</a>
            <a href="#comparison" class="hover:text-white transition">Comparison</a>
            <a href="#tech-stack" class="hover:text-white transition">Stack</a>
          </nav>

          <div class="flex items-center gap-3">
            <a
              href="https://github.com/fvrvz/managease"
              target="_blank"
              rel="noreferrer"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              <Github class="w-4 h-4" />
              <span class="hidden sm:inline">Star on GitHub</span>
            </a>
            <a
              href="https://github.com/fvrvz/managease#readme"
              target="_blank"
              rel="noreferrer"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition"
            >
              <span>Get Started</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section class="relative z-10 pt-20 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        {/* Release Pill */}
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-8 backdrop-blur-md">
          <Sparkles class="w-3.5 h-3.5 text-purple-400" />
          <span>New: AI Smart Plan Parser with Gemini & OpenAI Support</span>
          <ChevronRight class="w-3 h-3 text-purple-400/70" />
        </div>

        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
          The AI-Native Jira Alternative{' '}
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
            Built for Extreme Velocity
          </span>
        </h1>

        <p class="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Stop fighting sluggish legacy issue trackers. ManagEase combines fine-grained SolidJS reactivity,
          AI-powered Excel roadmap ingestion, draggable state machines, and bidirectional GitHub automation.
        </p>

        {/* CTA Buttons */}
        <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://github.com/fvrvz/managease"
            target="_blank"
            rel="noreferrer"
            class="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition"
          >
            <Github class="w-4 h-4" />
            <span>Deploy with Docker Compose</span>
          </a>
          <a
            href="#interactive-preview"
            class="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition backdrop-blur-md"
          >
            <Play class="w-3.5 h-3.5 text-blue-400" />
            <span>Interactive Feature Tour</span>
          </a>
        </div>

        {/* Quick specs pill */}
        <div class="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <span class="flex items-center gap-1.5">
            <Zap class="w-3.5 h-3.5 text-amber-400" /> &lt;50ms Reactivity (SolidJS)
          </span>
          <span class="flex items-center gap-1.5">
            <Cpu class="w-3.5 h-3.5 text-purple-400" /> Gemini & OpenAI & Ollama
          </span>
          <span class="flex items-center gap-1.5">
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-400" /> 100% Self-Hostable
          </span>
          <span class="flex items-center gap-1.5">
            <Bot class="w-3.5 h-3.5 text-blue-400" /> Automatic GitHub PR Sync
          </span>
        </div>

        {/* ── Hero Visual Mockup ── */}
        <div class="mt-14 relative rounded-2xl p-2 bg-gradient-to-b from-white/15 to-white/5 shadow-2xl border border-white/10 max-w-5xl mx-auto overflow-hidden">
          <div class="bg-[#0F172A] rounded-xl border border-slate-800 overflow-hidden shadow-inner">
            {/* Window bar */}
            <div class="px-4 py-3 bg-[#090D16] border-b border-slate-800/80 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-red-500/80" />
                <div class="w-3 h-3 rounded-full bg-amber-500/80" />
                <div class="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span class="ml-2 text-xs font-mono text-slate-400">managease &bull; Core Platform (MNG) &bull; Sprint 1</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-400">
                <span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-[10px]">
                  Sprint Active
                </span>
              </div>
            </div>

            {/* Kanban Preview */}
            <div class="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-left">
              {/* Backlog / To Do */}
              <div class="bg-slate-900/60 rounded-lg p-3 border border-slate-800/80 space-y-2">
                <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>To Do</span>
                  <span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">3</span>
                </div>
                <div class="bg-slate-800/80 p-3 rounded-md border border-slate-700/60 shadow-xs space-y-2">
                  <div class="flex items-center justify-between text-[11px] font-mono text-blue-400">
                    <span>MNG-104</span>
                    <span class="text-amber-400 text-[10px] bg-amber-400/10 px-1.5 py-0.5 rounded">High</span>
                  </div>
                  <p class="text-xs font-medium text-slate-200">OAuth2 Provider & Session Expiry Gate</p>
                  <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/40">
                    <span class="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 font-semibold">Authentication</span>
                    <span>5 pts</span>
                  </div>
                </div>
              </div>

              {/* In Progress */}
              <div class="bg-slate-900/60 rounded-lg p-3 border border-blue-900/30 space-y-2">
                <div class="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider">
                  <span>In Progress</span>
                  <span class="px-1.5 py-0.2 rounded bg-blue-900/40 text-blue-300 text-[10px]">2</span>
                </div>
                <div class="bg-slate-800/90 p-3 rounded-md border border-blue-500/40 shadow-xs space-y-2 relative overflow-hidden">
                  <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                  <div class="flex items-center justify-between text-[11px] font-mono text-blue-400">
                    <span>MNG-101</span>
                    <span class="text-red-400 text-[10px] bg-red-400/10 px-1.5 py-0.5 rounded">Highest</span>
                  </div>
                  <p class="text-xs font-semibold text-white">Interactive Draggable Kanban Board Engine</p>
                  <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/40">
                    <span class="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-semibold">Kanban Board</span>
                    <span>8 pts</span>
                  </div>
                </div>
              </div>

              {/* In Review */}
              <div class="bg-slate-900/60 rounded-lg p-3 border border-slate-800/80 space-y-2">
                <div class="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <span>In Review</span>
                  <span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">1</span>
                </div>
                <div class="bg-slate-800/80 p-3 rounded-md border border-slate-700/60 shadow-xs space-y-2">
                  <div class="flex items-center justify-between text-[11px] font-mono text-blue-400">
                    <span>MNG-98</span>
                    <span class="text-emerald-400 text-[10px] bg-emerald-400/10 px-1.5 py-0.5 rounded">Medium</span>
                  </div>
                  <p class="text-xs font-medium text-slate-200">Daily Burndown Points Aggregator</p>
                  <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/40">
                    <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">Analytics</span>
                    <span>3 pts</span>
                  </div>
                </div>
              </div>

              {/* Done */}
              <div class="bg-slate-900/60 rounded-lg p-3 border border-slate-800/80 space-y-2">
                <div class="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <span>Done</span>
                  <span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">4</span>
                </div>
                <div class="bg-slate-800/60 p-3 rounded-md border border-slate-700/40 shadow-xs space-y-2 opacity-80">
                  <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span class="line-through">MNG-89</span>
                    <span class="text-emerald-400 text-[10px] flex items-center gap-1"><Check class="w-3 h-3" /> Done</span>
                  </div>
                  <p class="text-xs font-medium text-slate-300 line-through">GitHub Webhook Dispatcher</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bento Grid Section ── */}
      <section id="features" class="relative z-10 py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Core Architecture</h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Everything Agile Teams Need, Zero Fluff</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Bento Card 1: AI Smart Import (Spans 2 cols) */}
          <div id="ai-smart-import" class="md:col-span-2 rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-slate-900/90 border border-purple-500/30 relative overflow-hidden group">
            <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-600/20 transition-all duration-500" />
            <div class="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">
              <Sparkles class="w-4 h-4 text-purple-400" />
              <span>LLM Roadmap &amp; Excel Parser</span>
            </div>
            <h3 class="text-2xl font-bold text-white tracking-tight">Import Any Spreadsheet Structure</h3>
            <p class="text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              Never fight strict CSV templates again. ManagEase passes messy Excel workbooks, custom WBS numbers, and roadmap notes to Gemini or OpenAI, turning them into structured Epics, Sprints, and Issues with live token and cost estimation.
            </p>

            {/* Visual simulation pill */}
            <div class="mt-6 p-4 rounded-xl bg-black/40 border border-purple-500/20 font-mono text-xs text-slate-300 space-y-2">
              <div class="flex items-center justify-between border-b border-purple-500/20 pb-2 text-[11px] text-purple-300 font-sans">
                <span class="flex items-center gap-1.5"><FileSpreadsheet class="w-3.5 h-3.5" /> sample_ai_plan.xlsx (NextGen E-Commerce)</span>
                <span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">gemini-1.5-flash &bull; 1,842 tokens &bull; ~$0.00025</span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-center pt-1 font-sans text-xs">
                <div class="bg-slate-900/80 p-2 rounded border border-white/5">
                  <div class="text-purple-400 font-bold text-sm">3 Epics</div>
                  <div class="text-[10px] text-slate-500">Auth, Catalog, Billing</div>
                </div>
                <div class="bg-slate-900/80 p-2 rounded border border-white/5">
                  <div class="text-blue-400 font-bold text-sm">2 Sprints</div>
                  <div class="text-[10px] text-slate-500">Alpha &amp; Beta Milestones</div>
                </div>
                <div class="bg-slate-900/80 p-2 rounded border border-white/5">
                  <div class="text-emerald-400 font-bold text-sm">12 Tasks</div>
                  <div class="text-[10px] text-slate-500">Stories, Bugs, Subtasks</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Card 2: Draggable Workflow */}
          <div class="rounded-2xl p-6 sm:p-8 bg-slate-900/60 border border-white/10 relative overflow-hidden group">
            <div class="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">
              <Workflow class="w-4 h-4 text-blue-400" />
              <span>State Machines</span>
            </div>
            <h3 class="text-xl font-bold text-white tracking-tight">Custom Draggable Workflows</h3>
            <p class="text-sm text-slate-400 mt-2 leading-relaxed">
              Model your team's exact workflow visually. Link statuses with customizable transition arrows and strict permission controls.
            </p>
            <div class="mt-6 flex items-center justify-between gap-1 text-[11px] font-mono text-slate-400 bg-black/30 p-3 rounded-lg border border-white/5">
              <span class="px-2 py-1 rounded bg-slate-800 text-slate-200">Todo</span>
              <ArrowRight class="w-3.5 h-3.5 text-blue-400" />
              <span class="px-2 py-1 rounded bg-blue-900/40 text-blue-300">In Progress</span>
              <ArrowRight class="w-3.5 h-3.5 text-emerald-400" />
              <span class="px-2 py-1 rounded bg-emerald-900/40 text-emerald-300">Done</span>
            </div>
          </div>

          {/* Bento Card 3: GitHub Bot */}
          <div class="rounded-2xl p-6 sm:p-8 bg-slate-900/60 border border-white/10 relative overflow-hidden group">
            <div class="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
              <Bot class="w-4 h-4 text-emerald-400" />
              <span>Git Integration</span>
            </div>
            <h3 class="text-xl font-bold text-white tracking-tight">Automated GitHub Bot</h3>
            <p class="text-sm text-slate-400 mt-2 leading-relaxed">
              Auto-link pull requests to issues via branch naming conventions (`feature/ME-42-auth`) and auto-transition tickets to Done on merge.
            </p>
          </div>

          {/* Bento Card 4: Sprint Analytics */}
          <div class="rounded-2xl p-6 sm:p-8 bg-slate-900/60 border border-white/10 relative overflow-hidden group">
            <div class="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
              <BarChart3 class="w-4 h-4 text-amber-400" />
              <span>Metrics</span>
            </div>
            <h3 class="text-xl font-bold text-white tracking-tight">Sprint Burndown &amp; Velocity</h3>
            <p class="text-sm text-slate-400 mt-2 leading-relaxed">
              Daily actual vs. ideal burn charts, story point totals, and team velocity calculations updated in real-time.
            </p>
          </div>

          {/* Bento Card 5: Role-Based Access */}
          <div class="rounded-2xl p-6 sm:p-8 bg-slate-900/60 border border-white/10 relative overflow-hidden group">
            <div class="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">
              <ShieldCheck class="w-4 h-4 text-indigo-400" />
              <span>Governance</span>
            </div>
            <h3 class="text-xl font-bold text-white tracking-tight">Multi-Role Security (RBAC)</h3>
            <p class="text-sm text-slate-400 mt-2 leading-relaxed">
              Pundit-backed permission gates for owners, managers, members, and viewers across projects, sprints, and issues.
            </p>
          </div>
        </div>
      </section>

      {/* ── Interactive Feature Tour ── */}
      <section id="interactive-preview" class="relative z-10 py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div class="text-center mb-10">
          <h2 class="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Interactive Preview</h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Explore the Platform Experience</p>
        </div>

        {/* Feature Tabs */}
        <div class="flex flex-wrap items-center justify-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setActiveFeatureTab('ai')}
            class={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeFeatureTab() === 'ai'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>AI Smart Import</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFeatureTab('kanban')}
            class={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeFeatureTab() === 'kanban'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Layers class="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFeatureTab('workflow')}
            class={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeFeatureTab() === 'workflow'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Workflow class="w-3.5 h-3.5" />
            <span>Workflow Engine</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFeatureTab('github')}
            class={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeFeatureTab() === 'github'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Bot class="w-3.5 h-3.5" />
            <span>GitHub Sync</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div class="rounded-2xl bg-slate-900/90 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Tab 1: AI Import Simulator */}
          <Show when={activeFeatureTab() === 'ai'}>
            <div class="space-y-6">
              <div class="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h4 class="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles class="w-4 h-4 text-purple-400" />
                    Two-Phase Smart Ingestion
                  </h4>
                  <p class="text-xs text-slate-400 mt-0.5">Phase 1 gives a verified JSON preview before anything is written to the database.</p>
                </div>
                <div class="text-[11px] px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 font-mono">
                  gemini-1.5-flash &bull; Auto-Fallback
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Input: Raw Excel Sheet</div>
                  <pre class="text-[10px] font-mono text-slate-400 leading-relaxed overflow-x-auto">
{`Row 1: NextGen E-Commerce Roadmap (Q3 2026)
Row 5: [WBS] [Deliverable] [Stream] [Milestone]
1.0  Auth & IAM     Security  Milestone 1 (Alpha)
1.1  Auth0 SSO      Security  5 pts  (Critical)
1.2  TOTP 2FA       Security  3 pts  (In Progress)
2.0  Search Overhaul Catalog  Milestone 2 (Beta)
2.1  Elasticsearch8 Catalog  8 pts  (Planned)`}
                  </pre>
                </div>

                <div class="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30 space-y-2">
                  <div class="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
                    <span>Output: ManagEase Entities</span>
                    <span class="text-[10px] text-emerald-400 flex items-center gap-1"><Check class="w-3 h-3" /> Validated</span>
                  </div>
                  <pre class="text-[10px] font-mono text-purple-200 leading-relaxed overflow-x-auto">
{`✓ 2 Epics: "Security", "Catalog"
✓ 2 Sprints: "Milestone 1", "Milestone 2"
✓ 3 Issues:
  - MNG-1: Auth0 SSO (Story, High, 5 pts)
  - MNG-2: TOTP 2FA (Story, High, 3 pts)
  - MNG-3: Elasticsearch (Story, High, 8 pts)
Token Consumption: 1,842 ($0.00025)`}
                  </pre>
                </div>
              </div>
            </div>
          </Show>

          {/* Tab 2: Kanban Simulator */}
          <Show when={activeFeatureTab() === 'kanban'}>
            <div class="space-y-6">
              <div class="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h4 class="text-base font-bold text-white flex items-center gap-2">
                    <Layers class="w-4 h-4 text-blue-400" />
                    Interactive Kanban Experience
                  </h4>
                  <p class="text-xs text-slate-400 mt-0.5">Click column pills below to simulate moving tasks between workflow states.</p>
                </div>
                <div class="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => setActiveBoardColumn('todo')}
                    class={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${activeBoardColumn() === 'todo' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  >
                    To Do
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBoardColumn('inprogress')}
                    class={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${activeBoardColumn() === 'inprogress' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBoardColumn('review')}
                    class={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${activeBoardColumn() === 'review' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBoardColumn('done')}
                    class={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${activeBoardColumn() === 'done' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  >
                    Done
                  </button>
                </div>
              </div>

              <div class="bg-slate-950 p-4 rounded-xl border border-white/5">
                <div class="max-w-md mx-auto bg-slate-900 p-4 rounded-lg border border-blue-500/30 space-y-3">
                  <div class="flex items-center justify-between text-xs font-mono">
                    <span class="text-blue-400 font-bold">MNG-142</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase bg-blue-500/20 text-blue-300">
                      Status: {activeBoardColumn().toUpperCase()}
                    </span>
                  </div>
                  <h5 class="text-sm font-bold text-white">Dynamic Workflow State Transition</h5>
                  <p class="text-xs text-slate-400">Task card position and transitions are reactive, triggering optimistic UI updates with Zero Virtual DOM delay.</p>
                  <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <span class="text-purple-300 font-medium">Authentication Epic</span>
                    <span class="font-mono">8 Story Points</span>
                  </div>
                </div>
              </div>
            </div>
          </Show>

          {/* Tab 3: Workflow Engine */}
          <Show when={activeFeatureTab() === 'workflow'}>
            <div class="space-y-6">
              <div class="border-b border-white/10 pb-4">
                <h4 class="text-base font-bold text-white flex items-center gap-2">
                  <Workflow class="w-4 h-4 text-indigo-400" />
                  Draggable State Machine Architecture
                </h4>
                <p class="text-xs text-slate-400 mt-0.5">Every project can define its own statuses and exact transition arrows.</p>
              </div>

              <div class="grid grid-cols-4 gap-2 text-center text-xs">
                <div class="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                  <div class="font-bold text-slate-300">1. Backlog</div>
                  <div class="text-[10px] text-slate-500 mt-1">Initial entry</div>
                </div>
                <div class="p-3 bg-blue-900/40 rounded-lg border border-blue-700/50">
                  <div class="font-bold text-blue-300">2. In Progress</div>
                  <div class="text-[10px] text-blue-400/70 mt-1">Active branch</div>
                </div>
                <div class="p-3 bg-amber-900/40 rounded-lg border border-amber-700/50">
                  <div class="font-bold text-amber-300">3. In Review</div>
                  <div class="text-[10px] text-amber-400/70 mt-1">PR opened</div>
                </div>
                <div class="p-3 bg-emerald-900/40 rounded-lg border border-emerald-700/50">
                  <div class="font-bold text-emerald-300">4. Done</div>
                  <div class="text-[10px] text-emerald-400/70 mt-1">PR merged</div>
                </div>
              </div>
            </div>
          </Show>

          {/* Tab 4: GitHub Sync */}
          <Show when={activeFeatureTab() === 'github'}>
            <div class="space-y-6">
              <div class="border-b border-white/10 pb-4">
                <h4 class="text-base font-bold text-white flex items-center gap-2">
                  <Bot class="w-4 h-4 text-emerald-400" />
                  Bidirectional GitHub Flow
                </h4>
                <p class="text-xs text-slate-400 mt-0.5">Connect your repository to auto-link pull requests and enforce branch naming conventions.</p>
              </div>

              <div class="space-y-3 font-mono text-xs">
                <div class="p-3 bg-slate-950 rounded-lg border border-white/5 space-y-1">
                  <span class="text-slate-500"># 1. Developer creates a branch following project conventions</span>
                  <div class="text-emerald-400">git checkout -b feature/MNG-42-user-auth</div>
                </div>
                <div class="p-3 bg-slate-950 rounded-lg border border-white/5 space-y-1">
                  <span class="text-slate-500"># 2. Push branch and open Pull Request</span>
                  <div class="text-blue-400">gh pr create --title "feat(auth): add OAuth2 provider"</div>
                </div>
                <div class="p-3 bg-slate-950 rounded-lg border border-white/5 space-y-1">
                  <span class="text-slate-500"># 3. ManagEase GitHub Bot automatically links PR and moves MNG-42 to "In Review"</span>
                  <div class="text-purple-400">&gt; Webhook received: PR #12 linked to MNG-42. Transitioned status to 'in_review'.</div>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section id="comparison" class="relative z-10 py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Feature Comparison</h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">How ManagEase Compares</p>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr class="border-b border-white/10 bg-black/30 text-slate-300">
                <th class="py-4 px-6 font-bold">Feature</th>
                <th class="py-4 px-6 font-bold text-blue-400">ManagEase</th>
                <th class="py-4 px-6 font-medium text-slate-400">Jira</th>
                <th class="py-4 px-6 font-medium text-slate-400">Linear</th>
                <th class="py-4 px-6 font-medium text-slate-400">Trello</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-slate-300">
              <tr>
                <td class="py-4 px-6 font-semibold text-white">AI Smart Spreadsheet Parser (Gemini &amp; OpenAI)</td>
                <td class="py-4 px-6 text-emerald-400 font-bold flex items-center gap-1.5"><Check class="w-4 h-4" /> Built-in</td>
                <td class="py-4 px-6 text-red-400"><X class="w-4 h-4 inline" /> Strict CSV only</td>
                <td class="py-4 px-6 text-red-400"><X class="w-4 h-4 inline" /> No</td>
                <td class="py-4 px-6 text-red-400"><X class="w-4 h-4 inline" /> No</td>
              </tr>
              <tr>
                <td class="py-4 px-6 font-semibold text-white">Interactive Draggable Workflows</td>
                <td class="py-4 px-6 text-emerald-400 font-bold flex items-center gap-1.5"><Check class="w-4 h-4" /> Yes</td>
                <td class="py-4 px-6 text-slate-400">Complex / Clunky</td>
                <td class="py-4 px-6 text-slate-400">Limited</td>
                <td class="py-4 px-6 text-red-400"><X class="w-4 h-4 inline" /> No</td>
              </tr>
              <tr>
                <td class="py-4 px-6 font-semibold text-white">Self-Hostable &amp; Open Source</td>
                <td class="py-4 px-6 text-emerald-400 font-bold flex items-center gap-1.5"><Check class="w-4 h-4" /> 100% Docker</td>
                <td class="py-4 px-6 text-red-400"><X class="w-4 h-4 inline" /> Cloud only</td>
                <td class="py-4 px-6 text-red-400"><X class="w-4 h-4 inline" /> Cloud only</td>
                <td class="py-4 px-6 text-red-400"><X class="w-4 h-4 inline" /> Cloud only</td>
              </tr>
              <tr>
                <td class="py-4 px-6 font-semibold text-white">Rendering Engine &amp; Speed</td>
                <td class="py-4 px-6 text-emerald-400 font-bold flex items-center gap-1.5"><Check class="w-4 h-4" /> SolidJS (&lt;50ms)</td>
                <td class="py-4 px-6 text-slate-400">React (Heavy)</td>
                <td class="py-4 px-6 text-slate-400">React</td>
                <td class="py-4 px-6 text-slate-400">React</td>
              </tr>
              <tr>
                <td class="py-4 px-6 font-semibold text-white">Local Ollama LLM Execution</td>
                <td class="py-4 px-6 text-emerald-400 font-bold flex items-center gap-1.5"><Check class="w-4 h-4" /> Zero-cost</td>
                <td class="py-4 px-6 text-red-400"><X class="w-4 h-4 inline" /> No</td>
                <td class="py-4 px-6 text-red-400"><X class="w-4 h-4 inline" /> No</td>
                <td class="py-4 px-6 text-red-400"><X class="w-4 h-4 inline" /> No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section id="tech-stack" class="relative z-10 py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-white/5">
        <div class="text-center mb-10">
          <h2 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Architecture</h2>
          <p class="text-2xl font-bold text-white">Modern &amp; Production-Ready</p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div class="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
            <div class="text-blue-400 font-bold text-sm">SolidJS 1.9</div>
            <div class="text-[11px] text-slate-500">Zero Virtual DOM Frontend</div>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
            <div class="text-red-400 font-bold text-sm">Ruby on Rails 8</div>
            <div class="text-[11px] text-slate-500">API Backend &amp; Pundit RBAC</div>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
            <div class="text-indigo-400 font-bold text-sm">PostgreSQL 16</div>
            <div class="text-[11px] text-slate-500">Relational + JSONB Store</div>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
            <div class="text-purple-400 font-bold text-sm">Google Gemini &amp; Ollama</div>
            <div class="text-[11px] text-slate-500">Smart Roadmap Ingestion</div>
          </div>
        </div>
      </section>

      {/* ── Quickstart Callout ── */}
      <section class="relative z-10 py-16 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div class="rounded-3xl p-8 sm:p-12 bg-gradient-to-b from-blue-900/30 via-slate-900/80 to-slate-900 border border-blue-500/20 shadow-2xl relative overflow-hidden">
          <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Run ManagEase Locally in Seconds</h2>
          <p class="text-sm text-slate-400 mt-3 max-w-xl mx-auto">
            Get the full platform up and running on your local machine with Docker Compose.
          </p>

          <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-xl mx-auto bg-black/60 p-2 rounded-xl border border-white/10 font-mono text-xs">
            <Terminal class="w-4 h-4 text-blue-400 shrink-0 ml-2" />
            <span class="text-slate-300 truncate select-all">git clone https://github.com/fvrvz/managease.git &amp;&amp; docker compose up -d</span>
            <button
              type="button"
              onClick={copyDockerCommand}
              class="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold text-xs shrink-0 transition"
            >
              {copiedDockerCmd() ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer class="mt-auto border-t border-white/5 py-8 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-[10px]">
              ME
            </div>
            <span class="font-bold text-slate-300">ManagEase</span>
            <span>&bull; Open Source Agile Platform</span>
          </div>

          <div class="flex items-center gap-6">
            <a href="https://github.com/fvrvz/managease" target="_blank" rel="noreferrer" class="hover:text-slate-300 transition">
              GitHub Repository
            </a>
            <a href="https://github.com/fvrvz/managease/blob/main/README.md" target="_blank" rel="noreferrer" class="hover:text-slate-300 transition">
              Documentation
            </a>
            <a href="https://github.com/fvrvz/managease/blob/main/LICENSE" target="_blank" rel="noreferrer" class="hover:text-slate-300 transition">
              MIT License
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default ShowcaseApp;
