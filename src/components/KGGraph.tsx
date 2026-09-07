/**
 * KGGraph — graph visualisation orchestrator with document ingestion and API log.
 */
import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, Upload, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { fetchGraph } from '@/api/graph';
import { API_URL } from '@/config';
import type { GraphInclude } from '@/types/api';
import { cn } from '@/lib/utils';
import { nodeColor } from '@/lib/graph/colors';
import { adaptToD3 } from '@/lib/graph/adapters/d3';
import { adaptToCytoscape } from '@/lib/graph/adapters/cytoscape';
import type { GraphRendererHandle } from '@/lib/graph/types';
import D3Renderer from '@/lib/graph/engines/D3Renderer';
import CytoscapeRenderer from '@/lib/graph/engines/CytoscapeRenderer';
import ApiKeyGate from '@/components/ApiKeyGate';
import { useProjectKey } from '@/hooks/useProjectKey';

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

type InputMode = 'url' | 'text' | 'pdf';

// ---------------------------------------------------------------------------
// API log
// ---------------------------------------------------------------------------

interface LogEntry {
  id: number;
  method: string;
  endpoint: string;
  requestSummary: string;
  status: number | null;
  responseSummary: string | null;
  timestamp: Date;
  expanded: boolean;
}

let _logIdCounter = 0;
const LOG_TRUNCATE = 200;

function truncate(s: string): { short: string; isTruncated: boolean } {
  if (s.length <= LOG_TRUNCATE) return { short: s, isTruncated: false };
  return { short: s.slice(0, LOG_TRUNCATE), isTruncated: true };
}

function LogRow({ entry, onToggle }: { entry: LogEntry; onToggle: () => void }) {
  const req = truncate(entry.requestSummary);
  const res = entry.responseSummary ? truncate(entry.responseSummary) : null;
  const statusColor = entry.status == null ? 'text-gray-400'
    : entry.status < 300 ? 'text-green-600'
    : entry.status < 500 ? 'text-amber-600'
    : 'text-red-600';

  return (
    <div className="text-xs font-mono border-b border-gray-100 py-2 last:border-0">
      <div className="flex items-start gap-2">
        <span className="text-gray-400 shrink-0">{entry.timestamp.toLocaleTimeString()}</span>
        <span className="font-semibold text-gray-600 shrink-0">{entry.method}</span>
        <span className="text-gray-700 break-all flex-1">{entry.endpoint}</span>
        <span className={cn('shrink-0 font-semibold', statusColor)}>
          {entry.status ?? '…'}
        </span>
        {(req.isTruncated || (res && res.isTruncated)) && (
          <button onClick={onToggle} className="shrink-0 text-gray-400 hover:text-gray-600">
            {entry.expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      <div className="mt-1 pl-20 text-gray-500 break-all">
        <span className="text-gray-400">req: </span>
        {entry.expanded ? entry.requestSummary : req.short}
        {!entry.expanded && req.isTruncated && <span className="text-gray-400">…</span>}
      </div>
      {entry.responseSummary && (
        <div className="mt-0.5 pl-20 text-gray-500 break-all">
          <span className="text-gray-400">res: </span>
          {entry.expanded ? entry.responseSummary : (res?.short ?? '')}
          {!entry.expanded && res?.isTruncated && <span className="text-gray-400">…</span>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  apiId: string;
}

export default function KGGraph({ apiId }: Props) {
  // management_key auto-connects; sessionStorage key is the manual fallback
  const { effectiveKey, usingMgmtKey, connect: handleConnect, disconnect: handleDisconnect } = useProjectKey(apiId);

  const [include, setInclude] = useState<GraphInclude>('entities');
  const [engine,  setEngine]  = useState<Engine>('d3');

  const rendererRef  = useRef<GraphRendererHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingest form state
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [urlInput,  setUrlInput]  = useState('');
  const [textInput, setTextInput] = useState('');
  const [fileName,  setFileName]  = useState('');
  const [fileData,  setFileData]  = useState('');
  const [ingesting, setIngesting] = useState(false);

  // API call log
  const [log, setLog] = useState<LogEntry[]>([]);

  const addLog = (partial: Omit<LogEntry, 'id' | 'expanded'>): number => {
    const entry: LogEntry = { ...partial, id: ++_logIdCounter, expanded: false };
    setLog(prev => [entry, ...prev].slice(0, 50));
    return entry.id;
  };
  const updateLog = (id: number, updates: Partial<LogEntry>) =>
    setLog(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  const toggleLog = (id: number) =>
    setLog(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFileData(ev.target?.result as string ?? '');
    reader.readAsDataURL(file);
  };

  const handleIngest = async () => {
    if (!effectiveKey) return;
    let type: string;
    let url: string;
    if (inputMode === 'text') {
      if (!textInput.trim()) return;
      type = 'text'; url = textInput.trim();
    } else if (inputMode === 'url') {
      if (!urlInput.trim()) return;
      type = 'web_url'; url = urlInput.trim();
    } else {
      if (!fileData) return;
      type = 'pdf'; url = fileData;
    }

    const endpoint = `${API_URL}/${apiId}/process`;
    const requestBody = JSON.stringify({ type, url });
    const id = addLog({
      method: 'POST',
      endpoint: `/${apiId}/process`,
      requestSummary: requestBody,
      status: null,
      responseSummary: null,
      timestamp: new Date(),
    });

    setIngesting(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': effectiveKey },
        body: requestBody,
      });
      const body = await res.json().catch(() => ({}));
      updateLog(id, { status: res.status, responseSummary: JSON.stringify(body) });
      if (res.ok) {
        if (inputMode === 'text') setTextInput('');
        else if (inputMode === 'url') setUrlInput('');
        else { setFileData(''); setFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; }
        refetch();
      }
    } catch (err) {
      updateLog(id, { status: 0, responseSummary: String(err) });
    } finally {
      setIngesting(false);
    }
  };

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['graph', apiId, include, effectiveKey],
    queryFn:  () => fetchGraph(apiId, { include }, effectiveKey!),
    enabled:  !!effectiveKey,
    staleTime: 60_000,
    retry: false,
  });

  const d3Data = useMemo(() => data ? adaptToD3(data)        : null, [data]);
  const cyData = useMemo(() => data ? adaptToCytoscape(data) : null, [data]);

  const legend = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, string>();
    for (const node of data.nodes) {
      const label = node.labels.find(l => !l.startsWith('Chunk')) ?? node.labels[0];
      if (label && !seen.has(label)) seen.set(label, nodeColor(node.labels));
    }
    return Array.from(seen.entries()).map(([label, color]) => ({ label, color }));
  }, [data]);

  // ---------------------------------------------------------------------------
  // Gate: no key available
  // ---------------------------------------------------------------------------
  if (!effectiveKey) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white" style={{ height: '520px' }}>
        <ApiKeyGate tenantId={apiId} onConnect={handleConnect} />
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

        {/* Only show Disconnect when using a manually-entered session key */}
        {!usingMgmtKey && (
          <button
            onClick={handleDisconnect}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            title="Clear API key"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Graph canvas */}
      <div
        className="relative border border-gray-200 rounded-xl bg-white overflow-hidden"
        style={{ height: '480px' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <RefreshCw size={15} className="animate-spin" />
              Loading graph…
            </div>
          </div>
        )}

        {isFetching && !isLoading && (
          <div className="absolute top-3 right-3 z-10">
            <RefreshCw size={13} className="animate-spin text-indigo-400" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <p className="text-sm text-red-500">{(error as Error).message}</p>
            {!usingMgmtKey && ((error as Error).message.includes('401') || (error as Error).message.includes('Invalid')) ? (
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

        {!isLoading && !error && data?.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center z-10">
            <p className="text-gray-500 text-sm font-medium">No nodes found</p>
            <p className="text-gray-400 text-xs max-w-xs">
              Use the input below to add content, then refresh the graph.
            </p>
          </div>
        )}

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

      {/* Ingest panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Add to graph</h3>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['url', 'text', 'pdf'] as InputMode[]).map(m => (
              <button
                key={m}
                onClick={() => setInputMode(m)}
                className={cn(
                  'px-3 py-1 text-xs font-medium transition-colors border-r border-gray-200 last:border-0',
                  inputMode === m ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {inputMode === 'url' && (
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleIngest()}
            placeholder="https://example.com/article"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}

        {inputMode === 'text' && (
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            rows={4}
            placeholder="Paste text to add to the knowledge graph…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        )}

        {inputMode === 'pdf' && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={20} className="mx-auto mb-2 text-gray-400" />
            {fileName ? (
              <p className="text-sm text-gray-700 font-medium">{fileName}</p>
            ) : (
              <p className="text-sm text-gray-400">Click to upload a PDF</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        <button
          onClick={handleIngest}
          disabled={
            ingesting ||
            (inputMode === 'url' && !urlInput.trim()) ||
            (inputMode === 'text' && !textInput.trim()) ||
            (inputMode === 'pdf' && !fileData)
          }
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {ingesting ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
          {ingesting ? 'Processing…' : 'Add to graph'}
        </button>
      </div>

      {/* API call log */}
      {log.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">API Log</h3>
            <button
              onClick={() => setLog([])}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>
          {log.map(entry => (
            <LogRow key={entry.id} entry={entry} onToggle={() => toggleLog(entry.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
