import { clsx } from 'clsx';
import type { RagStatus } from '../../types';

interface Props {
  status: RagStatus | null | undefined;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const labels: Record<RagStatus, string> = {
  Green: 'GRN',
  Orange: 'ORG',
  Red: 'RED',
};

const colors: Record<RagStatus, string> = {
  Green: 'bg-green-500',
  Orange: 'bg-amber-500',
  Red: 'bg-red-500',
};

const textColors: Record<RagStatus, string> = {
  Green: 'text-green-700 bg-green-50 border-green-200',
  Orange: 'text-amber-700 bg-amber-50 border-amber-200',
  Red: 'text-red-700 bg-red-50 border-red-200',
};

export function RagDot({ status }: { status: RagStatus | null | undefined }) {
  if (!status) return <span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />;
  return <span className={clsx('w-2.5 h-2.5 rounded-full inline-block', colors[status])} />;
}

export default function RagBadge({ status, size = 'md', showLabel = true }: Props) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-gray-200 text-gray-400 text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-gray-300" />
        {showLabel && 'N/A'}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs',
        textColors[status]
      )}
    >
      <span className={clsx('rounded-full', size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2', colors[status])} />
      {showLabel && labels[status]}
    </span>
  );
}
