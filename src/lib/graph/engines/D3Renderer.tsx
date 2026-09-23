/**
 * D3 force-directed graph renderer.
 *
 * Accepts pre-adapted D3GraphData (produced by adaptToD3) and renders a
 * force-directed graph using D3's simulation engine.  Exposes zoom controls
 * via a forwarded ref (GraphRendererHandle).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as d3 from 'd3';
import type { D3GraphData, D3Node, D3Link } from '../adapters/d3';
import type { GraphRendererHandle } from '../types';
import { nodeColor, nodeRadius, nodeDisplayName } from '../colors';
import { tooltipHtml } from '../tooltip';

const LINK_COLOR = '#e2e8f0';
const LINK_HOVER_COLOR = '#6366f1';
/** Invisible stroke width used to make thin edges easy to hover. */
const LINK_HIT_WIDTH = 10;

interface Props {
  data: D3GraphData;
  /** Optional: invoked when a node is clicked (not dragged). */
  onNodeClick?: (node: D3Node) => void;
}

const D3Renderer = forwardRef<GraphRendererHandle, Props>(
  function D3Renderer({ data, onNodeClick }, ref) {
    const svgRef       = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tipRef       = useRef<HTMLDivElement>(null);
    const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const simRef       = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
    // Ref so the graph isn't rebuilt when the callback identity changes.
    const onNodeClickRef = useRef(onNodeClick);
    onNodeClickRef.current = onNodeClick;

    // ---------------------------------------------------------------------------
    // Imperative handle — used by KGGraph's zoom buttons
    // ---------------------------------------------------------------------------
    useImperativeHandle(ref, () => ({
      zoomIn() {
        if (svgRef.current && zoomRef.current)
          d3.select<SVGSVGElement, unknown>(svgRef.current)
            .transition().duration(250)
            .call(zoomRef.current.scaleBy, 1.4);
      },
      zoomOut() {
        if (svgRef.current && zoomRef.current)
          d3.select<SVGSVGElement, unknown>(svgRef.current)
            .transition().duration(250)
            .call(zoomRef.current.scaleBy, 1 / 1.4);
      },
      zoomReset() {
        if (svgRef.current && zoomRef.current)
          d3.select<SVGSVGElement, unknown>(svgRef.current)
            .transition().duration(300)
            .call(zoomRef.current.transform, d3.zoomIdentity);
      },
    }));

    // ---------------------------------------------------------------------------
    // D3 graph setup — runs whenever adapted data changes
    // ---------------------------------------------------------------------------
    useEffect(() => {
      if (!svgRef.current || !containerRef.current) return;

      simRef.current?.stop();

      const container = containerRef.current;
      const W = container.clientWidth;
      const H = container.clientHeight;

      const { nodes, links } = data;

      // --- SVG scaffold ---
      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
      svg.selectAll('*').remove();

      svg.append('defs').append('marker')
        .attr('id', 'd3-arrow')
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', '#cbd5e1')
        .attr('d', 'M0,-4L8,0L0,4');

      const g = svg.append('g');

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 5])
        .on('zoom', ev => g.attr('transform', ev.transform));
      svg.call(zoom);
      zoomRef.current = zoom;

      // --- Links ---
      const linkSel = g.append('g').attr('class', 'links')
        .selectAll<SVGLineElement, D3Link>('line')
        .data(links)
        .join('line')
        .attr('stroke', LINK_COLOR)
        .attr('stroke-width', 1.2)
        .attr('marker-end', 'url(#d3-arrow)');

      // --- Link hit areas (wide invisible strokes so edges are hoverable) ---
      const linkHitSel = g.append('g').attr('class', 'link-hits')
        .selectAll<SVGLineElement, D3Link>('line')
        .data(links)
        .join('line')
        .attr('stroke', 'transparent')
        .attr('stroke-width', LINK_HIT_WIDTH)
        .style('pointer-events', 'stroke')
        .attr('cursor', 'default');

      // --- Edge labels ---
      const linkLabelSel = g.append('g').attr('class', 'link-labels')
        .selectAll<SVGTextElement, D3Link>('text')
        .data(links)
        .join('text')
        .attr('font-size', '7px')
        .attr('fill', '#94a3b8')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .style('pointer-events', 'none')
        .text(d => d.type);

      // --- Node groups ---
      const showNodeLabels = nodes.length <= 200;
      const nodeSel = g.append('g').attr('class', 'nodes')
        .selectAll<SVGGElement, D3Node>('g')
        .data(nodes)
        .join('g')
        .attr('cursor', 'grab');

      nodeSel.append('circle')
        .attr('r', d => nodeRadius(d.labels))
        .attr('fill', d => nodeColor(d.labels))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      if (showNodeLabels) {
        nodeSel.append('text')
          .attr('font-size', '8px')
          .attr('fill', '#475569')
          .attr('text-anchor', 'middle')
          .attr('dy', d => nodeRadius(d.labels) + 9)
          .style('pointer-events', 'none')
          .text(d => nodeDisplayName(d.labels, d.properties));
      }

      // --- Force simulation ---
      const sim = d3.forceSimulation<D3Node>(nodes)
        .force('link',
          d3.forceLink<D3Node, D3Link>(links)
            .id(d => d.id)
            .distance(d => {
              const src = d.source as D3Node;
              const tgt = d.target as D3Node;
              const isDocEdge =
                src.labels.includes('Document') || tgt.labels.includes('Document') ||
                src.labels.some(l => l.startsWith('Chunk')) ||
                tgt.labels.some(l => l.startsWith('Chunk'));
              return isDocEdge ? 120 : 80;
            }),
        )
        .force('charge', d3.forceManyBody<D3Node>().strength(-250))
        .force('center', d3.forceCenter<D3Node>(W / 2, H / 2))
        .force('collide', d3.forceCollide<D3Node>().radius(d => nodeRadius(d.labels) + 6));

      simRef.current = sim;

      sim.on('tick', () => {
        // Hit areas follow node centres exactly; visible lines are trimmed below.
        linkHitSel
          .attr('x1', d => (d.source as D3Node).x ?? 0)
          .attr('y1', d => (d.source as D3Node).y ?? 0)
          .attr('x2', d => (d.target as D3Node).x ?? 0)
          .attr('y2', d => (d.target as D3Node).y ?? 0);

        // Trim lines to node edges so arrowheads sit flush against circles
        linkSel
          .attr('x1', d => {
            const s = d.source as D3Node, t = d.target as D3Node;
            const dx = (t.x ?? 0) - (s.x ?? 0), dy = (t.y ?? 0) - (s.y ?? 0);
            const len = Math.hypot(dx, dy) || 1;
            return (s.x ?? 0) + dx / len * nodeRadius(s.labels);
          })
          .attr('y1', d => {
            const s = d.source as D3Node, t = d.target as D3Node;
            const dx = (t.x ?? 0) - (s.x ?? 0), dy = (t.y ?? 0) - (s.y ?? 0);
            const len = Math.hypot(dx, dy) || 1;
            return (s.y ?? 0) + dy / len * nodeRadius(s.labels);
          })
          .attr('x2', d => {
            const s = d.source as D3Node, t = d.target as D3Node;
            const dx = (t.x ?? 0) - (s.x ?? 0), dy = (t.y ?? 0) - (s.y ?? 0);
            const len = Math.hypot(dx, dy) || 1;
            return (t.x ?? 0) - dx / len * (nodeRadius(t.labels) + 7);
          })
          .attr('y2', d => {
            const s = d.source as D3Node, t = d.target as D3Node;
            const dx = (t.x ?? 0) - (s.x ?? 0), dy = (t.y ?? 0) - (s.y ?? 0);
            const len = Math.hypot(dx, dy) || 1;
            return (t.y ?? 0) - dy / len * (nodeRadius(t.labels) + 7);
          });

        linkLabelSel
          .attr('x', d => (((d.source as D3Node).x ?? 0) + ((d.target as D3Node).x ?? 0)) / 2)
          .attr('y', d => (((d.source as D3Node).y ?? 0) + ((d.target as D3Node).y ?? 0)) / 2);

        nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

      // --- Drag ---
      const drag = d3.drag<SVGGElement, D3Node>()
        .on('start', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on('end',  (ev, d) => {
          if (!ev.active) sim.alphaTarget(0);
          d.fx = null; d.fy = null;
        });
      nodeSel.call(drag);

      // --- Click (drag suppresses click via defaultPrevented) ---
      nodeSel.on('click', (ev: MouseEvent, d) => {
        if (ev.defaultPrevented) return;
        onNodeClickRef.current?.(d);
      });

      // --- Tooltip (D3-owned div, no React re-renders on mousemove) ---
      const tip = tipRef.current;
      const moveTip = (ev: MouseEvent) => {
        if (!tip) return;
        const rect = container.getBoundingClientRect();
        tip.style.left = `${ev.clientX - rect.left + 14}px`;
        tip.style.top  = `${ev.clientY - rect.top  - 14}px`;
      };
      const showTip = (ev: MouseEvent, html: string) => {
        if (!tip) return;
        tip.style.display = 'block';
        moveTip(ev);
        tip.innerHTML = html;
      };
      const hideTip = () => { if (tip) tip.style.display = 'none'; };

      nodeSel
        .on('mouseover', (ev: MouseEvent, d) => {
          showTip(ev, tooltipHtml({ title: d.labels.join(' · '), properties: d.properties }));
        })
        .on('mousemove', moveTip)
        .on('mouseout', hideTip);

      // Edge hover: highlight the visible line and show the relationship's properties.
      linkHitSel
        .on('mouseover', (ev: MouseEvent, d) => {
          const s = d.source as D3Node, t = d.target as D3Node;
          linkSel.filter(l => l === d).attr('stroke', LINK_HOVER_COLOR).attr('stroke-width', 2);
          showTip(ev, tooltipHtml({
            title: d.type,
            subtitle: `${nodeDisplayName(s.labels, s.properties)} → ${nodeDisplayName(t.labels, t.properties)}`,
            properties: d.properties,
            emptyText: 'No properties',
          }));
        })
        .on('mousemove', moveTip)
        .on('mouseout', (_ev, d) => {
          linkSel.filter(l => l === d).attr('stroke', LINK_COLOR).attr('stroke-width', 1.2);
          hideTip();
        });

      return () => { sim.stop(); };
    }, [data]);

    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="100%" />
        <div
          ref={tipRef}
          className="absolute pointer-events-none z-20 bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 max-w-xs"
          style={{ display: 'none' }}
        />
      </div>
    );
  },
);

export default D3Renderer;
