import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useToken } from '@/hooks/useToken';
import { getBilling, setPlan } from '@/api/billing';
import { cn } from '@/lib/utils';
import CreditBar from '@/components/CreditBar';
import type { PlanType } from '@/types/api';

const PLANS: { type: PlanType; label: string; credits: string; price: string }[] = [
  { type: 'free', label: 'Free', credits: '100 credits/month', price: '$0' },
  { type: 'business', label: 'Business', credits: '1,000 credits/month', price: 'TBD' },
  { type: 'enterprise', label: 'Enterprise', credits: 'Unlimited', price: 'TBD' },
];

const OP_LABELS: Record<string, string> = {
  query: 'Query',
  fast_query: 'Fast query',
  deep_query: 'Deep query',
  create_doc: 'Ingest document',
};

export default function Billing() {
  const getToken = useToken();
  const qc = useQueryClient();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => getBilling(await getToken()),
  });

  const setPlanMutation = useMutation({
    mutationFn: async (plan: PlanType) => setPlan({ plan }, await getToken()),
    onSuccess: (data) => {
      qc.setQueryData(['billing'], data);
      toast.success(`Switched to ${data.plan} plan`);
      setShowUpgrade(false);
      setSelectedPlan(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="text-gray-400 text-sm">Loading…</div>;
  }
  if (!billing) return null;

  const currentPlan = PLANS.find((p) => p.type === billing.plan);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {/* Current plan + credits */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Current plan</p>
            <p className="text-lg font-bold text-gray-900">{currentPlan?.label ?? billing.plan}</p>
            <p className="text-sm text-gray-400">{currentPlan?.credits}</p>
          </div>
          <button
            onClick={() => setShowUpgrade(!showUpgrade)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {showUpgrade ? 'Cancel' : 'Change plan'}
          </button>
        </div>

        <CreditBar
          remaining={billing.credits_remaining}
          limit={billing.credits_limit}
          plan={billing.plan}
        />
      </div>

      {/* Plan selector */}
      {showUpgrade && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Choose a plan</h2>
          <div className="grid grid-cols-3 gap-3">
            {PLANS.map((plan) => (
              <button
                key={plan.type}
                onClick={() => setSelectedPlan(plan.type)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-colors',
                  selectedPlan === plan.type
                    ? 'border-indigo-500 bg-indigo-50'
                    : billing.plan === plan.type
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <div className="font-semibold text-gray-900 mb-1">{plan.label}</div>
                <div className="text-xs text-gray-500">{plan.credits}</div>
                <div className="text-sm font-bold text-gray-800 mt-2">{plan.price}</div>
                {billing.plan === plan.type && (
                  <div className="text-xs text-indigo-600 font-medium mt-1">Current</div>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => selectedPlan && setPlanMutation.mutate(selectedPlan)}
            disabled={!selectedPlan || selectedPlan === billing.plan || setPlanMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {setPlanMutation.isPending ? 'Switching…' : 'Switch plan'}
          </button>
        </div>
      )}

      {/* Operation costs */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Credit costs per operation</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-100">
              <th className="pb-2 font-medium text-gray-500">Operation</th>
              <th className="pb-2 font-medium text-gray-500 text-right">Credits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Object.entries(billing.operation_costs).map(([op, cost]) => (
              <tr key={op}>
                <td className="py-2.5 text-gray-700">{OP_LABELS[op] ?? op}</td>
                <td className="py-2.5 text-right font-mono font-medium text-gray-900">{cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
