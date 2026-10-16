/**
 * Adapter: SearchResponse.graph → GraphResponse, so the search subgraph can be
 * drawn with the same adapters (adaptToD3 / adaptToCytoscape) and renderers as
 * the main graph view.
 */
import type { GraphResponse, SearchGraph, SearchResult } from '@/types/api';
import type { EdgeStyleFn } from '../types';

const CHUNK_TEXT_CHARS = 25;

export function searchGraphToGraphResponse(graph: SearchGraph, results: SearchResult[]): GraphResponse {
  // chunk_id → rank (1-based) and text of the result it came from
  const byChunk = new Map<string, { rank: number; text: string }>();
  results.forEach((r, i) => {
    if (r.chunk_id) byChunk.set(r.chunk_id, { rank: i + 1, text: r.text });
  });

  const nodes = graph.nodes.map(n => {
    if (n.type === 'concept') {
      return {
        element_id: n.id,
        // "Matched" first so nodeColor() picks its colour over Concept's
        labels: n.seed_score != null ? ['Matched', 'Concept'] : ['Concept'],
        properties: { name: n.name, seed_score: n.seed_score },
      };
    }
    const hit = byChunk.get(n.id);
    const name = hit
      ? `#${hit.rank} ${hit.text.replace(/\s+/g, ' ').trim().slice(0, CHUNK_TEXT_CHARS)}`
      : n.doc_id ?? n.id;
    return {
      element_id: n.id,
      labels: ['Chunk'],
      properties: { name, doc_id: n.doc_id },
    };
  });

  const relationships = graph.relationships.map(r => ({
    element_id: `${r.source}|${r.type}|${r.target}`,
    type: r.type,
    start_node_element_id: r.source,
    end_node_element_id: r.target,
    properties: { matched_question: r.matched_question },
  }));

  return { nodes, relationships };
}

/**
 * Keep only facts that matched the question, their endpoint concepts, and the
 * MENTIONS edges + chunks that touch those concepts.
 */
export function filterMatchedFacts(graph: SearchGraph): SearchGraph {
  const facts = graph.relationships.filter(r => r.type !== 'MENTIONS' && r.matched_question);
  const concepts = new Set(facts.flatMap(r => [r.source, r.target]));
  const mentions = graph.relationships.filter(r =>
    r.type === 'MENTIONS' && (concepts.has(r.source) || concepts.has(r.target)),
  );
  const keep = new Set([...concepts, ...mentions.flatMap(r => [r.source, r.target])]);

  return {
    nodes: graph.nodes.filter(n => keep.has(n.id)),
    relationships: [...facts, ...mentions],
  };
}

/** MENTIONS edges thin, light and unlabelled; question-matched facts thicker. */
export const searchEdgeStyle: EdgeStyleFn = ({ type, properties }) => {
  if (type === 'MENTIONS') return { label: false, width: 0.7, color: '#eef2f6' };
  if (properties.matched_question) return { width: 2.5, color: '#fca5a5' };
  return {};
};
