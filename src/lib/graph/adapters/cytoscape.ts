/**
 * Adapter: GraphResponse (backend format) → Cytoscape element definitions.
 *
 * Visual properties (color, size) are embedded in each node's data map so
 * the Cytoscape stylesheet can reference them with `data(color)` / `data(size)`
 * without needing engine-specific style recalculation.
 */
import type cytoscape from 'cytoscape';
import type { GraphResponse } from '@/types/api';
import { nodeColor, nodeRadius, nodeDisplayName } from '../colors';

export type CyElements = cytoscape.ElementDefinition[];

export function adaptToCytoscape(response: GraphResponse): CyElements {
  const nodeIds = new Set(response.nodes.map(n => n.element_id));

  const nodes: cytoscape.ElementDefinition[] = response.nodes.map(n => {
    // Strip large/unrenderable properties before embedding in Cytoscape data.
    const safeProps = Object.fromEntries(
      Object.entries(n.properties).filter(
        ([k]) => k !== 'embedding' && k !== 'text',
      ),
    );

    return {
      group: 'nodes',
      data: {
        id: n.element_id,
        // Pre-computed visual hints for the stylesheet
        color: nodeColor(n.labels),
        size: nodeRadius(n.labels) * 2, // Cytoscape uses diameter, not radius
        label: nodeDisplayName(n.labels, n.properties),
        // Domain data (available for tooltips / future filtering)
        labels: n.labels,
        ...safeProps,
      },
    };
  });

  // Filter edges whose endpoints were pruned by the server-side limit
  const edges: cytoscape.ElementDefinition[] = response.relationships
    .filter(r =>
      nodeIds.has(r.start_node_element_id) &&
      nodeIds.has(r.end_node_element_id),
    )
    .map(r => ({
      group: 'edges',
      data: {
        id: r.element_id,
        source: r.start_node_element_id,
        target: r.end_node_element_id,
        label: r.type,
        type: r.type,
        ...r.properties,
      },
    }));

  return [...nodes, ...edges];
}
