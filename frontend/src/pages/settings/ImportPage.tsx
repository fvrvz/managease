import { createSignal, Show, For, createEffect } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  ArrowRight,
  Download,
  Sparkles,
  FileCheck,
  ChevronDown,
  ChevronRight,
  Layers,
  GitBranch,
  ListTodo,
  Info,
  RefreshCw,
} from 'lucide-solid';
import { currentProject, fetchProject, fetchIssues, fetchSprints, fetchEpics } from '@/stores/project.store';
import { importsApi, type AiImportPreview } from '@/api/endpoints';
import { useToast } from '@/components/ui/Toast';
import type { Project } from '@/types';

type ImportMode = 'standard' | 'ai';
type AiStep = 'upload' | 'analyzing' | 'preview' | 'committing' | 'done';

export function ImportPage() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // ── Shared state ──────────────────────────────────────────────────────────
  const [mode, setMode] = createSignal<ImportMode>('standard');
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [previewHeaders, setPreviewHeaders] = createSignal<string[]>([]);
  const [previewRows, setPreviewRows] = createSignal<Record<string, string>[]>([]);

  // ── Standard import state ─────────────────────────────────────────────────
  const [uploading, setUploading] = createSignal(false);
  const [importResult, setImportResult] = createSignal<{ success: boolean; count?: number; errors?: string[] } | null>(null);

  // ── AI import state ───────────────────────────────────────────────────────
  const [aiStep, setAiStep] = createSignal<AiStep>('upload');
  const [aiPreview, setAiPreview] = createSignal<AiImportPreview | null>(null);
  const [aiEnabled, setAiEnabled] = createSignal(false);
  const [expandedSections, setExpandedSections] = createSignal<Record<string, boolean>>({
    epics: true, sprints: true, issues: false,
  });

  // Check if AI is enabled for this project
  createEffect(async () => {
    const proj = currentProject();
    if (!proj?.id) {
      if (params.projectKey) await fetchProject(params.projectKey);
      return;
    }
    try {
      const res = await importsApi.getAiSettings(proj.id);
      const data = res.data as { enabled?: boolean };
      setAiEnabled(data?.enabled === true);
    } catch {
      setAiEnabled(false);
    }
  });

  // ── File processing ────────────────────────────────────────────────────────
  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) processFile(target.files[0]);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setImportResult(null);
    setAiPreview(null);
    setAiStep('upload');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (json.length > 0) {
          const headers = (json[0] || []).map((h) => String(h ?? '').trim());
          const rows = json.slice(1, 6).map((row) => {
            const obj: Record<string, string> = {};
            headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? String(row[idx]) : ''; });
            return obj;
          });
          setPreviewHeaders(headers);
          setPreviewRows(rows);
        }
      } catch {
        toast.addToast('Unable to parse spreadsheet preview', 'warning');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Standard import ────────────────────────────────────────────────────────
  const handleUpload = async () => {
    const file = selectedFile();
    const proj = currentProject() as Project | undefined;
    if (!file || !proj) return;

    setUploading(true);
    try {
      const res = await importsApi.uploadExcel(proj.id, file);
      const data = res.data as Record<string, unknown>;
      const importedObj = data?.imported as Record<string, unknown> | undefined;
      setImportResult({ success: true, count: Number(importedObj?.issues_count) || previewRows().length });
      toast.addToast('Plan spreadsheet imported successfully!', 'success');
      await Promise.all([fetchIssues(proj.id), fetchSprints(proj.id), fetchEpics(proj.id)]);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; details?: string[] } } };
      const msg = axiosErr?.response?.data?.error || axiosErr?.response?.data?.details?.join(', ') || 'Import failed';
      setImportResult({ success: false, errors: [msg] });
      toast.addToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── AI import — Phase 1: analyze ─────────────────────────────────────────
  const handleAiAnalyze = async () => {
    const file = selectedFile();
    const proj = currentProject() as Project | undefined;
    if (!file || !proj) return;

    setAiStep('analyzing');
    try {
      const res = await importsApi.aiAnalyze(proj.id, file);
      setAiPreview(res.data.preview);
      setAiStep('preview');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr?.response?.data?.error || 'AI analysis failed';
      toast.addToast(msg, 'error');
      setAiStep('upload');
    }
  };

  // ── AI import — Phase 2: commit ───────────────────────────────────────────
  const handleAiCommit = async () => {
    const preview = aiPreview();
    const proj = currentProject() as Project | undefined;
    if (!preview || !proj) return;

    setAiStep('committing');
    try {
      const res = await importsApi.aiCommit(proj.id, preview);
      const { imported, errors } = res.data;
      toast.addToast(
        `AI import done: ${imported.issues} issues, ${imported.epics} epics, ${imported.sprints} sprints created.`,
        'success'
      );
      if (errors?.length) errors.forEach((e) => toast.addToast(e, 'warning'));
      await Promise.all([fetchIssues(proj.id), fetchSprints(proj.id), fetchEpics(proj.id)]);
      setAiStep('done');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.addToast(axiosErr?.response?.data?.error || 'AI commit failed', 'error');
      setAiStep('preview');
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Template download ─────────────────────────────────────────────────────
  const downloadSampleTemplate = () => {
    const sampleData = [
      { Title: 'Implement User Registration', Type: 'Story', Status: 'In Progress', Priority: 'High', 'Story Points': 5, Sprint: 'Sprint 1', Epic: 'Authentication', Assignee: 'admin@managease.local', Description: 'Configure OAuth2/OIDC SSO' },
      { Title: 'Design Kanban Board', Type: 'Story', Status: 'Done', Priority: 'Highest', 'Story Points': 8, Sprint: 'Sprint 1', Epic: 'Kanban Board', Assignee: 'admin@managease.local', Description: 'Smooth drag-and-drop' },
      { Title: 'Burndown Chart Service', Type: 'Task', Status: 'To Do', Priority: 'Medium', 'Story Points': 3, Sprint: 'Sprint 2', Epic: 'Analytics', Assignee: '', Description: 'Sprint analytics' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'managease-import-template.xlsx');
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const fileDropZone = () => (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      class="relative border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/40 rounded-2xl p-10 text-center transition cursor-pointer flex flex-col items-center justify-center"
    >
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
      <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm border border-blue-100">
        <FileSpreadsheet class="w-7 h-7" />
      </div>
      <h3 class="text-base font-bold text-slate-800">
        {selectedFile() ? selectedFile()!.name : 'Choose a spreadsheet or drag & drop'}
      </h3>
      <p class="text-xs text-slate-500 mt-1">Supports .xlsx, .xls, and .csv files up to 50MB</p>
      <Show when={selectedFile()}>
        <div class="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <FileCheck class="w-4 h-4" />
          <span>Ready: {(selectedFile()!.size / 1024).toFixed(1)} KB</span>
        </div>
      </Show>
    </div>
  );

  return (
    <div class="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Import Project Plan</h1>
        <p class="text-sm text-slate-500 mt-1">
          Upload any Excel or CSV file to bulk-create issues, sprints, and epics.
        </p>
      </div>

      {/* Mode selector */}
      <div class="flex gap-3">
        <button
          onClick={() => { setMode('standard'); setImportResult(null); setAiPreview(null); setAiStep('upload'); }}
          class={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${mode() === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
        >
          <div class={`w-9 h-9 rounded-lg flex items-center justify-center ${mode() === 'standard' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <Upload class="w-4 h-4" />
          </div>
          <div>
            <div class="text-sm font-bold text-slate-800">Standard Import</div>
            <div class="text-xs text-slate-500">Requires the ManagEase template format</div>
          </div>
        </button>

        <button
          onClick={() => { setMode('ai'); setImportResult(null); setAiPreview(null); setAiStep('upload'); }}
          class={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${mode() === 'ai' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
          disabled={!aiEnabled()}
          title={!aiEnabled() ? 'Enable AI import in Project Settings first' : undefined}
        >
          <div class={`w-9 h-9 rounded-lg flex items-center justify-center ${mode() === 'ai' ? 'bg-violet-600 text-white' : aiEnabled() ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-300'}`}>
            <Sparkles class="w-4 h-4" />
          </div>
          <div>
            <div class={`text-sm font-bold ${aiEnabled() ? 'text-slate-800' : 'text-slate-400'}`}>
              AI Smart Import
              {!aiEnabled() && <span class="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Configure in Settings</span>}
            </div>
            <div class="text-xs text-slate-500">Works with any spreadsheet structure</div>
          </div>
        </button>
      </div>

      {/* ── STANDARD MODE ──────────────────────────────────────────────────── */}
      <Show when={mode() === 'standard'}>
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold text-slate-700">Upload your spreadsheet</div>
            <button onClick={downloadSampleTemplate} class="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <Download class="w-3.5 h-3.5" />
              Download template
            </button>
          </div>

          {fileDropZone()}

          <Show when={previewHeaders().length > 0}>
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-600">Preview (first 5 rows)</span>
                <span class="text-xs text-slate-400">{previewHeaders().length} columns</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="bg-slate-100/70 border-b border-slate-200">
                      <For each={previewHeaders()}>{(h) => (
                        <th class="p-3 font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      )}</For>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <For each={previewRows()}>{(row) => (
                      <tr class="hover:bg-slate-50/50">
                        <For each={previewHeaders()}>{(h) => (
                          <td class="p-3 text-slate-700 whitespace-nowrap max-w-xs truncate">{row[h] || '—'}</td>
                        )}</For>
                      </tr>
                    )}</For>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={uploading()}
                class="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition"
              >
                <Show when={uploading()} fallback={<Upload class="w-4 h-4" />}>
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </Show>
                {uploading() ? 'Importing...' : 'Import Now'}
              </button>
            </div>
          </Show>

          <Show when={importResult()?.success}>
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <CheckCircle2 class="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 class="font-bold text-emerald-900 text-sm">Import successful!</h4>
                  <p class="text-xs text-emerald-700 mt-1">{importResult()?.count ?? 0} issues created on the Kanban board.</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/projects/${params.projectKey}/board`)}
                class="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition shrink-0"
              >
                Open Board <ArrowRight class="w-4 h-4" />
              </button>
            </div>
          </Show>

          <Show when={importResult() && !importResult()!.success}>
            <div class="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-800">
              <strong>Import failed:</strong> {importResult()?.errors?.join(', ')}
            </div>
          </Show>
        </div>
      </Show>

      {/* ── AI SMART IMPORT MODE ───────────────────────────────────────────── */}
      <Show when={mode() === 'ai' && aiEnabled()}>
        <div class="space-y-6">

          {/* Step 1: Upload */}
          <Show when={aiStep() === 'upload'}>
            <div class="space-y-4">
              <div class="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-violet-800">
                <Info class="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  AI Smart Import analyses your spreadsheet with an LLM and extracts tasks regardless of its format or column names.
                  You will review the results before anything is saved.
                </span>
              </div>

              {fileDropZone()}

              <Show when={selectedFile()}>
                <div class="flex justify-end">
                  <button
                    onClick={handleAiAnalyze}
                    class="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-md shadow-violet-500/20 transition"
                  >
                    <Sparkles class="w-4 h-4" />
                    Analyse with AI
                  </button>
                </div>
              </Show>
            </div>
          </Show>

          {/* Step 2: Analysing spinner */}
          <Show when={aiStep() === 'analyzing'}>
            <div class="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center gap-5 text-center">
              <div class="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center">
                <Sparkles class="w-7 h-7 text-violet-600 animate-pulse" />
              </div>
              <div>
                <div class="text-base font-bold text-slate-800">Analysing your spreadsheet…</div>
                <div class="text-sm text-slate-500 mt-1">The LLM is reading all sheets and extracting issues. This may take 10–30 seconds.</div>
              </div>
              <div class="flex gap-1.5">
                <div class="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style="animation-delay:0ms" />
                <div class="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style="animation-delay:150ms" />
                <div class="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style="animation-delay:300ms" />
              </div>
            </div>
          </Show>

          {/* Step 3: Preview */}
          <Show when={(aiStep() === 'preview' || aiStep() === 'committing') && aiPreview()}>
            {(_p) => {
              const p = aiPreview()!;
              return (
                <div class="space-y-5">
                  {/* Summary banner */}
                  <div class="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4">
                    <div class="text-sm font-bold text-violet-900 mb-1">AI Analysis Complete</div>
                    <div class="text-xs text-violet-700 mb-3">{p.summary.notes}</div>
                    <div class="flex gap-6 text-xs font-semibold text-slate-700">
                      <span class="flex items-center gap-1.5"><Layers class="w-3.5 h-3.5 text-violet-500" /> {p.summary.epics_count} Epics</span>
                      <span class="flex items-center gap-1.5"><GitBranch class="w-3.5 h-3.5 text-blue-500" /> {p.summary.sprints_count} Sprints</span>
                      <span class="flex items-center gap-1.5"><ListTodo class="w-3.5 h-3.5 text-emerald-500" /> {p.summary.issues_count} Issues</span>
                    </div>
                  </div>

                  {/* Epics */}
                  <Show when={p.epics.length > 0}>
                    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection('epics')}
                        class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
                      >
                        <span class="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Layers class="w-4 h-4 text-violet-500" />
                          Epics ({p.epics.length})
                        </span>
                        {expandedSections()['epics'] ? <ChevronDown class="w-4 h-4 text-slate-400" /> : <ChevronRight class="w-4 h-4 text-slate-400" />}
                      </button>
                      <Show when={expandedSections()['epics']}>
                        <div class="border-t border-slate-100 divide-y divide-slate-100">
                          <For each={p.epics}>{(epic) => (
                            <div class="px-4 py-2.5 flex items-center gap-3 text-sm">
                              <div class="w-3 h-3 rounded-full shrink-0" style={`background:${epic.color || '#6366F1'}`} />
                              <span class="font-medium text-slate-800">{epic.name}</span>
                              <Show when={epic.description}>
                                <span class="text-xs text-slate-500 truncate">{epic.description}</span>
                              </Show>
                            </div>
                          )}</For>
                        </div>
                      </Show>
                    </div>
                  </Show>

                  {/* Sprints */}
                  <Show when={p.sprints.length > 0}>
                    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection('sprints')}
                        class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
                      >
                        <span class="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <GitBranch class="w-4 h-4 text-blue-500" />
                          Sprints ({p.sprints.length})
                        </span>
                        {expandedSections()['sprints'] ? <ChevronDown class="w-4 h-4 text-slate-400" /> : <ChevronRight class="w-4 h-4 text-slate-400" />}
                      </button>
                      <Show when={expandedSections()['sprints']}>
                        <div class="border-t border-slate-100 divide-y divide-slate-100">
                          <For each={p.sprints}>{(sprint) => (
                            <div class="px-4 py-2.5 text-sm">
                              <div class="font-medium text-slate-800">{sprint.name}</div>
                              <Show when={sprint.start_date || sprint.end_date}>
                                <div class="text-xs text-slate-500 mt-0.5">
                                  {sprint.start_date || '?'} → {sprint.end_date || '?'}
                                </div>
                              </Show>
                            </div>
                          )}</For>
                        </div>
                      </Show>
                    </div>
                  </Show>

                  {/* Issues */}
                  <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSection('issues')}
                      class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
                    >
                      <span class="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <ListTodo class="w-4 h-4 text-emerald-500" />
                        Issues ({p.issues.length})
                      </span>
                      {expandedSections()['issues'] ? <ChevronDown class="w-4 h-4 text-slate-400" /> : <ChevronRight class="w-4 h-4 text-slate-400" />}
                    </button>
                    <Show when={expandedSections()['issues']}>
                      <div class="border-t border-slate-100 overflow-x-auto">
                        <table class="w-full text-xs text-left">
                          <thead>
                            <tr class="bg-slate-50 border-b border-slate-200">
                              <th class="px-4 py-2 font-bold text-slate-600 whitespace-nowrap">Title</th>
                              <th class="px-4 py-2 font-bold text-slate-600 whitespace-nowrap">Type</th>
                              <th class="px-4 py-2 font-bold text-slate-600 whitespace-nowrap">Priority</th>
                              <th class="px-4 py-2 font-bold text-slate-600 whitespace-nowrap">Sprint</th>
                              <th class="px-4 py-2 font-bold text-slate-600 whitespace-nowrap">Epic</th>
                              <th class="px-4 py-2 font-bold text-slate-600 whitespace-nowrap">Points</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-100">
                            <For each={p.issues}>{(issue) => (
                              <tr class="hover:bg-slate-50/50">
                                <td class="px-4 py-2 font-medium text-slate-800 max-w-xs truncate">{issue.title}</td>
                                <td class="px-4 py-2 text-slate-500 capitalize">{issue.issue_type || 'task'}</td>
                                <td class="px-4 py-2">
                                  <span class={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                    issue.priority === 'highest' ? 'bg-red-100 text-red-700' :
                                    issue.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                    issue.priority === 'low' ? 'bg-blue-100 text-blue-700' :
                                    issue.priority === 'lowest' ? 'bg-slate-100 text-slate-500' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {issue.priority || 'medium'}
                                  </span>
                                </td>
                                <td class="px-4 py-2 text-slate-500 whitespace-nowrap">{issue.sprint || '—'}</td>
                                <td class="px-4 py-2 text-slate-500 whitespace-nowrap">{issue.epic || '—'}</td>
                                <td class="px-4 py-2 text-slate-500 text-center">{issue.story_points ?? '—'}</td>
                              </tr>
                            )}</For>
                          </tbody>
                        </table>
                      </div>
                    </Show>
                  </div>

                  {/* Action buttons */}
                  <div class="flex items-center justify-between pt-2">
                    <button
                      onClick={() => { setAiStep('upload'); setAiPreview(null); setSelectedFile(null); }}
                      class="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      <RefreshCw class="w-4 h-4" />
                      Start over
                    </button>
                    <button
                      onClick={handleAiCommit}
                      disabled={aiStep() === 'committing'}
                      class="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-violet-500/20 transition"
                    >
                      <Show when={aiStep() === 'committing'} fallback={<CheckCircle2 class="w-4 h-4" />}>
                        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </Show>
                      {aiStep() === 'committing' ? 'Creating issues…' : 'Confirm and Create All'}
                    </button>
                  </div>
                </div>
              );
            }}
          </Show>

          {/* Step 4: Done */}
          <Show when={aiStep() === 'done'}>
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <CheckCircle2 class="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 class="font-bold text-emerald-900 text-sm">AI import complete!</h4>
                  <p class="text-xs text-emerald-700 mt-1">
                    All detected epics, sprints, and issues have been created on the board.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/projects/${params.projectKey}/board`)}
                class="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition shrink-0"
              >
                Open Board <ArrowRight class="w-4 h-4" />
              </button>
            </div>
          </Show>
        </div>
      </Show>

      {/* AI not enabled notice */}
      <Show when={mode() === 'ai' && !aiEnabled()}>
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <Sparkles class="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <div class="text-sm font-bold text-amber-900">AI Smart Import is not configured</div>
          <p class="text-xs text-amber-700 mt-1 mb-4">
            Go to Project Settings → Import to configure your LLM provider (OpenAI, Gemini, or Ollama).
          </p>
          <button
            onClick={() => navigate(`/projects/${params.projectKey}/settings`)}
            class="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Open Settings <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </Show>
    </div>
  );
}

export default ImportPage;
