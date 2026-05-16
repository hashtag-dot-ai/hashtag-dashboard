import { mgmtRequest } from './client';
import type { BillingOut, PlanUpdate } from '@/types/api';

export const getBilling = (userKey?: string | null) =>
  mgmtRequest<BillingOut>('/mgmt/billing/', {}, userKey);

export const setPlan = (data: PlanUpdate, userKey?: string | null) =>
  mgmtRequest<BillingOut>('/mgmt/billing/plan', { method: 'POST', body: JSON.stringify(data) }, userKey);
