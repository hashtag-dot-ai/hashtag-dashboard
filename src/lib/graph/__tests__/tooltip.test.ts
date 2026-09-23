import { describe, it, expect } from 'vitest';
import { tooltipHtml, visibleProperties, escapeHtml } from '@/lib/graph/tooltip';
import { adaptToD3 } from '@/lib/graph/adapters/d3';
import { adaptToCytoscape } from '@/lib/graph/adapters/cytoscape';
import type { GraphResponse } from '@/types/api';

const RESPONSE: GraphResponse = {
  nodes: [
    { element_id: 'n1', labels: ['__Entity__', 'Person'], properties: { id: 'Alice', embedding: [1, 2] } },
    { element_id: 'n2', labels: ['__Entity__', 'Company'], properties: { id: 'Acme' } },
  ],
  relationships: [
    {
      element_id: 'r1',
      type: 'WORKS_AT',
      start_node_element_id: 'n1',
      end_node_element_id: 'n2',
      properties: { since: 2019, weight: 0.8, tenant_key: 't1', embedding: [0.1] },
    },
  ],
};

describe('tooltip helpers', () => {
  it('hides embedding/text and caller-supplied internal keys', () => {
    const props = visibleProperties(
      { since: 2019, embedding: [1], text: 'long', id: 'r1', source: 'a' },
      ['id', 'source'],
    );
    expect(props).toEqual([['since', 2019]]);
  });

  it('renders title, subtitle and properties, escaping HTML', () => {
    const html = tooltipHtml({
      title: 'WORKS_AT',
      subtitle: 'Alice → Acme',
      properties: { note: '<b>bold</b>', since: 2019 },
    });
    expect(html).toContain('WORKS_AT');
    expect(html).toContain('Alice → Acme');
    expect(html).toContain('since:');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(html).not.toContain('<b>bold</b>');
  });

  it('shows the empty text when an edge has no visible properties', () => {
    const html = tooltipHtml({ title: 'MENTIONS', properties: { embedding: [1] }, emptyText: 'No properties' });
    expect(html).toContain('No properties');
  });

  it('serialises object values instead of printing [object Object]', () => {
    const html = tooltipHtml({ title: 'X', properties: { meta: { a: 1 } } });
    expect(html).toContain(escapeHtml('{"a":1}'));
    expect(html).not.toContain('[object Object]');
  });
});

describe('adapters carry relationship properties', () => {
  it('adaptToD3 copies edge properties onto links', () => {
    const { links } = adaptToD3(RESPONSE);
    expect(links).toHaveLength(1);
    expect(links[0].properties).toEqual(RESPONSE.relationships[0].properties);
  });

  it('adaptToCytoscape keeps edge properties in data (reserved keys win)', () => {
    const edge = adaptToCytoscape(RESPONSE).find((e) => e.group === 'edges')!;
    expect(edge.data.since).toBe(2019);
    expect(edge.data.type).toBe('WORKS_AT');
    expect(edge.data.source).toBe('n1');
    expect(edge.data.target).toBe('n2');
  });
});
