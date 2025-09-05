import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { UsageEventData } from '../../types/usage.js';
import { transformUsageEvent } from '../../utils/transformers.js';
import type { UsageEvent } from '../../types/usage.js';

/**
 * Request to get recent usage events
 */
export class GetUsageEventsRequest {
  constructor(private readonly limit: number = 50) {}

  getRequestOptions(): RequestOptions {
    return {
      method: 'GET',
      endpoint: '/api/usage/events',
      query: {
        limit: this.limit,
      },
    };
  }

  transformResponse(response: ApiResponse<{ data: UsageEventData[] }>): UsageEvent[] {
    return response.data.data.map(transformUsageEvent);
  }
}