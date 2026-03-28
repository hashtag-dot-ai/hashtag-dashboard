import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import ProjectDetail from '@/pages/ProjectDetail';

describe('ProjectDetail page', () => {
  const renderDetail = () =>
    renderWithProviders(<ProjectDetail />, {
      initialPath: '/projects/my-project',
      routePath: '/projects/:tenantId',
    });

  it('renders the project name after loading', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('My Project')).toBeInTheDocument());
  });

  it('shows the tenant_id slug in the page header', async () => {
    renderDetail();
    // tenant_id appears in both the header <p> and the Overview tab content;
    // check that it appears at least once (getAllByText won't throw on multiples)
    await waitFor(() => expect(screen.getAllByText('my-project').length).toBeGreaterThan(0));
  });

  it('renders all four tabs', async () => {
    renderDetail();
    await waitFor(() => screen.getByText('My Project'));
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /API Keys/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Danger Zone/i })).toBeInTheDocument();
  });

  describe('Overview tab', () => {
    it('shows the query and process endpoint URLs', async () => {
      renderDetail();
      await waitFor(() => screen.getByText('My Project'));
      expect(screen.getByText(/\/my-project\/query/)).toBeInTheDocument();
      expect(screen.getByText(/\/my-project\/process/)).toBeInTheDocument();
    });
  });

  describe('API Keys tab', () => {
    it('shows the existing key after switching to the tab', async () => {
      const user = userEvent.setup();
      renderDetail();
      await waitFor(() => screen.getByText('My Project'));
      await user.click(screen.getByRole('tab', { name: /API Keys/i }));
      await waitFor(() => expect(screen.getByText(/hk_abc123/)).toBeInTheDocument());
    });

    it('shows the Create key form when button is clicked', async () => {
      const user = userEvent.setup();
      renderDetail();
      await waitFor(() => screen.getByText('My Project'));
      await user.click(screen.getByRole('tab', { name: /API Keys/i }));
      await waitFor(() => screen.getByRole('button', { name: /Create key/i }));
      await user.click(screen.getByRole('button', { name: /Create key/i }));
      // "Read Only" only appears in the form (the existing key badge is read_write)
      expect(screen.getByText('Read Only')).toBeInTheDocument();
      expect(screen.getByText('Manage')).toBeInTheDocument();
      // "Read + Write" appears in both the form and the existing key badge
      expect(screen.getAllByText('Read + Write').length).toBeGreaterThanOrEqual(2);
    });

    it('shows RawKeyModal with the raw_key after creating a key', async () => {
      const user = userEvent.setup();
      renderDetail();
      await waitFor(() => screen.getByText('My Project'));
      await user.click(screen.getByRole('tab', { name: /API Keys/i }));
      await waitFor(() => screen.getByRole('button', { name: /Create key/i }));
      await user.click(screen.getByRole('button', { name: /Create key/i }));

      // Click the Create button in the form
      await user.click(screen.getByRole('button', { name: /^Create$/i }));

      await waitFor(() =>
        expect(screen.getByText('hk_new1234__supersecretkeyvalue')).toBeInTheDocument(),
      );
      expect(screen.getByText(/Copy this key now/i)).toBeInTheDocument();
    });
  });

  describe('Danger Zone tab', () => {
    it('disables Delete button until tenant_id is typed', async () => {
      const user = userEvent.setup();
      renderDetail();
      await waitFor(() => screen.getByText('My Project'));
      await user.click(screen.getByRole('tab', { name: /Danger Zone/i }));
      const deleteBtn = screen.getByRole('button', { name: /Delete project/i });
      expect(deleteBtn).toBeDisabled();
    });

    it('enables Delete button only when tenant_id matches exactly', async () => {
      const user = userEvent.setup();
      renderDetail();
      await waitFor(() => screen.getByText('My Project'));
      await user.click(screen.getByRole('tab', { name: /Danger Zone/i }));
      const input = screen.getByPlaceholderText('my-project');
      await user.type(input, 'my-project');
      expect(screen.getByRole('button', { name: /Delete project/i })).toBeEnabled();
    });

    it('keeps Delete button disabled if tenant_id is partially typed', async () => {
      const user = userEvent.setup();
      renderDetail();
      await waitFor(() => screen.getByText('My Project'));
      await user.click(screen.getByRole('tab', { name: /Danger Zone/i }));
      await user.type(screen.getByPlaceholderText('my-project'), 'my-proj');
      expect(screen.getByRole('button', { name: /Delete project/i })).toBeDisabled();
    });
  });
});
