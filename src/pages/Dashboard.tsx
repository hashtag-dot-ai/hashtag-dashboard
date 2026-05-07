import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, RefreshCw, Check, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { useToken } from '@/hooks/useToken';
import { getBilling } from '@/api/billing';
import { listProjects } from '@/api/projects';
import { updateProfile, rotateAccountKey, getUsernameSuggestion } from '@/api/auth';
import { useUser } from '@/context/UserContext';
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
  const qc = useQueryClient();

  // Username edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  // Account key rotation state
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  const { data: billing } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => getBilling(await getToken()),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => listProjects(await getToken()),
  });

  const usernameSuggestionQuery = useQuery({
    queryKey: ['username-suggestion'],
    queryFn: async () => getUsernameSuggestion(await getToken()),
    enabled: editingUsername && !user?.username,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (username: string) => updateProfile({ username }, await getToken()),
    onSuccess: (data) => {
      setAuth(data);
      setEditingUsername(false);
      toast.success('Username set');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rotateKeyMutation = useMutation({
    mutationFn: async () => rotateAccountKey(await getToken()),
    onSuccess: (data) => {
      setNewRawKey(data.raw_key);
      // Update the prefix in the user context by refreshing via /mgmt/auth/me would be cleanest,
      // but we can optimistically update it here.
      if (user) setAuth({ ...user, account_key_prefix: data.key_prefix });
      toast.success('Account key rotated — copy it now');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startEditUsername = () => {
    setUsernameInput(user?.username ?? '');
    setEditingUsername(true);
  };

  const cancelEditUsername = () => {
    setEditingUsername(false);
    setUsernameInput('');
  };

  const applyUsernameSuggestion = () => {
    if (usernameSuggestionQuery.data) {
      setUsernameInput(usernameSuggestionQuery.data.suggestion);
    }
  };

  const displayKey = newRawKey ?? null;

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

      {/* Account */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <h2 className="font-semibold text-gray-800">Account</h2>

        {/* Username */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700">Username</p>
          {editingUsername ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="your_username"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  onClick={() => updateProfileMutation.mutate(usernameInput.trim())}
                  disabled={!usernameInput.trim() || updateProfileMutation.isPending}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-medium"
                >
                  <Check size={14} /> Save
                </button>
                <button
                  onClick={cancelEditUsername}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                >
                  <X size={14} />
                </button>
              </div>
              {!user?.username && usernameSuggestionQuery.data && (
                <button
                  onClick={applyUsernameSuggestion}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Use suggestion: {usernameSuggestionQuery.data.suggestion}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {user?.username ? (
                <span className="text-sm font-mono text-gray-900">@{user.username}</span>
              ) : (
                <span className="text-sm text-gray-400">Not set — optional, used for discoverability</span>
              )}
              <button
                onClick={startEditUsername}
                className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit username"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Account key */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700">Account key</p>
          <p className="text-xs text-gray-500">
            Full programmatic access to all your projects — keep this private.
          </p>
          {displayKey ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800">Copy your new account key — it won't be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-white border border-amber-200 rounded px-2 py-1.5 break-all text-gray-900">
                  {displayKey}
                </code>
                <CopyButton value={displayKey} />
              </div>
              <button
                onClick={() => setNewRawKey(null)}
                className="text-xs text-amber-700 hover:underline"
              >
                I've saved it — dismiss
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {user?.account_key_prefix && (
                <span className="text-sm font-mono text-gray-500">
                  {user.account_key_prefix}••••••••••••••••••••••••••••••••
                </span>
              )}
              <button
                onClick={() => {
                  if (window.confirm('Rotating your account key will immediately invalidate the current one. Continue?')) {
                    rotateKeyMutation.mutate();
                  }
                }}
                disabled={rotateKeyMutation.isPending}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              >
                <RefreshCw size={13} className={rotateKeyMutation.isPending ? 'animate-spin' : ''} />
                Rotate key
              </button>
            </div>
          )}
        </div>
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
