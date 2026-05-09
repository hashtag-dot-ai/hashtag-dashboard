import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useToken } from '@/hooks/useToken';
import { listCorpuses, createCorpus, checkCorpusId } from '@/api/corpuses';
import { listTeams } from '@/api/teams';
import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

export default function Corpuses() {
  const getToken = useToken();
  const qc = useQueryClient();
  const { user } = useUser();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: corpuses, isLoading } = useQuery({
    queryKey: ['corpuses'],
    queryFn: async () => listCorpuses(await getToken()),
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => listTeams(await getToken()),
  });

  // Available owners: own username + team slugs (excluding personal team)
  const owners = [
    ...(user?.username ? [user.username] : []),
    ...(teams?.filter(t => !t.slug.startsWith('personal-')).map(t => t.slug) ?? []),
  ];

  const compoundName = selectedOwner && name ? `${selectedOwner}:${slugify(name)}` : '';

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return createCorpus({ name: slugify(name), owner: selectedOwner || undefined }, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corpuses'] });
      toast.success('Corpus created');
      setShowForm(false);
      setName('');
      setAvailability(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!selectedOwner && owners.length > 0) {
      setSelectedOwner(owners[0]);
    }
  }, [owners.length]);

  // Debounced availability check
  useEffect(() => {
    if (!compoundName) { setAvailability(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const token = await getToken();
        const res = await checkCorpusId(compoundName, token);
        setAvailability(res);
      } catch {
        setAvailability(null);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [compoundName]);

  const canSubmit =
    name.trim() &&
    selectedOwner &&
    availability?.available === true &&
    !createMutation.isPending;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Corpuses</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={14} /> New corpus
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">New corpus</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-corpus"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {owners.length > 1 && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Owner</label>
              <div className="flex gap-1 flex-wrap">
                {owners.map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setSelectedOwner(o)}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full border font-mono transition-colors',
                      selectedOwner === o
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}

          {compoundName && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Compound name
                <span className="text-gray-400 font-normal ml-1">— permanent identifier</span>
              </label>
              <div className="relative">
                <code className={cn(
                  'block w-full border rounded-lg px-3 py-2 text-sm font-mono bg-gray-50 pr-8',
                  availability?.available === true && 'border-green-400',
                  availability?.available === false && 'border-red-400',
                  !availability && 'border-gray-200',
                )}>
                  {compoundName}
                </code>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {checking && <Loader2 size={14} className="animate-spin text-gray-400" />}
                  {!checking && availability?.available === true && <Check size={14} className="text-green-500" />}
                  {!checking && availability?.available === false && <X size={14} className="text-red-500" />}
                </div>
              </div>
              {availability?.available === false && (
                <p className="text-xs text-red-600">{availability.reason ?? 'This name is already taken'}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {createMutation.isPending ? 'Creating…' : 'Create corpus'}
            </button>
            <button
              onClick={() => { setShowForm(false); setName(''); setAvailability(null); }}
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
        ) : !corpuses?.length ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No corpuses yet. Create one above.
          </div>
        ) : (
          corpuses.map((c) => (
            <Link
              key={c.corpus_id}
              to={`/corpuses/${c.corpus_id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{c.compound_name}</p>
                {c.team_slug && (
                  <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block">
                    {c.team_slug}
                  </span>
                )}
              </div>
              <ArrowRight size={16} className="text-gray-400" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
