import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, MapPin, Users, Dumbbell, CheckCircle2, Circle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { TrainingSession, Drill } from '../types/basketball';

const typeColors: Record<string, string> = {
  Practice: 'bg-blue-50 text-blue-700',
  Game: 'bg-red-50 text-red-700',
  'Film Session': 'bg-gray-50 text-gray-700',
  Conditioning: 'bg-orange-50 text-orange-700',
  Scrimmage: 'bg-green-50 text-green-700',
};

const categoryColors: Record<string, string> = {
  Shooting: 'bg-orange-100 text-orange-700',
  Defense: 'bg-blue-100 text-blue-700',
  Conditioning: 'bg-red-100 text-red-700',
  'Ball Handling': 'bg-yellow-100 text-yellow-700',
  Rebounding: 'bg-green-100 text-green-700',
  Team: 'bg-purple-100 text-purple-700',
  Footwork: 'bg-pink-100 text-pink-700',
};

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showAddDrill, setShowAddDrill] = useState(false);
  const [drillSearch, setDrillSearch] = useState('');

  const { data: session, isLoading } = useQuery<TrainingSession>({
    queryKey: ['session', id],
    queryFn: () => api.get(`/sessions/${id}`).then(r => r.data),
  });

  const { data: allDrills = [] } = useQuery<Drill[]>({
    queryKey: ['drills'],
    queryFn: () => api.get('/drills').then(r => r.data),
    enabled: showAddDrill,
  });

  const toggleAttendance = useMutation({
    mutationFn: ({ playerId, attended }: { playerId: string; attended: boolean }) =>
      api.patch(`/sessions/${id}/attendance/${playerId}`, { attended }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session', id] }),
  });

  const addDrillMutation = useMutation({
    mutationFn: (drillId: string) => {
      const existingDrills = session?.drills || [];
      const drills = [
        ...existingDrills.map(sd => ({ drillId: sd.drillId, sets: sd.sets, reps: sd.reps, durationMins: sd.durationMins, notes: sd.notes })),
        { drillId },
      ];
      return api.patch(`/sessions/${id}`, { drills }).then(r => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['session', id] }); setShowAddDrill(false); setDrillSearch(''); },
  });

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;
  if (!session) return <p className="text-gray-400">Session not found</p>;

  const typeStyle = typeColors[session.sessionType] || 'bg-gray-50 text-gray-700';
  const attendances = session.attendances || [];
  const drills = session.drills || [];
  const present = attendances.filter(a => a.attended).length;

  const filteredDrills = allDrills.filter(d =>
    !drillSearch || d.name.toLowerCase().includes(drillSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/sessions" className="p-2 rounded-lg hover:bg-gray-100 transition-colors mt-0.5">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeStyle}`}>{session.sessionType}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {format(new Date(session.date), 'EEEE, MMMM d yyyy')} at {format(new Date(session.date), 'h:mm a')}
            </span>
            {session.durationMins && <span>{session.durationMins} min</span>}
            {session.location && (
              <span className="flex items-center gap-1.5"><MapPin size={14} />{session.location}</span>
            )}
          </div>
        </div>
      </div>

      {session.notes && (
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">{session.notes}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drills */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell size={16} className="text-orange-500" />
              <h2 className="font-semibold text-gray-900">Drills ({drills.length})</h2>
            </div>
            <button onClick={() => setShowAddDrill(v => !v)}
              className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium">
              <Plus size={13} /> Add Drill
            </button>
          </div>

          {showAddDrill && (
            <div className="p-4 border-b border-gray-100 bg-orange-50/30">
              <input value={drillSearch} onChange={e => setDrillSearch(e.target.value)} placeholder="Search drills..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-300" />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredDrills.map(d => (
                  <button key={d.id} onClick={() => addDrillMutation.mutate(d.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-orange-100 text-left transition-colors">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[d.category] || 'bg-gray-100 text-gray-600'}`}>{d.category}</span>
                    <span className="text-sm text-gray-800">{d.name}</span>
                    {d.durationMins && <span className="text-xs text-gray-400 ml-auto">{d.durationMins}m</span>}
                  </button>
                ))}
                {filteredDrills.length === 0 && <p className="text-sm text-gray-400 text-center py-3">No drills found</p>}
              </div>
            </div>
          )}

          {drills.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No drills added yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {drills.map((sd, i) => (
                <div key={sd.id} className="px-5 py-3 flex items-start gap-3">
                  <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{sd.drill.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[sd.drill.category] || 'bg-gray-100 text-gray-600'}`}>{sd.drill.category}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      {sd.sets && <span>{sd.sets} sets</span>}
                      {sd.reps && <span>{sd.reps} reps</span>}
                      {sd.durationMins && <span>{sd.durationMins} min</span>}
                      {sd.notes && <span className="text-gray-400 truncate">{sd.notes}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-900">Attendance</h2>
            </div>
            {attendances.length > 0 && (
              <span className="text-xs text-gray-400">{present}/{attendances.length} present</span>
            )}
          </div>

          {attendances.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No players assigned</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {attendances.map(a => (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <button
                    onClick={() => toggleAttendance.mutate({ playerId: a.playerId, attended: !a.attended })}
                    className="shrink-0"
                  >
                    {a.attended
                      ? <CheckCircle2 size={18} className="text-green-500" />
                      : <Circle size={18} className="text-gray-300" />
                    }
                  </button>
                  <div className="flex-1">
                    <span className={`font-medium text-sm ${a.attended ? 'text-gray-900' : 'text-gray-400'}`}>
                      {a.player?.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{a.player?.position}</span>
                  {a.player?.jerseyNumber != null && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">#{a.player.jerseyNumber}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
