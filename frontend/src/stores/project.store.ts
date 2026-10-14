import { createSignal } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { projectsApi, sprintsApi, issuesApi, epicsApi, labelsApi } from '@/api/endpoints';
import type { Project, Sprint, Epic, Issue, Label, IssueStatus } from '@/types';

// Helper to normalize JSONAPI response or plain response
const extractData = <T>(resData: any): T[] => {
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData?.data)) {
    // If it's jsonapi serialized: { id, attributes, ... }
    return resData.data.map((item: any) => {
      if (item.attributes) {
        return { id: item.id, ...item.attributes };
      }
      return item;
    });
  }
  return [];
};

const extractSingle = <T>(resData: any): T => {
  if (resData?.data?.attributes) {
    return { id: resData.data.id, ...resData.data.attributes } as T;
  }
  if (resData?.data) return resData.data as T;
  return resData as T;
};

// ── State ─────────────────────────────────────
const [projects, setProjects] = createStore<Project[]>([]);
const [currentProject, setCurrentProject] = createSignal<Project | null>(null);
const [sprints, setSprints] = createStore<Sprint[]>([]);
const [epics, setEpics] = createStore<Epic[]>([]);
const [issues, setIssues] = createStore<Issue[]>([]);
const [labels, setLabels] = createStore<Label[]>([]);
const [loading, setLoading] = createSignal(false);
const [projectError, setProjectError] = createSignal<string | null>(null);

export {
  projects,
  currentProject,
  sprints,
  epics,
  issues,
  labels,
  loading as projectLoading,
  projectError,
};

// ── Projects ──────────────────────────────────
export const fetchProjects = async (): Promise<void> => {
  setLoading(true);
  try {
    const res = await projectsApi.list();
    setProjects(extractData<Project>(res.data));
  } catch (e) {
    setProjectError('Failed to load projects');
  } finally {
    setLoading(false);
  }
};

export const fetchProject = async (keyOrId: string): Promise<void> => {
  setLoading(true);
  try {
    const res = await projectsApi.get(keyOrId);
    setCurrentProject(extractSingle<Project>(res.data));
  } catch (e) {
    setProjectError('Failed to load project');
  } finally {
    setLoading(false);
  }
};

export const createProject = async (data: Partial<Project>): Promise<Project> => {
  const res = await projectsApi.create(data);
  const newProj = extractSingle<Project>(res.data);
  setProjects(produce((ps) => { ps.push(newProj); }));
  return newProj;
};

export const updateProject = async (id: string, data: Partial<Project>): Promise<void> => {
  const res = await projectsApi.update(id, data);
  const updated = extractSingle<Project>(res.data);
  setProjects(
    (p) => p.id === id,
    produce((p) => Object.assign(p, updated)),
  );
  if (currentProject()?.id === id) setCurrentProject(updated);
};

export const deleteProject = async (id: string): Promise<void> => {
  await projectsApi.delete(id);
  setProjects((ps) => ps.filter((p) => p.id !== id));
};

// ── Sprints ───────────────────────────────────
export const fetchSprints = async (projectId: string): Promise<void> => {
  try {
    const res = await sprintsApi.list(projectId);
    setSprints(extractData<Sprint>(res.data));
  } catch (e) {
    console.error('Failed to load sprints', e);
  }
};

export const createSprint = async (projectId: string, data: Partial<Sprint>): Promise<Sprint> => {
  const res = await sprintsApi.create(projectId, data);
  const newSprint = extractSingle<Sprint>(res.data);
  setSprints(produce((ss) => { ss.push(newSprint); }));
  return newSprint;
};

export const updateSprint = async (projectId: string, sprintId: string, data: Partial<Sprint>): Promise<void> => {
  const res = await sprintsApi.update(projectId, sprintId, data);
  const updated = extractSingle<Sprint>(res.data);
  setSprints((s) => s.id === sprintId, produce((s) => Object.assign(s, updated)));
};

export const deleteSprint = async (projectId: string, sprintId: string): Promise<void> => {
  await sprintsApi.delete(projectId, sprintId);
  setSprints((ss) => ss.filter((s) => s.id !== sprintId));
};

export const startSprint = async (projectId: string, sprintId: string): Promise<void> => {
  const res = await sprintsApi.start(projectId, sprintId);
  const updated = extractSingle<Sprint>(res.data);
  setSprints((s) => s.id === sprintId, produce((s) => Object.assign(s, updated)));
};

export const completeSprint = async (projectId: string, sprintId: string): Promise<void> => {
  const res = await sprintsApi.complete(projectId, sprintId);
  const updated = extractSingle<Sprint>(res.data);
  setSprints((s) => s.id === sprintId, produce((s) => Object.assign(s, updated)));
};

// ── Epics ─────────────────────────────────────
export const fetchEpics = async (projectId: string): Promise<void> => {
  try {
    const res = await epicsApi.list(projectId);
    setEpics(extractData<Epic>(res.data));
  } catch (e) {
    console.error('Failed to load epics', e);
  }
};

export const createEpic = async (projectId: string, data: Partial<Epic>): Promise<Epic> => {
  const res = await epicsApi.create(projectId, data);
  const newEpic = extractSingle<Epic>(res.data);
  setEpics(produce((es) => { es.push(newEpic); }));
  return newEpic;
};

export const updateEpic = async (projectId: string, epicId: string, data: Partial<Epic>): Promise<void> => {
  const res = await epicsApi.update(projectId, epicId, data);
  const updated = extractSingle<Epic>(res.data);
  setEpics((e) => e.id === epicId, produce((e) => Object.assign(e, updated)));
};

export const deleteEpic = async (projectId: string, epicId: string): Promise<void> => {
  await epicsApi.delete(projectId, epicId);
  setEpics((es) => es.filter((e) => e.id !== epicId));
};

// ── Issues ────────────────────────────────────
export const fetchIssues = async (projectId: string, sprintId?: string): Promise<void> => {
  try {
    const res = await issuesApi.list(projectId, sprintId ? { sprint_id: sprintId } : undefined);
    setIssues(extractData<Issue>(res.data));
  } catch (e) {
    console.error('Failed to load issues', e);
  }
};

export const createIssue = async (projectId: string, data: Partial<Issue>): Promise<Issue> => {
  const res = await issuesApi.create(projectId, data);
  const newIssue = extractSingle<Issue>(res.data);
  setIssues(produce((is) => { is.push(newIssue); }));
  return newIssue;
};

export const updateIssue = async (projectId: string, issueId: string, data: Partial<Issue>): Promise<void> => {
  const res = await issuesApi.update(projectId, issueId, data);
  const updated = extractSingle<Issue>(res.data);
  setIssues((i) => i.id === issueId, produce((i) => Object.assign(i, updated)));
};

export const deleteIssue = async (projectId: string, issueId: string): Promise<void> => {
  await issuesApi.delete(projectId, issueId);
  setIssues((is) => is.filter((i) => i.id !== issueId));
};

// Optimistic drag-drop: move issue to new status column
export const moveIssueOptimistic = async (
  projectId: string,
  issueId: string,
  newStatus: IssueStatus,
  sprintId?: string,
): Promise<void> => {
  const prevStatus = issues.find((i) => i.id === issueId)?.status;
  setIssues((i) => i.id === issueId, 'status', newStatus);
  try {
    await issuesApi.move(projectId, issueId, newStatus, sprintId);
  } catch (e) {
    // Rollback on error
    if (prevStatus) setIssues((i) => i.id === issueId, 'status', prevStatus);
  }
};

// ── Labels ────────────────────────────────────
export const fetchLabels = async (projectId: string): Promise<void> => {
  try {
    const res = await labelsApi.list(projectId);
    setLabels(extractData<Label>(res.data));
  } catch (e) {
    console.error('Failed to load labels', e);
  }
};

export const createLabel = async (projectId: string, data: Partial<Label>): Promise<Label> => {
  const res = await labelsApi.create(projectId, data);
  const newLabel = extractSingle<Label>(res.data);
  setLabels(produce((ls) => { ls.push(newLabel); }));
  return newLabel;
};

export const deleteLabel = async (projectId: string, labelId: string): Promise<void> => {
  await labelsApi.delete(projectId, labelId);
  setLabels((ls) => ls.filter((l) => l.id !== labelId));
};
