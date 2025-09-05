import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { ApiTokenData, CreateApiTokenRequest as CreateApiTokenParams } from '../../types/user.js';
import { transformApiToken } from '../../utils/transformers.js';
import type { ApiToken } from '../../types/user.js';

/**
 * Request to create a new API token
 */
export class CreateApiTokenRequest {
  constructor(private readonly params: CreateApiTokenParams) {}

  getRequestOptions(): RequestOptions {
    return {
      method: 'POST',
      endpoint: '/api-keys',
      body: {
        name: this.params.name,
        abilities: this.params.abilities,
        expires_at: this.params.expiresAt?.toISOString(),
      },
    };
  }

  transformResponse(response: ApiResponse<{ data: ApiTokenData }>): ApiToken {
    return transformApiToken(response.data.data);
  }
}