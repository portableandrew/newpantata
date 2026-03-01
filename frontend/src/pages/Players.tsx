import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronRight, User } from 'lucide-react';
import api from '../lib/api';
import { Player, Position } from '../types/basketball';

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];
const positionLabels: Record<Position, string> = {
  PG: 'Point Guard', SG: 'Shooting Guard', SF: 'Small Forward', PF: 'Power Forward', C: 'Center',
};
const positionColors: Record<Position, string> = {
  PG: 'bg-blue-100 text-blue-700',
  SG: 'bg-purple-100 text-purple-700',
  SF: 'bg-green-100 text-green-700',
  PF: 'bg-orange-100 text-orange-700',
  C: 'bg-red-100 text-red-700',
};

const BLANK: Partial<Player> = { name: '', position: 'PG', jerseyNumber: undefined, age: undefined, teamGroup: '', notes: '' };

export default function Players() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Player>>(BLANK);

  const { data: players = [], isLoading } = useQuery<Player[]>({
    queryKey: ['players'],
    queryFn: () => api.get('/players').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Player>) => api.post('/players', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['players'] }); setShowForm(false); setForm(BLANK); },
  });

  const filtered = players.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchPos = !posFilter || p.position === posFilter;
    return matchSearch && matchPos;
  });

  const grouped = filtered.reduce((acc: Record<string, Player[]>, p) => {
    const key = p.teamGroup || 'Ungrouped';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Players</h1>
          <p className="text-sm text-gray-500 mt-1">{players.filter(p => p.isActive).length} active players</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> Add Player
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <select
          value={posFilter}
          onChange={e => setPosFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">All Positions</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p} – {positionLabels[p]}</option>)}
        </select>
      </div>

      {/* Add Player Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Player</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
              <input
                value={form.name || ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="Player name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Position</label>
              <select
                value={form.position || 'PG'}
                onChange={e => setForm(f => ({ ...f, position: e.target.value as Position }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {POSITIONS.map(p => <option key={p} value={p}>{p} – {positionLabels[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Jersey #</label>
              <input
                type="number"
                value={form.jerseyNumber ?? ''}
                onChange={e => setForm(f => ({ ...f, jerseyNumber: e.target.value ? +e.target.value : undefined }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="e.g. 23"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Age</label>
              <input
                type="number"
                value={form.age ?? ''}
                onChange={e => setForm(f => ({ ...f, age: e.target.value ? +e.target.value : undefined }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Team / Group</label>
              <input
                value={form.teamGroup || ''}
                onChange={e => setForm(f => ({ ...f, teamGroup: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="e.g. Varsity"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setForm(BLANK); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || createMutation.isPending}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Add Player'}
            </button>
          </div>
        </div>
      )}

      {/* Player List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <User size={40} className="mx-auto mb-3 opacity-30" />
          <p>No players found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupPlayers]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group}</h3>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {groupPlayers.map(player => (
                  <Link
                    key={player.id}
                    to={`/players/${player.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm shrink-0">
                      {player.jerseyNumber ?? '#'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{player.name}</span>
                        {!player.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Inactive</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${positionColors[player.position]}`}>{player.position}</span>
                        {player.age && <span className="text-xs text-gray-400">Age {player.age}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {player._count && (
                        <span className="text-xs text-gray-400">{player._count.stats} stats logged</span>
                      )}
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
