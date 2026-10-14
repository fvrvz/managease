import apiClient from './client';
import type {
  User,
  AuthTokens,
  Project,
  Sprint,
  Epic,
  Issue,
  Label,
  Comment,
  WorkLog,
  BurndownData,
  VelocityPoint,
  IssueBreakdown,
  PaginatedResponse,
  WorkflowData,
  WorkflowStatus,
} from '@/types';

// ── Auth ──────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ user: User; tokens?: AuthTokens }>('/auth/login', {
      user: { email, password },
    }),

  register: (name: string, email: string, password: string) =>
    apiClient.post<{ user: User; tokens?: AuthTokens }>('/auth/register', {
      user: { name, email, password, password_confirmation: password },
    }),

  logout: () => apiClient.delete('/auth/logout'),

  me: () => apiClient.get<{ user: User }>('/api/v1/me'),

  oidcLogin: () => '/auth/oidc/callback',

  oidcCallback: (code: string, state: string) =>
    apiClient.post<{ user: User; tokens?: AuthTokens }>('/auth/oidc/callback', { code, state }),
};

// ── Projects ──────────────────────────────────

export const projectsApi = {
  list: () => apiClient.get<Project[]>('/api/v1/projects'),

  get: (idOrKey: string) => apiClient.get<Project>(`/api/v1/projects/${idOrKey}`),

  create: (data: Partial<Project>) => apiClient.post<Project>('/api/v1/projects', { project: data }),

  update: (id: string, data: Partial<Project>) =>
    apiClient.put<Project>(`/api/v1/projects/${id}`, { project: data }),

  delete: (id: string) => apiClient.delete(`/api/v1/projects/${id}`),

  getMembers: (projectId: string) => apiClient.get<User[]>(`/api/v1/projects/${projectId}/members`),

  addMember: (projectId: string, userId: string, role: string) =>
    apiClient.post(`/api/v1/projects/${projectId}/add_member`, { user_id: userId, role }),

  updateMember: (projectId: string, userId: string, role: string) =>
    apiClient.put(`/api/v1/projects/${projectId}/members/${userId}`, { role }),

  removeMember: (projectId: string, userId: string) =>
    apiClient.delete(`/api/v1/projects/${projectId}/members/${userId}`),

  getWorkflow: (projectId: string) =>
    apiClient.get(`/api/v1/projects/${projectId}/workflow`),

  updateWorkflow: (projectId: string, data: WorkflowData | WorkflowStatus[]) =>
    apiClient.put(`/api/v1/projects/${projectId}/workflow`, {
      workflow_data: data,
      workflow_statuses: Array.isArray(data) ? data : (data as WorkflowData)?.statuses,
    }),

  updateGitHubSettings: (projectId: string, data: { github_repo?: string; github_webhook_secret?: string; github_token?: string }) =>
    apiClient.put(`/api/v1/projects/${projectId}/github_settings`, data),
};

// ── Sprints ───────────────────────────────────

export const sprintsApi = {
  list: (projectId: string) => apiClient.get<Sprint[]>(`/api/v1/projects/${projectId}/sprints`),

  get: (projectId: string, sprintId: string) =>
    apiClient.get<Sprint>(`/api/v1/projects/${projectId}/sprints/${sprintId}`),

  create: (projectId: string, data: Partial<Sprint>) =>
    apiClient.post<Sprint>(`/api/v1/projects/${projectId}/sprints`, { sprint: data }),

  update: (projectId: string, sprintId: string, data: Partial<Sprint>) =>
    apiClient.put<Sprint>(`/api/v1/projects/${projectId}/sprints/${sprintId}`, { sprint: data }),

  delete: (projectId: string, sprintId: string) =>
    apiClient.delete(`/api/v1/projects/${projectId}/sprints/${sprintId}`),

  start: (
    projectId: string,
    sprintId: string,
    data?: { start_date?: string; end_date?: string; goal?: string; name?: string },
  ) => apiClient.post<Sprint>(`/api/v1/projects/${projectId}/sprints/${sprintId}/start`, data),

  complete: (projectId: string, sprintId: string) =>
    apiClient.post<Sprint>(`/api/v1/projects/${projectId}/sprints/${sprintId}/complete`),
};

// ── Issues ────────────────────────────────────

export interface IssueFilters {
  sprint_id?: string;
  epic_id?: string;
  assignee_id?: string;
  status?: string;
  priority?: string;
  issue_type?: string;
  q?: string;
}

export const issuesApi = {
  list: (projectId: string, filters?: IssueFilters) =>
    apiClient.get<PaginatedResponse<Issue> | { data: Issue[] }>(`/api/v1/projects/${projectId}/issues`, { params: filters }),

  get: (projectId: string, issueId: string) =>
    apiClient.get<Issue>(`/api/v1/issues/${issueId}`),

  create: (projectId: string, data: Partial<Issue>) =>
    apiClient.post<Issue>(`/api/v1/projects/${projectId}/issues`, { issue: data }),

  update: (projectId: string, issueId: string, data: Partial<Issue>) =>
    apiClient.put<Issue>(`/api/v1/issues/${issueId}`, { issue: data }),

  delete: (projectId: string, issueId: string) =>
    apiClient.delete(`/api/v1/issues/${issueId}`),

  move: (projectId: string, issueId: string, status?: string, sprintId?: string | null) => {
    const payload: Record<string, string | null> = {};
    if (status !== undefined) payload.status = status;
    if (sprintId !== undefined) payload.sprint_id = sprintId;
    return apiClient.patch(`/api/v1/issues/${issueId}/move`, payload);
  },

  reorder: (projectId: string, issueId: string, position: number) =>
    apiClient.patch(`/api/v1/issues/${issueId}/reorder`, { position }),

  assign: (issueId: string, assigneeId: string | null) =>
    apiClient.patch(`/api/v1/issues/${issueId}/assign`, { assignee_id: assigneeId }),

  getWorkLogs: (issueId: string) =>
    apiClient.get<WorkLog[]>(`/api/v1/issues/${issueId}/work_logs`),

  logWork: (issueId: string, data: { hours: number; logged_date?: string; description?: string }) =>
    apiClient.post(`/api/v1/issues/${issueId}/work_logs`, data),
};

// ── Epics ─────────────────────────────────────

export const epicsApi = {
  list: (projectId: string) => apiClient.get<Epic[]>(`/api/v1/projects/${projectId}/epics`),

  get: (projectId: string, epicId: string) =>
    apiClient.get<Epic>(`/api/v1/projects/${projectId}/epics/${epicId}`),

  create: (projectId: string, data: Partial<Epic>) =>
    apiClient.post<Epic>(`/api/v1/projects/${projectId}/epics`, { epic: data }),

  update: (projectId: string, epicId: string, data: Partial<Epic>) =>
    apiClient.put<Epic>(`/api/v1/projects/${projectId}/epics/${epicId}`, { epic: data }),

  delete: (projectId: string, epicId: string) =>
    apiClient.delete(`/api/v1/projects/${projectId}/epics/${epicId}`),
};

// ── Labels ────────────────────────────────────

export const labelsApi = {
  list: (projectId: string) => apiClient.get<Label[]>(`/api/v1/projects/${projectId}/labels`),

  create: (projectId: string, data: Partial<Label>) =>
    apiClient.post<Label>(`/api/v1/projects/${projectId}/labels`, { label: data }),

  delete: (projectId: string, labelId: string) =>
    apiClient.delete(`/api/v1/projects/${projectId}/labels/${labelId}`),
};

// ── Comments ──────────────────────────────────

export const commentsApi = {
  list: (issueId: string) =>
    apiClient.get<Comment[]>(`/api/v1/issues/${issueId}/comments`),

  create: (issueId: string, body: string) =>
    apiClient.post<Comment>(`/api/v1/issues/${issueId}/comments`, { comment: { body } }),

  update: (commentId: string, body: string) =>
    apiClient.put<Comment>(`/api/v1/comments/${commentId}`, { comment: { body } }),

  delete: (commentId: string) =>
    apiClient.delete(`/api/v1/comments/${commentId}`),
};

// ── Reports ───────────────────────────────────

export const reportsApi = {
  burndown: (projectId: string, sprintId: string) =>
    apiClient.get<{ data: Record<string, unknown>[]; sprint: Sprint }>(`/api/v1/projects/${projectId}/reports/burndown`, {
      params: { sprint_id: sprintId },
    }),

  velocity: (projectId: string) =>
    apiClient.get<{ data: VelocityPoint[] }>(`/api/v1/projects/${projectId}/reports/velocity`),

  issueSummary: (projectId: string) =>
    apiClient.get<{ data: Record<string, number> }>(`/api/v1/projects/${projectId}/reports/issue_summary`),

  timeTracking: (projectId: string, sprintId?: string) =>
    apiClient.get<{ data: Record<string, unknown>[] }>(`/api/v1/projects/${projectId}/reports/time_tracking`, {
      params: { sprint_id: sprintId },
    }),
};

// ── Users Management ──────────────────────────

export const usersApi = {
  list: (q?: string) => apiClient.get<PaginatedResponse<User> | { data: User[] }>('/api/v1/users', { params: { q } }),
  create: (data: Partial<User> & { password?: string }) => apiClient.post<{ data: User }>('/api/v1/users', data),
  update: (id: string, data: Partial<User>) => apiClient.put<{ data: User }>(`/api/v1/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/users/${id}`),
};

// ── Imports ───────────────────────────────────

export const importsApi = {
  uploadExcel: (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post(`/api/v1/projects/${projectId}/imports`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
