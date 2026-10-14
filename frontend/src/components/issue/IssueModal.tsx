import { createSignal, createEffect, onMount, Show, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import { clsx } from 'clsx';
import {
  X,
  Bookmark,
  Bug,
  CheckSquare,
  Layers,
  GitBranch,
  Copy,
  Check,
  ExternalLink,
  ChevronsUp,
  ChevronUp,
  Minus,
  ChevronDown,
  ChevronsDown,
  MessageSquare,
  Clock,
  User,
  Plus,
  Pencil,
} from 'lucide-solid';
import { issuesApi, commentsApi } from '@/api/endpoints';
import {
  updateIssue,
  assignIssue,
  projectMembers,
  fetchProjectMembers,
  isTransitionAllowed,
} from '@/stores/project.store';
import { user } from '@/stores/auth.store';
import { useToast } from '@/components/ui/Toast';
import { RichSelect, RichSelectOption } from '@/components/ui/RichSelect';
import { RichTextEditor, MarkdownViewer } from '@/components/ui/RichTextEditor';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Issue, Comment, WorkLog, IssueStatus, IssuePriority, IssueType } from '@/types';

interface IssueModalProps {
  issue: Issue;
  projectKey: string;
  onClose: () => void;
  onUpdated?: (issue: Issue) => void;
}

const statusOptions: RichSelectOption[] = [
  { value: 'todo', label: 'To Do', color: '#94a3b8', badge: 'OPEN' },
  { value: 'in_progress', label: 'In Progress', color: '#3b82f6', badge: 'IN PROGRESS' },
  { value: 'in_review', label: 'In Review', color: '#8b5cf6', badge: 'IN REVIEW' },
  { value: 'done', label: 'Done', color: '#22c55e', badge: 'RESOLVED' },
];

const priorityOptions: RichSelectOption[] = [
  {
    value: 'highest',
    label: 'Highest',
    icon: <ChevronsUp class="w-4 h-4 text-red-600 stroke-[2.5]" />,
    color: '#dc2626',
  },
  {
    value: 'high',
    label: 'High',
    icon: <ChevronUp class="w-4 h-4 text-orange-500 stroke-[2.5]" />,
    color: '#f97316',
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: <Minus class="w-4 h-4 text-yellow-500 stroke-[2.5]" />,
    color: '#eab308',
  },
  {
    value: 'low',
    label: 'Low',
    icon: <ChevronDown class="w-4 h-4 text-blue-500 stroke-[2.5]" />,
    color: '#3b82f6',
  },
  {
    value: 'lowest',
    label: 'Lowest',
    icon: <ChevronsDown class="w-4 h-4 text-slate-400 stroke-[2.5]" />,
    color: '#94a3b8',
  },
];

export function IssueModal(props: IssueModalProps) {
  const toast = useToast();
  const [localIssue, setLocalIssue] = createSignal<Issue>(props.issue);
  const [comments, setComments] = createSignal<Comment[]>([]);
  const [workLogs, setWorkLogs] = createSignal<WorkLog[]>([]);
  const [activeTab, setActiveTab] = createSignal<'comments' | 'worklogs'>('comments');
  const [newComment, setNewComment] = createSignal('');
  const [editingTitle, setEditingTitle] = createSignal(false);
  const [title, setTitle] = createSignal(props.issue.title);
  const [description, setDescription] = createSignal(props.issue.description ?? '');
  const [editingDescription, setEditingDescription] = createSignal(false);
  const [savingDescription, setSavingDescription] = createSignal(false);
  const [savingComment, setSavingComment] = createSignal(false);
  const [loadingComments, setLoadingComments] = createSignal(false);
  const [copiedBranch, setCopiedBranch] = createSignal(false);

  // Log work modal
  const [logWorkModalOpen, setLogWorkModalOpen] = createSignal(false);
  const [logHours, setLogHours] = createSignal('');
  const [logDate, setLogDate] = createSignal(new Date().toISOString().slice(0, 10));
  const [logDescription, setLogDescription] = createSignal('');
  const [savingLog, setSavingLog] = createSignal(false);

  onMount(() => {
    fetchProjectMembers(props.issue.projectId);
    loadComments();
    loadWorkLogs();
  });

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await commentsApi.list(localIssue().id);
      setComments(res.data);
    } catch {
      // Ignored
    } finally {
      setLoadingComments(false);
    }
  };

  const loadWorkLogs = async () => {
    try {
      const res = await issuesApi.getWorkLogs(localIssue().id);
      setWorkLogs(res.data);
    } catch {
      // Ignored
    }
  };

  const handleFieldUpdate = async (field: keyof Issue, value: unknown) => {
    const prev = localIssue();
    if (field === 'status') {
      const newStatus = String(value);
      if (!isTransitionAllowed(prev.status, newStatus)) {
        toast.addToast(`Workflow restriction: Transition from '${prev.status}' to '${newStatus}' is not permitted by project workflow.`, 'error');
        return;
      }
    }
    setLocalIssue({ ...prev, [field]: value } as Issue);
    try {
      const payloadKey =
        field === 'startDate'
          ? 'start_date'
          : field === 'dueDate'
          ? 'due_date'
          : field === 'reporterId'
          ? 'reporter_id'
          : field === 'assigneeId'
          ? 'assignee_id'
          : field;
      await updateIssue(prev.projectId, prev.id, { [payloadKey]: value });
      props.onUpdated?.({ ...prev, [field]: value } as Issue);
    } catch (err: unknown) {
      setLocalIssue(prev);
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr?.response?.data?.error || 'Failed to update issue';
      toast.addToast(msg, 'error');
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    try {
      await assignIssue(localIssue().id, userId || null);
      const member = projectMembers.find((u) => String(u.id) === String(userId));
      setLocalIssue((prev) => ({
        ...prev,
        assigneeId: userId || undefined,
        assignee: member || undefined,
      }));
      props.onUpdated?.(localIssue());
      toast.addToast(`Assigned to ${member?.name || 'Unassigned'}`, 'success');
    } catch {
      toast.addToast('Failed to update assignee', 'error');
    }
  };

  const handleReporterChange = async (userId: string) => {
    try {
      await updateIssue(localIssue().projectId, localIssue().id, { reporter_id: userId || undefined });
      const member = projectMembers.find((u) => String(u.id) === String(userId));
      setLocalIssue((prev) => ({
        ...prev,
        reporterId: userId || undefined,
        reporter: member || undefined,
      }));
      props.onUpdated?.(localIssue());
      toast.addToast(`Reporter set to ${member?.name || 'None'}`, 'success');
    } catch {
      toast.addToast('Failed to update reporter', 'error');
    }
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    if (title().trim() && title() !== localIssue().title) {
      await handleFieldUpdate('title', title().trim());
    }
  };

  const saveDescription = async () => {
    if (description() !== (localIssue().description ?? '')) {
      setSavingDescription(true);
      try {
        await handleFieldUpdate('description', description());
        toast.addToast('Description saved', 'success');
        setEditingDescription(false);
      } catch {
        toast.addToast('Failed to save description', 'error');
      } finally {
        setSavingDescription(false);
      }
    } else {
      setEditingDescription(false);
    }
  };

  const submitComment = async () => {
    if (!newComment().trim()) return;
    setSavingComment(true);
    try {
      const res = await commentsApi.create(localIssue().id, newComment());
      setComments((cs) => [...cs, res.data]);
      setNewComment('');
    } catch {
      toast.addToast('Failed to add comment', 'error');
    } finally {
      setSavingComment(false);
    }
  };

  const handleLogWork = async () => {
    const hours = parseFloat(logHours());
    if (isNaN(hours) || hours <= 0) {
      toast.addToast('Please enter valid hours greater than 0', 'error');
      return;
    }
    setSavingLog(true);
    try {
      const res = await issuesApi.logWork(localIssue().id, {
        hours,
        logged_date: logDate(),
        description: logDescription().trim() || undefined,
      });

      const newTotal = res.data?.total_logged || (localIssue().loggedHours || 0) + hours;
      setLocalIssue((prev) => ({ ...prev, loggedHours: newTotal }));
      props.onUpdated?.(localIssue());

      setLogWorkModalOpen(false);
      setLogHours('');
      setLogDescription('');
      loadWorkLogs();
      toast.addToast(`Logged ${hours}h successfully`, 'success');
    } catch {
      toast.addToast('Failed to log work', 'error');
    } finally {
      setSavingLog(false);
    }
  };

  const issueKey = () =>
    localIssue().key ||
    (props.projectKey
      ? `${props.projectKey}-${localIssue().number || localIssue().id}`
      : `#${localIssue().id}`);

  const branchName = () => {
    const slug = localIssue()
      .title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30);
    return `feature/${issueKey()}-${slug}`;
  };

  const copyBranchCommand = () => {
    navigator.clipboard.writeText(`git checkout -b ${branchName()}`);
    setCopiedBranch(true);
    setTimeout(() => setCopiedBranch(false), 2000);
    toast.addToast('Copied git branch command', 'info');
  };

  const renderTypeIcon = (type: IssueType) => {
    switch (type) {
      case 'story':
        return <Bookmark class="w-4 h-4 text-emerald-600 fill-emerald-500/20 shrink-0" />;
      case 'bug':
        return <Bug class="w-4 h-4 text-red-600 fill-red-500/20 shrink-0" />;
      case 'subtask':
        return <Layers class="w-4 h-4 text-slate-500 fill-slate-500/20 shrink-0" />;
      default:
        return <CheckSquare class="w-4 h-4 text-blue-600 fill-blue-500/20 shrink-0" />;
    }
  };

  const assigneeOptions = (): RichSelectOption[] => [
    { value: '', label: 'Unassigned', icon: <User class="w-4 h-4 text-slate-400" /> },
    ...projectMembers.map((u) => ({
      value: u.id,
      label: u.name || u.email,
      icon: (
        <div class="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
          {(u.name || u.email).slice(0, 2).toUpperCase()}
        </div>
      ),
      description: u.email,
    })),
  ];

  const reporterOptions = (): RichSelectOption[] => [
    { value: '', label: 'None', icon: <User class="w-4 h-4 text-slate-400" /> },
    ...projectMembers.map((u) => ({
      value: u.id,
      label: u.name || u.email,
      icon: (
        <div class="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
          {(u.name || u.email).slice(0, 2).toUpperCase()}
        </div>
      ),
      description: u.email,
    })),
  ];

  return (
    <Portal>
      <div
        class="fixed inset-0 z-50 flex"
        onKeyDown={(e) => e.key === 'Escape' && props.onClose()}
      >
        {/* Backdrop */}
        <div
          class="flex-1 bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={props.onClose}
        />

        {/* Panel */}
        <div class="slide-in-right bg-white w-full max-w-4xl flex flex-col shadow-modal overflow-hidden h-full">
          {/* Header */}
          <div class="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50/80">
            <div class="flex items-center gap-2.5 text-sm">
              <span class="font-bold text-slate-700">{props.projectKey}</span>
              <span class="text-slate-300">/</span>
              <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-xs">
                {renderTypeIcon(localIssue().type)}
                <span class="font-mono font-bold text-xs text-slate-800">{issueKey()}</span>
              </div>
            </div>
            <button
              onClick={props.onClose}
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div class="flex flex-1 overflow-hidden">
            {/* Left: main content */}
            <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Title */}
              <div>
                <Show
                  when={editingTitle()}
                  fallback={
                    <h2
                      onClick={() => setEditingTitle(true)}
                      class="text-xl font-bold text-slate-900 hover:bg-slate-50 rounded-lg p-2 -ml-2 cursor-pointer transition-colors"
                      title="Click to edit"
                    >
                      {localIssue().title}
                    </h2>
                  }
                >
                  <input
                    type="text"
                    value={title()}
                    onInput={(e) => setTitle(e.currentTarget.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle();
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                    class="w-full text-xl font-bold border border-blue-500 rounded-lg p-2 outline-none ring-2 ring-blue-100"
                    autofocus
                  />
                </Show>
              </div>

              {/* Description */}
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Description
                  </label>
                  <Show when={!editingDescription()}>
                    <button
                      type="button"
                      onClick={() => setEditingDescription(true)}
                      class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold transition"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </Show>
                </div>

                <Show
                  when={editingDescription()}
                  fallback={
                    <div
                      onClick={() => setEditingDescription(true)}
                      class="p-3.5 min-h-[90px] border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition"
                      title="Click to edit description"
                    >
                      <MarkdownViewer
                        content={description()}
                        emptyPlaceholder="Click here to add a description... (Markdown supported)"
                      />
                    </div>
                  }
                >
                  <RichTextEditor
                    value={description()}
                    onChange={setDescription}
                    minHeight="140px"
                    showSaveCancel
                    onSave={saveDescription}
                    onCancel={() => {
                      setDescription(localIssue().description ?? '');
                      setEditingDescription(false);
                    }}
                    saving={savingDescription()}
                    autoFocus
                  />
                </Show>
              </div>

              {/* Development / GitHub Branch helper */}
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <GitBranch class="w-4 h-4 text-slate-700" />
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-700">
                      GitHub Development
                    </span>
                  </div>
                  <button
                    onClick={copyBranchCommand}
                    class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition shadow-xs"
                  >
                    <Show when={copiedBranch()} fallback={<Copy class="w-3.5 h-3.5" />}>
                      <Check class="w-3.5 h-3.5 text-emerald-600" />
                    </Show>
                    <span>{copiedBranch() ? 'Copied' : 'Copy branch command'}</span>
                  </button>
                </div>
                <code class="block text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-200 text-slate-800 break-all select-all">
                  git checkout -b {branchName()}
                </code>
                <p class="text-[11px] text-slate-500 mt-2">
                  Reference{' '}
                  <span class="font-mono font-semibold text-slate-700">{issueKey()}</span> in branch,
                  commit message, or PR title for automatic bot linking.
                </p>
              </div>

              {/* Activity Section: Tabs for Comments and Work Logs */}
              <div>
                <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                  <div class="flex items-center gap-4">
                    <button
                      onClick={() => setActiveTab('comments')}
                      class={clsx(
                        'flex items-center gap-2 text-xs font-bold pb-2 -mb-2 border-b-2 transition',
                        activeTab() === 'comments'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      )}
                    >
                      <MessageSquare class="w-4 h-4" />
                      <span>Comments ({comments().length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('worklogs')}
                      class={clsx(
                        'flex items-center gap-2 text-xs font-bold pb-2 -mb-2 border-b-2 transition',
                        activeTab() === 'worklogs'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      )}
                    >
                      <Clock class="w-4 h-4" />
                      <span>Work Log ({workLogs().length})</span>
                    </button>
                  </div>

                  <Show when={activeTab() === 'worklogs'}>
                    <button
                      onClick={() => setLogWorkModalOpen(true)}
                      class="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium transition"
                    >
                      <Plus class="w-3.5 h-3.5" />
                      <span>Log Time</span>
                    </button>
                  </Show>
                </div>

                {/* Tab: Comments */}
                <Show when={activeTab() === 'comments'}>
                  <div class="space-y-4">
                    <div class="space-y-3 mb-4">
                      <Show when={loadingComments()}>
                        <div class="py-4 text-center">
                          <Spinner size="sm" />
                        </div>
                      </Show>
                      <For each={comments()}>
                        {(comment) => (
                          <div class="flex gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <Avatar
                              name={comment.author?.name || 'GitHub Bot'}
                              src={comment.author?.avatarUrl}
                              size="sm"
                            />
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center gap-2 mb-1">
                                <span class="text-xs font-semibold text-slate-800">
                                  {comment.author?.name || 'GitHub Bot'}
                                </span>
                                <span class="text-[11px] text-slate-400">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <MarkdownViewer content={comment.body} class="mt-1" />
                            </div>
                          </div>
                        )}
                      </For>
                    </div>

                    <div class="flex gap-3 items-start">
                      <Avatar name={user()?.name} src={user()?.avatarUrl} size="sm" />
                      <div class="flex-1 space-y-2">
                        <RichTextEditor
                          value={newComment()}
                          onChange={setNewComment}
                          placeholder="Add a comment... (Markdown supported)"
                          minHeight="90px"
                          onSubmitShortcut={submitComment}
                        />
                        <div class="flex justify-end">
                          <button
                            onClick={submitComment}
                            disabled={savingComment() || !newComment().trim()}
                            class="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
                          >
                            {savingComment() ? 'Saving…' : 'Comment'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Tab: Work Logs */}
                <Show when={activeTab() === 'worklogs'}>
                  <div class="space-y-3">
                    <Show
                      when={workLogs().length > 0}
                      fallback={
                        <div class="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                          No work logged yet. Click "+ Log Work" to log time spent on this issue.
                        </div>
                      }
                    >
                      <For each={workLogs()}>
                        {(log) => (
                          <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                            <div class="flex items-center gap-3">
                              <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                {log.hours}h
                              </div>
                              <div>
                                <div class="font-semibold text-slate-800">
                                  {log.user?.name || 'User'} logged {log.hours} hours
                                </div>
                                <Show when={log.description}>
                                  <p class="text-slate-500 mt-0.5">{log.description}</p>
                                </Show>
                              </div>
                            </div>
                            <span class="text-slate-400 font-mono text-[11px]">{log.loggedDate}</span>
                          </div>
                        )}
                      </For>
                    </Show>
                  </div>
                </Show>
              </div>
            </div>

            {/* Right: metadata sidebar */}
            <div class="w-72 border-l border-slate-200 bg-slate-50/70 overflow-y-auto px-5 py-6 space-y-5 flex-shrink-0">
              {/* Status RichSelect */}
              <div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Status</p>
                <RichSelect
                  value={localIssue().status}
                  options={statusOptions}
                  onChange={(val) => handleFieldUpdate('status', val as IssueStatus)}
                  fullWidth
                  size="sm"
                />
              </div>

              {/* Priority RichSelect */}
              <div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Priority</p>
                <RichSelect
                  value={localIssue().priority}
                  options={priorityOptions}
                  onChange={(val) => handleFieldUpdate('priority', val as IssuePriority)}
                  fullWidth
                  size="sm"
                />
              </div>

              {/* Working Assignee RichSelect */}
              <div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Assignee</p>
                <RichSelect
                  value={localIssue().assigneeId || ''}
                  options={assigneeOptions()}
                  onChange={handleAssigneeChange}
                  fullWidth
                  size="sm"
                />
              </div>

              {/* Reporter RichSelect */}
              <div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reporter</p>
                <RichSelect
                  value={localIssue().reporterId || ''}
                  options={reporterOptions()}
                  onChange={handleReporterChange}
                  fullWidth
                  size="sm"
                />
              </div>

              {/* Time Tracking Widget */}
              <div class="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Clock class="w-3.5 h-3.5 text-blue-600" />
                    <span>Time Tracking</span>
                  </div>
                  <button
                    onClick={() => setLogWorkModalOpen(true)}
                    class="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition"
                  >
                    + Log Work
                  </button>
                </div>

                <div class="space-y-1">
                  <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                      class="h-full bg-blue-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          localIssue().estimatedHours
                            ? ((localIssue().loggedHours || 0) / localIssue().estimatedHours!) * 100
                            : localIssue().loggedHours
                            ? 100
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                  <div class="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Logged: <strong class="text-slate-800">{localIssue().loggedHours || 0}h</strong>
                    </span>
                    <span>
                      Est:{' '}
                      <strong class="text-slate-800">
                        {localIssue().estimatedHours ? `${localIssue().estimatedHours}h` : 'None'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates: Start Date & Due Date */}
              <div class="space-y-3">
                <div>
                  <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Start Date
                  </p>
                  <input
                    type="date"
                    class="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={localIssue().startDate?.slice(0, 10) ?? ''}
                    onChange={(e) => handleFieldUpdate('startDate', e.currentTarget.value || null)}
                  />
                </div>

                <div>
                  <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Due Date
                  </p>
                  <input
                    type="date"
                    class="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={localIssue().dueDate?.slice(0, 10) ?? ''}
                    onChange={(e) => handleFieldUpdate('dueDate', e.currentTarget.value || null)}
                  />
                </div>
              </div>

              {/* Story Points */}
              <div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Story Points
                </p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={localIssue().storyPoints ?? ''}
                  placeholder="None"
                  onBlur={(e) => {
                    const v = parseInt(e.currentTarget.value, 10);
                    handleFieldUpdate('storyPoints', isNaN(v) ? null : v);
                  }}
                />
              </div>

              {/* Labels */}
              <Show when={localIssue().labels && localIssue().labels!.length > 0}>
                <div>
                  <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Labels</p>
                  <div class="flex flex-wrap gap-1">
                    <For each={localIssue().labels}>
                      {(label) => <Badge color={label.color}>{label.name}</Badge>}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>

      {/* Log Work Modal */}
      <Modal
        open={logWorkModalOpen()}
        onClose={() => setLogWorkModalOpen(false)}
        title="Log Work"
        size="md"
      >
        <div class="px-6 py-5 space-y-4">
          <Input
            label="Time Spent (Hours) *"
            type="number"
            step="0.25"
            min="0.25"
            placeholder="e.g. 1.5, 2, 4"
            value={logHours()}
            onInput={(e) => setLogHours(e.currentTarget.value)}
            fullWidth
          />

          <div>
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">
              Date Worked
            </label>
            <input
              type="date"
              class="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              value={logDate()}
              onChange={(e) => setLogDate(e.currentTarget.value)}
            />
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">
              Work Description (optional)
            </label>
            <textarea
              class="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[80px]"
              placeholder="What did you work on?"
              value={logDescription()}
              onInput={(e) => setLogDescription(e.currentTarget.value)}
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50/50 rounded-b-xl">
          <Button variant="secondary" onClick={() => setLogWorkModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleLogWork} loading={savingLog()}>
            Log Time
          </Button>
        </div>
      </Modal>
    </Portal>
  );
}

