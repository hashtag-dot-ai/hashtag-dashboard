import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import Billing from '@/pages/Billing';

describe('Billing page', () => {
  it('renders the page heading after billing loads', async () => {
    renderWithProviders(<Billing />);
    expect(await screen.findByText('Billing')).toBeInTheDocument();
  });

  it('shows the current plan name after loading', async () => {
    renderWithProviders(<Billing />);
    await waitFor(() => expect(screen.getByText('Free')).toBeInTheDocument());
  });

  it('shows the credit bar with remaining/limit counts', async () => {
    renderWithProviders(<Billing />);
    await waitFor(() => {
      expect(screen.getByText(/87 credits remaining/)).toBeInTheDocument();
      expect(screen.getByText(/of 100/)).toBeInTheDocument();
    });
  });

  it('shows operation cost table entries', async () => {
    renderWithProviders(<Billing />);
    await waitFor(() => {
      expect(screen.getByText('Query')).toBeInTheDocument();
      expect(screen.getByText('Ingest document')).toBeInTheDocument();
    });
  });

  it('shows a contact link for upgrades instead of a plan switcher', async () => {
    renderWithProviders(<Billing />);
    const link = await screen.findByText('Contact anj@hashtag.ai');
    expect(link).toHaveAttribute('href', 'mailto:anj@hashtag.ai');
    expect(screen.queryByText('Change plan')).not.toBeInTheDocument();
  });
});
