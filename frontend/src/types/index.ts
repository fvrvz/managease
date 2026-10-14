// ─────────────────────────────────────────────
//  ManagEase – TypeScript interfaces & enums
// ─────────────────────────────────────────────

// ── Auth ──────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'member' | 'viewer';
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

// ── Project ───────────────────────────────────

export interface WorkflowStatus {
  id: string;
  title: string;
  category: 'todo' | 'in_progress' | 'done';
  color: string;
  position?: number;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;           // e.g. "ME", "PROJ"
  description?: string;
  color: string;         // hex color for avatar
  avatarUrl?: string;
  leadId?: string;
  lead?: User;
  members?: ProjectMember[];
  issueCount?: number;
  workflowStatuses?: WorkflowStatus[];
  githubRepo?: string;
  githubWebhookSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  user: User;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

// ── Sprint ────────────────────────────────────

export type SprintStatus = 'planning' | 'active' | 'completed';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate?: string;   // ISO
  endDate?: string;     // ISO
  completedAt?: string;
  totalPoints?: number;
  completedPoints?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ── Epic ──────────────────────────────────────

export type EpicStatus = 'todo' | 'in_progress' | 'done';

export interface Epic {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: EpicStatus;
  color: string;         // hex color
  startDate?: string;
  dueDate?: string;
  progress?: number;     // 0-100
  createdAt: string;
  updatedAt: string;
}

// ── Issue ─────────────────────────────────────

export type IssueType = 'story' | 'bug' | 'task' | 'subtask';
export type IssueStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type IssuePriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export interface Issue {
  id: string;
  projectId: string;
  sprintId?: string;
  epicId?: string;
  parentId?: string;      // for subtasks
  key: string;            // e.g. "ME-42"
  number?: number;
  title: string;
  description?: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints?: number;
  assigneeId?: string;
  assignee?: User;
  reporterId?: string;
  reporter?: User;
  labels?: Label[];
  subtasks?: Issue[];
  links?: IssueLink[];
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  loggedHours?: number;
  position: number;       // ordering within column/sprint
  createdAt: string;
  updatedAt: string;
}

// ── WorkLog ───────────────────────────────────

export interface WorkLog {
  id: string;
  hours: number;
  loggedDate: string;
  description?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

// ── Label ─────────────────────────────────────

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;          // hex
}

// ── Comment ───────────────────────────────────

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  author: User;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// ── Attachment ────────────────────────────────

export interface Attachment {
  id: string;
  issueId: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  uploadedAt: string;
}

// ── IssueLink ─────────────────────────────────

export type IssueLinkType = 'blocks' | 'is_blocked_by' | 'relates_to' | 'duplicates' | 'is_duplicated_by';

export interface IssueLink {
  id: string;
  type: IssueLinkType;
  sourceIssueId: string;
  targetIssueId: string;
  targetIssue?: Pick<Issue, 'id' | 'key' | 'title' | 'status' | 'type'>;
}

// ── Reports ───────────────────────────────────

export interface BurndownPoint {
  date: string;           // ISO date
  ideal: number;
  actual: number;
}

export interface BurndownData {
  sprintId: string;
  sprintName: string;
  totalPoints: number;
  dataPoints: BurndownPoint[];
}

export interface VelocityPoint {
  sprintId: string;
  sprintName: string;
  committed: number;
  completed: number;
}

export interface IssueBreakdown {
  type: IssueType;
  count: number;
}

// ── Import ────────────────────────────────────

export interface ImportColumn {
  index: number;
  header: string;
  sample?: string;
}

export type ImportFieldTarget =
  | 'title'
  | 'type'
  | 'status'
  | 'priority'
  | 'description'
  | 'storyPoints'
  | 'assignee'
  | 'epic'
  | 'labels'
  | 'dueDate'
  | 'skip';

export interface ImportMapping {
  columnIndex: number;
  columnHeader: string;
  targetField: ImportFieldTarget;
}

export interface ImportPreviewRow {
  [key: string]: string | number | undefined;
}

// ── UI Helpers ───────────────────────────────

export interface SelectOption<T = string> {
  value: T;
  label: string;
  color?: string;
  icon?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}
