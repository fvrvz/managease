import { createSignal, Show, For } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ArrowRight,
  Download
} from 'lucide-solid';
import { currentProject, fetchProject, fetchIssues, fetchSprints, fetchEpics } from '@/stores/project.store';
import { importsApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/Toast';

export function ImportPage() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [previewHeaders, setPreviewHeaders] = createSignal<string[]>([]);
  const [previewRows, setPreviewRows] = createSignal<any[]>([]);
  const [uploading, setUploading] = createSignal(false);
  const [importResult, setImportResult] = createSignal<{ success: boolean; count?: number; errors?: string[] } | null>(null);

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      processFile(target.files[0]);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (json.length > 0) {
          const headers = (json[0] || []).map((h: any) => String(h || '').trim());
          const rows = json.slice(1, 6).map((row) => {
            const obj: Record<string, string> = {};
            headers.forEach((h, idx) => {
              obj[h] = row[idx] !== undefined ? String(row[idx]) : '';
            });
            return obj;
          });
          setPreviewHeaders(headers);
          setPreviewRows(rows);
        }
      } catch (err) {
        console.error('Failed to parse file preview', err);
        toast.addToast('Unable to parse spreadsheet for preview', 'warning');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    const file = selectedFile();
    const proj = currentProject();
    if (!file || !proj) return;

    setUploading(true);
    try {
      const res = await importsApi.uploadExcel(proj.id, file);
      const data = res.data as any;
      setImportResult({
        success: true,
        count: data?.imported?.issues_count ?? previewRows().length,
      });
      toast.addToast('Plan spreadsheet imported successfully!', 'success');
      // Refresh project data
      await Promise.all([
        fetchIssues(proj.id),
        fetchSprints(proj.id),
        fetchEpics(proj.id),
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.details?.join(', ') || 'Import failed';
      setImportResult({
        success: false,
        errors: [msg],
      });
      toast.addToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        Title: 'Implement User Registration and SSO',
        Type: 'Story',
        Status: 'In Progress',
        Priority: 'High',
        'Story Points': 5,
        Sprint: 'Sprint 1 - Foundation',
        Epic: 'Authentication',
        Assignee: 'admin@managease.local',
        Description: 'Configure OAuth2/OIDC SSO and local Devise auth',
      },
      {
        Title: 'Design Kanban Drag-and-Drop Columns',
        Type: 'Story',
        Status: 'Done',
        Priority: 'Highest',
        'Story Points': 8,
        Sprint: 'Sprint 1 - Foundation',
        Epic: 'Kanban Board',
        Assignee: 'admin@managease.local',
        Description: 'Smooth HTML5 drag-and-drop card movements',
      },
      {
        Title: 'Burndown Chart Calculation Service',
        Type: 'Task',
        Status: 'To Do',
        Priority: 'Medium',
        'Story Points': 3,
        Sprint: 'Sprint 2 - Analytics',
        Epic: 'Sprint Analytics',
        Assignee: '',
        Description: 'Calculate ideal vs actual points remaining daily',
      },
      {
        Title: 'Fix column position acts_as_list ordering',
        Type: 'Bug',
        Status: 'To Do',
        Priority: 'High',
        'Story Points': 2,
        Sprint: 'Sprint 1 - Foundation',
        Epic: 'Kanban Board',
        Assignee: '',
        Description: 'Position indexing fix for cross-column drag',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plan');
    XLSX.writeFile(wb, 'managEase_sample_plan.xlsx');
  };

  return (
    <div class="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Upload Existing Plan (Excel / CSV)</h1>
          <p class="text-sm text-slate-500">
            Import project workbooks to automatically generate Sprints, Epics, and Kanban cards.
          </p>
        </div>

        <button
          onClick={downloadSampleTemplate}
          class="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-semibold text-xs transition"
        >
          <Download class="w-4 h-4 text-slate-500" />
          <span>Download Sample .xlsx</span>
        </button>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        class="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/20 rounded-2xl p-10 text-center transition cursor-pointer flex flex-col items-center justify-center relative"
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
          {selectedFile() ? selectedFile()!.name : 'Choose an Excel or CSV workbook, or drag & drop here'}
        </h3>
        <p class="text-xs text-slate-500 mt-1">
          Supports .xlsx, .xls, and .csv files up to 50MB
        </p>

        <Show when={selectedFile()}>
          <div class="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <FileCheck class="w-4 h-4" />
            <span>Ready to import: {(selectedFile()!.size / 1024).toFixed(1)} KB</span>
          </div>
        </Show>
      </div>

      {/* Spreadsheet Preview */}
      <Show when={previewHeaders().length > 0}>
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-600">
              Previewing First Rows
            </span>
            <span class="text-xs text-slate-400">
              {previewHeaders().length} columns detected
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100/70 border-b border-slate-200">
                  <For each={previewHeaders()}>
                    {(h) => (
                      <th class="p-3 font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <For each={previewRows()}>
                  {(row) => (
                    <tr class="hover:bg-slate-50/50">
                      <For each={previewHeaders()}>
                        {(h) => (
                          <td class="p-3 text-slate-700 whitespace-nowrap max-w-xs truncate">
                            {row[h] || '—'}
                          </td>
                        )}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Import Action */}
        <div class="flex items-center justify-end gap-4">
          <button
            onClick={handleUpload}
            disabled={uploading()}
            class="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition"
          >
            <Show when={uploading()} fallback={<Upload class="w-4 h-4" />}>
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </Show>
            <span>{uploading() ? 'Importing Plan...' : 'Generate Project Setup Now'}</span>
          </button>
        </div>
      </Show>

      {/* Success Notification Card */}
      <Show when={importResult()?.success}>
        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <CheckCircle2 class="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 class="font-bold text-emerald-900 text-sm">
                Project plan imported and generated successfully!
              </h4>
              <p class="text-xs text-emerald-700 mt-1">
                Your epics, sprints, and {importResult()?.count ?? 0} issues have been generated on the Kanban board.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/projects/${params.projectKey}/board`)}
            class="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition shrink-0"
          >
            <span>Open Kanban Board</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </Show>
    </div>
  );
}
export default ImportPage;

