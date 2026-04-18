/** Shared visual-mapping helpers used by all rendering adapters. */

export const KNOWN_COLORS: Record<string, string> = {
  Document:     '#94a3b8',
  Person:       '#6366f1',
  Organization: '#10b981',
  Technology:   '#f59e0b',
  Concept:      '#8b5cf6',
  Location:     '#06b6d4',
  Event:        '#f97316',
  Product:      '#ec4899',
};

const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
];

/** Deterministic color for a node based on its labels. */
export function nodeColor(labels: string[]): string {
  for (const l of labels) {
    if (l in KNOWN_COLORS) return KNOWN_COLORS[l];
  }
  const label = labels.find(l => !l.startsWith('Chunk') && l !== 'Document') ?? labels[0] ?? '';
  let h = 0;
  for (let i = 0; i < label.length; i++) h = ((h * 31) + label.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** Radius (px) for a node based on its labels. */
export function nodeRadius(labels: string[]): number {
  if (labels.includes('Document')) return 12;
  if (labels.some(l => l.startsWith('Chunk'))) return 5;
  return 8;
}

/** Human-readable display name from node properties and labels. */
export function nodeDisplayName(labels: string[], properties: Record<string, unknown>): string {
  for (const k of ['name', 'id', 'title', 'label', 'fileName']) {
    const v = properties[k];
    if (v && typeof v === 'string') return v.slice(0, 28);
  }
  return labels[0] ?? '';
}
