import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import api, { fmt } from '../../lib/api';
import Modal from '../ui/Modal';
import { useToast } from '../ui/Toast';
import LoadingSpinner from '../ui/LoadingSpinner';

import { useAuth } from '../../lib/auth';
import type { TeamMember } from '../../types';

interface TimeEntry {
  id: string;
  teamMemberId: string;
  projectId: string;
  date: string;
  hours: number;
  isBillable: boolean;
  taskCategory: string | null;
  notes: string | null;
  harvestEntryId: string | null;
  teamMember: { id: string; name: string; role: string };
  project: { id: string; name: string };
}

const taskCategories = ['Design', 'Development', 'Strategy', 'PM', 'QA', 'Research', 'Client', 'Admin', 'Other'];

function LogTimeModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: () => api.get('/team?active=true').then(r => r.data),
  });

  const [form, setForm] = useState({
    teamMemberId: user?.teamMemberId ?? '',
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    isBillable: true,
    taskCategory: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/time-entries', {
        teamMemberId: form.teamMemberId,
        projectId,
        date: form.date,
        hours: parseFloat(form.hours),
        isBillable: form.isBillable,
        taskCategory: form.taskCategory || null,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries', projectId] });
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['project-metrics', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      success('Time logged ✓');
      onClose();
    },
    onError: () => toastError('Failed to log time'),
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
          value={form.teamMemberId}
          onChange={e => setForm(f => ({ ...f, teamMemberId: e.target.value }))}
        >
          <option value="">Select…</option>
          {teamMembers?.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date *</label>
          <input
            className="input"
            type="date"
            required
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Hours *</label>
          <input
            className="input"
            type="number"
            required
            min="0.25"
            max="24"
            step="0.25"
            placeholder="e.g. 2.5"
            value={form.hours}
            onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Task Category</label>
          <select
            className="input"
            value={form.taskCategory}
            onChange={e => setForm(f => ({ ...f, taskCategory: e.target.value }))}
          >
            <option value="">No category</option>
            {taskCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Billable?</label>
          <select
            className="input"
            value={form.isBillable ? 'yes' : 'no'}
            onChange={e => setForm(f => ({ ...f, isBillable: e.target.value === 'yes' }))}
          >
            <option value="yes">Billable</option>
            <option value="no">Non-billable</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea
          className="input h-20 resize-none"
          placeholder="What did you work on?"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />
      </div>
      {mutation.isError && (
        <p className="text-sm text-red-600">Failed to log time</p>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Saving…' : 'Log Time'}
        </button>
      </div>
    </form>
  );
}

export default function TimeEntryLog({ projectId }: { projectId: string }) {
  const qc = useQueryClient();

  const { success, error: toastError } = useToast();
  const [showLog, setShowLog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TimeEntry | null>(null);

  const { data: entries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: ['time-entries', projectId],
    queryFn: () => api.get(`/time-entries?projectId=${projectId}&limit=100`).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/time-entries/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries', projectId] });
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      qc.invalidateQueries({ queryKey: ['project-metrics', projectId] });
      success('Time entry deleted');
      setConfirmDelete(null);
    },
    onError: () => toastError('Failed to delete entry'),
  });

  const totalHours = entries?.reduce((s, e) => s + Number(e.hours), 0) ?? 0;
  const billableHours = entries?.filter(e => e.isBillable).reduce((s, e) => s + Number(e.hours), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-indigo-500" />
          <h2 className="font-semibold text-gray-900">Time Entries</h2>
          {entries && entries.length > 0 && (
            <span className="text-xs text-gray-400">
              {fmt.hours(totalHours)} total · {fmt.hours(billableHours)} billable
            </span>
          )}
        </div>
        <button
          onClick={() => setShowLog(true)}
          className="btn-secondary text-sm flex items-center gap-1.5"
        >
          <Plus size={14} />
          Log Time
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : entries && entries.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Person</th>
                <th className="table-th">Date</th>
                <th className="table-th text-right">Hours</th>
                <th className="table-th hidden md:table-cell">Category</th>
                <th className="table-th hidden md:table-cell">Billable</th>
                <th className="table-th hidden lg:table-cell">Notes</th>
                <th className="table-th w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <p className="font-medium text-sm text-gray-900">{e.teamMember.name}</p>
                    <p className="text-xs text-gray-400">{e.teamMember.role}</p>
                  </td>
                  <td className="table-td text-sm text-gray-600">{fmt.shortDate(e.date)}</td>
                  <td className="table-td text-right text-sm font-medium">{fmt.hours(e.hours)}</td>
                  <td className="table-td hidden md:table-cell text-xs text-gray-500">
                    {e.taskCategory || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td hidden md:table-cell">
                    <span className={`text-xs font-medium ${e.isBillable ? 'text-green-600' : 'text-gray-400'}`}>
                      {e.isBillable ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="table-td hidden lg:table-cell text-xs text-gray-400 max-w-48 truncate">
                    {e.notes || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td">
                    {!e.harvestEntryId && (
                      <button
                        onClick={() => setConfirmDelete(e)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    {e.harvestEntryId && (
                      <span className="text-xs text-gray-300" title="Synced from Harvest">H</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
          <p className="text-sm text-gray-400">No time logged yet</p>
          <button onClick={() => setShowLog(true)} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Log the first entry →
          </button>
        </div>
      )}

      <Modal isOpen={showLog} onClose={() => setShowLog(false)} title="Log Time">
        <LogTimeModal projectId={projectId} onClose={() => setShowLog(false)} />
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Time Entry">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete <span className="font-medium">{confirmDelete && fmt.hours(confirmDelete.hours)}</span> logged by{' '}
            <span className="font-medium">{confirmDelete?.teamMember.name}</span> on{' '}
            <span className="font-medium">{confirmDelete && fmt.shortDate(confirmDelete.date)}</span>?
          </p>
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
              disabled={deleteMutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
