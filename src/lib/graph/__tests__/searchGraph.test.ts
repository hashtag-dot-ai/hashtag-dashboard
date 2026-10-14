import { describe, it, expect } from 'vitest';
import { filterMatchedFacts, searchEdgeStyle, searchGraphToGraphResponse } from '@/lib/graph/adapters/searchGraph';
import { nodeColor } from '@/lib/graph/colors';
import type { SearchGraph, SearchResult } from '@/types/api';

const results: SearchResult[] = [
  { doc_id: 'doc-a', text: 'First   passage\nwith a long enough body of text.', score: 0.9, chunk_id: 'c1' },
  { doc_id: 'doc-b', text: 'Short.', score: 0.5, chunk_id: 'c2' },
];

const graph: SearchGraph = {
  nodes: [
    { id: 'c1', type: 'chunk', doc_id: 'doc-a' },
    { id: 'c2', type: 'chunk', doc_id: 'doc-b' },
    { id: 'c9', type: 'chunk', doc_id: 'doc-z' },
    { id: 'k1', type: 'concept', name: 'Alpha', seed_score: 0.8 },
    { id: 'k2', type: 'concept', name: 'Beta' },
    { id: 'k3', type: 'concept', name: 'Gamma' },
  ],
  relationships: [
    { source: 'c1', target: 'k1', type: 'MENTIONS' },
    { source: 'c2', target: 'k3', type: 'MENTIONS' },
    { source: 'k1', target: 'k2', type: 'DEPENDS_ON', matched_question: true },
    { source: 'k2', target: 'k3', type: 'PART_OF' },
  ],
};

describe('searchGraphToGraphResponse', () => {
  const out = searchGraphToGraphResponse(graph, results);
  const node = (id: string) => out.nodes.find(n => n.element_id === id)!;

  it('maps concepts to Concept nodes, adding Matched when seed_score is present', () => {
    expect(node('k1')).toEqual({
      element_id: 'k1', labels: ['Matched', 'Concept'], properties: { name: 'Alpha', seed_score: 0.8 },
    });
    expect(node('k2').labels).toEqual(['Concept']);
    expect(node('k2').properties.name).toBe('Beta');
    // Matched concepts get the Matched colour, others the Concept colour
    expect(nodeColor(node('k1').labels)).toBe('#ef4444');
    expect(nodeColor(node('k2').labels)).toBe('#8b5cf6');
  });

  it('names chunks by result rank and the start of the result text', () => {
    expect(node('c1')).toEqual({
      element_id: 'c1', labels: ['Chunk'],
      properties: { name: '#1 First passage with a long', doc_id: 'doc-a' },
    });
    expect(node('c2').properties.name).toBe('#2 Short.');
    // No matching result → fall back to the doc id
    expect(node('c9').properties.name).toBe('doc-z');
  });

  it('builds relationships with source|type|target ids', () => {
    expect(out.relationships).toContainEqual({
      element_id: 'k1|DEPENDS_ON|k2', type: 'DEPENDS_ON',
      start_node_element_id: 'k1', end_node_element_id: 'k2',
      properties: { matched_question: true },
    });
    expect(out.relationships.map(r => r.element_id)).toEqual([
      'c1|MENTIONS|k1', 'c2|MENTIONS|k3', 'k1|DEPENDS_ON|k2', 'k2|PART_OF|k3',
    ]);
  });
});

describe('filterMatchedFacts', () => {
  it('keeps matched facts, their concepts, and the chunks mentioning them', () => {
    const f = filterMatchedFacts(graph);
    expect(f.nodes.map(n => n.id).sort()).toEqual(['c1', 'k1', 'k2']);
    expect(f.relationships.map(r => `${r.source}|${r.type}|${r.target}`).sort())
      .toEqual(['c1|MENTIONS|k1', 'k1|DEPENDS_ON|k2']);
  });

  it('returns an empty graph when nothing matched', () => {
    const f = filterMatchedFacts({
      nodes: graph.nodes,
      relationships: graph.relationships.map(r => ({ ...r, matched_question: false })),
    });
    expect(f).toEqual({ nodes: [], relationships: [] });
  });
});

describe('searchEdgeStyle', () => {
  it('hides MENTIONS labels and thickens matched facts', () => {
    expect(searchEdgeStyle({ type: 'MENTIONS', properties: {} }).label).toBe(false);
    expect(searchEdgeStyle({ type: 'DEPENDS_ON', properties: { matched_question: true } }).width).toBeGreaterThan(1.2);
    expect(searchEdgeStyle({ type: 'PART_OF', properties: {} })).toEqual({});
  });
});
