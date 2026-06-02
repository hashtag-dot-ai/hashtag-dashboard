import { useQuery } from '@tanstack/react-query';
import { useToken } from '@/hooks/useToken';
import { getBilling } from '@/api/billing';
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
    </div>
  );
}
