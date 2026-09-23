import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { toast } from 'sonner';
import { Network, Compass, Database, Trash2, ArrowLeft, Key } from 'lucide-react';
import { API_URL } from '@/config';
import { cn } from '@/lib/utils';
import CopyButton from '@/components/CopyButton';
import KGGraph from '@/components/KGGraph';
import KGExplore from '@/components/explore/KGExplore';
import { useProjectKey } from '@/hooks/useProjectKey';
import {
  useCustomTenants,
  renameCustomTenant,
  removeCustomTenant,
  tenantApiId,
} from '@/lib/customTenants';

/**
 * Detail page for a custom tenant — a raw Neo4j tenant ID (no management-DB
 * project row) the user has connected from the Projects page. Mirrors the
 * Graph / Explore experience of ProjectDetail; management-only tabs (keys,
 * members, settings, danger zone) don't apply because there is no project.
 */
export default function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const tenants = useCustomTenants();
  const tenant = tenants.find((t) => t.tenantId === tenantId);

  const apiId = tenantApiId(tenantId ?? '');
  // For custom tenants a manually entered key (e.g. the backend's TEST_API_KEY)
  // overrides the management key, which the backend may not accept here.
  const { effectiveKey, usingMgmtKey, sessionKey, connect, disconnect } =
    useProjectKey(apiId, { preferSessionKey: true });

  const [editLabel, setEditLabel] = useState<string | null>(null);
  const [overrideKey, setOverrideKey] = useState('');

  if (!tenantId) {
    return <div className="text-red-500 text-sm">No tenant specified.</div>;
  }
  if (!tenant) {
    return (
      <div className="max-w-3xl space-y-3">
        <p className="text-sm text-gray-600">
          <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{tenantId}</code>{' '}
          is not in your list of connected tenants.
        </p>
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft size={14} /> Back to projects
        </Link>
      </div>
    );
  }

  const displayName = tenant.label || tenant.tenantId;
  const labelValue = editLabel ?? (tenant.label ?? '');
  const hasHyphen = tenant.tenantId.includes('-');

  const saveLabel = () => {
    renameCustomTenant(tenant.tenantId, labelValue);
    setEditLabel(null);
    toast.success('Label saved');
  };

  const remove = () => {
    if (!confirm(`Remove "${displayName}" from your connected tenants? No graph data is deleted.`)) return;
    removeCustomTenant(tenant.tenantId);
    toast.success('Tenant removed');
    navigate('/projects');
  };

  const applyOverride = () => {
    if (!overrideKey.trim()) return;
    connect(overrideKey.trim());
    setOverrideKey('');
    toast.success('API key set for this tenant');
  };

  const TABS = ['overview', 'graph', 'explore'] as const;
  const TAB_LABEL: Record<(typeof TABS)[number], string> = {
    overview: 'Overview',
    graph: 'Graph',
    explore: 'Explore',
  };

  const endpoints = [
    { label: 'Query', url: `${API_URL}/${apiId}/query` },
    { label: 'Graph', url: `${API_URL}/${apiId}/graph` },
    { label: 'Docs', url: `${API_URL}/${apiId}/documents` },
  ];

  const keyStatus = !effectiveKey
    ? 'No key — you will be asked for one in the Graph or Explore tab.'
    : usingMgmtKey
      ? 'Using your user key (management key).'
      : 'Using a key entered for this tenant (session only).';

  return (
    <div>
      <div className="max-w-3xl mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            <Database size={11} /> Custom tenant
          </span>
        </div>
        <p className="text-sm text-gray-400 font-mono mt-1">{tenant.tenantId}</p>
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
              )}
            >
              {tab === 'graph' && <Network size={13} />}
              {tab === 'explore' && <Compass size={13} />}
              {TAB_LABEL[tab]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="graph">
          <KGGraph apiId={apiId} preferSessionKey />
        </Tabs.Content>

        <Tabs.Content value="explore">
          <KGExplore apiId={apiId} preferSessionKey />
        </Tabs.Content>

        <Tabs.Content value="overview">
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tenant ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono text-gray-800 break-all">{tenant.tenantId}</code>
                  <CopyButton value={tenant.tenantId} />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Chunks are read from the <code className="text-xs">Chunk_{tenant.tenantId}</code> label
                  and documents whose name starts with <code className="text-xs">{tenant.tenantId}_</code>.
                </p>
              </div>

              <hr className="border-gray-100" />

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">API Endpoints</label>
                <div className="space-y-2 text-sm">
                  {endpoints.map(({ label, url }) => (
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
                  Use your API key in the <code className="text-xs">x-api-key</code> header.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-xs text-amber-800 space-y-1">
              <p className="font-medium">This tenant is not registered as a project.</p>
              <p>
                The backend only serves it when it may skip project lookup. Either run the API locally
                with <code>ALLOW_UNREGISTERED_TENANTS=true</code> and use your user key, or enter the
                backend&apos;s <code>TEST_API_KEY</code> below.
              </p>
              {hasHyphen && (
                <p>
                  This ID contains a hyphen. The <code>TEST_API_KEY</code> path rewrites hyphens to
                  underscores, so for this tenant only the <code>ALLOW_UNREGISTERED_TENANTS</code> route
                  will match the graph labels.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-semibold text-gray-800 flex items-center gap-1.5"><Key size={15} /> API key</h2>
              <p className="text-xs text-gray-500">{keyStatus}</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={overrideKey}
                  onChange={(e) => setOverrideKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyOverride()}
                  placeholder="Paste a key to use for this tenant"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={applyOverride}
                  disabled={!overrideKey.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Use key
                </button>
                {sessionKey && (
                  <button
                    onClick={() => { disconnect(); toast.success('Tenant key cleared'); }}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400">Kept in session storage and cleared when you close the tab.</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">Display label</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labelValue}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder={tenant.tenantId}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={saveLabel}
                  disabled={editLabel === null}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-gray-400">Only stored in this browser.</p>
            </div>

            <div className="bg-white rounded-xl border border-red-200 p-5 space-y-3">
              <h2 className="font-semibold text-red-700">Remove tenant</h2>
              <p className="text-sm text-gray-600">
                Removes this tenant from your connected list. Nothing is deleted from the graph database.
              </p>
              <button
                onClick={remove}
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 size={14} /> Remove from list
              </button>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
