import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import Projects from '@/pages/Projects';
import { STORAGE_KEY, addCustomTenant, listCustomTenants } from '@/lib/customTenants';

describe('Projects page', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('renders the page heading', () => {
    renderWithProviders(<Projects />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('lists existing projects after load', async () => {
    renderWithProviders(<Projects />);
    await waitFor(() => expect(screen.getByText('My Project')).toBeInTheDocument());
    expect(screen.getByText('Second Project')).toBeInTheDocument();
  });

  it('shows tenant_id slugs in monospace', async () => {
    renderWithProviders(<Projects />);
    await waitFor(() => expect(screen.getByText('my-project')).toBeInTheDocument());
    expect(screen.getByText('second-proj')).toBeInTheDocument();
  });

  it('shows the create project form when "New project" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />);
    await user.click(screen.getByRole('button', { name: /New project/i }));
    expect(screen.getByPlaceholderText('My Project')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('my-project')).toBeInTheDocument();
  });

  it('auto-derives tenant_id from the name input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />);
    await user.click(screen.getByRole('button', { name: /New project/i }));
    await user.type(screen.getByPlaceholderText('My Project'), 'Hello World');
    const tenantInput = screen.getByPlaceholderText('my-project') as HTMLInputElement;
    expect(tenantInput.value).toBe('hello-world');
  });

  it('shows a green check when tenant_id is available', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />);
    await user.click(screen.getByRole('button', { name: /New project/i }));
    const tenantInput = screen.getByPlaceholderText('my-project');
    await user.type(tenantInput, 'brand-new');
    // Wait for debounce + check
    await waitFor(() =>
      expect(tenantInput).toHaveClass('border-green-400'),
    );
  });

  it('shows a red cross when tenant_id is taken', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />);
    await user.click(screen.getByRole('button', { name: /New project/i }));
    const tenantInput = screen.getByPlaceholderText('my-project');
    await user.clear(tenantInput);
    await user.type(tenantInput, 'taken-id');
    await waitFor(() =>
      expect(screen.getByText('Already taken')).toBeInTheDocument(),
    );
  });

  it('hides the form when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />);
    await user.click(screen.getByRole('button', { name: /New project/i }));
    expect(screen.getByText('New project', { selector: 'h2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByText('New project', { selector: 'h2' })).not.toBeInTheDocument();
  });

  describe('custom tenants', () => {
    it('does not show the connected-tenants section when there are none', async () => {
      renderWithProviders(<Projects />);
      await waitFor(() => screen.getByText('my-project'));
      expect(screen.queryByText(/Connected tenants/i)).not.toBeInTheDocument();
    });

    it('opens the connect form and disables Connect for invalid ids', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Projects />);
      await user.click(screen.getByRole('button', { name: /Connect tenant/i }));
      const input = screen.getByPlaceholderText(/hipporag_eval_musique50/i);
      const connect = screen.getByRole('button', { name: /^Connect$/i });
      expect(connect).toBeDisabled();
      await user.type(input, 'bad id!');
      expect(screen.getByText(/Only letters, numbers, hyphens and underscores/i)).toBeInTheDocument();
      expect(connect).toBeDisabled();
    });

    it('adds a tenant, lists it, and links to its detail page', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Projects />);
      await user.click(screen.getByRole('button', { name: /Connect tenant/i }));
      await user.type(screen.getByPlaceholderText(/hipporag_eval_musique50/i), 'hipporag_eval_multihop_v1_20260810');
      await user.type(screen.getByPlaceholderText('MuSiQue 50 (v1 ANN)'), 'Multihop smoke');
      await user.click(screen.getByRole('button', { name: /^Connect$/i }));

      expect(listCustomTenants().map((t) => t.tenantId)).toEqual(['hipporag_eval_multihop_v1_20260810']);
      expect(screen.getByText(/Connected tenants/i)).toBeInTheDocument();
      expect(screen.getByText('Multihop smoke')).toBeInTheDocument();
      const open = screen.getByRole('link', { name: /Open hipporag_eval_multihop_v1_20260810/i });
      expect(open).toHaveAttribute('href', '/tenants/hipporag_eval_multihop_v1_20260810');
      // form closes after connecting
      expect(screen.queryByPlaceholderText(/hipporag_eval_musique50/i)).not.toBeInTheDocument();
    });

    it('lists tenants that were already stored', async () => {
      addCustomTenant('atoresearch', 'ATO');
      renderWithProviders(<Projects />);
      expect(screen.getByText('ATO')).toBeInTheDocument();
      expect(screen.getByText('atoresearch')).toBeInTheDocument();
    });
  });
});
