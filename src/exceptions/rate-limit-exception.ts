import { MeruException } from './meru-exception.js';
import type { ApiErrorResponse, ApiResponse } from '../types/client.js';

/**
 * Exception thrown when rate limiting is encountered
 */
export class RateLimitException extends MeruException {
  public readonly retryAfter?: number | undefined;

  constructor(
    message: string = 'Rate limit exceeded',
    response?: ApiResponse<ApiErrorResponse>,
    retryAfter?: number,
    cause?: Error
  ) {
    super(message, response, cause);
    this.name = 'RateLimitException';
    this.retryAfter = retryAfter;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitException);
    }
  }

  /**
   * Create a RateLimitException from an API response
   */
  static fromResponse(response: ApiResponse<ApiErrorResponse>): RateLimitException {
    const message = response.data?.message ?? 'Rate limit exceeded';
    const retryAfter = response.headers['retry-after'] 
      ? parseInt(response.headers['retry-after'], 10) 
      : undefined;
    
    return new RateLimitException(message, response, retryAfter);
  }

  /**
   * Get the number of seconds to wait before retrying
   */
  getRetryAfterSeconds(): number | undefined {
    return this.retryAfter;
  }

  /**
   * Get the retry after time as a Date object
   */
  getRetryAfterDate(): Date | undefined {
    if (!this.retryAfter) {
      return undefined;
    }

    return new Date(Date.now() + this.retryAfter * 1000);
  }
}