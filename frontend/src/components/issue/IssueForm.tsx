import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import {
  Bookmark,
  Bug,
  CheckSquare,
  Layers,
  ChevronsUp,
  ChevronUp,
  Minus,
  ChevronDown,
  ChevronsDown,
  Calendar,
  Layers as EpicIcon,
  User,
  Clock,
} from 'lucide-solid';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RichSelect, RichSelectOption } from '@/components/ui/RichSelect';
import { useToast } from '@/components/ui/Toast';
import {
  createIssue,
  updateIssue,
  sprints,
  epics,
  projectMembers,
  fetchProjectMembers,
  currentProject,
  projects,
} from '@/stores/project.store';
import type { Issue, IssueType, IssueStatus, IssuePriority } from '@/types';

interface IssueFormProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  sprintId?: string;
  defaultStatus?: IssueStatus;
  editIssue?: Issue;
  onSaved?: (issue: Issue) => void;
}

const typeOptions: RichSelectOption[] = [
  {
    value: 'task',
    label: 'Task',
    icon: <CheckSquare class="w-4 h-4 text-blue-600 fill-blue-500/20" />,
    description: 'A small, distinct piece of work',
  },
  {
    value: 'story',
    label: 'Story',
    icon: <Bookmark class="w-4 h-4 text-emerald-600 fill-emerald-500/20" />,
    description: 'Functionality delivered to an end user',
  },
  {
    value: 'bug',
    label: 'Bug',
    icon: <Bug class="w-4 h-4 text-red-600 fill-red-500/20" />,
    description: 'A problem that impairs product function',
  },
  {
    value: 'subtask',
    label: 'Subtask',
    icon: <Layers class="w-4 h-4 text-slate-500 fill-slate-500/20" />,
    description: 'A component of a larger issue',
  },
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

const statusOptions: RichSelectOption[] = [
  { value: 'todo', label: 'To Do', color: '#94a3b8', badge: 'OPEN' },
  { value: 'in_progress', label: 'In Progress', color: '#3b82f6', badge: 'DEV' },
  { value: 'in_review', label: 'In Review', color: '#8b5cf6', badge: 'QA' },
  { value: 'done', label: 'Done', color: '#22c55e', badge: 'RESOLVED' },
];

export function IssueForm(props: IssueFormProps) {
  const toast = useToast();
  const isEdit = () => !!props.editIssue;

  const targetProjectId = () =>
    props.projectId || currentProject()?.id || (projects.length > 0 ? projects[0].id : '');

  const [title, setTitle] = createSignal('');
  const [type, setType] = createSignal<IssueType>('task');
  const [status, setStatus] = createSignal<IssueStatus>('todo');
  const [priority, setPriority] = createSignal<IssuePriority>('medium');
  const [assigneeId, setAssigneeId] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [sprintId, setSprintId] = createSignal('');
  const [epicId, setEpicId] = createSignal('');
  const [storyPoints, setStoryPoints] = createSignal<string>('');
  const [startDate, setStartDate] = createSignal('');
  const [dueDate, setDueDate] = createSignal('');
  const [estimatedHours, setEstimatedHours] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  createEffect(() => {
    if (props.open) {
      const pid = targetProjectId();
      if (pid) fetchProjectMembers(pid);

      if (props.editIssue) {
        setTitle(props.editIssue.title || '');
        setType(props.editIssue.type || 'task');
        setStatus(props.editIssue.status || 'todo');
        setPriority(props.editIssue.priority || 'medium');
        setAssigneeId(props.editIssue.assigneeId || '');
        setDescription(props.editIssue.description || '');
        setSprintId(props.editIssue.sprintId || '');
        setEpicId(props.editIssue.epicId || '');
        setStoryPoints(props.editIssue.storyPoints != null ? String(props.editIssue.storyPoints) : '');
        setStartDate(props.editIssue.startDate?.slice(0, 10) || '');
        setDueDate(props.editIssue.dueDate?.slice(0, 10) || '');
        setEstimatedHours(props.editIssue.estimatedHours != null ? String(props.editIssue.estimatedHours) : '');
      } else {
        setTitle('');
        setType('task');
        setStatus(props.defaultStatus || 'todo');
        setPriority('medium');
        setAssigneeId('');
        setDescription('');
        setSprintId(props.sprintId || '');
        setEpicId('');
        setStoryPoints('');
        setStartDate('');
        setDueDate('');
        setEstimatedHours('');
      }
      setErrors({});
    }
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title().trim()) errs.title = 'Title is required';
    if (!targetProjectId()) errs.title = 'Please select or create a project first';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const pid = targetProjectId();
    try {
      const data: any = {
        title: title().trim(),
        type: type(),
        issue_type: type(),
        status: status() || 'todo',
        priority: priority(),
        assignee_id: assigneeId() || null,
        description: description(),
        sprint_id: sprintId() || null,
        epic_id: epicId() || null,
        story_points: storyPoints() ? parseInt(storyPoints(), 10) : null,
        start_date: startDate() || null,
        due_date: dueDate() || null,
        estimated_hours: estimatedHours() ? parseFloat(estimatedHours()) : null,
      };

      let saved: Issue;
      if (isEdit() && props.editIssue) {
        await updateIssue(pid, props.editIssue.id, data);
        saved = { ...props.editIssue, ...data };
      } else {
        saved = await createIssue(pid, data);
      }
      toast.addToast(`Issue ${isEdit() ? 'updated' : 'created'} successfully`, 'success');
      props.onSaved?.(saved);
      props.onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.details?.join(', ') ||
        err?.response?.data?.error ||
        `Failed to ${isEdit() ? 'update' : 'create'} issue`;
      toast.addToast(msg, 'error');
    } finally {
      setSaving(false);
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

  const sprintOptions = (): RichSelectOption[] => [
    {
      value: '',
      label: 'Backlog (no sprint)',
      description: 'Will not show on active sprint board until planned',
    },
    ...sprints.map((s) => ({
      value: s.id,
      label: s.name,
      badge: s.status.toUpperCase(),
      icon: <Calendar class="w-4 h-4 text-blue-500" />,
    })),
  ];

  const epicOptions = (): RichSelectOption[] => [
    { value: '', label: 'No epic' },
    ...epics.map((e) => ({
      value: e.id,
      label: e.name,
      color: e.color,
      icon: <EpicIcon class="w-4 h-4" style={{ color: e.color }} />,
    })),
  ];

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={isEdit() ? 'Edit Issue' : 'Create Issue'}
      size="lg"
    >
      <div class="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
        <Input
          label="Title *"
          fullWidth
          placeholder="What needs to be done?"
          value={title()}
          onInput={(e) => setTitle(e.currentTarget.value)}
          error={errors().title}
        />

        {/* Type & Priority */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RichSelect
            label="Issue Type"
            options={typeOptions}
            value={type()}
            onChange={(val) => setType(val as IssueType)}
            fullWidth
          />
          <RichSelect
            label="Priority"
            options={priorityOptions}
            value={priority()}
            onChange={(val) => setPriority(val as IssuePriority)}
            fullWidth
          />
        </div>

        {/* Status & Assignee */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RichSelect
            label="Status"
            options={statusOptions}
            value={status()}
            onChange={(val) => setStatus(val as IssueStatus)}
            fullWidth
          />
          <RichSelect
            label="Assignee"
            options={assigneeOptions()}
            value={assigneeId()}
            onChange={setAssigneeId}
            fullWidth
          />
        </div>

        {/* Story Points & Estimated Hours */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Story Points"
            type="number"
            min="0"
            max="100"
            placeholder="e.g. 1, 2, 3, 5, 8"
            value={storyPoints()}
            onInput={(e) => setStoryPoints(e.currentTarget.value)}
          />
          <Input
            label="Estimated Hours"
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 4.5"
            value={estimatedHours()}
            onInput={(e) => setEstimatedHours(e.currentTarget.value)}
          />
        </div>

        {/* Dates: Start Date & Due Date */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">
              Start Date
            </label>
            <input
              type="date"
              class="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              value={startDate()}
              onChange={(e) => setStartDate(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">
              Due Date
            </label>
            <input
              type="date"
              class="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              value={dueDate()}
              onChange={(e) => setDueDate(e.currentTarget.value)}
            />
          </div>
        </div>

        {/* Sprint & Epic */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RichSelect
            label="Sprint"
            options={sprintOptions()}
            value={sprintId()}
            onChange={setSprintId}
            fullWidth
          />

          <RichSelect
            label="Epic"
            options={epicOptions()}
            value={epicId()}
            onChange={setEpicId}
            fullWidth
          />
        </div>

        {/* Description */}
        <div>
          <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">
            Description
          </label>
          <textarea
            class="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y min-h-[90px] transition-colors"
            placeholder="Add a detailed description..."
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
        </div>
      </div>

      <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50/50 rounded-b-xl">
        <Button variant="secondary" onClick={props.onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={saving()}>
          {isEdit() ? 'Save Changes' : 'Create Issue'}
        </Button>
      </div>
    </Modal>
  );
}
