import type { ApiErrorResponse, ApiResponse } from '../types/client.js';

/**
 * Base exception class for all Meru API errors
 */
export class MeruException extends Error {
  public readonly response?: ApiResponse<ApiErrorResponse> | undefined;
  public readonly statusCode?: number | undefined;

  constructor(
    message: string,
    response?: ApiResponse<ApiErrorResponse>,
    cause?: Error
  ) {
    super(message);
    this.name = 'MeruException';
    this.response = response;
    this.statusCode = response?.status;
    
    if (cause) {
      this.cause = cause;
    }

    // Maintains proper stack trace for where the error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MeruException);
    }
  }

  /**
   * Create a MeruException from an API response
   */
  static fromResponse(response: ApiResponse<ApiErrorResponse>): MeruException {
    const message = response.data?.message ?? 'An error occurred';
    return new MeruException(message, response);
  }

  /**
   * Get error details for debugging
   */
  getErrorDetails(): {
    message: string;
    statusCode?: number | undefined;
    errors?: Record<string, string[]> | undefined;
    code?: string | undefined;
  } {
    return {
      message: this.message,
      statusCode: this.statusCode,
      errors: this.response?.data?.errors,
      code: this.response?.data?.code,
    };
  }
}