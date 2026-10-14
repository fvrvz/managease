import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  GitFork,
  Plus,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Sparkles,
  Info,
  Check,
  RotateCcw,
  ShieldCheck,
  Save,
  Link as LinkIcon,
  MousePointer,
  HelpCircle,
  Move,
  X,
} from 'lucide-solid';
import { currentProject, updateProject } from '@/stores/project.store';
import { projectsApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RichSelect, RichSelectOption } from '@/components/ui/RichSelect';
import type { WorkflowStatus, WorkflowTransition, WorkflowData } from '@/types';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;

const DEFAULT_WORKFLOW_STATUSES: WorkflowStatus[] = [
  { id: 'todo', title: 'To Do', category: 'todo', color: '#94a3b8', x: 60, y: 160, description: 'Work ready to be started' },
  { id: 'in_progress', title: 'In Progress', category: 'in_progress', color: '#3b82f6', x: 360, y: 160, description: 'Actively being developed' },
  { id: 'in_review', title: 'In Review', category: 'in_progress', color: '#8b5cf6', x: 660, y: 160, description: 'Code review or QA' },
  { id: 'done', title: 'Done', category: 'done', color: '#22c55e', x: 960, y: 160, description: 'Completed and verified' },
];

const DEFAULT_TRANSITIONS: WorkflowTransition[] = [
  { id: 't1', from: 'todo', to: 'in_progress', name: 'Start Work' },
  { id: 't2', from: 'in_progress', to: 'in_review', name: 'Submit for Review' },
  { id: 't3', from: 'in_review', to: 'done', name: 'Approve & Done' },
  { id: 't4', from: 'in_review', to: 'in_progress', name: 'Request Changes' },
  { id: 't5', from: 'in_progress', to: 'todo', name: 'Stop Work' },
  { id: 't6', from: 'done', to: 'todo', name: 'Reopen' },
];

const categoryOptions: RichSelectOption[] = [
  { value: 'todo', label: 'To Do (Open)', color: '#94a3b8', description: 'Items not yet started' },
  { value: 'in_progress', label: 'In Progress (Active)', color: '#3b82f6', description: 'Items being worked on' },
  { value: 'done', label: 'Done (Completed)', color: '#22c55e', description: 'Completed items' },
];

const colorPresets = [
  '#94a3b8', // Slate
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#ef4444', // Red
];

export function WorkflowPage() {
  const params = useParams();
  const toast = useToast();

  const [statuses, setStatuses] = createSignal<WorkflowStatus[]>(DEFAULT_WORKFLOW_STATUSES);
  const [transitions, setTransitions] = createSignal<WorkflowTransition[]>(DEFAULT_TRANSITIONS);
  const [strict, setStrict] = createSignal(true);
  const [saving, setSaving] = createSignal(false);

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = createSignal<string | null>(null);
  const [dragOffset, setDragOffset] = createSignal<{ x: number; y: number }>({ x: 0, y: 0 });

  // Add Status Modal
  const [addStatusOpen, setAddStatusOpen] = createSignal(false);
  const [newTitle, setNewTitle] = createSignal('');
  const [newCategory, setNewCategory] = createSignal<'todo' | 'in_progress' | 'done'>('in_progress');
  const [newColor, setNewColor] = createSignal('#3b82f6');
  const [newDescription, setNewDescription] = createSignal('');

  // Add Transition Modal
  const [addTransitionOpen, setAddTransitionOpen] = createSignal(false);
  const [transitionFrom, setTransitionFrom] = createSignal('');
  const [transitionTo, setTransitionTo] = createSignal('');
  const [transitionName, setTransitionName] = createSignal('');

  // Interactive link mode
  const [linkingFromId, setLinkingFromId] = createSignal<string | null>(null);

  // Initialize from project
  createEffect(() => {
    const proj = currentProject();
    if (proj) {
      const wData = proj.workflowData;
      if (wData && wData.statuses && wData.statuses.length > 0) {
        setStatuses(
          wData.statuses.map((s, idx) => ({
            ...s,
            x: s.x !== undefined ? s.x : 60 + idx * 300,
            y: s.y !== undefined ? s.y : 160,
          })),
        );
        if (wData.transitions && wData.transitions.length > 0) {
          setTransitions(wData.transitions);
        } else {
          setTransitions(DEFAULT_TRANSITIONS);
        }
        setStrict(wData.strict !== false);
      } else if (proj.workflowStatuses && proj.workflowStatuses.length > 0) {
        setStatuses(
          proj.workflowStatuses.map((s, idx) => ({
            ...s,
            x: s.x !== undefined ? s.x : 60 + idx * 300,
            y: s.y !== undefined ? s.y : 160,
          })),
        );
        setTransitions(DEFAULT_TRANSITIONS);
        setStrict(true);
      }
    }
  });

  const handleSave = async (override?: {
    statuses?: WorkflowStatus[];
    transitions?: WorkflowTransition[];
    strict?: boolean;
  }) => {
    const proj = currentProject();
    if (!proj) return;
    setSaving(true);
    const dataToSave: WorkflowData = {
      statuses: override?.statuses || statuses(),
      transitions: override?.transitions || transitions(),
      strict: override?.strict !== undefined ? override.strict : strict(),
    };
    try {
      await projectsApi.updateWorkflow(proj.id, dataToSave);
      await updateProject(proj.id, {
        workflowStatuses: dataToSave.statuses,
        workflowData: dataToSave,
      });
      toast.addToast('Workflow configuration saved', 'success');
    } catch {
      toast.addToast('Failed to save workflow', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Node Dragging Handlers
  const handleNodeMouseDown = (e: MouseEvent, statusId: string) => {
    e.stopPropagation();
    const node = statuses().find((s) => s.id === statusId);
    if (!node) return;
    setDraggingNodeId(statusId);
    setDragOffset({
      x: e.clientX - (node.x || 0),
      y: e.clientY - (node.y || 0),
    });
  };

  const handleCanvasMouseMove = (e: MouseEvent) => {
    const id = draggingNodeId();
    if (!id) return;
    const offset = dragOffset();
    const newX = Math.max(20, Math.min(1400, e.clientX - offset.x));
    const newY = Math.max(20, Math.min(700, e.clientY - offset.y));

    setStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, x: newX, y: newY } : s)),
    );
  };

  const handleCanvasMouseUp = () => {
    if (draggingNodeId()) {
      setDraggingNodeId(null);
      handleSave();
    }
  };

  // Status Management
  const handleAddStatus = async () => {
    if (!newTitle().trim()) return;
    const slug = newTitle()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    const existing = statuses();
    const lastX = existing.length > 0 ? (existing[existing.length - 1].x || 60) + 280 : 60;
    const newStatus: WorkflowStatus = {
      id: slug,
      title: newTitle().trim(),
      category: newCategory(),
      color: newColor(),
      description: newDescription().trim() || undefined,
      x: lastX,
      y: 160,
    };
    const updated = [...existing, newStatus];
    setStatuses(updated);
    setAddStatusOpen(false);
    setNewTitle('');
    setNewDescription('');
    await handleSave({ statuses: updated });
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (statuses().length <= 2) {
      toast.addToast('Workflow must retain at least 2 statuses', 'error');
      return;
    }
    const updatedStatuses = statuses().filter((s) => s.id !== statusId);
    const updatedTransitions = transitions().filter(
      (t) => t.from !== statusId && t.to !== statusId,
    );
    setStatuses(updatedStatuses);
    setTransitions(updatedTransitions);
    await handleSave({ statuses: updatedStatuses, transitions: updatedTransitions });
  };

  // Transition Management
  const openLinkFrom = (statusId: string) => {
    setLinkingFromId(statusId);
    setTransitionFrom(statusId);
    const target = statuses().find((s) => s.id !== statusId);
    setTransitionTo(target ? target.id : '');
    setTransitionName('');
    setAddTransitionOpen(true);
  };

  const handleSaveTransition = async () => {
    const from = transitionFrom();
    const to = transitionTo();
    if (!from || !to) {
      toast.addToast('Please select both from and to statuses', 'error');
      return;
    }
    if (from === to) {
      toast.addToast('Cannot create a transition from a status to itself', 'error');
      return;
    }
    const exists = transitions().some((t) => t.from === from && t.to === to);
    if (exists) {
      toast.addToast('This transition arrow already exists', 'error');
      return;
    }

    const fromTitle = statuses().find((s) => s.id === from)?.title || from;
    const toTitle = statuses().find((s) => s.id === to)?.title || to;
    const name = transitionName().trim() || `Move to ${toTitle}`;

    const newTrans: WorkflowTransition = {
      id: `t_${Date.now()}`,
      from,
      to,
      name,
    };

    const updated = [...transitions(), newTrans];
    setTransitions(updated);
    setAddTransitionOpen(false);
    setLinkingFromId(null);
    setTransitionName('');
    toast.addToast(`Created transition: ${fromTitle} ➔ ${toTitle}`, 'success');
    await handleSave({ transitions: updated });
  };

  const handleDeleteTransition = async (transitionId: string) => {
    const updated = transitions().filter((t) => t.id !== transitionId);
    setTransitions(updated);
    await handleSave({ transitions: updated });
    toast.addToast('Transition removed', 'info');
  };

  const handleAutoLayout = () => {
    const ordered = [...statuses()];
    const updated = ordered.map((s, idx) => ({
      ...s,
      x: 60 + idx * 300,
      y: 180,
    }));
    setStatuses(updated);
    handleSave({ statuses: updated });
    toast.addToast('Auto-arranged workflow nodes', 'info');
  };

  const handleResetToDefault = () => {
    if (!confirm('Reset workflow to standard Agile Scrum/Kanban template?')) return;
    setStatuses(DEFAULT_WORKFLOW_STATUSES);
    setTransitions(DEFAULT_TRANSITIONS);
    setStrict(true);
    handleSave({
      statuses: DEFAULT_WORKFLOW_STATUSES,
      transitions: DEFAULT_TRANSITIONS,
      strict: true,
    });
    toast.addToast('Reset to default Agile workflow', 'success');
  };

  // Helper to compute SVG arrow paths
  const getPathForTransition = (t: WorkflowTransition) => {
    const fromNode = statuses().find((s) => s.id === t.from);
    const toNode = statuses().find((s) => s.id === t.to);
    if (!fromNode || !toNode) return { path: '', midX: 0, midY: 0 };

    const fX = (fromNode.x || 0);
    const fY = (fromNode.y || 0);
    const tX = (toNode.x || 0);
    const tY = (toNode.y || 0);

    const isForward = tX > fX;
    const isDirectNeighbor = Math.abs(tX - fX) < 400 && Math.abs(tY - fY) < 100;

    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    let cp1X = 0;
    let cp1Y = 0;
    let cp2X = 0;
    let cp2Y = 0;

    if (isForward && isDirectNeighbor) {
      // Horizontal straight-ish arrow from right of fromNode to left of toNode
      startX = fX + NODE_WIDTH;
      startY = fY + NODE_HEIGHT / 2;
      endX = tX;
      endY = tY + NODE_HEIGHT / 2;
      const dx = (endX - startX) * 0.5;
      cp1X = startX + dx;
      cp1Y = startY;
      cp2X = endX - dx;
      cp2Y = endY;
    } else if (isForward) {
      // Forward long hop: curve above
      startX = fX + NODE_WIDTH * 0.75;
      startY = fY;
      endX = tX + NODE_WIDTH * 0.25;
      endY = tY;
      const curveHeight = Math.min(120, Math.abs(tX - fX) * 0.25);
      cp1X = startX + 50;
      cp1Y = startY - curveHeight;
      cp2X = endX - 50;
      cp2Y = endY - curveHeight;
    } else {
      // Backward arrow: sweep below nodes cleanly
      startX = fX + NODE_WIDTH * 0.25;
      startY = fY + NODE_HEIGHT;
      endX = tX + NODE_WIDTH * 0.75;
      endY = tY + NODE_HEIGHT;
      const curveDepth = Math.max(90, Math.min(160, Math.abs(fX - tX) * 0.22));
      cp1X = startX - 40;
      cp1Y = startY + curveDepth;
      cp2X = endX + 40;
      cp2Y = endY + curveDepth;
    }

    const path = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
    // Approximate midpoint
    const midX = 0.125 * startX + 0.375 * cp1X + 0.375 * cp2X + 0.125 * endX;
    const midY = 0.125 * startY + 0.375 * cp1Y + 0.375 * cp2Y + 0.125 * endY;

    return { path, midX, midY };
  };

  return (
    <div class="space-y-4 pb-16 max-w-full">
      {/* Top Toolbar */}
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <GitFork class="w-6 h-6 text-blue-600" />
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">Interactive Workflow Editor</h1>
            <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
              {params.projectKey}
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Drag statuses anywhere on the canvas and connect pointer arrows between any states to enforce Kanban movement
          </p>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          {/* Strict Toggle */}
          <label class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition select-none">
            <input
              type="checkbox"
              checked={strict()}
              onChange={(e) => {
                setStrict(e.currentTarget.checked);
                handleSave({ strict: e.currentTarget.checked });
              }}
              class="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <ShieldCheck class="w-4 h-4 text-emerald-600" />
            <span>Strict Board Enforcement</span>
          </label>

          <button
            type="button"
            onClick={handleAutoLayout}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs transition"
          >
            <Move class="w-3.5 h-3.5" />
            <span>Auto Layout</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTransitionFrom(statuses()[0]?.id || '');
              setTransitionTo(statuses()[1]?.id || '');
              setTransitionName('');
              setAddTransitionOpen(true);
            }}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition"
          >
            <LinkIcon class="w-3.5 h-3.5" />
            <span>+ Link Arrow</span>
          </button>

          <button
            type="button"
            onClick={() => setAddStatusOpen(true)}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition"
          >
            <Plus class="w-4 h-4" />
            <span>+ Add Status</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            title="Reset to default template"
            class="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 transition"
          >
            <RotateCcw class="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Canvas Area */}
      <div
        class="relative w-full h-[620px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner select-none cursor-crosshair"
        style={{
          'background-image': 'radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)',
          'background-size': '24px 24px',
        }}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        {/* Helper Hint */}
        <div class="absolute top-3 left-4 pointer-events-none z-10 flex items-center gap-2 text-[11px] font-medium text-slate-500 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200/80 shadow-xs">
          <MousePointer class="w-3 h-3 text-blue-500" />
          <span>Drag status cards anywhere &bull; Click "Link Arrow" on any card to connect pointers</span>
        </div>

        {/* SVG Pointer Arrows Overlay */}
        <svg class="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <marker
              id="workflow-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#3b82f6" />
            </marker>
          </defs>

          {/* Render All Transitions */}
          <For each={transitions()}>
            {(t) => {
              const geom = () => getPathForTransition(t);
              return (
                <g class="transition-all duration-150">
                  <path
                    d={geom().path}
                    fill="none"
                    stroke="#3b82f6"
                    stroke-width="2.5"
                    stroke-dasharray="none"
                    marker-end="url(#workflow-arrow)"
                    class="drop-shadow-xs"
                  />
                </g>
              );
            }}
          </For>
        </svg>

        {/* Transition Labels & Delete Buttons (Rendered above SVG) */}
        <For each={transitions()}>
          {(t) => {
            const geom = () => getPathForTransition(t);
            return (
              <div
                class="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 shadow-sm rounded-full text-[10px] font-semibold text-slate-700 hover:border-red-300 hover:text-red-700 group transition-all"
                style={{
                  left: `${geom().midX}px`,
                  top: `${geom().midY}px`,
                }}
              >
                <span>{t.name || 'Transition'}</span>
                <button
                  type="button"
                  title="Remove this transition arrow"
                  onClick={() => handleDeleteTransition(t.id)}
                  class="p-0.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            );
          }}
        </For>

        {/* Draggable Status Nodes */}
        <For each={statuses()}>
          {(status) => {
            const isDragging = () => draggingNodeId() === status.id;
            return (
              <div
                class={`absolute z-20 w-[220px] bg-white rounded-2xl border-2 transition-shadow shadow-sm cursor-grab active:cursor-grabbing select-none ${
                  isDragging()
                    ? 'shadow-xl ring-2 ring-blue-500 border-blue-500 scale-102'
                    : 'border-slate-200/90 hover:border-blue-400 hover:shadow-md'
                }`}
                style={{
                  left: `${status.x || 60}px`,
                  top: `${status.y || 160}px`,
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, status.id)}
              >
                {/* Node Header & Color strip */}
                <div class="p-3.5 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span
                        class="w-3.5 h-3.5 rounded-full shadow-xs"
                        style={{ 'background-color': status.color }}
                      />
                      <span class="font-bold text-slate-900 text-xs truncate max-w-[120px]">
                        {status.title}
                      </span>
                    </div>

                    <button
                      type="button"
                      title="Delete status"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStatus(status.id);
                      }}
                      class="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p class="text-[11px] text-slate-500 truncate">
                    {status.description || `Category: ${status.category}`}
                  </p>

                  <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span
                      class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        'background-color': `${status.color}15`,
                        color: status.color,
                      }}
                    >
                      {status.category}
                    </span>

                    {/* Quick Link Arrow Trigger */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLinkFrom(status.id);
                      }}
                      class="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <LinkIcon class="w-3 h-3" />
                      <span>Link Arrow</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        </For>
      </div>

      {/* Info Tip & Active Rules */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1">
          <div class="font-bold flex items-center gap-1.5">
            <Info class="w-4 h-4 text-blue-600" />
            <span>Kanban Board Strict Rules</span>
          </div>
          <p class="text-slate-700">
            {strict()
              ? 'Strict enforcement is ACTIVE. Cards on the Kanban board and status selectors can ONLY be moved along the blue arrows configured above.'
              : 'Strict enforcement is OFF. Issues can be moved freely between any columns.'}
          </p>
        </div>

        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <div class="font-bold text-slate-900">Current Transition Rules ({transitions().length} pointers)</div>
          <p class="text-slate-500 truncate">
            {transitions()
              .map((t) => `${t.from} ➔ ${t.to}`)
              .join(', ')}
          </p>
        </div>
      </div>

      {/* Add Status Modal */}
      <Show when={addStatusOpen()}>
        <Modal
          open={addStatusOpen()}
          onClose={() => setAddStatusOpen(false)}
          title="Add New Workflow Status"
          size="sm"
        >
          <div class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Status Name *</label>
              <input
                type="text"
                placeholder="e.g. Blocked, In QA, Ready to Ship"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                value={newTitle()}
                onInput={(e) => setNewTitle(e.currentTarget.value)}
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Category</label>
              <RichSelect
                options={categoryOptions}
                value={newCategory()}
                onChange={(val) => setNewCategory(val as WorkflowStatus['category'])}
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Color</label>
              <div class="flex items-center gap-2 flex-wrap">
                <For each={colorPresets}>
                  {(clr) => (
                    <button
                      type="button"
                      onClick={() => setNewColor(clr)}
                      class={`w-6 h-6 rounded-full border-2 transition-transform ${
                        newColor() === clr ? 'scale-125 border-slate-900 ring-2 ring-blue-300' : 'border-white'
                      }`}
                      style={{ 'background-color': clr }}
                    />
                  )}
                </For>
              </div>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
              <textarea
                placeholder="When should an issue be in this status?"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 resize-none h-16"
                value={newDescription()}
                onInput={(e) => setNewDescription(e.currentTarget.value)}
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setAddStatusOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleAddStatus}>
                Create Status
              </Button>
            </div>
          </div>
        </Modal>
      </Show>

      {/* Add Transition Arrow Modal */}
      <Show when={addTransitionOpen()}>
        <Modal
          open={addTransitionOpen()}
          onClose={() => setAddTransitionOpen(false)}
          title="Connect Pointer / Transition Arrow"
          size="sm"
        >
          <div class="space-y-4 text-xs">
            <p class="text-slate-500 text-[11px]">
              Define an allowable progression step. Tasks can be moved on the Kanban board from the source status to the target status.
            </p>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">From Status (Source) *</label>
              <select
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                value={transitionFrom()}
                onChange={(e) => setTransitionFrom(e.currentTarget.value)}
              >
                <For each={statuses()}>
                  {(s) => <option value={s.id}>{s.title}</option>}
                </For>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">To Status (Target) *</label>
              <select
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                value={transitionTo()}
                onChange={(e) => setTransitionTo(e.currentTarget.value)}
              >
                <For each={statuses()}>
                  {(s) => <option value={s.id}>{s.title}</option>}
                </For>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Action Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Start Work, Submit Review, Fast Track"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                value={transitionName()}
                onInput={(e) => setTransitionName(e.currentTarget.value)}
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setAddTransitionOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveTransition}>
                Create Arrow
              </Button>
            </div>
          </div>
        </Modal>
      </Show>
    </div>
  );
}
export default WorkflowPage;
