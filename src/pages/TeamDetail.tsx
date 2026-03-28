import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, UserPlus, ChevronLeft } from 'lucide-react';
import { useToken } from '@/hooks/useToken';
import { getTeam, listMembers, addMember, removeMember } from '@/api/teams';
import type { MemberRole } from '@/types/api';
import { cn } from '@/lib/utils';

const ROLES: MemberRole[] = ['owner', 'admin', 'member'];

const ROLE_BADGE: Record<MemberRole, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  member: 'bg-gray-100 text-gray-600',
};

export default function TeamDetail() {
  const { slug } = useParams<{ slug: string }>();
  const getToken = useToken();
  const qc = useQueryClient();
  const [showAddMember, setShowAddMember] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<MemberRole>('member');

  const { data: team } = useQuery({
    queryKey: ['team', slug],
    queryFn: async () => getTeam(slug!, await getToken()),
    enabled: !!slug,
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ['team-members', slug],
    queryFn: async () => listMembers(slug!, await getToken()),
    enabled: !!slug,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const uid = parseInt(userId, 10);
      if (isNaN(uid)) throw new Error('User ID must be a number');
      return addMember(slug!, { user_id: uid, role }, await getToken());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members', slug] });
      toast.success('Member added');
      setShowAddMember(false);
      setUserId('');
      setRole('member');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (uid: number) => removeMember(slug!, uid, await getToken()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members', slug] });
      toast.success('Member removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="max-w-2xl space-y-6">
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

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Members</h2>
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <UserPlus size={14} /> Add member
          </button>
        </div>

        {showAddMember && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">User ID</label>
                <input
                  type="number"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400">From POST /mgmt/auth/me → user_id</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as MemberRole)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => addMutation.mutate()}
                disabled={!userId || addMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {addMutation.isPending ? 'Adding…' : 'Add'}
              </button>
              <button
                onClick={() => setShowAddMember(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
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
                    {m.user_id}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">User #{m.user_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_BADGE[m.role as MemberRole])}>
                    {m.role}
                  </span>
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove user #${m.user_id} from this team?`)) {
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
    </div>
  );
}
