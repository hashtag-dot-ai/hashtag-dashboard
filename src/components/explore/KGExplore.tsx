/**
 * KGExplore — "Explore" tab: browse documents, chunks, and concepts alongside
 * a graph of everything connected to the current selection.
 *
 * Left: document picker + detail pane (document chunks / chunk text / concept
 * info) + linked concepts. Right: subgraph for the selection. Clicking graph
 * nodes, concept chips, or listed documents/chunks re-focuses the exploration.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw, ZoomIn, ZoomOut, Maximize2, Search, FileText, ArrowLeft, Network, Waypoints,
} from 'lucide-react';
import { fetchGraph, fetchDocuments, fetchDocumentChunks, fetchChunkGraph, fetchConceptGraph } from '@/api/graph';
import type { ChunkItem, DocumentSummary, GraphNode, GraphResponse } from '@/types/api';
import { cn } from '@/lib/utils';
import { nodeColor, nodeDisplayName } from '@/lib/graph/colors';
import { adaptToD3, type D3Node } from '@/lib/graph/adapters/d3';
import type { GraphRendererHandle } from '@/lib/graph/types';
import D3Renderer from '@/lib/graph/engines/D3Renderer';
import ApiKeyGate from '@/components/ApiKeyGate';
import { useProjectKey } from '@/hooks/useProjectKey';
import MarkdownBlock from './MarkdownBlock';
import { docDisplayName, overlapCharCount, isChunkNode, isConceptNode, isDocumentNode } from './helpers';

type Selection =
  | { kind: 'document'; docId: string }
  | { kind: 'chunk'; chunkId: string; docId: string }
  | { kind: 'concept'; elementId: string };

const DETAIL_TITLE: Record<Selection['kind'], string> = {
  document: 'Document',
  chunk: 'Chunk',
  concept: 'Concept',
};

// ---------------------------------------------------------------------------
// Document picker
// ---------------------------------------------------------------------------

function DocumentPicker({ docs, isLoading, selectedDocId, search, onSearch, onSelect }: {
  docs: DocumentSummary[];
  isLoading: boolean;
  selectedDocId: string | null;
  search: string;
  onSearch: (s: string) => void;
  onSelect: (docId: string) => void;
}) {
  const filtered = docs.filter(d => docDisplayName(d.id).toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search documents…"
          className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="max-h-44 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map(i => <div key={i} className="h-7 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {docs.length === 0 ? 'No documents ingested yet.' : 'No documents match your search.'}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map(d => (
              <li key={d.id}>
                <button
                  onClick={() => onSelect(d.id)}
                  title={d.id}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors',
                    d.id === selectedDocId
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <FileText size={13} className="shrink-0 text-gray-400" />
                  <span className="truncate font-mono text-xs">{docDisplayName(d.id)}</span>
                  {d.total_chunks != null && (
                    <span className="ml-auto shrink-0 text-[10px] text-gray-400">{d.total_chunks} chunks</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chunk rendering (stacked, with overlap dimming)
// ---------------------------------------------------------------------------

function ChunkCard({ chunk, prevText, onExploreGraph }: {
  chunk: ChunkItem;
  prevText?: string | null;
  onExploreGraph?: () => void;
}) {
  const text = chunk.text ?? '';
  const overlap = prevText ? overlapCharCount(prevText, text) : 0;
  const head = overlap > 0 ? text.slice(0, overlap) : '';
  const body = overlap > 0 ? text.slice(overlap) : text;
  return (
    <div className="pl-3 border-l-2 border-indigo-100">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-400 mb-1">
        <span className="font-semibold text-gray-500">Chunk {chunk.position}</span>
        {chunk.page_number != null && <span>· page {chunk.page_number}</span>}
        {chunk.element_type === 'table' && <span>· table</span>}
        {overlap > 0 && (
          <span
            className="text-amber-500/90 normal-case"
            title="The dimmed text repeats the end of the previous chunk — chunks are created with a sliding-window overlap."
          >
            · overlaps previous
          </span>
        )}
        {onExploreGraph && (
          <button
            onClick={onExploreGraph}
            className="ml-auto flex items-center gap-1 normal-case text-[10px] text-indigo-400 hover:text-indigo-600 transition-colors"
            title="Explore the graph for this chunk"
          >
            <Waypoints size={11} /> Graph
          </button>
        )}
      </div>
      {overlap > 0 && (
        <div
          className="text-xs text-gray-400 whitespace-pre-wrap break-words opacity-70 mb-1"
          title="Repeated from the end of the previous chunk (chunking overlap)."
        >
          {head}
        </div>
      )}
      <MarkdownBlock text={body} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function KGExplore({ apiId }: { apiId: string }) {
  const { effectiveKey, usingMgmtKey, connect, disconnect } = useProjectKey(apiId);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [search, setSearch] = useState('');
  const [showChunksInGraph, setShowChunksInGraph] = useState(false);
  const [showDocsInGraph, setShowDocsInGraph] = useState(true);
  const rendererRef = useRef<GraphRendererHandle>(null);

  const docsQuery = useQuery({
    queryKey: ['explore-docs', apiId, effectiveKey],
    queryFn: () => fetchDocuments(apiId, effectiveKey!),
    enabled: !!effectiveKey,
    staleTime: 60_000,
    retry: false,
  });

  const docs = useMemo(() => {
    const list = [...(docsQuery.data?.documents ?? [])];
    list.sort((a, b) => docDisplayName(a.id).localeCompare(docDisplayName(b.id)));
    return list;
  }, [docsQuery.data]);

  // Auto-select the first document once the list loads.
  useEffect(() => {
    if (!selection && docs.length > 0) {
      setSelection({ kind: 'document', docId: docs[0].id });
    }
  }, [docs, selection]);

  const activeDocId = selection?.kind === 'document' ? selection.docId : null;

  const chunksQuery = useQuery({
    queryKey: ['explore-chunks', apiId, activeDocId, effectiveKey],
    queryFn: () => fetchDocumentChunks(apiId, activeDocId!, effectiveKey!),
    enabled: !!effectiveKey && !!activeDocId,
    staleTime: 60_000,
    retry: false,
  });

  const selectionKey = !selection ? 'none'
    : selection.kind === 'document' ? `doc:${selection.docId}:${showChunksInGraph}`
    : selection.kind === 'chunk' ? `chunk:${selection.chunkId}`
    : `concept:${selection.elementId}`;

  const graphQuery = useQuery<GraphResponse>({
    queryKey: ['explore-graph', apiId, selectionKey, effectiveKey],
    queryFn: () => {
      if (selection!.kind === 'document') {
        return fetchGraph(apiId, {
          include: showChunksInGraph ? 'full' : 'entities_docs',
          doc_names: [selection!.docId],
          limit: 2000,
        }, effectiveKey!);
      }
      if (selection!.kind === 'chunk') return fetchChunkGraph(apiId, selection!.chunkId, effectiveKey!);
      return fetchConceptGraph(apiId, selection!.elementId, effectiveKey!);
    },
    enabled: !!effectiveKey && !!selection,
    staleTime: 60_000,
    retry: false,
  });

  const graphData = graphQuery.data;

  // Graph as displayed: optionally strip Document nodes (and their edges).
  // Detail panes keep using the unfiltered response so document links still work.
  const displayGraph = useMemo(() => {
    if (!graphData || showDocsInGraph) return graphData ?? null;
    const docIds = new Set(graphData.nodes.filter(isDocumentNode).map(n => n.element_id));
    return {
      nodes: graphData.nodes.filter(n => !docIds.has(n.element_id)),
      relationships: graphData.relationships.filter(
        r => !docIds.has(r.start_node_element_id) && !docIds.has(r.end_node_element_id),
      ),
    };
  }, [graphData, showDocsInGraph]);

  const d3Data = useMemo(() => displayGraph ? adaptToD3(displayGraph) : null, [displayGraph]);

  const concepts = useMemo(() => {
    if (!graphData) return [];
    const selfId = selection?.kind === 'concept' ? selection.elementId : null;
    return graphData.nodes
      .filter(n => isConceptNode(n) && n.element_id !== selfId)
      .sort((a, b) => nodeDisplayName(a.labels, a.properties).localeCompare(nodeDisplayName(b.labels, b.properties)));
  }, [graphData, selection]);

  const legend = useMemo(() => {
    if (!displayGraph) return [];
    const seen = new Map<string, string>();
    for (const node of displayGraph.nodes) {
      const label = node.labels.find(l => !l.startsWith('Chunk')) ?? node.labels[0];
      if (label && !seen.has(label)) seen.set(label, nodeColor(node.labels));
    }
    return Array.from(seen.entries()).map(([label, color]) => ({ label, color }));
  }, [displayGraph]);

  function selectChunkNode(node: GraphNode) {
    const chunkId = node.properties.id as string | undefined;
    const docId = (node.properties.fileName as string | undefined) ?? '';
    if (chunkId) setSelection({ kind: 'chunk', chunkId, docId });
  }

  function handleNodeClick(node: D3Node) {
    const asGraphNode: GraphNode = { element_id: node.id, labels: node.labels, properties: node.properties };
    if (isDocumentNode(asGraphNode)) {
      const docId = node.properties.fileName as string | undefined;
      if (docId) setSelection({ kind: 'document', docId });
    } else if (isChunkNode(asGraphNode)) {
      selectChunkNode(asGraphNode);
    } else {
      setSelection({ kind: 'concept', elementId: node.id });
    }
  }

  // -------------------------------------------------------------------------
  // Gate: no key available
  // -------------------------------------------------------------------------
  if (!effectiveKey) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white" style={{ height: '520px' }}>
        <ApiKeyGate tenantId={apiId} onConnect={connect} />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Detail pane content per selection kind
  // -------------------------------------------------------------------------

  function renderDocumentDetail(docId: string) {
    const chunks = chunksQuery.data?.chunks ?? [];
    return (
      <>
        {chunksQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : chunksQuery.error ? (
          <p className="text-sm text-red-500">{(chunksQuery.error as Error).message}</p>
        ) : chunks.length === 0 ? (
          <p className="text-sm text-gray-400">No chunks found for this document.</p>
        ) : (
          <div className="space-y-4">
            {chunks.map((c, i) => (
              <ChunkCard
                key={c.id ?? i}
                chunk={c}
                prevText={i > 0 ? chunks[i - 1].text : null}
                onExploreGraph={c.id ? () => setSelection({ kind: 'chunk', chunkId: c.id!, docId }) : undefined}
              />
            ))}
          </div>
        )}
      </>
    );
  }

  function renderChunkDetail(sel: Extract<Selection, { kind: 'chunk' }>) {
    const chunkNode = graphData?.nodes.find(isChunkNode);
    const docNode = graphData?.nodes.find(isDocumentNode);
    const docId = sel.docId || ((docNode?.properties.fileName as string | undefined) ?? '');
    const text = (chunkNode?.properties.text as string | undefined) ?? '';
    const position = chunkNode?.properties.position as number | undefined;
    return (
      <div className="space-y-3">
        {docId && (
          <button
            onClick={() => setSelection({ kind: 'document', docId })}
            className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            <ArrowLeft size={12} />
            Back to document <span className="font-mono">{docDisplayName(docId)}</span>
          </button>
        )}
        {graphQuery.isLoading ? (
          <div className="h-24 bg-gray-100 rounded animate-pulse" />
        ) : !chunkNode ? (
          <p className="text-sm text-gray-400">Chunk not found.</p>
        ) : (
          <div className="pl-3 border-l-2 border-indigo-100">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
              <span className="font-semibold text-gray-500">Chunk {position}</span>
              {chunkNode.properties.page_number != null && <span> · page {String(chunkNode.properties.page_number)}</span>}
            </div>
            <MarkdownBlock text={text} />
          </div>
        )}
      </div>
    );
  }

  function renderConceptDetail(sel: Extract<Selection, { kind: 'concept' }>) {
    const conceptNode = graphData?.nodes.find(n => n.element_id === sel.elementId);
    const linkedDocs = (graphData?.nodes ?? []).filter(isDocumentNode);
    const linkedChunks = (graphData?.nodes ?? [])
      .filter(isChunkNode)
      .sort((a, b) =>
        String(a.properties.fileName ?? '').localeCompare(String(b.properties.fileName ?? '')) ||
        Number(a.properties.position ?? 0) - Number(b.properties.position ?? 0));

    if (graphQuery.isLoading) return <div className="h-24 bg-gray-100 rounded animate-pulse" />;
    if (!conceptNode) return <p className="text-sm text-gray-400">Concept not found.</p>;

    const props = Object.entries(conceptNode.properties)
      .filter(([k]) => !['embedding', 'tenant_id'].includes(k))
      .slice(0, 12);

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: nodeColor(conceptNode.labels) }}
            />
            <h3 className="font-semibold text-gray-800 text-sm">
              {nodeDisplayName(conceptNode.labels, conceptNode.properties)}
            </h3>
            {conceptNode.labels.map(l => (
              <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{l}</span>
            ))}
          </div>
          <dl className="text-xs space-y-0.5">
            {props.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-gray-400 shrink-0">{k}:</dt>
                <dd className="text-gray-600 break-all">{String(v).slice(0, 200)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">
            Mentioned in documents
          </h4>
          {linkedDocs.length === 0 ? (
            <p className="text-xs text-gray-400">No linked documents.</p>
          ) : (
            <ul className="space-y-0.5">
              {linkedDocs.map(d => {
                const docId = d.properties.fileName as string | undefined;
                return (
                  <li key={d.element_id}>
                    <button
                      onClick={() => docId && setSelection({ kind: 'document', docId })}
                      title={docId}
                      className="flex items-center gap-1.5 text-xs font-mono text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                    >
                      <FileText size={11} className="shrink-0 text-gray-400" />
                      {docId ? docDisplayName(docId) : d.element_id}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">
            Mentioned in chunks
          </h4>
          {linkedChunks.length === 0 ? (
            <p className="text-xs text-gray-400">No linked chunks.</p>
          ) : (
            <div className="space-y-2">
              {linkedChunks.map(c => (
                <button
                  key={c.element_id}
                  onClick={() => selectChunkNode(c)}
                  className="block w-full text-left border border-gray-100 hover:border-indigo-200 rounded-lg px-2.5 py-1.5 transition-colors"
                  title="Open this chunk"
                >
                  <span className="block text-[10px] text-gray-400 mb-0.5">
                    {String(c.properties.fileName ? docDisplayName(String(c.properties.fileName)) : '')} · chunk {String(c.properties.position ?? '?')}
                  </span>
                  <span className="block text-xs text-gray-600 line-clamp-2">
                    {String(c.properties.text ?? '').slice(0, 220)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const detailTitle = selection ? DETAIL_TITLE[selection.kind] : 'Details';
  const detailSubtitle =
    selection?.kind === 'document' ? docDisplayName(selection.docId) :
    selection?.kind === 'chunk' ? (selection.docId ? docDisplayName(selection.docId) : '') :
    '';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      {/* Left column: documents + detail + linked concepts */}
      <div className="space-y-3 min-w-0">
        <DocumentPicker
          docs={docs}
          isLoading={docsQuery.isLoading}
          selectedDocId={selection?.kind === 'document' ? selection.docId : selection?.kind === 'chunk' ? selection.docId : null}
          search={search}
          onSearch={setSearch}
          onSelect={docId => setSelection({ kind: 'document', docId })}
        />
        {docsQuery.error && (
          <p className="text-sm text-red-500">{(docsQuery.error as Error).message}</p>
        )}

        {/* Detail pane */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-baseline gap-2 mb-3 border-b border-gray-100 pb-2">
            <h2 className="text-sm font-semibold text-gray-700">{detailTitle}</h2>
            {detailSubtitle && (
              <span className="text-xs font-mono text-gray-400 truncate">{detailSubtitle}</span>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto pr-1">
            {!selection ? (
              <p className="text-sm text-gray-400">Select a document to start exploring.</p>
            ) : selection.kind === 'document' ? (
              renderDocumentDetail(selection.docId)
            ) : selection.kind === 'chunk' ? (
              renderChunkDetail(selection)
            ) : (
              renderConceptDetail(selection)
            )}
          </div>
        </div>

        {/* Linked concepts */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            {selection?.kind === 'concept' ? 'Related concepts' : 'Linked concepts'}
          </h2>
          {graphQuery.isLoading ? (
            <div className="h-8 bg-gray-100 rounded animate-pulse" />
          ) : concepts.length === 0 ? (
            <p className="text-xs text-gray-400">No linked concepts.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {concepts.map(n => (
                <button
                  key={n.element_id}
                  onClick={() => setSelection({ kind: 'concept', elementId: n.element_id })}
                  className="flex items-center gap-1.5 text-xs border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-full px-2.5 py-1 text-gray-600 transition-colors"
                  title={n.labels.join(' · ')}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: nodeColor(n.labels) }}
                  />
                  {nodeDisplayName(n.labels, n.properties)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right column: graph pane */}
      <div className="space-y-2 lg:sticky lg:top-4 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <Network size={13} /> Connected graph
          </span>
          {displayGraph && (
            <span className="text-xs text-gray-400">
              {displayGraph.nodes.length} nodes · {displayGraph.relationships.length} edges
            </span>
          )}
          <div className="flex-1" />
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDocsInGraph}
              onChange={e => setShowDocsInGraph(e.target.checked)}
              className="accent-indigo-600"
            />
            Show document
          </label>
          {selection?.kind === 'document' && (
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showChunksInGraph}
                onChange={e => setShowChunksInGraph(e.target.checked)}
                className="accent-indigo-600"
              />
              Show chunks
            </label>
          )}
          <div className="flex gap-1">
            <button onClick={() => rendererRef.current?.zoomIn()} className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors" title="Zoom in"><ZoomIn size={13} /></button>
            <button onClick={() => rendererRef.current?.zoomOut()} className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors" title="Zoom out"><ZoomOut size={13} /></button>
            <button onClick={() => rendererRef.current?.zoomReset()} className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors" title="Reset zoom"><Maximize2 size={13} /></button>
          </div>
          {!usingMgmtKey && (
            <button onClick={disconnect} className="text-xs text-gray-400 hover:text-red-500 transition-colors" title="Clear API key">
              Disconnect
            </button>
          )}
        </div>

        <div className="relative border border-gray-200 rounded-xl bg-white overflow-hidden" style={{ height: '560px' }}>
          {graphQuery.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <RefreshCw size={15} className="animate-spin" /> Loading graph…
              </div>
            </div>
          )}
          {graphQuery.isFetching && !graphQuery.isLoading && (
            <div className="absolute top-3 right-3 z-10">
              <RefreshCw size={13} className="animate-spin text-indigo-400" />
            </div>
          )}
          {graphQuery.error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
              <p className="text-sm text-red-500">{(graphQuery.error as Error).message}</p>
              <button onClick={() => graphQuery.refetch()} className="text-xs text-indigo-500 hover:underline">Retry</button>
            </div>
          )}
          {!selection && !graphQuery.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p className="text-sm text-gray-400">Select a document, chunk, or concept.</p>
            </div>
          )}
          {!graphQuery.isLoading && !graphQuery.error && selection && displayGraph?.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p className="text-sm text-gray-400">Nothing connected to this selection.</p>
            </div>
          )}
          {d3Data && <D3Renderer ref={rendererRef} data={d3Data} onNodeClick={handleNodeClick} />}
        </div>

        {legend.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
            {legend.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-gray-400 px-1">Click a node to explore it.</p>
      </div>
    </div>
  );
}
