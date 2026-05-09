import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Link as LinkIcon, Key, Plus, ChevronLeft, CreditCard, ArrowRight, LogOut, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToken } from '@/hooks/useToken';
import { useUser } from '@/context/UserContext';
import {
  getTeam, listMembers, removeMember, leaveTeam,
  createTeamInvite, listTeamInvites, revokeTeamInvite,
  createTeamKey, listTeamKeys, revokeTeamKey,
  listTeamCorpuses, updateTeam,
} from '@/api/teams';
import { getBilling } from '@/api/billing';
import { cn } from '@/lib/utils';
import CopyButton from '@/components/CopyButton';
import RawKeyModal from '@/components/RawKeyModal';
import type { MemberRole, TeamKeyCreated } from '@/types/api';

const ROLE_BADGE: Record<MemberRole, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  member: 'bg-gray-100 text-gray-600',
};

function InviteLinkModal({ rawToken, onClose }: { rawToken: string; onClose: () => void }) {
  const inviteUrl = `${window.location.origin}/accept-team-invite?token=${encodeURIComponent(rawToken)}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Team invite link</h2>
        <p className="text-sm text-gray-600">
          Share this link to invite people to join your team. This link can be used by multiple people.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
          <code className="flex-1 text-xs font-mono break-all text-gray-800">{inviteUrl}</code>
          <CopyButton value={inviteUrl} />
        </div>
        <button
          onClick={onClose}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function TeamDetail() {
  const { slug } = useParams<{ slug: string }>();
  const getToken = useToken();
  const qc = useQueryClient();
  const { user } = useUser();
  const [newInvite, setNewInvite] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<TeamKeyCreated | null>(null);
  const [keyDesc, setKeyDesc] = useState('');
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  const { data: team } = useQuery({
    queryKey: ['team', slug],
    queryFn: async () => getTeam(slug!, await getToken()),
    enabled: !!slug,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members', slug],
    queryFn: async () => listMembers(slug!, await getToken()),
    enabled: !!slug,
  });

  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ['team-invites', slug],
    queryFn: async () => listTeamInvites(slug!, await getToken()),
    enabled: !!slug,
  });

  const { data: keys, isLoading: keysLoading } = useQuery({
    queryKey: ['team-keys', slug],
    queryFn: async () => listTeamKeys(slug!, await getToken()),
    enabled: !!slug,
  });

  const { data: teamCorpuses } = useQuery({
    queryKey: ['team-corpuses', slug],
    queryFn: async () => listTeamCorpuses(slug!, await getToken()),
    enabled: !!slug,
  });

  const { data: billing } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => getBilling(await getToken()),
  });

  const isOwner = team?.is_owner ?? false;
  const currentUserId = members?.find(m => m.username === user?.username)?.user_id;

  const removeMutation = useMutation({
    mutationFn: async (uid: number) => removeMember(slug!, uid, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members', slug] });
      toast.success('Member removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error('Could not determine your user ID');
      return leaveTeam(slug!, currentUserId, await getToken());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      toast.success('You have left the team');
      window.location.href = '/teams';
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createInviteMutation = useMutation({
    mutationFn: async () => createTeamInvite(slug!, await getToken()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['team-invites', slug] });
      setNewInvite(data.raw_token);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (prefix: string) => revokeTeamInvite(slug!, prefix, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-invites', slug] });
      toast.success('Invite revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createKeyMutation = useMutation({
    mutationFn: async () => createTeamKey(slug!, { description: keyDesc || undefined }, await getToken()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['team-keys', slug] });
      setShowCreateKey(false);
      setKeyDesc('');
      setNewKey(data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (prefix: string) => revokeTeamKey(slug!, prefix, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-keys', slug] });
      toast.success('Key revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleCreditsMutation = useMutation({
    mutationFn: async (useTeamCredits: boolean) =>
      updateTeam(slug!, { use_team_credits: useTeamCredits }, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', slug] });
      toast.success('Credit setting updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="max-w-2xl space-y-6">
      {newInvite && <InviteLinkModal rawToken={newInvite} onClose={() => setNewInvite(null)} />}
      {newKey && (
        <RawKeyModal
          keyData={{ key_prefix: newKey.key_prefix, key_type: 'manage', raw_key: newKey.raw_key, revoked: false }}
          onClose={() => setNewKey(null)}
        />
      )}

      <div>
        <Link
          to="/teams"
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3 transition-colors"
        >
          <ChevronLeft size={14} /> Teams
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{team?.name ?? slug}</h1>
        <p className="text-sm text-gray-400 font-mono mt-1">{slug}</p>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Members</h2>
          {!isOwner && currentUserId && (
            <button
              onClick={() => {
                if (confirm('Leave this team? You will lose access to all team projects.')) {
                  leaveMutation.mutate();
                }
              }}
              disabled={leaveMutation.isPending}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <LogOut size={12} /> Leave team
            </button>
          )}
        </div>
        {membersLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : !members?.length ? (
          <p className="text-sm text-gray-400 py-4 text-center">No members yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-medium">
                    {(m.username ?? String(m.user_id))[0].toUpperCase()}
                  </div>
                  <div>
                    {m.username ? (
                      <p className="text-sm font-medium text-gray-800">@{m.username}</p>
                    ) : (
                      <p className="text-sm font-medium text-gray-800">User #{m.user_id}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_BADGE[m.role as MemberRole])}>
                    {m.role}
                  </span>
                  {isOwner && m.role !== 'owner' && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove @${m.username ?? m.user_id} from this team?`)) {
                          removeMutation.mutate(m.user_id);
                        }
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invite Links — visible to all members */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Invite Links</h2>
          <button
            onClick={() => createInviteMutation.mutate()}
            disabled={createInviteMutation.isPending}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <LinkIcon size={14} /> Create invite link
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Each link can be used by multiple people to join this team. When someone clicks the link,
          they'll be asked to confirm before joining.
        </p>
        {invitesLoading ? (
          <div className="space-y-2">
            {[1].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : !invites?.length ? (
          <p className="text-sm text-gray-400 text-center py-4">No active invite links.</p>
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
                {isOwner && (
                  <button
                    onClick={() => {
                      if (confirm(`Revoke this invite link?`)) {
                        revokeInviteMutation.mutate(inv.token_prefix);
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

      {/* Team API Key — visible to all members */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-semibold text-gray-800">Team API Key</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Scoped to all projects owned by this team. Use as <code className="font-mono">x-api-key</code> header.
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
                placeholder="e.g. CI/CD pipeline"
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
          <div className="space-y-2 mt-3">
            {[1].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : !keys?.length ? (
          <div className="text-center py-6 text-gray-400 text-sm mt-2">
            <Key size={22} className="mx-auto mb-2 opacity-40" />
            No keys yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 mt-3">
            {keys.map((k) => (
              <li key={k.key_prefix} className="flex items-center justify-between py-3">
                <div>
                  <code className="text-sm font-mono text-gray-800">{k.key_prefix}…</code>
                  {k.description && <p className="text-xs text-gray-400 mt-0.5">{k.description}</p>}
                  {k.creator_username && (
                    <p className="text-xs text-gray-400 mt-0.5">Created by @{k.creator_username}</p>
                  )}
                  {k.revoked && <span className="text-xs text-red-500 ml-2">Revoked</span>}
                </div>
                {isOwner && !k.revoked && (
                  <button
                    onClick={() => {
                      if (confirm(`Revoke key ${k.key_prefix}?`)) {
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

      {/* Corpuses */}
      {teamCorpuses && teamCorpuses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Team Corpuses</h2>
          <ul className="divide-y divide-gray-100">
            {teamCorpuses.map((c) => (
              <li key={c.corpus_id}>
                <Link
                  to={`/corpuses/${c.corpus_id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{c.compound_name}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Credits */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">Credits</h2>

        {/* Team credit balance */}
        {team !== undefined && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Team balance: <span className="font-semibold text-gray-900">{team.credits_remaining}</span> credits
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Default 0 — contact us to top up.</p>
              </div>
            </div>

            {/* Toggle: use team credits vs owner's personal credits */}
            {isOwner && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Use team credits</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {team.use_team_credits
                      ? 'Operations use the team credit balance.'
                      : "Operations fall back to the owner's personal credits."}
                  </p>
                </div>
                <button
                  onClick={() => toggleCreditsMutation.mutate(!team.use_team_credits)}
                  disabled={toggleCreditsMutation.isPending}
                  className="text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors"
                  title={team.use_team_credits ? 'Switch to owner credits' : 'Switch to team credits'}
                >
                  {team.use_team_credits
                    ? <ToggleRight size={28} className="text-indigo-600" />
                    : <ToggleLeft size={28} className="text-gray-400" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Personal credit balance for reference */}
        {billing ? (
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Your personal balance: <span className="font-semibold text-gray-700">{billing.credits_remaining}</span>
              {billing.credits_limit > 0 ? ` / ${billing.credits_limit}` : ''} credits
            </p>
            <button
              onClick={() => setShowBuyCredits(!showBuyCredits)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <CreditCard size={14} /> Buy credits
            </button>
          </div>
        ) : (
          <div className="h-6 bg-gray-100 rounded animate-pulse" />
        )}

        {showBuyCredits && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-indigo-900">Get more credits</p>
            <p className="text-sm text-indigo-700">
              Send an email to{' '}
              <a href="mailto:anj@hashtag.ai" className="underline font-medium">anj@hashtag.ai</a>
              {' '}— we can grant special access for startups during the beta.
            </p>
            <button
              onClick={() => setShowBuyCredits(false)}
              className="text-xs text-indigo-500 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
