/**
 * Cytoscape.js graph renderer.
 *
 * Accepts pre-adapted CyElements (produced by adaptToCytoscape) and renders
 * an interactive graph using Cytoscape's cose layout engine. Exposes zoom
 * controls via a forwarded ref (GraphRendererHandle).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { CyElements } from '../adapters/cytoscape';
import type { GraphRendererHandle } from '../types';

interface Props {
  elements: CyElements;
}

const CytoscapeRenderer = forwardRef<GraphRendererHandle, Props>(
  function CytoscapeRenderer({ elements }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tipRef       = useRef<HTMLDivElement>(null);
    const cyRef        = useRef<cytoscape.Core | null>(null);
    const layoutRef    = useRef<cytoscape.Layouts | null>(null);

    // ---------------------------------------------------------------------------
    // Imperative handle — zoom buttons
    // ---------------------------------------------------------------------------
    useImperativeHandle(ref, () => ({
      zoomIn() {
        cyRef.current?.zoom({ level: (cyRef.current.zoom() * 1.4), renderedPosition: centrePos() });
      },
      zoomOut() {
        cyRef.current?.zoom({ level: (cyRef.current.zoom() / 1.4), renderedPosition: centrePos() });
      },
      zoomReset() {
        cyRef.current?.fit(undefined, 40);
      },
    }));

    function centrePos() {
      const cy = cyRef.current;
      if (!cy) return { x: 0, y: 0 };
      return { x: cy.width() / 2, y: cy.height() / 2 };
    }

    // ---------------------------------------------------------------------------
    // Cytoscape initialisation — runs once on mount, creates empty instance
    // Element management is handled entirely by the update effect below.
    // ---------------------------------------------------------------------------
    useEffect(() => {
      if (!containerRef.current) return;

      const cy = cytoscape({
        container: containerRef.current,
        elements: [],
        style: [
          {
            selector: 'node',
            style: {
              'background-color':   'data(color)',
              'width':              'data(size)',
              'height':             'data(size)',
              'label':              'data(label)',
              'font-size':          8,
              'color':              '#475569',
              'text-valign':        'bottom',
              'text-halign':        'center',
              'text-margin-y':      4,
              'text-max-width':     '80px',
              'text-wrap':          'ellipsis',
              'border-width':       1.5,
              'border-color':       '#ffffff',
            },
          },
          {
            selector: 'edge',
            style: {
              'width':              1.2,
              'line-color':         '#e2e8f0',
              'target-arrow-color': '#cbd5e1',
              'target-arrow-shape': 'triangle',
              'curve-style':        'bezier',
              'label':              'data(label)',
              'font-size':          7,
              'color':              '#94a3b8',
              'text-rotation':      'autorotate',
              'text-background-color': '#ffffff',
              'text-background-opacity': 0.7,
              'text-background-padding': '2px',
            },
          },
          {
            selector: 'node:selected',
            style: {
              'border-color': '#6366f1',
              'border-width': 3,
            },
          },
        ],
        minZoom: 0.05,
        maxZoom: 5,
      });

      cyRef.current = cy;

      // --- Tooltip ---
      const tip = tipRef.current;
      cy.on('mouseover', 'node', ev => {
        if (!tip || !containerRef.current) return;
        const node = ev.target;
        const pos  = ev.renderedPosition;

        tip.style.display = 'block';
        tip.style.left    = `${pos.x + 14}px`;
        tip.style.top     = `${pos.y - 14}px`;

        // Collect node data, exclude large fields and cytoscape internals
        const data = node.data();
        const skip = new Set(['color', 'size', 'label', 'labels', 'id', 'embedding', 'text']);
        const props = Object.entries(data as Record<string, unknown>)
          .filter(([k]) => !skip.has(k))
          .slice(0, 10);

        const labelLine = Array.isArray(data.labels)
          ? (data.labels as string[]).join(' · ')
          : data.id;

        tip.innerHTML = `
          <div class="font-semibold text-xs mb-1 text-gray-800">${labelLine}</div>
          ${props.map(([k, v]) =>
            `<div class="text-xs text-gray-500 truncate">
              <span class="text-gray-400">${k}:</span> ${String(v).slice(0, 60)}
            </div>`,
          ).join('')}
        `;
      });

      cy.on('mousemove', 'node', ev => {
        if (!tip) return;
        const pos = ev.renderedPosition;
        tip.style.left = `${pos.x + 14}px`;
        tip.style.top  = `${pos.y - 14}px`;
      });

      cy.on('mouseout', 'node', () => {
        if (tip) tip.style.display = 'none';
      });

      // Hide tooltip when panning / zooming
      cy.on('viewport', () => {
        if (tip) tip.style.display = 'none';
      });

      return () => {
        layoutRef.current?.stop();
        layoutRef.current = null;
        cy.destroy();
        cyRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);  // intentionally mount-only

    // ---------------------------------------------------------------------------
    // Update elements when data changes without destroying the instance.
    // Owns all element management: stop layout → clear → add nodes → add edges → layout.
    // ---------------------------------------------------------------------------
    useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;

      // Stop any running layout before touching elements to avoid animation-frame crashes.
      layoutRef.current?.stop();
      layoutRef.current = null;

      cy.elements().remove();
      cy.add(elements.filter(e => e.group === 'nodes'));

      // Build node id set from input elements (not cy.nodes()) to avoid any
      // Cytoscape-internal ID transformation issues.
      const nodeIdSet = new Set(
        elements.filter(e => e.group === 'nodes').map(e => e.data.id as string),
      );
      cy.add(elements.filter(e =>
        e.group === 'edges' &&
        nodeIdSet.has(e.data.source as string) &&
        nodeIdSet.has(e.data.target as string),
      ));

      // animate: false runs the layout synchronously, avoiding rAF-after-destroy
      // crashes caused by React StrictMode's double-invocation of effects.
      layoutRef.current = cy.layout({
        name: 'cose',
        animate: false,
        nodeRepulsion: () => 4096,
        idealEdgeLength: () => 80,
        edgeElasticity: () => 32,
        gravity: 1,
        numIter: 800,
        initialTemp: 800,
        coolingFactor: 0.99,
        minTemp: 1,
      } as cytoscape.LayoutOptions);
      layoutRef.current.run();
    }, [elements]);

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        <div
          ref={tipRef}
          className="absolute pointer-events-none z-20 bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 max-w-xs"
          style={{ display: 'none' }}
        />
      </div>
    );
  },
);

export default CytoscapeRenderer;
