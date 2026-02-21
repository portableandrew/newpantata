import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | ReactNode;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export default function StatCard({ label, value, sub, trend, trendValue, className }: Props) {
  return (
    <div className={clsx('card', className)}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {(sub || trendValue) && (
        <div className="mt-1 flex items-center gap-2">
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
          {trendValue && (
            <span
              className={clsx(
                'text-xs font-medium',
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
              )}
            >
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
