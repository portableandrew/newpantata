import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { fmt } from '../lib/api';
import RagBadge from '../components/ui/RagBadge';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { Project, ProjectType, ProjectStatus, Client } from '../types';

const statusOptions: ProjectStatus[] = ['Active', 'OnHold', 'Pipeline', 'Completed', 'Lost'];
const typeOptions: ProjectType[] = ['FixedPrice', 'TM', 'SLA', 'RIInternal'];

const statusLabel: Record<ProjectStatus, string> = {
  Active: 'Active',
  OnHold: 'On Hold',
  Pipeline: 'Pipeline',
  Completed: 'Completed',
  Lost: 'Lost',
};

const typeLabel: Record<ProjectType, string> = {
  FixedPrice: 'Fixed Price',
  TM: 'Time & Materials',
  SLA: 'SLA',
  RIInternal: 'R&I Internal',
};

const typeBadgeVariant = {
  FixedPrice: 'blue' as const,
  TM: 'purple' as const,
  SLA: 'green' as const,
  RIInternal: 'amber' as const,
};

const statusBadgeVariant = {
  Active: 'green' as const,
  OnHold: 'amber' as const,
  Pipeline: 'blue' as const,
  Completed: 'gray' as const,
  Lost: 'red' as const,
};

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: clients } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then(r => r.data),
  });

  const [form, setForm] = useState({
    name: '',
    clientId: '',
    projectType: 'FixedPrice' as ProjectType,
    status: 'Active' as ProjectStatus,
    budget: '',
    startDate: '',
    endDate: '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/projects', {
        ...data,
        budget: parseFloat(data.budget) || 0,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
  });

  return (
    <form
      onSubmit={e => { e.preventDefault(); mutation.mutate(form); }}
      className="space-y-4"
    >
      <div>
        <label className="label">Project Name *</label>
        <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="label">Client *</label>
        <select className="input" required value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
          <option value="">Select client…</option>
          {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type *</label>
          <select className="input" value={form.projectType} onChange={e => setForm(f => ({ ...f, projectType: e.target.value as ProjectType }))}>
            {typeOptions.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status *</label>
          <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
            {statusOptions.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Budget (AUD)</label>
        <input className="input" type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Date</label>
          <input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="label">End Date</label>
          <input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Creating…' : 'Create Project'}
        </button>
      </div>
    </form>
  );
}

export default function Projects() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showNew, setShowNew] = useState(false);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects', statusFilter, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      return api.get(`/projects?${params}`).then(r => r.data);
    },
  });

  const filtered = projects?.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.client.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Group by status sections
  const active = filtered.filter(p => p.status === 'Active');
  const onHold = filtered.filter(p => p.status === 'OnHold');
  const other = filtered.filter(p => !['Active', 'OnHold'].includes(p.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Search projects or clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <Filter size={14} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {statusOptions.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>
        <select className="input w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {typeOptions.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <ProjectSection title="Active" projects={active} />
          )}
          {onHold.length > 0 && (
            <ProjectSection title="On Hold" projects={onHold} />
          )}
          {other.length > 0 && (
            <ProjectSection title="Other" projects={other} />
          )}
          {filtered.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-gray-400">No projects found</p>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="New Project">
        <NewProjectModal onClose={() => setShowNew(false)} />
      </Modal>
    </div>
  );
}

function ProjectSection({ title, projects }: { title: string; projects: Project[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {title} <span className="text-gray-400 font-normal">({projects.length})</span>
      </h2>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-th">Project</th>
              <th className="table-th">Type</th>
              <th className="table-th hidden md:table-cell">Health</th>
              <th className="table-th hidden lg:table-cell text-right">Budget</th>
              <th className="table-th hidden lg:table-cell">Last Update</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projects.map(p => {
              const latest = p.healthUpdates?.[0];
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="table-td">
                    <Link to={`/projects/${p.id}`} className="block">
                      <p className="font-medium text-gray-900 group-hover:text-indigo-600">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.client.name}</p>
                    </Link>
                  </td>
                  <td className="table-td">
                    <Badge variant={typeBadgeVariant[p.projectType]}>{typeLabel[p.projectType]}</Badge>
                  </td>
                  <td className="table-td hidden md:table-cell">
                    {latest ? (
                      <div className="flex gap-1">
                        <RagBadge status={latest.overallStatus} size="sm" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="table-td hidden lg:table-cell text-right font-medium">
                    {fmt.currency(Number(p.budget))}
                  </td>
                  <td className="table-td hidden lg:table-cell text-gray-400 text-xs">
                    {latest ? fmt.date(latest.updateDate) : '—'}
                  </td>
                  <td className="table-td">
                    <Link to={`/projects/${p.id}`}>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
