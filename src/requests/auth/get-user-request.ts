import type { RequestOptions, ApiResponse } from '../../types/client.js';
import type { UserData } from '../../types/user.js';
import { transformUser } from '../../utils/transformers.js';
import type { User } from '../../types/user.js';

/**
 * Request to get authenticated user information
 */
export class GetUserRequest {
  getRequestOptions(): RequestOptions {
    return {
      method: 'GET',
      endpoint: '/api/user',
    };
  }

  transformResponse(response: ApiResponse<{ data: UserData }>): User {
    return transformUser(response.data.data);
  }
}