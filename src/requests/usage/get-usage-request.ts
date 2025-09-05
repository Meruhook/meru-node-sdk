import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { UsageData } from '../../types/usage.js';
import { transformUsage } from '../../utils/transformers.js';
import type { Usage } from '../../types/usage.js';

/**
 * Request to get current month usage summary
 */
export class GetUsageRequest {
  getRequestOptions(): RequestOptions {
    return {
      method: 'GET',
      endpoint: '/api/usage',
    };
  }

  transformResponse(response: ApiResponse<{ data: UsageData }>): Usage {
    return transformUsage(response.data.data);
  }
}