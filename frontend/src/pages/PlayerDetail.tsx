import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Target, Activity } from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../lib/api';
import { Player, PlayerStat, StatType } from '../types/basketball';

const positionColors: Record<string, string> = {
  PG: 'bg-blue-100 text-blue-700',
  SG: 'bg-purple-100 text-purple-700',
  SF: 'bg-green-100 text-green-700',
  PF: 'bg-orange-100 text-orange-700',
  C: 'bg-red-100 text-red-700',
};

const STAT_TYPES: StatType[] = ['Game', 'Practice', 'Scrimmage'];

const BLANK_STAT = {
  statDate: new Date().toISOString().split('T')[0],
  statType: 'Game' as StatType,
  points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
  fieldGoalsMade: 0, fieldGoalAttempts: 0,
  threesMade: 0, threesAttempts: 0,
  freeThrowsMade: 0, freeThrowAttempts: 0,
  minutesPlayed: 0, notes: '',
};

function pct(made: number, att: number) {
  if (!att) return '-';
  return `${((made / att) * 100).toFixed(0)}%`;
}

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showStatForm, setShowStatForm] = useState(false);
  const [statForm, setStatForm] = useState({ ...BLANK_STAT });

  const { data: player, isLoading } = useQuery<Player>({
    queryKey: ['player', id],
    queryFn: () => api.get(`/players/${id}`).then(r => r.data),
  });

  const addStatMutation = useMutation({
    mutationFn: (data: typeof BLANK_STAT) => api.post(`/players/${id}/stats`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['player', id] }); setShowStatForm(false); setStatForm({ ...BLANK_STAT }); },
  });

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;
  if (!player) return <p className="text-gray-400">Player not found</p>;

  const stats: PlayerStat[] = player.stats || [];
  const chartData = [...stats].reverse().map(s => ({
    date: format(new Date(s.statDate), 'MM/dd'),
    PTS: s.points,
    REB: s.rebounds,
    AST: s.assists,
  }));

  const avgStat = (key: keyof PlayerStat) => {
    if (!stats.length) return '-';
    const sum = stats.reduce((a, s) => a + (s[key] as number), 0);
    return (sum / stats.length).toFixed(1);
  };

  const sf = (key: keyof typeof statForm, val: string | number) =>
    setStatForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/players" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{player.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${positionColors[player.position] || 'bg-gray-100 text-gray-600'}`}>
              {player.position}
            </span>
            {player.jerseyNumber != null && <span className="text-sm text-gray-500">#{player.jerseyNumber}</span>}
            {player.teamGroup && <span className="text-sm text-gray-400">{player.teamGroup}</span>}
            {!player.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactive</span>}
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {[
          { label: 'Age', value: player.age ?? '-' },
          { label: 'Height', value: player.heightCm ? `${player.heightCm} cm` : '-' },
          { label: 'Weight', value: player.weightKg ? `${player.weightKg} kg` : '-' },
          { label: 'Sessions', value: player._count?.attendances ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Averages */}
      {stats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-orange-500" />
            <h2 className="font-semibold text-gray-900">Career Averages ({stats.length} games)</h2>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 text-center">
            {[
              { label: 'PTS', value: avgStat('points') },
              { label: 'REB', value: avgStat('rebounds') },
              { label: 'AST', value: avgStat('assists') },
              { label: 'STL', value: avgStat('steals') },
              { label: 'BLK', value: avgStat('blocks') },
              { label: 'TO', value: avgStat('turnovers') },
              { label: 'MIN', value: avgStat('minutesPlayed') },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Performance Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="PTS" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="REB" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="AST" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stat Log */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-orange-500" />
            <h2 className="font-semibold text-gray-900">Stat Log</h2>
          </div>
          <button
            onClick={() => setShowStatForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600"
          >
            <Plus size={13} /> Log Stats
          </button>
        </div>

        {showStatForm && (
          <div className="p-5 border-b border-gray-50 bg-orange-50/30">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Date</label>
                <input type="date" value={statForm.statDate} onChange={e => sf('statDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                <select value={statForm.statType} onChange={e => sf('statType', e.target.value as StatType)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                  {STAT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">MIN</label>
                <input type="number" value={statForm.minutesPlayed} onChange={e => sf('minutesPlayed', +e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
              {(['points','rebounds','assists','steals','blocks','turnovers'] as const).map(k => (
                <div key={k}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block capitalize">{k.slice(0,3).toUpperCase()}</label>
                  <input type="number" value={(statForm as any)[k]} onChange={e => sf(k, +e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
              {[
                ['FGM', 'fieldGoalsMade'], ['FGA', 'fieldGoalAttempts'],
                ['3PM', 'threesMade'], ['3PA', 'threesAttempts'],
                ['FTM', 'freeThrowsMade'], ['FTA', 'freeThrowAttempts'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                  <input type="number" value={(statForm as any)[key]} onChange={e => sf(key as any, +e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowStatForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={() => addStatMutation.mutate(statForm)}
                disabled={addStatMutation.isPending}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
              >
                {addStatMutation.isPending ? 'Saving...' : 'Save Stats'}
              </button>
            </div>
          </div>
        )}

        {stats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No stats logged yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase">
                  {['Date', 'Type', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'FG%', '3P%', 'FT%', 'MIN'].map(h => (
                    <th key={h} className="px-4 py-3 text-right first:text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{format(new Date(s.statDate), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-gray-500">{s.statType}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{s.points}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.rebounds}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.assists}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.steals}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.blocks}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.turnovers}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{pct(s.fieldGoalsMade, s.fieldGoalAttempts)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{pct(s.threesMade, s.threesAttempts)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{pct(s.freeThrowsMade, s.freeThrowAttempts)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{s.minutesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {player.notes && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-sm text-gray-600 whitespace-pre-line">{player.notes}</p>
        </div>
      )}
    </div>
  );
}
