import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import { toast } from 'sonner';
import { Trash2, Plus, Link, Users, Network } from 'lucide-react';
import { useToken } from '@/hooks/useToken';
import { getCorpus, updateCorpus, deleteCorpus } from '@/api/corpuses';
import { listKeys, createKey, revokeKey } from '@/api/keys';
import { createInvite, listInvites, listMembers, revokeInvite } from '@/api/invites';
import { API_URL } from '@/config';
import { cn } from '@/lib/utils';
import CopyButton from '@/components/CopyButton';
import RawKeyModal from '@/components/RawKeyModal';
import InviteLinkModal from '@/components/InviteLinkModal';
import KGGraph from '@/components/KGGraph';
import { useUser } from '@/context/UserContext';
import type { KeyCreated, InviteCreated } from '@/types/api';

export default function CorpusDetail() {
  const { corpusId } = useParams<{ corpusId: string }>();
  const navigate = useNavigate();
  const getToken = useToken();
  const qc = useQueryClient();
  const { user } = useUser();

  const [newRawKey, setNewRawKey] = useState<KeyCreated | null>(null);
  const [newInvite, setNewInvite] = useState<InviteCreated | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [keyDesc, setKeyDesc] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [editName, setEditName] = useState('');
  const [settingsReady, setSettingsReady] = useState(false);

  const { data: corpus, isLoading } = useQuery({
    queryKey: ['corpus', corpusId],
    queryFn: async () => {
      const token = await getToken();
      const c = await getCorpus(corpusId!, token);
      if (!settingsReady) {
        setEditName(c.name);
        setSettingsReady(true);
      }
      return c;
    },
    enabled: !!corpusId,
  });

  const { data: keys, isLoading: keysLoading } = useQuery({
    queryKey: ['keys', corpusId],
    queryFn: async () => listKeys(corpusId!, await getToken()),
    enabled: !!corpusId,
  });

  const createKeyMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return createKey(corpusId!, { description: keyDesc || undefined }, token);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['keys', corpusId] });
      setShowCreateKey(false);
      setKeyDesc('');
      setNewRawKey(data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (prefix: string) => revokeKey(corpusId!, prefix, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keys', corpusId] });
      toast.success('Key revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['corpus-members', corpusId],
    queryFn: async () => listMembers(corpusId!, await getToken()),
    enabled: !!corpusId,
  });

  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ['corpus-invites', corpusId],
    queryFn: async () => listInvites(corpusId!, await getToken()),
    enabled: !!corpusId,
  });

  const createInviteMutation = useMutation({
    mutationFn: async () => createInvite(corpusId!, await getToken()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['corpus-invites', corpusId] });
      qc.invalidateQueries({ queryKey: ['corpus-members', corpusId] });
      setNewInvite(data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (prefix: string) => revokeInvite(corpusId!, prefix, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corpus-invites', corpusId] });
      toast.success('Invite revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return updateCorpus(corpusId!, { name: editName || undefined }, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corpus', corpusId] });
      qc.invalidateQueries({ queryKey: ['corpuses'] });
      toast.success('Settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteCorpus(corpusId!, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corpuses'] });
      toast.success('Corpus deleted');
      navigate('/corpuses');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="text-gray-400 text-sm">Loading…</div>;
  }
  if (!corpus) {
    return <div className="text-red-500 text-sm">Corpus not found.</div>;
  }

  const queryUrl = `${API_URL}/${corpus.corpus_id}/query`;
  const processUrl = `${API_URL}/${corpus.corpus_id}/process`;

  const TABS = [
    'overview', 'graph', 'keys', 'members', 'settings',
    ...(corpus.is_owner ? ['danger'] : []),
  ];

  const TAB_LABEL: Record<string, string> = {
    overview: 'Overview',
    graph:    'Graph',
    keys:     'Keys',
    members:  'Members',
    settings: 'Settings',
    danger:   'Danger Zone',
  };

  return (
    <div>
      {newRawKey && <RawKeyModal keyData={newRawKey} onClose={() => setNewRawKey(null)} />}
      {newInvite && <InviteLinkModal rawToken={newInvite.raw_token} onClose={() => setNewInvite(null)} />}

      <div className="max-w-3xl mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{corpus.name}</h1>
        <p className="text-sm text-gray-400 font-mono mt-1">{corpus.compound_name}</p>
        {corpus.team_slug && (
          <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium mt-2 inline-block">
            Team: {corpus.team_slug}
          </span>
        )}
      </div>

      <Tabs.Root defaultValue="overview">
        <Tabs.List className="flex border-b border-gray-200 mb-6 gap-1">
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                'text-gray-500 border-transparent hover:text-gray-700',
                'data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600',
                tab === 'danger' && 'text-red-400 hover:text-red-600 data-[state=active]:text-red-600 data-[state=active]:border-red-500',
              )}
            >
              {tab === 'graph' && <Network size={13} />}
              {TAB_LABEL[tab]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="graph">
          <KGGraph tenantId={corpus.corpus_id} />
        </Tabs.Content>

        <Tabs.Content value="overview">
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Perma-ID (immutable)</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono text-gray-800">{corpus.corpus_id}</code>
                  <CopyButton value={corpus.corpus_id} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Compound name</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono text-gray-800">{corpus.compound_name}</code>
                  <CopyButton value={corpus.compound_name} />
                </div>
              </div>
              <hr className="border-gray-100" />
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">API Endpoints</label>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Query', url: queryUrl },
                    { label: 'Ingest', url: processUrl },
                  ].map(({ label, url }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-12 text-gray-500 text-xs">{label}</span>
                      <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs font-mono text-gray-700 truncate">
                        {url}
                      </code>
                      <CopyButton value={url} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Use your account key or a corpus key in the <code className="text-xs">x-api-key</code> header.
                </p>
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="keys">
          <div className="max-w-3xl space-y-4">
            {/* Account key reminder */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div>
                <h2 className="font-semibold text-gray-800">Account Key</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Your personal account key grants access to all corpuses you own. Use it in
                  the <code className="text-xs">x-api-key</code> header. Visible at login; rotate from the Dashboard to reveal again.
                </p>
              </div>
              {user?.account_key ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800 break-all">
                    {user.account_key}
                  </code>
                  <CopyButton value={user.account_key} />
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  {user?.account_key_prefix
                    ? <><code className="font-mono text-xs">{user.account_key_prefix}…</code> — rotate from Dashboard to reveal.</>
                    : 'Not available — rotate from Dashboard to reveal.'}
                </p>
              )}
            </div>

            {/* Corpus keys */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-semibold text-gray-800">Corpus Keys</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Scoped to this corpus only. Safe for agents, integrations, and embeds.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateKey(true)}
                  className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <Plus size={14} /> Create key
                </button>
              </div>

              {showCreateKey && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Label <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={keyDesc}
                      onChange={(e) => setKeyDesc(e.target.value)}
                      placeholder="e.g. Production agent"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => createKeyMutation.mutate()}
                      disabled={createKeyMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {createKeyMutation.isPending ? 'Creating…' : 'Create'}
                    </button>
                    <button
                      onClick={() => setShowCreateKey(false)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {keysLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ) : !keys?.length ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No corpus keys yet.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {keys.map((k) => (
                    <li key={k.key_prefix} className="flex items-center justify-between py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-gray-800">{k.key_prefix}…</code>
                          {k.revoked && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Revoked</span>
                          )}
                        </div>
                        {k.description && <p className="text-xs text-gray-400 mt-0.5">{k.description}</p>}
                      </div>
                      {!k.revoked && (
                        <button
                          onClick={() => {
                            if (confirm(`Revoke key ${k.key_prefix}? This cannot be undone.`)) {
                              revokeKeyMutation.mutate(k.key_prefix);
                            }
                          }}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={13} /> Revoke
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="members">
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Members</h2>
              {membersLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {members?.map((m) => (
                    <li key={m.user_id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-medium select-none">
                          {(m.username ?? '?')[0].toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-gray-800">
                          {m.username ? `@${m.username}` : `User #${m.user_id}`}
                        </p>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        m.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600',
                      )}>
                        {m.role}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Invite Links</h2>
                <button
                  onClick={() => createInviteMutation.mutate()}
                  disabled={createInviteMutation.isPending}
                  className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <Link size={14} /> Create invite link
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Each link can be used by multiple people. Revoke to stop accepting new members.
              </p>
              {invitesLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ) : !invites?.length ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <Users size={24} className="mx-auto mb-2 opacity-40" />
                  No active invite links.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {invites.map((inv) => (
                    <li key={inv.token_prefix} className="flex items-center justify-between py-3">
                      <div>
                        <code className="text-sm font-mono text-gray-800">{inv.token_prefix}…</code>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Created {new Date(inv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Revoke this invite? Existing members will not be removed.`)) {
                            revokeInviteMutation.mutate(inv.token_prefix);
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={13} /> Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="settings">
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">Corpus Settings</h2>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400">Renaming updates the compound name but the UUID perma-ID stays the same.</p>
              </div>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="danger">
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-xl border border-red-200 p-5 space-y-4">
              <h2 className="font-semibold text-red-700">Delete Corpus</h2>
              <p className="text-sm text-gray-600">
                This permanently deletes the corpus and all its graph data and API keys. This action cannot be undone.
              </p>
              <p className="text-sm text-gray-600">
                Type <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{corpus.name}</code> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={corpus.name}
                className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteConfirm !== corpus.name || deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete corpus'}
              </button>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
