/**
 * KGGraph — graph visualisation orchestrator.
 *
 * Fetches graph data, pre-adapts it for every available engine via useMemo,
 * then delegates rendering to the selected engine component. Zoom/pan controls
 * are forwarded to the active renderer through a shared GraphRendererHandle ref.
 */
import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { fetchGraph } from '@/api/graph';
import type { GraphInclude } from '@/types/api';
import { cn } from '@/lib/utils';
import { nodeColor } from '@/lib/graph/colors';
import { adaptToD3 } from '@/lib/graph/adapters/d3';
import { adaptToCytoscape } from '@/lib/graph/adapters/cytoscape';
import type { GraphRendererHandle } from '@/lib/graph/types';
import D3Renderer from '@/lib/graph/engines/D3Renderer';
import CytoscapeRenderer from '@/lib/graph/engines/CytoscapeRenderer';
import { useUser } from '@/context/UserContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INCLUDE_MODES: { value: GraphInclude; label: string; desc: string }[] = [
  { value: 'entities',      label: 'Entities',     desc: 'Entity nodes and their relationships' },
  { value: 'entities_docs', label: 'With Sources', desc: 'Entities + source documents' },
  { value: 'full',          label: 'Full Graph',   desc: 'Entities + documents + chunks' },
];

type Engine = 'd3' | 'cytoscape';

const ENGINE_LABELS: { value: Engine; label: string }[] = [
  { value: 'd3',        label: 'D3 Force' },
  { value: 'cytoscape', label: 'Cytoscape' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  tenantId: string;
}

export default function KGGraph({ tenantId }: Props) {
  const { user } = useUser();
  const accountKey = user?.account_key ?? null;

  const [include, setInclude] = useState<GraphInclude>('entities');
  const [engine,  setEngine]  = useState<Engine>('d3');

  const rendererRef = useRef<GraphRendererHandle>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['graph', tenantId, include, accountKey],
    queryFn:  () => fetchGraph(tenantId, { include }, accountKey!),
    enabled:  !!accountKey,
    staleTime: 60_000,
    retry: false,
  });

  const d3Data   = useMemo(() => data ? adaptToD3(data)         : null, [data]);
  const cyData   = useMemo(() => data ? adaptToCytoscape(data)  : null, [data]);

  const legend = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, string>();
    for (const node of data.nodes) {
      const label = node.labels.find(l => !l.startsWith('Chunk')) ?? node.labels[0];
      if (label && !seen.has(label)) seen.set(label, nodeColor(node.labels));
    }
    return Array.from(seen.entries()).map(([label, color]) => ({ label, color }));
  }, [data]);

  if (!accountKey) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white flex items-center justify-center" style={{ height: '520px' }}>
        <p className="text-sm text-gray-400">Account key not available. Try rotating your key from the Dashboard.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-3">
      {/* Controls bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Include-mode */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
          {INCLUDE_MODES.map(m => (
            <button
              key={m.value}
              onClick={() => setInclude(m.value)}
              title={m.desc}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-0',
                include === m.value ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Engine switcher */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
          {ENGINE_LABELS.map(e => (
            <button
              key={e.value}
              onClick={() => setEngine(e.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-0',
                engine === e.value ? 'bg-slate-700 text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {data && (
          <span className="text-xs text-gray-400">
            {data.nodes.length} nodes · {data.relationships.length} edges
            {data.nodes.length >= 500 && (
              <span className="ml-1 text-amber-500">(limit reached)</span>
            )}
          </span>
        )}

        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex gap-1">
          <button
            onClick={() => rendererRef.current?.zoomIn()}
            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => rendererRef.current?.zoomOut()}
            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => rendererRef.current?.zoomReset()}
            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
            title="Reset zoom"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          title="Refresh graph"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Graph canvas */}
      <div
        className="relative border border-gray-200 rounded-xl bg-white overflow-hidden"
        style={{ height: '560px' }}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <RefreshCw size={15} className="animate-spin" />
              Loading graph…
            </div>
          </div>
        )}

        {/* Subsequent-fetch spinner */}
        {isFetching && !isLoading && (
          <div className="absolute top-3 right-3 z-10">
            <RefreshCw size={13} className="animate-spin text-indigo-400" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <p className="text-sm text-red-500">{(error as Error).message}</p>
            <button onClick={() => refetch()} className="text-xs text-indigo-500 hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && data?.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center z-10">
            <p className="text-gray-500 text-sm font-medium">No nodes found</p>
            <p className="text-gray-400 text-xs max-w-xs">
              Process some documents for this project first, then refresh the graph.
            </p>
          </div>
        )}

        {/* Active renderer — only mounted when data is ready */}
        {d3Data && engine === 'd3' && (
          <D3Renderer ref={rendererRef} data={d3Data} />
        )}
        {cyData && engine === 'cytoscape' && (
          <CytoscapeRenderer ref={rendererRef} elements={cyData} />
        )}
      </div>

      {/* Legend */}
      {legend.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
          {legend.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
