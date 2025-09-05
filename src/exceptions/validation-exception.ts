import { MeruException } from './meru-exception.js';
import type { ApiErrorResponse, ApiResponse } from '../types/client.js';

/**
 * Exception thrown when validation fails
 */
export class ValidationException extends MeruException {
  public readonly validationErrors?: Record<string, string[]> | undefined;

  constructor(
    message: string = 'Validation failed',
    response?: ApiResponse<ApiErrorResponse>,
    cause?: Error
  ) {
    super(message, response, cause);
    this.name = 'ValidationException';
    this.validationErrors = response?.data?.errors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationException);
    }
  }

  /**
   * Create a ValidationException from an API response
   */
  static fromResponse(response: ApiResponse<ApiErrorResponse>): ValidationException {
    const message = response.data?.message ?? 'Validation failed';
    return new ValidationException(message, response);
  }

  /**
   * Get validation errors for a specific field
   */
  getFieldErrors(field: string): string[] | undefined {
    return this.validationErrors?.[field];
  }

  /**
   * Get all validation error messages as a flat array
   */
  getAllErrorMessages(): string[] {
    if (!this.validationErrors) {
      return [];
    }

    return Object.values(this.validationErrors).flat();
  }
}