import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useToken } from '@/hooks/useToken';
import { listTeams, createTeam, checkSlug } from '@/api/teams';
import { cn } from '@/lib/utils';

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

export default function Teams() {
  const getToken = useToken();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean } | null>(null);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => listTeams(await getToken()),
  });

  const createMutation = useMutation({
    mutationFn: async () => createTeam({ slug, name: name.trim() }, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created');
      setShowForm(false);
      setName('');
      setSlug('');
      setSlugManual(false);
      setAvailability(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!slugManual) setSlug(slugify(name));
  }, [name, slugManual]);

  useEffect(() => {
    if (!slug) { setAvailability(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await checkSlug(slug, await getToken());
        setAvailability(res);
      } catch {
        setAvailability(null);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [slug]);

  const canSubmit = name.trim() && slug && availability?.available === true && !createMutation.isPending;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={14} /> New team
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">New team</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Team"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Slug
              <span className="text-gray-400 font-normal ml-1">— permanent identifier</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                }}
                placeholder="acme-team"
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8',
                  availability?.available === true && 'border-green-400',
                  availability?.available === false && 'border-red-400',
                  !availability && 'border-gray-300',
                )}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {checking && <Loader2 size={14} className="animate-spin text-gray-400" />}
                {!checking && availability?.available === true && <Check size={14} className="text-green-500" />}
                {!checking && availability?.available === false && <X size={14} className="text-red-500" />}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {createMutation.isPending ? 'Creating…' : 'Create team'}
            </button>
            <button
              onClick={() => { setShowForm(false); setName(''); setSlug(''); setSlugManual(false); setAvailability(null); }}
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
            {[1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : !teams?.length ? (
          <div className="p-10 text-center text-gray-400 text-sm">No teams yet.</div>
        ) : (
          teams.map((t) => (
            <Link
              key={t.slug}
              to={`/teams/${t.slug}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{t.slug}</p>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
