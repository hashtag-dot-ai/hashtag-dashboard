import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import Projects from '@/pages/Projects';

describe('Projects page', () => {
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
});
