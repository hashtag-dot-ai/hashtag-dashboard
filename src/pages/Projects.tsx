import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useToken } from '@/hooks/useToken';
import { listProjects, createProject, checkTenantId } from '@/api/projects';
import { cn } from '@/lib/utils';

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

export default function Projects() {
  const getToken = useToken();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [tenantIdManual, setTenantIdManual] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => listProjects(await getToken()),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return createProject({ name: name.trim(), tenant_id: tenantId }, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
      setShowForm(false);
      setName('');
      setTenantId('');
      setTenantIdManual(false);
      setAvailability(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Auto-derive tenant_id from name unless user edited it manually
  useEffect(() => {
    if (!tenantIdManual) {
      setTenantId(slugify(name));
    }
  }, [name, tenantIdManual]);

  // Debounced availability check
  useEffect(() => {
    if (!tenantId) { setAvailability(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const token = await getToken();
        const res = await checkTenantId(tenantId, token);
        setAvailability(res);
      } catch {
        setAvailability(null);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [tenantId]);

  const canSubmit =
    name.trim() &&
    tenantId &&
    availability?.available === true &&
    !createMutation.isPending;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={14} /> New project
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">New project</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Project ID (tenant_id)
              <span className="text-gray-400 font-normal ml-1">— permanent, used in API calls</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={tenantId}
                onChange={(e) => {
                  setTenantIdManual(true);
                  setTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                }}
                placeholder="my-project"
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8',
                  availability?.available === true && 'border-green-400',
                  availability?.available === false && 'border-red-400',
                  !availability && 'border-gray-300',
                )}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm">
                {checking && <Loader2 size={14} className="animate-spin text-gray-400" />}
                {!checking && availability?.available === true && <Check size={14} className="text-green-500" />}
                {!checking && availability?.available === false && <X size={14} className="text-red-500" />}
              </div>
            </div>
            {availability?.available === false && (
              <p className="text-xs text-red-600">{availability.reason ?? 'This ID is already taken'}</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {createMutation.isPending ? 'Creating…' : 'Create project'}
            </button>
            <button
              onClick={() => { setShowForm(false); setName(''); setTenantId(''); setTenantIdManual(false); setAvailability(null); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : !projects?.length ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No projects yet. Create one above.
          </div>
        ) : (
          projects.map((p) => (
            <Link
              key={p.tenant_id}
              to={`/projects/${p.tenant_id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{p.tenant_id}</p>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
