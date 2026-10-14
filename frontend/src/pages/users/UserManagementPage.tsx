import { createSignal, createEffect, onMount, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  UserCheck,
  Mail,
  Lock,
  Search,
  CheckCircle2,
} from 'lucide-solid';
import {
  currentProject,
  fetchProject,
  projectMembers,
  fetchProjectMembers,
} from '@/stores/project.store';
import { user as currentUser } from '@/stores/auth.store';
import { projectsApi, usersApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import type { User } from '@/types';

interface ProjectMemberInfo {
  user: User;
  role: string;
  joined_at?: string;
}

export function UserManagementPage() {
  const params = useParams();
  const toast = useToast();

  const [membersList, setMembersList] = createSignal<ProjectMemberInfo[]>([]);
  const [allUsers, setAllUsers] = createSignal<User[]>([]);
  const [selectedAddUserId, setSelectedAddUserId] = createSignal('');
  const [selectedAddRole, setSelectedAddRole] = createSignal('member');
  const [addingMember, setAddingMember] = createSignal(false);
  const [searchUserQuery, setSearchUserQuery] = createSignal('');

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
      const list = Array.isArray(raw) ? raw : raw?.data || [];
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

  onMount(async () => {
    if (params.projectKey && (!currentProject() || currentProject()?.key !== params.projectKey)) {
      await fetchProject(params.projectKey);
    }
    await Promise.all([loadMembers(), loadAllUsers()]);
  });

  createEffect(() => {
    const proj = currentProject();
    if (proj) {
      loadMembers();
    }
  });

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

  const filteredUsers = () => {
    const q = searchUserQuery().toLowerCase().trim();
    if (!q) return allUsers();
    return allUsers().filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)),
    );
  };

  return (
    <div class="space-y-6 max-w-5xl pb-16">
      {/* Page Header */}
      <div class="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <Users class="w-6 h-6 text-blue-600" />
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">User & Team Management</h1>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Manage project team members, assign access roles, and administer system accounts
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateUserModal(true)}
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition shrink-0"
        >
          <UserPlus class="w-4 h-4" />
          <span>Create New User</span>
        </button>
      </div>

      {/* Add Member to Current Project Card */}
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 class="font-bold text-slate-900 text-sm">Add Member to Project ({currentProject()?.name || params.projectKey})</h3>
          <p class="text-xs text-slate-500">
            Select a registered account to grant project access and allow issue assignment
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div class="sm:col-span-2">
            <label class="text-xs font-semibold text-slate-700 mb-1 block">Select User</label>
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
                Add Member
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Project Members Roster */}
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Shield class="w-4 h-4 text-blue-600" />
            <h3 class="font-bold text-slate-900 text-sm">Project Team Members</h3>
          </div>
          <span class="text-xs text-slate-500 font-semibold px-2 py-0.5 bg-slate-100 rounded-full">
            {membersList().length} members
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th class="px-4 py-3">Member</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">Project Role</th>
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
                        title="Remove member from project"
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

      {/* Global System Users Directory */}
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-bold text-slate-900 text-sm">System Users Directory</h3>
            <p class="text-xs text-slate-500">
              All accounts registered in the ManagEase instance
            </p>
          </div>

          <div class="relative w-64">
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users…"
              value={searchUserQuery()}
              onInput={(e) => setSearchUserQuery(e.currentTarget.value)}
              class="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th class="px-4 py-3">User</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">System Role</th>
                <th class="px-4 py-3">Project Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <For each={filteredUsers()}>
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
                            <span class="text-slate-400 text-xs italic">Not in this project</span>
                          }
                        >
                          <span class="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                            <span>Project Member</span>
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

      {/* Create User Modal */}
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
export default UserManagementPage;
