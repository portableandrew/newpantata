import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import api, { fmt } from '../../lib/api';
import LoadingSpinner from '../ui/LoadingSpinner';

interface Metrics {
  totalHoursLogged: number;
  budgetHours: number;
  hoursRemaining: number | null;
  totalCost: number;
  budget: number;
  margin: number | null;
  burndown: { week: string; hoursLogged: number; hoursRemaining: number | null }[];
  marginOverTime: { month: string; cumulativeCost: number; margin: number | null }[];
}

function formatWeek(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function formatMonth(monthStr: string) {
  const [year, month] = monthStr.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-AU', {
    month: 'short',
    year: '2-digit',
  });
}

function marginColor(m: number | null) {
  if (m === null) return '#6366f1';
  if (m < 0) return '#ef4444';
  if (m < 15) return '#f59e0b';
  return '#10b981';
}

const CustomTooltipBurndown = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{formatWeek(label)}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'hoursLogged' ? 'Logged' : 'Remaining'}: {Number(p.value).toFixed(1)}h
        </p>
      ))}
    </div>
  );
};

const CustomTooltipMargin = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{formatMonth(label)}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'margin' ? `Margin: ${Number(p.value).toFixed(1)}%` : `Cost: ${fmt.currency(p.value)}`}
        </p>
      ))}
    </div>
  );
};

export default function ProjectCharts({ projectId }: { projectId: string }) {
  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ['project-metrics', projectId],
    queryFn: () => api.get(`/projects/${projectId}/metrics`).then(r => r.data),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!metrics) return null;

  const hasBurndown = metrics.burndown.length > 0;
  const hasMargin = metrics.marginOverTime.length > 0;
  const currentMargin = metrics.margin;

  if (!hasBurndown && !hasMargin) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
        <p className="text-sm text-gray-400">No time logged yet — charts will appear once time is recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hours Logged</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt.hours(metrics.totalHoursLogged)}</p>
          {metrics.budgetHours > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">of {fmt.hours(metrics.budgetHours)} budgeted</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hours Remaining</p>
          <p className={`text-xl font-bold mt-1 ${metrics.hoursRemaining !== null && metrics.hoursRemaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {metrics.hoursRemaining !== null ? fmt.hours(metrics.hoursRemaining) : '—'}
          </p>
          {metrics.hoursRemaining !== null && metrics.hoursRemaining < 0 && (
            <p className="text-xs text-red-500 mt-0.5">Over budget</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cost to Date</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt.currency(metrics.totalCost)}</p>
          {metrics.budget > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">of {fmt.currency(metrics.budget)} budget</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Margin</p>
          <p
            className="text-xl font-bold mt-1"
            style={{ color: marginColor(currentMargin) }}
          >
            {currentMargin !== null ? fmt.percent(currentMargin) : '—'}
          </p>
          {currentMargin !== null && currentMargin < 15 && currentMargin >= 0 && (
            <p className="text-xs text-amber-500 mt-0.5">Below target</p>
          )}
          {currentMargin !== null && currentMargin < 0 && (
            <p className="text-xs text-red-500 mt-0.5">Negative margin</p>
          )}
        </div>
      </div>

      {/* Burndown Chart */}
      {hasBurndown && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Hour Burndown</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.burndown} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorLogged" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="week"
                  tickFormatter={formatWeek}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v}h`}
                />
                <Tooltip content={<CustomTooltipBurndown />} />
                <Area
                  type="monotone"
                  dataKey="hoursLogged"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorLogged)"
                  dot={false}
                  name="hoursLogged"
                />
                {metrics.budgetHours > 0 && (
                  <Area
                    type="monotone"
                    dataKey="hoursRemaining"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorRemaining)"
                    dot={false}
                    name="hoursRemaining"
                  />
                )}
                {metrics.budgetHours > 0 && (
                  <ReferenceLine
                    y={metrics.budgetHours}
                    stroke="#e5e7eb"
                    strokeDasharray="4 4"
                    label={{ value: 'Budget', position: 'right', fontSize: 10, fill: '#9ca3af' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-0.5 bg-indigo-500 rounded" />
              Hours logged (cumulative)
            </span>
            {metrics.budgetHours > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-0.5 bg-emerald-500 rounded" />
                Hours remaining
              </span>
            )}
          </div>
        </div>
      )}

      {/* Margin Over Time */}
      {hasMargin && metrics.marginOverTime.some(m => m.margin !== null) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Margin Over Time</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.marginOverTime} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v.toFixed(0)}%`}
                />
                <Tooltip content={<CustomTooltipMargin />} />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                <ReferenceLine
                  y={15}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: 'Target', position: 'right', fontSize: 10, fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="margin"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ fill: '#6366f1', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="margin"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            Cumulative margin — revenue minus cost of time to date
          </p>
        </div>
      )}
    </div>
  );
}
