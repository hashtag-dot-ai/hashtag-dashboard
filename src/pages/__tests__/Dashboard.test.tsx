import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import Dashboard from '@/pages/Dashboard';

describe('Dashboard page', () => {
  it('renders the page heading', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows the plan badge after billing loads', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Free')).toBeInTheDocument());
  });

  it('shows credit count after billing loads', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/87 credits remaining/)).toBeInTheDocument());
  });

  it('lists projects after they load', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('My Project')).toBeInTheDocument());
    expect(screen.getByText('Second Project')).toBeInTheDocument();
  });

  it('shows the project tenant_id as a monospace label', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('my-project')).toBeInTheDocument());
  });

  it('greets the logged-in user by email', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() =>
      expect(screen.getByText(/dev@example\.com/)).toBeInTheDocument(),
    );
  });
});
