import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import { toast } from 'sonner';
import { Trash2, Plus, Key, Link, Users } from 'lucide-react';
import { useToken } from '@/hooks/useToken';
import { getProject, updateProject, deleteProject } from '@/api/projects';
import { listKeys, createKey, revokeKey } from '@/api/keys';
import { createInvite, listInvites, listMembers } from '@/api/invites';
import { API_URL } from '@/config';
import { cn } from '@/lib/utils';
import CopyButton from '@/components/CopyButton';
import RawKeyModal from '@/components/RawKeyModal';
import InviteLinkModal from '@/components/InviteLinkModal';
import type { KeyCreated, KeyType, InviteCreated } from '@/types/api';

const KEY_TYPE_LABELS: Record<KeyType, string> = {
  read_only: 'Read Only',
  read_write: 'Read + Write',
  manage: 'Manage',
};

const KEY_TYPE_DESC: Record<KeyType, string> = {
  read_only: 'Query only',
  read_write: 'Query + ingest documents',
  manage: 'Full access',
};

export default function ProjectDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const getToken = useToken();
  const qc = useQueryClient();

  const [newRawKey, setNewRawKey] = useState<KeyCreated | null>(null);
  const [newInvite, setNewInvite] = useState<InviteCreated | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [keyType, setKeyType] = useState<KeyType>('read_write');
  const [keyDesc, setKeyDesc] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Settings form state
  const [editName, setEditName] = useState('');
  const [editSchema, setEditSchema] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [settingsReady, setSettingsReady] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', tenantId],
    queryFn: async () => {
      const token = await getToken();
      const p = await getProject(tenantId!, token);
      if (!settingsReady) {
        setEditName(p.name);
        setEditSchema(p.default_schema ?? '');
        setEditPrompt(p.default_prompt ?? '');
        setSettingsReady(true);
      }
      return p;
    },
    enabled: !!tenantId,
  });

  const { data: keys, isLoading: keysLoading } = useQuery({
    queryKey: ['keys', tenantId],
    queryFn: async () => listKeys(tenantId!, await getToken()),
    enabled: !!tenantId,
  });

  const createKeyMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return createKey(tenantId!, { key_type: keyType, description: keyDesc || undefined }, token);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['keys', tenantId] });
      setShowCreateKey(false);
      setKeyDesc('');
      setNewRawKey(data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (prefix: string) => revokeKey(tenantId!, prefix, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keys', tenantId] });
      toast.success('Key revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['project-members', tenantId],
    queryFn: async () => listMembers(tenantId!, await getToken()),
    enabled: !!tenantId,
  });

  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ['invites', tenantId],
    queryFn: async () => listInvites(tenantId!, await getToken()),
    enabled: !!tenantId,
  });

  const createInviteMutation = useMutation({
    mutationFn: async () => createInvite(tenantId!, await getToken()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['invites', tenantId] });
      qc.invalidateQueries({ queryKey: ['project-members', tenantId] });
      setNewInvite(data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (prefix: string) => revokeKey(tenantId!, prefix, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites', tenantId] });
      toast.success('Invite revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return updateProject(tenantId!, {
        name: editName || undefined,
        default_schema: editSchema || null,
        default_prompt: editPrompt || null,
      }, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', tenantId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteProject(tenantId!, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
      navigate('/projects');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="text-gray-400 text-sm">Loading…</div>;
  }
  if (!project) {
    return <div className="text-red-500 text-sm">Project not found.</div>;
  }

  const queryUrl = `${API_URL}/${tenantId}/query`;
  const processUrl = `${API_URL}/${tenantId}/process`;

  return (
    <div className="max-w-3xl">
      {newRawKey && <RawKeyModal keyData={newRawKey} onClose={() => setNewRawKey(null)} />}
      {newInvite && <InviteLinkModal rawToken={newInvite.raw_token} onClose={() => setNewInvite(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <p className="text-sm text-gray-400 font-mono mt-1">{project.tenant_id}</p>
      </div>

      <Tabs.Root defaultValue="overview">
        <Tabs.List className="flex border-b border-gray-200 mb-6 gap-1">
          {['overview', 'keys', 'members', 'settings', ...(project.is_owner ? ['danger'] : [])].map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
                'text-gray-500 border-transparent hover:text-gray-700',
                'data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600',
                tab === 'danger' && 'text-red-400 hover:text-red-600 data-[state=active]:text-red-600 data-[state=active]:border-red-500',
              )}
            >
              {tab === 'danger' ? 'Danger Zone' : tab === 'keys' ? 'API Keys' : tab === 'members' ? 'Members' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Overview */}
        <Tabs.Content value="overview" className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Project ID (immutable)</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono text-gray-800">{project.tenant_id}</code>
                <CopyButton value={project.tenant_id} />
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
              <p className="text-xs text-gray-400 mt-2">Use your API key in the <code className="text-xs">x-api-key</code> header.</p>
            </div>
          </div>
        </Tabs.Content>

        {/* API Keys */}
        <Tabs.Content value="keys" className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">API Keys</h2>
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
                  <label className="text-sm font-medium text-gray-700">Key type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(KEY_TYPE_LABELS) as [KeyType, string][]).map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => setKeyType(type)}
                        className={cn(
                          'text-sm px-3 py-2 rounded-lg border transition-colors text-left',
                          keyType === type
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700',
                        )}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-gray-400">{KEY_TYPE_DESC[type]}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Label <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={keyDesc}
                    onChange={(e) => setKeyDesc(e.target.value)}
                    placeholder="e.g. Production server"
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
                <Key size={24} className="mx-auto mb-2 opacity-40" />
                No keys yet. Create one to start using the API.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {keys.map((k) => (
                  <li key={k.key_prefix} className="flex items-center justify-between py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-gray-800">{k.key_prefix}…</code>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          k.key_type === 'manage' ? 'bg-purple-100 text-purple-700' :
                          k.key_type === 'read_write' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600',
                        )}>
                          {KEY_TYPE_LABELS[k.key_type]}
                        </span>
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
        </Tabs.Content>

        {/* Members */}
        <Tabs.Content value="members" className="space-y-4">
          {/* Member list */}
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
                        {m.email ? m.email[0].toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.email ?? `User #${m.user_id}`}</p>
                        {m.joined_at && (
                          <p className="text-xs text-gray-400">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      m.role === 'owner'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600',
                    )}>
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Invite links */}
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
              Each link can be used by multiple people to join this project. Revoke a link to
              stop accepting new members via it — existing members are unaffected.
            </p>

            {invitesLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : !invites?.length ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <Users size={24} className="mx-auto mb-2 opacity-40" />
                No active invite links. Create one to share.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {invites.map((inv) => (
                  <li key={inv.key_prefix} className="flex items-center justify-between py-3">
                    <div>
                      <code className="text-sm font-mono text-gray-800">{inv.key_prefix}…</code>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Created {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Revoke this invite link (${inv.key_prefix})? Existing members will not be removed.`)) {
                          revokeInviteMutation.mutate(inv.key_prefix);
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
        </Tabs.Content>

        {/* Settings */}
        <Tabs.Content value="settings" className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Project Settings</h2>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Display name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Default ingestion schema
                <span className="text-gray-400 font-normal ml-1">— applied when ingesting documents</span>
              </label>
              <textarea
                value={editSchema}
                onChange={(e) => setEditSchema(e.target.value)}
                rows={4}
                placeholder="Optional JSON or plain-text schema…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Default system prompt
                <span className="text-gray-400 font-normal ml-1">— used when querying this project</span>
              </label>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={4}
                placeholder="Optional system prompt…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Tabs.Content>

        {/* Danger Zone */}
        <Tabs.Content value="danger" className="space-y-4">
          <div className="bg-white rounded-xl border border-red-200 p-5 space-y-4">
            <h2 className="font-semibold text-red-700">Delete Project</h2>
            <p className="text-sm text-gray-600">
              This permanently deletes the project and all its API keys. This action cannot be undone.
            </p>
            <p className="text-sm text-gray-600">
              Type <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{tenantId}</code> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={tenantId}
              className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteConfirm !== tenantId || deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete project'}
            </button>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
