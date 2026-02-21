import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, DollarSign } from 'lucide-react';
import api, { fmt } from '../lib/api';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { DealStage, DealLikelihood, Project, Client } from '../types';

const STAGES: DealStage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost', 'Disqualified'];

const stageColors: Record<DealStage, string> = {
  Lead: 'border-t-gray-400',
  Qualified: 'border-t-blue-400',
  Proposal: 'border-t-indigo-500',
  Negotiation: 'border-t-purple-500',
  Won: 'border-t-green-500',
  Lost: 'border-t-red-400',
  Disqualified: 'border-t-gray-300',
};

const stageBg: Record<DealStage, string> = {
  Lead: 'bg-gray-50',
  Qualified: 'bg-blue-50',
  Proposal: 'bg-indigo-50',
  Negotiation: 'bg-purple-50',
  Won: 'bg-green-50',
  Lost: 'bg-red-50',
  Disqualified: 'bg-gray-50',
};

const likelihoodVariant: Record<DealLikelihood, 'green' | 'amber' | 'red'> = {
  High: 'green',
  Medium: 'amber',
  Low: 'red',
};

function NewDealModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: clients } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then(r => r.data),
  });

  const [form, setForm] = useState({
    name: '',
    clientId: '',
    dealStage: 'Lead' as DealStage,
    dealLikelihood: 'Medium' as DealLikelihood,
    dealAmount: '',
    expectedCloseDate: '',
    projectType: 'FixedPrice',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/projects', {
      ...data,
      status: 'Pipeline',
      budget: 0,
      dealAmount: parseFloat(data.dealAmount) || 0,
      expectedCloseDate: data.expectedCloseDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      onClose();
    },
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
      <div>
        <label className="label">Deal Name *</label>
        <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Client | Description" />
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
          <label className="label">Stage</label>
          <select className="input" value={form.dealStage} onChange={e => setForm(f => ({ ...f, dealStage: e.target.value as DealStage }))}>
            {STAGES.slice(0, 4).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Likelihood</label>
          <select className="input" value={form.dealLikelihood} onChange={e => setForm(f => ({ ...f, dealLikelihood: e.target.value as DealLikelihood }))}>
            {(['High', 'Medium', 'Low'] as DealLikelihood[]).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Deal Amount (AUD)</label>
          <input className="input" type="number" value={form.dealAmount} onChange={e => setForm(f => ({ ...f, dealAmount: e.target.value }))} />
        </div>
        <div>
          <label className="label">Expected Close</label>
          <input className="input" type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Adding…' : 'Add Deal'}
        </button>
      </div>
    </form>
  );
}

interface KanbanData {
  [key: string]: Project[];
}

interface PipelineStats {
  totalValue: number;
  weightedValue: number;
  count: number;
  byStage: Record<string, { count: number; value: number }>;
}

export default function Pipeline() {
  const [showNew, setShowNew] = useState(false);
  const qc = useQueryClient();

  const { data: kanban, isLoading } = useQuery<KanbanData>({
    queryKey: ['pipeline'],
    queryFn: () => api.get('/pipeline/kanban').then(r => r.data),
  });

  const { data: stats } = useQuery<PipelineStats>({
    queryKey: ['pipeline-stats'],
    queryFn: () => api.get('/pipeline/stats').then(r => r.data),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) =>
      api.patch(`/pipeline/${id}/stage`, { dealStage: stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      qc.invalidateQueries({ queryKey: ['pipeline-stats'] });
    },
  });

  const handleStageChange = (projectId: string, newStage: DealStage) => {
    moveMutation.mutate({ id: projectId, stage: newStage });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Deal
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card">
            <p className="label">Total Pipeline</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt.currency(stats.totalValue)}</p>
          </div>
          <div className="card">
            <p className="label">Probability-weighted</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{fmt.currency(stats.weightedValue)}</p>
          </div>
          <div className="card">
            <p className="label">Active Deals</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.count}</p>
          </div>
        </div>
      )}

      {/* Kanban */}
      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {STAGES.map(stage => {
              const deals = kanban?.[stage] || [];
              const stageValue = deals.reduce((s, d) => s + Number(d.dealAmount || 0), 0);

              return (
                <div key={stage} className={`w-64 rounded-xl border-t-4 ${stageColors[stage]} bg-white shadow-sm`}>
                  {/* Column header */}
                  <div className={`px-4 pt-4 pb-3 ${stageBg[stage]} rounded-t-xl`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm">{stage}</h3>
                      <span className="text-xs font-medium text-gray-500 bg-white/70 rounded px-1.5 py-0.5">
                        {deals.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">{fmt.currency(stageValue)}</p>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-32">
                    {deals.map(deal => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        currentStage={stage}
                        onMove={handleStageChange}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Add Deal to Pipeline">
        <NewDealModal onClose={() => setShowNew(false)} />
      </Modal>
    </div>
  );
}

function DealCard({
  deal,
  currentStage,
  onMove,
}: {
  deal: Project;
  currentStage: DealStage;
  onMove: (id: string, stage: DealStage) => void;
}) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow transition-shadow">
      <p className="text-sm font-medium text-gray-900 leading-tight">{deal.name}</p>
      <p className="text-xs text-gray-400 mt-0.5">{deal.client?.name}</p>

      <div className="flex items-center justify-between mt-2.5">
        {deal.dealAmount && (
          <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
            <DollarSign size={12} className="text-gray-400" />
            {fmt.currency(Number(deal.dealAmount))}
          </div>
        )}
        {deal.dealLikelihood && (
          <Badge variant={likelihoodVariant[deal.dealLikelihood]} className="text-xs">
            {deal.dealLikelihood}
          </Badge>
        )}
      </div>

      {deal.expectedCloseDate && (
        <p className="text-xs text-gray-400 mt-1.5">Close: {fmt.shortDate(deal.expectedCloseDate)}</p>
      )}

      {/* Move stage */}
      <div className="relative mt-2">
        <button
          onClick={() => setShowMoveMenu(!showMoveMenu)}
          className="w-full text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded py-1 transition-colors"
        >
          Move stage ↓
        </button>
        {showMoveMenu && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-100 rounded-lg shadow-lg z-10 py-1">
            {STAGES.filter(s => s !== currentStage).map(s => (
              <button
                key={s}
                onClick={() => { onMove(deal.id, s); setShowMoveMenu(false); }}
                className="w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-gray-700"
              >
                → {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
