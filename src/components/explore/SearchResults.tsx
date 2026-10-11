/**
 * SearchResults — ranked passage list returned by POST /{apiId}/search.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { SearchResponse, SearchResult } from '@/types/api';

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

export default function SearchResults({ response }: { response: SearchResponse }) {
  const { results, info } = response;

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
    </div>
  );
}
