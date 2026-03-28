import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreditBar from '@/components/CreditBar';

describe('CreditBar', () => {
  it('shows remaining and limit counts', () => {
    render(<CreditBar remaining={87} limit={100} plan="free" />);
    expect(screen.getByText('87 credits remaining')).toBeInTheDocument();
    expect(screen.getByText('of 100')).toBeInTheDocument();
  });

  it('fills bar to the correct percentage', () => {
    const { container } = render(<CreditBar remaining={50} limit={100} plan="free" />);
    const fill = container.querySelector('[style*="width"]');
    expect(fill).toHaveStyle({ width: '50%' });
  });

  it('shows "Unlimited" and hides bar when limit is -1', () => {
    const { container } = render(<CreditBar remaining={999} limit={-1} plan="enterprise" />);
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
    expect(container.querySelector('[style*="width"]')).toBeNull();
  });

  it('clamps bar to 100% when remaining > limit', () => {
    const { container } = render(<CreditBar remaining={150} limit={100} plan="free" />);
    const fill = container.querySelector('[style*="width"]');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('clamps bar to 0% when remaining is 0', () => {
    const { container } = render(<CreditBar remaining={0} limit={100} plan="free" />);
    const fill = container.querySelector('[style*="width"]');
    expect(fill).toHaveStyle({ width: '0%' });
  });

  it('applies red styling when credits are below 20%', () => {
    const { container } = render(<CreditBar remaining={10} limit={100} plan="free" />);
    const fill = container.querySelector('.bg-red-500');
    expect(fill).toBeInTheDocument();
  });
});
