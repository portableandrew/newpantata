import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import api, { fmt } from '../lib/api';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface SyncRecord {
  id: string;
  syncType: string;
  startedAt: string;
  completedAt?: string;
  status: string;
  entriesSync: number;
  errors?: string;
  createdAt: string;
}

export default function HarvestSync() {
  const qc = useQueryClient();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: syncs, isLoading } = useQuery<SyncRecord[]>({
    queryKey: ['harvest-syncs'],
    queryFn: () => api.get('/harvest/status').then(r => r.data),
    refetchInterval: 5000,
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/harvest/sync', { from: dateFrom, to: dateTo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['harvest-syncs'] }),
  });

  const lastCompleted = syncs?.find(s => s.status === 'completed');
  const isRunning = syncs?.[0]?.status === 'running';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Harvest Integration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sync time entries from Harvest</p>
        </div>
        {lastCompleted && (
          <p className="text-xs text-gray-400">
            Last sync: {fmt.date(lastCompleted.completedAt)} — {lastCompleted.entriesSync} entries
          </p>
        )}
      </div>

      {/* Config status */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Configuration</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 font-bold text-sm">H</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Harvest API</p>
              <p className="text-xs text-gray-400">
                {process.env.VITE_HARVEST_CONFIGURED === 'true' ? 'Connected' : 'Configure HARVEST_ACCOUNT_ID + HARVEST_ACCESS_TOKEN in .env'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">HF</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">HumanForce</p>
              <p className="text-xs text-gray-400">Coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual sync */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Manual Sync</h2>
        <div className="flex items-end gap-4">
          <div>
            <label className="label">From Date</label>
            <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To Date</label>
            <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || isRunning}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw size={14} className={syncMutation.isPending || isRunning ? 'animate-spin' : ''} />
            {syncMutation.isPending || isRunning ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
        {syncMutation.isSuccess && (
          <p className="text-sm text-green-600 mt-2">Sync started! Results will appear below.</p>
        )}
      </div>

      {/* Sync history */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Sync History</h2>
        </div>
        {isLoading ? <LoadingSpinner className="py-8" /> : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Started</th>
                <th className="table-th">Type</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Entries</th>
                <th className="table-th">Duration</th>
                <th className="table-th">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {syncs?.map(s => {
                const duration = s.completedAt
                  ? Math.round((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)
                  : null;

                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-td">{fmt.date(s.startedAt)}</td>
                    <td className="table-td">
                      <Badge variant="blue">{s.syncType}</Badge>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        {s.status === 'completed' ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : s.status === 'failed' ? (
                          <XCircle size={14} className="text-red-500" />
                        ) : (
                          <Clock size={14} className="text-amber-500 animate-pulse" />
                        )}
                        <span className="text-sm capitalize">{s.status}</span>
                      </div>
                    </td>
                    <td className="table-td text-right">{s.entriesSync}</td>
                    <td className="table-td text-gray-400 text-xs">{duration != null ? `${duration}s` : '—'}</td>
                    <td className="table-td text-xs text-red-500">{s.errors || ''}</td>
                  </tr>
                );
              }) || (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No sync history yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Instructions */}
      <div className="card bg-indigo-50 border border-indigo-100">
        <h3 className="font-semibold text-indigo-900 mb-2">Setup Instructions</h3>
        <ol className="text-sm text-indigo-700 space-y-1 list-decimal list-inside">
          <li>Add <code className="bg-white px-1 rounded text-indigo-800">HARVEST_ACCOUNT_ID</code> to backend .env</li>
          <li>Add <code className="bg-white px-1 rounded text-indigo-800">HARVEST_ACCESS_TOKEN</code> to backend .env</li>
          <li>Restart the backend server</li>
          <li>Map Harvest users to team members via their <code className="bg-white px-1 rounded text-indigo-800">harvest_user_id</code></li>
          <li>Map Harvest projects to system projects via <code className="bg-white px-1 rounded text-indigo-800">harvest_project_id</code></li>
          <li>Run a manual sync to import historical data</li>
        </ol>
      </div>
    </div>
  );
}
