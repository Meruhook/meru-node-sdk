import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { BillingData } from '../../types/billing.js';
import { transformBilling } from '../../utils/transformers.js';
import type { Billing } from '../../types/billing.js';

/**
 * Request to get current billing status and costs
 */
export class GetBillingRequest {
  getRequestOptions(): RequestOptions {
    return {
      method: 'GET',
      endpoint: '/api/billing',
    };
  }

  transformResponse(response: ApiResponse<{ data: BillingData }>): Billing {
    return transformBilling(response.data.data);
  }
}