import { createSignal, createEffect, Show, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import { clsx } from 'clsx';
import { issuesApi, commentsApi } from '@/api/endpoints';
import { updateIssue } from '@/stores/project.store';
import { user } from '@/stores/auth.store';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge, statusConfig } from './StatusBadge';
import { PriorityBadge, priorityConfig } from './PriorityBadge';
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

const typeColors: Record<IssueType, string> = {
  story: '#22c55e',
  bug: '#ef4444',
  task: '#3b82f6',
  subtask: '#6b7280',
};

const typeLabels: Record<IssueType, string> = {
  story: 'Story',
  bug: 'Bug',
  task: 'Task',
  subtask: 'Subtask',
};

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

  createEffect(() => {
    loadComments();
  });

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await commentsApi.list(localIssue().id);
      setComments(res.data);
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
    if (title() !== localIssue().title) {
      await handleFieldUpdate('title', title());
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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose();
  };

  const issue = () => localIssue();

  return (
    <Portal>
      <div
        class="fixed inset-0 z-50 flex"
        onKeyDown={handleKeyDown}
      >
        {/* Backdrop */}
        <div class="flex-1 bg-black/40" onClick={props.onClose} />

        {/* Panel */}
        <div class="slide-in-right bg-white w-full max-w-4xl flex flex-col shadow-modal overflow-hidden">
          {/* Header */}
          <div class="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
            <div class="flex items-center gap-2 text-sm text-slate-500">
              <span class="font-medium text-slate-700">{props.projectKey}</span>
              <span>/</span>
              {issue().epicId && <span class="text-indigo-600">Epic</span>}
              {issue().epicId && <span>/</span>}
              <span
                class="font-semibold px-1.5 py-0.5 rounded text-xs"
                style={{ 'background-color': typeColors[issue().type] + '22', color: typeColors[issue().type] }}
              >
                {issue().key}
              </span>
            </div>
            <button
              onClick={props.onClose}
              class="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div class="flex flex-1 overflow-hidden">
            {/* Left: main content */}
            <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Type badge */}
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                  style={{ 'background-color': typeColors[issue().type] + '22', color: typeColors[issue().type] }}
                >
                  {typeLabels[issue().type]}
                </span>
                <PriorityBadge priority={issue().priority} showLabel />
              </div>

              {/* Title */}
              <Show
                when={editingTitle()}
                fallback={
                  <h1
                    class="text-xl font-bold text-slate-900 cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1 py-0.5"
                    onClick={() => setEditingTitle(true)}
                  >
                    {issue().title}
                  </h1>
                }
              >
                <input
                  autofocus
                  class="w-full text-xl font-bold text-slate-900 border border-indigo-400 rounded px-1 py-0.5 outline-none focus:ring-2 focus:ring-indigo-200"
                  value={title()}
                  onInput={(e) => setTitle(e.currentTarget.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                />
              </Show>

              {/* Description */}
              <div>
                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</h3>
                <textarea
                  class="w-full min-h-[120px] text-sm text-slate-700 border border-transparent hover:border-slate-300 focus:border-indigo-400 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-100 resize-y transition-colors issue-description"
                  placeholder="Add a description..."
                  value={description()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  onBlur={saveDescription}
                />
              </div>

              {/* Comments */}
              <div>
                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Comments ({comments().length})
                </h3>
                <Show when={loadingComments()}>
                  <Spinner size="sm" />
                </Show>
                <div class="space-y-4">
                  <For each={comments()}>
                    {(comment) => (
                      <div class="flex gap-3">
                        <Avatar name={comment.author?.name} src={comment.author?.avatarUrl} size="sm" />
                        <div class="flex-1">
                          <div class="flex items-baseline gap-2">
                            <span class="text-sm font-semibold text-slate-800">{comment.author?.name}</span>
                            <span class="text-xs text-slate-400">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p class="text-sm text-slate-700 mt-0.5">{comment.body}</p>
                        </div>
                      </div>
                    )}
                  </For>
                </div>

                {/* New comment */}
                <div class="flex gap-3 mt-4">
                  <Avatar name={user()?.name} src={user()?.avatarUrl} size="sm" />
                  <div class="flex-1 space-y-2">
                    <textarea
                      class="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                      rows={3}
                      placeholder="Add a comment..."
                      value={newComment()}
                      onInput={(e) => setNewComment(e.currentTarget.value)}
                    />
                    <button
                      onClick={submitComment}
                      disabled={savingComment() || !newComment().trim()}
                      class="px-3 py-1.5 text-xs font-semibold bg-indigo-700 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50 transition-colors"
                    >
                      {savingComment() ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: metadata sidebar */}
            <div class="w-64 border-l border-slate-200 bg-slate-50 overflow-y-auto px-4 py-5 space-y-4 flex-shrink-0">
              {/* Status */}
              <div>
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</p>
                <select
                  class="w-full text-sm bg-white border border-slate-300 rounded-md px-2 py-1.5 outline-none focus:border-indigo-400"
                  value={issue().status}
                  onChange={(e) => handleFieldUpdate('status', e.currentTarget.value as IssueStatus)}
                >
                  {(Object.keys(statusConfig) as IssueStatus[]).map((s) => (
                    <option value={s}>{statusConfig[s].label}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Priority</p>
                <select
                  class="w-full text-sm bg-white border border-slate-300 rounded-md px-2 py-1.5 outline-none focus:border-indigo-400"
                  value={issue().priority}
                  onChange={(e) => handleFieldUpdate('priority', e.currentTarget.value as IssuePriority)}
                >
                  {(Object.keys(priorityConfig) as IssuePriority[]).map((p) => (
                    <option value={p}>{priorityConfig[p].label}</option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div>
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Assignee</p>
                <div class="flex items-center gap-2">
                  <Avatar name={issue().assignee?.name} src={issue().assignee?.avatarUrl} size="sm" />
                  <span class="text-sm text-slate-700">{issue().assignee?.name ?? 'Unassigned'}</span>
                </div>
              </div>

              {/* Reporter */}
              <div>
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Reporter</p>
                <div class="flex items-center gap-2">
                  <Avatar name={issue().reporter?.name} src={issue().reporter?.avatarUrl} size="sm" />
                  <span class="text-sm text-slate-700">{issue().reporter?.name ?? '—'}</span>
                </div>
              </div>

              {/* Story Points */}
              <div>
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Story Points</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  class="w-full text-sm bg-white border border-slate-300 rounded-md px-2 py-1.5 outline-none focus:border-indigo-400"
                  value={issue().storyPoints ?? ''}
                  placeholder="—"
                  onBlur={(e) => {
                    const v = parseInt(e.currentTarget.value);
                    if (!isNaN(v)) handleFieldUpdate('storyPoints', v);
                  }}
                />
              </div>

              {/* Due Date */}
              <div>
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Due Date</p>
                <input
                  type="date"
                  class="w-full text-sm bg-white border border-slate-300 rounded-md px-2 py-1.5 outline-none focus:border-indigo-400"
                  value={issue().dueDate?.slice(0, 10) ?? ''}
                  onChange={(e) => handleFieldUpdate('dueDate', e.currentTarget.value)}
                />
              </div>

              {/* Labels */}
              <Show when={issue().labels && issue().labels!.length > 0}>
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Labels</p>
                  <div class="flex flex-wrap gap-1">
                    <For each={issue().labels}>
                      {(label) => (
                        <Badge color={label.color} variant="subtle">{label.name}</Badge>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Dates */}
              <div class="pt-2 border-t border-slate-200 space-y-1">
                <p class="text-xs text-slate-400">
                  Created: {new Date(issue().createdAt).toLocaleDateString()}
                </p>
                <p class="text-xs text-slate-400">
                  Updated: {new Date(issue().updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
