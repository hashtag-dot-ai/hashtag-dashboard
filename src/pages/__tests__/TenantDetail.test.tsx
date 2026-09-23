import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import TenantDetail from '@/pages/TenantDetail';
import { STORAGE_KEY, addCustomTenant } from '@/lib/customTenants';

const TENANT = 'hipporag_eval_musique50_gemini3072_20260810';

describe('TenantDetail page', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
  });

  const renderDetail = (tenantId = TENANT) =>
    renderWithProviders(<TenantDetail />, {
      initialPath: `/tenants/${tenantId}`,
      routePath: '/tenants/:tenantId',
    });

  it('tells the user when the tenant is not in their list', () => {
    renderDetail('unknown_tenant');
    expect(screen.getByText(/is not in your list of connected tenants/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to projects/i })).toBeInTheDocument();
  });

  it('renders the label as the heading and the raw tenant id underneath', () => {
    addCustomTenant(TENANT, 'MuSiQue 50');
    renderDetail();
    expect(screen.getByRole('heading', { level: 1, name: 'MuSiQue 50' })).toBeInTheDocument();
    expect(screen.getAllByText(TENANT).length).toBeGreaterThan(0);
    expect(screen.getByText('Custom tenant')).toBeInTheDocument();
  });

  it('falls back to the tenant id as heading when there is no label', () => {
    addCustomTenant(TENANT);
    renderDetail();
    expect(screen.getByRole('heading', { level: 1, name: TENANT })).toBeInTheDocument();
  });

  it('renders Overview, Graph and Explore tabs only', () => {
    addCustomTenant(TENANT);
    renderDetail();
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Graph/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Explore/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /API Keys/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Danger Zone/i })).not.toBeInTheDocument();
  });

  it('shows /id/{tenant} endpoints in the overview', () => {
    addCustomTenant(TENANT);
    renderDetail();
    expect(screen.getByText(new RegExp(`/id/${TENANT}/graph`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`/id/${TENANT}/documents`))).toBeInTheDocument();
  });

  it('reports that the management key is in use by default', () => {
    addCustomTenant(TENANT);
    renderDetail();
    expect(screen.getByText(/Using your user key/i)).toBeInTheDocument();
  });

  it('lets the user set a per-tenant key override that wins over the management key', async () => {
    const user = userEvent.setup();
    addCustomTenant(TENANT);
    renderDetail();
    await user.type(screen.getByPlaceholderText(/Paste a key to use for this tenant/i), 'test-key-123');
    await user.click(screen.getByRole('button', { name: /Use key/i }));
    expect(screen.getByText(/Using a key entered for this tenant/i)).toBeInTheDocument();
    expect(sessionStorage.getItem(`kg_graph_key_id/${TENANT}`)).toBe('test-key-123');

    await user.click(screen.getByRole('button', { name: /^Clear$/i }));
    expect(screen.getByText(/Using your user key/i)).toBeInTheDocument();
    expect(sessionStorage.getItem(`kg_graph_key_id/${TENANT}`)).toBeNull();
  });

  it('warns about hyphen normalisation only for hyphenated ids', () => {
    addCustomTenant('with-hyphen');
    renderDetail('with-hyphen');
    expect(screen.getByText(/This ID contains a hyphen/i)).toBeInTheDocument();
  });

  it('saves a new display label', async () => {
    const user = userEvent.setup();
    addCustomTenant(TENANT);
    renderDetail();
    const input = screen.getByPlaceholderText(TENANT);
    await user.type(input, 'Renamed');
    await user.click(screen.getByRole('button', { name: /^Save$/i }));
    expect(screen.getByRole('heading', { level: 1, name: 'Renamed' })).toBeInTheDocument();
  });
});
