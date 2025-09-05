import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { AccountOverviewData } from '../../types/account.js';
import { transformAccountOverview } from '../../utils/transformers.js';
import type { AccountOverview } from '../../types/account.js';

/**
 * Request to get combined account overview (addresses, usage, billing)
 */
export class GetAccountOverviewRequest {
  getRequestOptions(): RequestOptions {
    return {
      method: 'GET',
      endpoint: '/api/account',
    };
  }

  transformResponse(response: ApiResponse<{ data: AccountOverviewData }>): AccountOverview {
    return transformAccountOverview(response.data.data);
  }
}