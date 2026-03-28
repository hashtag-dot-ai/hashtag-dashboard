import { request } from './client';
import type { BillingOut, PlanUpdate } from '@/types/api';

export const getBilling = (token?: string | null) =>
  request<BillingOut>('/mgmt/billing/', {}, token);

export const setPlan = (data: PlanUpdate, token?: string | null) =>
  request<BillingOut>('/mgmt/billing/plan', { method: 'POST', body: JSON.stringify(data) }, token);
