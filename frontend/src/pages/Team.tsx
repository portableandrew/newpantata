import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Activity } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import api, { fmt } from '../lib/api';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { TeamMember, MemberRole } from '../types';

const TARGET_UTILIZATION = 68.1;

const roleGroups: Record<string, MemberRole[]> = {
  Principals: ['Principal'],
  Leads: ['Lead'],
  'BA & Dev': ['BA', 'Developer'],
  Design: ['Designer'],
  Production: ['Production'],
};

const roleTargets: Record<string, number> = {
  Principals: 40.0,
  Leads: 68.1,
  'BA & Dev': 72.89,
  Design: 77.11,
  Production: 68.1,
};

const roleBadge: Record<MemberRole, 'purple' | 'blue' | 'green' | 'amber' | 'default'> = {
  Principal: 'purple',
  Lead: 'blue',
  Designer: 'green',
  Developer: 'blue',
  BA: 'amber',
  Production: 'default',
};

interface UtilData {
  byPerson: {
    id: string;
    name: string;
    role: MemberRole;
    availableHours: number;
    billableHours: number;
    rAndIHours: number;
    billableUtilization: number;
    productiveUtilization: number;
  }[];
  byRole: Record<string, {
    members: any[];
    totalBillable: number;
    totalAvailable: number;
    utilization: number;
  }>;
}

interface TimesheetEntry {
  id: string;
  name: string;
  role: MemberRole;
  actualHours: number;
  expectedHours: number;
  variance: number;
  billableHours: number;
  billableUtilization: number;
}

export default function Team() {
  const [tab, setTab] = useState<'overview' | 'timesheet'>('overview');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(now, 'yyyy-MM'));

  const [year, month] = selectedMonth.split('-').map(Number);

  const { data: members, isLoading: membersLoading } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: () => api.get('/team?active=true').then(r => r.data),
  });

  const { data: utilData, isLoading: utilLoading } = useQuery<UtilData>({
    queryKey: ['utilization', year, month],
    queryFn: () => api.get(`/utilization/${year}/${month}`).then(r => r.data),
  });

  const { data: timesheetData, isLoading: timesheetLoading } = useQuery<TimesheetEntry[]>({
    queryKey: ['timesheet', year, month],
    queryFn: () => api.get(`/team/timesheet/${year}/${month}`).then(r => r.data),
    enabled: tab === 'timesheet',
  });

  const isLoading = membersLoading || utilLoading;

  // Group members by role
  const groupedMembers: Record<string, TeamMember[]> = {};
  Object.entries(roleGroups).forEach(([group, roles]) => {
    groupedMembers[group] = members?.filter(m => roles.includes(m.role)) || [];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team & Utilization</h1>
        <input
          type="month"
          className="input w-auto"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        />
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          Utilization
        </button>
        <button
          onClick={() => setTab('timesheet')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'timesheet' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          Timesheet Completion
        </button>
      </div>

      {isLoading ? <LoadingSpinner className="py-16" /> : (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* By Role Summary */}
              {utilData && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {Object.entries(roleTargets).map(([group, target]) => {
                    const roleKeyMap: Record<string, string> = {
                      Principals: 'principals',
                      Leads: 'leads',
                      'BA & Dev': 'ba_dev',
                      Design: 'design',
                      Production: 'production',
                    };
                    const roleKey = roleKeyMap[group];
                    const groupData = utilData.byRole?.[roleKey];
                    const actual = groupData?.utilization || 0;
                    const variance = actual - target;

                    return (
                      <div key={group} className="card text-center">
                        <p className="label">{group}</p>
                        <p className={`text-2xl font-bold mt-1 ${actual >= target ? 'text-green-600' : 'text-red-500'}`}>
                          {actual.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Target: {target}%</p>
                        <p className={`text-xs font-medium mt-1 ${variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* By Person table */}
              <div className="card p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-500" />
                  <h2 className="font-semibold text-gray-900">Utilization by Person</h2>
                  <span className="text-xs text-gray-400 ml-1">Target: {TARGET_UTILIZATION}%</span>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-th">Name</th>
                      <th className="table-th">Role</th>
                      <th className="table-th text-right">Available</th>
                      <th className="table-th text-right">Billable</th>
                      <th className="table-th text-right">R&I</th>
                      <th className="table-th">Billable %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {utilData?.byPerson.map(m => {
                      const overTarget = m.billableUtilization >= TARGET_UTILIZATION;
                      return (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="table-td font-medium">{m.name}</td>
                          <td className="table-td">
                            <Badge variant={roleBadge[m.role]}>{m.role}</Badge>
                          </td>
                          <td className="table-td text-right">{fmt.hours(m.availableHours)}</td>
                          <td className="table-td text-right">{fmt.hours(m.billableHours)}</td>
                          <td className="table-td text-right">{m.rAndIHours > 0 ? fmt.hours(m.rAndIHours) : '—'}</td>
                          <td className="table-td">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full max-w-24">
                                <div
                                  className={`h-2 rounded-full ${overTarget ? 'bg-green-500' : 'bg-amber-400'}`}
                                  style={{ width: `${Math.min(m.billableUtilization, 100)}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium ${overTarget ? 'text-green-600' : 'text-amber-600'}`}>
                                {m.billableUtilization.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }) || (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No time data for this month</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Team List */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={16} className="text-indigo-500" />
                  <h2 className="font-semibold text-gray-900">Team Members</h2>
                  <span className="text-xs text-gray-400">({members?.length || 0} active)</span>
                </div>
                <div className="space-y-6">
                  {Object.entries(groupedMembers).map(([group, groupMembers]) => (
                    groupMembers.length > 0 && (
                      <div key={group}>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{group}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {groupMembers.map(m => (
                            <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                                {m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{m.name}</p>
                                <p className="text-xs text-gray-400">{m.weeklyHours}h/week</p>
                              </div>
                              {m.manager && <p className="text-xs text-gray-400 ml-auto">→ {m.manager.name}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'timesheet' && (
            <div className="card p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Timesheet Completion</h2>
                <p className="text-xs text-gray-400 mt-0.5">Actual vs expected hours for {format(new Date(year, month - 1, 1), 'MMMM yyyy')}</p>
              </div>
              {timesheetLoading ? <LoadingSpinner className="py-12" /> : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-th">Name</th>
                      <th className="table-th">Role</th>
                      <th className="table-th text-right">Expected</th>
                      <th className="table-th text-right">Actual</th>
                      <th className="table-th text-right">Variance</th>
                      <th className="table-th text-right">Billable %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {timesheetData?.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="table-td font-medium">{m.name}</td>
                        <td className="table-td">
                          <Badge variant={roleBadge[m.role]}>{m.role}</Badge>
                        </td>
                        <td className="table-td text-right">{fmt.hours(m.expectedHours)}</td>
                        <td className="table-td text-right">{fmt.hours(m.actualHours)}</td>
                        <td className={`table-td text-right font-medium ${m.variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {m.variance >= 0 ? '+' : ''}{fmt.hours(m.variance)}
                        </td>
                        <td className={`table-td text-right font-medium ${m.billableUtilization >= TARGET_UTILIZATION ? 'text-green-600' : 'text-amber-600'}`}>
                          {m.billableUtilization.toFixed(1)}%
                        </td>
                      </tr>
                    )) || (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No timesheet data</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
