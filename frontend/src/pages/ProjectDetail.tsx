import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Clock, TrendingUp, Users, BarChart2, DollarSign, Trash2, Pencil } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import api, { fmt } from '../lib/api';
import RagBadge from '../components/ui/RagBadge';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { Project, RagStatus, ProjectHealthUpdate, ProjectAssignment, ProjectCosts, TeamMember, Client, MemberRole } from '../types';

type Tab = 'overview' | 'team' | 'time' | 'timeline' | 'costs';

const ragOptions: RagStatus[] = ['Green', 'Orange', 'Red'];
const ragDimensions = [
  { key: 'scheduleStatus', label: 'Schedule' },
  { key: 'scopeStatus', label: 'Scope' },
  { key: 'budgetStatus', label: 'Budget' },
  { key: 'clientStatus', label: 'Client' },
] as const;

const typeLabel: Record<string, string> = {
  FixedPrice: 'Fixed Price',
  TM: 'Time & Materials',
  SLA: 'SLA',
  RIInternal: 'R&I Internal',
};

// ── Health Update Form ─────────────────────────────────────────────────────────
function HealthUpdateForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    updateDate: format(new Date(), 'yyyy-MM-dd'),
    overallStatus: 'Green' as RagStatus,
    scheduleStatus: 'Green' as RagStatus,
    scopeStatus: 'Green' as RagStatus,
    budgetStatus: 'Green' as RagStatus,
    clientStatus: 'Green' as RagStatus,
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/health`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', projectId] }); onClose(); },
  });

  const RagSelector = ({ field }: { field: keyof typeof form }) => (
    <div className="flex gap-2">
      {ragOptions.map(s => (
        <button key={s} type="button" onClick={() => setForm(f => ({ ...f, [field]: s }))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
            form[field] === s
              ? s === 'Green' ? 'bg-green-500 border-green-500 text-white'
                : s === 'Orange' ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-red-500 border-red-500 text-white'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}>
          <span className={`w-2 h-2 rounded-full ${form[field] === s ? 'bg-white' : s === 'Green' ? 'bg-green-400' : s === 'Orange' ? 'bg-amber-400' : 'bg-red-400'}`} />
          {s}
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div>
        <label className="label">Update Date</label>
        <input className="input" type="date" value={form.updateDate} onChange={e => setForm(f => ({ ...f, updateDate: e.target.value }))} />
      </div>
      <div>
        <label className="label mb-2">Overall Status</label>
        <RagSelector field="overallStatus" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {(['scheduleStatus', 'scopeStatus', 'budgetStatus', 'clientStatus'] as const).map(field => (
          <div key={field}>
            <label className="label mb-2">{field.replace('Status', '')}</label>
            <RagSelector field={field} />
          </div>
        ))}
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input h-24 resize-none" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any notable updates, risks, or actions..." />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Saving…' : 'Save Update'}
        </button>
      </div>
    </form>
  );
}

// ── Add Member Form ────────────────────────────────────────────────────────────
function AddMemberForm({ projectId, existingIds, onClose }: {
  projectId: string;
  existingIds: string[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: team } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: () => api.get('/team').then(r => r.data),
  });

  const available = team?.filter(m => m.isActive && !existingIds.includes(m.id)) ?? [];

  const [form, setForm] = useState({
    teamMemberId: '',
    allocationPct: '100',
    startDate: '',
    endDate: '',
    estimatedHours: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/members`, {
      teamMemberId: form.teamMemberId,
      allocationPct: parseFloat(form.allocationPct) || 100,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      qc.invalidateQueries({ queryKey: ['project-costs', projectId] });
      onClose();
    },
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div>
        <label className="label">Team Member *</label>
        <select className="input" required value={form.teamMemberId}
          onChange={e => setForm(f => ({ ...f, teamMemberId: e.target.value }))}>
          <option value="">Select person…</option>
          {available.map(m => (
            <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Allocation %</label>
          <input className="input" type="number" min="1" max="100" value={form.allocationPct}
            onChange={e => setForm(f => ({ ...f, allocationPct: e.target.value }))} />
        </div>
        <div>
          <label className="label">Estimated Hours</label>
          <input className="input" type="number" placeholder="e.g. 120" value={form.estimatedHours}
            onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Date</label>
          <input className="input" type="date" value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="label">End Date</label>
          <input className="input" type="date" value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <input className="input" placeholder="Optional notes" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={mutation.isPending || !form.teamMemberId} className="btn-primary flex-1">
          {mutation.isPending ? 'Adding…' : 'Add to Project'}
        </button>
      </div>
    </form>
  );
}

// ── Edit Project Form ──────────────────────────────────────────────────────────
function EditProjectForm({ project, onClose }: { project: Project; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: clients } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then(r => r.data),
  });

  const [form, setForm] = useState({
    name: project.name,
    clientId: project.clientId,
    projectType: project.projectType,
    status: project.status,
    startDate: project.startDate?.slice(0, 10) ?? '',
    endDate: project.endDate?.slice(0, 10) ?? '',
    budget: project.budget?.toString() ?? '0',
  });

  const mutation = useMutation({
    mutationFn: () => api.put(`/projects/${project.id}`, {
      name: form.name,
      clientId: form.clientId,
      projectType: form.projectType,
      status: form.status,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      budget: parseFloat(form.budget) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', project.id] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div>
        <label className="label">Project Name *</label>
        <input className="input" required value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="label">Client</label>
        <select className="input" value={form.clientId}
          onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
          {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.projectType}
            onChange={e => setForm(f => ({ ...f, projectType: e.target.value as any }))}>
            <option value="FixedPrice">Fixed Price</option>
            <option value="TM">Time & Materials</option>
            <option value="SLA">SLA</option>
            <option value="RIInternal">R&I Internal</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
            <option value="Pipeline">Pipeline</option>
            <option value="Active">Active</option>
            <option value="OnHold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Budget (AUD)</label>
        <input className="input" type="number" step="1000" min="0" value={form.budget}
          onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Date</label>
          <input className="input" type="date" value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="label">End Date</label>
          <input className="input" type="date" value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ── Team Tab ───────────────────────────────────────────────────────────────────
function TeamTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: assignments = [], isLoading } = useQuery<ProjectAssignment[]>({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then(r => r.data),
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) => api.delete(`/projects/${projectId}/members/${assignmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      qc.invalidateQueries({ queryKey: ['project-costs', projectId] });
    },
  });

  const roleColor: Record<string, string> = {
    Principal: 'purple',
    Lead: 'indigo',
    Designer: 'pink',
    Developer: 'blue',
    BA: 'amber',
    Production: 'green',
  };

  if (isLoading) return <LoadingSpinner className="py-12" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{assignments.length} team member{assignments.length !== 1 ? 's' : ''} assigned</p>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Member
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No team members assigned yet</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 btn-primary text-sm">Add First Member</button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Role</th>
                <th className="table-th text-right">Allocation</th>
                <th className="table-th text-right">Est. Hours</th>
                <th className="table-th hidden md:table-cell">Dates</th>
                <th className="table-th hidden lg:table-cell text-right">Bill Rate</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assignments.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <p className="font-medium text-gray-900">{a.teamMember.name}</p>
                    <p className="text-xs text-gray-400">{a.teamMember.email}</p>
                  </td>
                  <td className="table-td">
                    <Badge variant={(roleColor[a.teamMember.role] ?? 'gray') as any}>{a.teamMember.role}</Badge>
                  </td>
                  <td className="table-td text-right">
                    <span className={`text-sm font-semibold ${Number(a.allocationPct) === 100 ? 'text-gray-900' : 'text-amber-600'}`}>
                      {Number(a.allocationPct)}%
                    </span>
                  </td>
                  <td className="table-td text-right text-sm">
                    {a.estimatedHours ? fmt.hours(Number(a.estimatedHours)) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td hidden md:table-cell text-xs text-gray-500">
                    {a.startDate || a.endDate
                      ? `${fmt.shortDate(a.startDate)} → ${fmt.shortDate(a.endDate)}`
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td hidden lg:table-cell text-right text-sm">
                    {fmt.currency(Number(a.teamMember.hourlyRateBillable))}/h
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => { if (confirm(`Remove ${a.teamMember.name} from project?`)) removeMutation.mutate(a.id); }}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Team Member">
        <AddMemberForm
          projectId={projectId}
          existingIds={assignments.map(a => a.teamMemberId)}
          onClose={() => setShowAdd(false)}
        />
      </Modal>
    </div>
  );
}

// ── Timeline Tab ───────────────────────────────────────────────────────────────
function TimelineTab({ project }: { project: Project & { assignments?: ProjectAssignment[] } }) {
  const { data: assignments = [] } = useQuery<ProjectAssignment[]>({
    queryKey: ['project-members', project.id],
    queryFn: () => api.get(`/projects/${project.id}/members`).then(r => r.data),
  });

  const projStart = project.startDate ? parseISO(project.startDate) : null;
  const projEnd = project.endDate ? parseISO(project.endDate) : null;

  if (!projStart || !projEnd) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400 text-sm">Set project start and end dates to view the timeline.</p>
      </div>
    );
  }

  const totalDays = differenceInDays(projEnd, projStart) || 1;

  const pct = (date: Date) => Math.max(0, Math.min(100, (differenceInDays(date, projStart) / totalDays) * 100));
  const width = (start: Date, end: Date) => Math.max(2, pct(end) - pct(start));

  // Month markers
  const months: { label: string; left: number }[] = [];
  const cur = new Date(projStart);
  cur.setDate(1);
  while (cur <= projEnd) {
    months.push({ label: format(cur, 'MMM yy'), left: pct(cur) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const roleColors: Record<string, string> = {
    Principal: 'bg-purple-500',
    Lead: 'bg-indigo-500',
    Designer: 'bg-pink-500',
    Developer: 'bg-blue-500',
    BA: 'bg-amber-500',
    Production: 'bg-green-500',
  };

  const todayPct = pct(new Date());
  const showToday = todayPct >= 0 && todayPct <= 100;

  return (
    <div className="card space-y-6">
      {/* Month axis */}
      <div>
        <div className="relative h-5 mb-1">
          {months.map((m, i) => (
            <span key={i} className="absolute text-xs text-gray-400 -translate-x-1/2" style={{ left: `${m.left}%` }}>
              {m.label}
            </span>
          ))}
        </div>

        {/* Project bar */}
        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden mb-4">
          <div className="absolute inset-0 bg-indigo-500 rounded-lg flex items-center px-3">
            <span className="text-xs font-semibold text-white truncate">{project.name}</span>
          </div>
          {showToday && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10" style={{ left: `${todayPct}%` }} />
          )}
        </div>

        {/* Member bars */}
        {assignments.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No team members assigned — add members in the Team tab</p>
        )}
        <div className="space-y-2">
          {assignments.map(a => {
            const mStart = a.startDate ? parseISO(a.startDate) : projStart;
            const mEnd = a.endDate ? parseISO(a.endDate) : projEnd;
            const left = pct(mStart);
            const barWidth = width(mStart, mEnd);
            const color = roleColors[a.teamMember.role] ?? 'bg-gray-400';

            return (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-right">
                  <p className="text-xs font-medium text-gray-700 truncate">{a.teamMember.name}</p>
                  <p className="text-xs text-gray-400">{Number(a.allocationPct)}%</p>
                </div>
                <div className="relative flex-1 h-7 bg-gray-100 rounded">
                  <div
                    className={`absolute top-0 h-full rounded ${color} opacity-80 flex items-center px-2`}
                    style={{ left: `${left}%`, width: `${barWidth}%` }}
                  >
                    {barWidth > 15 && (
                      <span className="text-xs text-white font-medium truncate">
                        {a.estimatedHours ? `${Number(a.estimatedHours)}h` : a.teamMember.role}
                      </span>
                    )}
                  </div>
                  {showToday && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10" style={{ left: `${todayPct}%` }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Today label */}
        {showToday && (
          <div className="flex items-center gap-2 mt-3">
            <div className="w-0.5 h-3 bg-red-400 ml-[calc(128px+12px)]" />
            <span className="text-xs text-red-400 font-medium">Today — {format(new Date(), 'dd MMM yyyy')}</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
        {Object.entries(roleColors).map(([role, cls]) => (
          <div key={role} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${cls} opacity-80`} />
            <span className="text-xs text-gray-500">{role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Costs Tab ─────────────────────────────────────────────────────────────────
function CostsTab({ projectId, budget }: { projectId: string; budget: number }) {
  const { data: costs, isLoading } = useQuery<ProjectCosts>({
    queryKey: ['project-costs', projectId],
    queryFn: () => api.get(`/projects/${projectId}/costs`).then(r => r.data),
  });

  if (isLoading) return <LoadingSpinner className="py-12" />;
  if (!costs) return null;

  const { totals, memberCosts, contractors } = costs;
  const marginColor = totals.margin >= 20 ? 'text-green-600' : totals.margin >= 10 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="label">Budget</p>
          <p className="text-xl font-bold text-gray-900">{fmt.currency(budget)}</p>
        </div>
        <div className="card text-center">
          <p className="label">Total Cost (Actual)</p>
          <p className="text-xl font-bold text-gray-900">{fmt.currency(totals.totalDirectCost)}</p>
        </div>
        <div className="card text-center">
          <p className="label">Gross Profit</p>
          <p className={`text-xl font-bold ${totals.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmt.currency(totals.grossProfit)}
          </p>
        </div>
        <div className="card text-center">
          <p className="label">Margin</p>
          <p className={`text-xl font-bold ${marginColor}`}>{fmt.percent(totals.margin)}</p>
        </div>
      </div>

      {/* Labour breakdown */}
      {memberCosts.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Labour Costs by Team Member</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th pl-0">Member</th>
                <th className="table-th text-right">Est. Hours</th>
                <th className="table-th text-right">Actual Hours</th>
                <th className="table-th hidden md:table-cell text-right">Internal Rate</th>
                <th className="table-th text-right">Est. Cost</th>
                <th className="table-th text-right">Actual Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {memberCosts.map(m => {
                const overrun = m.actualCost > m.estimatedCost && m.estimatedCost > 0;
                return (
                  <tr key={m.assignmentId} className="hover:bg-gray-50">
                    <td className="table-td pl-0">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.role} · {m.allocationPct}%</p>
                    </td>
                    <td className="table-td text-right">{m.estimatedHours > 0 ? fmt.hours(m.estimatedHours) : '—'}</td>
                    <td className="table-td text-right font-medium">{m.actualHours > 0 ? fmt.hours(m.actualHours) : '—'}</td>
                    <td className="table-td hidden md:table-cell text-right text-gray-500">
                      {m.internalRate > 0 ? `${fmt.currency(m.internalRate)}/h` : '—'}
                    </td>
                    <td className="table-td text-right">{m.estimatedCost > 0 ? fmt.currency(m.estimatedCost) : '—'}</td>
                    <td className={`table-td text-right font-medium ${overrun ? 'text-red-600' : 'text-gray-900'}`}>
                      {m.actualCost > 0 ? fmt.currency(m.actualCost) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200">
              <tr>
                <td className="table-td pl-0 font-semibold text-gray-700">Labour Total</td>
                <td className="table-td text-right font-semibold">{fmt.currency(totals.estimatedLaborCost)}</td>
                <td className="table-td text-right font-semibold">{fmt.currency(totals.actualLaborCost)}</td>
                <td className="table-td hidden md:table-cell" />
                <td className="table-td text-right font-semibold">{fmt.currency(totals.estimatedLaborCost)}</td>
                <td className="table-td text-right font-semibold">{fmt.currency(totals.actualLaborCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Contractors */}
      {contractors.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Contractor Costs</h3>
          <div className="space-y-2">
            {contractors.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <Badge variant={c.status === 'Active' ? 'green' : 'gray'}>{c.status}</Badge>
                </div>
                <p className="font-medium text-sm">{fmt.currency(c.cost)}</p>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-semibold text-sm">
              <span>Contractor Total</span>
              <span>{fmt.currency(totals.contractorCost)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cost vs Budget visual */}
      {budget > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Budget vs Costs</h3>
          <div className="space-y-3">
            {[
              { label: 'Labour Cost', value: totals.actualLaborCost, color: 'bg-indigo-500' },
              { label: 'Contractor Cost', value: totals.contractorCost, color: 'bg-purple-500' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{row.label}</span>
                  <span>{fmt.currency(row.value)} ({fmt.percent((row.value / budget) * 100)})</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.color}`}
                    style={{ width: `${Math.min(100, (row.value / budget) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between text-xs font-medium text-gray-700 pt-1 border-t border-gray-100">
              <span>Total Direct Cost</span>
              <span className={totals.totalDirectCost > budget ? 'text-red-600' : 'text-green-600'}>
                {fmt.currency(totals.totalDirectCost)} of {fmt.currency(budget)}
              </span>
            </div>
          </div>
        </div>
      )}

      {memberCosts.length === 0 && contractors.length === 0 && (
        <div className="card text-center py-12">
          <DollarSign size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No cost data yet — assign team members and log time entries</p>
        </div>
      )}
    </div>
  );
}

// ── Time Summary Tab ───────────────────────────────────────────────────────────
interface TimeSummaryEntry {
  id: string;
  name: string;
  role: MemberRole;
  billableHours: number;
  nonBillableHours: number;
}

function TimeSummaryTab({ projectId, project }: { projectId: string; project: Project }) {
  const { data: timeSummary = [], isLoading } = useQuery<TimeSummaryEntry[]>({
    queryKey: ['project-time-summary', projectId],
    queryFn: () => api.get(`/projects/${projectId}/time-summary`).then(r => r.data),
  });

  const { data: assignments = [] } = useQuery<ProjectAssignment[]>({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then(r => r.data),
  });

  if (isLoading) return <LoadingSpinner className="py-12" />;

  const totalBillable = timeSummary.reduce((s, m) => s + m.billableHours, 0);
  const totalNonBillable = timeSummary.reduce((s, m) => s + m.nonBillableHours, 0);
  const totalHours = totalBillable + totalNonBillable;
  const totalEstimated = assignments.reduce((s, a) => s + Number(a.estimatedHours ?? 0), 0);

  let timeElapsedPct: number | null = null;
  if (project.startDate && project.endDate) {
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.endDate).getTime();
    const now = Date.now();
    timeElapsedPct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  }

  const hoursConsumedPct = totalEstimated > 0 ? (totalHours / totalEstimated) * 100 : null;

  let onTrackStatus: 'on-track' | 'over' | 'under' | 'no-data' = 'no-data';
  if (timeElapsedPct !== null && hoursConsumedPct !== null) {
    const diff = hoursConsumedPct - timeElapsedPct;
    if (diff > 10) onTrackStatus = 'over';
    else if (diff < -15) onTrackStatus = 'under';
    else onTrackStatus = 'on-track';
  }

  const roleColor: Record<string, string> = {
    Principal: 'purple', Lead: 'indigo', Designer: 'pink',
    Developer: 'blue', BA: 'amber', Production: 'green',
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="label">Total Hours</p>
          <p className="text-2xl font-bold text-gray-900">{fmt.hours(totalHours)}</p>
        </div>
        <div className="card text-center">
          <p className="label">Billable</p>
          <p className="text-2xl font-bold text-green-600">{fmt.hours(totalBillable)}</p>
          {totalHours > 0 && <p className="text-xs text-gray-400 mt-0.5">{fmt.percent((totalBillable / totalHours) * 100)}</p>}
        </div>
        <div className="card text-center">
          <p className="label">Non-Billable</p>
          <p className="text-2xl font-bold text-gray-500">{fmt.hours(totalNonBillable)}</p>
        </div>
        <div className="card text-center">
          <p className="label">vs Estimated</p>
          {totalEstimated > 0 ? (
            <>
              <p className={`text-2xl font-bold ${hoursConsumedPct! > 100 ? 'text-red-600' : 'text-gray-900'}`}>
                {fmt.percent(hoursConsumedPct!)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">of {fmt.hours(totalEstimated)}</p>
            </>
          ) : <p className="text-xl font-bold text-gray-300">—</p>}
        </div>
      </div>

      {/* Burn rate */}
      {timeElapsedPct !== null && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Project Burn Rate</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Time elapsed</span>
                <span>{fmt.percent(timeElapsedPct)}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, timeElapsedPct)}%` }} />
              </div>
            </div>
            {hoursConsumedPct !== null && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Hours consumed</span>
                  <span>{fmt.percent(hoursConsumedPct)} ({fmt.hours(totalHours)} of {fmt.hours(totalEstimated)})</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${hoursConsumedPct > 100 ? 'bg-red-500' : hoursConsumedPct > timeElapsedPct + 10 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, hoursConsumedPct)}%` }}
                  />
                </div>
              </div>
            )}
            <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium ${
              onTrackStatus === 'on-track' ? 'bg-green-50 text-green-700' :
              onTrackStatus === 'over' ? 'bg-red-50 text-red-700' :
              onTrackStatus === 'under' ? 'bg-amber-50 text-amber-700' :
              'bg-gray-50 text-gray-500'
            }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                onTrackStatus === 'on-track' ? 'bg-green-500' :
                onTrackStatus === 'over' ? 'bg-red-500' :
                onTrackStatus === 'under' ? 'bg-amber-500' : 'bg-gray-300'
              }`} />
              {onTrackStatus === 'on-track' ? 'On track — hours consumed aligns with project timeline' :
               onTrackStatus === 'over' ? 'Attention — hours consumed is running ahead of the project timeline' :
               onTrackStatus === 'under' ? 'Under-tracked — hours are behind the expected timeline' :
               'Set estimated hours on team assignments to track burn rate'}
            </div>
          </div>
        </div>
      )}

      {/* Per-member breakdown */}
      {timeSummary.length > 0 ? (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Hours by Team Member</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th pl-0">Member</th>
                <th className="table-th text-right">Billable</th>
                <th className="table-th text-right">Non-Billable</th>
                <th className="table-th text-right">Total</th>
                <th className="table-th text-right hidden md:table-cell">Estimated</th>
                <th className="table-th text-right">% Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {timeSummary.map(m => {
                const assignment = assignments.find(a => a.teamMemberId === m.id);
                const estimated = Number(assignment?.estimatedHours ?? 0);
                const total = m.billableHours + m.nonBillableHours;
                const pctUsed = estimated > 0 ? (total / estimated) * 100 : null;
                const overrun = pctUsed !== null && pctUsed > 100;
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="table-td pl-0">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <Badge variant={(roleColor[m.role] ?? 'gray') as any}>{m.role}</Badge>
                    </td>
                    <td className="table-td text-right text-green-700 font-medium">{fmt.hours(m.billableHours)}</td>
                    <td className="table-td text-right text-gray-400">{m.nonBillableHours > 0 ? fmt.hours(m.nonBillableHours) : '—'}</td>
                    <td className="table-td text-right font-semibold">{fmt.hours(total)}</td>
                    <td className="table-td text-right text-gray-500 hidden md:table-cell">{estimated > 0 ? fmt.hours(estimated) : '—'}</td>
                    <td className={`table-td text-right font-medium ${overrun ? 'text-red-600' : 'text-gray-900'}`}>
                      {pctUsed !== null ? fmt.percent(pctUsed) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200">
              <tr>
                <td className="table-td pl-0 font-semibold text-gray-700">Total</td>
                <td className="table-td text-right font-semibold text-green-700">{fmt.hours(totalBillable)}</td>
                <td className="table-td text-right font-semibold text-gray-400">{totalNonBillable > 0 ? fmt.hours(totalNonBillable) : '—'}</td>
                <td className="table-td text-right font-bold">{fmt.hours(totalHours)}</td>
                <td className="table-td text-right font-semibold text-gray-500 hidden md:table-cell">{totalEstimated > 0 ? fmt.hours(totalEstimated) : '—'}</td>
                <td className="table-td text-right font-semibold">{totalEstimated > 0 ? fmt.percent((totalHours / totalEstimated) * 100) : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="card text-center py-12">
          <Clock size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No time entries logged yet for this project</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showHealthUpdate, setShowHealthUpdate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const { data: project, isLoading } = useQuery<Project & {
    contractors: any[];
    feedback: any[];
    timeEntries: any[];
  }>({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data),
  });

  if (isLoading) return <LoadingSpinner className="py-24" />;
  if (!project) return <div className="text-gray-400">Project not found</div>;

  const latest = project.healthUpdates?.[0];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp size={14} /> },
    { id: 'team', label: 'Team', icon: <Users size={14} /> },
    { id: 'time', label: 'Time Tracking', icon: <Clock size={14} /> },
    { id: 'timeline', label: 'Timeline', icon: <BarChart2 size={14} /> },
    { id: 'costs', label: 'Costs & Margin', icon: <DollarSign size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/projects" className="flex items-center gap-1 text-gray-400 hover:text-gray-700">
          <ChevronLeft size={14} />Projects
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {latest && <RagBadge status={latest.overallStatus} />}
            <Badge variant="blue">{typeLabel[project.projectType]}</Badge>
            <Badge variant={project.status === 'Active' ? 'green' : project.status === 'OnHold' ? 'amber' : 'gray'}>
              {project.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-500 mt-0.5">{project.client.name}</p>
          <p className="text-xs text-gray-400 mt-1">
            {fmt.date(project.startDate)} → {fmt.date(project.endDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-secondary flex items-center gap-2">
            <Pencil size={15} />Edit Project
          </button>
          <button onClick={() => setShowHealthUpdate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />Update Health
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="label">Budget</p>
          <p className="text-xl font-bold text-gray-900">{fmt.currency(Number(project.budget))}</p>
        </div>
        {project.financials?.[0] ? (
          <>
            <div className="card text-center">
              <p className="label">Actual Fees</p>
              <p className="text-xl font-bold text-gray-900">{fmt.currency(Number(project.financials[0].actualFees))}</p>
            </div>
            <div className="card text-center">
              <p className="label">EAC</p>
              <p className="text-xl font-bold text-gray-900">{fmt.currency(Number(project.financials[0].estimateAtComplete))}</p>
            </div>
            <div className="card text-center">
              <p className="label">Margin</p>
              <p className={`text-xl font-bold ${Number(project.financials[0].profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt.percent(Number(project.financials[0].profitMargin))}
              </p>
            </div>
          </>
        ) : (
          <div className="col-span-3 card flex items-center justify-center">
            <p className="text-sm text-gray-400">No financial data recorded yet</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Health Status */}
          {latest && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Current Health Status</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {ragDimensions.map(({ key, label }) => (
                  <div key={key} className="text-center">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                    <div className="flex justify-center"><RagBadge status={latest[key]} /></div>
                  </div>
                ))}
              </div>
              {latest.notes && <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{latest.notes}</p>}
              <p className="mt-2 text-xs text-gray-400">Last updated {fmt.date(latest.updateDate)}</p>
            </div>
          )}

          {/* Health History */}
          {project.healthUpdates?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Health History</h2>
              </div>
              <div className="space-y-3">
                {project.healthUpdates.map((u: ProjectHealthUpdate, i: number) => (
                  <div key={u.id} className={`flex items-start gap-4 p-3 rounded-lg ${i === 0 ? 'bg-gray-50' : ''}`}>
                    <div className="text-xs text-gray-400 w-20 shrink-0 mt-0.5">{fmt.shortDate(u.updateDate)}</div>
                    <div className="flex gap-1.5 flex-wrap">
                      <RagBadge status={u.overallStatus} size="sm" />
                      {ragDimensions.map(({ key, label }) => (
                        <span key={key} className="text-xs text-gray-400 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${u[key] === 'Green' ? 'bg-green-400' : u[key] === 'Orange' ? 'bg-amber-400' : 'bg-red-400'}`} />
                          {label}
                        </span>
                      ))}
                    </div>
                    {u.notes && <p className="text-xs text-gray-500 flex-1">{u.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Time Entries */}
          {project.timeEntries?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Recent Time Entries</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th pl-0">Team Member</th>
                    <th className="table-th">Date</th>
                    <th className="table-th">Hours</th>
                    <th className="table-th">Billable</th>
                    <th className="table-th">Task</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {project.timeEntries.slice(0, 10).map((e: any) => (
                    <tr key={e.id}>
                      <td className="table-td pl-0 font-medium">{e.teamMember.name}</td>
                      <td className="table-td">{fmt.shortDate(e.date)}</td>
                      <td className="table-td">{fmt.hours(e.hours)}</td>
                      <td className="table-td">
                        <span className={`text-xs font-medium ${e.isBillable ? 'text-green-600' : 'text-gray-400'}`}>
                          {e.isBillable ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="table-td text-gray-400">{e.taskCategory || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Contractors */}
          {project.contractors?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Contractors</h2>
              <div className="space-y-2">
                {project.contractors.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{fmt.date(c.startDate)} → {c.endDate ? fmt.date(c.endDate) : 'Ongoing'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{fmt.currency(c.totalCost)}</p>
                      <Badge variant={c.status === 'Active' ? 'green' : 'gray'}>{c.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'team' && id && <TeamTab projectId={id} />}

      {activeTab === 'time' && id && <TimeSummaryTab projectId={id} project={project} />}

      {activeTab === 'timeline' && <TimelineTab project={project as any} />}

      {activeTab === 'costs' && id && (
        <CostsTab projectId={id} budget={Number(project.budget)} />
      )}

      <Modal isOpen={showHealthUpdate} onClose={() => setShowHealthUpdate(false)} title="Update Health Status">
        {id && <HealthUpdateForm projectId={id} onClose={() => setShowHealthUpdate(false)} />}
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Project">
        <EditProjectForm project={project} onClose={() => setShowEdit(false)} />
      </Modal>
    </div>
  );
}
