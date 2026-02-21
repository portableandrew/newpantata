import { clsx } from 'clsx';

type Variant = 'default' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray';

const variants: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-500',
};

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: Props) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
