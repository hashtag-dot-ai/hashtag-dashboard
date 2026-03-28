import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RawKeyModal from '@/components/RawKeyModal';
import type { KeyCreated } from '@/types/api';

const sampleKey: KeyCreated = {
  key_prefix: 'hk_abc123',
  key_type: 'read_write',
  description: 'prod key',
  rate_limit: null,
  revoked: false,
  raw_key: 'hk_abc123__supersecretkeyvalue',
};

describe('RawKeyModal', () => {
  it('renders the raw key prominently', () => {
    render(<RawKeyModal keyData={sampleKey} onClose={() => {}} />);
    expect(screen.getByText(sampleKey.raw_key)).toBeInTheDocument();
  });

  it('shows the "shown once" warning', () => {
    render(<RawKeyModal keyData={sampleKey} onClose={() => {}} />);
    expect(screen.getByText(/Copy this key now/i)).toBeInTheDocument();
    expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument();
  });

  it('shows the key type and description', () => {
    render(<RawKeyModal keyData={sampleKey} onClose={() => {}} />);
    expect(screen.getByText('Read + Write')).toBeInTheDocument();
    expect(screen.getByText('prod key')).toBeInTheDocument();
  });

  it('calls onClose when dismiss button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RawKeyModal keyData={sampleKey} onClose={onClose} />);
    await user.click(screen.getByText(/I've copied the key/i));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not show description field when description is null', () => {
    const keyNoDesc: KeyCreated = { ...sampleKey, description: null };
    render(<RawKeyModal keyData={keyNoDesc} onClose={() => {}} />);
    expect(screen.queryByText('Label')).not.toBeInTheDocument();
  });
});
