import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  FolderOpen,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderOpen },
  { to: '/pipeline', label: 'Pipeline', icon: TrendingUp },
  { to: '/team', label: 'Team & Utilization', icon: Users },
  { to: '/financials', label: 'Financials', icon: DollarSign },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/harvest', label: 'Harvest Sync', icon: RefreshCw },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">Paradise</p>
            <p className="text-xs text-gray-400 mt-0.5">Project Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-indigo-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">Paradise PM v1.0</p>
        <p className="text-xs text-gray-300">Replacing Kantata with joy</p>
      </div>
    </aside>
  );
}
