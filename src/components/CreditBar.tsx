import { cn } from '@/lib/utils';
import type { PlanType } from '@/types/api';

interface CreditBarProps {
  remaining: number;
  limit: number; // -1 = unlimited
  plan: PlanType;
  className?: string;
}

const planColors: Record<PlanType, string> = {
  free: 'bg-indigo-500',
  business: 'bg-emerald-500',
  enterprise: 'bg-violet-500',
};

export default function CreditBar({ remaining, limit, plan, className }: CreditBarProps) {
  const unlimited = limit === -1;
  const pct = unlimited ? 100 : Math.max(0, Math.min(100, (remaining / limit) * 100));
  const low = !unlimited && pct < 20;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex justify-between text-sm">
        <span className={cn('font-medium', low ? 'text-red-600' : 'text-gray-800')}>
          {remaining.toLocaleString()} credits remaining
        </span>
        <span className="text-gray-400">
          {unlimited ? 'Unlimited' : `of ${limit.toLocaleString()}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              low ? 'bg-red-500' : planColors[plan],
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {unlimited && (
        <p className="text-xs text-gray-400">Unlimited credits (Enterprise plan)</p>
      )}
    </div>
  );
}
