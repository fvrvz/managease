import { createSignal, createEffect, onMount, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  Settings,
  GitBranch,
  Copy,
  Check,
  ExternalLink,
  Bot,
  Key,
  ShieldCheck,
  Save,
  Send,
  Users,
  UserPlus,
  Trash2,
  Shield,
  UserCheck,
  Mail,
  Lock,
} from 'lucide-solid';
import {
  currentProject,
  updateProject,
  projectMembers,
  fetchProjectMembers,
} from '@/stores/project.store';
import { user as currentUser } from '@/stores/auth.store';
import { projectsApi, usersApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import type { User } from '@/types';

interface ProjectMemberInfo {
  user: User;
  role: string;
  joined_at?: string;
}

export function SettingsPage() {
  const params = useParams();
  const toast = useToast();

  const [activeTab, setActiveTab] = createSignal<'general' | 'team'>('general');

  // General settings state
  const [name, setName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [githubRepo, setGithubRepo] = createSignal('');
  const [webhookSecret, setWebhookSecret] = createSignal('');
  const [githubToken, setGithubToken] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [copiedWebhook, setCopiedWebhook] = createSignal(false);
  const [testingBot, setTestingBot] = createSignal(false);

  // Team & User Management state
  const [membersList, setMembersList] = createSignal<ProjectMemberInfo[]>([]);
  const [allUsers, setAllUsers] = createSignal<User[]>([]);
  const [selectedAddUserId, setSelectedAddUserId] = createSignal('');
  const [selectedAddRole, setSelectedAddRole] = createSignal('member');
  const [addingMember, setAddingMember] = createSignal(false);

  // New Global User Modal state
  const [showCreateUserModal, setShowCreateUserModal] = createSignal(false);
  const [newUserName, setNewUserName] = createSignal('');
  const [newUserEmail, setNewUserEmail] = createSignal('');
  const [newUserPassword, setNewUserPassword] = createSignal('');
  const [newUserRole, setNewUserRole] = createSignal('member');
  const [creatingUser, setCreatingUser] = createSignal(false);

  const loadMembers = async () => {
    const proj = currentProject();
    if (!proj) return;
    try {
      const res = await projectsApi.getMembers(proj.id);
      const data = (res.data as any) || [];
      const parsed: ProjectMemberInfo[] = data.map((item: any) => {
        const u = item.user?.attributes
          ? { id: item.user.id, ...item.user.attributes }
          : item.user || item;
        return {
          user: u,
          role: item.role || 'member',
          joined_at: item.joined_at,
        };
      });
      setMembersList(parsed);
      fetchProjectMembers(proj.id);
    } catch (e) {
      console.error('Failed to load project members', e);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await usersApi.list();
      const raw = res.data as any;
      const list = Array.isArray(raw) ? raw : (raw?.data || []);
      const parsed = list.map((item: any) =>
        item.attributes ? { id: item.id, ...item.attributes } : item,
      );
      setAllUsers(parsed);
      if (parsed.length > 0 && !selectedAddUserId()) {
        setSelectedAddUserId(String(parsed[0].id));
      }
    } catch (e) {
      console.error('Failed to load all users', e);
    }
  };

  onMount(() => {
    loadMembers();
    loadAllUsers();
  });

  createEffect(() => {
    const proj = currentProject();
    if (proj) {
      setName(proj.name || '');
      setDescription(proj.description || '');
      setGithubRepo(proj.githubRepo || '');
      setWebhookSecret(proj.githubWebhookSecret || '');
      loadMembers();
    }
  });

  const webhookUrl = () => {
    const host = window.location.origin.replace(':5173', ':3000');
    return `${host}/api/v1/github/webhook`;
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl());
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.addToast('Webhook URL copied to clipboard', 'info');
  };

  const handleSave = async () => {
    const proj = currentProject();
    if (!proj) return;
    setSaving(true);
    try {
      await projectsApi.update(proj.id, {
        name: name(),
        description: description(),
      });
      await projectsApi.updateGitHubSettings(proj.id, {
        github_repo: githubRepo().trim(),
        github_webhook_secret: webhookSecret().trim(),
        github_token: githubToken().trim(),
      });
      await updateProject(proj.id, {
        name: name(),
        description: description(),
        githubRepo: githubRepo().trim(),
        githubWebhookSecret: webhookSecret().trim(),
      });
      toast.addToast('Settings saved successfully', 'success');
    } catch {
      toast.addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestBot = async () => {
    setTestingBot(true);
    try {
      const proj = currentProject();
      const payload = {
        action: 'opened',
        pull_request: {
          number: 1,
          title: `Feat: Connect GitHub Bot to ${proj?.key}-1`,
          body: `Resolves ${proj?.key}-1 automatically`,
          html_url: githubRepo()
            ? `https://github.com/${githubRepo().replace(/^https?:\/\/github\.com\//, '')}/pull/1`
            : 'https://github.com/fvrvz/managease/pull/1',
          user: { login: 'github-bot' },
          head: { ref: `feature/${proj?.key}-1-bot-link` },
        },
        repository: {
          full_name: githubRepo().replace(/^https?:\/\/github\.com\//, '') || 'fvrvz/managease',
          html_url: githubRepo() || 'https://github.com/fvrvz/managease',
        },
      };

      const res = await fetch(webhookUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'pull_request',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.addToast('GitHub Bot simulated webhook delivered!', 'success');
      } else {
        toast.addToast('Bot webhook returned status ' + res.status, 'error');
      }
    } catch {
      toast.addToast('Failed to test GitHub bot webhook', 'error');
    } finally {
      setTestingBot(false);
    }
  };

  // Member Management Actions
  const handleAddMember = async () => {
    const proj = currentProject();
    const uid = selectedAddUserId();
    if (!proj || !uid) return;

    setAddingMember(true);
    try {
      await projectsApi.addMember(proj.id, uid, selectedAddRole());
      toast.addToast('Member added to project', 'success');
      await loadMembers();
    } catch (err: any) {
      toast.addToast(err?.response?.data?.error || 'Failed to add member', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const proj = currentProject();
    if (!proj) return;
    try {
      await projectsApi.updateMember(proj.id, userId, newRole);
      toast.addToast('Role updated', 'success');
      await loadMembers();
    } catch {
      toast.addToast('Failed to update role', 'error');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const proj = currentProject();
    if (!proj) return;
    if (!confirm('Are you sure you want to remove this user from the project?')) return;
    try {
      await projectsApi.removeMember(proj.id, userId);
      toast.addToast('Member removed from project', 'info');
      await loadMembers();
    } catch {
      toast.addToast('Failed to remove member', 'error');
    }
  };

  // Global User Creation
  const handleCreateUser = async () => {
    if (!newUserEmail() || !newUserPassword()) {
      toast.addToast('Email and password are required', 'error');
      return;
    }
    setCreatingUser(true);
    try {
      await usersApi.create({
        name: newUserName().trim() || newUserEmail().split('@')[0],
        email: newUserEmail().trim(),
        password: newUserPassword(),
        role: newUserRole() as any,
      });
      toast.addToast('User created successfully', 'success');
      setShowCreateUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      await loadAllUsers();
    } catch (err: any) {
      toast.addToast(err?.response?.data?.error || 'Failed to create user', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div class="space-y-6 max-w-5xl pb-16">
      {/* Page Header & Tabs */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Project Settings</h1>
          <p class="text-xs text-slate-500 mt-0.5">
            Manage project details, GitHub integrations, and team member permissions
          </p>
        </div>

        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            class={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab() === 'general'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings class="w-4 h-4" />
            <span>General & GitHub</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            class={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab() === 'team'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users class="w-4 h-4" />
            <span>Team & User Management</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: General & GitHub Bot ── */}
      <Show when={activeTab() === 'general'}>
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-slate-900">Project Configuration</h2>
            <Button
              variant="primary"
              size="sm"
              loading={saving()}
              onClick={handleSave}
              class="flex items-center gap-1.5 shadow-sm"
            >
              <Save class="w-4 h-4" />
              <span>Save Changes</span>
            </Button>
          </div>

          {/* GitHub Integration Card */}
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div class="flex items-start gap-3">
              <div class="p-2.5 rounded-xl bg-slate-900 text-white shrink-0 shadow-sm">
                <Bot class="w-6 h-6" />
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-slate-900 text-base">GitHub Bot Integration</h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Auto-Link PRs
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1">
                  Connect your GitHub repository to enable automatic ticket linking and state transitions when pull requests are created or merged.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-1">
                  GitHub Repository
                </label>
                <div class="relative">
                  <GitBranch class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="e.g. facebook/react or https://github.com/fvrvz/managease"
                    value={githubRepo()}
                    onInput={(e) => setGithubRepo(e.currentTarget.value)}
                  />
                </div>
              </div>

              <div>
                <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-1">
                  Webhook Secret (Optional)
                </label>
                <div class="relative">
                  <ShieldCheck class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="Enter secret for HMAC verification"
                    value={webhookSecret()}
                    onInput={(e) => setWebhookSecret(e.currentTarget.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-1">
                GitHub Personal Access Token (for Bot comments)
              </label>
              <div class="relative">
                <Key class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="ghp_xxxxxxxxxxxx (Requires repo / pull_request write access)"
                  value={githubToken()}
                  onInput={(e) => setGithubToken(e.currentTarget.value)}
                />
              </div>
            </div>

            {/* Webhook URL Endpoint Box */}
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <span class="text-xs font-bold text-slate-700">Webhook Payload URL</span>
              <p class="text-xs text-slate-500">
                Configure this URL in your repository's GitHub Settings &rarr; Webhooks:
              </p>
              <div class="flex items-center gap-2">
                <code class="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono text-slate-800 break-all select-all">
                  {webhookUrl()}
                </code>
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition shrink-0"
                >
                  <Show when={copiedWebhook()} fallback={<Copy class="w-3.5 h-3.5" />}>
                    <Check class="w-3.5 h-3.5 text-emerald-600" />
                  </Show>
                  <span>{copiedWebhook() ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* GitHub Bot Instructions */}
            <div class="rounded-xl bg-blue-50/60 border border-blue-100 p-4 text-xs text-blue-900 space-y-2">
              <span class="font-bold">How Jira-Style Ticket Linking Works:</span>
              <ul class="list-disc pl-5 space-y-1 text-slate-700">
                <li>
                  When a PR is opened containing an issue key (e.g.{' '}
                  <span class="font-mono font-bold text-blue-700">{params.projectKey}-1</span>),
                  the bot links the PR and moves the status to{' '}
                  <strong>In Progress / In Review</strong>.
                </li>
                <li>
                  When the PR is merged, the bot transitions the issue to{' '}
                  <strong>Done</strong> automatically.
                </li>
              </ul>
            </div>

            {/* Test Webhook Button */}
            <div class="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleTestBot}
                disabled={testingBot()}
                class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
              >
                <Send class="w-3.5 h-3.5 text-blue-600" />
                <span>{testingBot() ? 'Testing…' : 'Test GitHub Bot Webhook'}</span>
              </button>
            </div>
          </div>

          {/* General Project Metadata Section */}
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Project Details
            </h2>
            <Input
              label="Project Name"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              fullWidth
            />
            <div>
              <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-1">
                Description
              </label>
              <textarea
                class="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[80px]"
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
              />
            </div>
          </div>
        </div>
      </Show>

      {/* ── TAB 2: Team & User Management ── */}
      <Show when={activeTab() === 'team'}>
        <div class="space-y-6">
          {/* Add Member Box */}
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-slate-900 text-sm">Add Team Member to Project</h3>
                <p class="text-xs text-slate-500">
                  Assign registered users roles to grant board access and issue assignment
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateUserModal(true)}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition"
              >
                <UserPlus class="w-3.5 h-3.5" />
                <span>Create New User</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div class="sm:col-span-2">
                <label class="text-xs font-semibold text-slate-700 mb-1 block">
                  Select User
                </label>
                <select
                  class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                  value={selectedAddUserId()}
                  onChange={(e) => setSelectedAddUserId(e.currentTarget.value)}
                >
                  <For each={allUsers()}>
                    {(u) => (
                      <option value={u.id}>
                        {u.name} ({u.email}) - {u.role || 'user'}
                      </option>
                    )}
                  </For>
                </select>
              </div>

              <div>
                <label class="text-xs font-semibold text-slate-700 mb-1 block">Role</label>
                <div class="flex gap-2">
                  <select
                    class="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                    value={selectedAddRole()}
                    onChange={(e) => setSelectedAddRole(e.currentTarget.value)}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin / Lead</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={addingMember()}
                    onClick={handleAddMember}
                    class="shrink-0"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Current Project Members Table */}
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="p-4 border-b border-slate-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Shield class="w-4 h-4 text-blue-600" />
                <h3 class="font-bold text-slate-900 text-sm">Current Project Members</h3>
              </div>
              <span class="text-xs text-slate-500 font-medium">
                {membersList().length} members
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th class="px-4 py-3">Member</th>
                    <th class="px-4 py-3">Email</th>
                    <th class="px-4 py-3">Role</th>
                    <th class="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <For
                    each={membersList()}
                    fallback={
                      <tr>
                        <td colspan="4" class="px-4 py-8 text-center text-slate-400 italic">
                          No project members assigned yet.
                        </td>
                      </tr>
                    }
                  >
                    {(member) => (
                      <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-2.5">
                            <Avatar
                              name={member.user?.name || member.user?.email}
                              src={member.user?.avatarUrl}
                              size="sm"
                            />
                            <span class="font-semibold text-slate-900">
                              {member.user?.name || 'User'}
                            </span>
                          </div>
                        </td>
                        <td class="px-4 py-3 text-slate-600 font-mono text-[11px]">
                          {member.user?.email}
                        </td>
                        <td class="px-4 py-3">
                          <select
                            class="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white font-medium text-slate-700 outline-none focus:border-blue-500"
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(String(member.user.id), e.currentTarget.value)
                            }
                          >
                            <option value="admin">Admin / Lead</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                        <td class="px-4 py-3 text-right">
                          <button
                            type="button"
                            title="Remove member"
                            onClick={() => handleRemoveMember(String(member.user.id))}
                            class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>

          {/* System Users Directory */}
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 class="font-bold text-slate-900 text-sm">System Users Directory</h3>
                <p class="text-xs text-slate-500">
                  All accounts registered in the ManagEase instance
                </p>
              </div>
              <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                {allUsers().length} registered
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th class="px-4 py-3">User</th>
                    <th class="px-4 py-3">Email</th>
                    <th class="px-4 py-3">System Role</th>
                    <th class="px-4 py-3">Member Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <For each={allUsers()}>
                    {(u) => {
                      const isMember = () =>
                        membersList().some((m) => String(m.user?.id) === String(u.id));
                      return (
                        <tr class="hover:bg-slate-50/60 transition-colors">
                          <td class="px-4 py-3 font-medium text-slate-900">
                            <div class="flex items-center gap-2">
                              <Avatar name={u.name || u.email} size="sm" />
                              <span>{u.name || u.email}</span>
                            </div>
                          </td>
                          <td class="px-4 py-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                          <td class="px-4 py-3">
                            <span
                              class={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {u.role || 'member'}
                            </span>
                          </td>
                          <td class="px-4 py-3">
                            <Show
                              when={isMember()}
                              fallback={
                                <span class="text-slate-400 text-xs italic">Not in project</span>
                              }
                            >
                              <span class="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                                <UserCheck class="w-3.5 h-3.5 text-emerald-600" />
                                <span>Active Member</span>
                              </span>
                            </Show>
                          </td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Show>

      {/* ── Create User Modal ── */}
      <Show when={showCreateUserModal()}>
        <Modal
          open={showCreateUserModal()}
          onClose={() => setShowCreateUserModal(false)}
          title="Create New System User"
          size="sm"
        >
          <div class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                value={newUserName()}
                onInput={(e) => setNewUserName(e.currentTarget.value)}
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                placeholder="user@example.com"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                value={newUserEmail()}
                onInput={(e) => setNewUserEmail(e.currentTarget.value)}
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                value={newUserPassword()}
                onInput={(e) => setNewUserPassword(e.currentTarget.value)}
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Role</label>
              <select
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                value={newUserRole()}
                onChange={(e) => setNewUserRole(e.currentTarget.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin / Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateUserModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={creatingUser()}
                onClick={handleCreateUser}
              >
                Create User
              </Button>
            </div>
          </div>
        </Modal>
      </Show>
    </div>
  );
}
export default SettingsPage;
