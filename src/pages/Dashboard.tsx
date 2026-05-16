import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth0 } from '@auth0/auth0-react';
import { useToken } from '@/hooks/useToken';
import { me } from '@/api/auth';
import { getBilling } from '@/api/billing';
import { listProjects } from '@/api/projects';
import { useUser } from '@/context/UserContext';
import { DEV_BYPASS } from '@/config';
import CreditBar from '@/components/CreditBar';
import CopyButton from '@/components/CopyButton';

const PLAN_LABELS = { free: 'Free', business: 'Business', enterprise: 'Enterprise' };
const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  business: 'bg-emerald-100 text-emerald-700',
  enterprise: 'bg-violet-100 text-violet-700',
};

export default function Dashboard() {
  const { user, setAuth } = useUser();
  const getToken = useToken();
  const { getAccessTokenSilently } = useAuth0();

  const [keyVisible, setKeyVisible] = useState(false);
  const [rotating, setRotating] = useState(false);

  const { data: billing } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => getBilling(await getToken()),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => listProjects(await getToken()),
  });

  const handleRotate = async () => {
    setRotating(true);
    try {
      const authToken = DEV_BYPASS ? null : await getAccessTokenSilently();
      const result = await me(authToken);
      if (result.warning) {
        toast.warning(result.warning, { duration: 10000 });
      } else if (result.management_key) {
        setAuth(result);
        setKeyVisible(false);
        toast.success('Management key rotated. The previous key is now invalid.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rotate key');
    } finally {
      setRotating(false);
    }
  };

  const managementKey = user?.management_key ?? null;
  const maskedKey = managementKey
    ? managementKey.slice(0, managementKey.indexOf('-', 'hashtag-user-key-'.length) + 9) + '•••'
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back{user?.email ? `, ${user.email}` : ''}.</p>
      </div>

      {/* Plan + Credits */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Plan &amp; Credits</h2>
          {billing && (
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${PLAN_BADGE[billing.plan]}`}>
              {PLAN_LABELS[billing.plan]}
            </span>
          )}
        </div>
        {billing ? (
          <>
            <CreditBar
              remaining={billing.credits_remaining}
              limit={billing.credits_limit}
              plan={billing.plan}
            />
            <div className="flex justify-end">
              <Link
                to="/billing"
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                Manage billing <ArrowRight size={14} />
              </Link>
            </div>
          </>
        ) : (
          <div className="h-8 bg-gray-100 rounded animate-pulse" />
        )}
      </div>

      {/* Management Key */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Management Key</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Bearer token for all <code className="font-mono">/mgmt</code> API calls
            </p>
          </div>
          <button
            onClick={handleRotate}
            disabled={rotating}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={rotating ? 'animate-spin' : ''} />
            {rotating ? 'Rotating…' : 'Rotate key'}
          </button>
        </div>

        {managementKey ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs font-mono text-gray-700 truncate select-all">
              {keyVisible ? managementKey : maskedKey}
            </code>
            <button
              onClick={() => setKeyVisible((v) => !v)}
              title={keyVisible ? 'Hide key' : 'Reveal key'}
              className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {keyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <CopyButton value={managementKey} />
          </div>
        ) : (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No management key available — log in again to generate one.
          </p>
        )}

        <p className="text-xs text-gray-400">
          This key is stored in your browser. Rotating it invalidates the previous key immediately.
        </p>
      </div>

      {/* Projects */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Projects</h2>
          <Link
            to="/projects"
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Plus size={14} />
            New project
          </Link>
        </div>

        {!projects ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No projects yet.{' '}
            <Link to="/projects" className="text-indigo-600 hover:underline">
              Create your first project →
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {projects.map((p) => (
              <li key={p.tenant_id}>
                <Link
                  to={`/projects/${p.tenant_id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.tenant_id}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
