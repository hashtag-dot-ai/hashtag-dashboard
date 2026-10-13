import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { renderWithProviders } from '@/test/renderWithProviders';
import KGGraph from '@/components/KGGraph';

// Graph engines need a real layout/canvas; they're irrelevant to search.
vi.mock('@/lib/graph/engines/D3Renderer', () => ({ default: () => null }));
vi.mock('@/lib/graph/engines/CytoscapeRenderer', () => ({ default: () => null }));

const BASE = 'http://localhost:8000';

describe('KGGraph search playground', () => {
  const renderGraph = () => {
    server.use(
      http.get(`${BASE}/:owner/:slug/graph`, () => HttpResponse.json({ nodes: [], relationships: [] })),
    );
    return renderWithProviders(<KGGraph apiId="alice/my-project" />);
  };

  it('switches to Search, sends question + top_k, and renders ranked results', async () => {
    let sent: unknown = null;
    let sentKey: string | null = null;
    server.use(
      http.post(`${BASE}/alice/my-project/search`, async ({ request }) => {
        sent = await request.json();
        sentKey = request.headers.get('x-api-key');
        return HttpResponse.json({
          results: [
            { doc_id: 'doc-alpha.pdf', text: 'Alpha passage.', score: 0.91234, page_number: 3 },
            { doc_id: 'doc-beta', text: 'Beta passage.', score: 0.5 },
          ],
          info: { top_k: 5, retrieval_time: 0.234 },
        });
      }),
    );

    const user = userEvent.setup();
    renderGraph();
    await user.click(await screen.findByRole('button', { name: 'Search' }));

    const topK = screen.getByLabelText(/Top K/i);
    expect(topK).toHaveValue(20);
    await user.clear(topK);
    await user.type(topK, '5');

    await user.type(screen.getByPlaceholderText(/Search for passages/i), 'what is alpha?');
    // The submit button is also labelled "Search" — pick the last one (after the toggle)
    const buttons = screen.getAllByRole('button', { name: 'Search' });
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(screen.getByText('2 results · 0.23s')).toBeInTheDocument());
    expect(sent).toEqual({ question: 'what is alpha?', top_k: 5, include_graph: true });
    expect(sentKey).toBe('hashtag-user-key-testkey1');

    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('#1')).toBeInTheDocument();
    expect(within(cards[0]).getByText('0.912')).toBeInTheDocument();
    expect(within(cards[0]).getByText('doc-alpha.pdf')).toBeInTheDocument();
    expect(within(cards[0]).getByText('p. 3')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Alpha passage.')).toBeInTheDocument();
    expect(within(cards[1]).getByText('#2')).toBeInTheDocument();
    expect(within(cards[1]).getByText('0.500')).toBeInTheDocument();
    expect(within(cards[1]).queryByText(/^p\. /)).not.toBeInTheDocument();

    // Logged in the API log, without any session id
    expect(screen.getByText('/alice/my-project/search')).toBeInTheDocument();
    expect(JSON.stringify(sent)).not.toContain('session_id');

    // No graph in the response → no "Graph used" section
    expect(screen.queryByRole('button', { name: /Graph used/ })).not.toBeInTheDocument();
  });

  it('shows the graph used, with question-matched facts first and in bold', async () => {
    // Default MSW handler returns a graph when include_graph is set
    const user = userEvent.setup();
    renderGraph();
    await user.click(await screen.findByRole('button', { name: 'Search' }));
    await user.type(screen.getByPlaceholderText(/Search for passages/i), 'what is alpha?{Enter}');

    const toggle = await screen.findByRole('button', { name: /Graph used/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('3 concepts · 2 facts');
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'List' }));
    for (const name of ['Alpha', 'Beta', 'Gamma']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    const matched = screen.getByText('Alpha — DEPENDS_ON → Beta');
    const other = screen.getByText('Beta — PART_OF → Gamma');
    expect(matched).toHaveClass('font-semibold');
    expect(other).not.toHaveClass('font-semibold');
    // Matched fact comes first
    expect(matched.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // MENTIONS edges are not listed as facts
    expect(screen.queryByText(/MENTIONS/)).not.toBeInTheDocument();
  });

  it('omits include_graph when "Include graph" is unchecked', async () => {
    let sent: unknown = null;
    server.use(
      http.post(`${BASE}/alice/my-project/search`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ results: [], info: { top_k: 20, retrieval_time: 0.01 } });
      }),
    );

    const user = userEvent.setup();
    renderGraph();
    await user.click(await screen.findByRole('button', { name: 'Search' }));
    const checkbox = screen.getByLabelText('Include graph');
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    await user.type(screen.getByPlaceholderText(/Search for passages/i), 'anything{Enter}');

    await waitFor(() => expect(sent).toEqual({ question: 'anything', top_k: 20 }));
  });

  it('shows the empty state for results: []', async () => {
    server.use(
      http.post(`${BASE}/alice/my-project/search`, () =>
        HttpResponse.json({ results: [], info: { top_k: 20, retrieval_time: 0.01 } }),
      ),
    );

    const user = userEvent.setup();
    renderGraph();
    await user.click(await screen.findByRole('button', { name: 'Search' }));
    await user.type(screen.getByPlaceholderText(/Search for passages/i), 'nothing here{Enter}');

    await waitFor(() => expect(screen.getByText('No matching passages')).toBeInTheDocument());
  });

  it('shows the API error detail inline', async () => {
    server.use(
      http.post(`${BASE}/alice/my-project/search`, () =>
        HttpResponse.json({ detail: 'Insufficient credits' }, { status: 402 }),
      ),
    );

    const user = userEvent.setup();
    renderGraph();
    await user.click(await screen.findByRole('button', { name: 'Search' }));
    await user.type(screen.getByPlaceholderText(/Search for passages/i), 'anything{Enter}');

    await waitFor(() => expect(screen.getByText('Insufficient credits')).toBeInTheDocument());
  });
});
