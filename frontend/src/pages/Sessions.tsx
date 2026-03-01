import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, CalendarDays, MapPin, Clock, Users, ChevronRight } from 'lucide-react';
import { format, isPast } from 'date-fns';
import api from '../lib/api';
import { TrainingSession, SessionType } from '../types/basketball';

const SESSION_TYPES: SessionType[] = ['Practice', 'Game', 'Film Session', 'Conditioning', 'Scrimmage'];

const typeColors: Record<string, string> = {
  Practice: 'bg-blue-50 text-blue-700 border-blue-200',
  Game: 'bg-red-50 text-red-700 border-red-200',
  'Film Session': 'bg-gray-50 text-gray-700 border-gray-200',
  Conditioning: 'bg-orange-50 text-orange-700 border-orange-200',
  Scrimmage: 'bg-green-50 text-green-700 border-green-200',
};

const BLANK = {
  title: '', sessionType: 'Practice' as SessionType,
  date: new Date().toISOString().slice(0, 16),
  durationMins: 90, location: '', notes: '',
};

export default function Sessions() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK });

  const { data: sessions = [], isLoading } = useQuery<TrainingSession[]>({
    queryKey: ['sessions', tab],
    queryFn: () => api.get('/sessions', { params: { upcoming: tab === 'upcoming' } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof BLANK) => api.post('/sessions', { ...data, date: new Date(data.date).toISOString() }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowForm(false); setForm({ ...BLANK }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">{sessions.length} {tab} sessions</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
          <Plus size={16} /> New Session
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['upcoming', 'past'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Session</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="e.g. Tuesday Practice" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
              <select value={form.sessionType} onChange={e => setForm(f => ({ ...f, sessionType: e.target.value as SessionType }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                {SESSION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Date & Time</label>
              <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Duration (mins)</label>
              <input type="number" value={form.durationMins} onChange={e => setForm(f => ({ ...f, durationMins: +e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="e.g. Main Gym" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setForm({ ...BLANK }); }} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button onClick={() => createMutation.mutate(form)} disabled={!form.title || createMutation.isPending}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </div>
      )}

      {/* Session List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p>No {tab} sessions</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {sessions.map(session => {
            const past = isPast(new Date(session.date));
            const typeStyle = typeColors[session.sessionType] || 'bg-gray-50 text-gray-700 border-gray-200';
            return (
              <Link key={session.id} to={`/sessions/${session.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className={`text-center min-w-[48px] p-2 rounded-lg ${past ? 'bg-gray-100' : 'bg-orange-50'}`}>
                  <p className={`text-xs font-semibold uppercase ${past ? 'text-gray-400' : 'text-orange-500'}`}>{format(new Date(session.date), 'MMM')}</p>
                  <p className={`text-xl font-bold leading-none ${past ? 'text-gray-500' : 'text-orange-600'}`}>{format(new Date(session.date), 'd')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{session.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${typeStyle}`}>{session.sessionType}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock size={11} />{format(new Date(session.date), 'h:mm a')}</span>
                    {session.durationMins && <span>{session.durationMins} min</span>}
                    {session.location && <span className="flex items-center gap-1"><MapPin size={11} />{session.location}</span>}
                    {session._count && <span className="flex items-center gap-1"><Users size={11} />{session._count.attendances}</span>}
                    {session.drills && session.drills.length > 0 && <span>{session.drills.length} drills</span>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
