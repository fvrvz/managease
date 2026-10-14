import { createSignal, For, Show } from 'solid-js';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { createIssue, updateIssue, sprints, epics, labels } from '@/stores/project.store';
import type { Issue, IssueType, IssueStatus, IssuePriority } from '@/types';

interface IssueFormProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sprintId?: string;
  defaultStatus?: IssueStatus;
  editIssue?: Issue;
  onSaved?: (issue: Issue) => void;
}

const typeOptions = [
  { value: 'story', label: 'Story' },
  { value: 'bug', label: 'Bug' },
  { value: 'task', label: 'Task' },
  { value: 'subtask', label: 'Subtask' },
];

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

const priorityOptions = [
  { value: 'highest', label: 'Highest' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'lowest', label: 'Lowest' },
];

export function IssueForm(props: IssueFormProps) {
  const toast = useToast();
  const isEdit = () => !!props.editIssue;

  const [title, setTitle] = createSignal(props.editIssue?.title ?? '');
  const [type, setType] = createSignal<IssueType>(props.editIssue?.type ?? 'task');
  const [status, setStatus] = createSignal<IssueStatus>(props.editIssue?.status ?? props.defaultStatus ?? 'todo');
  const [priority, setPriority] = createSignal<IssuePriority>(props.editIssue?.priority ?? 'medium');
  const [description, setDescription] = createSignal(props.editIssue?.description ?? '');
  const [sprintId, setSprintId] = createSignal(props.editIssue?.sprintId ?? props.sprintId ?? '');
  const [epicId, setEpicId] = createSignal(props.editIssue?.epicId ?? '');
  const [storyPoints, setStoryPoints] = createSignal<string>(String(props.editIssue?.storyPoints ?? ''));
  const [saving, setSaving] = createSignal(false);
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title().trim()) errs.title = 'Title is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const data = {
        title: title().trim(),
        type: type(),
        status: status(),
        priority: priority(),
        description: description(),
        sprintId: sprintId() || undefined,
        epicId: epicId() || undefined,
        storyPoints: storyPoints() ? parseInt(storyPoints()) : undefined,
      };

      let saved: Issue;
      if (isEdit() && props.editIssue) {
        await updateIssue(props.projectId, props.editIssue.id, data);
        saved = { ...props.editIssue, ...data };
      } else {
        saved = await createIssue(props.projectId, data);
      }
      toast.addToast(`Issue ${isEdit() ? 'updated' : 'created'} successfully`, 'success');
      props.onSaved?.(saved);
      props.onClose();
    } catch {
      toast.addToast(`Failed to ${isEdit() ? 'update' : 'create'} issue`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const sprintOptions = () => [
    { value: '', label: 'Backlog (no sprint)' },
    ...sprints.map((s) => ({ value: s.id, label: s.name })),
  ];

  const epicOptions = () => [
    { value: '', label: 'No epic' },
    ...epics.map((e) => ({ value: e.id, label: e.name })),
  ];

  return (
    <Modal open={props.open} onClose={props.onClose} title={isEdit() ? 'Edit Issue' : 'Create Issue'} size="lg">
      <div class="px-6 py-5 space-y-4">
        <Input
          label="Title *"
          fullWidth
          placeholder="Enter issue title"
          value={title()}
          onInput={(e) => setTitle(e.currentTarget.value)}
          error={errors().title}
        />

        <div class="grid grid-cols-2 gap-4">
          <Select
            label="Type"
            options={typeOptions}
            value={type()}
            onChange={(e) => setType(e.currentTarget.value as IssueType)}
          />
          <Select
            label="Priority"
            options={priorityOptions}
            value={priority()}
            onChange={(e) => setPriority(e.currentTarget.value as IssuePriority)}
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            options={statusOptions}
            value={status()}
            onChange={(e) => setStatus(e.currentTarget.value as IssueStatus)}
          />
          <Input
            label="Story Points"
            type="number"
            min="0"
            placeholder="0"
            value={storyPoints()}
            onInput={(e) => setStoryPoints(e.currentTarget.value)}
          />
        </div>

        <Select
          label="Sprint"
          fullWidth
          options={sprintOptions()}
          value={sprintId()}
          onChange={(e) => setSprintId(e.currentTarget.value)}
        />

        <Select
          label="Epic"
          fullWidth
          options={epicOptions()}
          value={epicId()}
          onChange={(e) => setEpicId(e.currentTarget.value)}
        />

        <div>
          <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">
            Description
          </label>
          <textarea
            class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-y min-h-[100px]"
            placeholder="Add a description..."
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
        </div>
      </div>

      <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
        <Button variant="secondary" onClick={props.onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saving()}>
          {isEdit() ? 'Save Changes' : 'Create Issue'}
        </Button>
      </div>
    </Modal>
  );
}
