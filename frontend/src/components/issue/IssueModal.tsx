import { createSignal, createEffect, Show, For } from 'solid-js';
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
} from 'lucide-solid';
import { issuesApi, commentsApi } from '@/api/endpoints';
import { updateIssue } from '@/stores/project.store';
import { user } from '@/stores/auth.store';
import { useToast } from '@/components/ui/Toast';
import { RichSelect, RichSelectOption } from '@/components/ui/RichSelect';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { Issue, Comment, IssueStatus, IssuePriority, IssueType } from '@/types';

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
  const [newComment, setNewComment] = createSignal('');
  const [editingTitle, setEditingTitle] = createSignal(false);
  const [title, setTitle] = createSignal(props.issue.title);
  const [description, setDescription] = createSignal(props.issue.description ?? '');
  const [savingComment, setSavingComment] = createSignal(false);
  const [loadingComments, setLoadingComments] = createSignal(false);
  const [copiedBranch, setCopiedBranch] = createSignal(false);

  createEffect(() => {
    loadComments();
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

  const handleFieldUpdate = async (field: keyof Issue, value: unknown) => {
    const prev = localIssue();
    setLocalIssue({ ...prev, [field]: value } as Issue);
    try {
      await updateIssue(prev.projectId, prev.id, { [field]: value });
      props.onUpdated?.({ ...prev, [field]: value } as Issue);
    } catch {
      setLocalIssue(prev);
      toast.addToast('Failed to update issue', 'error');
    }
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    if (title().trim() && title() !== localIssue().title) {
      await handleFieldUpdate('title', title().trim());
    }
  };

  const saveDescription = async () => {
    if (description() !== localIssue().description) {
      await handleFieldUpdate('description', description());
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

  const issueKey = () =>
    localIssue().key || (props.projectKey ? `${props.projectKey}-${localIssue().number || localIssue().id}` : `#${localIssue().id}`);

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
        return <Bookmark class="w-4 h-4 text-emerald-600 fill-emerald-500/20" />;
      case 'bug':
        return <Bug class="w-4 h-4 text-red-600 fill-red-500/20" />;
      case 'subtask':
        return <Layers class="w-4 h-4 text-slate-500 fill-slate-500/20" />;
      default:
        return <CheckSquare class="w-4 h-4 text-blue-600 fill-blue-500/20" />;
    }
  };

  return (
    <Portal>
      <div
        class="fixed inset-0 z-50 flex"
        onKeyDown={(e) => e.key === 'Escape' && props.onClose()}
      >
        {/* Backdrop */}
        <div class="flex-1 bg-black/40 backdrop-blur-xs transition-opacity" onClick={props.onClose} />

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
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">
                  Description
                </label>
                <textarea
                  class="w-full text-sm border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y min-h-[120px] transition-colors"
                  placeholder="Add a description to give context..."
                  value={description()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  onBlur={saveDescription}
                />
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
                  Reference <span class="font-mono font-semibold text-slate-700">{issueKey()}</span> in branch, commit message, or PR title for automatic bot linking.
                </p>
              </div>

              {/* Activity / Comments */}
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <MessageSquare class="w-4 h-4 text-slate-500" />
                  <h3 class="text-sm font-bold text-slate-700">Activity & Comments</h3>
                </div>

                {/* Comment list */}
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
                          <div class="text-sm text-slate-700 whitespace-pre-wrap prose-sm">
                            {comment.body}
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>

                {/* New comment input */}
                <div class="flex gap-3">
                  <Avatar name={user()?.name} src={user()?.avatarUrl} size="sm" />
                  <div class="flex-1 space-y-2">
                    <textarea
                      class="w-full text-sm border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none min-h-[80px]"
                      placeholder="Add a comment... (Markdown supported)"
                      value={newComment()}
                      onInput={(e) => setNewComment(e.currentTarget.value)}
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

              {/* Assignee */}
              <div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Assignee</p>
                <div class="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200">
                  <Avatar name={localIssue().assignee?.name} src={localIssue().assignee?.avatarUrl} size="sm" />
                  <span class="text-xs font-medium text-slate-700 truncate">
                    {localIssue().assignee?.name ?? 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Reporter */}
              <div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reporter</p>
                <div class="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200">
                  <Avatar name={localIssue().reporter?.name} src={localIssue().reporter?.avatarUrl} size="sm" />
                  <span class="text-xs font-medium text-slate-700 truncate">
                    {localIssue().reporter?.name ?? '—'}
                  </span>
                </div>
              </div>

              {/* Story Points */}
              <div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Story Points</p>
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

              {/* Due Date */}
              <div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Due Date</p>
                <input
                  type="date"
                  class="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={localIssue().dueDate?.slice(0, 10) ?? ''}
                  onChange={(e) => handleFieldUpdate('dueDate', e.currentTarget.value)}
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
    </Portal>
  );
}
