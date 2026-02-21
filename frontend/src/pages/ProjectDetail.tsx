import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import api, { fmt } from '../lib/api';
import RagBadge from '../components/ui/RagBadge';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { Project, RagStatus, ProjectHealthUpdate } from '../types';

type RagChoice = RagStatus;

const ragOptions: RagChoice[] = ['Green', 'Orange', 'Red'];

function HealthUpdateForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    updateDate: format(new Date(), 'yyyy-MM-dd'),
    overallStatus: 'Green' as RagChoice,
    scheduleStatus: 'Green' as RagChoice,
    scopeStatus: 'Green' as RagChoice,
    budgetStatus: 'Green' as RagChoice,
    clientStatus: 'Green' as RagChoice,
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/health`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      onClose();
    },
  });

  const RagSelector = ({ field }: { field: keyof typeof form }) => (
    <div className="flex gap-2">
      {ragOptions.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => setForm(f => ({ ...f, [field]: s }))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
            form[field] === s
              ? s === 'Green' ? 'bg-green-500 border-green-500 text-white'
                : s === 'Orange' ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-red-500 border-red-500 text-white'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
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
        <div>
          <label className="label mb-2">Schedule</label>
          <RagSelector field="scheduleStatus" />
        </div>
        <div>
          <label className="label mb-2">Scope</label>
          <RagSelector field="scopeStatus" />
        </div>
        <div>
          <label className="label mb-2">Budget</label>
          <RagSelector field="budgetStatus" />
        </div>
        <div>
          <label className="label mb-2">Client</label>
          <RagSelector field="clientStatus" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea
          className="input h-24 resize-none"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any notable updates, risks, or actions..."
        />
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

const ragDimensions = [
  { key: 'scheduleStatus', label: 'Schedule' },
  { key: 'scopeStatus', label: 'Scope' },
  { key: 'budgetStatus', label: 'Budget' },
  { key: 'clientStatus', label: 'Client' },
] as const;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [showHealthUpdate, setShowHealthUpdate] = useState(false);

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
  const typeLabel: Record<string, string> = {
    FixedPrice: 'Fixed Price',
    TM: 'Time & Materials',
    SLA: 'SLA',
    RIInternal: 'R&I Internal',
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/projects" className="flex items-center gap-1 text-gray-400 hover:text-gray-700">
          <ChevronLeft size={14} />
          Projects
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
        <button
          onClick={() => setShowHealthUpdate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Update Health Status
        </button>
      </div>

      {/* Financial Summary */}
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

      {/* Health Status Grid */}
      {latest && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Current Health Status</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {ragDimensions.map(({ key, label }) => (
              <div key={key} className="text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                <div className="flex justify-center">
                  <RagBadge status={latest[key]} />
                </div>
              </div>
            ))}
          </div>
          {latest.notes && (
            <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{latest.notes}</p>
          )}
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

      {/* Time entries summary */}
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

      <Modal isOpen={showHealthUpdate} onClose={() => setShowHealthUpdate(false)} title="Update Health Status">
        {id && <HealthUpdateForm projectId={id} onClose={() => setShowHealthUpdate(false)} />}
      </Modal>
    </div>
  );
}
