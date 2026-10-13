import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchResults from '@/components/explore/SearchResults';
import type { D3GraphData } from '@/lib/graph/adapters/d3';
import type { CyElements } from '@/lib/graph/adapters/cytoscape';
import type { SearchResponse } from '@/types/api';

// Real renderers need layout/canvas; stand-ins expose what they were given.
vi.mock('@/lib/graph/engines/D3Renderer', () => ({
  default: ({ data }: { data: D3GraphData }) => (
    <div data-testid="d3-renderer">
      {data.nodes.map(n => n.id).sort().join(',')} / {data.links.map(l => l.id).sort().join(',')}
    </div>
  ),
}));
vi.mock('@/lib/graph/engines/CytoscapeRenderer', () => ({
  default: ({ elements }: { elements: CyElements }) => (
    <div data-testid="cy-renderer">{elements.length} elements</div>
  ),
}));

const base: SearchResponse = {
  results: [
    { doc_id: 'doc-a', text: 'Alpha passage.', score: 0.9, chunk_id: 'c1' },
    { doc_id: 'doc-b', text: 'Beta passage.', score: 0.5, chunk_id: 'c2' },
  ],
  info: { top_k: 20, retrieval_time: 0.1 },
};

const withGraph = (matched: boolean): SearchResponse => ({
  ...base,
  graph: {
    nodes: [
      { id: 'c1', type: 'chunk', doc_id: 'doc-a' },
      { id: 'c2', type: 'chunk', doc_id: 'doc-b' },
      { id: 'k1', type: 'concept', name: 'Alpha', seed_score: 0.8 },
      { id: 'k2', type: 'concept', name: 'Beta' },
      { id: 'k3', type: 'concept', name: 'Gamma' },
    ],
    relationships: [
      { source: 'c1', target: 'k1', type: 'MENTIONS' },
      { source: 'c2', target: 'k3', type: 'MENTIONS' },
      { source: 'k1', target: 'k2', type: 'DEPENDS_ON', matched_question: matched },
      { source: 'k2', target: 'k3', type: 'PART_OF' },
    ],
  },
});

describe('SearchResults', () => {
  it('renders as before when the response has no graph', () => {
    render(<SearchResults response={base} />);
    expect(screen.getByText('2 results · 0.10s')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Graph used/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('d3-renderer')).not.toBeInTheDocument();
  });

  it('shows the graph by default and switches to the list', async () => {
    const user = userEvent.setup();
    render(<SearchResults response={withGraph(true)} />);
    await user.click(screen.getByRole('button', { name: /Graph used/ }));

    expect(screen.getByRole('button', { name: 'Graph' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('d3-renderer')).toHaveTextContent(
      'c1,c2,k1,k2,k3 / c1|MENTIONS|k1,c2|MENTIONS|k3,k1|DEPENDS_ON|k2,k2|PART_OF|k3',
    );
    expect(screen.queryByText('Alpha — DEPENDS_ON → Beta')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.queryByTestId('d3-renderer')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha — DEPENDS_ON → Beta')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Graph' }));
    expect(screen.getByTestId('d3-renderer')).toBeInTheDocument();
  });

  it('uses the Cytoscape renderer when that engine is selected', async () => {
    const user = userEvent.setup();
    render(<SearchResults response={withGraph(true)} engine="cytoscape" />);
    await user.click(screen.getByRole('button', { name: /Graph used/ }));
    expect(screen.getByTestId('cy-renderer')).toHaveTextContent('9 elements');
    expect(screen.queryByTestId('d3-renderer')).not.toBeInTheDocument();
  });

  it('"Matched facts only" keeps matched facts, their concepts and mentioning chunks', async () => {
    const user = userEvent.setup();
    render(<SearchResults response={withGraph(true)} />);
    await user.click(screen.getByRole('button', { name: /Graph used/ }));

    const checkbox = screen.getByLabelText('Matched facts only');
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(screen.getByTestId('d3-renderer')).toHaveTextContent('c1,k1,k2 / c1|MENTIONS|k1,k1|DEPENDS_ON|k2');

    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByText('Alpha — DEPENDS_ON → Beta')).toBeInTheDocument();
    expect(screen.queryByText('Beta — PART_OF → Gamma')).not.toBeInTheDocument();
  });

  it('explains when no facts matched instead of showing an empty graph', async () => {
    const user = userEvent.setup();
    render(<SearchResults response={withGraph(false)} />);
    await user.click(screen.getByRole('button', { name: /Graph used/ }));
    await user.click(screen.getByLabelText('Matched facts only'));

    expect(screen.getByText('No facts matched the question; ranking used text similarity only')).toBeInTheDocument();
    expect(screen.queryByTestId('d3-renderer')).not.toBeInTheDocument();
  });
});
