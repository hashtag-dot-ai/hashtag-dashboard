import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as d3 from 'd3';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, Key } from 'lucide-react';
import { fetchGraph } from '@/api/graph';
import type { GraphInclude } from '@/types/api';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Visual helpers
// ---------------------------------------------------------------------------

const KNOWN_COLORS: Record<string, string> = {
  Document:     '#94a3b8',
  Person:       '#6366f1',
  Organization: '#10b981',
  Technology:   '#f59e0b',
  Concept:      '#8b5cf6',
  Location:     '#06b6d4',
  Event:        '#f97316',
  Product:      '#ec4899',
  SOURCED_FROM: '#e2e8f0', // edge colour hint (not used for nodes)
};

const PALETTE = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
];

function nodeColor(labels: string[]): string {
  for (const l of labels) {
    if (l in KNOWN_COLORS) return KNOWN_COLORS[l];
  }
  const label = labels.find(l => !l.startsWith('Chunk') && l !== 'Document') ?? labels[0] ?? '';
  let h = 0;
  for (let i = 0; i < label.length; i++) h = ((h * 31) + label.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function nodeRadius(labels: string[]): number {
  if (labels.includes('Document')) return 12;
  if (labels.some(l => l.startsWith('Chunk'))) return 5;
  return 8;
}

function nodeDisplayName(node: SimNode): string {
  const p = node.properties;
  for (const k of ['name', 'id', 'title', 'label', 'fileName']) {
    const v = p[k];
    if (v && typeof v === 'string') return v.slice(0, 28);
  }
  return node.labels[0] ?? '';
}

// ---------------------------------------------------------------------------
// Include-mode control
// ---------------------------------------------------------------------------

const INCLUDE_MODES: { value: GraphInclude; label: string; desc: string }[] = [
  { value: 'entities',      label: 'Entities',      desc: 'Entity nodes and their relationships' },
  { value: 'entities_docs', label: 'With Sources',   desc: 'Entities + source documents' },
  { value: 'full',          label: 'Full Graph',     desc: 'Entities + documents + chunks' },
];

// ---------------------------------------------------------------------------
// API-key gate
// ---------------------------------------------------------------------------

interface ApiKeyGateProps {
  tenantId: string;
  onConnect: (key: string) => void;
}

function ApiKeyGate({ tenantId, onConnect }: ApiKeyGateProps) {
  const [value, setValue] = useState('');
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
        <Key size={22} className="text-indigo-500" />
      </div>
      <div>
        <p className="font-semibold text-gray-800">Connect your API key</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">
          Enter a project API key to explore the knowledge graph.
          You can create one in the <strong>API Keys</strong> tab.
        </p>
      </div>
      <div className="flex w-full max-w-sm gap-2">
        <input
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && value && onConnect(value)}
          placeholder={`${tenantId}_sk_…`}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => value && onConnect(value)}
          disabled={!value}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Connect
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Keys are stored in session storage and cleared when you close the tab.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  tenantId: string;
}

export default function KGGraph({ tenantId }: Props) {
  const SESSION_KEY = `kg_graph_key_${tenantId}`;

  const [apiKey, setApiKey] = useState<string>(() => sessionStorage.getItem(SESSION_KEY) ?? '');
  const [include, setInclude] = useState<GraphInclude>('entities');

  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef   = useRef<HTMLDivElement>(null);
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simRef       = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  function handleConnect(key: string) {
    sessionStorage.setItem(SESSION_KEY, key);
    setApiKey(key);
  }

  function handleDisconnect() {
    sessionStorage.removeItem(SESSION_KEY);
    setApiKey('');
  }

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['graph', tenantId, include, apiKey],
    queryFn: () => fetchGraph(tenantId, { include }, apiKey),
    enabled: !!apiKey,
    staleTime: 60_000,
    retry: false, // don't retry on 401 — likely a bad key
  });

  // Derive the set of unique entity-type labels for the legend
  const legend: { label: string; color: string }[] = (() => {
    if (!data) return [];
    const seen = new Map<string, string>();
    for (const node of data.nodes) {
      const label = node.labels.find(l => !l.startsWith('Chunk')) ?? node.labels[0];
      if (label && !seen.has(label)) seen.set(label, nodeColor(node.labels));
    }
    return Array.from(seen.entries()).map(([label, color]) => ({ label, color }));
  })();

  // ---------------------------------------------------------------------------
  // D3 rendering
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    simRef.current?.stop();

    const container = containerRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // Prepare nodes & links
    const nodeMap = new Map<string, SimNode>();
    const nodes: SimNode[] = data.nodes.map(n => {
      const sn: SimNode = { id: n.element_id, labels: n.labels, properties: n.properties };
      nodeMap.set(n.element_id, sn);
      return sn;
    });
    const links: SimLink[] = data.relationships
      .filter(r => nodeMap.has(r.start_node_element_id) && nodeMap.has(r.end_node_element_id))
      .map(r => ({
        id: r.element_id,
        type: r.type,
        source: r.start_node_element_id,
        target: r.end_node_element_id,
      }));

    // SVG setup
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    svg.selectAll('*').remove();

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'kg-arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 8).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#cbd5e1')
      .attr('d', 'M0,-4L8,0L0,4');

    // Zoom
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 5])
      .on('zoom', ev => g.attr('transform', ev.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    // Links
    const linkSel = g.append('g').attr('class', 'links')
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1.2)
      .attr('marker-end', 'url(#kg-arrow)');

    // Link-type labels (only when sparse)
    const showLinkLabels = links.length <= 200;
    const linkLabelSel = g.append('g').attr('class', 'link-labels')
      .selectAll<SVGTextElement, SimLink>('text')
      .data(showLinkLabels ? links : [])
      .join('text')
      .attr('font-size', '7px')
      .attr('fill', '#94a3b8')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('pointer-events', 'none')
      .text(d => d.type);

    // Node groups
    const showNodeLabels = nodes.length <= 200;
    const nodeSel = g.append('g').attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab');

    nodeSel.append('circle')
      .attr('r', d => nodeRadius(d.labels))
      .attr('fill', d => nodeColor(d.labels))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    if (showNodeLabels) {
      nodeSel.append('text')
        .attr('font-size', '8px')
        .attr('fill', '#475569')
        .attr('text-anchor', 'middle')
        .attr('dy', d => nodeRadius(d.labels) + 9)
        .style('pointer-events', 'none')
        .text(d => nodeDisplayName(d));
    }

    // Simulation
    const sim = d3.forceSimulation<SimNode>(nodes)
      .force('link',
        d3.forceLink<SimNode, SimLink>(links)
          .id(d => d.id)
          .distance(d => {
            const src = d.source as SimNode;
            const tgt = d.target as SimNode;
            const isDocEdge =
              src.labels.includes('Document') || tgt.labels.includes('Document') ||
              src.labels.some(l => l.startsWith('Chunk')) || tgt.labels.some(l => l.startsWith('Chunk'));
            return isDocEdge ? 120 : 80;
          }),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-250))
      .force('center', d3.forceCenter<SimNode>(W / 2, H / 2))
      .force('collide', d3.forceCollide<SimNode>().radius(d => nodeRadius(d.labels) + 6));

    simRef.current = sim;

    sim.on('tick', () => {
      linkSel
        .attr('x1', d => {
          const s = d.source as SimNode, t = d.target as SimNode;
          const dx = (t.x ?? 0) - (s.x ?? 0), dy = (t.y ?? 0) - (s.y ?? 0);
          const len = Math.hypot(dx, dy) || 1;
          return (s.x ?? 0) + dx / len * nodeRadius(s.labels);
        })
        .attr('y1', d => {
          const s = d.source as SimNode, t = d.target as SimNode;
          const dx = (t.x ?? 0) - (s.x ?? 0), dy = (t.y ?? 0) - (s.y ?? 0);
          const len = Math.hypot(dx, dy) || 1;
          return (s.y ?? 0) + dy / len * nodeRadius(s.labels);
        })
        .attr('x2', d => {
          const s = d.source as SimNode, t = d.target as SimNode;
          const dx = (t.x ?? 0) - (s.x ?? 0), dy = (t.y ?? 0) - (s.y ?? 0);
          const len = Math.hypot(dx, dy) || 1;
          return (t.x ?? 0) - dx / len * (nodeRadius(t.labels) + 7);
        })
        .attr('y2', d => {
          const s = d.source as SimNode, t = d.target as SimNode;
          const dx = (t.x ?? 0) - (s.x ?? 0), dy = (t.y ?? 0) - (s.y ?? 0);
          const len = Math.hypot(dx, dy) || 1;
          return (t.y ?? 0) - dy / len * (nodeRadius(t.labels) + 7);
        });

      linkLabelSel
        .attr('x', d => (((d.source as SimNode).x ?? 0) + ((d.target as SimNode).x ?? 0)) / 2)
        .attr('y', d => (((d.source as SimNode).y ?? 0) + ((d.target as SimNode).y ?? 0)) / 2);

      nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Drag
    const drag = d3.drag<SVGGElement, SimNode>()
      .on('start', (ev, d) => {
        if (!ev.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on('end', (ev, d) => {
        if (!ev.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
    nodeSel.call(drag);

    // Tooltip (D3-owned div, avoids React re-renders)
    const tip = tooltipRef.current;
    nodeSel
      .on('mouseover', (ev, d) => {
        if (!tip) return;
        const rect = container.getBoundingClientRect();
        tip.style.display = 'block';
        tip.style.left = `${ev.clientX - rect.left + 14}px`;
        tip.style.top  = `${ev.clientY - rect.top  - 14}px`;
        const props = Object.entries(d.properties)
          .filter(([k]) => k !== 'embedding' && k !== 'text')
          .slice(0, 10);
        tip.innerHTML = `
          <div class="font-semibold text-xs mb-1 text-gray-800">${d.labels.join(' · ')}</div>
          ${props.map(([k, v]) =>
            `<div class="text-xs text-gray-500 truncate"><span class="text-gray-400">${k}:</span> ${String(v).slice(0, 60)}</div>`
          ).join('')}
        `;
      })
      .on('mousemove', ev => {
        if (!tip) return;
        const rect = container.getBoundingClientRect();
        tip.style.left = `${ev.clientX - rect.left + 14}px`;
        tip.style.top  = `${ev.clientY - rect.top  - 14}px`;
      })
      .on('mouseout', () => {
        if (tip) tip.style.display = 'none';
      });

    // Reset zoom to fit all nodes once simulation cools
    sim.on('end', () => {
      // No-op: user has zoom/pan controls
    });

    return () => { sim.stop(); };
  }, [data]);

  // Zoom helpers for buttons
  function zoomBy(factor: number) {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select<SVGSVGElement, unknown>(svgRef.current)
      .transition().duration(250)
      .call(zoomRef.current.scaleBy, factor);
  }
  function zoomReset() {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select<SVGSVGElement, unknown>(svgRef.current)
      .transition().duration(300)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!apiKey) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white" style={{ height: '520px' }}>
        <ApiKeyGate tenantId={tenantId} onConnect={handleConnect} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Include mode segmented control */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
          {INCLUDE_MODES.map(m => (
            <button
              key={m.value}
              onClick={() => setInclude(m.value)}
              title={m.desc}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-0',
                include === m.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {data && (
          <span className="text-xs text-gray-400">
            {data.nodes.length} nodes · {data.relationships.length} edges
            {data.nodes.length >= 500 && (
              <span className="ml-1 text-amber-500">(limit reached — use document filter to narrow)</span>
            )}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex gap-1">
          <button
            onClick={() => zoomBy(1.4)}
            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => zoomBy(1 / 1.4)}
            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={zoomReset}
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

        <button
          onClick={handleDisconnect}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          title="Clear API key"
        >
          Disconnect
        </button>
      </div>

      {/* Graph canvas */}
      <div
        ref={containerRef}
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

        {/* Fetching indicator (subsequent loads) */}
        {isFetching && !isLoading && (
          <div className="absolute top-3 right-3 z-10">
            <RefreshCw size={13} className="animate-spin text-indigo-400" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <p className="text-sm text-red-500">{(error as Error).message}</p>
            {(error as Error).message.includes('401') || (error as Error).message.includes('Invalid') ? (
              <button onClick={handleDisconnect} className="text-xs text-indigo-500 hover:underline">
                Re-enter API key
              </button>
            ) : (
              <button onClick={() => refetch()} className="text-xs text-indigo-500 hover:underline">
                Retry
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && data?.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-gray-500 text-sm font-medium">No nodes found</p>
            <p className="text-gray-400 text-xs max-w-xs">
              Process some documents for this project first, then refresh the graph.
            </p>
          </div>
        )}

        <svg ref={svgRef} width="100%" height="100%" />

        {/* Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute hidden pointer-events-none z-20 bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 max-w-xs"
          style={{ display: 'none' }}
        />
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
