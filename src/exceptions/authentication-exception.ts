import { MeruException } from './meru-exception.js';
import type { ApiErrorResponse, ApiResponse } from '../types/client.js';

/**
 * Exception thrown when authentication fails
 */
export class AuthenticationException extends MeruException {
  constructor(
    message: string = 'Authentication failed',
    response?: ApiResponse<ApiErrorResponse>,
    cause?: Error
  ) {
    super(message, response, cause);
    this.name = 'AuthenticationException';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationException);
    }
  }

  /**
   * Create an AuthenticationException from an API response
   */
  static fromResponse(response: ApiResponse<ApiErrorResponse>): AuthenticationException {
    const message = response.data?.message ?? 'Authentication failed';
    return new AuthenticationException(message, response);
  }
}