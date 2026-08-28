import type { GraphNode } from '@/types/api';

/**
 * Short display name for a document id.
 * "proj_…_doc_incometaxassessm_<64-hex>" → "incometaxassessm_e5b0c3…"
 */
export function docDisplayName(id: string): string {
  const i = id.indexOf('_doc_');
  const rest = i >= 0 ? id.slice(i + '_doc_'.length) : id;
  const m = rest.match(/^(.*_)([0-9a-f]{64})$/);
  if (m) return `${m[1]}${m[2].slice(0, 6)}…`;
  return rest;
}

/**
 * Ingestion uses a sliding-window splitter (512-token chunks, 50-token overlap;
 * research papers 1024/120), so consecutive chunks repeat each other's tail/head.
 * Returns the length (chars) of the longest suffix of `prev` that is a prefix
 * of `cur`, so the duplicated region can be rendered dimmed.
 */
export function overlapCharCount(prev: string, cur: string): number {
  const max = Math.min(prev.length, cur.length, 800);
  for (let k = max; k >= 20; k--) {
    if (prev.endsWith(cur.slice(0, k))) return k;
  }
  return 0;
}

export function isDocumentNode(node: GraphNode): boolean {
  return node.labels.includes('Document');
}

export function isChunkNode(node: GraphNode): boolean {
  return node.labels.some(l => l.startsWith('Chunk'));
}

/** Concept = any node that is neither a Document nor a Chunk. */
export function isConceptNode(node: GraphNode): boolean {
  return !isDocumentNode(node) && !isChunkNode(node);
}
