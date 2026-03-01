import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Dumbbell } from 'lucide-react';
import api from '../lib/api';
import { Drill, DrillCategory, Difficulty } from '../types/basketball';

const CATEGORIES: DrillCategory[] = ['Shooting', 'Defense', 'Conditioning', 'Ball Handling', 'Rebounding', 'Team', 'Footwork'];
const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

const categoryColors: Record<DrillCategory, string> = {
  Shooting: 'bg-orange-100 text-orange-700',
  Defense: 'bg-blue-100 text-blue-700',
  Conditioning: 'bg-red-100 text-red-700',
  'Ball Handling': 'bg-yellow-100 text-yellow-700',
  Rebounding: 'bg-green-100 text-green-700',
  Team: 'bg-purple-100 text-purple-700',
  Footwork: 'bg-pink-100 text-pink-700',
};
const difficultyColors: Record<Difficulty, string> = {
  Beginner: 'text-green-600 bg-green-50',
  Intermediate: 'text-yellow-700 bg-yellow-50',
  Advanced: 'text-red-600 bg-red-50',
};

const BLANK = { name: '', category: 'Shooting' as DrillCategory, difficulty: 'Intermediate' as Difficulty, description: '', durationMins: undefined as number | undefined, instructions: '' };

export default function Drills() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const { data: drills = [], isLoading } = useQuery<Drill[]>({
    queryKey: ['drills', catFilter, diffFilter],
    queryFn: () => api.get('/drills', { params: { category: catFilter || undefined, difficulty: diffFilter || undefined } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof BLANK) => api.post('/drills', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drills'] }); setShowForm(false); setForm({ ...BLANK }); },
  });

  const filtered = drills.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()));
  const grouped = filtered.reduce((acc: Record<string, Drill[]>, d) => {
    const key = d.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drills Library</h1>
          <p className="text-sm text-gray-500 mt-1">{drills.length} drills</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> Add Drill
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drills..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
          <option value="">All Levels</option>
          {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Add Drill Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Drill</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="Drill name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as DrillCategory }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Duration (mins)</label>
              <input type="number" value={form.durationMins ?? ''} onChange={e => setForm(f => ({ ...f, durationMins: e.target.value ? +e.target.value : undefined }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Instructions</label>
              <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setForm({ ...BLANK }); }} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
              {createMutation.isPending ? 'Saving...' : 'Add Drill'}
            </button>
          </div>
        </div>
      )}

      {/* Drill List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
          <p>No drills found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catDrills]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${categoryColors[cat as DrillCategory] || 'bg-gray-100 text-gray-600'}`}>{cat}</span>
                <span className="text-xs text-gray-400">{catDrills.length} drill{catDrills.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {catDrills.map(drill => (
                  <div key={drill.id}>
                    <button
                      onClick={() => setExpanded(expanded === drill.id ? null : drill.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{drill.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${difficultyColors[drill.difficulty]}`}>{drill.difficulty}</span>
                        </div>
                        {drill.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{drill.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                        {drill.durationMins && <span>{drill.durationMins} min</span>}
                        {drill._count && <span>{drill._count.sessionDrills}x used</span>}
                      </div>
                    </button>
                    {expanded === drill.id && drill.instructions && (
                      <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase mt-3 mb-1.5">Instructions</p>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{drill.instructions}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
