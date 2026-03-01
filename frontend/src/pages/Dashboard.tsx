import { useQuery } from '@tanstack/react-query';
import { Users, Dumbbell, CalendarDays, TrendingUp, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { DashboardData, TrainingSession } from '../types/basketball';

const positionColors: Record<string, string> = {
  PG: 'bg-blue-100 text-blue-700',
  SG: 'bg-purple-100 text-purple-700',
  SF: 'bg-green-100 text-green-700',
  PF: 'bg-orange-100 text-orange-700',
  C: 'bg-red-100 text-red-700',
};

const sessionTypeColors: Record<string, string> = {
  Practice: 'bg-blue-50 text-blue-700 border-blue-200',
  Game: 'bg-red-50 text-red-700 border-red-200',
  'Film Session': 'bg-gray-50 text-gray-700 border-gray-200',
  Conditioning: 'bg-orange-50 text-orange-700 border-orange-200',
  Scrimmage: 'bg-green-50 text-green-700 border-green-200',
};

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: TrainingSession }) {
  const typeStyle = sessionTypeColors[session.sessionType] || 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="text-center min-w-[44px]">
        <p className="text-xs font-semibold text-gray-400 uppercase">{format(new Date(session.date), 'MMM')}</p>
        <p className="text-xl font-bold text-gray-900 leading-none">{format(new Date(session.date), 'd')}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-medium text-gray-900 text-sm truncate">{session.title}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${typeStyle}`}>
            {session.sessionType}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Clock size={11} />{format(new Date(session.date), 'h:mm a')}</span>
          {session.location && <span className="flex items-center gap-1"><MapPin size={11} />{session.location}</span>}
          {session._count && <span className="flex items-center gap-1"><Users size={11} />{session._count.attendances} players</span>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Basketball Training Overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Players" value={data.summary.activePlayers} icon={Users} color="bg-blue-50 text-blue-600" />
        <StatCard label="Drills Library" value={data.summary.totalDrills} icon={Dumbbell} color="bg-orange-50 text-orange-600" />
        <StatCard label="Sessions This Month" value={data.summary.sessionsThisMonth} icon={CalendarDays} color="bg-green-50 text-green-600" />
        <StatCard label="Upcoming Sessions" value={data.summary.upcomingCount} icon={TrendingUp} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Upcoming Sessions</h2>
          </div>
          <div className="p-3">
            {data.upcomingSessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No upcoming sessions scheduled</p>
            ) : (
              data.upcomingSessions.map(s => <SessionRow key={s.id} session={s} />)
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Top Performers (Last 30 Days)</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topPerformers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No stats recorded yet</p>
            ) : (
              data.topPerformers.map((p, i) => (
                <div key={p.player.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-400">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{p.player.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${positionColors[p.player.position] || 'bg-gray-100 text-gray-600'}`}>
                        {p.player.position}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{p.games} game{p.games !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{p.avgPoints}</p>
                      <p className="text-xs text-gray-400">PTS</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{p.avgRebounds}</p>
                      <p className="text-xs text-gray-400">REB</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{p.avgAssists}</p>
                      <p className="text-xs text-gray-400">AST</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {data.recentSessions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Recent Sessions</h2>
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {data.recentSessions.map(s => <SessionRow key={s.id} session={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}
