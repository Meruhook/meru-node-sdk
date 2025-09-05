import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { UsageData } from '../../types/usage.js';
import { transformUsage } from '../../utils/transformers.js';
import type { Usage } from '../../types/usage.js';

/**
 * Request to get usage for a specific period (YYYY-MM format)
 */
export class GetUsagePeriodRequest {
  constructor(private readonly period: string) {}

  getRequestOptions(): RequestOptions {
    return {
      method: 'GET',
      endpoint: `/api/usage/${this.period}`,
    };
  }

  transformResponse(response: ApiResponse<{ data: UsageData }>): Usage {
    return transformUsage(response.data.data);
  }
}