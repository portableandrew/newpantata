import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Briefcase, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { fmt } from '../lib/api';
import StatCard from '../components/ui/StatCard';
import RagBadge from '../components/ui/RagBadge';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { DashboardData, ProjectType } from '../types';

const typeLabel: Record<ProjectType, string> = {
  FixedPrice: 'Fixed Price',
  TM: 'T&M',
  SLA: 'SLA',
  RIInternal: 'R&I',
};

const typeBadgeVariant: Record<ProjectType, 'blue' | 'purple' | 'green' | 'amber'> = {
  FixedPrice: 'blue',
  TM: 'purple',
  SLA: 'green',
  RIInternal: 'amber',
};

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 60000,
  });

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  if (isLoading) return <LoadingSpinner className="py-24" />;

  const alertProjects = data?.activeProjects.filter(
    p => p.healthStatus === 'Red' || p.healthStatus === 'Orange'
  ) || [];

  const greenProjects = data?.activeProjects.filter(p => p.healthStatus === 'Green') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {data?.lastHarvestSync && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <RefreshCw size={12} />
              <span>Synced {fmt.date(data.lastHarvestSync)}</span>
            </div>
          )}
          <Link to="/reports" className="btn-primary">
            Generate Report
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alertProjects.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              {alertProjects.length} project{alertProjects.length > 1 ? 's' : ''} need{alertProjects.length === 1 ? 's' : ''} attention
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertProjects.map(p => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-sm hover:bg-amber-50 transition-colors"
              >
                <RagBadge status={p.healthStatus} size="sm" showLabel={false} />
                <span className="font-medium text-gray-900">{p.name}</span>
                <span className="text-gray-400">— {p.client}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Projects"
          value={data?.activeProjectsCount ?? '—'}
          sub={`${alertProjects.length} needing attention`}
          trend={alertProjects.length > 0 ? 'down' : 'neutral'}
        />
        <StatCard
          label="Pipeline Value"
          value={fmt.currency(data?.pipeline.total ?? 0)}
          sub={`${fmt.currency(data?.pipeline.weighted ?? 0)} weighted`}
          trendValue={`${data?.pipeline.count || 0} deals`}
          trend="neutral"
        />
        {data?.financials ? (
          <>
            <StatCard
              label="Gross Profit"
              value={fmt.currency(data.financials.grossProfit)}
              sub="This month"
              trend={data.financials.grossProfit >= 0 ? 'up' : 'down'}
              trendValue={fmt.percent(data.financials.grossMargin)}
            />
            <StatCard
              label="Net Profit"
              value={fmt.currency(data.financials.netProfit)}
              sub="This month"
              trend={data.financials.netProfit >= 0 ? 'up' : 'down'}
              trendValue={fmt.percent(data.financials.netMargin)}
            />
          </>
        ) : (
          <>
            <StatCard label="Gross Profit" value="—" sub="No data entered" />
            <StatCard label="Net Profit" value="—" sub="No data entered" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-900">Active Projects</h2>
            </div>
            <Link to="/projects" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {data?.activeProjects.slice(0, 8).map(p => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <RagBadge status={p.healthStatus} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.client}</p>
                </div>
                <Badge variant={typeBadgeVariant[p.projectType]}>{typeLabel[p.projectType]}</Badge>
              </Link>
            ))}
            {(!data?.activeProjects || data.activeProjects.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">No active projects</p>
            )}
          </div>
        </div>

        {/* Pipeline + Team */}
        <div className="space-y-4">
          {/* Pipeline summary */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Pipeline</h2>
              </div>
              <Link to="/pipeline" className="text-xs text-indigo-600 hover:underline">Manage</Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{fmt.currency(data?.pipeline.total || 0)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total value</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{fmt.currency(data?.pipeline.weighted || 0)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Probability-weighted</p>
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="text-xs text-gray-400">{data?.pipeline.count || 0} active deals</span>
            </div>
          </div>

          {/* Team */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Team</h2>
              </div>
              <Link to="/team" className="text-xs text-indigo-600 hover:underline">Utilization</Link>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{data?.team.activeCount || 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">Active members</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Target utilization</span>
                  <span className="font-medium">68.1%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-2 bg-indigo-500 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
