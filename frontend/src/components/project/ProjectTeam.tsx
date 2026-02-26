import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, AlertTriangle, Check, X } from 'lucide-react';
import api, { fmt } from '../../lib/api';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { TeamMember } from '../../types';

interface ProjectMember {
  id: string;
  projectId: string;
  teamMemberId: string;
  teamMember: {
    id: string;
    name: string;
    role: string;
    hourlyRateInternal: number;
  };
  allocatedHours: number;
  loggedHours: number;
  remainingHours: number;
  pctUtilised: number;
  costToDate: number;
}

function utilizationColor(pct: number): string {
  if (pct >= 100) return 'text-red-600 bg-red-50';
  if (pct >= 80) return 'text-amber-600 bg-amber-50';
  return 'text-green-600 bg-green-50';
}

function utilizationBarColor(pct: number): string {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-indigo-500';
}

function AddMemberModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: members } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: () => api.get('/team?active=true').then(r => r.data),
  });
  const { data: existing } = useQuery<ProjectMember[]>({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then(r => r.data),
  });

  const existingIds = new Set(existing?.map(m => m.teamMemberId) ?? []);
  const available = members?.filter(m => !existingIds.has(m.id)) ?? [];

  const [teamMemberId, setTeamMemberId] = useState('');
  const [allocatedHours, setAllocatedHours] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/projects/${projectId}/members`, {
        teamMemberId,
        allocatedHours: parseFloat(allocatedHours) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      onClose();
    },
  });

  return (
    <form
      onSubmit={e => { e.preventDefault(); mutation.mutate(); }}
      className="space-y-4"
    >
      <div>
        <label className="label">Team Member *</label>
        <select
          className="input"
          required
          value={teamMemberId}
          onChange={e => setTeamMemberId(e.target.value)}
        >
          <option value="">Select a person…</option>
          {available.map(m => (
            <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
          ))}
        </select>
        {available.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">All active team members are already on this project</p>
        )}
      </div>
      <div>
        <label className="label">Allocated Hours</label>
        <input
          className="input"
          type="number"
          min="0"
          step="0.5"
          placeholder="e.g. 80"
          value={allocatedHours}
          onChange={e => setAllocatedHours(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">Total hours budgeted for this person on this project</p>
      </div>
      {mutation.isError && (
        <p className="text-sm text-red-600">Failed to add member</p>
      )}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={mutation.isPending || !teamMemberId} className="btn-primary flex-1">
          {mutation.isPending ? 'Adding…' : 'Add to Project'}
        </button>
      </div>
    </form>
  );
}

function InlineHoursEdit({
  member,
  projectId,
  onDone,
}: {
  member: ProjectMember;
  projectId: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState(String(member.allocatedHours));

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/projects/${projectId}/members/${member.id}`, {
        allocatedHours: parseFloat(value) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={e => { e.preventDefault(); mutation.mutate(); }}
      className="flex items-center gap-1.5"
    >
      <input
        className="input w-20 py-1 text-sm"
        type="number"
        min="0"
        step="0.5"
        value={value}
        onChange={e => setValue(e.target.value)}
        autoFocus
      />
      <button type="submit" disabled={mutation.isPending} className="p-1 text-green-600 hover:text-green-700">
        <Check size={14} />
      </button>
      <button type="button" onClick={onDone} className="p-1 text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
    </form>
  );
}

export default function ProjectTeam({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ProjectMember | null>(null);

  const { data: members, isLoading } = useQuery<ProjectMember[]>({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then(r => r.data),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/projects/${projectId}/members/${memberId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      setConfirmRemove(null);
    },
  });

  const totalAllocated = members?.reduce((s, m) => s + m.allocatedHours, 0) ?? 0;
  const totalLogged = members?.reduce((s, m) => s + m.loggedHours, 0) ?? 0;
  const totalCost = members?.reduce((s, m) => s + m.costToDate, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900">Team</h2>
          {members && members.length > 0 && (
            <span className="text-xs text-gray-400">
              {fmt.hours(totalLogged)} / {fmt.hours(totalAllocated)} logged · Cost: {fmt.currency(totalCost)}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-secondary text-sm flex items-center gap-1.5"
        >
          <Plus size={14} />
          Add Person
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : members && members.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Person</th>
                <th className="table-th text-right">Allocated</th>
                <th className="table-th text-right">Logged</th>
                <th className="table-th text-right">Remaining</th>
                <th className="table-th hidden md:table-cell">Utilisation</th>
                <th className="table-th text-right hidden lg:table-cell">Cost to Date</th>
                <th className="table-th w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map(m => {
                const over = m.pctUtilised >= 100;
                const approaching = m.pctUtilised >= 80 && m.pctUtilised < 100;
                return (
                  <tr key={m.id} className={`hover:bg-gray-50 ${over ? 'bg-red-50/30' : ''}`}>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        {over && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                        {approaching && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{m.teamMember.name}</p>
                          <p className="text-xs text-gray-400">{m.teamMember.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-right text-sm">
                      {editingId === m.id ? (
                        <InlineHoursEdit
                          member={m}
                          projectId={projectId}
                          onDone={() => setEditingId(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingId(m.id)}
                          className="flex items-center gap-1 ml-auto text-gray-700 hover:text-indigo-600 group"
                          title="Edit allocated hours"
                        >
                          {fmt.hours(m.allocatedHours)}
                          <Edit2 size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>
                    <td className="table-td text-right text-sm text-gray-600">
                      {fmt.hours(m.loggedHours)}
                    </td>
                    <td className={`table-td text-right text-sm font-medium ${m.remainingHours < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {m.remainingHours < 0 ? `+${fmt.hours(Math.abs(m.remainingHours))} over` : fmt.hours(m.remainingHours)}
                    </td>
                    <td className="table-td hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-24">
                          <div
                            className={`h-1.5 rounded-full transition-all ${utilizationBarColor(m.pctUtilised)}`}
                            style={{ width: `${Math.min(m.pctUtilised, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${utilizationColor(m.pctUtilised)}`}>
                          {m.pctUtilised.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="table-td text-right text-sm hidden lg:table-cell text-gray-600">
                      {fmt.currency(m.costToDate)}
                    </td>
                    <td className="table-td">
                      <button
                        onClick={() => setConfirmRemove(m)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        title="Remove from project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-100">
              <tr>
                <td className="table-td text-xs font-medium text-gray-500 uppercase tracking-wide">Totals</td>
                <td className="table-td text-right text-sm font-semibold">{fmt.hours(totalAllocated)}</td>
                <td className="table-td text-right text-sm font-semibold">{fmt.hours(totalLogged)}</td>
                <td className="table-td text-right text-sm font-semibold">
                  {fmt.hours(totalAllocated - totalLogged)}
                </td>
                <td className="table-td hidden md:table-cell" />
                <td className="table-td text-right text-sm font-semibold hidden lg:table-cell">
                  {fmt.currency(totalCost)}
                </td>
                <td className="table-td" />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
          <p className="text-sm text-gray-400">No team members assigned yet</p>
          <button onClick={() => setShowAdd(true)} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Add the first person →
          </button>
        </div>
      )}

      {/* Add member modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Team Member">
        <AddMemberModal projectId={projectId} onClose={() => setShowAdd(false)} />
      </Modal>

      {/* Confirm remove dialog */}
      <Modal
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title="Remove from Project"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Remove <span className="font-medium text-gray-900">{confirmRemove?.teamMember.name}</span> from this project?
          </p>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Their logged time entries will be kept for historical accuracy.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmRemove(null)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => confirmRemove && removeMutation.mutate(confirmRemove.id)}
              disabled={removeMutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
