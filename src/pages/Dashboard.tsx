import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import { useToken } from '@/hooks/useToken';
import { getBilling } from '@/api/billing';
import { listProjects } from '@/api/projects';
import { useUser } from '@/context/UserContext';
import CreditBar from '@/components/CreditBar';

const PLAN_LABELS = { free: 'Free', business: 'Business', enterprise: 'Enterprise' };
const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  business: 'bg-emerald-100 text-emerald-700',
  enterprise: 'bg-violet-100 text-violet-700',
};

export default function Dashboard() {
  const { user } = useUser();
  const getToken = useToken();

  const { data: billing } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => getBilling(await getToken()),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => listProjects(await getToken()),
  });

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
