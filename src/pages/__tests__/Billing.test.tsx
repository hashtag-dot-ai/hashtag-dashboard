import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('shows plan selector when "Change plan" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Billing />);
    await waitFor(() => screen.getByText('Change plan'));
    await user.click(screen.getByText('Change plan'));
    expect(screen.getByText('Business')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('switches plan when a new plan is selected and confirmed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Billing />);
    await waitFor(() => screen.getByText('Change plan'));
    await user.click(screen.getByText('Change plan'));

    // Select Business plan
    await user.click(screen.getByText('Business'));
    await user.click(screen.getByRole('button', { name: /Switch plan/i }));

    // After mutation, billing should update to business
    await waitFor(() =>
      expect(screen.getByText('Business')).toBeInTheDocument(),
    );
  });
});
