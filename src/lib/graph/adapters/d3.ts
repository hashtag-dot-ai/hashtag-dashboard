/**
 * Adapter: GraphResponse (backend format) → D3 simulation data.
 *
 * D3's force simulation mutates nodes in-place to add x/y/vx/vy, so the
 * adapter produces plain objects that extend SimulationNodeDatum.
 * Links reference nodes by their string id; D3 resolves them to objects
 * after the simulation starts.
 */
import type * as d3 from 'd3';
import type { GraphResponse } from '@/types/api';

export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  /** Relationship type label, e.g. "WORKS_AT" */
  type: string;
}

export interface D3GraphData {
  nodes: D3Node[];
  links: D3Link[];
}

export function adaptToD3(response: GraphResponse): D3GraphData {
  const nodeIds = new Set(response.nodes.map(n => n.element_id));

  const nodes: D3Node[] = response.nodes.map(n => ({
    id: n.element_id,
    labels: n.labels,
    properties: n.properties,
  }));

  // Filter out edges whose endpoints were pruned (e.g. by the server-side limit)
  const links: D3Link[] = response.relationships
    .filter(r =>
      nodeIds.has(r.start_node_element_id) &&
      nodeIds.has(r.end_node_element_id),
    )
    .map(r => ({
      id: r.element_id,
      type: r.type,
      // D3 resolves string ids → node objects after simulation.init()
      source: r.start_node_element_id,
      target: r.end_node_element_id,
    }));

  return { nodes, links };
}
