/**
 * Common imperative handle exposed by every graph renderer via forwardRef.
 * KGGraph calls these from its zoom/pan control buttons without knowing which
 * engine is currently active.
 */
export interface GraphRendererHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
}

export type GraphEngine = 'd3' | 'cytoscape';

/** Per-edge visual overrides. Omitted fields keep the renderer's defaults. */
export interface EdgeStyle {
  /** false hides the relationship-type label */
  label?: boolean;
  width?: number;
  color?: string;
}

export type EdgeStyleFn = (edge: { type: string; properties: Record<string, unknown> }) => EdgeStyle;
