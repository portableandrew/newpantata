import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, User, UserCheck } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { TeamMember } from '../types';

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'ProjectManager' | 'TeamMember';
  isActive: boolean;
  teamMemberId: string | null;
  teamMember?: { name: string; role: string } | null;
  createdAt: string;
}

const roleLabel = {
  Admin: 'Admin',
  ProjectManager: 'Project Manager',
  TeamMember: 'Team Member',
};

const roleBadge = {
  Admin: 'red' as const,
  ProjectManager: 'blue' as const,
  TeamMember: 'gray' as const,
};

function UserForm({ onClose, existing }: { onClose: () => void; existing?: AppUser }) {
  const qc = useQueryClient();
  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: () => api.get('/team').then(r => r.data),
  });

  const [form, setForm] = useState({
    name: existing?.name ?? '',
    email: existing?.email ?? '',
    password: '',
    role: (existing?.role ?? 'TeamMember') as AppUser['role'],
    teamMemberId: existing?.teamMemberId ?? '',
    isActive: existing?.isActive ?? true,
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        role: data.role,
        teamMemberId: data.teamMemberId || null,
        isActive: data.isActive,
      };
      if (data.password) payload.password = data.password;
      if (existing) return api.put(`/auth/users/${existing.id}`, payload);
      return api.post('/auth/users', { ...payload, password: data.password });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
  });

  return (
    <form
      onSubmit={e => { e.preventDefault(); mutation.mutate(form); }}
      className="space-y-4"
    >
      <div>
        <label className="label">Full Name *</label>
        <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="label">Email *</label>
        <input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div>
        <label className="label">{existing ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
        <input
          className="input"
          type="password"
          required={!existing}
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          placeholder={existing ? '••••••••' : ''}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Role *</label>
          <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as AppUser['role'] }))}>
            <option value="Admin">Admin</option>
            <option value="ProjectManager">Project Manager</option>
            <option value="TeamMember">Team Member</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.isActive ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'active' }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Link to Team Member</label>
        <select className="input" value={form.teamMemberId} onChange={e => setForm(f => ({ ...f, teamMemberId: e.target.value }))}>
          <option value="">Not linked</option>
          {teamMembers?.map(tm => (
            <option key={tm.id} value={tm.id}>{tm.name} ({tm.role})</option>
          ))}
        </select>
      </div>
      {mutation.isError && (
        <p className="text-sm text-red-600">{(mutation.error as any)?.response?.data?.error || 'Failed to save'}</p>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Saving…' : existing ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);

  const { data: users, isLoading } = useQuery<AppUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/auth/users').then(r => r.data),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-400">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage login accounts and roles</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New User
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th hidden md:table-cell">Linked Member</th>
                <th className="table-th">Status</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users?.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="table-td text-gray-500">{u.email}</td>
                  <td className="table-td">
                    <Badge variant={roleBadge[u.role]}>
                      {roleLabel[u.role]}
                    </Badge>
                  </td>
                  <td className="table-td hidden md:table-cell text-gray-500">
                    {u.teamMember ? (
                      <span className="flex items-center gap-1.5">
                        <UserCheck size={13} className="text-green-500" />
                        {u.teamMember.name}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="table-td">
                    <Badge variant={u.isActive ? 'green' : 'gray'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => setEditing(u)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!users?.length && (
                <tr>
                  <td colSpan={6} className="table-td text-center text-gray-400 py-8">No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="New User">
        <UserForm onClose={() => setShowNew(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit User">
        {editing && <UserForm onClose={() => setEditing(null)} existing={editing} />}
      </Modal>
    </div>
  );
}
