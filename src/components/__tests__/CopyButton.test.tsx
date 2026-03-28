import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CopyButton from '@/components/CopyButton';

// jsdom doesn't implement navigator.clipboard — define it as a configurable property
const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  configurable: true,
  writable: true,
});

describe('CopyButton', () => {
  beforeEach(() => writeText.mockClear());

  it('renders a copy icon button', () => {
    render(<CopyButton value="some text" />);
    expect(screen.getByTitle('Copy to clipboard')).toBeInTheDocument();
  });

  it('calls clipboard.writeText with the value on click', async () => {
    const user = userEvent.setup();
    render(<CopyButton value="hello world" />);
    await user.click(screen.getByTitle('Copy to clipboard'));
    expect(writeText).toHaveBeenCalledWith('hello world');
  });

  it('shows a check icon (green) after clicking', async () => {
    const user = userEvent.setup();
    const { container } = render(<CopyButton value="test" />);
    await user.click(screen.getByTitle('Copy to clipboard'));
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });
});
