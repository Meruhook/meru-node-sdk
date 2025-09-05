import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { BillingBreakdownData } from '../../types/billing.js';
import { transformBillingBreakdown } from '../../utils/transformers.js';
import type { BillingBreakdown } from '../../types/billing.js';

/**
 * Request to get detailed cost breakdown
 */
export class GetBillingBreakdownRequest {
  getRequestOptions(): RequestOptions {
    return {
      method: 'GET',
      endpoint: '/api/billing/breakdown',
    };
  }

  transformResponse(response: ApiResponse<{ data: BillingBreakdownData }>): BillingBreakdown {
    return transformBillingBreakdown(response.data.data);
  }
}