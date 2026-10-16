/**
 * SearchResults — ranked passage list returned by POST /{apiId}/search.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { adaptToD3 } from '@/lib/graph/adapters/d3';
import { adaptToCytoscape } from '@/lib/graph/adapters/cytoscape';
import { filterMatchedFacts, searchEdgeStyle, searchGraphToGraphResponse } from '@/lib/graph/adapters/searchGraph';
import type { GraphEngine } from '@/lib/graph/types';
import D3Renderer from '@/lib/graph/engines/D3Renderer';
import CytoscapeRenderer from '@/lib/graph/engines/CytoscapeRenderer';
import type { SearchGraph, SearchResponse, SearchResult } from '@/types/api';

function SearchResultCard({ rank, result }: { rank: number; result: SearchResult }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Only offer "Show more" when the clamped text is actually cut off
  useLayoutEffect(() => {
    const el = textRef.current;
    if (el && !expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [result.text, expanded]);

  return (
    <li className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="shrink-0 font-semibold text-indigo-600">#{rank}</span>
        <span className="shrink-0 font-mono text-gray-500">{result.score.toFixed(3)}</span>
        <span className="font-mono text-gray-700 truncate" title={result.doc_id ?? undefined}>
          {result.doc_id ?? <span className="text-gray-400">unknown document</span>}
        </span>
        {result.page_number != null && (
          <span className="shrink-0 text-gray-400">p. {result.page_number}</span>
        )}
      </div>
      <p
        ref={textRef}
        className={cn('mt-1.5 text-sm text-gray-700 whitespace-pre-wrap break-words', !expanded && 'line-clamp-4')}
      >
        {result.text}
      </p>
      {(overflows || expanded) && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-1 text-xs text-indigo-500 hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </li>
  );
}

function GraphUsed({ graph, results, engine }: { graph: SearchGraph; results: SearchResult[]; engine: GraphEngine }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'graph' | 'list'>('graph');
  const [matchedOnly, setMatchedOnly] = useState(false);

  const shown = useMemo(() => matchedOnly ? filterMatchedFacts(graph) : graph, [graph, matchedOnly]);
  const graphData = useMemo(() => searchGraphToGraphResponse(shown, results), [shown, results]);
  const d3Data = useMemo(() => engine === 'd3' ? adaptToD3(graphData) : null, [engine, graphData]);
  const cyData = useMemo(() => engine === 'cytoscape' ? adaptToCytoscape(graphData) : null, [engine, graphData]);

  const nameById = new Map(shown.nodes.map(n => [n.id, n.name ?? n.doc_id ?? n.id]));
  const concepts = shown.nodes.filter(n => n.type === 'concept').map(n => n.name ?? n.id);
  // Facts that matched the question come first
  const facts = shown.relationships
    .filter(r => r.type !== 'MENTIONS')
    .sort((a, b) => Number(!!b.matched_question) - Number(!!a.matched_question));
  const nothingMatched = matchedOnly && facts.length === 0;

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <span>Graph used</span>
        <span className="text-gray-400">
          {concepts.length} {concepts.length === 1 ? 'concept' : 'concepts'} · {facts.length} {facts.length === 1 ? 'fact' : 'facts'}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['graph', 'list'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={cn(
                    'px-3 py-1 text-xs font-medium transition-colors border-r border-gray-200 last:border-0',
                    view === v ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {v === 'graph' ? 'Graph' : 'List'}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={matchedOnly}
                onChange={e => setMatchedOnly(e.target.checked)}
                className="accent-indigo-600"
              />
              Matched facts only
            </label>
          </div>

          {nothingMatched ? (
            <p className="text-gray-400">No facts matched the question; ranking used text similarity only</p>
          ) : view === 'graph' ? (
            <div className="h-[400px] border border-gray-100 rounded-lg overflow-hidden">
              {d3Data && <D3Renderer data={d3Data} edgeStyle={searchEdgeStyle} />}
              {cyData && <CytoscapeRenderer elements={cyData} edgeStyle={searchEdgeStyle} />}
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Concepts</p>
                {concepts.length === 0 ? (
                  <p className="text-gray-400">None</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {concepts.map((c, i) => (
                      <li key={i} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs">{c}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Facts</p>
                {facts.length === 0 ? (
                  <p className="text-gray-400">None</p>
                ) : (
                  <ul className="space-y-1">
                    {facts.map((f, i) => (
                      <li key={i} className={cn('text-gray-700', f.matched_question && 'font-semibold text-gray-900')}>
                        {nameById.get(f.source) ?? f.source} — {f.type} → {nameById.get(f.target) ?? f.target}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchResults({ response, engine = 'd3' }: { response: SearchResponse; engine?: GraphEngine }) {
  const { results, info, graph } = response;

  if (results.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm font-medium text-gray-500">No matching passages</p>
        <p className="text-xs text-gray-400 mt-1">Try a different question, or add content to the graph first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">
        {results.length} {results.length === 1 ? 'result' : 'results'} · {info.retrieval_time.toFixed(2)}s
      </p>
      <ol className="max-h-96 overflow-y-auto space-y-2 pr-1">
        {results.map((r, i) => <SearchResultCard key={i} rank={i + 1} result={r} />)}
      </ol>
      {graph && <GraphUsed graph={graph} results={results} engine={engine} />}
    </div>
  );
}
