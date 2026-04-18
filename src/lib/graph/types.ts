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
