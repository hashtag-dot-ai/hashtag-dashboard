import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useToken } from '@/hooks/useToken';
import { useUser } from '@/context/UserContext';
import { getBilling } from '@/api/billing';
import { rotateKey } from '@/api/auth';
import CreditBar from '@/components/CreditBar';

const PLANS: { type: string; label: string; credits: string }[] = [
  { type: 'free', label: 'Free', credits: '100 credits/month' },
  { type: 'business', label: 'Business', credits: '1,000 credits/month' },
  { type: 'enterprise', label: 'Enterprise', credits: 'Unlimited' },
];

const OP_LABELS: Record<string, string> = {
  query: 'Query',
  fast_query: 'Fast query',
  deep_query: 'Deep query',
  create_doc: 'Ingest document',
};

export default function Billing() {
  const getToken = useToken();
  const { setAuth } = useUser();
  const qc = useQueryClient();
  const [confirmRotate, setConfirmRotate] = useState(false);

  const rotateMutation = useMutation({
    mutationFn: async () => rotateKey((await getToken()) ?? ''),
    onSuccess: (data) => {
      if (data.management_key) setAuth(data);
      qc.invalidateQueries({ queryKey: ['billing'] });
      toast.success('API key rotated — update any agents or scripts using the old key.');
      setConfirmRotate(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => getBilling(await getToken()),
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
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Current plan</p>
          <p className="text-lg font-bold text-gray-900">{currentPlan?.label ?? billing.plan}</p>
          <p className="text-sm text-gray-400">{currentPlan?.credits}</p>
        </div>

        <CreditBar
          remaining={billing.credits_remaining}
          limit={billing.credits_limit}
          plan={billing.plan}
        />

        <p className="text-sm text-gray-500">
          Need more credits?{' '}
          <a
            href="mailto:anj@hashtag.ai"
            className="text-indigo-600 hover:underline font-medium"
          >
            Contact anj@hashtag.ai
          </a>
          {' '}— we're happy to support startups.
        </p>
      </div>

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

      {/* API key rotation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">API key</h2>
        <p className="text-sm text-gray-500">
          Your management key is used by agents and scripts to access the API. Rotating it
          will immediately invalidate all existing keys — update any integrations afterwards.
        </p>
        {confirmRotate ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 font-medium">This will break existing integrations. Are you sure?</span>
            <button
              onClick={() => rotateMutation.mutate()}
              disabled={rotateMutation.isPending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {rotateMutation.isPending ? 'Rotating…' : 'Yes, rotate'}
            </button>
            <button
              onClick={() => setConfirmRotate(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRotate(true)}
            className="border border-red-300 hover:bg-red-50 text-red-600 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            Rotate API key
          </button>
        )}
      </div>
    </div>
  );
}
